import {
  File,
  FileArchive,
  FileAudio,
  FileBadge2,
  FileChartColumnIncreasing,
  FileCode2,
  FileDigit,
  FileImage,
  FileJson2,
  FileMusic,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideoCamera,
  FolderClosed,
  Presentation,
  type LucideIcon,
} from "lucide-react"

import { type FileNode } from "@/lib/models"

type GlyphConfig = {
  icon: LucideIcon
  className: string
}

const GROUPS = {
  presentation: ["ppt", "pptx", "key"],
  spreadsheet: ["xls", "xlsx", "csv", "numbers"],
  word: ["doc", "docx", "rtf", "pages"],
  pdf: ["pdf"],
  archive: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"],
  json: ["json"],
  markdown: ["md", "mdx"],
  text: ["txt", "log", "ini", "conf"],
  image: ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "avif", "ico", "heic"],
  video: ["mp4", "mov", "avi", "mkv", "webm", "flv", "m4v", "wmv"],
  audio: ["mp3", "wav", "flac", "ogg", "m4a", "aac"],
  code: [
    "ts",
    "tsx",
    "js",
    "jsx",
    "html",
    "css",
    "scss",
    "less",
    "py",
    "go",
    "rs",
    "java",
    "c",
    "cpp",
    "h",
    "hpp",
    "sql",
    "sh",
    "ps1",
    "php",
    "rb",
    "yaml",
    "yml",
    "xml",
    "toml",
  ],
  data: ["db", "sqlite", "sqlite3", "parquet"],
  font: ["ttf", "otf", "woff", "woff2"],
} as const

function resolveGlyph(item: FileNode): GlyphConfig {
  if (item.kind === "folder") {
    return {
      icon: FolderClosed,
      className: "text-amber-500 dark:text-amber-400",
    }
  }

  const ext = item.ext?.toLowerCase() ?? ""
  const mediaType = item.mediaType

  if (GROUPS.presentation.includes(ext as never)) {
    return { icon: Presentation, className: "text-orange-500 dark:text-orange-400" }
  }
  if (GROUPS.spreadsheet.includes(ext as never)) {
    return { icon: FileSpreadsheet, className: "text-emerald-500 dark:text-emerald-400" }
  }
  if (GROUPS.word.includes(ext as never)) {
    return { icon: FileBadge2, className: "text-sky-500 dark:text-sky-400" }
  }
  if (GROUPS.pdf.includes(ext as never)) {
    return { icon: FileText, className: "text-rose-500 dark:text-rose-400" }
  }
  if (GROUPS.archive.includes(ext as never)) {
    return { icon: FileArchive, className: "text-amber-500 dark:text-amber-400" }
  }
  if (GROUPS.json.includes(ext as never)) {
    return { icon: FileJson2, className: "text-yellow-500 dark:text-yellow-400" }
  }
  if (GROUPS.data.includes(ext as never)) {
    return { icon: FileChartColumnIncreasing, className: "text-teal-500 dark:text-teal-400" }
  }
  if (GROUPS.font.includes(ext as never)) {
    return { icon: FileType2, className: "text-violet-500 dark:text-violet-400" }
  }
  if (GROUPS.code.includes(ext as never) || mediaType === "code") {
    return { icon: FileCode2, className: "text-cyan-500 dark:text-cyan-400" }
  }
  if (GROUPS.markdown.includes(ext as never)) {
    return { icon: FileText, className: "text-slate-500 dark:text-slate-300" }
  }
  if (GROUPS.text.includes(ext as never) || mediaType === "document") {
    return { icon: FileText, className: "text-slate-500 dark:text-slate-300" }
  }
  if (mediaType === "image" || GROUPS.image.includes(ext as never)) {
    return { icon: FileImage, className: "text-fuchsia-500 dark:text-fuchsia-400" }
  }
  if (mediaType === "video" || GROUPS.video.includes(ext as never)) {
    return { icon: FileVideoCamera, className: "text-violet-500 dark:text-violet-400" }
  }
  if (mediaType === "audio" || GROUPS.audio.includes(ext as never)) {
    return { icon: ext === "mp3" || ext === "wav" ? FileMusic : FileAudio, className: "text-pink-500 dark:text-pink-400" }
  }
  if (/^\d+$/.test(ext)) {
    return { icon: FileDigit, className: "text-blue-500 dark:text-blue-400" }
  }

  return {
    icon: File,
    className: "text-slate-400 dark:text-slate-300",
  }
}

export function FileGlyph({ item, size = 20 }: { item: FileNode; size?: number }) {
  const glyph = resolveGlyph(item)
  const Icon = glyph.icon

  return <Icon size={size} className={glyph.className} strokeWidth={1.9} />
}
