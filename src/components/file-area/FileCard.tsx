import { useState } from "react"
import type { MouseEvent } from "react"
import { IconCheck, IconCircle, IconPlayerPlay } from "@tabler/icons-react"

import { type FileNode } from "@/lib/models"
import { useAppState } from "@/lib/app-state"
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

function canShowThumbnail(item: FileNode) {
  if (item.kind === "folder") return false
  const mt = item.mediaType
  if (mt === "image" || mt === "video" || mt === "document" || mt === "code") return true
  const ext = item.ext?.toLowerCase() ?? ""
  return ["txt", "md", "log", "csv", "json", "xml", "yaml", "yml", "ini", "conf"].includes(ext)
}

function isTextFile(item: FileNode) {
  const ext = item.ext?.toLowerCase() ?? ""
  return ["txt", "md", "log", "csv", "json", "xml", "yaml", "yml", "ini", "conf"].includes(ext) || item.mediaType === "code"
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
  const { getFileContent } = useAppState()
  const hasThumbnail = showThumbnail && canShowThumbnail(item)
  const isText = isTextFile(item)
  const previewUrl = item.preview || null
  const hasPreviewImage = hasThumbnail && item.mediaType === "image" && !!previewUrl && !isText
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  if (!showThumbnail || item.kind === "folder") {
    return (
      <ContextMenu>
        <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
          <div
            className={cn(
              "group flex h-12 w-full items-center gap-3 rounded-xl border px-3.5 text-left transition-colors",
              selected
                ? "border-primary/60 bg-primary/18 shadow-[0_0_0_1px_rgba(59,130,246,0.22)] dark:bg-primary/28"
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
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/50"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={`选择 ${item.name}`}
            >
              {selected ? (
                <IconCheck size={11} stroke={2.2} />
              ) : (
                <>
                  <div className="hidden group-hover:flex items-center justify-center">
                    <IconCircle size={16} stroke={2} className="text-muted-foreground/60 dark:text-white/70" />
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

  return (
    <ContextMenu>
      <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
        <div
          className={cn(
            "group flex aspect-square w-full flex-col overflow-hidden rounded-xl border transition-colors",
            selected
              ? "border-primary/60 bg-primary/18 shadow-[0_0_0_1px_rgba(59,130,246,0.22)] dark:bg-primary/28"
              : "border-border/50 bg-muted hover:bg-muted/70 dark:bg-muted dark:hover:bg-muted/70"
          )}
        >
          <button
            type="button"
            onClick={(event: MouseEvent) => {
              event.stopPropagation()
              onOpenNode(item)
            }}
            className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-muted-foreground/5"
          >
            {hasPreviewImage && !imageFailed ? (
              <>
                {!imageLoaded && <Skeleton className="absolute inset-0 h-full w-full" />}
                <img
                  src={previewUrl}
                  alt={item.name}
                  className={cn("h-full w-full object-cover transition-opacity duration-300", imageLoaded ? "opacity-100" : "opacity-0")}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  draggable={false}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageFailed(true)}
                />
              </>
            ) : hasThumbnail && isText ? (
              <div className="absolute inset-0 overflow-hidden bg-white p-2 dark:bg-zinc-900">
                <div
                  className="h-full w-full overflow-hidden"
                  style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "182%", height: "182%" }}
                >
                  <pre className="pointer-events-none select-none whitespace-pre-wrap break-all font-mono text-[11px] leading-[1.5] text-zinc-800 dark:text-zinc-200">
                    {getFileContent(item.id) || <span className="italic text-zinc-400 dark:text-zinc-600">暂无预览内容</span>}
                  </pre>
                </div>
              </div>
            ) : (
              <FileGlyph item={item} size={64} />
            )}

            {item.mediaType === "video" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white">
                  <IconPlayerPlay size={20} stroke={2} />
                </div>
              </div>
            ) : null}
          </button>

          <div className="flex items-center gap-2.5 rounded-b-xl border-t border-border/50 bg-background/50 px-3 py-2.5 backdrop-blur-sm">
            <button
              type="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                onSelectNode(item.id, event)
              }}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/50"
                  : "text-muted-foreground hover:bg-border dark:hover:bg-accent/70"
              )}
              aria-label={`选择 ${item.name}`}
            >
              {selected ? <IconCheck size={11} stroke={2.2} /> : <FileGlyph item={item} />}
            </button>
            <button
              type="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                onOpenNode(item)
              }}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-sm font-medium text-foreground" title={item.name}>
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
