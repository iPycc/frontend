import type { MouseEvent } from "react"

import { type FileNode } from "@/lib/mock-data"
import { cn, truncateFilename } from "@/lib/utils"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { type ItemHandlers } from "./types"
import { FileGlyph } from "./FileGlyph"
import { ItemContextMenu } from "./ItemContextMenu"

interface FileCardProps extends ItemHandlers {
  item: FileNode
  selected: boolean
}

export function FileCard({
  item,
  selected,
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
}: FileCardProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
        <div
          className={cn(
            "group flex h-12 w-full items-center gap-3 rounded-[14px] border px-3.5 text-left transition-colors",
            selected
              ? "border-[#7fcbff] bg-[#ebf7ff] dark:border-[#265a87] dark:bg-[#112235]"
              : "border-transparent bg-[#f2f2f2] hover:bg-[#ececec] dark:bg-[#202020] dark:hover:bg-[#272727]"
          )}
        >
          <button
            type="button"
            onClick={(event: MouseEvent) => {
              event.stopPropagation()
              onSelectNode(item.id, event)
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
              selected
                ? "bg-[#dff2ff] text-primary dark:bg-[#16334f]"
                : "bg-[#ebebeb] text-[#777777] hover:bg-[#e2e2e2] dark:bg-[#272727] dark:text-[#9b9b9b] dark:hover:bg-[#2f2f2f]"
            )}
            aria-label={`选择 ${item.name}`}
          >
            <FileGlyph item={item} />
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
            className="min-w-0 flex-1 text-left"
          >
            <div className="truncate text-sm text-[#404040] dark:text-[#eaeaea]" title={item.name}>
              {truncateFilename(item.name, 22)}
            </div>
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
  )
}
