import * as React from "react"
import { IconDeviceFloppy, IconX } from "@tabler/icons-react"

import { ApiError } from "@/api/client"
import type { PreviewManifest } from "@/api/files"
import {
  buildSharedCoverUrl,
  buildSharedPreviewUrl,
  getSharedPreviewManifest,
} from "@/api/share"
import {
  buildSharedMountPreviewUrl,
  getSharedMountPreviewManifest,
  type SharedMount,
} from "@/api/shared"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { PreviewDialog, previewIconButtonClass } from "@/components/file-area/PreviewDialog"
import { Button } from "@/components/ui/button"
import { buildSharedPreviewManifest, sharedAudioExtensions, sharedExtensionOf } from "@/lib/shared-preview"

type SharedPreviewItem = {
  id: number
  name: string
  type: "folder" | "file"
  size: number
}

type SharedPreviewSource =
  | { type: "mounted"; mount: SharedMount }
  | { type: "public"; shareId: string; accessToken?: string | null; ownerName: string }

type SharedFilePreviewModalProps<T extends SharedPreviewItem> = {
  source: SharedPreviewSource | null
  item: T | null
  formatBytes: (bytes: number) => string
  currentIndex?: number
  totalCount?: number
  onClose: () => void
  onDownload: (item: T) => void
  onSave?: (item: T) => void
  detailsFooter?: React.ReactNode
  onPrev?: () => void
  onNext?: () => void
}

export function SharedFilePreviewModal<T extends SharedPreviewItem>({
  source,
  item,
  formatBytes,
  currentIndex = 0,
  totalCount = 1,
  onClose,
  onDownload,
  onSave,
  detailsFooter,
  onPrev,
  onNext,
}: SharedFilePreviewModalProps<T>) {
  const sourceType = source?.type ?? null
  const mount = source?.type === "mounted" ? source.mount : null
  const mountId = mount?.id
  const mountShareId = mount?.share_id
  const shareId = source?.type === "public" ? source.shareId : null
  const accessToken = source?.type === "public" ? source.accessToken : null
  const nodeId = item?.type === "file" ? item.id : undefined
  const nodeName = item?.name
  const nodeSize = item?.size
  const [refreshKey, setRefreshKey] = React.useState(0)
  const previewKey = sourceType && nodeId !== undefined
    ? JSON.stringify([sourceType, mountId, mountShareId, shareId, accessToken, nodeId, nodeName, nodeSize, refreshKey])
    : null
  const ownerName = sourceType === "mounted"
    ? mount?.owner_username ?? "共享用户"
    : source?.type === "public" ? source.ownerName : "共享用户"
  const fallbackManifest = React.useMemo(() => {
    if (!sourceType || nodeId === undefined || nodeName === undefined || nodeSize === undefined) return null
    const node = { id: nodeId, name: nodeName, size: nodeSize }
    if (sourceType === "mounted" && mountId !== undefined) {
      return buildSharedPreviewManifest({
        node,
        source: buildSharedMountPreviewUrl(mountId, nodeId),
        version: `mounted-share-${mountShareId}-${nodeId}`,
      })
    }
    if (!shareId) return null
    const extension = sharedExtensionOf(nodeName)
    return buildSharedPreviewManifest({
      node,
      source: buildSharedPreviewUrl(shareId, accessToken, nodeId),
      version: `share-${shareId}-${nodeId}`,
      cover: sharedAudioExtensions.has(extension)
        ? buildSharedCoverUrl(shareId, accessToken, nodeId)
        : undefined,
    })
  }, [accessToken, mountId, mountShareId, nodeId, nodeName, nodeSize, shareId, sourceType])
  const [preview, setPreview] = React.useState<{
    key: string
    manifest: PreviewManifest | null
    error?: string
  } | null>(null)

  React.useEffect(() => {
    if (nodeId === undefined || !previewKey || !fallbackManifest) return
    const controller = new AbortController()
    const request = mountId !== undefined
      ? getSharedMountPreviewManifest(mountId, nodeId, controller.signal)
      : getSharedPreviewManifest(shareId ?? "", accessToken, nodeId, controller.signal)
    void request
      .then((manifest) => {
        if (!controller.signal.aborted) {
          setPreview({ key: previewKey, manifest })
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        if (reason instanceof ApiError && reason.status < 500) {
          setPreview({ key: previewKey, manifest: null, error: reason.message })
        } else {
          setPreview({ key: previewKey, manifest: fallbackManifest })
        }
      })
    return () => controller.abort()
  }, [accessToken, fallbackManifest, mountId, nodeId, previewKey, shareId])

  if (!source || !item || !fallbackManifest || !previewKey) return null
  const current = preview?.key === previewKey ? preview : null
  const extension = sharedExtensionOf(item.name).toUpperCase() || "文件"

  return (
    <PreviewDialog
      open
      name={item.name}
      titleIcon={<FileGlyph item={{ kind: item.type, name: item.name }} size={20} />}
      manifest={current?.manifest ?? null}
      loading={!current}
      error={current?.error}
      inferredKind={fallbackManifest.kind}
      currentIndex={currentIndex}
      totalCount={totalCount}
      onClose={onClose}
      onRetry={() => setRefreshKey((value) => value + 1)}
      onDownload={() => onDownload(item)}
      onPrev={onPrev}
      onNext={onNext}
      leadingActions={onSave ? (
        <Button variant="ghost" size="icon" className={previewIconButtonClass} onClick={() => onSave(item)} aria-label="转存到我的文件" title="转存到我的文件">
          <IconDeviceFloppy />
        </Button>
      ) : null}
      details={(close) => (
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <h2 className="text-sm font-semibold">文件属性</h2>
            <Button variant="ghost" size="icon" onClick={close} aria-label="关闭文件属性">
              <IconX />
            </Button>
          </header>
          <dl className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 text-sm">
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">名称</dt>
              <dd className="break-words font-medium text-foreground">{item.name}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs text-muted-foreground">分享者</dt>
              <dd className="text-foreground">{ownerName}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">类型</dt>
                <dd className="text-foreground">{extension}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted-foreground">大小</dt>
                <dd className="text-foreground">{formatBytes(item.size)}</dd>
              </div>
            </div>
          </dl>
          {detailsFooter ? <div className="shrink-0 border-t border-border p-5">{detailsFooter}</div> : null}
        </div>
      )}
    />
  )
}
