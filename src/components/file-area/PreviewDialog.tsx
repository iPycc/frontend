import * as React from "react"
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconInfoCircle,
  IconMinus,
  IconRefresh,
  IconX,
} from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import type { PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { PreviewRenderer } from "./preview/PreviewRenderer"
import { PreviewSkeleton } from "./preview/PreviewSkeleton"

export type PreviewDialogProps = {
  open: boolean
  name: string
  titleIcon?: React.ReactNode
  manifest: PreviewManifest | null
  loading: boolean
  error?: string | null
  inferredKind?: PreviewManifest["kind"]
  currentIndex?: number
  totalCount?: number
  onClose: () => void
  onRetry?: () => void
  onDownload?: () => void
  onPrev?: () => void
  onNext?: () => void
  leadingActions?: React.ReactNode
  moreActions?: React.ReactNode
  details?: (close: () => void) => React.ReactNode
}

export const previewIconButtonClass = "size-8 text-muted-foreground hover:bg-accent hover:text-foreground sm:size-9"

export function PreviewDialog({
  open,
  name,
  titleIcon,
  manifest,
  loading,
  error,
  inferredKind = "unsupported",
  currentIndex = 0,
  totalCount = 1,
  onClose,
  onRetry,
  onDownload,
  onPrev,
  onNext,
  leadingActions,
  moreActions,
  details,
}: PreviewDialogProps) {
  const isMobile = useIsMobile()
  const [imageToolbarTarget, setImageToolbarTarget] = React.useState<HTMLDivElement | null>(null)
  const [showDetails, setShowDetails] = React.useState(false)
  const [displayMode, setDisplayMode] = React.useState<"window" | "fullscreen" | "minimized">("window")

  React.useEffect(() => {
    if (!open) {
      setShowDetails(false)
      setDisplayMode("window")
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing = target?.closest("input, textarea, [contenteditable='true'], .monaco-editor")
      if (!isEditing && event.key === "ArrowLeft" && totalCount > 1) onPrev?.()
      if (!isEditing && event.key === "ArrowRight" && totalCount > 1) onNext?.()
      if (event.key === "Escape" && showDetails) setShowDetails(false)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onNext, onPrev, open, showDetails, totalCount])

  const minimized = displayMode === "minimized" && manifest?.kind === "audio"
  const detailsContent = details?.(() => setShowDetails(false))

  return (
    <Dialog open={open} modal={!minimized} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        showCloseButton={false}
        disableScaleAnimation
        hideOverlay={minimized}
        className={cn(
          "flex flex-row gap-0 overflow-hidden bg-background p-0 outline-none",
          minimized
            ? "bottom-4 left-auto right-4 top-auto h-28 w-[min(28rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 rounded-xl border border-border shadow-xl"
            : isMobile || displayMode === "fullscreen"
              ? "h-[100dvh] w-[100dvw] max-w-none rounded-none border-0 shadow-none"
              : "h-[min(760px,calc(100dvh-48px))] w-[min(1120px,calc(100vw-48px))] max-w-none rounded-xl border border-border shadow-xl"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <header className={cn("flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-3 sm:gap-3", minimized ? "min-h-11 py-1" : "min-h-14 py-1 md:px-4")}>
            <Button variant="ghost" size="icon" className={previewIconButtonClass} onClick={onClose} aria-label="关闭预览">
              <IconX />
            </Button>
            {titleIcon ? <span className="flex size-5 shrink-0 items-center justify-center">{titleIcon}</span> : null}
            <div className="min-w-0 flex-1 basis-48">
              <DialogTitle className="whitespace-normal break-all text-sm font-medium leading-5 text-foreground" title={name}>{name}</DialogTitle>
            </div>
            <div
              ref={setImageToolbarTarget}
              className={cn(
                manifest?.kind === "image" && !minimized
                  ? "custom-scrollbar order-last min-w-0 basis-full overflow-x-auto lg:order-none lg:basis-auto"
                  : "hidden"
              )}
            />
            {!minimized && totalCount > 1 && onPrev && onNext ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" className={previewIconButtonClass} onClick={onPrev} aria-label="上一个">
                  <IconChevronLeft />
                </Button>
                <Button variant="ghost" size="icon" className={previewIconButtonClass} onClick={onNext} aria-label="下一个">
                  <IconChevronRight />
                </Button>
              </div>
            ) : null}
            {!minimized ? <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">{currentIndex + 1} / {totalCount}</span> : null}
            <div className="flex shrink-0 items-center gap-1">
              {minimized ? (
                <Button variant="ghost" size="icon" className={previewIconButtonClass} onClick={() => setDisplayMode("window")} aria-label="恢复音频播放器" title="恢复播放器">
                  <IconArrowsMaximize />
                </Button>
              ) : (
                <>
                  {manifest?.kind === "audio" ? (
                    <Button variant="ghost" size="icon" className={previewIconButtonClass} onClick={() => { setShowDetails(false); setDisplayMode("minimized") }} aria-label="最小化音频播放器" title="最小化">
                      <IconMinus />
                    </Button>
                  ) : null}
                  {!isMobile ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={previewIconButtonClass}
                      onClick={() => setDisplayMode((value) => value === "window" ? "fullscreen" : "window")}
                      aria-label={displayMode === "fullscreen" ? "切换到中等窗口" : "切换到全屏"}
                      title={displayMode === "fullscreen" ? "中等窗口" : "全屏"}
                    >
                      {displayMode === "fullscreen" ? <IconArrowsMinimize /> : <IconArrowsMaximize />}
                    </Button>
                  ) : null}
                  {leadingActions}
                  {onDownload ? (
                    <Button variant="ghost" size="icon" className={previewIconButtonClass} onClick={onDownload} aria-label="下载">
                      <IconDownload />
                    </Button>
                  ) : null}
                  {detailsContent ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(previewIconButtonClass, showDetails && "bg-accent text-foreground")}
                      onClick={() => setShowDetails((value) => !value)}
                      aria-label="文件属性"
                    >
                      <IconInfoCircle />
                    </Button>
                  ) : null}
                  {moreActions}
                </>
              )}
            </div>
          </header>

          <main className="relative min-h-0 flex-1 overflow-hidden bg-background">
            {loading ? (
              <PreviewSkeleton kind={manifest?.kind ?? inferredKind} compact={minimized} />
            ) : error ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-sm text-destructive">{error}</p>
                {onRetry ? (
                  <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
                    <IconRefresh data-icon="inline-start" />重试
                  </Button>
                ) : null}
              </div>
            ) : manifest ? (
              <PreviewRenderer manifest={manifest} onRetry={onRetry} compactAudio={minimized} imageToolbarTarget={imageToolbarTarget} />
            ) : null}
          </main>
        </div>

        {!minimized && detailsContent ? (
          isMobile ? (
            <AnimatePresence>
              {showDetails ? (
                <motion.div key="preview-properties-mobile" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }} className="absolute inset-0 bg-background">
                  {detailsContent}
                </motion.div>
              ) : null}
            </AnimatePresence>
          ) : (
            <AnimatePresence>
              {showDetails ? (
                <motion.aside key="preview-properties" initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="min-h-0 shrink-0 self-stretch overflow-hidden border-l border-border bg-card">
                  <div className="h-full min-h-0 w-[340px]">{detailsContent}</div>
                </motion.aside>
              ) : null}
            </AnimatePresence>
          )
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
