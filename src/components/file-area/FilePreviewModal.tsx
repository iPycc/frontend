import * as React from "react"
import {
  IconArrowMoveRight,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconCut,
  IconDots,
  IconDownload,
  IconEdit,
  IconInfoCircle,
  IconMinus,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconRefresh,
  IconShare3,
  IconTrash,
  IconX,
} from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import { getPreviewManifest, peekPreviewManifest, preparePreview, type PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PropertiesPanelContent } from "@/components/shared/PropertiesPanel"
import { usePropertiesPanel } from "@/components/shared/PropertiesPanelContext"
import { useIsMobile } from "@/hooks/use-mobile"
import { hasCapability, type FileNode } from "@/lib/models"
import { cn } from "@/lib/utils"
import { useAppState } from "@/state/app"
import { PreviewRenderer } from "./preview/PreviewRenderer"
import { inferPreviewKind, PreviewSkeleton } from "./preview/PreviewSkeleton"

interface FilePreviewModalProps {
  open: boolean
  file: FileNode | null
  preloadFiles?: FileNode[]
  currentIndex: number
  totalCount: number
  onClose: () => void
  onDownload: (ids: string[]) => void
  onProperties: (id: string) => void
  onCopy: (ids: string[]) => void
  onCut: (ids: string[]) => void
  onRename: (ids: string[]) => void
  onMove: (ids: string[]) => void
  onShare: (ids: string[]) => void
  onDelete: (ids: string[]) => void
  onPrev: () => void
  onNext: () => void
}

const iconButtonClass = "h-9 w-9 text-muted-foreground hover:bg-accent hover:text-foreground"

