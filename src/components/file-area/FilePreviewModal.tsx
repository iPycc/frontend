import * as React from "react"
import {
  IconArrowMoveRight,
  IconCopy,
  IconCut,
  IconDots,
  IconEdit,
  IconShare3,
  IconTrash,
} from "@tabler/icons-react"

import { getPreviewManifest, peekPreviewManifest, preparePreview, type PreviewManifest } from "@/api/files"
import { PropertiesPanelContent } from "@/components/shared/PropertiesPanel"
import { usePropertiesPanel } from "@/components/shared/PropertiesPanelContext"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { hasCapability, type FileNode } from "@/lib/models"
import { cn } from "@/lib/utils"
import { useAppState } from "@/state/app"
import { FileGlyph } from "./FileGlyph"
import { PreviewDialog, previewIconButtonClass } from "./PreviewDialog"
import { inferPreviewKind } from "./preview/PreviewSkeleton"

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
  const backendId = file?.backendId
  const cachedManifest = backendId ? peekPreviewManifest(backendId) : null
  const [manifest, setManifest] = React.useState<PreviewManifest | null>(cachedManifest)
  const [loading, setLoading] = React.useState(!cachedManifest)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
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
    if (!open) return
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

  return (
    <PreviewDialog
      open={open}
      name={file.name}
      titleIcon={<FileGlyph item={file} size={20} />}
      manifest={manifest}
      loading={loading}
      error={error}
      inferredKind={inferPreviewKind(file)}
      currentIndex={currentIndex}
      totalCount={totalCount}
      onClose={onClose}
      onRetry={() => void retry()}
      onDownload={() => onDownload([file.id])}
      onPrev={onPrev}
      onNext={onNext}
      details={(close) => (
        <PropertiesPanelContent
          node={file}
          bucketName={bucketName}
          formatBytes={formatBytes}
          previewMetadata={manifest?.metadata}
          onClose={close}
          embedded
        />
      )}
      moreActions={(
        <DropdownMenu>
          <DropdownMenuTrigger className={cn("inline-flex items-center justify-center rounded-md", previewIconButtonClass)} aria-label="更多操作">
            <IconDots />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {canCopy ? <DropdownMenuItem onClick={() => onCopy([file.id])}><IconCopy />复制</DropdownMenuItem> : null}
              <DropdownMenuItem onClick={() => onCut([file.id])}><IconCut />剪切</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename([file.id])}><IconEdit />重命名</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove([file.id])}><IconArrowMoveRight />移动到…</DropdownMenuItem>
              {canShare ? <DropdownMenuItem onClick={() => onShare([file.id])}><IconShare3 />分享</DropdownMenuItem> : null}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete([file.id])}><IconTrash />删除</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    />
  )
}
