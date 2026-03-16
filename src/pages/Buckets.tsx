import { useNavigate } from "react-router-dom"
import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { Button } from "@/components/ui/button"

export function Buckets() {
  usePageTitle("存储桶")
  const navigate = useNavigate()
  return (
    <PageShell
      title="存储桶"
      description="统一从设置中心管理存储桶、连接策略与 CORS 检测。"
      action={<Button onClick={() => navigate("/settings/storage")}>打开设置中心</Button>}
    >
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
        存储桶新建、命名和策略参数都已经迁移到右上角设置页的「存储桶管理」Tab。
      </div>
    </PageShell>
  )
}
