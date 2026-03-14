import * as React from "react"

import {
  createId,
  defaultAppSnapshot,
  formatBytes,
  getBucketRoot,
  isVisibleNode,
  type AppSnapshot,
  type BucketMount,
  type FileNode,
  type LoginActivityEntry,
  type OfflineTask,
  type SecurityState,
  type ShareRecord,
  type ThemeMode,
  type UserProfile,
  type UserSettings,
} from "@/lib/mock-data"

const STORAGE_KEY = "cloudrave-app-state-v1"

type BucketWizardInput = {
  provider: string
  bucket: string
  region: string
  endpoint?: string
  basePrefix: string
  secretId: string
  secretKey: string
  multipartThreshold: string
  partSize: string
  presignTtl: string
  concurrency: number
  corsConfigured: boolean
}

type AppStateValue = {
  profile: UserProfile
  settings: UserSettings
  security: SecurityState
  loginActivity: LoginActivityEntry[]
  buckets: BucketMount[]
  activeBucket: BucketMount
  nodes: FileNode[]
  shares: ShareRecord[]
  offlineTasks: OfflineTask[]
  clipboard: AppSnapshot["clipboard"]
  effectiveTheme: Exclude<ThemeMode, "system">
  setThemeMode: (mode: ThemeMode) => void
  updateSettings: (patch: Partial<UserSettings>) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  verifyPassword: (value: string) => boolean
  resetPasswordVerification: () => void
  updateSecurity: (patch: Partial<SecurityState>) => void
  setActiveBucket: (bucketId: string) => void
  renameBucket: (bucketId: string, name: string) => void
  addBucket: (input: BucketWizardInput) => BucketMount
  getNodeById: (nodeId: string) => FileNode | undefined
  getFolderPathId: (path: string, bucketId?: string) => string | null
  getNodesInFolder: (path: string, bucketId?: string) => FileNode[]
  getTreeNodes: (bucketId?: string) => FileNode[]
  getFoldersForBucket: (bucketId?: string, includeRoot?: boolean) => FileNode[]
  getCategoryNodes: (category: "image" | "video" | "audio" | "document", bucketId?: string) => FileNode[]
  getSharedWithMeNodes: () => FileNode[]
  getRecycleNodes: () => FileNode[]
  getShareRecords: () => Array<ShareRecord & { node?: FileNode }>
  createFolder: (parentId: string | null, name: string, bucketId?: string) => FileNode
  createSampleFile: (parentId: string | null, bucketId?: string) => FileNode
  renameNode: (nodeId: string, name: string) => void
  moveNodes: (nodeIds: string[], targetParentId: string | null, bucketId?: string) => void
  duplicateNodes: (nodeIds: string[]) => void
  deleteNodes: (nodeIds: string[]) => void
  restoreNodes: (nodeIds: string[]) => void
  permanentlyDeleteNodes: (nodeIds: string[]) => void
  shareNodes: (nodeIds: string[]) => ShareRecord[]
  copyNodes: (nodeIds: string[]) => void
  cutNodes: (nodeIds: string[]) => void
  pasteNodes: (targetParentId: string | null, bucketId?: string) => void
  addOfflineTask: (url: string) => OfflineTask
  formatBytes: (size?: number) => string
}

const AppStateContext = React.createContext<AppStateValue | null>(null)

function loadSnapshot(): AppSnapshot {
  if (typeof window === "undefined") {
    return defaultAppSnapshot
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return defaultAppSnapshot
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AppSnapshot>
    return {
      ...defaultAppSnapshot,
      ...parsed,
      profile: { ...defaultAppSnapshot.profile, ...parsed.profile },
      settings: { ...defaultAppSnapshot.settings, ...parsed.settings },
      security: { ...defaultAppSnapshot.security, ...parsed.security },
      loginActivity: parsed.loginActivity ?? defaultAppSnapshot.loginActivity,
      buckets: parsed.buckets ?? defaultAppSnapshot.buckets,
      nodes: parsed.nodes ?? defaultAppSnapshot.nodes,
      shares: parsed.shares ?? defaultAppSnapshot.shares,
      offlineTasks: parsed.offlineTasks ?? defaultAppSnapshot.offlineTasks,
      clipboard: parsed.clipboard ?? null,
      activeBucketId: parsed.activeBucketId ?? defaultAppSnapshot.activeBucketId,
    }
  } catch {
    return defaultAppSnapshot
  }
}

