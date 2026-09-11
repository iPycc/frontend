import * as React from "react"

import {
  abortUpload,
  completeUpload,
  createUploadSession,
  getUploadSession,
  getUploadPartUrl,
  heartbeatUpload,
  recordRemotePart,
  uploadLocalPart,
  type UploadPartPlan,
  type UploadSessionPlan,
} from "@/api/uploads"
import { ApiError } from "@/api/client"
import {
  formatBytes,
  type AuthSession,
  type BucketMount,
  type UploadQueueItem,
} from "@/lib/models"
import { createUploadApiScheduler } from "@/lib/upload/api-scheduler"
import { createGate } from "@/lib/upload/gate"
import { fingerprintFile, hashFile } from "@/lib/upload/hash"
import { partLimit } from "@/lib/upload/pool"
import { trackParts } from "@/lib/upload/progress"
import { putPart } from "@/lib/upload/put"
import { retryPart, retryRateLimited } from "@/lib/upload/retry"

type UploadTarget = {
  mountId: string
  parentId: string | null
}

type RunDeps = {
  getSessionRef: React.MutableRefObject<() => AuthSession | null>
  getBucketsRef: React.MutableRefObject<() => BucketMount[]>
  uploadFilesRef: React.MutableRefObject<
    Map<string, { file: File; target: UploadTarget; relativePath?: string }>
  >
  uploadControllersRef: React.MutableRefObject<Map<string, AbortController>>
  uploadCommitIdsRef: React.MutableRefObject<Set<string>>
  uploadGateRef: React.MutableRefObject<ReturnType<typeof createGate>>
  uploadApiSchedulerRef: React.MutableRefObject<ReturnType<typeof createUploadApiScheduler>>
  getUploadQueueItem: (id: string) => UploadQueueItem | undefined
  scheduleUploadRefresh: (parentId: string | null, bucketId: string) => void
  updateUploadQueueItem: (id: string, patch: Partial<UploadQueueItem>) => void
}

