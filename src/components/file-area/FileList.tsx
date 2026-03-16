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
    <div className="overflow-hidden rounded-[20px] border border-[#dddddd] bg-white dark:border-white/10 dark:bg-[#171717]">
      <div className="grid grid-cols-[56px_minmax(0,1.8fr)_140px] gap-3 border-b border-[#e5e5e5] px-4 py-3 text-xs text-[#8a8a8a] dark:border-white/10 dark:text-[#8d8d8d]">
        <div className="text-center">选择</div>
        <div>名称</div>
        <div>类型</div>
      </div>
      <div className="divide-y divide-[#efefef] dark:divide-white/10">
        {items.map((item) => {
          const selected = selectedIds.includes(item.id)

          return (
            <div key={item.id}>
              <ContextMenu>
                <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
                  <div
                    className={cn(
                      "grid grid-cols-[56px_minmax(0,1.8fr)_140px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#f7f7f7] dark:hover:bg-[#1d1d1d]",
                      selected ? "bg-[#eef8ff] dark:bg-[#112235]" : ""
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
                            ? "bg-[#dff2ff] text-primary dark:bg-[#16334f]"
                            : "bg-[#f3f3f3] text-[#777777] hover:bg-[#ebebeb] dark:bg-[#202020] dark:text-[#9b9b9b] dark:hover:bg-[#272727]"
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
                      <div className="truncate text-sm text-[#3f3f3f] dark:text-[#eaeaea]">
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
                      className="truncate text-left text-sm text-[#7e7e7e] dark:text-[#969696]"
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
