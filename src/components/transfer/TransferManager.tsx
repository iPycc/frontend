import * as React from "react"
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  X,
} from "lucide-react"

import { FileGlyph } from "@/components/file-area/FileGlyph"
import type { DownloadTask } from "@/hooks/use-file-download"
import { useAppState } from "@/lib/app-state"
import { useUploadState } from "@/lib/upload/provider"
import type { FileNode, UploadQueueItem } from "@/lib/models"
import { cn } from "@/lib/utils"

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
  status: "pending" | "active" | "processing" | "completed" | "failed" | "canceled"
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
    bucketId: "transfer",
    parentId: null,
    kind: "file",
    name: fileName,
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
  if (item.status === "completed") return { status: "completed", statusLabel: "上传完成" }
  if (item.status === "processing") return { status: "processing", statusLabel: "正在写入文件" }
  if (item.status === "preparing") return { status: "active", statusLabel: "正在准备" }
  if (item.status === "uploading") return { status: "active", statusLabel: "正在上传" }
  return { status: "pending", statusLabel: "等待上传" }
}

function mapUpload(item: UploadQueueItem, storageLabel?: string): TransferItem {
  const total = Math.max(item.totalBytes || item.fileSize || 0, 0)
  const loaded = item.status === "completed" ? total : Math.min(Math.max(item.uploadedBytes || 0, 0), total)
  return {
    id: `upload:${item.id}`,
    direction: "upload",
    name: item.fileName,
    ...getUploadStatus(item),
    loaded,
    total,
    progress: item.status === "completed" ? 100 : clampProgress(item.progress || 0),
    speed: item.speedBytesPerSecond ?? 0,
    detail: item.relativePath || "当前目录",
    storageLabel,
    expiresAt: item.expiresAt,
    partSize: item.partSizeBytes,
    partCount: item.partCount,
    upload: item,
  }
}

function getDownloadStatus(task: DownloadTask): Pick<TransferItem, "status" | "statusLabel"> {
  if (task.phase === "complete") return { status: "completed", statusLabel: "下载完成" }
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
  const uploads = items.filter((item) => item.direction === "upload").length
  const downloads = items.filter((item) => item.direction === "download").length
  const known = items.filter((item) => item.total !== null)
  const total = known.reduce((sum, item) => sum + (item.total ?? 0), 0)
  const loaded = known.reduce((sum, item) => sum + Math.min(item.loaded, item.total ?? item.loaded), 0)
  const fallback = items.length
    ? items.reduce((sum, item) => sum + (item.progress ?? 0), 0) / items.length
    : 0
  const progress = clampProgress(total > 0 ? (loaded / total) * 100 : fallback)
  const speed = items.filter(isActive).reduce((sum, item) => sum + item.speed, 0)
  return { active, failed, completed, uploads, downloads, progress, speed }
}

function statusIcon(item: TransferItem) {
  if (item.status === "completed") return <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
  if (item.status === "failed") return <CircleAlert className="size-3.5 text-destructive" />
  if (item.status === "canceled") return <X className="size-3.5 text-muted-foreground" />
  if (item.status === "active" || item.status === "processing") return <LoaderCircle className="size-3.5 animate-spin text-primary" />
  return <Clock3 className="size-3.5 text-amber-600 dark:text-amber-400" />
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
  const remaining = new Date(value).getTime() - Date.now()
  if (!Number.isFinite(remaining)) return "—"
  if (remaining <= 0) return "已过期"
  const minutes = Math.ceil(remaining / 60_000)
  if (minutes < 60) return `${minutes} 分钟后过期`
  const hours = Math.ceil(minutes / 60)
  if (hours < 48) return `${hours} 小时后过期`
  return `${Math.ceil(hours / 24)} 天后过期`
}

const iconButton = "flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-35"

