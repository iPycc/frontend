import * as React from "react"
import {
  ChevronDown,
  Ellipsis,
  HardDriveUpload,
  House,
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

function getStatusText(item: UploadQueueItem) {
  if (item.status === "failed") return item.errorMessage || "上传失败"
  if (item.status === "canceled") return "已取消"
  if (item.speedText) return item.speedText
  if (item.status === "completed") return "已上传"
  if (item.status === "processing") return "处理中..."
  if (item.status === "preparing") return "准备中..."
  return "等待中..."
}

function getStatusClass(item: UploadQueueItem) {
  if (item.status === "completed") return "text-emerald-600 dark:text-emerald-400"
  if (item.status === "failed") return "text-rose-600 dark:text-rose-400"
  if (item.status === "canceled") return "text-amber-600 dark:text-amber-400"
  if (item.status === "processing") return "text-primary"
  return "text-muted-foreground"
}

function getSessionLabel(expiresAt?: string) {
  if (!expiresAt) {
    return "进行中"
  }

  const expires = new Date(expiresAt).getTime()
  if (Number.isNaN(expires)) {
    return expiresAt
  }

  const diffMs = expires - Date.now()
  if (diffMs <= 0) {
    return "会话已过期"
  }

  const diffMinutes = Math.ceil(diffMs / (1000 * 60))
  if (diffMinutes < 60) {
    return `${Math.max(1, diffMinutes)} 分钟后过期`
  }

  const diffHours = Math.ceil(diffMinutes / 60)
  return `${Math.max(1, diffHours)} 小时后过期`
}

function buildLocationLabel(item: UploadQueueItem, getNodeById: (nodeId: string) => FileNode | undefined) {
  if (!item.parentId || item.parentId.startsWith("root:")) {
    return "我的文件"
  }

  const segments: string[] = []
  let current = getNodeById(item.parentId)

  while (current && !current.isSystemRoot) {
    segments.unshift(current.name)
    current = current.parentId ? getNodeById(current.parentId) : undefined
  }

  return segments.length ? segments.join(" / ") : "我的文件"
}

function getProgressText(item: UploadQueueItem, formatBytes: (size?: number) => string) {
  if (item.status === "completed" || item.status === "failed" || item.status === "canceled") {
    return null
  }

  const totalBytes = item.totalBytes || item.fileSize
  if (item.status === "uploading" && totalBytes > 0) {
    return `${formatBytes(item.uploadedBytes)} / ${formatBytes(totalBytes)} · ${item.progress.toFixed(2)}%`
  }

  if (item.status === "processing") {
    return `${formatBytes(totalBytes)} · 等待服务端完成处理`
  }

  if (item.status === "preparing" || item.status === "pending") {
    return `${formatBytes(totalBytes)}`
  }

  return null
}

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

  const activeItem = React.useMemo(
    () => uploadQueue.find((item) => item.id === activeId) ?? uploadQueue[0] ?? null,
    [activeId, uploadQueue]
  )
  const activeBucket = React.useMemo(
    () => buckets.find((bucket) => bucket.id === activeItem?.mountId),
    [activeItem?.mountId, buckets]
  )
  const hasCompletedItems = React.useMemo(
    () => uploadQueue.some((item) => isTerminalStatus(item.status)),
    [uploadQueue]
  )

  if (!uploadQueue.length && !uploadQueueOpen) {
    return null
  }

  if (!uploadQueueOpen) {
    return (
      <button
        type="button"
        onClick={() => setUploadQueueOpen(true)}
        className="fixed right-4 bottom-4 z-20 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/95 px-4 py-2 text-sm font-medium text-foreground shadow-[0_18px_45px_-22px_hsl(var(--foreground)/0.6)] backdrop-blur-xl transition-colors hover:bg-accent"
      >
        <HardDriveUpload size={16} className="text-primary" />
        <span>上传队列</span>
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
          {uploadQueue.length}
        </span>
      </button>
    )
  }

  return (
    <div className="fixed right-4 bottom-4 z-20 w-[min(500px,calc(100%-1rem))] overflow-hidden rounded-[20px] border border-border/70 bg-card/95 text-foreground shadow-[0_30px_90px_-36px_hsl(var(--foreground)/0.7)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border/70 bg-muted/25 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => setUploadQueueOpen(false)}
            title="关闭队列"
          >
            <X size={18} />
          </button>
          <div className="text-lg font-semibold tracking-tight">上传队列</div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            onClick={clearCompletedUploads}
            title="清理已完成记录"
            disabled={!hasCompletedItems}
          >
            <Ellipsis size={18} />
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => requestUpload(parentId)}
            title="添加上传"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => setUploadQueueOpen(false)}
            title="收起队列"
          >
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      <div className="max-h-[320px] overflow-y-auto border-b border-border/60 bg-background/40">
        {uploadQueue.length ? (
          uploadQueue.map((item) => {
            const file = buildQueueFile(item.fileName)
            const selected = item.id === activeItem?.id
            const progressText = getProgressText(item, formatBytes)

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setActiveId(item.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    setActiveId(item.id)
                  }
                }}
                className={cn(
                  "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-b border-border/60 px-4 py-3 text-left outline-none transition-colors last:border-b-0",
                  selected
                    ? "bg-primary/18 ring-1 ring-inset ring-primary/25 dark:bg-primary/26"
                    : "hover:bg-accent/45"
                )}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                  <FileGlyph item={file} size={20} />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-foreground">{item.fileName}</div>
                  <div className={cn("mt-1 text-sm font-medium", getStatusClass(item))}>{getStatusText(item)}</div>
                  {progressText ? <div className="mt-0.5 text-xs text-muted-foreground">{progressText}</div> : null}
                </div>

                <div className="flex items-center gap-1 pt-0.5">
                  {item.status === "failed" ? (
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                      onClick={(event) => {
                        event.stopPropagation()
                        retryUpload(item.id)
                      }}
                      title="重试上传"
                    >
                      <RefreshCcw size={15} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                    onClick={(event) => {
                      event.stopPropagation()
                      removeUpload(item.id)
                    }}
                    title={item.status === "uploading" || item.status === "processing" ? "取消上传" : "移除记录"}
                  >
                    {item.status === "uploading" || item.status === "processing" ? <X size={15} /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-6 py-8 text-center text-sm text-muted-foreground">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/70">
              <HardDriveUpload size={20} className="text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">当前没有上传任务</div>
              <div className="mt-1">点击右上角的 + 按钮即可继续上传文件。</div>
            </div>
          </div>
        )}
      </div>

      {activeItem ? (
        <div className="space-y-3 bg-card/80 px-5 py-4">
          <dl className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-y-2 text-sm">
            <dt className="font-semibold text-foreground">文件名:</dt>
            <dd className="break-all text-foreground">{activeItem.fileName}</dd>

            <dt className="font-semibold text-foreground">文件大小:</dt>
            <dd className="text-muted-foreground">{formatBytes(activeItem.fileSize || activeItem.totalBytes)}</dd>

            <dt className="font-semibold text-foreground">存储策略:</dt>
            <dd className="text-muted-foreground">{activeBucket?.name ?? "当前挂载"}</dd>

            <dt className="font-semibold text-foreground">存放位置:</dt>
            <dd>
              <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-muted/35 px-3 py-1.5 text-foreground">
                <House size={14} className="shrink-0 text-primary" />
                <span className="truncate">{buildLocationLabel(activeItem, getNodeById)}</span>
              </span>
            </dd>

            <dt className="font-semibold text-foreground">上传会话:</dt>
            <dd className={cn("text-muted-foreground", activeItem.expiresAt ? "text-foreground" : undefined)}>
              {getSessionLabel(activeItem.expiresAt)}
            </dd>
          </dl>
        </div>
      ) : null}
    </div>
  )
}
