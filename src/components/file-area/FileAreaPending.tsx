import type { ViewMode } from "@/lib/models"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

type FileAreaPendingProps = {
  metadataLoaded?: boolean
  folderCount?: number
  fileCount?: number
  pageSize?: number
  viewMode?: ViewMode
  showThumbnail?: boolean
}

export function FileAreaPending(props: FileAreaPendingProps) {
  return (
    <div className="app-panel relative flex flex-1 flex-col overflow-hidden rounded-xl border border-border p-3 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:shadow-none md:p-5">
      <FileAreaPendingContent {...props} />
    </div>
  )
}

export function FileAreaLoading() {
  return (
    <div className="flex min-h-40 flex-1 items-center justify-center" role="status" aria-label="正在读取目录信息">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        <span>Loading...</span>
      </div>
    </div>
  )
}

export function FileAreaPendingContent({
  metadataLoaded = false,
  folderCount = 0,
  fileCount = 0,
  pageSize = 200,
  viewMode = "grid",
  showThumbnail = false,
}: FileAreaPendingProps) {
  if (!metadataLoaded) return <FileAreaLoading />

  const visibleFolderCount = Math.min(folderCount, pageSize)
  const visibleFileCount = Math.min(fileCount, Math.max(0, pageSize - visibleFolderCount))
  if (visibleFolderCount + visibleFileCount === 0) return <FileAreaLoading />

  if (viewMode !== "grid") {
    return (
      <div className="flex flex-col gap-2" role="status" aria-label="正在读取目录内容">
        {Array.from({ length: visibleFolderCount + visibleFileCount }, (_, index) => (
          <PendingListRow key={index} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 md:gap-8" role="status" aria-label="正在读取目录内容">
      {visibleFolderCount > 0 ? (
        <PendingSection title="文件夹" count={visibleFolderCount} preview={false} />
      ) : null}
      {visibleFileCount > 0 ? (
        <PendingSection title="文件" count={visibleFileCount} preview={showThumbnail} />
      ) : null}
    </div>
  )
}

function PendingSection({ title, count, preview }: { title: string; count: number; preview: boolean }) {
  return (
    <section aria-label={`${title}正在加载`}>
      <h2 className="mb-2 text-sm font-medium text-foreground sm:mb-3 md:mb-4">{title}</h2>
      <div className="file-section-grid" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          preview ? <PendingPreviewCard key={index} /> : <PendingCompactCard key={index} />
        ))}
      </div>
    </section>
  )
}

function PendingCompactCard() {
  return (
    <div className="flex h-12 items-center gap-3 rounded-xl border border-border bg-card px-3.5 dark:border-white/10 dark:bg-white/5">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  )
}

function PendingPreviewCard() {
  return (
    <div className="flex aspect-square flex-col overflow-hidden rounded-xl border border-border/50 bg-muted" aria-hidden="true">
      <Skeleton className="min-h-0 flex-1 rounded-none" />
      <div className="flex items-center gap-2.5 border-t border-border/50 bg-background px-3 py-2.5">
        <Skeleton className="size-7 shrink-0 rounded-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  )
}

function PendingListRow() {
  return (
    <div className="flex h-12 items-center gap-3 border-b border-border/60 px-3" aria-hidden="true">
      <Skeleton className="size-8 shrink-0 rounded-lg" />
      <Skeleton className="h-3.5 w-1/3" />
      <Skeleton className="ml-auto h-3 w-20" />
    </div>
  )
}