export function TransferManager({
  parentId = null,
  downloadTask = null,
  onCancelDownload,
  onDismissDownload,
  canUpload = true,
  placement = "docked",
}: TransferManagerProps) {
  const {
    buckets,
    formatBytes,
  } = useAppState()
  const {
    uploadQueue,
    uploadQueueOpen,
    setUploadQueueOpen,
    retryUpload,
    removeUpload,
    clearCompletedUploads,
    requestUpload,
  } = useUploadState()
  const [panelSize, setPanelSize] = React.useState<"normal" | "expanded">(
    placement === "content" ? "expanded" : "normal"
  )
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const previousDownloadRef = React.useRef<Pick<DownloadTask, "name" | "phase"> | null>(null)

  const items = React.useMemo(() => {
    const next = uploadQueue.map((item) => mapUpload(
      item,
      buckets.find((bucket) => bucket.id === item.mountId)?.name
    ))
    if (downloadTask) next.unshift(mapDownload(downloadTask))
    return next
  }, [buckets, downloadTask, uploadQueue])
  const summary = React.useMemo(() => getSummary(items), [items])
  const hasTerminal = items.some(isTerminal)
  const minimized = !uploadQueueOpen

  React.useEffect(() => {
    const previous = previousDownloadRef.current
    const isNewDownload = Boolean(downloadTask) && (
      !previous ||
      previous.name !== downloadTask?.name ||
      (["complete", "error"].includes(previous.phase) && ["choosing", "preparing", "downloading"].includes(downloadTask?.phase ?? ""))
    )
    if (isNewDownload) {
      setUploadQueueOpen(true)
      setPanelSize("normal")
    }
    previousDownloadRef.current = downloadTask ? { name: downloadTask.name, phase: downloadTask.phase } : null
  }, [downloadTask, setUploadQueueOpen])

  React.useEffect(() => {
    if (!items.length) {
      setSelectedId(null)
      return
    }
    if (selectedId && !items.some((item) => item.id === selectedId)) setSelectedId(items[0].id)
  }, [items, selectedId])

  if (!items.length && !uploadQueueOpen) return null

  const clearFinished = () => {
    clearCompletedUploads()
    if (downloadTask && ["complete", "error"].includes(downloadTask.phase)) onDismissDownload?.()
  }

  const placementClass = placement === "floating"
    ? "fixed right-4 bottom-4 z-50 w-[min(500px,calc(100vw-32px))]"
    : placement === "content"
      ? minimized || panelSize === "normal"
        ? "absolute right-3 bottom-3 z-30 w-[calc(100%_-_24px)] max-w-[500px] sm:right-4 sm:bottom-4 sm:w-[calc(100%_-_32px)]"
        : "absolute inset-y-3 right-3 z-30 w-[calc(100%_-_24px)] max-w-[500px] sm:inset-y-4 sm:right-4 sm:w-[calc(100%_-_32px)]"
      : "relative mb-1 mr-1"
  const panelHeightClass = panelSize === "expanded"
    ? placement === "content"
      ? "h-auto min-h-0"
      : "h-[min(620px,62vh)]"
    : "h-[min(360px,44vh)] min-h-64"

  const compactState = summary.active ? "active" : summary.failed ? "failed" : "idle"
  const compactMeta = summary.active
    ? `${summary.active} 项进行中 · ${Math.round(summary.progress)}%${summary.speed > 0 ? ` · ${formatBytes(summary.speed)}/s` : ""}`
    : summary.failed
      ? `${summary.failed} 项失败 · ${items.length} 项任务`
      : `${summary.completed} 项已完成 · ${Math.round(summary.progress)}%`

  if (minimized) {
    return (
      <section
        className={cn(
          "z-20 h-14 shrink-0 self-end overflow-hidden rounded-xl border text-foreground shadow-md transition-colors",
          placementClass,
          compactState === "active" && "border-primary/35 bg-primary/[0.12]",
          compactState === "failed" && "border-destructive/30 bg-destructive/[0.08]",
          compactState === "idle" && "border-border bg-card"
        )}
        aria-label="传输管理已缩小"
      >
        <div className="relative flex h-full items-center gap-3 px-3.5">
          <span className="flex size-8 shrink-0 items-center justify-center text-muted-foreground">
            {summary.active ? <LoaderCircle className="size-[18px] animate-spin text-primary" /> : <ArrowUpToLine className="size-[18px]" />}
          </span>
          <button type="button" onClick={() => setUploadQueueOpen(true)} className="min-w-0 flex-1 text-left outline-none">
            <span className="block truncate text-sm font-semibold">传输管理</span>
            <span className="block truncate text-xs text-muted-foreground">{compactMeta}</span>
          </button>
          <button className={iconButton} type="button" onClick={clearFinished} disabled={!hasTerminal} aria-label="清理已结束任务" title="清理已结束任务"><MoreHorizontal className="size-[18px]" /></button>
          {canUpload ? <button className={iconButton} type="button" onClick={() => requestUpload(parentId)} aria-label="添加上传" title="添加上传"><Plus className="size-[18px]" /></button> : null}
          <button className={iconButton} type="button" onClick={() => setUploadQueueOpen(true)} aria-label="展开传输管理" title="展开"><ChevronUp className="size-[18px]" /></button>
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
            <span
              className={cn("block h-full transition-[width] duration-300", summary.failed ? "bg-destructive" : summary.active ? "bg-primary" : "bg-emerald-500")}
              style={{ width: `${summary.progress}%` }}
            />
          </span>
        </div>
      </section>
    )
  }

  return (
    <section
      className={cn(
        "z-20 flex shrink-0 self-end flex-col overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lg transition-[height,top,bottom] duration-200 ease-out",
        panelHeightClass,
        placementClass
      )}
      aria-label="传输管理"
    >
      <header className="relative flex h-14 shrink-0 items-center gap-2 border-b border-border bg-muted/35 px-3.5">
        <button className={iconButton} type="button" onClick={() => setUploadQueueOpen(false)} aria-label="缩小传输管理" title="缩小"><X className="size-[18px]" /></button>
        <div className="min-w-0 flex-1 pl-0.5">
          <h2 className="truncate text-sm font-semibold">传输管理</h2>
          <p className="truncate text-xs text-muted-foreground" aria-live="polite">
            {summary.active
              ? `${summary.active} 项进行中 · ${Math.round(summary.progress)}%${summary.speed > 0 ? ` · ${formatBytes(summary.speed)}/s` : ""}`
              : `上传 ${summary.uploads} · 下载 ${summary.downloads} · ${summary.completed} 项已完成`}
          </p>
        </div>
        <button className={iconButton} type="button" onClick={clearFinished} disabled={!hasTerminal} aria-label="清理已结束任务" title="清理已结束任务"><MoreHorizontal className="size-[18px]" /></button>
        {canUpload ? <button className={iconButton} type="button" onClick={() => requestUpload(parentId)} aria-label="添加上传" title="添加上传"><Plus className="size-[18px]" /></button> : null}
        <button
          className={iconButton}
          type="button"
          onClick={() => setPanelSize((current) => current === "normal" ? "expanded" : "normal")}
          aria-label={panelSize === "expanded" ? "恢复普通高度" : "展开更多任务"}
          title={panelSize === "expanded" ? "恢复普通高度" : "展开更多任务"}
        >
          {panelSize === "expanded" ? <ChevronDown className="size-[18px]" /> : <ChevronUp className="size-[18px]" />}
        </button>
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
          <span className="block h-full bg-primary transition-[width] duration-300" style={{ width: `${summary.progress}%` }} />
        </span>
      </header>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {items.length ? items.map((item) => (
          <TransferRow
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            formatBytes={formatBytes}
            onSelect={() => setSelectedId((current) => current === item.id ? null : item.id)}
            onRetry={item.upload?.status === "failed" ? () => retryUpload(item.upload!.id) : undefined}
            onRemove={item.direction === "upload"
              ? () => removeUpload(item.upload!.id)
              : item.status === "completed" || item.status === "failed"
                ? onDismissDownload
                : onCancelDownload}
          />
        )) : (
          <div className="px-5 py-8 text-sm text-muted-foreground">
            暂无传输任务
            {canUpload ? <button type="button" onClick={() => requestUpload(parentId)} className="ml-2 font-medium text-primary hover:underline">选择文件</button> : null}
          </div>
        )}
      </div>
    </section>
  )
}

