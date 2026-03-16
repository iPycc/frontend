import { useNavigate } from "react-router-dom"
import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { Button } from "@/components/ui/button"
import { IconArrowRight } from "@tabler/icons-react"

export function Mounts() {
  usePageTitle("存储桶")
  const navigate = useNavigate()
  const { buckets } = useAppState()

  return (
    <PageShell
      title="连接与挂载"
      description="挂载列表、CORS 检测结果和存储策略参数从同一数据源派生。"
      action={
        <Button variant="outline" onClick={() => navigate("/settings/storage")}>
          去管理
          <IconArrowRight size={14} />
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {buckets.map((bucket) => (
          <div key={bucket.id} className="rounded-[15px] border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{bucket.name}</div>
                <div className="text-sm text-muted-foreground">{bucket.provider}</div>
              </div>
              <span className="text-sm text-muted-foreground">{bucket.corsStatus === "healthy" ? "CORS 正常" : "待处理"}</span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div>Bucket：{bucket.bucket || "local"}</div>
              <div>Region：{bucket.region || "本机"}</div>
              <div>策略：{bucket.strategy.multipartThreshold} / {bucket.strategy.partSize}</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
