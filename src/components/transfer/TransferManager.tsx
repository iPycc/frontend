import * as React from "react"
import { toast } from "sonner"
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleAlert,
  Clock3,
  ListX,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  X,
} from "lucide-react"

import { FileGlyph } from "@/components/file-area/FileGlyph"
import type { DownloadTask } from "@/hooks/use-file-download"
import { parseDateTime } from "@/lib/datetime"
import type { FileNode, UploadQueueItem } from "@/lib/models"
import { useUploadState } from "@/lib/upload/provider"
import { cn } from "@/lib/utils"
import { useAppState } from "@/state/app"

type TransferManagerProps = {
  parentId?: string | null
  downloadTask?: DownloadTask | null
  onCancelDownload?: () => void
  onDismissDownload?: () => void
  canUpload?: boolean
  placement?: "content" | "docked" | "floating"
}

type TransferItem = {
  id: string
  direction: "upload" | "download"
  name: string
  status: "pending" | "active" | "paused" | "processing" | "completed" | "failed" | "canceled"
  statusLabel: string
  loaded: number
  total: number | null
  progress: number | null
  speed: number
  detail?: string
  sourceLabel?: string
  storageLabel?: string
  expiresAt?: string
  partSize?: number
  partCount?: number
  filesCompleted?: number
  totalFiles?: number
  upload?: UploadQueueItem
}

function buildQueueFile(fileName: string): FileNode {
  return {
    id: `transfer-${fileName}`,
    backendId: null,
    bucketId: "transfer",
    mountBackendId: 0,
    parentId: null,
    parentBackendId: null,
    kind: "file",
    name: fileName,
    size: 0,
    ext: fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined,
    updatedAt: "",
  }
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value))
}

function getUploadStatus(item: UploadQueueItem): Pick<TransferItem, "status" | "statusLabel"> {
  if (item.status === "failed") return { status: "failed", statusLabel: item.errorMessage || "上传失败" }
  if (item.status === "canceled") return { status: "canceled", statusLabel: "已取消" }
  if (item.status === "completed") {
    return { status: "completed", statusLabel: item.speedText === "秒传完成" ? item.speedText : "上传完成" }
  }
  if (item.status === "processing") return { status: "processing", statusLabel: item.speedText || "正在写入文件" }
  if (item.status === "paused") {
    return {
      status: "paused",
      statusLabel: item.requiresFileSelection ? "请选择原文件以继续" : "已暂停，可继续上传",
    }
  }
  if (item.status === "preparing") {
    return {
      status: "active",
      statusLabel: item.progressStage === "hashing" ? item.speedText || "正在校验文件" : item.speedText || "正在准备",
    }
  }
  if (item.status === "uploading") {
    const phase = item.speedText
    return {
      status: "active",
      statusLabel: phase?.startsWith("待云盘确认") || phase === "等待服务器确认" || phase === "正在获取上传地址"
        ? phase
        : "正在上传",
    }
  }
  return { status: "pending", statusLabel: "等待上传" }
}

function mapUpload(item: UploadQueueItem, storageLabel?: string): TransferItem {
  const total = Math.max(item.totalBytes || item.fileSize || 0, 0)
  const loaded = item.status === "completed" ? total : Math.min(Math.max(item.uploadedBytes || 0, 0), total)
  const relativeDirectory = item.relativePath?.split("/").slice(0, -1).join("/")
  const rootTarget = !item.parentId || item.parentId.startsWith("root:")
  const baseDirectory = item.targetDirectory ?? (rootTarget ? "/" : undefined)
  const detail = baseDirectory && relativeDirectory
    ? `${baseDirectory === "/" ? "" : baseDirectory}/${relativeDirectory}`
    : baseDirectory ?? relativeDirectory
  return {
    id: `upload:${item.id}`,
    direction: "upload",
    name: item.fileName,
    ...getUploadStatus(item),
    loaded,
    total,
    progress: item.status === "completed" ? 100 : clampProgress(item.progress || 0),
    speed: item.speedBytesPerSecond ?? 0,
    detail,
    storageLabel,
    expiresAt: item.expiresAt,
    partSize: item.partSizeBytes,
    partCount: item.partCount,
    upload: item,
  }
}

