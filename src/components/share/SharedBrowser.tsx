import {
  IconChevronRight,
  IconDeviceFloppy,
  IconDownload,
  IconEye,
  IconHome,
} from "@tabler/icons-react"

import type { SharedItem, SharedMount } from "@/api/shared"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { SharedViewMode } from "./SharedList"

export function SharedBrowser({
  mount,
  items,
  path,
  loading,
  viewMode,
  formatBytes,
  onRoot,
  onCrumb,
  onOpen,
  onDownload,
  onSave,
}: {
  mount: SharedMount
  items: SharedItem[]
  path: SharedItem[]
  loading: boolean
  viewMode: SharedViewMode
  formatBytes: (bytes: number) => string
  onRoot: () => void
  onCrumb: (index: number) => void
  onOpen: (item: SharedItem) => void
  onDownload: (item: SharedItem) => void
  onSave: (item: SharedItem) => void
}) {
  const ownerName = mount.owner_username ?? `用户 #${mount.owner_id ?? "-"}`
  const folders = items.filter((item) => item.type === "folder")
  const files = items.filter((item) => item.type === "file")

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <Avatar className="size-11">
          {mount.owner_avatar ? <AvatarImage src={mount.owner_avatar} alt={`${ownerName}的头像`} /> : null}
          <AvatarFallback>{ownerName.trim().slice(0, 1).toUpperCase() || "用"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{ownerName} 共享的内容</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            当前目录 {items.length} 项 · 双击打开，文件支持预览、下载和转存
          </p>
        </div>
      </header>

      <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm" aria-label="共享目录路径">
        <button type="button" className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted" onClick={onRoot}>
          <IconHome size={16} />共享根目录
        </button>
        {path.map((item, index) => (
          <span key={item.id} className="flex min-w-0 items-center gap-1">
            <IconChevronRight size={15} className="shrink-0 text-muted-foreground" />
            <button type="button" className="max-w-48 truncate rounded-md px-2 py-1.5 hover:bg-muted" onClick={() => onCrumb(index)}>{item.name}</button>
          </span>
        ))}
      </nav>

      {loading ? (
        <div className="space-y-2" aria-label="正在读取共享目录">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : !items.length ? (
        <EmptyState title="这个文件夹是空的" description="当前目录没有可显示的内容。" />
      ) : viewMode === "grid" ? (
        <div className="space-y-6">
          {folders.length ? (
            <SharedGridSection
              title="文件夹"
              items={folders}
              formatBytes={formatBytes}
              onOpen={onOpen}
              onDownload={onDownload}
              onSave={onSave}
            />
          ) : null}
          {files.length ? (
            <SharedGridSection
              title="文件"
              items={files}
              formatBytes={formatBytes}
              onOpen={onOpen}
              onDownload={onDownload}
              onSave={onSave}
            />
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[minmax(0,1fr)_7rem_8.5rem] gap-3 border-b border-border px-4 py-3 text-xs text-muted-foreground">
            <span>名称</span>
            <span>类型</span>
            <span className="text-right">操作</span>
          </div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="group grid grid-cols-[minmax(0,1fr)_7rem_8.5rem] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/60">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-3 text-left"
                  onDoubleClick={() => onOpen(item)}
                  title="双击打开"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileGlyph item={{ kind: item.type, name: item.name }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.type === "folder" ? "文件夹" : formatBytes(item.size)}
                    </span>
                  </span>
                </button>
                <span className="text-sm text-muted-foreground">{item.type === "folder" ? "文件夹" : "文件"}</span>
                <SharedItemActions item={item} onOpen={onOpen} onDownload={onDownload} onSave={onSave} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!mount.available ? <p className="text-sm text-destructive">{mount.unavailable_reason ?? "原分享已不可用"}</p> : null}
    </div>
  )
}

function SharedGridSection({
  title,
  items,
  formatBytes,
  onOpen,
  onDownload,
  onSave,
}: {
  title: string
  items: SharedItem[]
  formatBytes: (bytes: number) => string
  onOpen: (item: SharedItem) => void
  onDownload: (item: SharedItem) => void
  onSave: (item: SharedItem) => void
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
        {items.map((item) => (
          <div key={item.id} className="group flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              onDoubleClick={() => onOpen(item)}
              title="双击打开"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileGlyph item={{ kind: item.type, name: item.name }} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.type === "folder" ? "文件夹" : formatBytes(item.size)}
                </span>
              </span>
            </button>
            <SharedItemActions item={item} compact onOpen={onOpen} onDownload={onDownload} onSave={onSave} />
          </div>
        ))}
      </div>
    </section>
  )
}

function SharedItemActions({
  item,
  compact = false,
  onOpen,
  onDownload,
  onSave,
}: {
  item: SharedItem
  compact?: boolean
  onOpen: (item: SharedItem) => void
  onDownload: (item: SharedItem) => void
  onSave: (item: SharedItem) => void
}) {
  return (
    <div className={cn("flex justify-end", compact && "shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100")}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={item.type === "folder" ? `打开 ${item.name}` : `预览 ${item.name}`}
        onClick={() => onOpen(item)}
      >
        {item.type === "folder" ? <IconChevronRight size={17} /> : <IconEye size={17} />}
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`转存 ${item.name} 到我的文件`} onClick={() => onSave(item)}>
        <IconDeviceFloppy size={17} />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label={`下载 ${item.name}`} onClick={() => onDownload(item)}>
        <IconDownload size={17} />
      </Button>
    </div>
  )
}