function nowString() {
  return new Date().toLocaleString("zh-CN", { hour12: false })
}

function appendCopySuffix(name: string) {
  const dotIndex = name.lastIndexOf(".")
  if (dotIndex <= 0) {
    return `${name} 副本`
  }

  return `${name.slice(0, dotIndex)} 副本${name.slice(dotIndex)}`
}

function cloneNode(node: FileNode, snapshot: AppSnapshot, parentIdMap = new Map<string, string>()): FileNode[] {
  const nextId = createId(node.kind)
  parentIdMap.set(node.id, nextId)

  const nextNode: FileNode = {
    ...node,
    id: nextId,
    name: node.kind === "folder" ? `${node.name} 副本` : appendCopySuffix(node.name),
    parentId: node.parentId ? parentIdMap.get(node.parentId) ?? node.parentId : node.parentId,
    updatedAt: nowString(),
    deletedAt: undefined,
    sharedWithMe: false,
  }

  const children = snapshot.nodes.filter((child) => child.parentId === node.id)
  return [nextNode, ...children.flatMap((child) => cloneNode(child, snapshot, parentIdMap))]
}

function collectNodeIds(snapshot: AppSnapshot, nodeIds: string[]) {
  const queue = [...nodeIds]
  const all = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || all.has(current)) {
      continue
    }

    all.add(current)
    snapshot.nodes.filter((node) => node.parentId === current).forEach((node) => queue.push(node.id))
  }

  return Array.from(all)
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<AppSnapshot>(loadSnapshot)
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }, [snapshot])

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const update = () => setSystemTheme(media.matches ? "dark" : "light")
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const effectiveTheme = snapshot.settings.themeMode === "system" ? systemTheme : snapshot.settings.themeMode

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", effectiveTheme === "dark")
  }, [effectiveTheme])

  const activeBucket = React.useMemo(() => {
    return snapshot.buckets.find((bucket) => bucket.id === snapshot.activeBucketId) ?? snapshot.buckets[0]
  }, [snapshot.activeBucketId, snapshot.buckets])

  const updateSnapshot = React.useCallback((recipe: (current: AppSnapshot) => AppSnapshot) => {
    setSnapshot((current) => recipe(current))
  }, [])

  const getNodeById = React.useCallback((nodeId: string) => snapshot.nodes.find((node) => node.id === nodeId), [snapshot.nodes])

  const getFolderPathId = React.useCallback((path: string, bucketId = snapshot.activeBucketId) => {
    const rootId = getBucketRoot(snapshot, bucketId)
    if (!rootId) {
      return null
    }

    const parts = path.split("/").filter(Boolean)
    let parentId = rootId

    for (const part of parts) {
      const match = snapshot.nodes.find(
        (node) =>
          node.bucketId === bucketId &&
          node.parentId === parentId &&
          node.kind === "folder" &&
          !node.deletedAt &&
          node.name === part
      )

      if (!match) {
        return null
      }

      parentId = match.id
    }

    return parentId
  }, [snapshot])

  const getNodesInFolder = React.useCallback((path: string, bucketId = snapshot.activeBucketId) => {
    const folderId = getFolderPathId(path, bucketId)
    if (!folderId) {
      return []
    }

    return snapshot.nodes.filter(
      (node) => node.bucketId === bucketId && node.parentId === folderId && isVisibleNode(node)
    )
  }, [getFolderPathId, snapshot.activeBucketId, snapshot.nodes])

  const getFoldersForBucket = React.useCallback((bucketId = snapshot.activeBucketId, includeRoot = false) => {
    const rootId = getBucketRoot(snapshot, bucketId)
    return snapshot.nodes.filter((node) => {
      if (node.bucketId !== bucketId || node.kind !== "folder" || node.deletedAt) {
        return false
      }

      if (includeRoot) {
        return true
      }

      return node.id !== rootId
    })
  }, [snapshot])

  const getTreeNodes = React.useCallback((bucketId = snapshot.activeBucketId) => {
    const rootId = getBucketRoot(snapshot, bucketId)
    if (!rootId) {
      return []
    }

    return snapshot.nodes.filter(
      (node) => node.bucketId === bucketId && node.parentId === rootId && node.kind === "folder" && !node.deletedAt
    )
  }, [snapshot])

  const getCategoryNodes = React.useCallback((category: "image" | "video" | "audio" | "document", bucketId = snapshot.activeBucketId) => {
    return snapshot.nodes.filter(
      (node) => node.bucketId === bucketId && node.kind === "file" && node.mediaType === category && isVisibleNode(node)
    )
  }, [snapshot.activeBucketId, snapshot.nodes])

  const getSharedWithMeNodes = React.useCallback(() => snapshot.nodes.filter((node) => node.sharedWithMe && isVisibleNode(node)), [snapshot.nodes])
  const getRecycleNodes = React.useCallback(() => snapshot.nodes.filter((node) => Boolean(node.deletedAt)), [snapshot.nodes])

  const getShareRecords = React.useCallback(() => {
    return snapshot.shares.map((record) => ({
      ...record,
      node: snapshot.nodes.find((node) => node.id === record.nodeId),
    }))
  }, [snapshot.nodes, snapshot.shares])

  const setThemeMode = React.useCallback((mode: ThemeMode) => {
    updateSnapshot((current) => ({
      ...current,
      settings: { ...current.settings, themeMode: mode },
    }))
  }, [updateSnapshot])

  const updateSettings = React.useCallback((patch: Partial<UserSettings>) => {
    updateSnapshot((current) => ({
      ...current,
      settings: { ...current.settings, ...patch },
    }))
  }, [updateSnapshot])

  const updateProfile = React.useCallback((patch: Partial<UserProfile>) => {
    updateSnapshot((current) => ({
      ...current,
      profile: { ...current.profile, ...patch },
    }))
  }, [updateSnapshot])

  const verifyPassword = React.useCallback((value: string) => {
    const passed = value === "cloudrave123"
    if (passed) {
      updateSnapshot((current) => ({
        ...current,
        security: { ...current.security, passwordVerified: true },
      }))
    }

    return passed
  }, [updateSnapshot])

  const resetPasswordVerification = React.useCallback(() => {
    updateSnapshot((current) => ({
      ...current,
      security: { ...current.security, passwordVerified: false },
    }))
  }, [updateSnapshot])

  const updateSecurity = React.useCallback((patch: Partial<SecurityState>) => {
    updateSnapshot((current) => ({
      ...current,
      security: { ...current.security, ...patch },
    }))
  }, [updateSnapshot])

  const setActiveBucket = React.useCallback((bucketId: string) => {
    updateSnapshot((current) => ({ ...current, activeBucketId: bucketId }))
  }, [updateSnapshot])

  const renameBucket = React.useCallback((bucketId: string, name: string) => {
    updateSnapshot((current) => ({
      ...current,
      buckets: current.buckets.map((bucket) => (bucket.id === bucketId && bucket.canRename ? { ...bucket, name } : bucket)),
    }))
  }, [updateSnapshot])

  const addBucket = React.useCallback((input: BucketWizardInput) => {
    const bucketId = createId("bucket")
    const rootNodeId = createId("root")
    const mount: BucketMount = {
      id: bucketId,
      name: input.bucket,
      provider: input.provider,
      bucket: input.bucket,
      region: input.region,
      endpoint: input.endpoint,
      basePrefix: input.basePrefix,
      secretId: input.secretId,
      secretKey: input.secretKey,
      strategy: {
        multipartThreshold: input.multipartThreshold,
        partSize: input.partSize,
        presignTtl: input.presignTtl,
        concurrency: input.concurrency,
      },
      rootNodeId,
      createdAt: nowString(),
      corsStatus: input.corsConfigured ? "healthy" : "warning",
      corsMessage: input.corsConfigured ? "CORS 配置匹配当前挂载策略" : "发现未配置或不匹配项，建议一键修复",
      isLocal: false,
      canEditConnection: true,
      canDelete: true,
      canRename: true,
    }

    updateSnapshot((current) => ({
      ...current,
      activeBucketId: bucketId,
      buckets: [...current.buckets, mount],
      nodes: [
        ...current.nodes,
        {
          id: rootNodeId,
          bucketId,
          parentId: null,
          kind: "folder",
          name: input.bucket,
          updatedAt: nowString(),
          isSystemRoot: true,
        },
      ],
    }))

    return mount
  }, [updateSnapshot])

  const createFolder = React.useCallback((parentId: string | null, name: string, bucketId = snapshot.activeBucketId) => {
    const rootId = getBucketRoot(snapshot, bucketId)
    const node: FileNode = {
      id: createId("folder"),
      bucketId,
      parentId: parentId ?? rootId,
      kind: "folder",
      name,
      updatedAt: nowString(),
    }

    updateSnapshot((current) => ({
      ...current,
      nodes: [...current.nodes, node],
    }))

    return node
  }, [snapshot, updateSnapshot])

  const createSampleFile = React.useCallback((parentId: string | null, bucketId = snapshot.activeBucketId) => {
    const rootId = getBucketRoot(snapshot, bucketId)
    const node: FileNode = {
      id: createId("file"),
      bucketId,
      parentId: parentId ?? rootId,
      kind: "file",
      name: `新建文档 ${new Date().toLocaleTimeString("zh-CN", { hour12: false })}.md`,
      ext: "md",
      size: 2048,
      mediaType: "document",
      updatedAt: nowString(),
    }

    updateSnapshot((current) => ({
      ...current,
      nodes: [...current.nodes, node],
    }))

    return node
  }, [snapshot, updateSnapshot])

  const renameNode = React.useCallback((nodeId: string, name: string) => {
    updateSnapshot((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? { ...node, name, updatedAt: nowString() } : node)),
    }))
  }, [updateSnapshot])

  const moveNodes = React.useCallback((nodeIds: string[], targetParentId: string | null, bucketId = snapshot.activeBucketId) => {
    const rootId = getBucketRoot(snapshot, bucketId)
    updateSnapshot((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        nodeIds.includes(node.id)
          ? { ...node, parentId: targetParentId ?? rootId, bucketId, updatedAt: nowString() }
          : node
      ),
    }))
  }, [snapshot, updateSnapshot])

  const duplicateNodes = React.useCallback((nodeIds: string[]) => {
    updateSnapshot((current) => {
      const nextNodes = [...current.nodes]
      nodeIds.forEach((nodeId) => {
        const node = current.nodes.find((item) => item.id === nodeId)
        if (node) {
          nextNodes.push(...cloneNode(node, current))
        }
      })

      return {
        ...current,
        nodes: nextNodes,
      }
    })
  }, [updateSnapshot])

  const deleteNodes = React.useCallback((nodeIds: string[]) => {
    updateSnapshot((current) => {
      const allIds = collectNodeIds(current, nodeIds)
      return {
        ...current,
        nodes: current.nodes.map((node) => (allIds.includes(node.id) ? { ...node, deletedAt: nowString() } : node)),
      }
    })
  }, [updateSnapshot])

  const restoreNodes = React.useCallback((nodeIds: string[]) => {
    updateSnapshot((current) => {
      const allIds = collectNodeIds(current, nodeIds)
      return {
        ...current,
        nodes: current.nodes.map((node) => (allIds.includes(node.id) ? { ...node, deletedAt: undefined, updatedAt: nowString() } : node)),
      }
    })
  }, [updateSnapshot])

  const permanentlyDeleteNodes = React.useCallback((nodeIds: string[]) => {
    updateSnapshot((current) => {
      const allIds = collectNodeIds(current, nodeIds)
      return {
        ...current,
        nodes: current.nodes.filter((node) => !allIds.includes(node.id)),
        shares: current.shares.filter((share) => !allIds.includes(share.nodeId)),
      }
    })
  }, [updateSnapshot])

  const shareNodes = React.useCallback((nodeIds: string[]) => {
    const nextRecords = nodeIds.map((nodeId) => ({
      id: createId("share"),
      nodeId,
      access: "公开链接" as const,
      expiresAt: "2026-04-12 23:59",
      createdAt: nowString(),
      views: 0,
      downloads: 0,
    }))

    updateSnapshot((current) => ({
      ...current,
      shares: [...current.shares, ...nextRecords.filter((record) => !current.shares.some((item) => item.nodeId === record.nodeId))],
    }))

    return nextRecords
  }, [updateSnapshot])

  const copyNodes = React.useCallback((nodeIds: string[]) => {
    updateSnapshot((current) => ({
      ...current,
      clipboard: { type: "copy", nodeIds },
    }))
  }, [updateSnapshot])

  const cutNodes = React.useCallback((nodeIds: string[]) => {
    updateSnapshot((current) => ({
      ...current,
      clipboard: { type: "cut", nodeIds },
    }))
  }, [updateSnapshot])

  const pasteNodes = React.useCallback((targetParentId: string | null, bucketId = snapshot.activeBucketId) => {
    if (!snapshot.clipboard) {
      return
    }

    if (snapshot.clipboard.type === "cut") {
      moveNodes(snapshot.clipboard.nodeIds, targetParentId, bucketId)
      updateSnapshot((current) => ({ ...current, clipboard: null }))
      return
    }

    duplicateNodes(snapshot.clipboard.nodeIds)
  }, [duplicateNodes, moveNodes, snapshot.activeBucketId, snapshot.clipboard, updateSnapshot])

  const addOfflineTask = React.useCallback((url: string) => {
    const task: OfflineTask = {
      id: createId("offline"),
      name: url.split("/").pop() || "新建离线任务",
      url,
      status: "队列中",
      progress: 0,
      updatedAt: nowString(),
    }

    updateSnapshot((current) => ({
      ...current,
      offlineTasks: [task, ...current.offlineTasks],
    }))

    return task
  }, [updateSnapshot])

  const value = React.useMemo<AppStateValue>(() => ({
    profile: snapshot.profile,
    settings: snapshot.settings,
    security: snapshot.security,
    loginActivity: snapshot.loginActivity,
    buckets: snapshot.buckets,
    activeBucket,
    nodes: snapshot.nodes,
    shares: snapshot.shares,
    offlineTasks: snapshot.offlineTasks,
    clipboard: snapshot.clipboard,
    effectiveTheme,
    setThemeMode,
    updateSettings,
    updateProfile,
    verifyPassword,
    resetPasswordVerification,
    updateSecurity,
    setActiveBucket,
    renameBucket,
    addBucket,
    getNodeById,
    getFolderPathId,
    getNodesInFolder,
    getTreeNodes,
    getFoldersForBucket,
    getCategoryNodes,
    getSharedWithMeNodes,
    getRecycleNodes,
    getShareRecords,
    createFolder,
    createSampleFile,
    renameNode,
    moveNodes,
    duplicateNodes,
    deleteNodes,
    restoreNodes,
    permanentlyDeleteNodes,
    shareNodes,
    copyNodes,
    cutNodes,
    pasteNodes,
    addOfflineTask,
    formatBytes,
  }), [
    activeBucket,
    addBucket,
    addOfflineTask,
    copyNodes,
    createFolder,
    createSampleFile,
    cutNodes,
    deleteNodes,
    duplicateNodes,
    effectiveTheme,
    getCategoryNodes,
    getFolderPathId,
    getFoldersForBucket,
    getNodeById,
    getNodesInFolder,
    getRecycleNodes,
    getShareRecords,
    getSharedWithMeNodes,
    getTreeNodes,
    moveNodes,
    pasteNodes,
    permanentlyDeleteNodes,
    renameBucket,
    renameNode,
    resetPasswordVerification,
    restoreNodes,
    setActiveBucket,
    setThemeMode,
    shareNodes,
    snapshot.buckets,
    snapshot.clipboard,
    snapshot.loginActivity,
    snapshot.nodes,
    snapshot.offlineTasks,
    snapshot.profile,
    snapshot.security,
    snapshot.settings,
    snapshot.shares,
    updateProfile,
    updateSecurity,
    updateSettings,
    verifyPassword,
  ])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = React.useContext(AppStateContext)
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.")
  }

  return context
}
