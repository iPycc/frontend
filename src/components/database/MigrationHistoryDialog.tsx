import { MigrationProgress } from "./MigrationProgress"
import * as React from "react"
import { Download, Loader2 } from "lucide-react"

import { downloadDatabaseBackup, getDatabaseMigration, type DatabaseMigration } from "@/api/database"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const backendNames = { sqlite: "SQLite", mysql: "MySQL", postgresql: "PostgreSQL" }

export function MigrationHistoryDialog({
  migrationId,
  onClose,
}: {
  migrationId: string | null
  onClose: () => void
}) {
  const [migration, setMigration] = React.useState<DatabaseMigration | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!migrationId) return
    const controller = new AbortController()
    setMigration(null)
    setError(null)
    void getDatabaseMigration(migrationId, 0, controller.signal)
      .then(setMigration)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "无法读取迁移日志")
        }
      })
    return () => controller.abort()
  }, [migrationId])

  const download = async () => {
    if (!migration) return
    try {
      await downloadDatabaseBackup(migration)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "备份下载失败")
    }
  }

  return (
    <Dialog open={Boolean(migrationId)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="w-[min(92vw,29rem)] max-h-[90dvh] overflow-y-auto max-w-none gap-4 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl sm:max-w-none">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">迁移记录</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {migration
              ? `${backendNames[migration.source_backend]} → ${backendNames[migration.target_backend]} · ${
                  migration.data_choice === "source" ? "迁移原库数据" : "直接使用目标库"
                }`
              : "正在读取迁移记录..."}
          </DialogDescription>
        </DialogHeader>

        {migration ? (
          <div className="space-y-3.5">
            <MigrationProgress migration={migration} />

            <ScrollArea className="h-44 rounded-xl border border-border bg-muted/25">
              <div className="space-y-1 p-3 font-mono text-[11px] leading-5 text-foreground/85">
                {migration.logs.length ? (
                  migration.logs.map((entry) => (
                    <div
                      key={entry.seq}
                      className={cn(
                        "break-words",
                        entry.level === "error" && "font-medium text-destructive",
                        entry.level === "warning" && "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      <span className="mr-2 text-muted-foreground select-none">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      {entry.message}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">暂无日志</p>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : error ? (
          <p role="alert" className="text-xs text-destructive">{error}</p>
        ) : (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            加载中...
          </div>
        )}
        {error && migration ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

        <DialogFooter className="pt-1">
          {migration?.backup_available ? (
            <Button variant="outline" onClick={() => void download()}>
              <Download className="size-4" />
              下载备份
            </Button>
          ) : null}
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
