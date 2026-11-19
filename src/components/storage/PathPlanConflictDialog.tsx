import * as React from "react"
import { listPathPlanConflicts, type PathPlanConflict, type PathPlanTask } from "@/api/user-storage"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const reasons: Record<string, string> = {
  source_missing: "找不到源对象记录", source_changed: "源对象不存在或已变化", source_identity_unavailable: "无法确认源对象身份", target_exists: "目标路径已存在对象",
  external_readonly: "外部导入的对象保持只读", invalid_tree: "文件夹关系无效", invalid_path: "路径不符合存储规则",
  source_unsupported: "源对象类型或属性暂不支持安全复制",
  duplicate_target: "多个文件映射到同一目标", changed_during_scan: "扫描期间文件或目录发生变化",
}

function displayKey(key: string | null) {
  return key?.replace(/[\u0000-\u001f\u007f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`) || "—"
}

export function PathPlanConflictDialog({ task, onClose }: { task: PathPlanTask; onClose: () => void }) {
  const [items, setItems] = React.useState<PathPlanConflict[]>([])
  const [next, setNext] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const controller = React.useRef<AbortController | null>(null)
  const load = React.useCallback(async (after: number, replace: boolean) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setLoading(true)
    setError(null)
    try {
      const page = await listPathPlanConflicts(task.id, after, current.signal)
      if (!current.signal.aborted) {
        setItems((previous) => replace ? page.items : [...previous, ...page.items])
        setNext(page.next_after_id)
      }
    } catch (reason) {
      if (!current.signal.aborted) setError(reason instanceof Error ? reason.message : "加载失败")
    } finally {
      if (!current.signal.aborted) setLoading(false)
    }
  }, [task.id])
  React.useEffect(() => { void load(0, true); return () => controller.current?.abort() }, [load])
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flex max-h-[min(80dvh,42rem)] flex-col">
        <DialogHeader><DialogTitle>路径检查冲突</DialogTitle><DialogDescription>{task.name} · 检查结果随存储内容变化</DialogDescription></DialogHeader>
        <div className="custom-scrollbar min-h-0 overflow-y-auto">
          {items.map((item) => <div key={item.id} className="border-b py-3 text-sm last:border-b-0">
            <div className="whitespace-pre-wrap break-all">{displayKey(item.source)} → {displayKey(item.target)}</div>
            <div className="mt-1 text-muted-foreground">{reasons[item.reason] ?? item.reason}</div>
          </div>)}
          {loading && items.length === 0 ? <div className="py-4 text-sm">正在加载…</div> : null}
          {!loading && !error && items.length === 0 ? <div className="py-4 text-sm">暂无冲突</div> : null}
          {error ? <div className="py-3 text-sm text-destructive" role="alert">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" disabled={loading} onClick={() => void load(0, true)}>刷新</Button>
          {next !== null ? <Button variant="outline" disabled={loading} onClick={() => void load(next, false)}>加载更多</Button> : null}</div>
      </DialogContent>
    </Dialog>
  )
}
