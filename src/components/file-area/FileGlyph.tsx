import { IconFolderFilled } from "@tabler/icons-react"

import { type FileNode } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export function FileGlyph({ item }: { item: FileNode }) {
  if (item.kind === "folder") {
    return <IconFolderFilled size={20} className="text-[#8d8d8d]" />
  }

  const ext = item.ext?.toLowerCase() ?? "file"
  const badge = ext.slice(0, 1).toUpperCase()
  const color = getFileBadgeColor(ext, item.mediaType)

  return (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-[5px] text-[10px] font-semibold text-white",
        color
      )}
    >
      {badge}
    </span>
  )
}

export function getFileBadgeColor(ext: string, mediaType?: FileNode["mediaType"]) {
  if (["ppt", "pptx", "pdf"].includes(ext)) return "bg-[#ff5b12]"
  if (["doc", "docx"].includes(ext)) return "bg-[#2563eb]"
  if (["xls", "xlsx", "csv"].includes(ext)) return "bg-[#16a34a]"
  if (["zip", "rar", "7z"].includes(ext)) return "bg-[#f59e0b]"
  if (["ts", "tsx", "js", "jsx"].includes(ext) || mediaType === "code") return "bg-[#0f9e8a]"
  if (mediaType === "image") return "bg-[#0ea5e9]"
  if (mediaType === "video") return "bg-[#8b5cf6]"
  if (mediaType === "audio") return "bg-[#ec4899]"
  return "bg-[#7c7c7c]"
}
