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
import { previewFailure } from "@/components/file-area/preview/errors"
import { Button } from "@/components/ui/button"
import type { AuthSession } from "@/lib/models"
import { buildSharedPreviewManifest, sharedAudioExtensions, sharedExtensionOf } from "@/lib/shared-preview"

type SharedPreviewItem = {
  id: number
  name: string
  type: "folder" | "file"
  size: number
  preview_version?: string | null
}

type SharedPreviewSource =
  | { type: "mounted"; mount: SharedMount; session: AuthSession | null }
  | { type: "public"; shareId: string; accessToken?: string | null; ownerName: string; expiresAt?: string | null; maxDownloads?: number | null }

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
  const mountedSession = source?.type === "mounted" ? source.session : null
  const expiresAt = source?.type === "public" ? source.expiresAt : mount?.expires_at
  const maxDownloads = source?.type === "public" ? source.maxDownloads : mount?.max_downloads
  const mountAvailable = mount?.available
  const mountAccess = mount?.access
  const scope = React.useMemo(() => ({}), [accessToken, expiresAt, maxDownloads, mountAccess, mountAvailable, mountId, mountShareId, mountedSession, shareId, sourceType])
  const nodeId = item?.type === "file" ? item.id : undefined
  const nodeName = item?.name
  const nodeSize = item?.size
  const nodeVersion = item?.preview_version ?? undefined
  const [refreshKey, setRefreshKey] = React.useState(0)
  const previewKey = sourceType && nodeId !== undefined
    ? JSON.stringify([nodeId, nodeVersion, nodeName, nodeSize, refreshKey])
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
  const selection = React.useMemo(() => ({}), [previewKey, scope])
  const [preview, setPreview] = React.useState<{
    scope: typeof scope
    selection: object
    key: string
    manifest: PreviewManifest | null
    error?: ReturnType<typeof previewFailure>
  } | null>(null)

  React.useEffect(() => {
    if (nodeId === undefined || !previewKey || !fallbackManifest) return
    const controller = new AbortController()
    const load = (signal?: AbortSignal) => mountId !== undefined
      ? getSharedMountPreviewManifest(mountId, nodeId, signal)
      : getSharedPreviewManifest(shareId ?? "", accessToken, nodeId, signal)
    const request = load(controller.signal)
    void request
      .then((manifest) => {
        if (!controller.signal.aborted) {
          setPreview({ scope, selection, key: previewKey, manifest })
        }
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        if (reason instanceof ApiError && reason.status < 500) {
          setPreview({ scope, selection, key: previewKey, manifest: null, error: previewFailure(reason) })
        } else {
          setPreview({ scope, selection, key: previewKey, manifest: fallbackManifest })
        }
      })
    return () => controller.abort()
  }, [
    selection, accessToken, fallbackManifest, maxDownloads, mountAvailable, mountId, mountedSession,
    nodeId, nodeVersion, previewKey, scope, shareId,
  ])

  if (!source || !item || !fallbackManifest || !previewKey) return null
  const current = preview?.selection === selection && preview.scope === scope && preview.key === previewKey ? preview : null
  const extension = sharedExtensionOf(item.name).toUpperCase() || "文件"
  const retry = () => {
    setRefreshKey((value) => value + 1)
  }

  return (
    <PreviewDialog
      open
      name={item.name}
      titleIcon={<FileGlyph item={{ kind: item.type, name: item.name }} size={20} />}
      manifest={current?.manifest ?? null}
      loading={!current}
      error={current?.error?.message}
      inferredKind={fallbackManifest.kind}
      currentIndex={currentIndex}
      totalCount={totalCount}
      onClose={onClose}
      onRetry={current?.error?.retryable === false ? undefined : retry}
      onDownload={() => onDownload(item)}
      onPrev={onPrev}
      onNext={onNext}
      leadingActions={onSave ? (
        <Button variant="ghost" size="icon" className={previewIconButtonClass} onClick={() => onSave(item)} aria-label="转存到我的文件" title="转存到我的文件">
          <IconDeviceFloppy />
        </Button>
      ) : null}
      details={(close, metadata) => (
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
            {current?.manifest?.kind === "image"
              && typeof metadata?.width === "number" && typeof metadata.height === "number"
              && metadata.width > 0 && metadata.height > 0 ? (
                <div className="flex flex-col gap-1">
                  <dt className="text-xs text-muted-foreground">图片尺寸</dt>
                  <dd className="text-foreground">{metadata.width} × {metadata.height}</dd>
                </div>
              ) : null}
          </dl>
          {detailsFooter ? <div className="shrink-0 border-t border-border p-5">{detailsFooter}</div> : null}
        </div>
      )}
    />
  )
}
