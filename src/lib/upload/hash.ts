const MAX_HASH_BYTES = 16 * 1024 * 1024

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
