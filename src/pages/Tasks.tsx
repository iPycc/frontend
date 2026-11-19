import * as React from "react"

import { listBackgroundTasks, type BackgroundTask } from "@/api/files"
import { controlPathPlan, controlUserMountSyncTask, listMountSyncTasks, listPathPlans, startPathPlan, type MountSyncTask, type PathPlanTask } from "@/api/user-storage"
import { PageShell } from "@/components/shared/PageShell"
import { Button } from "@/components/ui/button"
import { SyncConflictDialog } from "@/components/storage/SyncConflictDialog"
import { PathPlanConflictDialog } from "@/components/storage/PathPlanConflictDialog"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/state/app"
import { toast } from "sonner"

export function Tasks() {
  usePageTitle("后台任务")
  const [backgroundTasks, setBackgroundTasks] = React.useState<BackgroundTask[]>([])
  const [syncTasks, setSyncTasks] = React.useState<MountSyncTask[]>([])
  const [refresh, setRefresh] = React.useState(0)
  const [pendingTask, setPendingTask] = React.useState<string | null>(null)
  const [conflictTask, setConflictTask] = React.useState<MountSyncTask | null>(null)
  const [pathTasks, setPathTasks] = React.useState<PathPlanTask[]>([])
  const [pathConflict, setPathConflict] = React.useState<PathPlanTask | null>(null)
  const [mountId, setMountId] = React.useState("")
  const [template, setTemplate] = React.useState("{dir}/{filename}")
  const { buckets, formatBytes } = useAppState()
  const pathMounts = buckets.filter((bucket) => bucket.canEditConnection && ["tencent_cos", "aliyun_oss"].includes(bucket.driverId))

  React.useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const load = async () => {
      try {
        const [tasks, syncs, paths] = await Promise.all([listBackgroundTasks(), listMountSyncTasks(), listPathPlans()])
        if (cancelled) return
        setBackgroundTasks(tasks)
        setSyncTasks(syncs)
        setPathTasks(paths)
        if (tasks.some((task) => task.status === "pending" || task.status === "running") ||
            syncs.some((task) => task.status === "pending" || task.status === "running") ||
            paths.some((task) => task.status === "pending" || task.status === "running")) {
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

  const startPath = async () => {
    if (!mountId) return
    setPendingTask("new")
    try {
      await startPathPlan(Number(mountId), template)
      setRefresh((value) => value + 1)
      toast.success("路径预检查已加入后台任务")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "启动预检查失败")
    } finally { setPendingTask(null) }
  }

  const controlPath = async (task: PathPlanTask, action: "pause" | "resume" | "cancel") => {
    setPendingTask(task.id)
    try {
      await controlPathPlan(task, action)
      setRefresh((value) => value + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally { setPendingTask(null) }
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
          {pathMounts.length > 0 ? <div className="rounded-xl border border-border/60 bg-background p-4">
            <div className="font-medium">存储路径预检查</div>
            <div className="mt-1 text-sm text-muted-foreground">仅检查，不会移动文件；迁移功能尚未开放。检查范围为提交时已有的活动文件，结果可能随存储内容变化。</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select aria-label="选择存储" value={mountId} onChange={(event) => setMountId(event.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm">
                <option value="">选择存储</option>{pathMounts.map((bucket) => <option key={bucket.id} value={bucket.backendId}>{bucket.name}</option>)}
              </select>
              <input aria-label="对象路径模板" value={template} onChange={(event) => setTemplate(event.target.value)} className="h-9 min-w-48 flex-1 rounded-md border bg-background px-3 font-mono text-sm" />
              <Button size="sm" disabled={!mountId || !template || pendingTask !== null} onClick={() => void startPath()}>开始检查</Button>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">变量：{"{dir}"}、{"{filename}"}、{"{stem}"}、{"{ext}"}、{"{blob_id}"}。例如 blob/{"{dir}"}/{"{blob_id}"}-{"{filename}"}</div>
          </div> : null}
          {pathTasks.map((task) => <div key={task.id} className="rounded-xl border border-border/60 bg-background p-4">
            <div className="flex items-start justify-between gap-3"><div>
              <div className="font-medium">{task.name} · 路径预检查</div>
              <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{task.template}</div>
              <div className="mt-1 text-sm text-muted-foreground">已检查 {task.scanned} 项，迁移候选 {task.ready} 项，无需迁移 {task.unchanged} 项，冲突 {task.conflicts} 项 · 候选对象大小 {formatBytes(task.bytes_to_copy)}</div>
              {task.error ? <div className="mt-1 text-sm text-destructive">{task.error}</div> : null}
            </div><div className="text-sm text-muted-foreground">{{ pending: "等待中", running: "处理中", paused: "已暂停", completed: "已完成", failed: "失败", canceled: "已取消" }[task.status]}</div></div>
            {task.conflicts > 0 || ["pending", "running", "paused", "failed"].includes(task.status) ? <div className="mt-3 flex gap-2">
              {task.conflicts > 0 ? <Button size="sm" variant="outline" onClick={() => setPathConflict(task)}>查看冲突</Button> : null}
              {task.status === "pending" || task.status === "running" ? <Button size="sm" variant="outline" disabled={pendingTask !== null} onClick={() => void controlPath(task, "pause")}>暂停</Button> : task.status === "paused" || task.status === "failed" ? <Button size="sm" variant="outline" disabled={pendingTask !== null} onClick={() => void controlPath(task, "resume")}>继续</Button> : null}
              {["pending", "running", "paused", "failed"].includes(task.status) ? <Button size="sm" variant="ghost" disabled={pendingTask !== null} onClick={() => void controlPath(task, "cancel")}>取消</Button> : null}
            </div> : null}
          </div>)}
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
              {task.conflicts > 0 || ["pending", "running", "paused", "failed"].includes(task.status) ? (
                <div className="mt-3 flex gap-2">
                  {task.conflicts > 0 ? <Button size="sm" variant="outline" onClick={() => setConflictTask(task)}>查看冲突</Button> : null}
                  {task.status === "pending" || task.status === "running" ? (
                    <Button size="sm" variant="outline" disabled={pendingTask !== null} onClick={() => void controlSync(task, "pause")}>暂停</Button>
                  ) : task.status === "paused" || task.status === "failed" ? (
                    <Button size="sm" variant="outline" disabled={pendingTask !== null} onClick={() => void controlSync(task, "resume")}>继续</Button>
                  ) : null}
                  {["pending", "running", "paused", "failed"].includes(task.status) ? <Button size="sm" variant="ghost" disabled={pendingTask !== null} onClick={() => void controlSync(task, "cancel")}>取消</Button> : null}
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
      {conflictTask ? <SyncConflictDialog task={conflictTask} onClose={() => setConflictTask(null)} /> : null}
      {pathConflict ? <PathPlanConflictDialog task={pathConflict} onClose={() => setPathConflict(null)} /> : null}
    </PageShell>
  )
}
