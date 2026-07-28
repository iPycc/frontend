import { requestJson } from "./client"
import type { SortValue } from "@/lib/models"
import type { MountMode, MountSyncStatus } from "@/api/storage"

export type ExplorerMount = {
  id: number
  owner_id: number
  policy_id: number
  name: string
  mount_slug: string
  root_path: string
  provider_label?: string | null
  is_enabled: boolean
  mode: MountMode
  read_only: boolean
  legacy_prefixed_keys: boolean
  sync_status: MountSyncStatus
  last_sync_at?: string | null
  sync_error?: string | null
  synced_objects: number
  quota_bytes?: number | null
  extra: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ExplorerNode = {
  id: number
  owner_id: number
  mount_id: number
  parent_id?: number | null
  type: "folder" | "file"
  status: "active" | "deleted"
  name: string
  blob_path?: string | null
  size: number
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export type CreateFolderInput = {
  mount_id: number
  parent_id?: number | null
  name: string
}

export type CreateFileInput = {
  mount_id: number
  parent_id?: number | null
  name: string
}

export type RenameNodeInput = {
  name: string
}

export type DeleteNodesInput = {
  node_ids: number[]
  hard_delete: boolean
}

export type TransferNodesInput = {
  node_ids: number[]
  target_parent_id?: number | null
}

export type RestoreNodesInput = {
  node_ids: number[]
}

export type ExplorerNodePage = {
  items: ExplorerNode[]
  next_cursor: string | null
}

export type ListNodePageOptions = {
  mountId: number
  parentId?: number | null
  limit: number
  cursor?: string | null
  sort?: SortValue
  foldersOnly?: boolean
}

export type ExplorerNodeSearchResult = {
  node: ExplorerNode
  parent_path: string
}

export type NodeActivity = {
  id: number
  action: string
  actor_id?: number | null
  actor_name: string
  actor_avatar?: string | null
  detail?: string | null
  created_at: string
}

export type BackgroundTask = {
  id: string
  owner_id: number
  kind: "archive_extract"
  name: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  detail?: string | null
  result_node_id?: number | null
  created_at: string
  updated_at: string
}

export type PreviewAsset = {
  url: string
  mime_type: string
  width?: number | null
  height?: number | null
  size?: number | null
  supports_range: boolean
  delivery?: "cloudrave" | "storage" | "external"
  expires_at?: string | null
}

export type PreviewKind = "image" | "video" | "audio" | "pdf" | "office" | "text" | "archive" | "unsupported"

export type PreviewManifest = {
  node_id: number
  name: string
  version: string
  kind: PreviewKind
  status: "ready" | "processing" | "unsupported" | "failed"
  mime_type: string
  size: number
  metadata: Record<string, unknown>
  assets: Record<string, PreviewAsset>
  capabilities: string[]
  requires_preparation: boolean
  preparation_available: boolean
  error?: string | null
}

export type OfficeCardPreviewData = {
  kind: "document" | "spreadsheet" | "presentation" | "unsupported"
  lines: string[]
  rows: string[][]
  cover_available: boolean
  cover_kind?: "thumbnail" | "slide-image" | null
  aspect_ratio?: number | null
}

export async function listUserMounts(token: string) {
  return requestJson<ExplorerMount[]>("/explorer/mount", {
    token,
  })
}

export async function listNodes(token: string, mountId: number, parentId?: number | null) {
  const query = new URLSearchParams({ mount_id: String(mountId) })
  if (parentId !== undefined && parentId !== null) {
    query.set("parent_id", String(parentId))
  }

  return requestJson<ExplorerNode[]>(`/explorer/node?${query.toString()}`, { token })
}

export async function listNodesForDownload(mountId: number, parentId: number) {
  const query = new URLSearchParams({ mount_id: String(mountId), parent_id: String(parentId) })
  return requestJson<ExplorerNode[]>(`/explorer/node?${query.toString()}`)
}

export async function listNodePage(token: string, options: ListNodePageOptions) {
  const query = new URLSearchParams({
    mount_id: String(options.mountId),
    limit: String(options.limit),
    sort: options.sort ?? "name-asc",
  })
  if (options.parentId !== undefined && options.parentId !== null) {
    query.set("parent_id", String(options.parentId))
  }
  if (options.cursor) {
    query.set("cursor", options.cursor)
  }
  if (options.foldersOnly) {
    query.set("folders_only", "true")
  }

  return requestJson<ExplorerNodePage>(`/explorer/node/page?${query.toString()}`, { token })
}

export async function listCategoryNodePage(
  token: string,
  options: Omit<ListNodePageOptions, "parentId" | "foldersOnly"> & {
    category: "image" | "video" | "audio" | "document"
  }
) {
  const query = new URLSearchParams({
    mount_id: String(options.mountId),
    category: options.category,
    limit: String(options.limit),
    sort: options.sort ?? "name-asc",
  })
  if (options.cursor) {
    query.set("cursor", options.cursor)
  }

  return requestJson<ExplorerNodePage>(`/explorer/node/category?${query.toString()}`, { token })
}

export async function searchNodes(
  token: string,
  mountId: number,
  queryText: string,
  signal?: AbortSignal
) {
  const query = new URLSearchParams({
    mount_id: String(mountId),
    q: queryText,
    limit: "20",
  })
  return requestJson<ExplorerNodeSearchResult[]>(`/explorer/node/search?${query.toString()}`, {
    token,
    signal,
  })
}

export async function createFolder(token: string, body: CreateFolderInput) {
  return requestJson<ExplorerNode>("/explorer/node/folder", {
    method: "POST",
    token,
    body,
  })
}

export async function createFile(token: string, body: CreateFileInput) {
  return requestJson<ExplorerNode>("/explorer/node/file", {
    method: "POST",
    token,
    body,
  })
}

export async function renameNode(token: string, nodeId: number, body: RenameNodeInput) {
  return requestJson<ExplorerNode>(`/explorer/node/${nodeId}`, {
    method: "PATCH",
    token,
    body,
  })
}

export async function moveNodes(token: string, body: TransferNodesInput) {
  return requestJson<ExplorerNode[]>("/explorer/node/move", {
    method: "POST",
    token,
    body,
  })
}

export async function copyNodes(token: string, body: TransferNodesInput) {
  return requestJson<ExplorerNode[]>("/explorer/node/copy", {
    method: "POST",
    token,
    body,
  })
}

export function recordNodeOpen(nodeId: number) {
  return requestJson<void>(`/explorer/node/${nodeId}/open`, { method: "POST" })
}

export function listNodeActivity(nodeId: number) {
  return requestJson<NodeActivity[]>(`/explorer/node/${nodeId}/activity`)
}

export async function deleteNodes(token: string, body: DeleteNodesInput) {
  return requestJson<Record<string, unknown>>("/explorer/node", {
    method: "DELETE",
    token,
    body,
  })
}

export async function listRecycle(token: string) {
  return requestJson<ExplorerNode[]>("/explorer/recycle", { token })
}

export async function restoreNodes(token: string, body: RestoreNodesInput) {
  return requestJson<ExplorerNode[]>("/explorer/recycle/restore", {
    method: "POST",
    token,
    body,
  })
}

export async function permanentlyDeleteRecycleNodes(token: string, body: DeleteNodesInput) {
  return requestJson<Record<string, unknown>>("/explorer/recycle", {
    method: "DELETE",
    token,
    body,
  })
}

export function buildDownloadUrl(nodeId: number) {
  return `/api/v1/explorer/download/${nodeId}`
}

export function buildArchiveDownloadUrl(nodeIds: number[]) {
  const query = new URLSearchParams()
  nodeIds.forEach((nodeId) => query.append("node_ids", String(nodeId)))
  return `/api/v1/explorer/download/archive?${query.toString()}`
}

export function buildPreviewUrl(nodeId: number) {
  return `/api/v1/explorer/preview/${nodeId}`
}

export function buildPreviewImageUrl(
  nodeId: number,
  variant: "thumbnail" | "thumbnail_2x" | "screen" | "screen_2x",
  version?: string
) {
  const query = version ? `?v=${encodeURIComponent(version)}` : ""
  return `/api/v1/explorer/preview/${nodeId}/image/${variant}${query}`
}

export function buildPreviewVideoPosterUrl(nodeId: number, version?: string) {
  const query = version ? `?v=${encodeURIComponent(version)}` : ""
  return `/api/v1/explorer/preview/${nodeId}/video/poster${query}`
}

export function buildPreviewAudioCoverUrl(nodeId: number, version?: string) {
  const query = version ? `?v=${encodeURIComponent(version)}` : ""
  return `/api/v1/explorer/preview/${nodeId}/audio/cover${query}`
}

const officeCardPreviewCache = new Map<string, OfficeCardPreviewData>()

export async function getOfficeCardPreview(nodeId: number, version?: string, signal?: AbortSignal) {
  const cacheKey = `${nodeId}:${version ?? ""}`
  const cached = officeCardPreviewCache.get(cacheKey)
  if (cached) return cached
  const query = version ? `?v=${encodeURIComponent(version)}` : ""
  const preview = await requestJson<OfficeCardPreviewData>(`/explorer/preview/${nodeId}/office/card${query}`, { signal })
  officeCardPreviewCache.set(cacheKey, preview)
  return preview
}

export function buildOfficeCardCoverUrl(nodeId: number, version?: string) {
  const query = version ? `?v=${encodeURIComponent(version)}` : ""
  return `/api/v1/explorer/preview/${nodeId}/office/cover${query}`
}

export function buildPreviewManifestUrl(nodeId: number) {
  return `/api/v1/explorer/preview/${nodeId}/manifest`
}

export function buildArchiveEntryPreviewUrl(nodeId: number, path: string) {
  return `/api/v1/explorer/preview/${nodeId}/archive/entry?path=${encodeURIComponent(path)}`
}

export function extractArchive(nodeId: number, targetParentId?: number | null) {
  return requestJson<BackgroundTask>(`/explorer/archive/${nodeId}/extract`, {
    method: "POST",
    body: { target_parent_id: targetParentId ?? null },
  })
}

export function listBackgroundTasks() {
  return requestJson<BackgroundTask[]>("/explorer/task")
}

const previewManifestCache = new Map<number, PreviewManifest>()

export function peekPreviewManifest(nodeId: number) {
  return previewManifestCache.get(nodeId) ?? null
}

export async function getPreviewManifest(nodeId: number, signal?: AbortSignal) {
  const manifest = await requestJson<PreviewManifest>(`/explorer/preview/${nodeId}/manifest`, { signal })
  const cached = previewManifestCache.get(nodeId)
  const merged = cached ? { ...manifest, metadata: { ...cached.metadata, ...manifest.metadata } } : manifest
  previewManifestCache.set(nodeId, merged)
  return merged
}

export async function prefetchPreviewManifest(nodeId: number) {
  const manifest = previewManifestCache.get(nodeId) ?? await getPreviewManifest(nodeId)
  const hasDimensions = typeof manifest.metadata.width === "number" && typeof manifest.metadata.height === "number"
  if (hasDimensions || (manifest.kind !== "image" && manifest.kind !== "video") || !manifest.assets.source?.url) {
    return manifest
  }

  const dimensions = await probeBrowserMediaDimensions(manifest.kind, manifest.assets.source.url)
  if (!dimensions) return manifest
  const enriched = { ...manifest, metadata: { ...manifest.metadata, ...dimensions } }
  previewManifestCache.set(nodeId, enriched)
  return enriched
}

function probeBrowserMediaDimensions(kind: "image" | "video", source: string) {
  return new Promise<{ width: number; height: number } | null>((resolve) => {
    let settled = false
    const finish = (value: { width: number; height: number } | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      resolve(value)
    }
    const timeout = window.setTimeout(() => finish(null), 4000)

    if (kind === "image") {
      const image = new Image()
      image.onload = () => finish(image.naturalWidth && image.naturalHeight
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : null)
      image.onerror = () => finish(null)
      image.src = source
      return
    }

    const video = document.createElement("video")
    const cleanup = () => {
      video.onloadedmetadata = null
      video.onerror = null
      video.removeAttribute("src")
      video.load()
    }
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      const value = video.videoWidth && video.videoHeight
        ? { width: video.videoWidth, height: video.videoHeight }
        : null
      cleanup()
      finish(value)
    }
    video.onerror = () => {
      cleanup()
      finish(null)
    }
    video.src = source
  })
}

export function preparePreview(nodeId: number) {
  return requestJson<{ status: PreviewManifest["status"]; message: string }>(`/explorer/preview/${nodeId}/prepare`, {
    method: "POST",
  })
}

export function saveTextPreview(nodeId: number, content: string, version: string) {
  return requestJson<{ version: string; size: number }>(`/explorer/preview/${nodeId}/content`, {
    method: "PUT",
    headers: { "If-Match": `"${version}"` },
    body: { content, encoding: "utf-8" },
  })
}

export function buildFolderDownloadUrl(nodeId: number) {
  return `/api/v1/explorer/download/folder/${nodeId}`
}