function getDownloadStatus(task: DownloadTask): Pick<TransferItem, "status" | "statusLabel"> {
  if (task.phase === "complete") return { status: "completed", statusLabel: task.message || "下载完成" }
  if (task.phase === "error") return { status: "failed", statusLabel: task.message || "下载失败" }
  if (task.phase === "choosing") return { status: "pending", statusLabel: task.message || "等待选择保存位置" }
  if (task.phase === "preparing") return { status: "processing", statusLabel: task.message || "正在准备" }
  return { status: "active", statusLabel: "正在下载" }
}

function mapDownload(task: DownloadTask): TransferItem {
  return {
    id: "download:current",
    direction: "download",
    name: task.name,
    ...getDownloadStatus(task),
    loaded: Math.max(task.loaded, 0),
    total: task.total,
    progress: task.total ? clampProgress((task.loaded / task.total) * 100) : task.phase === "complete" ? 100 : null,
    speed: task.speed ?? 0,
    detail: task.currentFile,
    sourceLabel: task.sourceLabel,
    filesCompleted: task.filesCompleted,
    totalFiles: task.totalFiles,
  }
}

function isActive(item: TransferItem) {
  return item.status === "pending" || item.status === "active" || item.status === "processing"
}

function isTerminal(item: TransferItem) {
  return item.status === "completed" || item.status === "failed" || item.status === "canceled"
}

function getSummary(items: TransferItem[]) {
  const active = items.filter(isActive).length
  const failed = items.filter((item) => item.status === "failed").length
  const completed = items.filter((item) => item.status === "completed").length
  const paused = items.filter((item) => item.status === "paused").length
  const uploads = items.filter((item) => item.direction === "upload").length
  const downloads = items.filter((item) => item.direction === "download").length
  const known = items.filter((item) => item.total !== null)
  const total = known.reduce((sum, item) => sum + (item.total ?? 0), 0)
  const loaded = known.reduce(
    (sum, item) => sum + (item.upload?.progressStage === "hashing" ? 0 : Math.min(item.loaded, item.total ?? item.loaded)),
    0
  )
  const fallback = items.length
    ? items.reduce((sum, item) => sum + (item.progress ?? 0), 0) / items.length
    : 0
  const progress = clampProgress(total > 0 ? (loaded / total) * 100 : fallback)
  const speed = items
    .filter((item) => isActive(item) && item.upload?.progressStage !== "hashing")
    .reduce((sum, item) => sum + item.speed, 0)
  const estimating = items.filter((item) => isActive(item) && item.total !== null && item.upload?.progressStage !== "hashing")
  const remaining = estimating.reduce((sum, item) => sum + Math.max((item.total ?? 0) - item.loaded, 0), 0)
  const estimateSpeed = estimating.reduce((sum, item) => sum + item.speed, 0)
  const remainingSeconds = estimateSpeed > 0 ? remaining / estimateSpeed : 0
  return { active, paused, failed, completed, uploads, downloads, progress, speed, total, loaded, remainingSeconds }
}

