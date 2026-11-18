import * as React from "react"

import { listMountSyncConflicts, type MountSyncConflict, type MountSyncTask } from "@/api/user-storage"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const reasons: Record<MountSyncConflict["reason"], string> = {
  invalid_path: "路径包含无法映射的字符或目录片段",
  folder_conflict: "文件夹位置已被其他节点占用",
  source_unavailable: "无法确认源对象仍然可用",
  indexed_elsewhere: "源对象已在其他位置登记",
  name_conflict: "同名节点指向其他对象",
}

function displayKey(key: string) {
  return key.replace(/[\u0000-\u001f\u007f]/g, (character) =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`)
}

export function SyncConflictDialog({ task, onClose }: { task: MountSyncTask; onClose: () => void }) {
  const [items, setItems] = React.useState<MountSyncConflict[]>([])
  const [next, setNext] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const controller = React.useRef<AbortController | null>(null)

  const load = React.useCallback(async (afterId: number, replace: boolean) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setLoading(true)
    setError(null)
    try {
      const page = await listMountSyncConflicts(task.id, afterId, current.signal)
      if (current.signal.aborted) return
      setItems((previous) => replace ? page.items : [...previous, ...page.items])
      setNext(page.next_after_id)
    } catch (reason) {
      if (!current.signal.aborted) setError(reason instanceof Error ? reason.message : "冲突明细加载失败")
    } finally {
      if (!current.signal.aborted) setLoading(false)
    }
  }, [task.id])

  React.useEffect(() => {
    void load(0, true)
    return () => controller.current?.abort()
  }, [load])

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="flex max-h-[min(80dvh,42rem)] flex-col">
        <DialogHeader>
          <DialogTitle>导入冲突</DialogTitle>
          <DialogDescription>{task.name || "当前存储"} · 跳过的对象及原因</DialogDescription>
        </DialogHeader>
        <div className="custom-scrollbar min-h-0 overflow-y-auto">
          {loading && items.length === 0 ? <div className="py-4 text-sm text-muted-foreground" role="status">正在加载冲突明细…</div> : null}
          {items.map((item) => (
            <div key={item.id} className="border-b border-border py-3 last:border-b-0">
              <div className="whitespace-pre-wrap break-all text-sm font-medium">{displayKey(item.key)}</div>
              <div className="mt-1 text-sm text-muted-foreground">{reasons[item.reason]}</div>
            </div>
          ))}
          {!loading && !error && items.length === 0 ? (
            <div className="py-4 text-sm text-muted-foreground">暂无明细；较早的任务可能未保存冲突记录。</div>
          ) : null}
          {error ? <div className="py-3 text-sm text-destructive" role="alert">{error}</div> : null}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={loading} onClick={() => void load(0, true)}>刷新</Button>
          {next !== null || (error && items.length > 0) ? (
            <Button variant="outline" disabled={loading} onClick={() => void load(next ?? items[items.length - 1].id, false)}>加载更多</Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
