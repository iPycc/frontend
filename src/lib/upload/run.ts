import * as React from "react"

import {
  abortUpload,
  completeUpload,
  createUploadSession,
  getUploadPartUrl,
  recordRemotePart,
  uploadLocalPart,
  type UploadPartPlan,
} from "@/api/uploads"
import {
  formatBytes,
  type AuthSession,
  type BucketMount,
  type UploadQueueItem,
} from "@/lib/models"
import { createUploadApiScheduler } from "@/lib/upload/api-scheduler"
import { createGate } from "@/lib/upload/gate"
import { hashFile } from "@/lib/upload/hash"
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

      let sessionId: string | undefined
      try {
        updateUploadQueueItem(id, {
          status: "preparing",
          progress: 0,
          uploadedBytes: 0,
          totalBytes: saved.file.size,
          speedText: "计算校验值...",
          errorMessage: undefined,
        })
        const apiParentId =
          saved.target.parentId && !saved.target.parentId.startsWith("root:")
            ? Number(saved.target.parentId)
            : undefined

        const checksum = await hashFile(saved.file)
        const plan = await retryRateLimited(
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
        sessionId = plan.session_id
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
        })

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
        const completedParts: Array<{ part_number: number; etag: string; size: number }> = []
        const partConcurrency = partLimit(bucket.strategy.concurrency)
        const uploadPlans = new Map<number, Promise<UploadPartPlan | undefined>>()
        plan.upload_urls.forEach((item) => uploadPlans.set(item.part_number, Promise.resolve(item)))
        const progressTracker = trackParts(saved.file.size, ({ uploadedBytes, progress, bytesPerSecond }) => {
          updateUploadQueueItem(id, {
            status: "uploading",
            uploadedBytes,
            progress,
            speedBytesPerSecond: bytesPerSecond,
            speedText: `${formatBytes(bytesPerSecond)}/s 已上传 ${formatBytes(uploadedBytes)} / ${formatBytes(saved.file.size)}`,
          })
        })
        let nextPartIndex = 0
        let partFailure: unknown = null

        const getPartPlan = (partNumber: number, refresh = false) => {
          const cached = refresh ? undefined : uploadPlans.get(partNumber)
          if (cached) return cached
          if (bucket.storageType === "local") return Promise.resolve(undefined)

          const requested = uploadApiSchedulerRef.current.run(
            () => getUploadPartUrl(
              session.tokens.accessToken,
              sessionId,
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
                    sessionId,
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
                  sessionId,
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
          completedParts.push({
            part_number: partNumber,
            etag: uploaded.etag,
            size: chunk.size,
          })
        }

        const uploadWorker = async () => {
          while (!controller.signal.aborted) {
            const index = nextPartIndex
            nextPartIndex += 1
            if (index >= partCount) return
            try {
              await uploadPartAt(index)
            } catch (error) {
              if (!partFailure) partFailure = error
              controller.abort()
              throw error
            }
          }
        }

        const partResults = await Promise.allSettled(
          Array.from({ length: Math.min(partConcurrency, partCount) }, () => uploadWorker())
        )
        progressTracker.dispose()
        if (partFailure) throw partFailure
        const rejectedPart = partResults.find((result) => result.status === "rejected")
        if (rejectedPart?.status === "rejected") throw rejectedPart.reason
        throwIfAborted()
        completedParts.sort((left, right) => left.part_number - right.part_number)

        uploadCommitIdsRef.current.add(id)
        updateUploadQueueItem(id, {
          status: "processing",
          progress: 100,
          speedText: "处理中...",
        })
        await retryRateLimited(
          () => uploadApiSchedulerRef.current.run(
            () => completeUpload(session.tokens.accessToken, sessionId, completedParts),
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
        const aborted = error instanceof DOMException && error.name === "AbortError" && controller.signal.aborted
        if (sessionId) {
          try {
            const cleanupSignal = new AbortController().signal
            await uploadApiSchedulerRef.current.run(
              () => abortUpload(session.tokens.accessToken, sessionId, aborted ? "client_abort" : "client_failed"),
              cleanupSignal
            )
          } catch {
            // ignore abort cleanup failures
          }
        }
        updateUploadQueueItem(id, {
          status: aborted ? "canceled" : "failed",
          errorMessage: aborted ? "已取消" : error instanceof Error ? error.message : "上传失败",
          speedText: aborted ? "已取消" : "上传失败",
        })
      } finally {
        uploadCommitIdsRef.current.delete(id)
        uploadControllersRef.current.delete(id)
      }
    },
    [scheduleUploadRefresh, updateUploadQueueItem]
  )
}
