import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { IconMessages } from "@tabler/icons-react"

export function Discussions() {
  usePageTitle("讨论")
  return (
    <PageShell title="讨论" description="团队讨论与协作沟通入口。">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <IconMessages size={32} className="text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">功能开发中</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          讨论区将在后续版本接入实时会话数据，当前版本可继续使用文件分享功能进行协作。
        </p>
      </div>
    </PageShell>
  )
}
