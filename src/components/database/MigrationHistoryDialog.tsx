import * as React from "react"
import { Download } from "lucide-react"

import { downloadDatabaseBackup, getDatabaseMigration, type DatabaseMigration } from "@/api/database"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const backendNames = { sqlite: "SQLite", mysql: "MySQL", postgresql: "PostgreSQL" }

export function MigrationHistoryDialog({ migrationId, onClose }: { migrationId: string | null; onClose: () => void }) {
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
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "无法读取迁移日志")
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
      <DialogContent className="w-[min(94vw,42rem)] max-w-none gap-4 sm:max-w-none">
        <DialogHeader>
          <DialogTitle>迁移记录与日志</DialogTitle>
          <DialogDescription>
            {migration
              ? `${backendNames[migration.source_backend]} → ${backendNames[migration.target_backend]} · ${migration.data_choice === "source" ? "迁移原库数据" : "保留目标库数据"}`
              : "正在读取迁移记录"}
          </DialogDescription>
        </DialogHeader>
        {migration ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">{migration.detail} · {migration.progress}% · {migration.processed_rows.toLocaleString()} / {migration.total_rows.toLocaleString()} 行</p>
            <ScrollArea className="h-64 rounded-md border bg-muted/20">
              <div className="flex flex-col gap-1 p-3 font-mono text-xs leading-5">
                {migration.logs.length ? migration.logs.map((entry) => (
                  <div key={entry.seq} className={cn("break-words", entry.level === "error" && "text-destructive")}>
                    <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()} </span>{entry.message}
                  </div>
                )) : <p className="text-muted-foreground">暂无日志</p>}
              </div>
            </ScrollArea>
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">正在加载…</p>
        )}
        {error && migration ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          {migration?.backup_available ? <Button variant="outline" onClick={() => void download()}><Download />下载目标库备份</Button> : null}
          <Button variant="outline" onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
