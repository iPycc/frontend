import { requestJson } from "@/api/client"
import type {
  OfficeCardPreviewData,
  PreviewManifest,
} from "@/api/file/type"

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
