import * as React from "react"
import { IconChevronRight, IconEye, IconHome, IconPackageExport, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

import { buildArchiveEntryPreviewUrl, extractArchive, getArchiveEntries, type PreviewManifest } from "@/api/files"
import { FileGlyph } from "@/components/file-area/FileGlyph"
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

function archiveEntryPreviewUrl(manifest: PreviewManifest, path: string) {
  const configured = manifest.assets.archive_entry?.url
  if (!configured) return buildArchiveEntryPreviewUrl(manifest.node_id, path)

  if (configured.includes("{path}")) {
    return configured.replaceAll("{path}", encodeURIComponent(path))
  }

  const url = new URL(configured, window.location.origin)
  url.searchParams.set("path", path)
  return /^https?:\/\//i.test(configured)
    ? url.href
    : `${url.pathname}${url.search}${url.hash}`
}

export function ArchivePreview({ manifest }: { manifest: PreviewManifest }) {
  const initialEntries = Array.isArray(manifest.metadata.entries) ? manifest.metadata.entries as ArchiveEntry[] : []
  const [entries, setEntries] = React.useState<ArchiveEntry[]>(initialEntries)
  const [path, setPath] = React.useState("")
  const [preview, setPreview] = React.useState<VisibleEntry | null>(null)
  const [extracting, setExtracting] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(manifest.metadata.entries_truncated === true)
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set())
  const visible = React.useMemo(() => entriesAt(entries, path), [entries, path])
  const crumbs = path.split("/").filter(Boolean)
  const canExtract = manifest.capabilities.includes("extract")
  const allVisibleSelected = visible.length > 0 && visible.every((entry) => selected.has(entry.fullPath))
  const someVisibleSelected = visible.some((entry) => selected.has(entry.fullPath))
  const selectAllRef = React.useRef<HTMLInputElement>(null)

  const toggleSelected = (entryPath: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(entryPath)) next.delete(entryPath)
      else next.add(entryPath)
      return next
    })
  }

  React.useEffect(() => {
    setEntries(initialEntries)
    setHasMore(manifest.metadata.entries_truncated === true)
    setPath("")
    setPreview(null)
    setSelected(new Set())
  }, [manifest.node_id, manifest.version])

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
    }
  }, [allVisibleSelected, someVisibleSelected])

  const loadMore = () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    void getArchiveEntries(manifest.node_id, entries.length).then((page) => {
      setEntries((current) => [...current, ...page.items])
      setHasMore(page.has_more)
    }).catch((reason: unknown) => {
      toast.error(reason instanceof Error ? reason.message : "加载更多条目失败")
    }).finally(() => setLoadingMore(false))
  }

  return (
    <div className="relative flex h-full min-h-0 bg-background">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border px-4 py-3 md:px-5">
          <FileGlyph item={{ kind: "file", name: manifest.name }} size={28} />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">压缩包内容</h2>
            <p className="text-xs text-muted-foreground">
              {hasMore ? `已加载 ${entries.length} 个条目` : `${entries.length} 个条目`} · 当前目录 {visible.length} 项
              {selected.size ? ` · 已选择 ${selected.size} 项` : ""}
            </p>
          </div>
          {canExtract ? (
            <Button
              variant="outline"
              size="sm"
              disabled={extracting}
              onClick={() => {
                setExtracting(true)
                void extractArchive(manifest.node_id, null, Array.from(selected))
                  .then(() => toast.success("解压任务已放入后台任务"))
                  .catch((reason) => toast.error(reason instanceof Error ? reason.message : "创建解压任务失败"))
                  .finally(() => setExtracting(false))
              }}
            >
              <IconPackageExport size={16} />
              {extracting ? "正在创建…" : selected.size ? `解压所选 (${selected.size})` : "全部解压"}
            </Button>
          ) : null}
        </div>

        <div className="flex min-h-12 shrink-0 items-center gap-3 border-b border-border px-3 md:px-4">
          <nav className="no-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm" aria-label="压缩包路径">
            <button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 hover:bg-muted" onClick={() => { setPath(""); setPreview(null) }}>
              <IconHome size={16} />根目录
            </button>
            {crumbs.map((crumb, index) => (
              <React.Fragment key={`${crumb}-${index}`}>
                <IconChevronRight size={15} className="shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  className="max-w-48 shrink-0 truncate rounded-md px-2 py-1.5 hover:bg-muted"
                  onClick={() => { setPath(crumbs.slice(0, index + 1).join("/")); setPreview(null) }}
                >
                  {crumb}
                </button>
              </React.Fragment>
            ))}
          </nav>
          {selected.size ? (
            <button type="button" className="shrink-0 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setSelected(new Set())}>
              清除选择
            </button>
          ) : null}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-auto">
          <div className="sticky top-0 z-10 flex min-h-9 items-center gap-3 border-b border-border bg-muted/50 px-4 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            {canExtract ? (
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() => setSelected((current) => {
                  const next = new Set(current)
                  visible.forEach((entry) => { if (allVisibleSelected) next.delete(entry.fullPath); else next.add(entry.fullPath) })
                  return next
                })}
                aria-label="选择当前目录全部条目"
                title="选择当前目录"
              />
            ) : null}
            <span className="min-w-0 flex-1">名称</span>
            <span className="w-20 shrink-0 text-right">大小</span>
            <span className="w-4 shrink-0" aria-hidden="true" />
          </div>
          {visible.length ? visible.map((entry) => (
            <div
              key={entry.fullPath}
              className="flex min-h-12 w-full items-center gap-3 border-b border-border px-4 py-2 text-left text-sm hover:bg-muted/60"
            >
              {canExtract ? <input type="checkbox" checked={selected.has(entry.fullPath)} onChange={() => toggleSelected(entry.fullPath)} aria-label={`选择 ${entry.name}`} /> : null}
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => {
                  if (entry.directory) { setPath(entry.fullPath); setPreview(null) }
                  else setPreview(entry)
                }}
              >
                <FileGlyph item={{ kind: entry.directory ? "folder" : "file", name: entry.name }} size={20} />
                <span className="min-w-0 flex-1 truncate text-foreground" title={entry.name}>{entry.name}</span>
                <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{entry.directory ? "—" : formatBytes(entry.size)}</span>
                {entry.directory ? <IconChevronRight size={16} className="text-muted-foreground" /> : <IconEye size={16} className="text-muted-foreground" />}
              </button>
            </div>
          )) : (
            <div className="flex min-h-40 items-center justify-center px-6 text-center text-sm text-muted-foreground">这个目录是空的。</div>
          )}
          {hasMore ? (
            <div className="flex justify-center border-b border-border p-2">
              <Button variant="ghost" size="sm" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "正在加载…" : "加载更多条目"}</Button>
            </div>
          ) : null}
        </div>
      </div>

      {preview ? (
        <aside className="absolute inset-0 z-20 flex min-h-0 flex-col bg-background md:static md:w-[42%] md:min-w-80 md:border-l md:border-border md:bg-muted/20">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{preview.name}</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setPreview(null)} aria-label="关闭条目预览"><IconX /></Button>
          </header>
          <iframe
            key={preview.fullPath}
            src={archiveEntryPreviewUrl(manifest, preview.fullPath)}
            title={`${preview.name} 压缩包内预览`}
            className="min-h-0 flex-1 border-0 bg-background"
            sandbox=""
            referrerPolicy="no-referrer"
          />
        </aside>
      ) : null}
    </div>
  )
}