function statusIcon(item: TransferItem) {
  if (item.status === "completed") return <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
  if (item.status === "failed") return <CircleAlert className="size-3.5 shrink-0 text-destructive" />
  if (item.status === "canceled") return <X className="size-3.5 shrink-0 text-muted-foreground" />
  if (item.status === "paused") return <Pause className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
  if (item.status === "active" || item.status === "processing") {
    return <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" />
  }
  return <Clock3 className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—"
  if (seconds < 60) return `${Math.ceil(seconds)} 秒`
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} 分钟`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.ceil((seconds % 3600) / 60)
  return `${hours} 小时${minutes ? ` ${minutes} 分钟` : ""}`
}

function formatExpiry(value?: string) {
  if (!value) return "—"
  const remaining = (parseDateTime(value)?.getTime() ?? Number.NaN) - Date.now()
  if (!Number.isFinite(remaining)) return "—"
  if (remaining <= 0) return "已过期"
  const minutes = Math.ceil(remaining / 60_000)
  if (minutes < 60) return `${minutes} 分钟后过期`
  const hours = Math.ceil(minutes / 60)
  if (hours < 48) return `${hours} 小时后过期`
  return `${Math.ceil(hours / 24)} 天后过期`
}

function getProgressFillClass(status: "active" | "completed" | "paused" | "failed" | "pending" | "processing" | "canceled", isHeader = false) {
  if (status === "failed") {
    return isHeader
      ? "bg-destructive/[0.15] dark:bg-destructive/[0.22]"
      : "bg-destructive/[0.09] dark:bg-destructive/[0.15]"
  }
  if (status === "paused") {
    return isHeader
      ? "bg-amber-500/[0.15] dark:bg-amber-400/[0.20]"
      : "bg-amber-500/[0.09] dark:bg-amber-400/[0.14]"
  }
  if (status === "completed") {
    return isHeader
      ? "bg-emerald-500/[0.13] dark:bg-emerald-400/[0.18]"
      : "bg-emerald-500/[0.07] dark:bg-emerald-400/[0.12]"
  }
  if (status === "canceled") {
    return "bg-muted/60"
  }
  return isHeader
    ? "bg-primary/[0.16] dark:bg-primary/[0.24]"
    : "bg-primary/[0.10] dark:bg-primary/[0.16]"
}

const iconButtonClass =
  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.07] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-35"

export function TransferManager({
  parentId = null,
  downloadTask = null,
  onCancelDownload,
  onDismissDownload,
  canUpload = true,
  placement = "docked",
}: TransferManagerProps) {
  const { buckets, formatBytes } = useAppState()
  const {
    uploadQueue,
    uploadQueueOpen,
    setUploadQueueOpen,
    retryUpload,
    retryFailedUploads,
    pauseUpload,
    resumeUpload,
    removeUpload,
    clearCompletedUploads,
    requestUpload,
  } = useUploadState()

  const [panelSize, setPanelSize] = React.useState<"normal" | "expanded">(
    placement === "content" ? "expanded" : "normal"
  )
  const [minimized, setMinimized] = React.useState(!uploadQueueOpen)
  const [closed, setClosed] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const previousDownloadRef = React.useRef<Pick<DownloadTask, "name" | "phase"> | null>(null)
  const previousUploadIdsRef = React.useRef<Set<string>>(new Set(uploadQueue.map((item) => item.id)))

  const items = React.useMemo(() => {
    const next = uploadQueue.map((item) =>
      mapUpload(item, buckets.find((bucket) => bucket.id === item.mountId)?.name)
    )
    if (downloadTask) next.unshift(mapDownload(downloadTask))
    return next
  }, [buckets, downloadTask, uploadQueue])

  const summary = React.useMemo(() => getSummary(items), [items])
  const hasTerminal = items.some(isTerminal)
  const canRetryFailed = uploadQueue.filter((item) => item.status === "failed" && !item.requiresFileSelection).length > 1

  // 当外部显式打开队列时，取消关闭和最小化状态
  React.useEffect(() => {
    if (uploadQueueOpen) {
      setClosed(false)
      setMinimized(false)
    }
  }, [uploadQueueOpen])

  // 当有新上传任务加入队列时，自动弹出并展开窗口
  React.useEffect(() => {
    const prevIds = previousUploadIdsRef.current
    const hasNewUpload = uploadQueue.some((item) => !prevIds.has(item.id))
    previousUploadIdsRef.current = new Set(uploadQueue.map((item) => item.id))
    if (hasNewUpload) {
      setClosed(false)
      setMinimized(false)
      setUploadQueueOpen(true)
    }
  }, [uploadQueue, setUploadQueueOpen])

  // 当有新下载任务开始时，自动弹出并展开窗口
  React.useEffect(() => {
    const previous = previousDownloadRef.current
    const isNewDownload =
      Boolean(downloadTask) &&
      (!previous ||
        previous.name !== downloadTask?.name ||
        (["complete", "error"].includes(previous.phase) &&
          ["choosing", "preparing", "downloading"].includes(downloadTask?.phase ?? "")))
    if (isNewDownload) {
      setClosed(false)
      setMinimized(false)
      setUploadQueueOpen(true)
      setPanelSize("normal")
    }
    previousDownloadRef.current = downloadTask ? { name: downloadTask.name, phase: downloadTask.phase } : null
  }, [downloadTask, setUploadQueueOpen])

  // 默认选中第一项或保持当前选中项有效
  React.useEffect(() => {
    if (!items.length) {
      setSelectedId(null)
      return
    }
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id)
    }
  }, [items, selectedId])

  if ((closed || !items.length) && !uploadQueueOpen) return null

  const clearFinished = () => {
    clearCompletedUploads()
    if (downloadTask && ["complete", "error"].includes(downloadTask.phase)) {
      onDismissDownload?.()
    }
  }

  const handleCloseWindow = () => {
    setClosed(!items.some((item) => !isTerminal(item)))
    setMinimized(true)
    setUploadQueueOpen(false)
    if (downloadTask && ["complete", "error"].includes(downloadTask.phase)) {
      onDismissDownload?.()
    }
  }

  const handleToggleMinimize = () => {
    const next = !minimized
    setMinimized(next)
    setUploadQueueOpen(!next)
  }

  let overallStatus: "active" | "failed" | "paused" | "completed" | "canceled" = "completed"
  let summaryTitle = items.length ? "传输已完成" : "传输管理"
  if (items.length && items.every((item) => item.status === "canceled")) { overallStatus = "canceled"; summaryTitle = "传输已取消" }
  if (summary.paused) { overallStatus = "paused"; summaryTitle = "传输已暂停" }
  if (summary.failed) { overallStatus = "failed"; summaryTitle = "传输存在异常" }
  if (summary.active) { overallStatus = "active"; summaryTitle = "正在传输" }

  let summaryIcon = <ArrowUpToLine className="size-4 text-primary" />
  let summaryColor = "bg-muted text-muted-foreground"
  if (overallStatus === "completed" && items.length) { summaryIcon = <Check className="size-4 text-emerald-600 dark:text-emerald-400" />; summaryColor = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" }
  if (overallStatus === "canceled") summaryIcon = <X className="size-4 text-muted-foreground" />
  if (overallStatus === "paused") { summaryIcon = <Pause className="size-4 text-amber-600 dark:text-amber-400" />; summaryColor = "bg-amber-500/15 text-amber-700 dark:text-amber-300" }
  if (overallStatus === "failed") { summaryIcon = <CircleAlert className="size-4 text-destructive" />; summaryColor = "bg-destructive/15 text-destructive" }
  if (overallStatus === "active") { summaryIcon = <LoaderCircle className="size-4 animate-spin text-primary" />; summaryColor = "bg-primary/15 text-primary" }

  const summaryStatsText = (() => {
    if (!items.length) return "暂无活动任务"
    const parts: string[] = []
    if (summary.active) parts.push(`${summary.active} 项进行中`)
    if (summary.paused) parts.push(`${summary.paused} 项已暂停`)
    if (summary.failed) parts.push(`${summary.failed} 项失败`)
    parts.push(`${summary.completed}/${items.length} 完成`)
    if (summary.total > 0) {
      parts.push(`${formatBytes(summary.loaded)} / ${formatBytes(summary.total)}`)
    }
    if (summary.active && summary.speed > 0) {
      parts.push(`${formatBytes(summary.speed)}/s`)
    }
    if (summary.active && summary.remainingSeconds > 0) {
      parts.push(`剩余 ${formatDuration(summary.remainingSeconds)}`)
    }
    return parts.join(" · ")
  })()

  const placementClass =
    placement === "floating"
      ? "fixed right-4 bottom-4 z-50 w-[min(480px,calc(100vw-32px))]"
      : placement === "content"
        ? minimized || panelSize === "normal"
          ? "absolute right-3 bottom-3 z-30 w-[calc(100%_-_24px)] max-w-[480px] sm:right-4 sm:bottom-4 sm:w-[calc(100%_-_32px)]"
          : "absolute inset-y-3 right-3 z-30 w-[calc(100%_-_24px)] max-w-[480px] sm:inset-y-4 sm:right-4 sm:w-[calc(100%_-_32px)]"
        : "relative mb-1 mr-1"

  const panelHeightClass =
    panelSize === "expanded"
      ? placement === "content"
        ? "h-auto min-h-0"
        : "h-[min(620px,65vh)]"
      : "h-[min(400px,48vh)] min-h-64"

  return (
    <section
      className={cn(
        "app-panel z-20 flex shrink-0 self-end flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg transition-all duration-200 ease-out",
        !minimized && panelHeightClass,
        placementClass
      )}
      aria-label={minimized ? "传输管理已收起" : "传输管理"}
    >
      {/* 汇总顶栏：进度条就是整个汇总栏的背景颜色 */}
      <header
        className={cn(
          "relative flex min-h-15 shrink-0 items-center gap-3 overflow-hidden bg-muted/35 px-3.5 py-2.5",
          !minimized && "border-b border-border"
        )}
      >
        {/* 背景进度填充层 */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-300 ease-out",
            getProgressFillClass(overallStatus, true)
          )}
          style={{ width: `${items.length ? summary.progress : 0}%` }}
          aria-hidden="true"
        />

        {/* 左侧汇总状态图标 */}
        <button
          type="button"
          onClick={handleToggleMinimize}
          className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/85 text-foreground ring-1 ring-border/70 transition-colors hover:bg-background"
          aria-label={minimized ? "展开传输列表" : "收起传输列表"}
        >
          {summaryIcon}
        </button>

        {/* 中间汇总信息区（点击可展开/收起） */}
        <button
          type="button"
          onClick={handleToggleMinimize}
          className="relative z-10 min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
        >
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">{summaryTitle}</span>
            {items.length > 0 ? (
              <span
                className={cn(
                  "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  summaryColor
                )}
              >
                {Math.round(summary.progress)}%
              </span>
            ) : null}
            {(summary.uploads > 0 || summary.downloads > 0) && (
              <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">
                {summary.uploads > 0 ? `↑${summary.uploads}` : ""}
                {summary.uploads > 0 && summary.downloads > 0 ? " " : ""}
                {summary.downloads > 0 ? `↓${summary.downloads}` : ""}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {summaryStatsText}
          </p>
        </button>

        {/* 右侧汇总操作按钮：清理、上传、高度切换、收起/展开、关闭窗口 */}
        <div className="relative z-10 flex shrink-0 items-center gap-0.5">
          {hasTerminal ? (
            <button
              className={iconButtonClass}
              type="button"
              onClick={clearFinished}
              aria-label="清理已结束任务"
              title="清理已结束任务"
            >
              <ListX className="size-4" />
            </button>
          ) : null}
          {canUpload ? (
            <button
              className={iconButtonClass}
              type="button"
              onClick={() => requestUpload(parentId)}
              aria-label="添加上传文件"
              title="添加上传文件"
            >
              <Plus className="size-4" />
            </button>
          ) : null}
          {!minimized ? (
            <button
              className={iconButtonClass}
              type="button"
              onClick={() => setPanelSize((current) => (current === "normal" ? "expanded" : "normal"))}
              aria-label={panelSize === "expanded" ? "恢复标准高度" : "展开更高视图"}
              title={panelSize === "expanded" ? "恢复标准高度" : "展开更高视图"}
            >
              {panelSize === "expanded" ? (
                <ChevronsDownUp className="size-4" />
              ) : (
                <ChevronsUpDown className="size-4" />
              )}
            </button>
          ) : null}
          <button
            className={iconButtonClass}
            type="button"
            onClick={handleToggleMinimize}
            aria-label={minimized ? "展开任务列表" : "收起为汇总栏"}
            title={minimized ? "展开任务列表" : "收起为汇总栏"}
          >
            {minimized ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          <button
            className={cn(iconButtonClass, "hover:bg-destructive/12 hover:text-destructive")}
            type="button"
            onClick={handleCloseWindow}
            aria-label="关闭传输窗口"
            title="关闭窗口"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      {/* 任务列表与展开详情 */}
      {!minimized ? (
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto divide-y divide-border/70">
          {canRetryFailed ? (
            <div className="flex justify-end px-3 py-1.5">
              <button
                type="button"
                onClick={retryFailedUploads}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCcw aria-hidden="true" className="size-3.5" />
                重试失败上传
              </button>
            </div>
          ) : null}
          {items.length ? (
            items.map((item) => (
              <TransferRow
                key={item.id}
                item={item}
                selected={selectedId === item.id}
                formatBytes={formatBytes}
                onSelect={() => setSelectedId((current) => (current === item.id ? null : item.id))}
                onRetry={item.upload?.status === "failed" ? () => retryUpload(item.upload!.id) : undefined}
                onPause={
                  item.upload && ["pending", "preparing", "uploading"].includes(item.upload.status)
                    ? () => pauseUpload(item.upload!.id)
                    : undefined
                }
                onResume={item.upload?.status === "paused" ? () => resumeUpload(item.upload!.id) : undefined}
                onRemove={
                  item.direction === "upload"
                    ? () => removeUpload(item.upload!.id)
                    : item.status === "completed" || item.status === "failed"
                      ? onDismissDownload
                      : onCancelDownload
                }
              />
            ))
          ) : (
            <div className="flex h-44 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
              <p>暂无传输任务</p>
              {canUpload ? (
                <button
                  type="button"
                  onClick={() => requestUpload(parentId)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  选择文件上传
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  )
}

function TransferRow({
  item,
  selected,
  formatBytes,
  onSelect,
  onRetry,
  onPause,
  onResume,
  onRemove,
}: {
  item: TransferItem
  selected: boolean
  formatBytes: (value?: number) => string
  onSelect: () => void
  onRetry?: () => void
  onPause?: () => void
  onResume?: () => void
  onRemove?: () => void
}) {
  const progress = item.progress ?? 0
  const terminal = isTerminal(item)
  const indeterminate = item.progress === null && isActive(item)
  const remaining = item.total !== null && item.speed > 0 ? Math.max(item.total - item.loaded, 0) / item.speed : 0
  const transferred =
    item.total !== null
      ? `${formatBytes(item.loaded)} / ${formatBytes(item.total)}`
      : formatBytes(item.loaded)

  return (
    <div
      className={cn(
        "group relative overflow-hidden transition-colors",
        selected ? "bg-accent/35" : "hover:bg-muted/30"
      )}
      style={selected ? undefined : { contentVisibility: "auto", containIntrinsicSize: "66px" }}
    >
      {/* 单项背景颜色即进度条 */}
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-300 ease-out",
          getProgressFillClass(item.status),
          indeterminate && "w-full animate-pulse",
          progress > 0 && progress < 100 && "border-r border-primary/20"
        )}
        style={indeterminate ? undefined : { width: `${progress}%` }}
        aria-hidden="true"
      />

      <div
        role="button"
        tabIndex={0}
        aria-expanded={selected}
        onClick={onSelect}
        onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onSelect()
          }
        }}
        className="relative z-10 cursor-pointer px-3.5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
      >
        <div className="flex items-center gap-3">
          {/* 文件图标与下载方向角标 */}
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/90 ring-1 ring-border/70">
            <FileGlyph item={buildQueueFile(item.name)} size={19} />
            {item.direction === "download" ? (
              <span
                className={cn(
                  "absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-card ring-1 ring-border",
                  item.status === "failed"
                    ? "text-destructive"
                    : item.status === "completed"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-primary"
                )}
              >
                <ArrowDownToLine className="size-2.5" />
              </span>
            ) : null}
          </span>

          {/* 文件名、状态、大小、速率、剩余时间汇总 */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground" title={item.name}>
              {item.name}
            </p>

            <div
              className={cn(
                "mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs",
                item.status === "failed"
                  ? "text-destructive"
                  : item.status === "completed"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
              )}
            >
              {statusIcon(item)}
              <span className="truncate font-medium">{item.statusLabel}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">· {transferred}</span>
              {item.speed > 0 && isActive(item) ? (
                <span className="shrink-0 text-foreground/80 tabular-nums">· {formatBytes(item.speed)}/s</span>
              ) : null}
              {remaining > 0 && isActive(item) ? (
                <span className="shrink-0 text-muted-foreground tabular-nums">· 剩余 {formatDuration(remaining)}</span>
              ) : null}
              {typeof item.totalFiles === "number" ? (
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  · {item.filesCompleted ?? 0}/{item.totalFiles} 个文件
                </span>
              ) : null}
            </div>
          </div>

          <span
            className={cn(
              "shrink-0 text-right text-xs font-semibold tabular-nums",
              item.status === "failed"
                ? "text-destructive"
                : item.status === "completed"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : item.status === "paused"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-foreground/85"
            )}
          >
            {item.progress === null ? "—" : `${Math.round(item.progress)}%`}
          </span>

          {/* 右侧控制按钮与详情展开指示 */}
          <div className="flex shrink-0 items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
            {onResume ? (
              <button
                type="button"
                className={iconButtonClass}
                onClick={onResume}
                aria-label={`继续上传 ${item.name}`}
                title={item.upload?.requiresFileSelection ? "选择原文件并继续" : "继续上传"}
              >
                <Play className="size-3.5 fill-current" />
              </button>
            ) : onPause ? (
              <button
                type="button"
                className={iconButtonClass}
                onClick={onPause}
                aria-label={`暂停上传 ${item.name}`}
                title="暂停上传"
              >
                <Pause className="size-3.5 fill-current" />
              </button>
            ) : onRetry ? (
              <button
                type="button"
                className={iconButtonClass}
                onClick={onRetry}
                aria-label={`重试 ${item.name}`}
                title="重试"
              >
                <RefreshCcw className="size-3.5" />
              </button>
            ) : null}

            {!(item.status === "processing" && item.direction === "upload") && onRemove ? (
              <button
                type="button"
                className={cn(iconButtonClass, "hover:bg-destructive/12 hover:text-destructive")}
                onClick={onRemove}
                aria-label={`${terminal ? "移除" : "取消"} ${item.name}`}
                title={terminal ? "移除记录" : "取消传输"}
              >
                <X className="size-3.5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={onSelect}
              className={cn(iconButtonClass, "size-6 text-muted-foreground/70")}
              aria-label={selected ? "收起详细信息" : "查看详细信息"}
              title={selected ? "收起详细信息" : "查看详细信息"}
            >
              <ChevronDown className={cn("size-3.5 transition-transform duration-200", selected && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* 完整详细信息面板 */}
        {selected ? <TransferDetails item={item} formatBytes={formatBytes} /> : null}
      </div>
    </div>
  )
}

function TransferDetails({
  item,
  formatBytes,
}: {
  item: TransferItem
  formatBytes: (value?: number) => string
}) {
  const remaining = item.total !== null && item.speed > 0 ? Math.max(item.total - item.loaded, 0) / item.speed : 0
  const isHashing = item.upload?.status === "preparing" && item.upload.progressStage === "hashing"
  const sizeText =
    item.total !== null
      ? `${formatBytes(item.total)}${
          item.partCount && item.partSize ? `（${item.partCount} 个分片，每片 ${formatBytes(item.partSize)}）` : ""
        }`
      : "未知"
  const progressText = `${formatBytes(item.loaded)}${item.total !== null ? ` / ${formatBytes(item.total)}` : ""}${
    item.progress !== null ? ` · ${Math.round(item.progress)}%` : ""
  }`
  const requestId = item.status === "failed" ? item.upload?.errorRequestId : undefined
  const copyRequestId = async () => {
    if (!requestId || !navigator.clipboard?.writeText) {
      toast.error("复制不可用，请手动选择错误编号")
      return
    }
    try {
      await navigator.clipboard.writeText(requestId)
      toast.success("已复制错误编号")
    } catch {
      toast.error("复制失败，请手动选择错误编号")
    }
  }

  const rows: Array<[string, React.ReactNode]> =
    item.direction === "upload"
      ? [
          ["文件名", item.name],
          ["任务状态", item.statusLabel],
          ["文件大小", sizeText],
          ["存储策略", item.storageLabel || "当前存储"],
          ["存放位置", item.detail || "—"],
          [isHashing ? "校验进度" : "上传进度", progressText],
          [isHashing ? "校验速度" : "当前速率", item.speed > 0 ? `${formatBytes(item.speed)}/s` : "—"],
          ["预计剩余", remaining > 0 ? formatDuration(remaining) : "—"],
          [
            "断点续传",
            item.upload?.sessionId ? `会话 ${item.upload.sessionId.slice(0, 8)}… 已保存` : "等待创建会话",
          ],
          ["上传签名", formatExpiry(item.expiresAt)],
          ...(requestId ? [["错误编号", <button
            type="button"
            className="max-w-full truncate text-left text-primary hover:underline"
            onClick={() => void copyRequestId()}
            title={requestId}
          >{requestId} · 复制</button>] as [string, React.ReactNode]] : []),
        ]
      : [
          ["文件名", item.name],
          ["任务状态", item.statusLabel],
          ["文件大小", sizeText],
          ["下载来源", item.sourceLabel || "下载服务"],
          ["当前文件", item.detail || "—"],
          ["下载进度", progressText],
          [
            "文件数量",
            typeof item.totalFiles === "number" ? `${item.filesCompleted ?? 0} / ${item.totalFiles}` : "—",
          ],
          ["当前速率", item.speed > 0 ? `${formatBytes(item.speed)}/s` : "—"],
          ["预计剩余", remaining > 0 ? formatDuration(remaining) : "—"],
        ]

  return (
    <div
      className="mt-3 rounded-lg border border-border/70 bg-background/80 px-3.5 py-2.5 backdrop-blur-xs"
      onClick={(event) => event.stopPropagation()}
    >
      <dl className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs leading-5 sm:grid-cols-[5.25rem_minmax(0,1fr)]">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <dd
              className="min-w-0 truncate font-medium text-foreground tabular-nums"
              title={typeof value === "string" ? value : undefined}
            >
              {value}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  )
}