export function useUploadRun({
  getSessionRef,
  getBucketsRef,
  uploadFilesRef,
  uploadControllersRef,
  uploadCommitIdsRef,
  uploadGateRef,
  uploadApiSchedulerRef,
  getUploadQueueItem,
  scheduleUploadRefresh,
  updateUploadQueueItem,
}: RunDeps) {
  return React.useCallback(
    async (id: string) => {
      const saved = uploadFilesRef.current.get(id)
      const session = getSessionRef.current()
      if (!saved || !session) {
        return
      }

      const bucket = getBucketsRef.current().find((item) => item.id === saved.target.mountId)
      if (!bucket?.backendId) {
        updateUploadQueueItem(id, {
          status: "failed",
          errorMessage: "未找到可用存储挂载",
        })
        return
      }
      if (bucket.readOnly) {
        updateUploadQueueItem(id, {
          status: "failed",
          errorMessage: "当前挂载为只读，不能上传文件",
          speedText: "只读挂载",
        })
        return
      }

      const controller = new AbortController()
      uploadControllersRef.current.set(id, controller)
      const throwIfAborted = () => {
        if (controller.signal.aborted) throw new DOMException("aborted", "AbortError")
      }

      let sessionId = getUploadQueueItem(id)?.sessionId
      let stopHeartbeat: (() => void) | undefined
      try {
        const queueItem = getUploadQueueItem(id)
        updateUploadQueueItem(id, {
          status: "preparing",
          totalBytes: saved.file.size,
          speedText: sessionId ? "正在验证文件并查询已上传分片..." : "计算校验值...",
          errorMessage: undefined,
          requiresFileSelection: false,
        })
        const apiParentId =
          saved.target.parentId && !saved.target.parentId.startsWith("root:")
            ? Number(saved.target.parentId)
            : undefined

        const [checksum, fileFingerprint] = await Promise.all([
          hashFile(saved.file),
          fingerprintFile(saved.file),
        ])
        throwIfAborted()
        if (queueItem?.fileFingerprint && queueItem.fileFingerprint !== fileFingerprint) {
          throw new Error("重新选择的文件内容与原上传任务不一致")
        }
        if (queueItem?.checksum && checksum && queueItem.checksum !== checksum) {
          throw new Error("重新选择的文件校验值与原上传任务不一致")
        }
        updateUploadQueueItem(id, {
          checksum: checksum ?? queueItem?.checksum,
          fileFingerprint,
          fileLastModified: saved.file.lastModified,
        })

        let plan: UploadSessionPlan | undefined
        let serverParts: Array<{ part_number: number; etag?: string | null; size: number }> = []
        if (sessionId) {
          try {
            const existing = await retryRateLimited(
              () => uploadApiSchedulerRef.current.run(
                () => getUploadSession(session.tokens.accessToken, sessionId!, controller.signal),
                controller.signal
              ),
              controller.signal
            )
            if (
              existing.mount_id !== bucket.backendId ||
              existing.file_name !== saved.file.name ||
              existing.size !== saved.file.size ||
              (existing.checksum && checksum && existing.checksum !== checksum)
            ) {
              throw new Error("原上传会话与所选文件不匹配")
            }
            if (existing.state === "completed") {
              updateUploadQueueItem(id, {
                status: "completed",
                progress: 100,
                uploadedBytes: saved.file.size,
                speedBytesPerSecond: 0,
                speedText: "已上传",
              })
              scheduleUploadRefresh(saved.target.parentId, bucket.id)
              return
            }
            if (existing.state === "aborting" || existing.state === "completing") {
              throw new Error(existing.state === "aborting" ? "上传任务正在取消" : "上传任务正在服务端完成，请稍后再试")
            }
            if (existing.state !== "aborted" && existing.state !== "expired") {
              plan = {
                session_id: existing.id,
                upload_mode: existing.mode,
                upload_id: existing.upload_id,
                object_key: existing.path,
                part_size: existing.part_size,
                part_count: Math.max(1, Math.ceil(existing.size / Math.max(existing.part_size, 1))),
                upload_urls: [],
              }
              serverParts = existing.parts
            }
          } catch (error) {
            if (!(error instanceof ApiError) || error.status !== 404) throw error
          }
        }

        if (!plan) {
          sessionId = undefined
          updateUploadQueueItem(id, {
            sessionId: undefined,
            progress: 0,
            uploadedBytes: 0,
            speedText: queueItem?.sessionId ? "原会话已失效，正在创建新上传任务..." : "正在创建上传任务...",
          })
          plan = await retryRateLimited(
            () => uploadApiSchedulerRef.current.run(
              () => createUploadSession(session.tokens.accessToken, {
                mount_id: bucket.backendId,
                parent_id: apiParentId,
                file_name: saved.file.name,
                relative_path: saved.relativePath,
                checksum: checksum ?? undefined,
                size: saved.file.size,
                content_type: saved.file.type || "application/octet-stream",
                mode: "auto",
              }),
              controller.signal
            ),
            controller.signal
          )
        }

        const activeSessionId = plan.session_id
        if (!activeSessionId) throw new Error("Upload session id is missing")
        sessionId = activeSessionId
        if (plan.is_duplicate) {
          updateUploadQueueItem(id, {
            sessionId,
            status: "completed",
            progress: 100,
            uploadedBytes: saved.file.size,
            speedText: "秒传完成",
          })
          scheduleUploadRefresh(saved.target.parentId, bucket.id)
          return
        }
        updateUploadQueueItem(id, {
          sessionId,
          expiresAt: plan.expires_at ?? undefined,
          status: "uploading",
          requiresFileSelection: false,
        })
        const heartbeatController = new AbortController()
        const sendHeartbeat = () => {
          if (heartbeatController.signal.aborted) return
          void uploadApiSchedulerRef.current
            .run(
              () => heartbeatUpload(
                session.tokens.accessToken,
                activeSessionId,
                heartbeatController.signal
              ),
              heartbeatController.signal
            )
            .catch(() => {
              // A transient heartbeat failure is retried on the next interval.
            })
        }
        const heartbeatTimer = window.setInterval(sendHeartbeat, 60_000)
        stopHeartbeat = () => {
          window.clearInterval(heartbeatTimer)
          heartbeatController.abort()
        }

        const singlePut = plan.upload_mode === "single_put"
        const partSize = singlePut
          ? Math.max(saved.file.size || 1, 1)
          : Math.max(plan.part_size || saved.file.size || 1, 1)
        const partCount = singlePut
          ? 1
          : Math.max(
              plan.part_count ?? 0,
              plan.upload_urls.length,
              Math.ceil((saved.file.size || 1) / partSize),
              1
            )
        updateUploadQueueItem(id, {
          partSizeBytes: partSize,
          partCount,
        })
        const expectedPartSize = (partNumber: number) => {
          if (saved.file.size === 0) return 0
          if (partNumber < partCount) return partSize
          return saved.file.size - partSize * (partCount - 1)
        }
        const completedParts = new Map<number, { part_number: number; etag: string; size: number }>()
        for (const part of serverParts) {
          if (
            part.part_number >= 1 &&
            part.part_number <= partCount &&
            part.etag &&
            part.size === expectedPartSize(part.part_number)
          ) {
            completedParts.set(part.part_number, {
              part_number: part.part_number,
              etag: part.etag,
              size: part.size,
            })
          }
        }
        const resumedBytes = Array.from(completedParts.values()).reduce((sum, part) => sum + part.size, 0)
        updateUploadQueueItem(id, {
          uploadedBytes: resumedBytes,
          progress: saved.file.size > 0 ? (resumedBytes / saved.file.size) * 100 : 0,
          speedBytesPerSecond: 0,
          speedText: resumedBytes > 0
            ? `已恢复 ${formatBytes(resumedBytes)}，继续上传剩余分片`
            : "正在上传",
        })
        const partConcurrency = partLimit(bucket.strategy.concurrency)
        const uploadPlans = new Map<number, Promise<UploadPartPlan | undefined>>()
        plan.upload_urls.forEach((item) => uploadPlans.set(item.part_number, Promise.resolve(item)))
        const progressTracker = trackParts(
          saved.file.size,
          ({ uploadedBytes, progress, bytesPerSecond }) => {
            updateUploadQueueItem(id, {
              status: "uploading",
              uploadedBytes,
              progress,
              speedBytesPerSecond: bytesPerSecond,
              speedText: `${formatBytes(bytesPerSecond)}/s 已上传 ${formatBytes(uploadedBytes)} / ${formatBytes(saved.file.size)}`,
            })
          },
          Array.from(completedParts.values()).map((part) => ({
            partNumber: part.part_number,
            size: part.size,
          }))
        )
        const missingPartIndexes = Array.from(
          { length: partCount },
          (_, index) => index
        ).filter((index) => !completedParts.has(index + 1))
        let nextMissingPart = 0
        let partFailure: unknown = null

        const getPartPlan = (partNumber: number, refresh = false) => {
          const cached = refresh ? undefined : uploadPlans.get(partNumber)
          if (cached) return cached
          if (bucket.storageType === "local") return Promise.resolve(undefined)

          const requested = uploadApiSchedulerRef.current.run(
            () => getUploadPartUrl(
              session.tokens.accessToken,
              activeSessionId,
              partNumber,
              controller.signal
            ),
            controller.signal
          )
          uploadPlans.set(partNumber, requested)
          void requested.catch(() => {
            if (uploadPlans.get(partNumber) === requested) uploadPlans.delete(partNumber)
          })
          return requested
        }

        const prefetchNextWave = (partNumber: number) => {
          const nextPartNumber = partNumber + partConcurrency
          if (singlePut || bucket.storageType === "local" || nextPartNumber > partCount) return
          void getPartPlan(nextPartNumber).catch(() => {
            // The worker will request a fresh URL when it reaches this part.
          })
        }

        const uploadPartAt = async (index: number) => {
          if (controller.signal.aborted) {
            throw new DOMException("aborted", "AbortError")
          }

          const partNumber = index + 1
          const start = index * partSize
          const end = saved.file.size ? Math.min(saved.file.size, start + partSize) : start + partSize
          const chunk = saved.file.slice(start, end)
          prefetchNextWave(partNumber)

          const uploaded = await retryPart(async (attempt) => {
            progressTracker.begin(partNumber)
            const uploadPlan = await getPartPlan(partNumber, attempt > 0)
            throwIfAborted()
            if (!uploadPlan || uploadPlan.url.startsWith("/api/") || bucket.storageType === "local") {
              const part = await uploadApiSchedulerRef.current.run(
                () => uploadGateRef.current.run(
                  () => uploadLocalPart(
                    session.tokens.accessToken,
                    activeSessionId,
                    chunk,
                    partNumber,
                    chunk.size,
                    controller.signal
                  ),
                  controller.signal
                ),
                controller.signal
              )
              throwIfAborted()
              return { etag: part.etag ?? `part-${partNumber}`, recorded: true }
            }

            const responseEtag = await uploadGateRef.current.run(
              () => putPart(
                uploadPlan,
                chunk,
                controller.signal,
                (loaded) => progressTracker.update(partNumber, loaded)
              ),
              controller.signal,
            )
            throwIfAborted()
            if (!responseEtag && !singlePut) {
              const error = new Error("COS 响应未暴露 ETag，请检查存储桶 CORS 配置")
              Object.assign(error, { retryable: false })
              throw error
            }
            return { etag: responseEtag ?? `part-${partNumber}`, recorded: false }
          }, controller.signal)
          throwIfAborted()

          if (!uploaded.recorded) {
            await retryPart(
              () => uploadApiSchedulerRef.current.run(
                () => recordRemotePart(
                  session.tokens.accessToken,
                  activeSessionId,
                  partNumber,
                  uploaded.etag,
                  chunk.size,
                  controller.signal
                ),
                controller.signal
              ),
              controller.signal
            )
            throwIfAborted()
          }
          progressTracker.commit(partNumber, chunk.size)
          completedParts.set(partNumber, {
            part_number: partNumber,
            etag: uploaded.etag,
            size: chunk.size,
          })
        }

        const uploadWorker = async () => {
          while (!controller.signal.aborted) {
            const index = missingPartIndexes[nextMissingPart]
            nextMissingPart += 1
            if (index === undefined) return
            try {
              await uploadPartAt(index)
            } catch (error) {
              if (!partFailure) partFailure = error
              if (!controller.signal.aborted) controller.abort("peer-failure")
              throw error
            }
          }
        }

        const partResults = await Promise.allSettled(
          Array.from({ length: Math.min(partConcurrency, missingPartIndexes.length) }, () => uploadWorker())
        )
        progressTracker.dispose()
        if (partFailure) throw partFailure
        const rejectedPart = partResults.find((result) => result.status === "rejected")
        if (rejectedPart?.status === "rejected") throw rejectedPart.reason
        throwIfAborted()
        const completionParts = Array.from(completedParts.values()).sort(
          (left, right) => left.part_number - right.part_number
        )

        uploadCommitIdsRef.current.add(id)
        updateUploadQueueItem(id, {
          status: "processing",
          progress: 100,
          speedText: "处理中...",
        })
        await retryRateLimited(
          () => uploadApiSchedulerRef.current.run(
            () => completeUpload(session.tokens.accessToken, activeSessionId, completionParts),
            controller.signal
          ),
          controller.signal
        )
        updateUploadQueueItem(id, {
          status: "completed",
          progress: 100,
          uploadedBytes: saved.file.size,
          speedBytesPerSecond: 0,
          speedText: "已上传",
        })
        scheduleUploadRefresh(saved.target.parentId, bucket.id)
      } catch (error) {
        const abortReason = controller.signal.reason
        const paused = abortReason === "pause"
        const canceled = abortReason === "cancel"
        if (sessionId && canceled) {
          const cleanupSessionId = sessionId
          try {
            const cleanupSignal = new AbortController().signal
            await uploadApiSchedulerRef.current.run(
              () => abortUpload(session.tokens.accessToken, cleanupSessionId, "client_cancel"),
              cleanupSignal
            )
          } catch {
            // ignore abort cleanup failures
          }
        }
        updateUploadQueueItem(id, {
          status: paused ? "paused" : canceled ? "canceled" : "failed",
          errorMessage: paused || canceled ? undefined : error instanceof Error ? error.message : "上传失败",
          speedBytesPerSecond: 0,
          speedText: paused ? "已暂停，可继续上传" : canceled ? "已取消" : "上传中断，可从已完成分片继续",
        })
      } finally {
        stopHeartbeat?.()
        uploadCommitIdsRef.current.delete(id)
        uploadControllersRef.current.delete(id)
      }
    },
    [getUploadQueueItem, scheduleUploadRefresh, updateUploadQueueItem]
  )
}
