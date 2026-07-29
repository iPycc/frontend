import { useState } from "react"
import type { MouseEvent } from "react"
import { useEffect } from "react"
import { IconCheck, IconPlayerPlay } from "@tabler/icons-react"

import { type FileNode } from "@/lib/models"
import { requestResponse } from "@/api/client"
import { buildPreviewAudioCoverUrl, buildPreviewImageUrl, buildPreviewUrl, buildPreviewVideoPosterUrl } from "@/api/files"
import { useAppState } from "@/state/app"
import { useNearViewport } from "@/hooks/use-near-viewport"
import { cn, truncateFilename } from "@/lib/utils"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { type ItemHandlers } from "./types"
import { FileGlyph } from "./FileGlyph"
import { ItemContextMenu } from "./ItemContextMenu"
import { isOfficeFile, OfficeCardPreview } from "./OfficeCardPreview"
import { PdfCardPreview } from "./PdfCardPreview"

interface FileCardProps extends ItemHandlers {
  item: FileNode
  selected: boolean
  showThumbnail?: boolean
}

function canShowThumbnail(item: FileNode) {
  if (item.kind === "folder") return false
  const mt = item.mediaType
  if (mt === "image" || mt === "video" || mt === "audio" || mt === "document" || mt === "code") return true
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
  const isOffice = isOfficeFile(item.ext)
  const isPdf = item.ext?.toLowerCase() === "pdf"
  const previewUrl = item.mediaType === "video" && item.backendId
    ? buildPreviewVideoPosterUrl(item.backendId, item.updatedAt)
    : item.mediaType === "audio" && item.backendId
      ? buildPreviewAudioCoverUrl(item.backendId, item.updatedAt)
      : item.preview || null
  const hasPreviewImage = hasThumbnail && (item.mediaType === "image" || item.mediaType === "video" || item.mediaType === "audio") && !!previewUrl && !isText
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [videoFrameReady, setVideoFrameReady] = useState(false)
  const [textPreview, setTextPreview] = useState("")
  const [textPreviewLoading, setTextPreviewLoading] = useState(false)
  const { ref: previewHostRef, isNear: previewIsNear } = useNearViewport<HTMLDivElement>(hasThumbnail)
  const previewActive = hasThumbnail && previewIsNear

  useEffect(() => {
    if (!previewActive || !isText || !item.backendId) {
      setTextPreview("")
      setTextPreviewLoading(false)
      return
    }
    const controller = new AbortController()
    const version = item.updatedAt ? `?v=${encodeURIComponent(item.updatedAt)}` : ""
    setTextPreviewLoading(true)
    void requestResponse(`${buildPreviewUrl(item.backendId)}${version}`, {
      signal: controller.signal,
      headers: { Range: "bytes=0-4095" },
    })
      .then((response) => response.text())
      .then((value) => setTextPreview(value))
      .catch(() => {
        if (!controller.signal.aborted) setTextPreview("")
      })
      .finally(() => {
        if (!controller.signal.aborted) setTextPreviewLoading(false)
      })
    return () => controller.abort()
  }, [previewActive, isText, item.backendId, item.updatedAt])

  if (!showThumbnail || item.kind === "folder") {
    return (
      <ContextMenu>
        <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
          <div
            className={cn(
              "group flex h-12 w-full items-center gap-3 rounded-xl border px-3.5 text-left transition-colors",
              selected
                ? "border-primary bg-primary/[0.06] ring-1 ring-primary/20 dark:bg-primary/10"
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
                "relative flex size-8 shrink-0 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50",
                selected ? "bg-transparent" : "bg-muted/70 group-hover:bg-transparent"
              )}
              aria-label={selected ? `取消选择 ${item.name}` : `选择 ${item.name}`}
              aria-pressed={selected}
            >
              <span className={cn("transition-opacity", selected ? "opacity-0" : "opacity-100 group-hover:opacity-0")}><FileGlyph item={item} /></span>
              <span className={cn(
                "absolute inset-0 m-auto flex size-5 items-center justify-center rounded-full border-2 transition-opacity",
                selected ? "border-primary bg-primary text-primary-foreground opacity-100" : "border-muted-foreground/55 bg-background text-transparent opacity-0 group-hover:opacity-100"
              )}>
                <IconCheck size={12} stroke={2.5} />
              </span>
            </button>
            <button
              type="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                onSelectNode(item.id, event)
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
          ref={previewHostRef}
          className={cn(
            "group relative flex aspect-square w-full flex-col overflow-hidden rounded-xl border transition-colors",
            selected
              ? "border-primary bg-card ring-1 ring-primary/25"
              : "border-border/50 bg-muted hover:bg-muted/70 dark:bg-muted dark:hover:bg-muted/70"
          )}
        >
          <button
            type="button"
            onClick={(event: MouseEvent) => {
              event.stopPropagation()
              onSelectNode(item.id, event)
            }}
            onDoubleClick={(event: MouseEvent) => {
              event.stopPropagation()
              onOpenNode(item)
            }}
            className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-muted-foreground/5"
          >
            {previewActive && hasPreviewImage && !imageFailed ? (
              <>
                {!imageLoaded && <Skeleton className="absolute inset-0 h-full w-full" />}
                <img
                  src={previewUrl}
                  srcSet={item.backendId && item.mediaType === "image" ? `${buildPreviewImageUrl(item.backendId, "thumbnail", item.updatedAt)} 320w, ${buildPreviewImageUrl(item.backendId, "thumbnail_2x", item.updatedAt)} 640w` : undefined}
                  sizes="(max-width: 768px) 50vw, 240px"
                  alt={item.name}
                  className={cn("h-full w-full object-cover transition-opacity duration-150", imageLoaded ? "opacity-100" : "opacity-0")}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  draggable={false}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageFailed(true)}
                />
              </>
            ) : previewActive && isPdf && item.backendId ? (
              <PdfCardPreview
                nodeId={item.backendId}
                version={item.updatedAt}
                fallback={<FileGlyph item={item} size={64} />}
              />
            ) : previewActive && isOffice && item.backendId ? (
              <OfficeCardPreview
                nodeId={item.backendId}
                version={item.updatedAt}
                fallback={<FileGlyph item={item} size={64} />}
              />
            ) : previewActive && item.mediaType === "video" && item.backendId ? (
              <>
                {!videoFrameReady ? <Skeleton className="absolute inset-0 h-full w-full" /> : null}
                <video
                  src={buildPreviewUrl(item.backendId)}
                  muted
                  playsInline
                  preload="metadata"
                  className={cn("h-full w-full object-cover transition-opacity duration-150", videoFrameReady ? "opacity-100" : "opacity-0")}
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget
                    video.currentTime = Math.min(Math.max(video.duration * 0.1, 0.5), 5)
                  }}
                  onSeeked={() => setVideoFrameReady(true)}
                  aria-label={`${item.name} 视频封面`}
                />
              </>
            ) : previewActive && isText ? (
              <div className="absolute inset-0 overflow-hidden bg-background p-3">
                {textPreviewLoading ? <Skeleton className="absolute inset-0 h-full w-full" /> : null}
                <pre className="pointer-events-none h-full select-none overflow-hidden whitespace-pre-wrap break-words text-left font-mono text-[10px] leading-[1.55] text-foreground">
                  {textPreview || getFileContent(item.id) || <span className="italic text-muted-foreground">暂无预览内容</span>}
                </pre>
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

          <div className={cn(
            "flex items-center gap-2.5 rounded-b-xl border-t border-border/50 px-3 py-2.5",
            selected ? "bg-primary/[0.06] dark:bg-primary/10" : "bg-background"
          )}>
            <button
              type="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                onSelectNode(item.id, event)
              }}
              className="relative flex size-7 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label={selected ? `取消选择 ${item.name}` : `选择 ${item.name}`}
              aria-pressed={selected}
            >
              <span className={cn("transition-opacity", selected ? "opacity-0" : "opacity-100 group-hover:opacity-0")}><FileGlyph item={item} /></span>
              <span className={cn(
                "absolute inset-0 m-auto flex size-5 items-center justify-center rounded-full border-2 transition-opacity",
                selected ? "border-primary bg-primary text-primary-foreground opacity-100" : "border-muted-foreground/55 text-transparent opacity-0 group-hover:opacity-100"
              )}>
                <IconCheck size={12} stroke={2.5} />
              </span>
            </button>
            <button
              type="button"
              onClick={(event: MouseEvent) => {
                event.stopPropagation()
                onSelectNode(item.id, event)
              }}
              onDoubleClick={(event: MouseEvent) => {
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
