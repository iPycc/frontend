import * as React from "react"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  Folder,
  HardDriveUpload,
  ListX,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react"

import { useAppState } from "@/lib/app-state"
import { type FileNode, type UploadQueueItem } from "@/lib/models"
import { cn } from "@/lib/utils"
import { FileGlyph } from "./FileGlyph"

function buildQueueFile(fileName: string): FileNode {
  return {
    id: `queue-${fileName}`,
    bucketId: "queue",
    parentId: null,
    kind: "file",
    name: fileName,
    ext: fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined,
    updatedAt: "",
  }
}

function isTerminalStatus(status: UploadQueueItem["status"]) {
  return status === "completed" || status === "failed" || status === "canceled"
}

function getItemProgress(item: UploadQueueItem) {
  if (item.status === "completed") return 100
  return Math.max(0, Math.min(100, item.progress || 0))
}

function getStatusText(item: UploadQueueItem) {
  if (item.status === "failed") return item.errorMessage || "上传失败"
  if (item.status === "canceled") return "已取消"
  if (item.status === "completed") return item.speedText || "上传完成"
  if (item.status === "processing") return "正在完成文件处理"
  if (item.status === "preparing") return item.speedText || "正在准备"
  if (item.status === "uploading") return item.speedText || "上传中"
  return "等待上传"
}

function getStatusClass(item: UploadQueueItem) {
  if (item.status === "completed") return "text-emerald-600 dark:text-emerald-400"
  if (item.status === "failed") return "text-rose-600 dark:text-rose-400"
  if (item.status === "canceled") return "text-amber-600 dark:text-amber-400"
  return "text-muted-foreground"
}

function getProgressClass(item: UploadQueueItem) {
  if (item.status === "completed") return "bg-emerald-500"
  if (item.status === "failed") return "bg-rose-500"
  if (item.status === "canceled") return "bg-amber-500"
  return "bg-primary"
}

function getStatusIcon(item: UploadQueueItem) {
  if (item.status === "completed") {
    return <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
  }
  if (item.status === "failed") {
    return <CircleAlert className="size-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
  }
  if (item.status === "canceled") {
    return <X className="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
  }
  if (item.status === "uploading" || item.status === "processing" || item.status === "preparing") {
    return <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
  }
  return <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
}

function getSessionLabel(expiresAt?: string) {
  if (!expiresAt) return "当前会话"

  const expires = new Date(expiresAt).getTime()
  if (Number.isNaN(expires)) return expiresAt

  const diffMs = expires - Date.now()
  if (diffMs <= 0) return "会话已过期"

  const diffMinutes = Math.ceil(diffMs / (1000 * 60))
  if (diffMinutes < 60) return `${Math.max(1, diffMinutes)} 分钟后过期`

  const diffHours = Math.ceil(diffMinutes / 60)
  return `${Math.max(1, diffHours)} 小时后过期`
}

function buildLocationLabel(item: UploadQueueItem, getNodeById: (nodeId: string) => FileNode | undefined) {
  if (!item.parentId || item.parentId.startsWith("root:")) return "我的文件"

  const segments: string[] = []
  let current = getNodeById(item.parentId)

  while (current && !current.isSystemRoot) {
    segments.unshift(current.name)
    current = current.parentId ? getNodeById(current.parentId) : undefined
  }

  return segments.length ? segments.join(" / ") : "我的文件"
}

function getQueueSummary(items: UploadQueueItem[]) {
  const activeCount = items.filter((item) => !isTerminalStatus(item.status)).length
  const completedCount = items.filter((item) => item.status === "completed").length
  const failedCount = items.filter((item) => item.status === "failed").length
  const canceledCount = items.filter((item) => item.status === "canceled").length
  const totalBytes = items.reduce((total, item) => total + Math.max(item.totalBytes || item.fileSize || 0, 0), 0)
  const uploadedBytes = items.reduce((total, item) => {
    const itemTotal = Math.max(item.totalBytes || item.fileSize || 0, 0)
    if (item.status === "completed") return total + itemTotal
    return total + Math.min(Math.max(item.uploadedBytes || 0, 0), itemTotal)
  }, 0)
  const fallbackProgress = items.length
    ? items.reduce((total, item) => total + getItemProgress(item), 0) / items.length
    : 0
  const progress = Math.round(totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : fallbackProgress)

  let statusText = "暂无上传任务"
  if (activeCount > 0) statusText = `${activeCount} 项正在进行`
  else if (failedCount > 0) statusText = `${failedCount} 项需要处理`
  else if (completedCount > 0 && completedCount + canceledCount === items.length) statusText = "全部任务已结束"

  return {
    activeCount,
    completedCount,
    failedCount,
    totalBytes,
    uploadedBytes,
    progress: Math.max(0, Math.min(100, progress)),
    statusText,
  }
}

