import * as React from "react"

import {
  UploadConflictDialog,
  type UploadConflictChoice,
  type UploadConflictInfo,
} from "@/components/file-area/UploadConflictDialog"
import { createId, type AuthSession, type BucketMount, type FileNode, type OfflineTask, type UploadQueueItem } from "@/lib/models"
import { createUploadApiScheduler } from "@/lib/upload/api-scheduler"
import { createGate } from "@/lib/upload/gate"
import { FILE_LIMIT, NETWORK_LIMIT, takeUploads } from "@/lib/upload/pool"
import { useUploadRun } from "@/lib/upload/run"
import { toast } from "sonner"

export type UploadSelection = {
  file: File
  relativePath?: string
}

type UploadTarget = {
  mountId: string
  parentId: string | null
}

export type UploadStateValue = {
  offlineTasks: OfflineTask[]
  uploadQueue: UploadQueueItem[]
  uploadQueueOpen: boolean
  setUploadQueueOpen: (open: boolean) => void
  retryUpload: (id: string) => void
  removeUpload: (id: string) => void
  clearCompletedUploads: () => void
  requestUpload: (parentId?: string | null, mountId?: string) => void
  requestFolderUpload: (parentId?: string | null, mountId?: string) => void
  queueUploadFiles: (files: UploadSelection[], parentId?: string | null, mountId?: string) => void
}

const UploadStateContext = React.createContext<UploadStateValue | null>(null)

function nowString() {
  return new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-")
}

export interface UploadProviderProps {
  children: React.ReactNode
  getSession: () => AuthSession | null
  getBuckets: () => BucketMount[]
  getActiveBucketId: () => string
  getNodes: () => FileNode[]
  deleteNodes: (nodeIds: string[], hardDelete?: boolean) => Promise<boolean>
  onUploadComplete: (parentId: string | null, bucketId: string) => void
}

