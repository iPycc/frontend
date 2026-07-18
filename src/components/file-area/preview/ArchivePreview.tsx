import * as React from "react"
import { IconArchive, IconChevronRight, IconEye, IconFile, IconFolder, IconHome, IconPackageExport, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

import { buildArchiveEntryPreviewUrl, extractArchive, type PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"

type ArchiveEntry = {
  name: string
  size?: number
  is_dir?: boolean
  directory?: boolean
}

type VisibleEntry = {
  name: string
  fullPath: string
  directory: boolean
  size?: number
}

function formatBytes(size = 0) {
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`
  return `${(size / 1024 ** 3).toFixed(1)} GB`
}

function entriesAt(entries: ArchiveEntry[], path: string): VisibleEntry[] {
  const prefix = path ? `${path}/` : ""
  const visible = new Map<string, VisibleEntry>()
  for (const entry of entries) {
    const normalized = entry.name.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
    if (!normalized.startsWith(prefix) || normalized === path) continue
    const rest = normalized.slice(prefix.length)
    const [name, ...tail] = rest.split("/")
    if (!name) continue
    const inferredDirectory = tail.length > 0 || Boolean(entry.is_dir || entry.directory)
    const fullPath = prefix + name
    const current = visible.get(name)
    visible.set(name, {
      name,
      fullPath,
      directory: current?.directory || inferredDirectory,
      size: inferredDirectory ? undefined : entry.size,
    })
  }
  return Array.from(visible.values()).sort((left, right) =>
    Number(right.directory) - Number(left.directory) || left.name.localeCompare(right.name, "zh-CN")
  )
}

export function ArchivePreview({ manifest }: { manifest: PreviewManifest }) {
  const entries = Array.isArray(manifest.metadata.entries) ? manifest.metadata.entries as ArchiveEntry[] : []
  const [path, setPath] = React.useState("")
  const [preview, setPreview] = React.useState<VisibleEntry | null>(null)
  const [extracting, setExtracting] = React.useState(false)
  const visible = React.useMemo(() => entriesAt(entries, path), [entries, path])
  const crumbs = path.split("/").filter(Boolean)

  return (
    <div className="flex h-full min-h-0 bg-background">
      <div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">
        <div className="mb-4 flex shrink-0 items-center gap-3 border-b border-border pb-4">
          <IconArchive size={28} className="text-primary" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-foreground">{manifest.name}</h2>
            <p className="text-xs text-muted-foreground">可逐层浏览 {entries.length} 个条目；打开文件不会解压到存储桶。</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={extracting}
            onClick={() => {
              setExtracting(true)
              void extractArchive(manifest.node_id)
                .then(() => toast.success("解压任务已放入后台任务"))
                .catch((reason) => toast.error(reason instanceof Error ? reason.message : "创建解压任务失败"))
                .finally(() => setExtracting(false))
            }}
          >
            <IconPackageExport size={16} />
            {extracting ? "正在创建…" : "解压到当前目录"}
          </Button>
        </div>

        <nav className="mb-3 flex shrink-0 items-center gap-1 overflow-x-auto text-sm" aria-label="压缩包路径">
          <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted" onClick={() => { setPath(""); setPreview(null) }}>
            <IconHome size={16} />根目录
          </button>
          {crumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb}-${index}`}>
              <IconChevronRight size={15} className="shrink-0 text-muted-foreground" />
              <button
                type="button"
                className="max-w-48 truncate rounded-md px-2 py-1.5 hover:bg-muted"
                onClick={() => { setPath(crumbs.slice(0, index + 1).join("/")); setPreview(null) }}
              >
                {crumb}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
          {visible.length ? visible.map((entry) => (
            <button
              type="button"
              key={entry.fullPath}
              className="flex min-h-11 w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/60"
              onDoubleClick={() => entry.directory ? setPath(entry.fullPath) : setPreview(entry)}
              onClick={() => !entry.directory && setPreview(entry)}
            >
              {entry.directory ? <IconFolder size={18} className="shrink-0 text-primary" /> : <IconFile size={18} className="shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1 truncate text-foreground" title={entry.name}>{entry.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{entry.directory ? "文件夹" : formatBytes(entry.size)}</span>
              {entry.directory ? <IconChevronRight size={16} className="text-muted-foreground" /> : <IconEye size={16} className="text-muted-foreground" />}
            </button>
          )) : (
            <div className="p-8 text-center text-sm text-muted-foreground">这个目录是空的。</div>
          )}
        </div>
      </div>

      {preview ? (
        <aside className="hidden min-h-0 w-[42%] min-w-80 flex-col border-l border-border bg-muted/20 md:flex">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{preview.name}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setPreview(null)} aria-label="关闭条目预览"><IconX /></Button>
          </header>
          <iframe
            src={buildArchiveEntryPreviewUrl(manifest.node_id, preview.fullPath)}
            title={`${preview.name} 压缩包内预览`}
            className="min-h-0 flex-1 border-0 bg-background"
          />
        </aside>
      ) : null}
    </div>
  )
}
