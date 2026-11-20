import { useNavigate } from "react-router-dom"
import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/state/app"
import { Button } from "@/components/ui/button"
import { IconArrowRight } from "@tabler/icons-react"
import { MountStatus, mountCorsLabels } from "@/components/storage/MountStatus"
import { getProviderDisplayName, ProviderIcon } from "@/components/storage/ProviderIcon"

export function Mounts() {
  usePageTitle("存储桶")
  const navigate = useNavigate()
  const { buckets } = useAppState()

  return (
    <PageShell
      title="连接与挂载"
      className="flex min-h-0 flex-col overflow-hidden"
      contentClassName="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-2"
      action={
        <Button variant="outline" onClick={() => navigate("/settings/storage")}>
          去管理
          <IconArrowRight size={14} />
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {buckets.map((bucket) => (
          <div key={bucket.id} className="min-w-0 rounded-xl border border-border/60 bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <ProviderIcon driverId={bucket.driverId} provider={bucket.provider} size={28} />
                <div className="min-w-0">
                  <div className="truncate font-medium" title={bucket.name}>{bucket.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {getProviderDisplayName(bucket.driverId, bucket.provider)}
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{mountCorsLabels[bucket.corsStatus]}</span>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div className="break-all">Bucket：{bucket.bucket || "local"}</div>
              <div>Region：{bucket.region || "本机"}</div>
              <div>策略：{bucket.strategy.multipartThreshold} / {bucket.strategy.partSize}</div>
              <div className="break-all">前缀：{bucket.rootPath || "存储桶根目录"}</div>
            </div>
            <div className="mt-2 border-t border-border/50 pt-2"><MountStatus bucket={bucket} /></div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
