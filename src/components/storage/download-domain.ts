export function parseDownloadDomain(value: string): URL | null {
  try {
    const url = new URL(value.includes("://") ? value.trim() : `https://${value.trim()}`)
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null
    return url
  } catch {
    return null
  }
}
