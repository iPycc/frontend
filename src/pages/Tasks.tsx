import * as React from "react"

import { listBackgroundTasks, type BackgroundTask } from "@/api/files"
import {
  controlPathMigration, controlPathPlan, controlUserMountSyncTask, listMountSyncTasks, listPathPlans,
  type MountSyncTask, type PathPlanTask,
} from "@/api/user-storage"
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
  const { formatBytes } = useAppState()

  React.useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const load = async () => {
      try {
        const [tasks, syncs, paths] = await Promise.all([listBackgroundTasks(), listMountSyncTasks(), listPathPlans()])
        if (cancelled) return
        setBackgroundTasks(tasks)
        setSyncTasks(syncs)
        const operations = paths.filter((task) => task.is_restore || Boolean(task.rename_to) || task.move_to != null || task.copy_to != null)
        setPathTasks(operations)
        if (tasks.some((task) => task.status === "pending" || task.status === "running") ||
            syncs.some((task) => task.status === "pending" || task.status === "running") ||
            operations.some((task) => [task.status, task.migration?.status].some((status) => status === "pending" || status === "running"))) {
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

  const controlPath = async (task: PathPlanTask, action: "pause" | "resume" | "cancel") => {
    setPendingTask(task.id)
    try {
      await controlPathPlan(task, action)
      setRefresh((value) => value + 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally { setPendingTask(null) }
  }

  const migratePath = async (task: PathPlanTask, action: "start" | "pause" | "resume" | "cancel") => {
    setPendingTask(task.id)
    try {
      await controlPathMigration(task, action)
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
          {pathTasks.map((task) => {
            const migration = task.migration
            const taskStatus = migration?.status ?? task.status
            const conflicts = migration?.conflicts ?? task.conflicts
            const isPathOperation = task.is_restore || Boolean(task.rename_to) || task.move_to != null || task.copy_to != null
            const canStart = !isPathOperation && !migration && task.status === "completed" && task.ready > 0
            const title = task.is_restore ? `恢复 ${task.source_name ?? "条目"}`
              : task.copy_name ? `复制为 ${task.copy_name}`
              : task.rename_to ? `改名为 ${task.rename_to}`
              : task.move_to != null ? `移动 ${task.source_name ?? "文件"}`
              : migration ? "历史路径迁移" : "路径预检查"
            const control = (action: "pause" | "resume" | "cancel") =>
              migration ? migratePath(task, action) : controlPath(task, action)
            const canPause = taskStatus === "pending" || taskStatus === "running"
            const canResume = taskStatus === "paused" || taskStatus === "failed"
            const canCancel = canResume || taskStatus === "pending" || (!migration && taskStatus === "running")
            return (
              <div key={task.id} className="rounded-xl border border-border/60 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="break-all font-medium">
                      {task.name} · {title}
                    </div>
                    {task.root_node_id != null && taskStatus !== "completed" ? (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {migration ? `已准备 ${migration.prepared ?? 0} / ${task.ready} 项` : `已检查 ${task.scanned} 项`}
                      </div>
                    ) : null}
                    {isPathOperation ? null : (
                      <>
                        <div className="mt-1 break-all font-mono text-xs text-muted-foreground">{task.template}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{migration
                          ? <>已迁移 {migration.migrated} / {task.ready} 项，冲突 {conflicts} 项 · 源对象保留</>
                          : <>已检查 {task.scanned} 项，待迁移 {task.ready} 项，冲突 {conflicts} 项 · 额外空间 {formatBytes(task.bytes_to_copy)}</>}
                        </div>
                      </>
                    )}
                    {migration?.error || task.error ? <div className="mt-1 text-sm text-destructive">{migration?.error ?? task.error}</div> : null}
                  </div>
                  <div className="shrink-0 text-sm text-muted-foreground">
                    {{ pending: "等待中", running: "处理中", paused: "已暂停", completed: isPathOperation && conflicts > 0 ? "有冲突" : "已完成",
                      failed: "失败", canceled: "已取消" }[taskStatus]}
                  </div>
                </div>
                {canStart || conflicts > 0 || canPause || canResume || canCancel ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canStart ? <Button size="sm" disabled={pendingTask !== null} onClick={() => void migratePath(task, "start")}>复制并迁移</Button> : null}
                    {conflicts > 0 ? <Button size="sm" variant="outline" onClick={() => setPathConflict(task)}>查看冲突</Button> : null}
                    {canPause ? <Button size="sm" variant="outline" disabled={pendingTask !== null} onClick={() => void control("pause")}>暂停</Button> : null}
                    {canResume ? <Button size="sm" variant="outline" disabled={pendingTask !== null} onClick={() => void control("resume")}>继续</Button> : null}
                    {canCancel ? <Button size="sm" variant="ghost" disabled={pendingTask !== null} onClick={() => void control("cancel")}>取消</Button> : null}
                  </div>
                ) : null}
              </div>
            )
          })}
          {syncTasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-border/60 bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{task.name} · 文件导入</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {task.status === "completed" && task.scanned === 0
                      ? "没有可导入的源对象"
                      : <>已扫描 {task.scanned} 项，新增 {task.created} 项，更新 {task.updated} 项，跳过 {task.skipped} 项，冲突 {task.conflicts} 项</>}
                    {task.missing > 0 ? `，本次发现 ${task.missing} 项源对象缺失` : null}
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
