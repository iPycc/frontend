import type { PreviewManifest } from "@/api/files"
import { requestResponse } from "@/api/client"

type PreviewRequestOptions = {
  signal?: AbortSignal
  cache?: RequestCache
  headers?: HeadersInit
}

export function previewSourceUrls(manifest: PreviewManifest) {
  return Array.from(new Set([
    manifest.assets.source?.url,
    manifest.assets.proxy?.url,
  ].filter((value): value is string => Boolean(value))))
}

export function isSameOriginPreviewUrl(url: string) {
  if (typeof window === "undefined") return !/^https?:\/\//i.test(url)
  return new URL(url, window.location.href).origin === window.location.origin
}

export async function requestPreviewAsset(url: string, options: PreviewRequestOptions = {}) {
  if (isSameOriginPreviewUrl(url)) {
    return requestResponse(url, options)
  }

  const response = await fetch(url, {
    signal: options.signal,
    cache: options.cache,
    headers: options.headers,
    credentials: "omit",
  })
  if (!response.ok) {
    throw new Error(`预览资源请求失败 (${response.status})`)
  }
  return response
}
