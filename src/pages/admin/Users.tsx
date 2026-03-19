import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"

export function Users() {
  usePageTitle("用户管理")
  return (
    <PageShell title="用户管理" description="管理后台页面预留。">
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        当前任务聚焦于用户端文件系统和设置页。
      </div>
    </PageShell>
  )
}
