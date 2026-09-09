const MAX_HASH_BYTES = 16 * 1024 * 1024
const FINGERPRINT_SAMPLE_BYTES = 64 * 1024

export async function hashFile(file: File): Promise<string | null> {
  if (file.size > MAX_HASH_BYTES || typeof crypto === "undefined" || !crypto.subtle) {
    return null
  }

  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  } catch {
    // Safari private mode and constrained WebViews can expose crypto.subtle but reject digest.
    return null
  }
}

export async function fingerprintFile(file: File): Promise<string> {
  const identity = new TextEncoder().encode(
    [file.name, file.size, file.lastModified, file.type].join("\0")
  )
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return Array.from(identity, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }

  const first = new Uint8Array(await file.slice(0, FINGERPRINT_SAMPLE_BYTES).arrayBuffer())
  const lastStart = Math.max(file.size - FINGERPRINT_SAMPLE_BYTES, first.byteLength)
  const last = new Uint8Array(await file.slice(lastStart).arrayBuffer())
  const sample = new Uint8Array(identity.byteLength + first.byteLength + last.byteLength)
  sample.set(identity)
  sample.set(first, identity.byteLength)
  sample.set(last, identity.byteLength + first.byteLength)
  const digest = await crypto.subtle.digest("SHA-256", sample)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}
