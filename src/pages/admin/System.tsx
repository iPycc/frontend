import * as React from "react"
import { AlertTriangle, ArrowRight, CheckCircle2, Database, LoaderCircle, RefreshCw, Settings2 } from "lucide-react"

import { getDatabaseStatus, getInitialDatabaseStatus, type DatabaseBackend, type DatabaseMigration, type DatabaseStatus } from "@/api/database"
import { DatabaseMigrationDialog } from "@/components/database/DatabaseMigrationDialog"
import { MigrationHistoryDialog } from "@/components/database/MigrationHistoryDialog"
import { PageShell } from "@/components/shared/PageShell"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePageTitle } from "@/hooks/use-page-title"
import { cn } from "@/lib/utils"

const backendLabels: Record<DatabaseBackend, string> = {
  sqlite: "SQLite",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
}

export function System() {
  usePageTitle("系统设置")
  const [status, setStatus] = React.useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [historyId, setHistoryId] = React.useState<string | null>(null)
  const detectedSignature = React.useRef<string | null>(null)

  const refresh = React.useCallback(async (initial = false) => {
    try {
      const next = await (initial ? getInitialDatabaseStatus() : getDatabaseStatus())
      setStatus(next)
      setError(null)
      const requiresAttention = next.switch_pending || next.activation_pending || next.activation_failed || migrationIsActive(next)
      const signature = `${next.active.backend}:${next.requested.backend}:${next.current_migration?.id ?? "none"}`
      if (requiresAttention && detectedSignature.current !== signature) {
        detectedSignature.current = signature
        setDialogOpen(true)
      } else if (!requiresAttention) {
        detectedSignature.current = null
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "无法读取数据库状态")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void refresh(true)
  }, [refresh])

  return (
    <PageShell
      title="系统设置"
      description="管理 Cloudrave 的运行级配置。数据库切换完成前不会中断当前读取。"
      action={<Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className={cn(loading && "animate-spin")} />刷新状态</Button>}
      contentClassName="space-y-5"
    >
      <section aria-labelledby="database-settings-heading" className="overflow-hidden rounded-xl border">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-4 py-4 sm:px-5">
          <div className="flex gap-3">
            <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg bg-muted"><Database className="size-4" /></div>
            <div>
              <h2 id="database-settings-heading" className="text-sm font-semibold">数据库</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">支持 SQLite、MySQL 与 PostgreSQL 之间迁移。原数据库始终保留作为回退源。</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={loading || !status}>
            <Settings2 />{status?.switch_pending ? "继续切换" : "更改数据库"}
          </Button>
        </div>

        {loading && !status ? (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />正在检查数据库状态…</div>
        ) : status ? (
          <div className="divide-y">
            <div className="grid gap-4 px-4 py-5 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <DatabaseSummary label="当前运行" profile={status.active} rows={status.source?.summary.total_rows} reachable={status.source?.reachable} />
              <div className="hidden items-center justify-center md:flex"><ArrowRight className="size-4 text-muted-foreground" /></div>
              {status.switch_pending ? <DatabaseSummary label="配置目标" profile={status.requested} rows={status.target?.summary.total_rows} reachable={status.target?.reachable} /> : <div className="hidden md:block" />}
            </div>
            <dl className="grid gap-x-8 gap-y-3 bg-muted/20 px-4 py-4 text-sm sm:px-5 md:grid-cols-2">
              <StatusRow label="配置来源" value={status.managed_by === "config" ? "config.ini 分字段配置" : status.managed_by === "environment" ? "环境变量覆盖" : "[database].url 覆盖"} />
              <StatusRow label="配置文件" value={status.config_path} mono />
              <StatusRow label="状态" value={statusLabel(status)} />
              <StatusRow label="Schema 版本" value={status.source?.schema_version == null ? "未知" : `v${status.source.schema_version}`} />
            </dl>
          </div>
        ) : null}
      </section>

      {status?.warning ? (
        <div className="flex gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span>{status.warning}</span></div>
      ) : null}
      {status?.activation_pending ? (
        <div className="flex gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 size-4 shrink-0" /><span>数据已准备完成，请手动重启后端服务以激活 {backendLabels[status.requested.backend]}。</span></div>
      ) : null}
      {error ? <div role="alert" className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{error}</div> : null}

      {status?.recent_migrations.length ? (
        <section aria-labelledby="database-migrations-heading" className="flex flex-col gap-3">
          <div>
            <h2 id="database-migrations-heading" className="text-lg font-semibold">迁移记录</h2>
            <p className="text-xs text-muted-foreground">最近 {status.recent_migrations.length} 次任务；记录不会因再次切换而消失。</p>
          </div>
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>方向与选择</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="hidden sm:table-cell">时间</TableHead>
                  <TableHead className="text-right">日志</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {status.recent_migrations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <span>{backendLabels[item.source_backend]} → {backendLabels[item.target_backend]}</span>
                      <span className="block text-xs text-muted-foreground">{item.data_choice === "source" ? "迁移原库数据" : "保留目标库数据"}</span>
                    </TableCell>
                    <TableCell className={cn(item.phase === "failed" && "text-destructive")}>{migrationStatusLabel(item)}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{new Date(item.updated_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setHistoryId(item.id)}>查看日志</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      <DatabaseMigrationDialog open={dialogOpen} onOpenChange={setDialogOpen} initialStatus={status} onStatusChange={setStatus} />
      <MigrationHistoryDialog migrationId={historyId} onClose={() => setHistoryId(null)} />
    </PageShell>
  )
}

function DatabaseSummary({ label, profile, rows, reachable }: { label: string; profile: DatabaseStatus["active"]; rows?: number; reachable?: boolean }) {
  return <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-1 flex items-center gap-2"><span className="text-lg font-semibold">{backendLabels[profile.backend]}</span>{reachable === false ? <span className="text-xs text-destructive">连接失败</span> : reachable ? <span className="text-xs text-emerald-700 dark:text-emerald-300">连接正常</span> : null}</div><p className="mt-1 truncate text-xs text-muted-foreground">{profile.backend === "sqlite" ? profile.name : `${profile.user || "-"}@${profile.host || "-"}:${profile.port || "-"}/${profile.name}`}</p>{rows != null ? <p className="mt-3 text-sm tabular-nums">{rows.toLocaleString()} 条数据库记录</p> : null}</div>
}

function StatusRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] gap-2"><dt className="text-muted-foreground">{label}</dt><dd className={cn("truncate", mono && "font-mono text-xs")}>{value}</dd></div>
}

function statusLabel(status: DatabaseStatus) {
  if (status.activation_failed) return "激活失败，已回退原数据库"
  if (status.activation_pending) return "等待重启激活"
  if (status.current_migration && ["queued", "connecting", "inventory", "backup", "schema", "copying", "verifying"].includes(status.current_migration.phase)) return `迁移中 · ${status.current_migration.progress}%`
  if (status.switch_pending) return "已检测到待切换配置"
  return "运行正常"
}

function migrationIsActive(status: DatabaseStatus | null) {
  return Boolean(status?.current_migration && ["queued", "connecting", "inventory", "backup", "schema", "copying", "verifying"].includes(status.current_migration.phase))
}

function migrationStatusLabel(migration: DatabaseMigration) {
  if (migration.phase === "failed") return "失败"
  if (migration.phase === "ready") return migration.restart_required ? "等待重启" : "已完成"
  return `进行中 · ${migration.progress}%`
}
