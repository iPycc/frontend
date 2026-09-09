import type { UploadQueueItem } from "@/lib/models"

const STORAGE_PREFIX = "cloudrave-upload-tasks-v1:"
const MAX_PERSISTED_TASKS = 200

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${encodeURIComponent(userId)}`
}

function isUploadQueueItem(value: unknown): value is UploadQueueItem {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<UploadQueueItem>
  return (
    typeof item.id === "string" &&
    typeof item.fileName === "string" &&
    typeof item.fileSize === "number" &&
    typeof item.mountId === "string" &&
    (typeof item.parentId === "string" || item.parentId === null) &&
    typeof item.createdAt === "string"
  )
}

export function restoreUploadTasks(userId: string): UploadQueueItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) as { version?: number; items?: unknown[] } : null
    if (parsed?.version !== 1 || !Array.isArray(parsed.items)) return []
    return parsed.items.filter(isUploadQueueItem).slice(0, MAX_PERSISTED_TASKS).map((item) => {
      const interrupted = ["pending", "preparing", "uploading", "processing", "paused"].includes(item.status)
      return {
        ...item,
        status: interrupted ? "paused" : item.status,
        speedBytesPerSecond: 0,
        speedText: interrupted ? "任务已恢复，请重新选择原文件继续" : item.speedText,
        errorMessage: interrupted ? undefined : item.errorMessage,
        requiresFileSelection: interrupted || item.status === "failed",
      }
    })
  } catch {
    return []
  }
}

export function persistUploadTasks(userId: string, items: UploadQueueItem[]) {
  if (typeof window === "undefined") return
  try {
    if (!items.length) {
      window.localStorage.removeItem(storageKey(userId))
      return
    }
    window.localStorage.setItem(
      storageKey(userId),
      JSON.stringify({ version: 1, items: items.slice(0, MAX_PERSISTED_TASKS) })
    )
  } catch {
    // Uploading remains functional when storage is unavailable or full.
  }
}
