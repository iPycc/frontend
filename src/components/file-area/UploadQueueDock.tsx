import {
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  ListX,
  LoaderCircle,
  Plus,
  RefreshCcw,
  Upload,
  X,
} from "lucide-react"

import { useAppState } from "@/lib/app-state"
import type { FileNode, UploadQueueItem } from "@/lib/models"
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

function isTerminal(status: UploadQueueItem["status"]) {
  return status === "completed" || status === "failed" || status === "canceled"
}

function progressOf(item: UploadQueueItem) {
  return item.status === "completed" ? 100 : Math.max(0, Math.min(100, item.progress || 0))
}

function statusOf(item: UploadQueueItem) {
  if (item.status === "failed") return item.errorMessage || "上传失败"
  if (item.status === "canceled") return "已取消"
  if (item.status === "completed") return "上传完成"
  if (item.status === "processing") return "正在完成文件处理"
  if (item.status === "preparing") return item.speedText || "正在准备"
  if (item.status === "uploading") return item.speedText || "正在上传"
  return "等待上传"
}

function statusIcon(item: UploadQueueItem) {
  if (item.status === "completed") return <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
  if (item.status === "failed") return <CircleAlert className="size-4 text-destructive" />
  if (item.status === "canceled") return <X className="size-4 text-muted-foreground" />
  if (["preparing", "uploading", "processing"].includes(item.status)) return <LoaderCircle className="size-4 animate-spin text-primary" />
  return <Upload className="size-4 text-muted-foreground" />
}

function getSummary(items: UploadQueueItem[]) {
  const active = items.filter((item) => !isTerminal(item.status)).length
  const failed = items.filter((item) => item.status === "failed").length
  const completed = items.filter((item) => item.status === "completed").length
  const total = items.reduce((sum, item) => sum + Math.max(item.totalBytes || item.fileSize || 0, 0), 0)
  const loaded = items.reduce((sum, item) => {
    const size = Math.max(item.totalBytes || item.fileSize || 0, 0)
    return sum + (item.status === "completed" ? size : Math.min(Math.max(item.uploadedBytes || 0, 0), size))
  }, 0)
  const fallback = items.length ? items.reduce((sum, item) => sum + progressOf(item), 0) / items.length : 0
  const progress = Math.max(0, Math.min(100, total > 0 ? (loaded / total) * 100 : fallback))
  return { active, failed, completed, total, loaded, progress }
}

const iconButton = "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-35"

export function UploadQueueDock({ parentId }: { parentId: string | null }) {
  const {
    uploadQueue,
    uploadQueueOpen,
    setUploadQueueOpen,
    requestUpload,
    retryUpload,
    removeUpload,
    clearCompletedUploads,
    formatBytes,
  } = useAppState()
  const summary = getSummary(uploadQueue)
  const hasTerminal = uploadQueue.some((item) => isTerminal(item.status))

  if (!uploadQueue.length && !uploadQueueOpen) return null

  if (!uploadQueueOpen) {
    return (
      <button
        type="button"
        onClick={() => setUploadQueueOpen(true)}
        className="fixed right-3 bottom-3 z-20 w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-card text-left text-foreground shadow-lg outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/50 sm:right-4 sm:bottom-4"
        aria-label="展开上传任务"
      >
        <span className="relative flex h-13 items-center gap-3 px-4">
          <Upload className="size-[18px] shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{summary.active ? "正在上传" : "上传任务"}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {summary.active ? `${summary.active} 项进行中` : summary.failed ? `${summary.failed} 项失败` : `${summary.completed} 项已完成`}
            </span>
          </span>
          <span className="text-sm font-medium tabular-nums">{Math.round(summary.progress)}%</span>
          <ChevronUp className="size-4 text-muted-foreground" />
          <span className="absolute inset-x-0 bottom-0 h-1 bg-muted">
            <span className="block h-full bg-primary transition-[width] duration-300" style={{ width: `${summary.progress}%` }} />
          </span>
        </span>
      </button>
    )
  }

  return (
    <section
      className="fixed right-3 bottom-3 z-20 flex max-h-[min(500px,calc(100vh-24px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg sm:right-4 sm:bottom-4"
      aria-label="上传任务"
    >
      <header className="relative flex h-13 shrink-0 items-center gap-3 border-b border-border px-4">
        <Upload className="size-[18px] shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">上传任务</h2>
          <p className="truncate text-xs text-muted-foreground" aria-live="polite">
            {summary.active ? `${summary.active} 项进行中` : summary.failed ? `${summary.failed} 项失败` : uploadQueue.length ? "全部任务已结束" : "暂无任务"}
            {summary.total > 0 ? ` · ${formatBytes(summary.loaded)} / ${formatBytes(summary.total)}` : ""}
          </p>
        </div>
        <span className="mr-1 text-sm font-medium tabular-nums">{Math.round(summary.progress)}%</span>
        <button className={iconButton} type="button" onClick={clearCompletedUploads} disabled={!hasTerminal} aria-label="清理已结束任务" title="清理已结束任务"><ListX className="size-4" /></button>
        <button className={iconButton} type="button" onClick={() => requestUpload(parentId)} aria-label="添加上传" title="添加上传"><Plus className="size-[17px]" /></button>
        <button className={iconButton} type="button" onClick={() => setUploadQueueOpen(false)} aria-label="缩小上传任务" title="缩小上传任务"><ChevronDown className="size-[17px]" /></button>
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
          <span className="block h-full bg-primary transition-[width] duration-300" style={{ width: `${summary.progress}%` }} />
        </span>
      </header>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {uploadQueue.length ? uploadQueue.map((item) => {
          const progress = progressOf(item)
          const terminal = isTerminal(item.status)
          return (
            <div key={item.id} className="group relative min-h-16 border-b border-border/70 last:border-b-0">
              <div
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-300",
                  item.status === "completed" ? "bg-emerald-500/[0.06]" : item.status === "failed" ? "bg-destructive/[0.06]" : "bg-primary/[0.06]"
                )}
                style={{ width: `${progress}%` }}
              />
              <div className="relative flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border/70">
                  <FileGlyph item={buildQueueFile(item.fileName)} size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={item.fileName}>{item.fileName}</p>
                  <p className={cn(
                    "mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs",
                    item.status === "failed" ? "text-destructive" : item.status === "completed" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}>
                    {statusIcon(item)}
                    <span className="truncate">{statusOf(item)}</span>
                  </p>
                </div>
                <span className="w-11 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
                <div className="flex w-8 shrink-0 justify-end">
                  {item.status === "failed" ? (
                    <button className={iconButton} type="button" onClick={() => retryUpload(item.id)} aria-label={`重试上传 ${item.fileName}`} title="重试"><RefreshCcw className="size-4" /></button>
                  ) : (
                    <button className={cn(iconButton, "hover:text-destructive")} type="button" onClick={() => removeUpload(item.id)} aria-label={`${terminal ? "移除" : "取消上传"} ${item.fileName}`} title={terminal ? "移除" : "取消上传"}><X className="size-4" /></button>
                  )}
                </div>
              </div>
            </div>
          )
        }) : (
          <div className="flex min-h-44 flex-col items-center justify-center px-6 py-8 text-center">
            <Upload className="size-5 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">暂无上传任务</p>
            <button type="button" onClick={() => requestUpload(parentId)} className="mt-3 text-xs font-medium text-primary hover:underline">添加文件</button>
          </div>
        )}
      </div>
    </section>
  )
}