const iconButtonClass =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-35"

export function UploadQueueDock({ parentId }: { parentId: string | null }) {
  const {
    buckets,
    getNodeById,
    uploadQueue,
    uploadQueueOpen,
    setUploadQueueOpen,
    requestUpload,
    retryUpload,
    removeUpload,
    clearCompletedUploads,
    formatBytes,
  } = useAppState()
  const [activeId, setActiveId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!uploadQueue.length) {
      setActiveId(null)
      return
    }

    setActiveId((current) => (current && uploadQueue.some((item) => item.id === current) ? current : uploadQueue[0].id))
  }, [uploadQueue])

  const summary = React.useMemo(() => getQueueSummary(uploadQueue), [uploadQueue])
  const activeItem = React.useMemo(
    () => uploadQueue.find((item) => item.id === activeId) ?? uploadQueue[0] ?? null,
    [activeId, uploadQueue]
  )
  const activeBucket = React.useMemo(
    () => buckets.find((bucket) => bucket.id === activeItem?.mountId),
    [activeItem?.mountId, buckets]
  )
  const hasTerminalItems = React.useMemo(
    () => uploadQueue.some((item) => isTerminalStatus(item.status)),
    [uploadQueue]
  )

  if (!uploadQueue.length && !uploadQueueOpen) return null

  if (!uploadQueueOpen) {
    return (
      <button
        type="button"
        onClick={() => setUploadQueueOpen(true)}
        className="fixed right-3 bottom-3 z-20 w-[min(340px,calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-card text-left text-foreground shadow-[0_16px_40px_-24px_rgba(0,0,0,0.5)] outline-none transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_20px_44px_-24px_rgba(0,0,0,0.55)] focus-visible:ring-2 focus-visible:ring-ring/50 sm:right-4 sm:bottom-4"
        aria-label="展开上传队列"
      >
        <span className="flex items-center gap-3 px-3.5 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HardDriveUpload className="size-[18px]" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold">{summary.activeCount ? "正在上传" : "上传队列"}</span>
              <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                {summary.progress}%
              </span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {summary.statusText} · 共 {uploadQueue.length} 项
            </span>
          </span>
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </span>
        <span className="block h-1 bg-muted" aria-hidden="true">
          <span
            className="block h-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${summary.progress}%` }}
          />
        </span>
      </button>
    )
  }

  return (
    <section
      className="fixed right-3 bottom-3 z-20 flex max-h-[min(590px,calc(100vh-24px))] w-[min(440px,calc(100vw-24px))] animate-in flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-[0_24px_64px_-30px_rgba(0,0,0,0.55)] fade-in slide-in-from-bottom-2 duration-200 sm:right-4 sm:bottom-4"
      aria-label="上传队列"
    >
      <header className="shrink-0 px-4 pt-4 pb-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HardDriveUpload className="size-5" aria-hidden="true" />
            {summary.activeCount > 0 ? (
              <span className="absolute right-0.5 bottom-0.5 size-2 rounded-full border-2 border-card bg-primary" />
            ) : null}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold tracking-tight">上传队列</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" aria-live="polite">
              {summary.statusText}
              {summary.failedCount > 0 ? ` · ${summary.failedCount} 项失败` : ""}
            </p>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className={iconButtonClass}
              onClick={clearCompletedUploads}
              title="清理已结束记录"
              aria-label="清理已结束记录"
              disabled={!hasTerminalItems}
            >
              <ListX className="size-[17px]" />
            </button>
            <button
              type="button"
              className={iconButtonClass}
              onClick={() => requestUpload(parentId)}
              title="添加上传"
              aria-label="添加上传"
            >
              <Plus className="size-[18px]" />
            </button>
            <button
              type="button"
              className={iconButtonClass}
              onClick={() => setUploadQueueOpen(false)}
              title="缩小上传队列"
              aria-label="缩小上传队列"
            >
              <ChevronDown className="size-[18px]" />
            </button>
          </div>
        </div>

        {uploadQueue.length ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs">
              <span className="text-muted-foreground">
                总进度
                {summary.totalBytes > 0 ? (
                  <span className="ml-2 text-foreground/70">
                    {formatBytes(summary.uploadedBytes)} / {formatBytes(summary.totalBytes)}
                  </span>
                ) : null}
              </span>
              <span className="font-semibold tabular-nums">{summary.progress}%</span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="全部上传进度"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.progress}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${summary.progress}%` }}
              />
            </div>
          </div>
        ) : null}
      </header>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-border/70">
        {uploadQueue.length ? (
          uploadQueue.map((item) => {
            const file = buildQueueFile(item.fileName)
            const selected = item.id === activeItem?.id
            const progress = getItemProgress(item)
            const showProgress = item.status !== "pending" || progress > 0

            return (
              <div
                key={item.id}
                className={cn(
                  "group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-border/60 px-3 py-3 transition-colors last:border-b-0 sm:px-4",
                  selected ? "bg-muted/45" : "hover:bg-muted/25"
                )}
              >
                <button
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className="flex min-w-0 gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label={`查看 ${item.fileName} 的上传详情`}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border/70">
                    <FileGlyph item={file} size={19} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{item.fileName}</span>
                    <span className={cn("mt-1 flex min-w-0 items-center gap-1.5 text-xs", getStatusClass(item))}>
                      {getStatusIcon(item)}
                      <span className="truncate">{getStatusText(item)}</span>
                    </span>
                    {showProgress ? (
                      <span
                        className="mt-2 block h-1 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label={`${item.fileName} 上传进度`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(progress)}
                      >
                        <span
                          className={cn("block h-full rounded-full transition-[width] duration-300 ease-out", getProgressClass(item))}
                          style={{ width: `${progress}%` }}
                        />
                      </span>
                    ) : null}
                  </span>
                </button>

                <div className="flex items-start gap-0.5">
                  <span className="mr-0.5 min-w-9 pt-1.5 text-right text-xs font-medium tabular-nums text-muted-foreground">
                    {Math.round(progress)}%
                  </span>
                  {item.status === "failed" ? (
                    <button
                      type="button"
                      className={iconButtonClass}
                      onClick={() => retryUpload(item.id)}
                      title="重试上传"
                      aria-label={`重试上传 ${item.fileName}`}
                    >
                      <RefreshCcw className="size-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={cn(iconButtonClass, "hover:text-rose-600 dark:hover:text-rose-400")}
                    onClick={() => removeUpload(item.id)}
                    title={isTerminalStatus(item.status) ? "移除记录" : "取消上传"}
                    aria-label={`${isTerminalStatus(item.status) ? "移除" : "取消上传"} ${item.fileName}`}
                  >
                    {isTerminalStatus(item.status) ? <Trash2 className="size-4" /> : <X className="size-4" />}
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex min-h-52 flex-col items-center justify-center px-6 py-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <HardDriveUpload className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium">暂无上传任务</p>
            <p className="mt-1 text-xs text-muted-foreground">添加文件后，可在这里查看实时进度。</p>
            <button
              type="button"
              onClick={() => requestUpload(parentId)}
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <Plus className="size-3.5" />
              添加文件
            </button>
          </div>
        )}
      </div>

      {activeItem ? (
        <footer className="flex shrink-0 items-center gap-2 border-t border-border/70 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          <Folder className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate" title={buildLocationLabel(activeItem, getNodeById)}>
            {buildLocationLabel(activeItem, getNodeById)}
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="hidden max-w-28 truncate sm:block" title={activeBucket?.name ?? "当前挂载"}>
            {activeBucket?.name ?? "当前挂载"}
          </span>
          <span className="h-3 w-px bg-border" />
          <span className="shrink-0">{getSessionLabel(activeItem.expiresAt)}</span>
        </footer>
      ) : null}
    </section>
  )
}
