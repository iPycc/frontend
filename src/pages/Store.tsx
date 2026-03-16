import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"

export function Store() {
  usePageTitle("商店")
  return (
    <PageShell title="商店" description="应用商店位于后续版本，这里先保留页面框架。">
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        当前版本专注于文件系统与设置中心，插件商店稍后接入。
      </div>
    </PageShell>
  )
}
