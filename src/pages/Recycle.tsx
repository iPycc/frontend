import * as React from "react"
import {
  IconCheck,
  IconLayoutGrid,
  IconListDetails,
  IconRestore,
  IconTrashX,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { FileGlyph } from "@/components/file-area/FileGlyph"
import { PageShell } from "@/components/shared/PageShell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import type { FileNode, ViewMode } from "@/lib/models"
import { cn } from "@/lib/utils"

const RECYCLE_VIEW_KEY = "cloudrave.recycle.view"

function initialViewMode(): ViewMode {
  return window.localStorage.getItem(RECYCLE_VIEW_KEY) === "grid" ? "grid" : "list"
}

function deletedAtLabel(value?: string) {
  if (!value) return "未知"
  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString()
}

export function Recycle() {
  usePageTitle("回收站")
  const {
    getRecycleNodes,
    loadRecycle,
    recycleLoading,
    restoreNodes,
    permanentlyDeleteNodes,
    formatBytes,
  } = useAppState()
  const items = getRecycleNodes()
  const [viewMode, setViewModeState] = React.useState<ViewMode>(initialViewMode)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = React.useState<string[]>([])
  const [busyAction, setBusyAction] = React.useState<"restore" | "delete" | null>(null)

  React.useEffect(() => {
    void loadRecycle().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "回收站加载失败")
    })
  }, [loadRecycle])

  React.useEffect(() => {
    const available = new Set(items.map((item) => item.id))
    setSelectedIds((current) => current.filter((id) => available.has(id)))
  }, [items])

  const setViewMode = (value: string) => {
    if (value !== "grid" && value !== "list") return
    setViewModeState(value)
    window.localStorage.setItem(RECYCLE_VIEW_KEY, value)
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    )
  }

  const allSelected = items.length > 0 && selectedIds.length === items.length
  const toggleAll = () => setSelectedIds(allSelected ? [] : items.map((item) => item.id))

  const restore = async (ids: string[]) => {
    if (!ids.length || busyAction) return
    setBusyAction("restore")
    try {
      await restoreNodes(ids)
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)))
      toast.success(ids.length === 1 ? "已恢复 1 项" : `已恢复 ${ids.length} 项`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "恢复失败")
    } finally {
      setBusyAction(null)
    }
  }

  const permanentlyDelete = async () => {
    const ids = pendingDeleteIds
    if (!ids.length || busyAction) return
    setBusyAction("delete")
    try {
      await permanentlyDeleteNodes(ids)
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)))
      setPendingDeleteIds([])
      toast.success(ids.length === 1 ? "已永久删除 1 项" : `已永久删除 ${ids.length} 项`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "永久删除失败")
    } finally {
      setBusyAction(null)
    }
  }

  const actionIds = selectedIds

  return (
    <>
      <PageShell
        title="回收站"
        description="已删除对象会先进入回收站，可批量恢复或永久删除。"
        className="flex min-h-0 flex-col overflow-hidden"
        contentClassName="min-h-0 flex-1"
        action={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={setViewMode}
              variant="outline"
              size="sm"
              aria-label="回收站视图"
            >
              <ToggleGroupItem value="grid" aria-label="网格视图">
                <IconLayoutGrid />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="列表视图">
                <IconListDetails />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button variant="outline" size="sm" disabled={!items.length || Boolean(busyAction)} onClick={toggleAll}>
              <IconCheck data-icon="inline-start" />
              {allSelected ? "取消全选" : "全选"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!actionIds.length || Boolean(busyAction)}
              onClick={() => void restore(actionIds)}
            >
              <IconRestore data-icon="inline-start" />
              {selectedIds.length ? `恢复所选 (${selectedIds.length})` : "批量恢复"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!actionIds.length || Boolean(busyAction)}
              onClick={() => setPendingDeleteIds(actionIds)}
            >
              <IconTrashX data-icon="inline-start" />
              {selectedIds.length ? `删除所选 (${selectedIds.length})` : "批量删除"}
            </Button>
          </div>
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          {selectedIds.length ? (
            <p className="mb-3 shrink-0 text-xs text-muted-foreground" aria-live="polite">
              已选择 {selectedIds.length} 项；批量操作仅影响所选内容。
            </p>
          ) : null}
          <ScrollArea className="min-h-0 flex-1 pr-3">
            {recycleLoading && items.length === 0 ? (
              <RecycleSkeleton viewMode={viewMode} />
            ) : items.length === 0 ? (
              <div className="flex min-h-64 items-center justify-center">
                <EmptyState title="回收站为空" description="删除的文件和文件夹会显示在这里。" />
              </div>
            ) : viewMode === "grid" ? (
              <RecycleGrid
                items={items}
                selectedIds={selectedIds}
                busy={Boolean(busyAction)}
                formatBytes={formatBytes}
                onToggle={toggleSelected}
                onRestore={(item) => void restore([item.id])}
                onDelete={(item) => setPendingDeleteIds([item.id])}
              />
            ) : (
              <RecycleList
                items={items}
                selectedIds={selectedIds}
                busy={Boolean(busyAction)}
                formatBytes={formatBytes}
                onToggle={toggleSelected}
                onRestore={(item) => void restore([item.id])}
                onDelete={(item) => setPendingDeleteIds([item.id])}
              />
            )}
          </ScrollArea>
        </div>
      </PageShell>

      <Dialog
        open={pendingDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open && !busyAction) setPendingDeleteIds([])
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>永久删除 {pendingDeleteIds.length} 项？</DialogTitle>
            <DialogDescription>
              此操作无法撤销，文件内容和记录都会从 Cloudrave 中移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(busyAction)} onClick={() => setPendingDeleteIds([])}>
              取消
            </Button>
            <Button variant="destructive" disabled={Boolean(busyAction)} onClick={() => void permanentlyDelete()}>
              {busyAction === "delete" ? "正在删除…" : "永久删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function SelectionButton({
  item,
  selected,
  onToggle,
}: {
  item: FileNode
  selected: boolean
  onToggle: (id: string) => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-transparent hover:border-primary"
      )}
      onClick={() => onToggle(item.id)}
      aria-label={selected ? `取消选择 ${item.name}` : `选择 ${item.name}`}
      aria-pressed={selected}
    >
      <IconCheck size={14} />
    </button>
  )
}

