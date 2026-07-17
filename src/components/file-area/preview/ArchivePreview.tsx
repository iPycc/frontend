import { IconArchive, IconFile, IconFolder } from "@tabler/icons-react"

import type { PreviewManifest } from "@/api/files"

type ArchiveEntry = {
  name: string
  size?: number
  is_dir?: boolean
  directory?: boolean
}

function formatBytes(size = 0) {
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`
  return `${(size / 1024 ** 3).toFixed(1)} GB`
}

export function ArchivePreview({ manifest }: { manifest: PreviewManifest }) {
  const entries = Array.isArray(manifest.metadata.entries) ? manifest.metadata.entries as ArchiveEntry[] : []
  return (
    <div className="h-full overflow-auto bg-background p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
          <IconArchive size={28} className="text-primary" />
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{manifest.name}</h2>
            <p className="text-xs text-muted-foreground">显示前 {entries.length} 个条目，仅浏览目录，不解压文件。</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          {entries.length ? entries.map((entry, index) => (
            <div key={`${entry.name}-${index}`} className="flex min-h-10 items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-b-0">
              {entry.is_dir || entry.directory ? <IconFolder size={17} className="shrink-0 text-primary" /> : <IconFile size={17} className="shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1 truncate text-foreground" title={entry.name}>{entry.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{entry.is_dir || entry.directory ? "文件夹" : formatBytes(entry.size)}</span>
            </div>
          )) : (
            <div className="p-8 text-center text-sm text-muted-foreground">压缩包为空或无法读取目录。</div>
          )}
        </div>
      </div>
    </div>
  )
}
