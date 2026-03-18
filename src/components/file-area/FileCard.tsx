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
            "group flex h-12 w-full items-center gap-3 rounded-xl border px-3.5 text-left transition-colors",
            selected
              ? "border-primary/30 bg-primary/[0.08] dark:border-primary/40 dark:bg-primary/[0.13]"
              : "border-transparent bg-muted hover:bg-muted/70 dark:bg-muted dark:hover:bg-muted/70"
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
                ? "bg-primary/[0.12] text-primary dark:bg-primary/20"
                : "bg-muted/80 text-muted-foreground hover:bg-border dark:bg-accent dark:hover:bg-accent/70"
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
            <div className="truncate text-sm text-foreground" title={item.name}>
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
