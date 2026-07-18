import { IconAlertCircle, IconCheck, IconLoader2 } from "@tabler/icons-react"

import type { BucketMount } from "@/lib/models"
import { cn } from "@/lib/utils"

const labels = {
  never: "尚未同步",
  idle: "尚未同步",
  pending: "等待同步",
  running: "同步未完成",
  completed: "同步完成",
  failed: "同步失败",
} as const

export function MountStatus({ bucket }: { bucket: BucketMount }) {
  const running = bucket.syncStatus === "running" || bucket.syncStatus === "pending"
  const failed = bucket.syncStatus === "failed"
  const Icon = running ? IconLoader2 : failed ? IconAlertCircle : IconCheck

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>{bucket.mountMode === "mirror" ? "镜像" : "托管"}</span>
      {bucket.readOnly ? <span>只读</span> : null}
      {bucket.rootPath ? <span className="max-w-48 truncate font-mono" title={bucket.rootPath}>{bucket.rootPath}</span> : null}
      {bucket.mountMode === "mirror" ? (
        <span className={cn("inline-flex items-center gap-1", failed && "text-destructive")} title={bucket.syncError}>
          <Icon className={cn("size-3.5", running && "animate-spin")} />
          {labels[bucket.syncStatus]}
          {bucket.syncedObjects > 0 ? ` · ${bucket.syncedObjects} 个对象` : ""}
        </span>
      ) : null}
      {bucket.lastSyncAt ? <span title="上次同步时间">{bucket.lastSyncAt}</span> : null}
    </div>
  )
}
