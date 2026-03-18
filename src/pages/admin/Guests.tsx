import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"

export function Guests() {
  usePageTitle("访客管理")
  return (
    <PageShell title="访客管理" description="管理后台页面预留。">
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        访客权限页面仍为预留布局。
      </div>
    </PageShell>
  )
}
