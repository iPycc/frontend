import type { PreviewManifest } from "@/api/files"

type PreviewNode = {
  id: number
  name: string
  size: number
}

const imageExtensions = new Set(["apng", "avif", "bmp", "gif", "heic", "jpeg", "jpg", "png", "svg", "tif", "tiff", "webp"])
const videoExtensions = new Set(["avi", "m4v", "mkv", "mov", "mp4", "webm"])
export const sharedAudioExtensions = new Set(["aac", "flac", "m4a", "mp3", "ogg", "opus", "wav"])
const officeExtensions = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx"])
const textExtensions = new Set(["c", "conf", "cpp", "cs", "css", "go", "h", "html", "ini", "java", "js", "json", "jsx", "log", "md", "markdown", "php", "py", "rb", "rs", "sh", "sql", "ts", "tsx", "txt", "xml", "yaml", "yml"])

export function sharedExtensionOf(name: string) {
  return name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : ""
}

function previewKind(extension: string): PreviewManifest["kind"] {
  if (imageExtensions.has(extension)) return "image"
  if (videoExtensions.has(extension)) return "video"
  if (sharedAudioExtensions.has(extension)) return "audio"
  if (extension === "pdf") return "pdf"
  if (officeExtensions.has(extension)) return "office"
  if (textExtensions.has(extension)) return "text"
  return "unsupported"
}

function mimeType(kind: PreviewManifest["kind"], extension: string) {
  if (kind === "image") return `image/${extension === "jpg" ? "jpeg" : extension}`
  if (kind === "video") return `video/${extension === "m4v" ? "mp4" : extension}`
  if (kind === "audio") return `audio/${extension}`
  if (kind === "pdf") return "application/pdf"
  if (kind === "text") return "text/plain; charset=utf-8"
  return "application/octet-stream"
}

export function buildSharedPreviewManifest({
  node,
  source,
  version,
  cover,
}: {
  node: PreviewNode
  source: string
  version: string
  cover?: string
}): PreviewManifest {
  const extension = sharedExtensionOf(node.name)
  const kind = previewKind(extension)
  const absoluteSource = new URL(source, window.location.origin).href
  const publicSourceReady = window.location.protocol === "https:" &&
    !["localhost", "127.0.0.1"].includes(window.location.hostname)
  const assets: PreviewManifest["assets"] = {
    source: {
      url: source,
      mime_type: mimeType(kind, extension),
      size: node.size,
      supports_range: true,
    },
  }

  if (kind === "audio" && cover) {
    assets.cover = { url: cover, mime_type: "image/webp", supports_range: true }
  }
  if (kind === "office") {
    assets.office_source = {
      url: absoluteSource,
      mime_type: "application/octet-stream",
      size: node.size,
      supports_range: true,
    }
    assets.office_viewer = {
      url: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteSource)}`,
      mime_type: "text/html",
      supports_range: false,
    }
  }

  return {
    node_id: node.id,
    name: node.name,
    version,
    kind,
    status: kind === "unsupported" ? "unsupported" : "ready",
    mime_type: mimeType(kind, extension),
    size: node.size,
    metadata: {
      extension,
      external_service: kind === "office" ? "Microsoft Office Web Viewer" : undefined,
      public_source_ready: kind === "office" ? publicSourceReady : undefined,
      max_bytes: 5 * 1024 * 1024,
    },
    assets,
    capabilities: kind === "text" ? ["syntax"] : [],
    requires_preparation: false,
    preparation_available: false,
    error: null,
  }
}
