import type { MouseEvent } from "react"

import { type FileNode } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { type ItemHandlers } from "./types"
import { FileGlyph } from "./FileGlyph"
import { ItemContextMenu } from "./ItemContextMenu"

interface FileListProps extends ItemHandlers {
  items: FileNode[]
  selectedIds: string[]
}

export function FileList({
  items,
  selectedIds,
  onSelectNode,
  onPrepareContext,
  onOpenNode,
  onRenameRequest,
  onMoveRequest,
  onShareRequest,
  onDownloadRequest,
  onDeleteRequest,
  onCopyRequest,
  onCutRequest,
  onPropertiesRequest,
  onCreateChildFolder,
  getContextIds,
}: FileListProps) {
  if (items.length === 0) {
    return <EmptyState title="没有任何内容" description="在此处上传文件或创建文件夹" />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-[56px_minmax(0,1.8fr)_140px] gap-3 border-b border-border px-4 py-3 text-xs text-muted-foreground">
        <div className="text-center">选择</div>
        <div>名称</div>
        <div>类型</div>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => {
          const selected = selectedIds.includes(item.id)

          return (
            <div key={item.id}>
              <ContextMenu>
                <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
                  <div
                    className={cn(
                      "grid grid-cols-[56px_minmax(0,1.8fr)_140px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50",
                      selected ? "bg-primary/[0.08] dark:bg-primary/[0.13]" : ""
                    )}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(event: MouseEvent) => {
                          event.stopPropagation()
                          onSelectNode(item.id, event)
                        }}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                          selected
                            ? "bg-primary/[0.12] text-primary dark:bg-primary/20"
                            : "bg-muted text-muted-foreground hover:bg-muted/70 dark:bg-accent dark:hover:bg-accent/70"
                        )}
                        aria-label={`选择 ${item.name}`}
                      >
                        <FileGlyph item={item} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation()
                        onOpenNode(item)
                      }}
                      onDoubleClick={(event: MouseEvent) => {
                        event.stopPropagation()
                        onOpenNode(item)
                      }}
                      className="min-w-0 text-left"
                    >
                      <div className="truncate text-sm text-foreground">
                        {item.name}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation()
                        onOpenNode(item)
                      }}
                      onDoubleClick={(event: MouseEvent) => {
                        event.stopPropagation()
                        onOpenNode(item)
                      }}
                      className="truncate text-left text-sm text-muted-foreground"
                    >
                      {getItemMeta(item)}
                    </button>
                  </div>
                </ContextMenuTrigger>
                <ItemContextMenu
                  item={item}
                  ids={getContextIds(item.id)}
                  onOpenNode={onOpenNode}
                  onRenameRequest={onRenameRequest}
                  onMoveRequest={onMoveRequest}
                  onShareRequest={onShareRequest}
                  onDownloadRequest={onDownloadRequest}
                  onDeleteRequest={onDeleteRequest}
                  onCopyRequest={onCopyRequest}
                  onCutRequest={onCutRequest}
                  onPropertiesRequest={onPropertiesRequest}
                  onCreateChildFolder={onCreateChildFolder}
                />
              </ContextMenu>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getItemMeta(item: FileNode) {
  if (item.kind === "folder") return "文件夹"
  if (item.ext) return item.ext.toUpperCase()
  return "文件"
}
