import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"

export function Discussions() {
  usePageTitle("讨论")
  return (
    <PageShell title="讨论" description="团队讨论入口预留。">
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        讨论区尚未接入实际会话数据。
      </div>
    </PageShell>
  )
}
