import type { PreviewManifest } from "@/api/files"
import { Skeleton } from "@/components/ui/skeleton"
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
  kind,
  compact = false,
  className,
}: {
  kind: PreviewManifest["kind"]
  compact?: boolean
  className?: string
}) {
  if (kind === "image") {
    return (
      <div className={cn("flex h-full items-center justify-center p-6", className)} role="status" aria-label="正在读取图片">
        <Skeleton className="h-full max-h-[85%] w-full max-w-[85%] rounded-md" aria-hidden="true" />
      </div>
    )
  }

  if (kind === "video") {
    return (
      <div className={cn("flex h-full flex-col gap-3 p-4", className)} role="status" aria-label="正在读取视频">
        <Skeleton className="min-h-0 flex-1 w-full rounded-md" aria-hidden="true" />
        <div className="flex items-center gap-3" aria-hidden="true">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-2 flex-1" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    )
  }

  if (kind === "audio") {
    return (
      <div className={cn("flex h-full items-center gap-4 p-5", compact && "p-3", className)} role="status" aria-label="正在读取音频">
        <Skeleton className={cn("shrink-0 rounded-lg", compact ? "size-14" : "size-24")} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-3" aria-hidden="true">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-3 w-32 max-w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      </div>
    )
  }

  if (kind === "pdf" || kind === "office") {
    return (
      <div className={cn("flex h-full items-center justify-center bg-muted/30 p-5", className)} role="status" aria-label="正在读取文档">
        <Skeleton className="h-full max-h-[92%] w-full max-w-[72%] rounded-sm" aria-hidden="true" />
      </div>
    )
  }

  if (kind === "text" || kind === "archive") {
    return (
      <div className={cn("flex h-full flex-col gap-4 p-5", className)} role="status" aria-label="正在读取文件内容">
        <div className="flex items-center justify-between gap-4" aria-hidden="true">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="min-h-0 flex-1 w-full rounded-md" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className={cn("flex h-full items-center justify-center p-6", className)} role="status" aria-label="正在读取预览信息">
      <Skeleton className="size-20 rounded-xl" aria-hidden="true" />
    </div>
  )
}
