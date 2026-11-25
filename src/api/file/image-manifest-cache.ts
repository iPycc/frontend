import type { PreviewManifest } from "@/api/file/type"
import { parseDateTime } from "@/lib/datetime"

const MAX_AGE_MS = 15_000
const MAX_ENTRIES = 16
const SIGNATURE_MARGIN_MS = 5_000

export type ImageManifestRequests = Map<string, { manifest: Promise<PreviewManifest>; expiresAt: number }>

export function requestImageManifest(
  requests: ImageManifestRequests,
  key: string,
  load: () => Promise<PreviewManifest>,
  { refresh = false, validUntil = Infinity, version }: { refresh?: boolean; validUntil?: number; version?: string } = {},
) {
  const current = requests.get(key)
  if (!refresh && current && Math.min(current.expiresAt, validUntil) > Date.now()) return current.manifest

  const entry = { manifest: load(), expiresAt: Math.min(Date.now() + 30_000, validUntil) }
  entry.manifest = entry.manifest.then((manifest) => {
    if (!manifest || typeof manifest !== "object" || !manifest.assets) throw new Error("预览响应无效")
    const source = manifest.assets.source
    if (!source || manifest.kind !== "image" || manifest.status !== "ready" || (version && manifest.version !== version)) {
      entry.expiresAt = 0
      return manifest
    }
    const expiries = [source, manifest.assets.dzi].map((asset) => asset?.expires_at
      ? (parseDateTime(asset.expires_at)?.getTime() ?? 0) - SIGNATURE_MARGIN_MS
      : Infinity)
    entry.expiresAt = Math.min(Date.now() + MAX_AGE_MS, ...expiries, validUntil)
    return manifest
  }).catch((error: unknown) => {
    entry.expiresAt = 0
    throw error
  })
  requests.delete(key)
  requests.set(key, entry)
  if (requests.size > MAX_ENTRIES) {
    const oldest = requests.keys().next().value
    if (oldest !== undefined) requests.delete(oldest)
  }
  return entry.manifest
}
