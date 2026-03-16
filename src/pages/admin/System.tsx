import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"

export function System() {
  usePageTitle("系统设置")
  return (
    <PageShell title="系统设置" description="管理后台系统配置预留。">
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        系统级配置后续将独立接入。
      </div>
    </PageShell>
  )
}