function RecycleGrid({
  items,
  selectedIds,
  busy,
  formatBytes,
  onToggle,
  onRestore,
  onDelete,
}: RecycleItemsProps) {
  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
      {items.map((item) => {
        const selected = selectedIds.includes(item.id)
        return (
          <article
            key={item.id}
            className={cn(
              "flex min-h-36 flex-col rounded-xl border bg-card p-4 transition-colors",
              selected ? "border-primary bg-primary/[0.05]" : "border-border"
            )}
          >
            <div className="flex items-start gap-3">
              <SelectionButton item={item} selected={selected} onToggle={onToggle} />
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileGlyph item={item} size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-medium" title={item.name}>{item.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.kind === "folder" ? "文件夹" : item.ext?.toUpperCase() || "文件"} · {formatBytes(item.size)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  删除于 {deletedAtLabel(item.deletedAt)}
                </p>
              </div>
            </div>
            <div className="mt-auto flex justify-end gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={busy} onClick={() => onRestore(item)}>
                <IconRestore data-icon="inline-start" />
                恢复
              </Button>
              <Button variant="destructive" size="sm" disabled={busy} onClick={() => onDelete(item)}>
                <IconTrashX data-icon="inline-start" />
                删除
              </Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function RecycleList({
  items,
  selectedIds,
  busy,
  formatBytes,
  onToggle,
  onRestore,
  onDelete,
}: RecycleItemsProps) {
  return (
    <Table className="table-fixed">
      <TableHeader className="sticky top-0 z-10 bg-background">
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-12"><span className="sr-only">选择</span></TableHead>
          <TableHead>名称</TableHead>
          <TableHead className="w-28">类型</TableHead>
          <TableHead className="w-28">大小</TableHead>
          <TableHead className="w-48">删除时间</TableHead>
          <TableHead className="w-44 text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const selected = selectedIds.includes(item.id)
          return (
            <TableRow key={item.id} className={selected ? "bg-primary/[0.05]" : undefined}>
              <TableCell>
                <SelectionButton item={item} selected={selected} onToggle={onToggle} />
              </TableCell>
              <TableCell className="min-w-0">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileGlyph item={item} />
                  </span>
                  <span className="truncate font-medium" title={item.name}>{item.name}</span>
                </div>
              </TableCell>
              <TableCell>{item.kind === "folder" ? "文件夹" : item.ext?.toUpperCase() || "文件"}</TableCell>
              <TableCell>{formatBytes(item.size)}</TableCell>
              <TableCell>{deletedAtLabel(item.deletedAt)}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => onRestore(item)}>
                    <IconRestore data-icon="inline-start" />
                    恢复
                  </Button>
                  <Button variant="destructive" size="sm" disabled={busy} onClick={() => onDelete(item)}>
                    <IconTrashX data-icon="inline-start" />
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

type RecycleItemsProps = {
  items: FileNode[]
  selectedIds: string[]
  busy: boolean
  formatBytes: (bytes: number) => string
  onToggle: (id: string) => void
  onRestore: (item: FileNode) => void
  onDelete: (item: FileNode) => void
}

function RecycleSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "grid") {
    return (
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full rounded-md" />
      ))}
    </div>
  )
}
