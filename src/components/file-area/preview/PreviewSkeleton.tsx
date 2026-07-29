import type { PreviewManifest } from "@/api/files"
import { Spinner } from "@/components/ui/spinner"
import type { FileNode } from "@/lib/models"
import { cn } from "@/lib/utils"

export function inferPreviewKind(file: FileNode | null): PreviewManifest["kind"] {
  if (!file) return "unsupported"
  if (file.mediaType === "image") return "image"
  if (file.mediaType === "video") return "video"
  if (file.mediaType === "audio") return "audio"
  if (file.mediaType === "archive") return "archive"
  if (file.mediaType === "code") return "text"

  const extension = file.ext?.toLowerCase()
  if (extension === "pdf") return "pdf"
  if (["doc", "docx", "docm", "dot", "dotx", "xls", "xlsx", "xlsm", "xlsb", "xltx", "ppt", "pptx", "pptm", "pps", "ppsx"].includes(extension ?? "")) {
    return "office"
  }
  if (["txt", "md", "log", "csv", "json", "xml", "yaml", "yml", "ini", "conf"].includes(extension ?? "")) {
    return "text"
  }
  return "unsupported"
}

export function PreviewSkeleton({
  compact = false,
  className,
}: {
  kind: PreviewManifest["kind"]
  compact?: boolean
  className?: string
}) {
  return (
    <div
      className={cn("flex h-full items-center justify-center bg-background/95", className)}
      role="status"
      aria-label="Loading"
    >
      <div className={cn("flex items-center gap-2 text-muted-foreground", compact ? "text-xs" : "text-sm")}>
        <Spinner className={compact ? "size-3.5" : "size-4"} />
        <span>Loading...</span>
      </div>
    </div>
  )
}
