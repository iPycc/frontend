import * as React from "react"
import {
  IconDownload,
  IconInfoCircle,
  IconDots,
  IconX,
  IconCopy,
  IconCut,
  IconEdit,
  IconShare3,
  IconTrash,
  IconArrowMoveRight,
} from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import { type FileNode } from "@/lib/mock-data"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { usePropertiesPanel } from "@/components/shared/PropertiesPanel"
import { PropertiesPanelContent } from "@/components/shared/PropertiesPanel"
import { useIsMobile } from "@/hooks/use-mobile"

interface FilePreviewModalProps {
  open: boolean 
  file: FileNode | null
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

const ICON = 22

export function FilePreviewModal({
  open,
  file,
  currentIndex,
  totalCount,
  onClose,
  onDownload,
  onProperties,
  onCopy,
  onCut,
  onRename,
  onMove,
  onShare,
  onDelete,
  onPrev,
  onNext,
}: FilePreviewModalProps) {
  const { bucketName, formatBytes } = usePropertiesPanel()
  const [showPanel, setShowPanel] = React.useState(false)
  const isMobile = useIsMobile()

  React.useEffect(() => {
    if (!open) setShowPanel(false)
  }, [open])

  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrev()
      if (e.key === "ArrowRight") onNext()
      if (e.key === "Escape") {
        if (showPanel) setShowPanel(false)
        else onClose()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, showPanel, onPrev, onNext, onClose])

  if (!file) return null

  const isVideo = file.mediaType === "video"
  const isAudio = file.mediaType === "audio"

  const btnCls = "h-9 w-9 text-white hover:bg-white/10 hover:text-white"
  const btnClsActive = "h-9 w-9 bg-white/10 text-white hover:bg-white/15"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] w-[100dvw] max-w-none flex-row gap-0 rounded-none border-none bg-black/95 p-0 outline-none focus:outline-none focus-visible:outline-none"
      >
        {/* Left: toolbar + preview */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <div className="min-w-0 flex-1">
              <span className="truncate text-sm text-white/80">{file.name}</span>
            </div>
            <div className="flex items-center text-sm text-white/50">
              {currentIndex + 1} / {totalCount}
            </div>
            <div className="flex flex-1 items-center justify-end gap-1.5">
              <Button variant="ghost" size="icon" className={btnCls} onClick={() => onDownload([file.id])}>
                <IconDownload size={ICON} />
              </Button>
              <Button variant="ghost" size="icon" className={showPanel ? btnClsActive : btnCls} onClick={() => setShowPanel((v) => !v)}>
                <IconInfoCircle size={ICON} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className={btnCls}>
                    <IconDots size={ICON} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onCopy([file.id])}>
                    <IconCopy size={16} className="mr-2" /> 复制
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onCut([file.id])}>
                    <IconCut size={16} className="mr-2" /> 剪切
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRename([file.id])}>
                    <IconEdit size={16} className="mr-2" /> 重命名
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMove([file.id])}>
                    <IconArrowMoveRight size={16} className="mr-2" /> 移动到…
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onShare([file.id])}>
                    <IconShare3 size={16} className="mr-2" /> 分享
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete([file.id])}>
                    <IconTrash size={16} className="mr-2" /> 删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className={btnCls} onClick={onClose}>
                <IconX size={ICON} />
              </Button>
            </div>
          </div>

          {/* Preview area */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-4 outline-none focus:outline-none focus-visible:outline-none">
            {totalCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={onPrev}
                  className="absolute left-0 top-0 z-10 flex h-full w-16 items-center justify-center text-2xl text-white/30 transition-colors hover:text-white/70"
                  aria-label="上一个"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="absolute right-0 top-0 z-10 flex h-full w-16 items-center justify-center text-2xl text-white/30 transition-colors hover:text-white/70"
                  aria-label="下一个"
                >
                  ›
                </button>
              </>
            )}

            {isVideo ? (
              <div className="flex flex-col items-center gap-4 text-white/50">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10">
                  <span className="text-3xl">▶</span>
                </div>
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-white/30">视频预览（模拟）</span>
              </div>
            ) : isAudio ? (
              <div className="flex flex-col items-center gap-4 text-white/50">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/10">
                  <span className="text-3xl">♪</span>
                </div>
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-white/30">音频预览（模拟）</span>
              </div>
            ) : (
              <img
                src={file.preview || `https://picsum.photos/seed/${file.id}/1920/1080`}
                alt={file.name}
                className="max-h-full max-w-full rounded object-contain outline-none focus:outline-none focus-visible:outline-none"
                draggable={false}
              />
            )}
          </div>
        </div>

        {/* Right: full-height properties panel */}
        {isMobile ? (
          <AnimatePresence>
            {showPanel && (
              <motion.div
                key="preview-props-mobile"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="absolute inset-0 z-50 bg-[#1a1a1a]"
              >
                <PropertiesPanelContent
                  node={file}
                  bucketName={bucketName}
                  formatBytes={formatBytes}
                  onClose={() => setShowPanel(false)}
                  dark
                />
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <AnimatePresence>
            {showPanel && (
              <motion.div
                key="preview-props"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="shrink-0 overflow-hidden"
              >
                <div className="h-full w-[360px]">
                  <PropertiesPanelContent
                    node={file}
                    bucketName={bucketName}
                    formatBytes={formatBytes}
                    onClose={() => setShowPanel(false)}
                    dark
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </DialogContent>
    </Dialog>
  )
}
