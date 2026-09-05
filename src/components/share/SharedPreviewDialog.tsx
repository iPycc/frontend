import { useEffect, useMemo, useState } from "react"
import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconDeviceFloppy,
  IconDownload,
  IconX,
} from "@tabler/icons-react"

import {
  buildSharedMountPreviewUrl,
  getSharedMountPreviewManifest,
  type SharedItem,
  type SharedMount,
} from "@/api/shared"
import type { PreviewManifest } from "@/api/files"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { PreviewRenderer } from "@/components/file-area/preview/PreviewRenderer"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { buildSharedPreviewManifest, sharedExtensionOf } from "@/lib/shared-preview"
import { cn } from "@/lib/utils"

export function SharedPreviewDialog({
  mount,
  item,
  formatBytes,
  onClose,
  onDownload,
  onSave,
}: {
  mount: SharedMount | null
  item: SharedItem | null
  formatBytes: (bytes: number) => string
  onClose: () => void
  onDownload: (item: SharedItem) => void
  onSave: (item: SharedItem) => void
}) {
  const [fullscreen, setFullscreen] = useState(false)
  const fallbackManifest = useMemo(() => {
    if (!mount || !item || item.type !== "file") return null
    return buildSharedPreviewManifest({
      node: item,
      source: buildSharedMountPreviewUrl(mount.id, item.id),
      version: `mounted-share-${mount.share_id}-${item.id}`,
    })
  }, [item, mount])
  const previewKey = mount && item ? `${mount.id}:${item.id}` : null
  const [serverPreview, setServerPreview] = useState<{
    key: string
    manifest: PreviewManifest
  } | null>(null)

  useEffect(() => {
    if (!mount || !item || item.type !== "file") {
      setServerPreview(null)
      return
    }
    const controller = new AbortController()
    const requestKey = `${mount.id}:${item.id}`
    void getSharedMountPreviewManifest(mount.id, item.id, controller.signal)
      .then((nextManifest) => {
        if (!controller.signal.aborted) {
          setServerPreview({ key: requestKey, manifest: nextManifest })
        }
      })
      .catch(() => {
        // Keep the lightweight source-only manifest as a compatibility fallback.
      })
    return () => controller.abort()
  }, [item, mount])

  const manifest = serverPreview?.key === previewKey
    ? serverPreview.manifest
    : fallbackManifest

  if (!item || !mount || !manifest) return null

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        disableScaleAnimation
        className={cn(
          "flex gap-0 overflow-hidden bg-background p-0",
          fullscreen
            ? "h-[100dvh] w-[100dvw] max-w-none rounded-none border-0"
            : "h-[min(760px,calc(100dvh-48px))] w-[min(1120px,calc(100vw-48px))] max-w-none"
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3 md:px-4">
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭预览">
              <IconX size={20} />
            </Button>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <FileGlyph item={{ kind: item.type, name: item.name }} />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-sm font-medium">{item.name}</DialogTitle>
              <p className="truncate text-xs text-muted-foreground">
                来自 {mount.owner_username ?? "共享用户"} · {sharedExtensionOf(item.name).toUpperCase() || "文件"} · {formatBytes(item.size)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex"
                onClick={() => setFullscreen((value) => !value)}
                aria-label={fullscreen ? "退出全屏" : "全屏预览"}
              >
                {fullscreen ? <IconArrowsMinimize size={20} /> : <IconArrowsMaximize size={20} />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onSave(item)} aria-label="转存到我的文件">
                <IconDeviceFloppy size={19} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDownload(item)} aria-label="下载">
                <IconDownload size={19} />
              </Button>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-hidden">
            <PreviewRenderer manifest={manifest} />
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}
