import * as React from "react"
import { IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useAppState } from "@/lib/app-state"
import { BucketMeta, StatusBadge } from "./shared"
import {
  bucketSteps,
  createBucketDraft,
  StorageBucketSheet,
  type BucketDraft,
} from "./StorageBucketSheet"
import type { BucketMount } from "@/lib/mock-data"

export function StorageSettingsPage() {
  const {
    activeBucket,
    addBucket,
    buckets,
    formatBytes,
    setActiveBucket,
    updateBucket,
  } = useAppState()
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [editingBucketId, setEditingBucketId] = React.useState<string | null>(null)
  const [draft, setDraft] = React.useState<BucketDraft>(() => createBucketDraft())

  const editingBucket =
    buckets.find((bucket) => bucket.id === editingBucketId) ?? null

  const canContinue = React.useMemo(() => {
    switch (step) {
      case 0:
        return draft.name.trim().length > 0
      case 1:
        return draft.bucket.trim().length > 0 && draft.region.trim().length > 0
      case 2:
        return draft.secretId.trim().length > 0 && draft.secretKey.trim().length > 0
      case 4:
        return (
          draft.multipartThreshold.trim().length > 0 &&
          draft.partSize.trim().length > 0 &&
          draft.presignTtl.trim().length > 0 &&
          draft.concurrency > 0
        )
      default:
        return true
    }
  }, [draft, step])

  const openCreateSheet = () => {
    setEditingBucketId(null)
    setDraft(createBucketDraft())
    setStep(0)
    setIsSheetOpen(true)
  }

  const openEditSheet = (bucket: BucketMount) => {
    setEditingBucketId(bucket.id)
    setDraft(createBucketDraft(bucket))
    setStep(0)
    setIsSheetOpen(true)
  }

  const handleSubmit = () => {
    const payload = {
      name: draft.name.trim(),
      provider: draft.provider,
      bucket: draft.bucket.trim(),
      region: draft.region.trim(),
      endpoint: draft.endpoint.trim() || undefined,
      basePrefix: draft.basePrefix.trim(),
      secretId: draft.secretId.trim(),
      secretKey: draft.secretKey.trim(),
      sessionToken: draft.sessionToken.trim() || undefined,
      multipartThreshold: draft.multipartThreshold.trim(),
      partSize: draft.partSize.trim(),
      presignTtl: draft.presignTtl.trim(),
      concurrency: draft.concurrency,
      protocol: draft.protocol,
      pathStyle: draft.pathStyle,
      accelerate: draft.accelerate,
      corsConfigured: draft.corsConfigured,
      advancedMode: draft.advancedMode,
    }

    if (editingBucketId) {
      updateBucket(editingBucketId, {
        name: payload.name,
        provider: payload.provider,
        bucket: payload.bucket,
        region: payload.region,
        endpoint: payload.endpoint,
        basePrefix: payload.basePrefix,
        secretId: payload.secretId,
        secretKey: payload.secretKey,
        sessionToken: payload.sessionToken,
        advancedMode: payload.advancedMode,
        corsStatus: payload.corsConfigured ? "healthy" : "warning",
        corsMessage: payload.corsConfigured
          ? "CORS 配置匹配当前挂载策略"
          : "检测到跨域设置待完善，建议上线前复核",
        strategy: {
          multipartThreshold: payload.multipartThreshold,
          partSize: payload.partSize,
          presignTtl: payload.presignTtl,
          concurrency: payload.concurrency,
          protocol: payload.protocol,
          pathStyle: payload.pathStyle,
          accelerate: payload.accelerate,
        },
      })
    } else {
      addBucket(payload)
    }

    setIsSheetOpen(false)
  }

  return (
    <>
      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">存储策略</div>
            <Button onClick={openCreateSheet}>
              <IconPlus size={16} />
              新建存储桶
            </Button>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {buckets.map((bucket) => (
              <div
                key={bucket.id}
                className="rounded-[15px] px-4 py-4"
                style={{ backgroundColor: "var(--app-shell)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{bucket.name}</div>
                      {bucket.id === activeBucket.id ? (
                        <StatusBadge active>当前使用</StatusBadge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {bucket.provider} · {bucket.region}
                    </div>
                  </div>
                  <StatusBadge active={bucket.corsStatus === "healthy"}>
                    {bucket.corsStatus === "healthy" ? "CORS 正常" : "待处理"}
                  </StatusBadge>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <BucketMeta label="Bucket" value={bucket.bucket ?? "未填写"} />
                  <BucketMeta label="Endpoint" value={bucket.endpoint ?? "默认"} />
                  <BucketMeta label="目录前缀" value={bucket.basePrefix || "/"} />
                  <BucketMeta
                    label="上传策略"
                    value={`${bucket.strategy.multipartThreshold} / ${bucket.strategy.partSize}`}
                  />
                  <BucketMeta
                    label="高级模式"
                    value={bucket.advancedMode ? "已开启" : "已关闭"}
                  />
                  <BucketMeta
                    label="空间配额"
                    value={
                      bucket.quota
                        ? `${formatBytes(bucket.quota.used)} / ${formatBytes(bucket.quota.total)}`
                        : "未限制"
                    }
                  />
                </dl>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => openEditSheet(bucket)}>
                    编辑
                  </Button>
                  {bucket.id !== activeBucket.id ? (
                    <Button variant="outline" onClick={() => setActiveBucket(bucket.id)}>
                      设为当前
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <StorageBucketSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        editingBucket={editingBucket}
        draft={draft}
        onDraftChange={(recipe) => setDraft((current) => recipe(current))}
        step={step}
        onStepChange={setStep}
        canContinue={canContinue}
        onSubmit={handleSubmit}
      />
    </>
  )
}
