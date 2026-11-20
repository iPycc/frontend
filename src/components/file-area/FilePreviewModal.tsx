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

import { buildPreviewImageUrl, getImagePreviewManifest, getPreviewManifest, preparePreview, type PreviewManifest } from "@/api/files"
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
import { previewFailure } from "./preview/errors"
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
  const { authSession, currentUser } = useAppState()
  const canCopy = hasCapability(currentUser, "file.copy")
  const canShare = hasCapability(currentUser, "share.manage")
  const { bucketName, formatBytes } = usePropertiesPanel()
  const backendId = file?.backendId
  const fileId = file?.id
  const revision = file?.updatedAt
  const image = file?.mediaType === "image"
  const source = React.useMemo(() => ({ backendId, fileId, revision, image, authSession }),
    [backendId, fileId, revision, image, authSession])
  const [retryRequest, setRetryRequest] = React.useState<{ source: typeof source; prepare: boolean } | null>(null)
  const attempt = retryRequest?.source === source ? retryRequest : null
  const [preview, setPreview] = React.useState<{
    source: typeof source
    attempt: typeof attempt
    manifest: PreviewManifest | null
    error?: ReturnType<typeof previewFailure>
  } | null>(null)
  const current = preview?.source === source && preview.attempt === attempt ? preview : null
  const manifest = current?.manifest ?? null

  React.useEffect(() => {
    const { backendId, authSession, revision, image } = source
    if (!open || !backendId) return
    const controller = new AbortController()
    let pollTimer: number | undefined
    let pollCount = 0
    let stopped = false

    const refresh = async (prepare = true) => {
      try {
        if (prepare && attempt?.prepare) {
          await preparePreview(backendId)
          if (stopped) return
        }
        const next = await (prepare && authSession && image && revision
          ? getImagePreviewManifest(backendId, revision, authSession, Boolean(attempt))
          : getPreviewManifest(backendId, controller.signal))
        if (stopped) return
        const shouldPrepare = next.requires_preparation && next.preparation_available && !next.assets.hls && !next.assets.audio
        setPreview({ source, attempt, manifest: prepare && shouldPrepare ? { ...next, status: "processing" } : next })

        if (prepare && !attempt?.prepare && shouldPrepare && next.status !== "failed") {
          await preparePreview(backendId)
        }
        if (!stopped && (next.status === "processing" || shouldPrepare) && next.status !== "failed" && pollCount < 120) {
          pollCount += 1
          pollTimer = window.setTimeout(() => void refresh(false), 1500)
        }
      } catch (reason) {
        if (!controller.signal.aborted && !stopped) {
          setPreview({ source, attempt, manifest: null, error: previewFailure(reason) })
        }
      }
    }

    void refresh()

    return () => {
      stopped = true
      controller.abort()
      if (pollTimer) window.clearTimeout(pollTimer)
    }
  }, [attempt, open, source])

  const manifestNodeId = manifest?.node_id
  React.useEffect(() => {
    if (!open || !backendId || manifestNodeId !== backendId) return
    const requested = new Set([backendId])
    for (const candidate of preloadFiles) {
      const nodeId = candidate.backendId
      if (!nodeId || candidate.mediaType !== "image" || candidate.ext?.toLowerCase() === "svg" || requested.has(nodeId)) continue
      requested.add(nodeId)
      const image = new Image()
      image.fetchPriority = "low"
      image.src = buildPreviewImageUrl(nodeId, "thumbnail_2x", candidate.updatedAt)
    }
  }, [backendId, manifestNodeId, open, preloadFiles])

  if (!file) return null

  const retry = () => setRetryRequest({
    source,
    prepare: Boolean(manifest?.status === "failed" && manifest.requires_preparation && manifest.preparation_available),
  })

  return (
    <PreviewDialog
      open={open}
      name={file.name}
      titleIcon={<FileGlyph item={file} size={20} />}
      manifest={manifest}
      loading={Boolean(backendId) && !current}
      error={backendId ? current?.error?.message : "文件缺少后端标识"}
      inferredKind={inferPreviewKind(file)}
      currentIndex={currentIndex}
      totalCount={totalCount}
      onClose={onClose}
      onRetry={backendId && current?.error?.retryable !== false ? retry : undefined}
      onDownload={() => onDownload([file.id])}
      onPrev={onPrev}
      onNext={onNext}
      details={(close, metadata) => (
        <PropertiesPanelContent
          node={file}
          bucketName={bucketName}
          formatBytes={formatBytes}
          previewMetadata={metadata}
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