function TransferRow({
  item,
  selected,
  formatBytes,
  onSelect,
  onRetry,
  onRemove,
}: {
  item: TransferItem
  selected: boolean
  formatBytes: (value?: number) => string
  onSelect: () => void
  onRetry?: () => void
  onRemove?: () => void
}) {
  const progress = item.progress ?? 0
  const terminal = isTerminal(item)
  const transferred = item.total !== null
    ? `${formatBytes(item.loaded)} / ${formatBytes(item.total)}`
    : formatBytes(item.loaded)

  return (
    <div
      className={cn("relative border-b border-border/70 last:border-b-0", selected && "bg-muted/20")}
      style={selected ? undefined : { contentVisibility: "auto", containIntrinsicSize: "64px" }}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-300",
          item.status === "completed" ? "bg-emerald-500/[0.07]" : item.status === "failed" ? "bg-destructive/[0.07]" : "bg-primary/[0.09]"
        )}
        style={{ width: `${progress}%` }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-expanded={selected}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            onSelect()
          }
        }}
        className="relative cursor-pointer px-4 outline-none transition-colors hover:bg-muted/25 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
      >
        <div className="flex min-h-16 items-center gap-3">
          <span className="relative flex size-8 shrink-0 items-center justify-center">
            <FileGlyph item={buildQueueFile(item.name)} size={19} />
            <span className="absolute -right-1 -bottom-0.5 text-primary">
              {item.direction === "upload" ? <ArrowUpToLine className="size-3" /> : <ArrowDownToLine className="size-3" />}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
            <p className={cn(
              "mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs",
              item.status === "failed" ? "text-destructive" : item.status === "completed" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )}>
              {statusIcon(item)}
              <span className="truncate">{item.statusLabel}</span>
              <span className="shrink-0 text-muted-foreground">· {transferred}</span>
              {item.speed > 0 && isActive(item) ? <span className="shrink-0 tabular-nums">· {formatBytes(item.speed)}/s</span> : null}
            </p>
          </div>
          <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">
            {item.progress === null ? "—" : `${Math.round(item.progress)}%`}
          </span>
          <div className="flex w-8 shrink-0 justify-end">
            {onRetry ? (
              <button className={iconButton} type="button" onClick={(event) => { event.stopPropagation(); onRetry() }} aria-label={`重试 ${item.name}`} title="重试"><RefreshCcw className="size-4" /></button>
            ) : item.status === "processing" && item.direction === "upload" ? (
              <span className="size-8" aria-hidden="true" />
            ) : onRemove ? (
              <button className={cn(iconButton, "hover:text-destructive")} type="button" onClick={(event) => { event.stopPropagation(); onRemove() }} aria-label={`${terminal ? "移除" : "取消"} ${item.name}`} title={terminal ? "移除" : "取消"}><X className="size-4" /></button>
            ) : null}
          </div>
        </div>

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
  const sizeText = item.total !== null
    ? `${formatBytes(item.total)}${item.partCount && item.partSize ? `（${item.partCount} 个分片，每片 ${formatBytes(item.partSize)}）` : ""}`
    : "未知"
  const progressText = `${formatBytes(item.loaded)}${item.total !== null ? ` / ${formatBytes(item.total)}` : ""}${item.progress !== null ? ` · ${Math.round(item.progress)}%` : ""}`
  const rows: Array<[string, React.ReactNode]> = item.direction === "upload"
    ? [
        ["文件名", item.name],
        ["文件大小", sizeText],
        ["存储策略", item.storageLabel || "当前存储"],
        ["存放位置", item.detail || "当前目录"],
        ["上传进度", progressText],
        ["当前速率", item.speed > 0 ? `${formatBytes(item.speed)}/s` : "—"],
        ["预计剩余", remaining > 0 ? formatDuration(remaining) : "—"],
        ["上传会话", formatExpiry(item.expiresAt)],
      ]
    : [
        ["文件名", item.name],
        ["文件大小", sizeText],
        ["下载来源", item.sourceLabel || "下载服务"],
        ["当前文件", item.detail || "—"],
        ["下载进度", progressText],
        ["文件数量", typeof item.totalFiles === "number" ? `${item.filesCompleted ?? 0} / ${item.totalFiles}` : "—"],
        ["当前速率", item.speed > 0 ? `${formatBytes(item.speed)}/s` : "—"],
        ["预计剩余", remaining > 0 ? formatDuration(remaining) : "—"],
      ]

  return (
    <div className="ml-11 border-t border-border/70 pb-4 pt-3">
      <dl className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs leading-5">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="font-medium text-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-muted-foreground" title={typeof value === "string" ? value : undefined}>{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  )
}
