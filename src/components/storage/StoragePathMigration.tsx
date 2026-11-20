import * as React from "react"
import { toast } from "sonner"

import {
  controlPathMigration, controlPathPlan, listPathPlans, previewPathTemplate, startPathPlan,
  type PathPlanTask, type PathTemplatePreview,
} from "@/api/user-storage"
import { PathPlanConflictDialog } from "@/components/storage/PathPlanConflictDialog"
import { DEFAULT_OBJECT_PATH_TEMPLATE, ORIGINAL_OBJECT_PATH } from "@/components/storage/object-path"
import { FormCard } from "@/components/storage/shared"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BucketMount } from "@/lib/models"
import { useAppState } from "@/state/app"

export function StoragePathMigration({ bucket }: { bucket: BucketMount }) {
  const savedTemplate = bucket.extra?.object_key_template
  const [mode, setMode] = React.useState<"original" | "custom">(
    typeof savedTemplate === "string" && savedTemplate !== ORIGINAL_OBJECT_PATH ? "custom" : "original"
  )
  const [customTemplate, setCustomTemplate] = React.useState(
    typeof savedTemplate === "string" && savedTemplate !== ORIGINAL_OBJECT_PATH ? savedTemplate : DEFAULT_OBJECT_PATH_TEMPLATE
  )
  const template = mode === "original" ? ORIGINAL_OBJECT_PATH : customTemplate
  const [example, setExample] = React.useState<PathTemplatePreview | null>(null)
  const [previewError, setPreviewError] = React.useState("")
  const [tasks, setTasks] = React.useState<PathPlanTask[]>([])
  const [loadError, setLoadError] = React.useState("")
  const [refresh, setRefresh] = React.useState(0)
  const [pending, setPending] = React.useState(false)
  const [conflict, setConflict] = React.useState<PathPlanTask | null>(null)
  const { formatBytes } = useAppState()

  React.useEffect(() => {
    setExample(null)
    setPreviewError("")
    if (!template) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const result = await previewPathTemplate(bucket.backendId, template, controller.signal)
        if (!controller.signal.aborted) setExample(result)
      } catch (error) {
        if (!controller.signal.aborted) setPreviewError(error instanceof Error ? error.message : "无法预览路径")
      }
    }, 250)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [bucket.backendId, template])

  React.useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const load = async () => {
      try {
        const result = await listPathPlans()
        if (cancelled) return
        const plans = result.filter((task) => task.mount_id === bucket.backendId &&
          !task.is_restore && !task.rename_to && task.move_to == null && task.copy_to == null)
        setTasks(plans)
        setLoadError("")
        if (plans.some((task) => [task.status, task.migration?.status].some((status) => status === "pending" || status === "running"))) {
          timer = window.setTimeout(() => void load(), 1500)
        }
      } catch (error) {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "加载迁移记录失败")
      }
    }
    void load()
    return () => { cancelled = true; if (timer) window.clearTimeout(timer) }
  }, [bucket.backendId, refresh])

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setPending(true)
    try {
      await action()
      setRefresh((value) => value + 1)
      if (success) toast.success(success)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败")
    } finally { setPending(false) }
  }

  return (
    <FormCard title="迁移已有文件" className="mt-4">
      <div className="space-y-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={mode} onValueChange={(value) => { if (value !== mode) setExample(null); setMode(value as "original" | "custom") }}>
            <SelectTrigger className="w-48" aria-label="迁移路径规则"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="original">目录和原文件名</SelectItem>
              <SelectItem value="custom">自定义模板</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
          <Button size="sm" disabled={pending || bucket.readOnly || !example} onClick={() => void run(
            () => startPathPlan(bucket.backendId, template), "路径预检查已开始"
          )}>开始检查</Button>
        </div>
        {mode === "custom" ? <div className="space-y-1">
          <Input aria-label="迁移路径模板" maxLength={1024} className="font-mono" value={customTemplate}
            onChange={(event) => { setExample(null); setCustomTemplate(event.target.value) }} />
          <p className="text-xs text-muted-foreground">变量 {"{dir} {filename} {stem} {ext} {blob_id}"}</p>
        </div> : null}
        {previewError ? <p role="alert" className="text-sm text-destructive">{previewError}</p> : null}
        {example ? <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">根目录文件</dt><dd className="break-all font-mono">{example.root_key}</dd>
          <dt className="text-muted-foreground">子目录文件</dt><dd className="break-all font-mono">{example.nested_key}</dd>
          <dt className="text-muted-foreground">目录标记</dt><dd className="break-all font-mono">{example.directory_key}</dd>
        </dl> : null}
        {loadError ? <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
          {loadError}<Button variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)}>重试</Button>
        </div> : null}
        {tasks.map((task) => {
          const migration = task.migration
          const status = migration?.status ?? task.status
          const conflicts = migration?.conflicts ?? task.conflicts
          const canStart = !migration && task.status === "completed" && task.ready > 0
          const canPause = status === "pending" || status === "running"
          const canResume = status === "paused" || status === "failed"
          const canCancel = canResume || status === "pending" || (!migration && status === "running")
          const control = (action: "pause" | "resume" | "cancel") => run(() => migration
            ? controlPathMigration(task, action) : controlPathPlan(task, action))
          return <div key={task.id} className="space-y-2 border-t pt-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{migration ? "路径迁移" : "路径预检查"}</span>
              <span className="text-muted-foreground">{{ pending: "等待中", running: "处理中", paused: "已暂停",
                completed: "已完成", failed: "失败", canceled: "已取消" }[status]}</span>
            </div>
            <div className="break-all font-mono text-xs text-muted-foreground">{task.template}</div>
            <div className="text-muted-foreground">{migration
              ? <>已迁移 {migration.migrated} / {task.ready} 项，冲突 {conflicts} 项 · 源对象保留</>
              : <>已检查 {task.scanned} 项，待迁移 {task.ready} 项，冲突 {conflicts} 项 · 额外空间 {formatBytes(task.bytes_to_copy)}</>}
            </div>
            {migration?.error || task.error ? <div role="alert" className="text-destructive">{migration?.error ?? task.error}</div> : null}
            {canStart || conflicts > 0 || canPause || canResume || canCancel ? <div className="flex flex-wrap gap-2">
              {canStart ? <Button size="sm" disabled={pending || bucket.readOnly} onClick={() => void run(() => controlPathMigration(task, "start"))}>复制并迁移</Button> : null}
              {conflicts > 0 ? <Button size="sm" variant="outline" onClick={() => setConflict(task)}>查看冲突</Button> : null}
              {canPause ? <Button size="sm" variant="outline" disabled={pending} onClick={() => void control("pause")}>暂停</Button> : null}
              {canResume ? <Button size="sm" variant="outline" disabled={pending} onClick={() => void control("resume")}>继续</Button> : null}
              {canCancel ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => void control("cancel")}>取消</Button> : null}
            </div> : null}
          </div>
        })}
      </div>
      {conflict ? <PathPlanConflictDialog task={conflict} onClose={() => setConflict(null)} /> : null}
    </FormCard>
  )
}
