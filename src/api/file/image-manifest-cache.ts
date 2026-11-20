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

  const entry = { manifest: load(), expiresAt: validUntil }
  requests.delete(key)
  requests.set(key, entry)
  if (requests.size > MAX_ENTRIES) {
    const oldest = requests.keys().next().value
    if (oldest !== undefined) requests.delete(oldest)
  }
  void entry.manifest.then((manifest) => {
    const source = manifest.assets.source
    if (!source || manifest.kind !== "image" || manifest.status !== "ready" || (version && manifest.version !== version)) {
      entry.expiresAt = 0
      return
    }
    const signedExpiry = source.expires_at
      ? (parseDateTime(source.expires_at)?.getTime() ?? 0) - SIGNATURE_MARGIN_MS
      : Infinity
    entry.expiresAt = Math.min(Date.now() + MAX_AGE_MS, signedExpiry, validUntil)
  }, () => {
    entry.expiresAt = 0
  })
  return entry.manifest
}
