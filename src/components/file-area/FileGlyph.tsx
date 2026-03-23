import { 
  IconFolderFilled, 
  IconFileTypePdf, 
  IconFileTypeDoc, 
  IconFileTypeDocx, 
  IconFileTypeXls, 
  IconFileTypePpt, 
  IconFileTypeZip, 
  IconFileCode, 
  IconPhoto, 
  IconVideo, 
  IconMusic, 
  IconFile,
  IconFileTypeTxt,
  IconFileTypeCsv
} from "@tabler/icons-react"

import { type FileNode } from "@/lib/mock-data"

export function FileGlyph({ item, size = 20 }: { item: FileNode, size?: number }) {
  if (item.kind === "folder") {
    return <IconFolderFilled size={size} className="text-[#8d8d8d]" />
  }

  const ext = item.ext?.toLowerCase() ?? ""
  const mediaType = item.mediaType

  if (["ppt", "pptx"].includes(ext)) return <IconFileTypePpt size={size} className="text-[#ff5b12]" />
  if (["doc", "docx"].includes(ext)) return <IconFileTypeDocx size={size} className="text-[#2563eb]" />
  if (["xls", "xlsx"].includes(ext)) return <IconFileTypeXls size={size} className="text-[#16a34a]" />
  if (ext === "pdf") return <IconFileTypePdf size={size} className="text-[#ef4444]" />
  if (ext === "csv") return <IconFileTypeCsv size={size} className="text-[#16a34a]" />
  if (ext === "txt") return <IconFileTypeTxt size={size} className="text-[#6b7280]" />
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return <IconFileTypeZip size={size} className="text-[#f59e0b]" />
  if (["ts", "tsx", "js", "jsx", "json", "html", "css"].includes(ext) || mediaType === "code") return <IconFileCode size={size} className="text-[#0f9e8a]" />
  if (mediaType === "image") return <IconPhoto size={size} className="text-[#0ea5e9]" />
  if (mediaType === "video") return <IconVideo size={size} className="text-[#8b5cf6]" />
  if (mediaType === "audio") return <IconMusic size={size} className="text-[#ec4899]" />
  
  return <IconFile size={size} className="text-[#7c7c7c]" />
}
