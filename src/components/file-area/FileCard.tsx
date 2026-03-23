import { useState } from "react"
import type { MouseEvent } from "react"
import { IconCheck, IconCircle } from "@tabler/icons-react"

import { type FileNode } from "@/lib/mock-data"
import { cn, truncateFilename } from "@/lib/utils"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { type ItemHandlers } from "./types"
import { FileGlyph } from "./FileGlyph"
import { ItemContextMenu } from "./ItemContextMenu"

interface FileCardProps extends ItemHandlers {
  item: FileNode
  selected: boolean
  showThumbnail?: boolean
}

/** Check if a file type can show a thumbnail preview */
function canShowThumbnail(item: FileNode): boolean {
  if (item.kind === "folder") return false
  const mt = item.mediaType
  return mt === "image" || mt === "video" || mt === "document" || mt === "code"
}

export function FileCard({
  item,
  selected,
  showThumbnail = false,
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
  const hasThumbnail = showThumbnail && canShowThumbnail(item)
  const isMedia = item.mediaType === "image" || item.mediaType === "video"
  const previewUrl = item.preview || (isMedia ? `https://picsum.photos/seed/${item.id}/1920/1080` : null)
  const hasPreviewImage = hasThumbnail && !!previewUrl
  const [imageLoaded, setImageLoaded] = useState(false)

  // Compact card (no thumbnail or folder)
  if (!showThumbnail || item.kind === "folder") {
    return (
      <ContextMenu>
        <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
          <div
            className={cn(
              "group flex h-12 w-full items-center gap-3 rounded-xl border px-3.5 text-left transition-colors",
              selected
                ? "border-primary/30 bg-primary/[0.08] dark:border-primary/40 dark:bg-primary/[0.13]"
                : "border-border bg-card hover:bg-muted/50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            )}
          >
            <button
              type="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                onSelectNode(item.id, event)
              }}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ", 
                // transition-all duration-200 is needed to prevent a weird border glitch when toggling selection
                selected
                  ? "bg-primary text-primary-foreground rounded-full shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={`选择 ${item.name}`}
            >
              {selected ? (
                <IconCheck size={16} stroke={2.5} />
              ) : (
                <>
                  <div className="hidden group-hover:flex items-center justify-center">
                    <IconCircle size={20} stroke={2} className="text-muted-foreground/60 dark:text-white/70" />
                  </div>
                  <div className="flex group-hover:hidden items-center justify-center">
                    <FileGlyph item={item} />
                  </div>
                </>
              )}
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

  // Thumbnail card
  return (
    <ContextMenu>
      <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
        <div
          className={cn(
            "group flex w-full flex-col overflow-hidden rounded-xl border transition-colors aspect-square",
            selected
              ? "border-primary/30 bg-primary/[0.08] dark:border-primary/40 dark:bg-primary/[0.13]"
              : "border-border/50 bg-muted hover:bg-muted/70 dark:bg-muted dark:hover:bg-muted/70"
          )}
        >
          {/* Thumbnail area */}
          <button
            type="button"
            onClick={(event: MouseEvent) => {
              event.stopPropagation()
              onOpenNode(item)
            }}
            className="relative flex flex-1 w-full items-center justify-center overflow-hidden bg-muted-foreground/5"
          >
            {hasPreviewImage ? (
              <>
                {!imageLoaded && <Skeleton className="absolute inset-0 h-full w-full" />}
                <img
                  src={previewUrl?.replace(/\/\d+\/\d+$/, '/259/259') || `https://picsum.photos/seed/${item.id}/259/259`}
                  alt={item.name}
                  className={cn("h-full w-full object-cover transition-opacity duration-300", imageLoaded ? "opacity-100" : "opacity-0")}
                  loading="lazy"
                  draggable={false}
                  onLoad={() => setImageLoaded(true)}
                />
              </>
            ) : (
              <FileGlyph item={item} size={64} />
            )}
            {/* Video play indicator */}
            {item.mediaType === "video" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
                  ▶
                </div>
              </div>
            )}
          </button>

          {/* Info bar */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-background/50 backdrop-blur-sm border-t border-border/50 rounded-b-xl">
            <button
              type="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                onSelectNode(item.id, event)
              }}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                selected
                  ? "bg-primary text-primary-foreground rounded-full shadow-sm"
                  : "text-muted-foreground hover:bg-border dark:hover:bg-accent/70"
              )}
              aria-label={`选择 ${item.name}`}
            >
              {selected ? <IconCheck size={15} stroke={2.5} /> : <FileGlyph item={item} />}
            </button>
            <button
              type="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                onOpenNode(item)
              }}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-sm text-foreground font-medium" title={item.name}>
                {truncateFilename(item.name, 20)}
              </div>
            </button>
          </div>
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
