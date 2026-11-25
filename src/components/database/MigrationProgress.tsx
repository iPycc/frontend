import type { DatabaseMigration } from "@/api/database"
import { cn } from "@/lib/utils"

export function MigrationProgress({ migration }: { migration: DatabaseMigration }) {
  const phaseLabels: Record<string, string> = { queued: "等待中", connecting: "连接中", inventory: "检查数据", backup: "备份中", schema: "准备表结构", copying: "复制中", verifying: "校验中", ready: "等待重启生效", failed: "迁移失败" }
  let color = "bg-primary/15"
  if (migration.phase === "failed") color = "bg-destructive/15"
  else if (migration.phase === "ready") color = "bg-emerald-500/15"
  return <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 px-4 py-3">
    <div className={cn("pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-300", color)}
      style={{ width: `${Math.max(0, Math.min(100, migration.progress || 0))}%` }} aria-hidden="true" />
    <div className="relative flex flex-wrap items-center justify-between gap-2">
      <span className="min-w-0 break-words text-sm font-medium">{migration.detail || phaseLabels[migration.phase] || "迁移已结束"}</span>
      <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{migration.processed_rows.toLocaleString()} / {migration.total_rows.toLocaleString()} 行 · {migration.progress}%</span>
    </div>
  </div>
}
