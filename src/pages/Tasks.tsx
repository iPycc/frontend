import * as React from "react"

import { listBackgroundTasks, type BackgroundTask } from "@/api/files"
import { controlUserMountSyncTask, listMountSyncTasks, type MountSyncTask } from "@/api/user-storage"
import { PageShell } from "@/components/shared/PageShell"
import { Button } from "@/components/ui/button"
import { usePageTitle } from "@/hooks/use-page-title"
import { toast } from "sonner"

export function Tasks() {
  usePageTitle("后台任务")
  const [backgroundTasks, setBackgroundTasks] = React.useState<BackgroundTask[]>([])
  const [syncTasks, setSyncTasks] = React.useState<MountSyncTask[]>([])
  const [refresh, setRefresh] = React.useState(0)
  const [pendingTask, setPendingTask] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const load = async () => {
      try {
        const [tasks, syncs] = await Promise.all([listBackgroundTasks(), listMountSyncTasks()])
        if (cancelled) return
        setBackgroundTasks(tasks)
        setSyncTasks(syncs)
        if (tasks.some((task) => task.status === "pending" || task.status === "running") ||
            syncs.some((task) => task.status === "pending" || task.status === "running")) {
          timer = window.setTimeout(() => void load(), 1500)
        }
      } catch {
        if (!cancelled) timer = window.setTimeout(() => void load(), 5000)
      }
    }
    void load()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [refresh])

  const controlSync = async (task: MountSyncTask, action: "pause" | "resume" | "cancel") => {
    setPendingTask(task.id)
    try {
      await controlUserMountSyncTask(task.mount_id, task.id, action)
      setRefresh((value) => value + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally {
      setPendingTask(null)
    }
  }

  return (
    <PageShell
      title="后台任务"
      description="查看服务器后台任务的执行状态。"
      className="flex min-h-0 flex-col overflow-hidden"
      contentClassName="min-h-0 flex-1"
    >
      <div className="custom-scrollbar h-full min-h-0 overflow-y-auto pr-1">
        <div className="space-y-4 pb-1">
          {syncTasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-border/60 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{task.name} · 文件导入</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    已扫描 {task.scanned} 项，新增 {task.created} 项，更新 {task.updated} 项，跳过 {task.skipped} 项，冲突 {task.conflicts} 项
                  </div>
                  {task.error ? <div className="mt-1 text-sm text-destructive">{task.error}</div> : null}
                </div>
                <div className="text-sm text-muted-foreground">
                  {{ pending: "等待中", running: "处理中", paused: "已暂停", completed: "已完成", failed: "失败", canceled: "已取消" }[task.status]}
                </div>
              </div>
              {["pending", "running", "paused", "failed"].includes(task.status) ? (
                <div className="mt-3 flex gap-2">
                  {task.status === "pending" || task.status === "running" ? (
                    <Button size="sm" variant="outline" disabled={pendingTask !== null} onClick={() => void controlSync(task, "pause")}>暂停</Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={pendingTask !== null} onClick={() => void controlSync(task, "resume")}>继续</Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={pendingTask !== null} onClick={() => void controlSync(task, "cancel")}>取消</Button>
                </div>
              ) : null}
            </div>
          ))}
          {backgroundTasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{task.name}</div>
                  <div className="text-sm text-muted-foreground">{task.detail ?? "后台处理中"}</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {task.status === "completed" ? "已完成" : task.status === "failed" ? "失败" : task.status === "running" ? "处理中" : "等待中"}
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
