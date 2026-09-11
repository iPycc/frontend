import * as React from "react"

import { listBackgroundTasks, type BackgroundTask } from "@/api/files"
import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useUploadState } from "@/lib/upload/provider"

export function Tasks() {
  usePageTitle("后台任务")
  const { offlineTasks } = useUploadState()
  const [backgroundTasks, setBackgroundTasks] = React.useState<BackgroundTask[]>([])

  React.useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const load = async () => {
      try {
        const tasks = await listBackgroundTasks()
        if (cancelled) return
        setBackgroundTasks(tasks)
        if (tasks.some((task) => task.status === "pending" || task.status === "running")) {
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
  }, [])

  return (
    <PageShell
      title="后台任务"
      description="展示离线下载、打包下载等后台任务的执行状态。"
      className="flex min-h-0 flex-col overflow-hidden"
      contentClassName="min-h-0 flex-1"
    >
      <div className="custom-scrollbar h-full min-h-0 overflow-y-auto pr-1">
        <div className="space-y-4 pb-1">
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
          {offlineTasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-border/60 bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{task.name}</div>
                  <div className="text-sm text-muted-foreground">{task.url}</div>
                </div>
                <div className="text-sm text-muted-foreground">{task.status}</div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