export function UploadProvider({
  children,
  getSession,
  getBuckets,
  getActiveBucketId,
  getNodes,
  deleteNodes,
  onUploadComplete,
}: UploadProviderProps) {
  const getSessionRef = React.useRef(getSession)
  const getBucketsRef = React.useRef(getBuckets)
  const getActiveBucketIdRef = React.useRef(getActiveBucketId)
  const getNodesRef = React.useRef(getNodes)
  const deleteNodesRef = React.useRef(deleteNodes)
  const onUploadCompleteRef = React.useRef(onUploadComplete)

  React.useEffect(() => {
    getSessionRef.current = getSession
    getBucketsRef.current = getBuckets
    getActiveBucketIdRef.current = getActiveBucketId
    getNodesRef.current = getNodes
    deleteNodesRef.current = deleteNodes
    onUploadCompleteRef.current = onUploadComplete
  })

  const [uploadQueue, setUploadQueue] = React.useState<UploadQueueItem[]>([])
  const [uploadQueueOpen, setUploadQueueOpen] = React.useState(false)
  const [uploadConflict, setUploadConflict] = React.useState<UploadConflictInfo | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const folderInputRef = React.useRef<HTMLInputElement | null>(null)
  const pendingUploadTargetRef = React.useRef<UploadTarget | null>(null)
  const uploadControllersRef = React.useRef(new Map<string, AbortController>())
  const uploadCommitIdsRef = React.useRef(new Set<string>())
  const uploadFilesRef = React.useRef(new Map<string, { file: File; target: UploadTarget; relativePath?: string }>())
  const uploadPendingIdsRef = React.useRef<string[]>([])
  const uploadActiveIdsRef = React.useRef(new Set<string>())
  const uploadGateRef = React.useRef(createGate(NETWORK_LIMIT))
  const uploadApiSchedulerRef = React.useRef(createUploadApiScheduler())
  const uploadRefreshTargetsRef = React.useRef(new Map<string, { parentId: string | null; bucketId: string }>())
  const uploadRefreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const drainUploadQueueRef = React.useRef<() => void>(() => undefined)
  const uploadConflictResolverRef = React.useRef<((choice: UploadConflictChoice) => void) | null>(null)

  React.useEffect(() => () => {
    if (uploadRefreshTimerRef.current) clearTimeout(uploadRefreshTimerRef.current)
  }, [])

  const updateUploadQueueItem = React.useCallback((id: string, patch: Partial<UploadQueueItem>) => {
    setUploadQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const scheduleUploadRefresh = React.useCallback((parentId: string | null, bucketId: string) => {
    uploadRefreshTargetsRef.current.set(`${bucketId}:${parentId ?? "root"}`, { parentId, bucketId })
    if (uploadRefreshTimerRef.current) {
      clearTimeout(uploadRefreshTimerRef.current)
    }
    uploadRefreshTimerRef.current = setTimeout(() => {
      uploadRefreshTimerRef.current = undefined
      const targets = [...uploadRefreshTargetsRef.current.values()]
      uploadRefreshTargetsRef.current.clear()
      void Promise.allSettled(
        targets.flatMap((target) => [
          onUploadCompleteRef.current(target.parentId, target.bucketId),
        ])
      )
    }, 1_500)
  }, [])

  const processUploadItem = useUploadRun({
    getSessionRef,
    getBucketsRef,
    uploadFilesRef,
    uploadControllersRef,
    uploadCommitIdsRef,
    uploadGateRef,
    uploadApiSchedulerRef,
    scheduleUploadRefresh,
    updateUploadQueueItem,
  })

  const drainUploadQueue = React.useCallback(() => {
    const nextIds = takeUploads(uploadPendingIdsRef.current, uploadActiveIdsRef.current, FILE_LIMIT)
    for (const nextId of nextIds) {
      uploadActiveIdsRef.current.add(nextId)
      void processUploadItem(nextId).finally(() => {
        uploadActiveIdsRef.current.delete(nextId)
        drainUploadQueueRef.current()
      })
    }
  }, [processUploadItem])

  drainUploadQueueRef.current = drainUploadQueue

  const enqueueUploads = React.useCallback((ids: string[]) => {
    for (const id of ids) {
      if (!uploadPendingIdsRef.current.includes(id) && !uploadActiveIdsRef.current.has(id)) {
        uploadPendingIdsRef.current.push(id)
      }
    }
    drainUploadQueue()
  }, [drainUploadQueue])

  const requestUpload = React.useCallback((parentId: string | null = null, mountId?: string) => {
    const session = getSessionRef.current()
    const targetMountId = mountId ?? getActiveBucketIdRef.current()
    if (!session || !targetMountId) {
      toast.error("当前没有可用的上传目标")
      return
    }
    if (getBucketsRef.current().find((bucket) => bucket.id === targetMountId)?.readOnly) {
      toast.info("当前挂载为只读，不能上传文件")
      return
    }

    pendingUploadTargetRef.current = {
      mountId: targetMountId,
      parentId,
    }
    fileInputRef.current?.click()
  }, [])

  const requestFolderUpload = React.useCallback((parentId: string | null = null, mountId?: string) => {
    const session = getSessionRef.current()
    const targetMountId = mountId ?? getActiveBucketIdRef.current()
    if (!session || !targetMountId) {
      toast.error("当前没有可用的上传目标")
      return
    }
    if (getBucketsRef.current().find((bucket) => bucket.id === targetMountId)?.readOnly) {
      toast.info("当前挂载为只读，不能上传文件夹")
      return
    }

    pendingUploadTargetRef.current = {
      mountId: targetMountId,
      parentId,
    }
    folderInputRef.current?.click()
  }, [])

  const askUploadConflict = React.useCallback((conflict: UploadConflictInfo) => {
    return new Promise<UploadConflictChoice>((resolve) => {
      uploadConflictResolverRef.current = resolve
      setUploadConflict(conflict)
    })
  }, [])

  const resolveUploadConflict = React.useCallback((choice: UploadConflictChoice) => {
    const resolve = uploadConflictResolverRef.current
    uploadConflictResolverRef.current = null
    setUploadConflict(null)
    resolve?.(choice)
  }, [])

  const queueUploadFiles = React.useCallback(async (
    selections: UploadSelection[],
    parentId: string | null = null,
    mountId?: string
  ) => {
    const targetMountId = mountId ?? getActiveBucketIdRef.current()
    const bucket = getBucketsRef.current().find((item) => item.id === targetMountId)
    if (!getSessionRef.current() || !targetMountId || !bucket) {
      toast.error("当前没有可用的上传目标")
      return
    }
    if (bucket.readOnly) {
      toast.info("当前挂载为只读，不能上传文件")
      return
    }
    const target = { mountId: targetMountId, parentId }
    const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
    const siblings = getNodesRef.current().filter(
      (node) => node.bucketId === bucket.id && node.parentId === uiParentId && !node.deletedAt
    )
    let resolvedSelections = [...selections]
    const topNames = Array.from(new Set(selections.map(({ file, relativePath }) => relativePath?.split("/")[0] || file.name)))
    const reservedNames = new Set(siblings.map((node) => node.name))

    for (const topName of topNames) {
      const existing = siblings.find((node) => node.name === topName)
      if (!existing) continue
      const grouped = resolvedSelections.filter(
        ({ file, relativePath }) => (relativePath?.split("/")[0] || file.name) === topName
      )
      if (!grouped.length) continue
      const folder = grouped.some(({ relativePath }) => Boolean(relativePath?.includes("/")))
      const choice = await askUploadConflict({
        name: topName,
        kind: folder ? "folder" : existing.kind,
        existingSize: existing.size,
        existingModified: existing.updatedAt,
        incomingSize: grouped.reduce((sum, item) => sum + item.file.size, 0),
        incomingModified: Math.max(...grouped.map((item) => item.file.lastModified || 0)),
        incomingCount: grouped.length,
      })
      if (choice === "skip") {
        resolvedSelections = resolvedSelections.filter(
          ({ file, relativePath }) => (relativePath?.split("/")[0] || file.name) !== topName
        )
        continue
      }
      if (choice === "replace") {
        const deleted = await deleteNodesRef.current([existing.id], true)
        if (!deleted) return
        reservedNames.delete(topName)
        continue
      }

      const dot = folder ? -1 : topName.lastIndexOf(".")
      const stem = dot > 0 ? topName.slice(0, dot) : topName
      const suffix = dot > 0 ? topName.slice(dot) : ""
      let counter = 2
      let renamed = `${stem} (${counter})${suffix}`
      while (reservedNames.has(renamed)) {
        counter += 1
        renamed = `${stem} (${counter})${suffix}`
      }
      reservedNames.add(renamed)
      resolvedSelections = resolvedSelections.map(({ file, relativePath }) => {
        const currentTop = relativePath?.split("/")[0] || file.name
        if (currentTop !== topName) return { file, relativePath }
        if (relativePath) {
          const parts = relativePath.split("/")
          parts[0] = renamed
          return { file, relativePath: parts.join("/") }
        }
        return {
          file: new File([file], renamed, { type: file.type, lastModified: file.lastModified }),
        }
      })
    }

    const uniqueSelections: UploadSelection[] = []
    const directFiles = new Map<string, UploadSelection>()
    for (const selection of resolvedSelections) {
      if (selection.relativePath) {
        uniqueSelections.push(selection)
        continue
      }
      const previous = directFiles.get(selection.file.name)
      if (!previous) {
        directFiles.set(selection.file.name, selection)
        uniqueSelections.push(selection)
        continue
      }
      const choice = await askUploadConflict({
        name: selection.file.name,
        kind: "file",
        existingSize: previous.file.size,
        existingModified: new Date(previous.file.lastModified).toISOString(),
        incomingSize: selection.file.size,
        incomingModified: selection.file.lastModified,
        incomingCount: 1,
      })
      if (choice === "skip") continue
      if (choice === "replace") {
        const index = uniqueSelections.indexOf(previous)
        if (index >= 0) uniqueSelections.splice(index, 1, selection)
        directFiles.set(selection.file.name, selection)
        continue
      }
      const dot = selection.file.name.lastIndexOf(".")
      const stem = dot > 0 ? selection.file.name.slice(0, dot) : selection.file.name
      const suffix = dot > 0 ? selection.file.name.slice(dot) : ""
      let counter = 2
      let renamed = `${stem} (${counter})${suffix}`
      while (reservedNames.has(renamed) || directFiles.has(renamed)) {
        counter += 1
        renamed = `${stem} (${counter})${suffix}`
      }
      const renamedSelection = {
        file: new File([selection.file], renamed, {
          type: selection.file.type,
          lastModified: selection.file.lastModified,
        }),
      }
      directFiles.set(renamed, renamedSelection)
      uniqueSelections.push(renamedSelection)
    }
    resolvedSelections = uniqueSelections

    const nextItems = resolvedSelections.map<UploadQueueItem>(({ file, relativePath }) => {
      const id = createId("upload")
      uploadFilesRef.current.set(id, { file, target, relativePath })
      return {
        id,
        fileName: file.name,
        relativePath,
        fileSize: file.size,
        mountId: target.mountId,
        parentId: target.parentId,
        status: "pending",
        progress: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        speedText: "准备中...",
        speedBytesPerSecond: 0,
        createdAt: nowString(),
      }
    })
    if (!nextItems.length) return
    setUploadQueue((current) => [...nextItems, ...current])
    setUploadQueueOpen(true)
    enqueueUploads(nextItems.map((item) => item.id))
  }, [askUploadConflict, enqueueUploads])

  const handleFileInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>, isFolder: boolean) => {
    const target = pendingUploadTargetRef.current
    const files: File[] = event.target.files ? Array.from(event.target.files as ArrayLike<File>) : []
    event.target.value = ""

    if (!target || files.length === 0) {
      return
    }

    void queueUploadFiles(
      files.map((file) => ({
        file,
        relativePath: isFolder && file.webkitRelativePath ? file.webkitRelativePath : undefined,
      })),
      target.parentId,
      target.mountId
    )
  }, [queueUploadFiles])

  const retryUpload = React.useCallback((id: string) => {
    if (!uploadFilesRef.current.get(id)) {
      return
    }

    updateUploadQueueItem(id, {
      status: "pending",
      progress: 0,
      uploadedBytes: 0,
      expiresAt: undefined,
      speedBytesPerSecond: 0,
      partSizeBytes: undefined,
      partCount: undefined,
      speedText: "准备中...",
      errorMessage: undefined,
    })
    enqueueUploads([id])
  }, [enqueueUploads, updateUploadQueueItem])

  const removeUpload = React.useCallback((id: string) => {
    if (uploadCommitIdsRef.current.has(id)) return
    const controller = uploadControllersRef.current.get(id)
    if (controller) {
      controller.abort()
      return
    }

    uploadPendingIdsRef.current = uploadPendingIdsRef.current.filter((pendingId) => pendingId !== id)
    uploadFilesRef.current.delete(id)
    setUploadQueue((current) => current.filter((item) => item.id !== id))
  }, [])

  const clearCompletedUploads = React.useCallback(() => {
    setUploadQueue((current) =>
      current.filter((item) => !["completed", "failed", "canceled"].includes(item.status))
    )
  }, [])

  const offlineTasks = React.useMemo<OfflineTask[]>(
    () =>
      uploadQueue.map((item) => ({
        id: item.id,
        name: item.fileName,
        url: "",
        status:
          item.status === "completed"
            ? "已完成"
            : item.status === "failed"
              ? "失败"
              : item.status === "canceled"
                ? "已取消"
                : item.status === "processing"
                  ? "处理中"
                  : "上传中",
        progress: Math.round(item.progress),
        updatedAt: item.createdAt,
      })),
    [uploadQueue]
  )

  const value = React.useMemo<UploadStateValue>(
    () => ({
      offlineTasks,
      uploadQueue,
      uploadQueueOpen,
      setUploadQueueOpen,
      retryUpload,
      removeUpload,
      clearCompletedUploads,
      requestUpload,
      requestFolderUpload,
      queueUploadFiles,
    }),
    [
      clearCompletedUploads,
      offlineTasks,
      removeUpload,
      requestFolderUpload,
      requestUpload,
      retryUpload,
      queueUploadFiles,
      uploadQueue,
      uploadQueueOpen,
    ]
  )

  return (
    <UploadStateContext.Provider value={value}>
      {children}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => handleFileInputChange(event, false)}
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
        className="hidden"
        onChange={(event) => handleFileInputChange(event, true)}
      />
      <UploadConflictDialog conflict={uploadConflict} onResolve={resolveUploadConflict} />
    </UploadStateContext.Provider>
  )
}

export function useUploadState() {
  const context = React.useContext(UploadStateContext)
  if (!context) {
    throw new Error("useUploadState must be used within UploadProvider.")
  }

  return context
}
