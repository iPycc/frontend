import { requestJson } from "@/api/client"
import { requestImageManifest, type ImageManifestRequests } from "@/api/file/image-manifest-cache"
import type {
  OfficeCardPreviewData,
  ExplorerNode,
  ArchiveEntryPage,
  PdfAnnotation,
  PdfAnnotationDocument,
  PreviewManifest,
} from "@/api/file/type"
import type { AuthSession } from "@/lib/models"

export function buildDownloadUrl(nodeId: number, relay = false) {
  return `/api/v1/explorer/download/${nodeId}${relay ? "?relay=true" : ""}`
}

export function buildArchiveDownloadUrl(nodeIds: number[], downloadName?: string) {
  const query = new URLSearchParams()
  nodeIds.forEach((nodeId) => query.append("node_ids", String(nodeId)))
  if (downloadName) query.set("download_name", downloadName)
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

export function getPreviewManifest(nodeId: number, signal?: AbortSignal) {
  return requestJson<PreviewManifest>(`/explorer/preview/${nodeId}/manifest`, { signal })
}

const imagePreviewRequests = new WeakMap<AuthSession, ImageManifestRequests>()

export function getImagePreviewManifest(
  nodeId: number,
  updatedAt: string,
  session: AuthSession,
  refresh: boolean
) {
  let requests = imagePreviewRequests.get(session)
  if (!requests) {
    requests = new Map()
    imagePreviewRequests.set(session, requests)
  }
  return requestImageManifest(requests, `${nodeId}:${updatedAt}`, () => getPreviewManifest(nodeId, AbortSignal.timeout(30_000)), { refresh })
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

export function getArchiveEntries(nodeId: number, offset: number, limit = 200) {
  const query = new URLSearchParams({ offset: String(offset), limit: String(limit) })
  return requestJson<ArchiveEntryPage>(`/explorer/preview/${nodeId}/archive/entries?${query.toString()}`)
}

export function getPdfAnnotations(nodeId: number, signal?: AbortSignal) {
  return requestJson<PdfAnnotationDocument>(`/explorer/preview/${nodeId}/annotations`, { signal })
}

export function savePdfAnnotations(
  nodeId: number,
  sourceVersion: string,
  revision: number,
  annotations: PdfAnnotation[]
) {
  return requestJson<PdfAnnotationDocument>(`/explorer/preview/${nodeId}/annotations`, {
    method: "PUT",
    headers: { "If-Match": `"${revision}"` },
    body: { source_version: sourceVersion, annotations },
  })
}

export function savePreviewImageAs(nodeId: number, file: Blob, filename: string) {
  const body = new FormData()
  body.append("name", filename)
  body.append("file", file, filename)
  return requestJson<ExplorerNode>(`/explorer/preview/${nodeId}/image/save-as`, {
    method: "POST",
    body,
  })
}

export function buildFolderDownloadUrl(nodeId: number) {
  return `/api/v1/explorer/download/folder/${nodeId}`
}
