import {
  IconAlertTriangle,
  IconCheck,
  IconFileDownload,
  IconFolderDown,
  IconLoader2,
  IconX,
} from "@tabler/icons-react"

import type { DownloadTask } from "@/hooks/use-file-download"
import { cn } from "@/lib/utils"

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`
  return `${(value / 1024 ** 3).toFixed(1)} GB`
}

function getPhaseLabel(task: DownloadTask) {
  if (task.message) return task.message
  if (task.phase === "choosing") return "等待选择保存位置"
  if (task.phase === "preparing") return "正在准备文件"
  if (task.phase === "downloading") return "正在保存"
  if (task.phase === "complete") return "下载完成"
  return "下载失败"
}

export function DownloadTaskPanel({
  task,
  onCancel,
  onDismiss,
}: {
  task: DownloadTask | null
  onCancel: () => void
  onDismiss: () => void
}) {
  if (!task) return null

  const active = task.phase === "choosing" || task.phase === "preparing" || task.phase === "downloading"
  const progress = task.total ? Math.min(100, (task.loaded / task.total) * 100) : null
  const isDirectory = typeof task.totalFiles === "number"

  return (
    <aside
      className="fixed right-3 bottom-3 z-50 w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg sm:right-4 sm:bottom-4"
      aria-live="polite"
      aria-label="下载任务"
    >
      <header className="flex h-12 items-center border-b border-border px-4">
        <h2 className="min-w-0 flex-1 text-sm font-semibold">下载任务</h2>
        <span className={cn(
          "mr-2 text-xs",
          task.phase === "complete" ? "text-emerald-600 dark:text-emerald-400" :
            task.phase === "error" ? "text-destructive" : "text-muted-foreground"
        )}>
          {getPhaseLabel(task)}
        </span>
        <button
          type="button"
          onClick={active ? onCancel : onDismiss}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label={active ? "取消下载" : "关闭下载任务"}
        >
          <IconX size={17} />
        </button>
      </header>

      <div className="relative px-4 py-3.5">
        <div className="flex items-start gap-3">
          <span className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            task.phase === "complete" && "text-emerald-600 dark:text-emerald-400",
            task.phase === "error" && "text-destructive"
          )}>
            {task.phase === "complete" ? <IconCheck size={19} /> :
              task.phase === "error" ? <IconAlertTriangle size={19} /> :
                active && task.phase !== "choosing" ? <IconLoader2 size={18} className="animate-spin" /> :
                  isDirectory ? <IconFolderDown size={19} /> : <IconFileDownload size={19} />}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={task.name}>{task.name}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground" title={task.currentFile}>
                  {task.currentFile || task.sourceLabel || getPhaseLabel(task)}
                </p>
              </div>
              {progress !== null ? (
                <span className="shrink-0 text-sm font-medium tabular-nums">{Math.round(progress)}%</span>
              ) : null}
            </div>

            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="下载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress === null ? undefined : Math.round(progress)}>
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  task.phase === "complete" ? "bg-emerald-500" : task.phase === "error" ? "bg-destructive" : "bg-primary",
                  progress === null && active && "w-1/3 animate-pulse"
                )}
                style={progress === null ? undefined : { width: `${progress}%` }}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {formatBytes(task.loaded)}{task.total ? ` / ${formatBytes(task.total)}` : ""}
              </span>
              {task.speed && active ? <><span>·</span><span className="tabular-nums">{formatBytes(task.speed)}/s</span></> : null}
              {isDirectory ? <><span>·</span><span>{task.filesCompleted ?? 0} / {task.totalFiles ?? 0} 个文件</span></> : null}
              {task.sourceLabel ? <><span>·</span><span>{task.sourceLabel}</span></> : null}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
