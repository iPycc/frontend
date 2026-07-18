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
  presentation: ["ppt", "pptx", "pptm", "pps", "ppsx", "pot", "potx", "odp", "key", "dps"],
  spreadsheet: ["xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "csv", "tsv", "ods", "numbers", "et"],
  word: ["doc", "docx", "docm", "dot", "dotx", "rtf", "odt", "pages", "wps"],
  pdf: ["pdf", "xps", "oxps"],
  ebook: ["epub", "mobi", "azw", "azw3", "fb2", "djvu"],
  archive: ["zip", "rar", "7z", "tar", "gz", "tgz", "bz", "bz2", "xz", "zst", "lz", "lz4", "cab", "iso", "dmg", "pkg", "deb", "rpm", "apk", "ipa", "jar", "war"],
  json: ["json", "json5", "jsonl", "geojson"],
  markdown: ["md", "mdx", "markdown", "rst", "adoc"],
  text: ["txt", "text", "log", "nfo", "readme", "license"],
  image: ["png", "jpg", "jpeg", "jfif", "webp", "gif", "svg", "svgz", "bmp", "avif", "ico", "heic", "heif", "tif", "tiff", "raw", "dng", "cr2", "nef", "arw"],
  design: ["psd", "psb", "ai", "eps", "sketch", "fig", "xd", "xcf", "kra", "cdr"],
  video: ["mp4", "mov", "avi", "mkv", "webm", "flv", "m4v", "wmv", "mpg", "mpeg", "mpe", "ts", "mts", "m2ts", "vob", "ogv", "3gp"],
  audio: ["mp3", "wav", "flac", "ogg", "oga", "m4a", "aac", "opus", "wma", "aiff", "aif", "ape", "alac", "mid", "midi", "amr"],
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
    "vue",
    "svelte",
    "astro",
    "kt",
    "kts",
    "swift",
    "dart",
    "lua",
    "pl",
    "r",
    "scala",
    "groovy",
    "gradle",
    "cs",
    "fs",
    "fsx",
    "vb",
    "asm",
    "sol",
    "graphql",
    "gql",
    "proto",
    "dockerfile",
    "makefile",
  ],
  config: ["ini", "conf", "cfg", "config", "env", "properties", "yaml", "yml", "xml", "toml", "lock"],
  data: ["db", "sqlite", "sqlite3", "mdb", "accdb", "parquet", "avro", "orc", "sql", "dump", "bak"],
  font: ["ttf", "otf", "woff", "woff2", "eot", "fon"],
  certificate: ["pem", "crt", "cer", "der", "p12", "pfx", "key", "pub", "asc", "sig"],
  executable: ["exe", "msi", "app", "appx", "msix", "bat", "cmd", "com", "bin", "run", "dll", "so", "dylib"],
  email: ["eml", "msg", "mbox", "ics", "vcf"],
  model: ["obj", "fbx", "stl", "gltf", "glb", "blend", "3ds", "dae", "step", "stp", "iges", "igs", "dwg", "dxf"],
} as const

type FileGlyphItem = Pick<FileNode, "kind"> & Partial<FileNode>

function extensionOf(item: FileGlyphItem) {
  if (item.ext) return item.ext.toLowerCase()
  const name = item.name ?? ""
  return name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : ""
}

function fallbackColor(extension: string) {
  const colors = [
    "text-slate-500 dark:text-slate-300",
    "text-blue-500 dark:text-blue-400",
    "text-teal-500 dark:text-teal-400",
    "text-violet-500 dark:text-violet-400",
    "text-amber-500 dark:text-amber-400",
  ]
  const hash = [...extension].reduce((value, character) => value + character.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function resolveGlyph(item: FileGlyphItem): GlyphConfig {
  if (item.kind === "folder") {
    return {
      icon: FolderClosed,
      className: "text-amber-500 dark:text-amber-400",
    }
  }

  const ext = extensionOf(item)
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
  if (GROUPS.ebook.includes(ext as never) || GROUPS.email.includes(ext as never)) {
    return { icon: FileText, className: "text-indigo-500 dark:text-indigo-400" }
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
  if (GROUPS.certificate.includes(ext as never)) {
    return { icon: FileBadge2, className: "text-emerald-600 dark:text-emerald-400" }
  }
  if (GROUPS.executable.includes(ext as never)) {
    return { icon: FileArchive, className: "text-zinc-600 dark:text-zinc-300" }
  }
  if (GROUPS.model.includes(ext as never)) {
    return { icon: FileChartColumnIncreasing, className: "text-orange-500 dark:text-orange-400" }
  }
  if (GROUPS.code.includes(ext as never) || mediaType === "code") {
    return { icon: FileCode2, className: "text-cyan-500 dark:text-cyan-400" }
  }
  if (GROUPS.config.includes(ext as never)) {
    return { icon: FileCode2, className: "text-slate-500 dark:text-slate-300" }
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
  if (GROUPS.design.includes(ext as never)) {
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

  if (ext) {
    return { icon: FileType2, className: fallbackColor(ext) }
  }

  return {
    icon: File,
    className: "text-slate-400 dark:text-slate-300",
  }
}

export function FileGlyph({ item, size = 20 }: { item: FileGlyphItem; size?: number }) {
  const glyph = resolveGlyph(item)
  const Icon = glyph.icon

  return <Icon size={size} className={glyph.className} strokeWidth={1.9} aria-hidden="true" />
}
