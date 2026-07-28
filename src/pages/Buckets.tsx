import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { IconArrowRight, IconBucket, IconCheck, IconCloud, IconDatabase, IconExclamationCircle } from "@tabler/icons-react"

import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/state/app"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MountStatus } from "@/components/storage/MountStatus"

const providerIcon: Record<string, typeof IconDatabase> = {
  local: IconDatabase,
  aliyun: IconCloud,
  tencent: IconCloud,
}

export function Buckets() {
  usePageTitle("存储桶")
  const navigate = useNavigate()
  const { buckets } = useAppState()

  return (
    <PageShell
      title="存储桶"
      description="统一管理已连接的存储桶、挂载状态与 CORS 检测结果。"
      action={
        <Button onClick={() => navigate("/settings/storage")}>
          管理存储桶
          <IconArrowRight size={14} className="ml-1.5" />
        </Button>
      }
    >
      {buckets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <IconBucket size={32} className="text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">暂无存储桶</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            当前账号还没有可用的存储桶，请前往设置中心添加本地存储或对象存储。
          </p>
          <Button className="mt-5" onClick={() => navigate("/settings/storage")}>
            去添加存储桶
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buckets.map((bucket, index) => {
            const Icon = providerIcon[bucket.storageType] || IconDatabase
            const healthy = bucket.corsStatus === "healthy"

            return (
              <motion.div
                key={bucket.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.25 }}
                className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                      healthy
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {healthy ? <IconCheck size={12} /> : <IconExclamationCircle size={12} />}
                    {healthy ? "CORS 正常" : "待处理"}
                  </span>
                </div>

                <div className="mt-4 min-w-0">
                  <h3 className="truncate text-sm font-medium" title={bucket.name}>
                    {bucket.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{bucket.provider}</p>
                </div>

                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>类型</span>
                    <span className="font-medium text-foreground">{bucket.storageType.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bucket</span>
                    <span className="font-medium text-foreground">{bucket.bucket || "local"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Region</span>
                    <span className="font-medium text-foreground">{bucket.region || "本机"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>分块阈值</span>
                    <span className="font-medium text-foreground">{bucket.strategy.multipartThreshold}</span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">{bucket.corsMessage}</p>
                <div className="mt-3 border-t border-border/50 pt-3"><MountStatus bucket={bucket} /></div>
              </motion.div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
