import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { IconTools } from "@tabler/icons-react"

export function Store() {
  usePageTitle("商店")
  return (
    <PageShell title="商店" description="插件与应用商店。">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <IconTools size={32} className="text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">功能开发中</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          插件商店将在后续版本开放，当前版本专注于文件系统与存储管理。
        </p>
      </div>
    </PageShell>
  )
}