export function FilePreviewModal({
  open,
  file,
  preloadFiles = [],
  currentIndex,
  totalCount,
  onClose,
  onDownload,
  onProperties: _onProperties,
  onCopy,
  onCut,
  onRename,
  onMove,
  onShare,
  onDelete,
  onPrev,
  onNext,
}: FilePreviewModalProps) {
  const { currentUser } = useAppState()
  const canCopy = hasCapability(currentUser, "file.copy")
  const canShare = hasCapability(currentUser, "share.manage")
  const { bucketName, formatBytes } = usePropertiesPanel()
  const isMobile = useIsMobile()
  const backendId = file?.backendId
  const cachedManifest = backendId ? peekPreviewManifest(backendId) : null
  const [showPanel, setShowPanel] = React.useState(false)
  const [displayMode, setDisplayMode] = React.useState<"window" | "fullscreen" | "minimized">("window")
  const [manifest, setManifest] = React.useState<PreviewManifest | null>(cachedManifest)
  const [loading, setLoading] = React.useState(!cachedManifest)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [viewport, setViewport] = React.useState(() => ({ width: window.innerWidth, height: window.innerHeight }))

  React.useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  const loadManifest = React.useCallback(async (signal?: AbortSignal) => {
    if (!backendId) throw new Error("文件缺少后端标识")
    return getPreviewManifest(backendId, signal)
  }, [backendId])

  React.useEffect(() => {
    if (!open || !file || !backendId) return
    const controller = new AbortController()
    let pollTimer: number | undefined
    let pollCount = 0
    let stopped = false

    const refresh = async (prepare = true) => {
      try {
        const next = await loadManifest(controller.signal)
        if (stopped) return
        const shouldPrepare = next.requires_preparation && next.preparation_available && !next.assets.hls && !next.assets.audio
        setManifest(prepare && shouldPrepare ? { ...next, status: "processing" } : next)
        setError(null)
        setLoading(false)

        if (prepare && shouldPrepare && next.status !== "failed") {
          await preparePreview(backendId)
        }
        if ((next.status === "processing" || shouldPrepare) && next.status !== "failed" && pollCount < 120) {
          pollCount += 1
          pollTimer = window.setTimeout(() => void refresh(false), 1500)
        }
      } catch (reason) {
        if (!controller.signal.aborted && !stopped) {
          setLoading(false)
          setError(reason instanceof Error ? reason.message : "预览加载失败")
        }
      }
    }

    const cached = peekPreviewManifest(backendId)
    setManifest(cached)
    setLoading(!cached)
    setError(null)
    void refresh()

    return () => {
      stopped = true
      controller.abort()
      if (pollTimer) window.clearTimeout(pollTimer)
    }
  }, [backendId, file, loadManifest, open, refreshKey])

  React.useEffect(() => {
    if (!open) {
      setShowPanel(false)
      setDisplayMode("window")
      return
    }
    for (const candidate of preloadFiles) {
      if (!candidate.backendId || candidate.backendId === backendId) continue
      void getPreviewManifest(candidate.backendId).then((next) => {
        const imageUrl = next.assets.thumbnail_2x?.url ?? next.assets.thumbnail?.url
        if (imageUrl) {
          const image = new Image()
          image.src = imageUrl
        }
      }).catch(() => undefined)
    }
  }, [backendId, open, preloadFiles])

  React.useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing = target?.closest("input, textarea, [contenteditable='true'], .monaco-editor")
      if (!isEditing && event.key === "ArrowLeft") onPrev()
      if (!isEditing && event.key === "ArrowRight") onNext()
      if (event.key === "Escape") {
        if (showPanel) setShowPanel(false)
        else onClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, onNext, onPrev, open, showPanel])

  if (!file) return null

  const retry = async () => {
    setLoading(true)
    setError(null)
    if (!backendId) {
      setLoading(false)
      setError("文件缺少后端标识")
      return
    }
    try {
      if (manifest?.status === "failed" && manifest.requires_preparation && manifest.preparation_available) {
        await preparePreview(backendId)
      }
      setRefreshKey((value) => value + 1)
    } catch (reason) {
      setLoading(false)
      setError(reason instanceof Error ? reason.message : "预览重试失败")
    }
  }

  const panel = (
    <PropertiesPanelContent
      node={file}
      bucketName={bucketName}
      formatBytes={formatBytes}
      previewMetadata={manifest?.metadata}
      onClose={() => setShowPanel(false)}
      embedded
    />
  )
  const mediaWidth = typeof manifest?.metadata.width === "number" ? manifest.metadata.width : 0
  const mediaHeight = typeof manifest?.metadata.height === "number" ? manifest.metadata.height : 0
  const adaptiveMedia = !isMobile && displayMode === "window" &&
    (manifest?.kind === "image" || manifest?.kind === "video") && mediaWidth > 0 && mediaHeight > 0
  const mediaRatio = adaptiveMedia ? mediaWidth / mediaHeight : undefined
  const imageToolbarHeight = manifest?.kind === "image" ? 48 : 0
  const availableMediaWidth = Math.max(320, viewport.width * 0.92 - (showPanel ? 340 : 0))
  const availableMediaStageHeight = Math.max(240, viewport.height * 0.84 - 56 - imageToolbarHeight)
  const mediaContentWidth = adaptiveMedia && mediaRatio
    ? Math.min(mediaWidth, availableMediaWidth, availableMediaStageHeight * mediaRatio)
    : undefined
  const mediaContentHeight = mediaContentWidth && mediaRatio
    ? mediaContentWidth / mediaRatio + imageToolbarHeight
    : undefined
  const adaptiveDialogHeight = mediaContentHeight ? mediaContentHeight + 56 : undefined
  const minimized = displayMode === "minimized" && manifest?.kind === "audio"

  return (
    <Dialog open={open} modal={!minimized} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        showCloseButton={false}
        disableScaleAnimation
        hideOverlay={minimized}
        className={cn(
          "flex flex-row gap-0 overflow-hidden bg-background p-0 outline-none",
          minimized
            ? "right-4 bottom-4 left-auto top-auto h-28 w-[min(28rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 rounded-xl border border-border shadow-xl"
            : isMobile || displayMode === "fullscreen"
            ? "h-[100dvh] w-[100dvw] max-w-none rounded-none border-0 shadow-none"
            : adaptiveMedia
              ? "h-auto w-auto max-w-none rounded-xl border border-border shadow-xl"
              : "h-[min(84dvh,54rem)] w-[min(92vw,80rem)] max-w-[80rem] rounded-xl border border-border shadow-xl"
        )}
        style={!minimized && adaptiveMedia && adaptiveDialogHeight ? { height: adaptiveDialogHeight } : undefined}
      >
        <div
          className="flex min-w-0 flex-1 flex-col"
          style={!minimized && adaptiveMedia && mediaContentWidth ? { width: mediaContentWidth } : undefined}
        >
          <header className={cn("flex shrink-0 items-center gap-3 border-b border-border px-3", minimized ? "h-11" : "h-14 md:px-4")}>
            <Button variant="ghost" size="icon" className={iconButtonClass} onClick={onClose} aria-label="关闭预览"><IconX size={20} /></Button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground" title={file.name}>{file.name}</p>
            </div>
            {!minimized ? <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">{currentIndex + 1} / {totalCount}</span> : null}
            <div className="flex shrink-0 items-center gap-1">
              {minimized ? (
                <Button variant="ghost" size="icon" className={iconButtonClass} onClick={() => setDisplayMode("window")} aria-label="恢复音频播放器" title="恢复播放器"><IconArrowsMaximize size={20} /></Button>
              ) : (
                <>
              {manifest?.kind === "audio" ? (
                <Button variant="ghost" size="icon" className={iconButtonClass} onClick={() => { setShowPanel(false); setDisplayMode("minimized") }} aria-label="最小化音频播放器" title="最小化"><IconMinus size={20} /></Button>
              ) : null}
              {!isMobile ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className={iconButtonClass}
                  onClick={() => setDisplayMode((value) => value === "window" ? "fullscreen" : "window")}
                  aria-label={displayMode === "fullscreen" ? "切换到中等窗口" : "切换到全屏"}
                  title={displayMode === "fullscreen" ? "中等窗口" : "全屏"}
                >
                  {displayMode === "fullscreen" ? <IconArrowsMinimize size={20} /> : <IconArrowsMaximize size={20} />}
                </Button>
              ) : null}
              <Button variant="ghost" size="icon" className={iconButtonClass} onClick={() => onDownload([file.id])} aria-label="下载"><IconDownload size={20} /></Button>
              <Button variant="ghost" size="icon" className={cn(iconButtonClass, showPanel && "bg-accent text-foreground")} onClick={() => setShowPanel((value) => !value)} aria-label="文件属性"><IconInfoCircle size={20} /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger className={cn("inline-flex items-center justify-center rounded-md", iconButtonClass)} aria-label="更多操作"><IconDots size={20} /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canCopy ? <DropdownMenuItem onClick={() => onCopy([file.id])}><IconCopy />复制</DropdownMenuItem> : null}
                  <DropdownMenuItem onClick={() => onCut([file.id])}><IconCut />剪切</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRename([file.id])}><IconEdit />重命名</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove([file.id])}><IconArrowMoveRight />移动到…</DropdownMenuItem>
                  {canShare ? <DropdownMenuItem onClick={() => onShare([file.id])}><IconShare3 />分享</DropdownMenuItem> : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete([file.id])}><IconTrash />删除</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
                </>
              )}
            </div>
          </header>

          <main
            className={cn("relative min-h-0 flex-1 overflow-hidden bg-background", adaptiveMedia && "flex-none")}
            style={adaptiveMedia && mediaContentHeight ? { height: mediaContentHeight } : undefined}
          >
            {!minimized && totalCount > 1 ? (
              <>
                <Button variant="secondary" size="icon" className="absolute left-3 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full shadow-sm" onClick={onPrev} aria-label="上一个"><IconChevronLeft size={22} /></Button>
                <Button variant="secondary" size="icon" className="absolute right-3 top-1/2 z-30 h-10 w-10 -translate-y-1/2 rounded-full shadow-sm" onClick={onNext} aria-label="下一个"><IconChevronRight size={22} /></Button>
              </>
            ) : null}
            {loading ? (
              <PreviewSkeleton kind={manifest?.kind ?? inferPreviewKind(file)} compact={minimized} />
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center"><p className="text-sm text-destructive">{error}</p><Button variant="outline" size="sm" className="mt-4" onClick={retry}><IconRefresh size={15} className="mr-1.5" />重试</Button></div>
            ) : manifest ? (
              <PreviewRenderer manifest={manifest} onRetry={() => void retry()} compactAudio={minimized} />
            ) : null}
          </main>
        </div>

        {minimized ? null : isMobile ? (
          <AnimatePresence>{showPanel ? <motion.div key="preview-properties-mobile" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }} className="absolute inset-0 z-50 bg-background">{panel}</motion.div> : null}</AnimatePresence>
        ) : (
          <AnimatePresence>{showPanel ? <motion.aside key="preview-properties" initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="min-h-0 shrink-0 self-stretch overflow-hidden border-l border-border bg-card"><div className="h-full min-h-0 w-[340px]">{panel}</div></motion.aside> : null}</AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  )
}
