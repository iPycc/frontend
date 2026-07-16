import * as React from "react"

import {
  beginPasskeyLogin as apiBeginPasskeyLogin,
  finishPasskeyLogin as apiFinishPasskeyLogin,
  login as apiLogin,
  logout as apiLogout,
  refreshToken as apiRefreshToken,
  register as apiRegister,
  verifyTwoFactorLogin as apiVerifyTwoFactorLogin,
} from "@/api/auth"
import { configureAuthClient } from "@/api/client"
import {
  createFolder as apiCreateFolder,
  deleteNodes as apiDeleteNodes,
  listNodes,
  listRecycle,
  listUserMounts,
  renameNode as apiRenameNode,
  restoreNodes as apiRestoreNodes,
  type ExplorerMount,
  type ExplorerNode,
} from "@/api/files"
import { checkBackendHealth } from "@/api/system"
import { abortUpload, completeUpload, createUploadSession, recordRemotePart, sha256File, uploadLocalPart } from "@/api/uploads"
import { getCurrentProfile, getLoginActivity, getTwoFactorStatus } from "@/api/user"
import {
  createId,
  defaultAppSnapshot,
  defaultSecurity,
  defaultSettings,
  formatBytes,
  getBucketRoot,
  inferMediaType,
  isVisibleNode,
  type AppSnapshot,
  type AppUser,
  type AuthSession,
  type AuthState,
  type BucketMount,
  type FileNode,
  type LoginActivityEntry,
  type OfflineTask,
  type SecurityState,
  type ShareRecord,
  type ThemeMode,
  type UploadQueueItem,
  type UserProfile,
  type UserSettings,
} from "@/lib/models"
import { emitAuthEvent, isExpired, mergeSessionTokens, subscribeAuthEvents } from "@/lib/session"
import { toast } from "sonner"

const STORAGE_KEY = "cloudrave-app-state-v2"

type AuthRegisterInput = {
  email: string
  password: string
  username: string
}

type AuthResult = {
  success: boolean
  message?: string
  twoFactorToken?: string
  method?: "password" | "passkey"
}

function isPasskeyCanceled(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : ""
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  return (
    name === "AbortError" ||
    name === "NotAllowedError" ||
    message.includes("cancel") ||
    message.includes("aborted") ||
    message.includes("not allowed") ||
    message.includes("timed out")
  )
}

type UploadTarget = {
  mountId: string
  parentId: string | null
}

type AppStateValue = {
  auth: AuthState
  authSession: AuthSession | null
  currentUser: AppUser | null
  isAuthenticated: boolean
  authReady: boolean
  profile: UserProfile
  settings: UserSettings
  security: SecurityState
  loginActivity: LoginActivityEntry[]
  buckets: BucketMount[]
  activeBucket: BucketMount
  nodes: FileNode[]
  shares: ShareRecord[]
  offlineTasks: OfflineTask[]
  uploadQueue: UploadQueueItem[]
  uploadQueueOpen: boolean
  clipboard: AppSnapshot["clipboard"]
  effectiveTheme: Exclude<ThemeMode, "system">
  setThemeMode: (mode: ThemeMode) => void
  updateSettings: (patch: Partial<UserSettings>) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  login: (email: string, password: string) => Promise<AuthResult>
  loginWithPasskey: (emailHint?: string) => Promise<AuthResult>
  verifyTwoFactor: (twoFactorToken: string, code: string, method?: "password" | "passkey") => Promise<AuthResult>
  register: (input: AuthRegisterInput) => Promise<AuthResult>
  logout: () => Promise<void>
  verifyPassword: (value: string) => boolean
  resetPasswordVerification: () => void
  updateSecurity: (patch: Partial<SecurityState>) => void
  setActiveBucket: (bucketId: string) => void
  reloadWorkspace: () => Promise<void>
  requestUpload: (parentId?: string | null, mountId?: string) => void
  requestFolderUpload: (parentId?: string | null, mountId?: string) => void
  setUploadQueueOpen: (open: boolean) => void
  retryUpload: (id: string) => void
  removeUpload: (id: string) => void
  clearCompletedUploads: () => void
  getNodeById: (nodeId: string) => FileNode | undefined
  getFolderPathId: (path: string, bucketId?: string) => string | null
  getNodesInFolder: (path: string, bucketId?: string) => FileNode[]
  getTreeNodes: (bucketId?: string) => FileNode[]
  getFoldersForBucket: (bucketId?: string, includeRoot?: boolean) => FileNode[]
  getCategoryNodes: (category: "image" | "video" | "audio" | "document", bucketId?: string) => FileNode[]
  getSharedWithMeNodes: () => FileNode[]
  getRecycleNodes: () => FileNode[]
  getShareRecords: () => Array<ShareRecord & { node?: FileNode }>
  createFolder: (parentId: string | null, name: string, bucketId?: string) => Promise<FileNode | null>
  renameNode: (nodeId: string, name: string) => Promise<void>
  moveNodes: (nodeIds: string[], targetParentId: string | null, bucketId?: string) => Promise<void>
  duplicateNodes: (nodeIds: string[]) => Promise<void>
  deleteNodes: (nodeIds: string[], hardDelete?: boolean) => Promise<void>
  restoreNodes: (nodeIds: string[]) => Promise<void>
  permanentlyDeleteNodes: (nodeIds: string[]) => Promise<void>
  shareNodes: (nodeIds: string[]) => Promise<ShareRecord[]>
  deleteShares: (shareIds: string[]) => void
  recordShareView: (shareId: string) => void
  recordShareDownload: (shareId: string) => void
  copyNodes: (nodeIds: string[]) => void
  cutNodes: (nodeIds: string[]) => void
  pasteNodes: (targetParentId: string | null, bucketId?: string) => Promise<void>
  formatBytes: (size?: number) => string
  getFileContent: (fileId: string) => string
  updateFileContent: (fileId: string, content: string) => void
}

const AppStateContext = React.createContext<AppStateValue | null>(null)

const EMPTY_BUCKET: BucketMount = {
  id: "",
  name: "我的文件",
  provider: "Local Storage",
  storageType: "local",
  strategy: {
    multipartThreshold: "25 MB",
    partSize: "25 MB",
    presignTtl: "900",
    concurrency: 1,
    protocol: "https",
    pathStyle: false,
    accelerate: false,
  },
  rootNodeId: "root:empty",
  createdAt: "",
  corsStatus: "healthy",
  corsMessage: "",
  advancedMode: false,
  isLocal: true,
  canEditConnection: false,
  canDelete: false,
  canRename: false,
}

function createEmptyProfile(): UserProfile {
  return {
    username: "",
    avatar: "",
    email: "",
    uid: "",
    registeredAt: "",
    group: "",
    homepage: "",
  }
}

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
    const persistedSession = parsed.auth?.session
    return {
      ...defaultAppSnapshot,
      auth: {
        session: persistedSession
          ? {
              user: persistedSession.user,
              tokens: {
                accessToken: "",
                accessExpiresAt: persistedSession.tokens?.accessExpiresAt ?? "",
                refreshExpiresAt: persistedSession.tokens?.refreshExpiresAt ?? "",
              },
            }
          : null,
      },
      settings: {
        ...defaultSettings,
        ...parsed.settings,
      },
      security: {
        ...defaultSecurity,
        passwordUpdatedAt: parsed.security?.passwordUpdatedAt ?? "",
        twoFactorEnabled: parsed.security?.twoFactorEnabled ?? false,
      },
      shares: parsed.shares ?? defaultAppSnapshot.shares,
    }
  } catch {
    return defaultAppSnapshot
  }
}

function nowString() {
  return new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-")
}

function normalizeStorageType(mount: ExplorerMount) {
  const storageType = String(mount.extra?.storage_type ?? "").toLowerCase()
  const providerLabel = String(mount.provider_label ?? mount.extra?.provider_label ?? "").toLowerCase()

  if (storageType === "local" || providerLabel.includes("local")) {
    return "local" as const
  }
  if (storageType === "aliyun" || providerLabel.includes("aliyun")) {
    return "aliyun" as const
  }
  return "tencent" as const
}

function normalizeStorageRoot(value: string) {
  const normalized = value.replace(/\\/g, "/").trim()
  if (!normalized) {
    return ""
  }

  const withLeadingSlash = normalized.startsWith("/") ? normalized : `/${normalized}`
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`
}

function resolveMountStorageRoot(mount: ExplorerMount, storageType: ReturnType<typeof normalizeStorageType>) {
  const configuredRoot = typeof mount.extra?.storage_root === "string" ? normalizeStorageRoot(mount.extra.storage_root) : ""
  if (configuredRoot) {
    return configuredRoot
  }

  if (storageType === "local" && mount.mount_slug) {
    return `/upload/${mount.mount_slug}/`
  }

  if (mount.root_path) {
    return normalizeStorageRoot(mount.root_path)
  }

  return ""
}

function formatDateTime(value?: string | null, timezone?: string) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  try {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date)

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`
  } catch {
    // Fallback to local time if timezone is invalid
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const day = `${date.getDate()}`.padStart(2, "0")
    const hour = `${date.getHours()}`.padStart(2, "0")
    const minute = `${date.getMinutes()}`.padStart(2, "0")
    const second = `${date.getSeconds()}`.padStart(2, "0")
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }
}

function createShareSlug() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  let result = ""
  for (let i = 0; i < 6; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function mapMountToBucket(mount: ExplorerMount, user: AppUser | null, timezone?: string): BucketMount {
  const storageType = normalizeStorageType(mount)
  const extra = mount.extra ?? {}
  const provider = String(mount.provider_label ?? extra.provider_label ?? (storageType === "local" ? "Local Storage" : "Tencent COS"))
  const storageRoot = resolveMountStorageRoot(mount, storageType)
  const systemManaged = Boolean(extra.system_managed)

  return {
    id: String(mount.id),
    backendId: mount.id,
    policyId: mount.policy_id,
    name: mount.name,
    provider,
    providerLabel: provider,
    storageType,
    ownerBackendId: mount.owner_id,
    ownerId: String(mount.owner_id),
    region: typeof extra.region === "string" ? extra.region : undefined,
    endpoint: typeof extra.endpoint === "string" ? extra.endpoint : undefined,
    bucket: typeof extra.bucket_name === "string" ? extra.bucket_name : undefined,
    basePrefix: storageRoot || undefined,
    strategy: {
      multipartThreshold: `${Number(extra.multipart_threshold_mb ?? 25)} MB`,
      partSize: `${Number(extra.part_size_mb ?? 25)} MB`,
      presignTtl: String(extra.presign_ttl_seconds ?? 900),
      concurrency: Number(extra.concurrency ?? 1),
      protocol: "https",
      pathStyle: false,
      accelerate: false,
    },
    rootNodeId: `root:${mount.id}`,
    rootPath: mount.root_path,
    mountSlug: mount.mount_slug,
    createdAt: formatDateTime(mount.created_at, timezone),
    updatedAt: formatDateTime(mount.updated_at, timezone),
    corsStatus: extra.cors_status === "warning" ? "warning" : "healthy",
    corsMessage: storageRoot ? `已绑定目录：${storageRoot}` : "已连接真实存储",
    advancedMode: Boolean(extra.advanced_mode),
    isLocal: storageType === "local",
    canEditConnection: user?.role === "admin" && !systemManaged,
    canDelete: user?.role === "admin" && !systemManaged,
    canRename: user?.role === "admin" && !systemManaged,
    extra,
  }
}

function extractExtension(name: string) {
  const index = name.lastIndexOf(".")
  if (index <= 0 || index === name.length - 1) {
    return undefined
  }
  return name.slice(index + 1).toLowerCase()
}

function mapNodeToFileNode(node: ExplorerNode, bucketId: string, parentId: string | null, timezone?: string): FileNode {
  const mediaType = node.type === "file" ? inferMediaType(node.name, "file") : undefined
  let preview: string | undefined
  if (node.type === "file" && node.blob_path && (mediaType === "image" || mediaType === "video" || mediaType === "audio")) {
    preview = `/api/v1/explorer/preview/${node.id}`
  }
  return {
    id: String(node.id),
    backendId: node.id,
    bucketId,
    mountBackendId: node.mount_id,
    parentId,
    parentBackendId: node.parent_id ?? null,
    kind: node.type,
    name: node.name,
    ext: node.type === "file" ? extractExtension(node.name) : undefined,
    size: node.size,
    updatedAt: formatDateTime(node.updated_at, timezone),
    createdAt: formatDateTime(node.created_at, timezone),
    mediaType,
    preview,
    deletedAt: formatDateTime(node.deleted_at, timezone),
    blobPath: node.blob_path,
  }
}

async function loadMountNodes(token: string, bucket: BucketMount, timezone?: string) {
  const rootNode: FileNode = {
    id: bucket.rootNodeId,
    bucketId: bucket.id,
    parentId: null,
    kind: "folder",
    name: bucket.name,
    updatedAt: bucket.updatedAt || bucket.createdAt,
    createdAt: bucket.createdAt,
    isSystemRoot: true,
  }

  if (!bucket.backendId) {
    return [rootNode]
  }

  const nodes: FileNode[] = [rootNode]
  const queue: Array<{ backendParentId?: number | null; uiParentId: string }> = [{ backendParentId: undefined, uiParentId: rootNode.id }]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      continue
    }

    const children = await listNodes(token, bucket.backendId, current.backendParentId)
    for (const child of children) {
      const mapped = mapNodeToFileNode(child, bucket.id, current.uiParentId, timezone)
      nodes.push(mapped)
      if (mapped.kind === "folder" && mapped.backendId) {
        queue.push({ backendParentId: mapped.backendId, uiParentId: mapped.id })
      }
    }
  }

  return nodes
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<AppSnapshot>(loadSnapshot)
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")
  const [authReady, setAuthReady] = React.useState(false)
  const [uploadQueue, setUploadQueue] = React.useState<UploadQueueItem[]>([])
  const [uploadQueueOpen, setUploadQueueOpen] = React.useState(false)
  const backendHealthNotifiedRef = React.useRef(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)
  const folderInputRef = React.useRef<HTMLInputElement | null>(null)
  const pendingUploadTargetRef = React.useRef<UploadTarget | null>(null)
  const uploadControllersRef = React.useRef(new Map<string, AbortController>())
  const uploadFilesRef = React.useRef(new Map<string, { file: File; target: UploadTarget; relativePath?: string }>())
  const snapshotRef = React.useRef(snapshot)

  React.useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        auth: {
          session: snapshot.auth.session
            ? {
                user: snapshot.auth.session.user,
                tokens: {
                  accessToken: "",
                  accessExpiresAt: snapshot.auth.session.tokens.accessExpiresAt,
                  refreshExpiresAt: snapshot.auth.session.tokens.refreshExpiresAt,
                },
              }
            : null,
        },
        settings: snapshot.settings,
        security: {
          passwordUpdatedAt: snapshot.security.passwordUpdatedAt,
          twoFactorEnabled: snapshot.security.twoFactorEnabled,
        },
        shares: snapshot.shares,
      })
    )
  }, [snapshot.auth, snapshot.security.passwordUpdatedAt, snapshot.security.twoFactorEnabled, snapshot.settings, snapshot.shares])

  React.useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 4000)

    const verifyBackend = async () => {
      try {
        await checkBackendHealth(controller.signal)
      } catch {
        if (controller.signal.aborted || backendHealthNotifiedRef.current) {
          return
        }

        backendHealthNotifiedRef.current = true
        toast.error("后端服务暂时没有响应", {
          description: "请确认 Cloudrave 后端已启动，并检查前端 API 地址配置。",
        })
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    void verifyBackend()

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [])

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

  const authSession = snapshot.auth.session
  const currentUser = authSession?.user ?? null
  const isAuthenticated = Boolean(authSession && currentUser && !isExpired(authSession.tokens.accessExpiresAt))

  const updateSnapshot = React.useCallback((recipe: (current: AppSnapshot) => AppSnapshot) => {
    setSnapshot((current) => recipe(current))
  }, [])

  const hydrateWorkspace = React.useCallback(
    async (session: AuthSession) => {
      const token = session.tokens.accessToken
      const profilePayload = await getCurrentProfile(token)
      const timezone = profilePayload.timezone || snapshotRef.current.settings.timezone
      const [loginActivityEntries, rawMounts, recycleEntries] = await Promise.all([
        getLoginActivity(token, timezone),
        listUserMounts(token),
        listRecycle(token),
      ])

      const nextSession: AuthSession = {
        ...session,
        user: {
          ...session.user,
          username: profilePayload.profile.username,
          email: profilePayload.profile.email,
          avatar: profilePayload.profile.avatar,
          registeredAt: profilePayload.profile.registeredAt,
          group: profilePayload.profile.group,
          twoFactorEnabled: profilePayload.twoFactorEnabled,
        },
      }

      const tz = timezone
      const buckets = rawMounts.map((mount) => mapMountToBucket(mount, nextSession.user, tz))
      const bucketNodeLists = await Promise.all(buckets.map((bucket) => loadMountNodes(token, bucket, tz)))
      const nodesMap = new Map<string, FileNode>()

      for (const list of bucketNodeLists) {
        for (const node of list) {
          nodesMap.set(node.id, node)
        }
      }

      for (const recycledNode of recycleEntries) {
        const mapped = mapNodeToFileNode(
          recycledNode,
          String(recycledNode.mount_id),
          recycledNode.parent_id ? String(recycledNode.parent_id) : `root:${recycledNode.mount_id}`,
          tz
        )
        nodesMap.set(mapped.id, mapped)
      }

      updateSnapshot((current) => ({
        ...current,
        profile: profilePayload.profile,
        settings: {
          ...current.settings,
          timezone,
        },
        security: {
          ...current.security,
          passwordVerified: false,
          passwordUpdatedAt: profilePayload.passwordUpdatedAt,
          twoFactorEnabled: profilePayload.twoFactorEnabled,
          passkeysEnabled: false,
          passkeys: [],
        },
        auth: {
          session: nextSession,
        },
        loginActivity: loginActivityEntries,
        buckets,
        activeBucketId:
          buckets.find((bucket) => bucket.id === current.activeBucketId)?.id ??
          buckets[0]?.id ??
          "",
        nodes: Array.from(nodesMap.values()),
        shares: current.shares,
        fileContents: {},
      }))
    },
    [updateSnapshot]
  )

  const clearWorkspace = React.useCallback(() => {
    updateSnapshot((current) => ({
      ...current,
      profile: createEmptyProfile(),
      security: {
        ...current.security,
        passwordVerified: false,
        passwordUpdatedAt: "",
        passkeysEnabled: false,
        passkeys: [],
        twoFactorEnabled: false,
      },
      auth: {
        session: null,
      },
      loginActivity: [],
      buckets: [],
      activeBucketId: "",
      nodes: [],
      shares: [],
      clipboard: null,
      fileContents: {},
    }))
  }, [updateSnapshot])

  const refreshAuthSession = React.useCallback(
    async (hydrate = false) => {
      const currentSession = snapshotRef.current.auth.session
      const refreshedTokens = await apiRefreshToken()
      let nextSession = currentSession ? mergeSessionTokens(currentSession, refreshedTokens) : null

      if (!nextSession) {
        const profilePayload = await getCurrentProfile(refreshedTokens.accessToken)
        nextSession = {
          user: profilePayload.account,
          tokens: refreshedTokens,
        }
      }

      if (hydrate) {
        await hydrateWorkspace(nextSession)
      } else {
        updateSnapshot((current) => ({
          ...current,
          auth: {
            session: nextSession,
          },
        }))
      }

      return nextSession
    },
    [hydrateWorkspace, updateSnapshot]
  )

  React.useEffect(() => {
    let cancelled = false

    const bootstrapAuth = async () => {
      try {
        await refreshAuthSession(true)
      } catch {
        if (!cancelled) {
          clearWorkspace()
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true)
        }
      }
    }

    void bootstrapAuth()

    return () => {
      cancelled = true
    }
  }, [clearWorkspace, refreshAuthSession])

  React.useEffect(() => {
    return subscribeAuthEvents((message) => {
      if (message.type === "session-updated") {
        void refreshAuthSession(true)
        return
      }

      clearWorkspace()
      setAuthReady(true)
    })
  }, [clearWorkspace, refreshAuthSession])

  React.useEffect(() => {
    configureAuthClient({
      getAccessToken: () => snapshotRef.current.auth.session?.tokens.accessToken ?? null,
      refreshAccessToken: async () => {
        try {
          const session = await refreshAuthSession(false)
          return session.tokens.accessToken
        } catch {
          clearWorkspace()
          emitAuthEvent({ type: "logout", reason: "session-expired" })
          return null
        }
      },
      onAuthFailure: () => {
        clearWorkspace()
        emitAuthEvent({ type: "logout", reason: "session-expired" })
      },
    })

    return () => {
      configureAuthClient({})
    }
  }, [clearWorkspace, refreshAuthSession])

  const reloadWorkspace = React.useCallback(async () => {
    const session = snapshotRef.current.auth.session
    if (!session) {
      return
    }

    await hydrateWorkspace(session)
  }, [hydrateWorkspace])

  const buckets = React.useMemo(() => snapshot.buckets, [snapshot.buckets])

  const activeBucket = React.useMemo(() => {
    return buckets.find((bucket) => bucket.id === snapshot.activeBucketId) ?? buckets[0] ?? EMPTY_BUCKET
  }, [buckets, snapshot.activeBucketId])

  const defaultBucketId = activeBucket.id

  const getNodeById = React.useCallback((nodeId: string) => snapshot.nodes.find((node) => node.id === nodeId), [snapshot.nodes])

  const getFolderPathId = React.useCallback(
    (path: string, bucketId = defaultBucketId) => {
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
    },
    [defaultBucketId, snapshot]
  )

  const getNodesInFolder = React.useCallback(
    (path: string, bucketId = defaultBucketId) => {
      const folderId = getFolderPathId(path, bucketId)
      if (!folderId) {
        return []
      }

      return snapshot.nodes.filter(
        (node) => node.bucketId === bucketId && node.parentId === folderId && isVisibleNode(node)
      )
    },
    [defaultBucketId, getFolderPathId, snapshot.nodes]
  )

  const getFoldersForBucket = React.useCallback(
    (bucketId = defaultBucketId, includeRoot = false) => {
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
    },
    [defaultBucketId, snapshot]
  )

  const getTreeNodes = React.useCallback(
    (bucketId = defaultBucketId) => {
      const rootId = getBucketRoot(snapshot, bucketId)
      if (!rootId) {
        return []
      }

      return snapshot.nodes.filter(
        (node) => node.bucketId === bucketId && node.parentId === rootId && node.kind === "folder" && !node.deletedAt
      )
    },
    [defaultBucketId, snapshot]
  )

  const getCategoryNodes = React.useCallback(
    (category: "image" | "video" | "audio" | "document", bucketId = defaultBucketId) => {
      return snapshot.nodes.filter(
        (node) => node.bucketId === bucketId && node.kind === "file" && node.mediaType === category && isVisibleNode(node)
      )
    },
    [defaultBucketId, snapshot.nodes]
  )

  const getSharedWithMeNodes = React.useCallback(() => [] as FileNode[], [])
  const getRecycleNodes = React.useCallback(() => snapshot.nodes.filter((node) => Boolean(node.deletedAt)), [snapshot.nodes])
  const getShareRecords = React.useCallback(
    () =>
      snapshot.shares.map((record) => ({
        ...record,
        node: getNodeById(record.nodeId),
      })),
    [snapshot.shares, getNodeById]
  )

  const setThemeMode = React.useCallback(
    (mode: ThemeMode) => {
      updateSnapshot((current) => ({
        ...current,
        settings: { ...current.settings, themeMode: mode },
      }))
    },
    [updateSnapshot]
  )

  const updateSettings = React.useCallback(
    (patch: Partial<UserSettings>) => {
      updateSnapshot((current) => ({
        ...current,
        settings: { ...current.settings, ...patch },
      }))
    },
    [updateSnapshot]
  )

  const updateProfile = React.useCallback(
    (patch: Partial<UserProfile>) => {
      updateSnapshot((current) => ({
        ...current,
        profile: { ...current.profile, ...patch },
        auth: current.auth.session
          ? {
              session: {
                ...current.auth.session,
                user: {
                  ...current.auth.session.user,
                  username: patch.username ?? current.auth.session.user.username,
                  email: patch.email ?? current.auth.session.user.email,
                  avatar: patch.avatar ?? current.auth.session.user.avatar,
                  group: patch.group ?? current.auth.session.user.group,
                  registeredAt: patch.registeredAt ?? current.auth.session.user.registeredAt,
                },
              },
            }
          : current.auth,
      }))
    },
    [updateSnapshot]
  )

  const login = React.useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const result = await apiLogin({ email: email.trim().toLowerCase(), password: password.trim() })
        if (result.kind === "2fa") {
          return {
            success: false,
            message: "requires_2fa",
            twoFactorToken: result.twoFactorToken,
            method: result.method,
          }
        }
        await hydrateWorkspace(result)
        emitAuthEvent({ type: "session-updated" })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "登录失败",
        }
      }
    },
    [hydrateWorkspace]
  )

  const loginWithPasskey = React.useCallback(
    async (emailHint?: string): Promise<AuthResult> => {
      try {
        const { startAuthentication } = await import("@simplewebauthn/browser")
        const begin = await apiBeginPasskeyLogin(emailHint)
        const credential = await startAuthentication({
          optionsJSON: begin.options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"],
        })
        const result = await apiFinishPasskeyLogin({
          ceremonyId: begin.ceremony_id,
          credential: credential as unknown as Record<string, unknown>,
        })
        if (result.kind === "2fa") {
          return {
            success: false,
            message: "requires_2fa",
            twoFactorToken: result.twoFactorToken,
            method: result.method,
          }
        }
        await hydrateWorkspace(result)
        emitAuthEvent({ type: "session-updated" })
        return { success: true }
      } catch (error) {
        if (isPasskeyCanceled(error)) {
          return {
            success: false,
            message: "用户已取消登录",
          }
        }
        return {
          success: false,
          message: error instanceof Error ? error.message : "通行密钥登录失败",
        }
      }
    },
    [hydrateWorkspace]
  )

  const verifyTwoFactor = React.useCallback(
    async (
      twoFactorToken: string,
      code: string,
      method: "password" | "passkey" = "password"
    ): Promise<AuthResult> => {
      try {
        const session = await apiVerifyTwoFactorLogin({
          twoFactorToken,
          code,
          method,
        })
        await hydrateWorkspace(session)
        emitAuthEvent({ type: "session-updated" })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "两步验证失败",
        }
      }
    },
    [hydrateWorkspace]
  )

  const register = React.useCallback(
    async (input: AuthRegisterInput): Promise<AuthResult> => {
      try {
        const session = await apiRegister({
          email: input.email.trim().toLowerCase(),
          password: input.password.trim(),
          username: input.username.trim(),
        })
        await hydrateWorkspace(session)
        emitAuthEvent({ type: "session-updated" })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "注册失败",
        }
      }
    },
    [hydrateWorkspace]
  )

  const logout = React.useCallback(async () => {
    try {
      await apiLogout("current")
    } catch {
      // ignore transport failures
    } finally {
      clearWorkspace()
      emitAuthEvent({ type: "logout", reason: "user-initiated" })
    }
  }, [clearWorkspace])

  const verifyPassword = React.useCallback(
    (value: string) => {
      const passed = value.trim().length > 0
      if (passed) {
        updateSnapshot((current) => ({
          ...current,
          security: { ...current.security, passwordVerified: true },
        }))
      }

      return passed
    },
    [updateSnapshot]
  )

  const resetPasswordVerification = React.useCallback(() => {
    updateSnapshot((current) => ({
      ...current,
      security: { ...current.security, passwordVerified: false },
    }))
  }, [updateSnapshot])

  const updateSecurity = React.useCallback(
    (patch: Partial<SecurityState>) => {
      updateSnapshot((current) => ({
        ...current,
        security: { ...current.security, ...patch },
      }))
    },
    [updateSnapshot]
  )

  const setActiveBucket = React.useCallback(
    (bucketId: string) => {
      updateSnapshot((current) => ({ ...current, activeBucketId: bucketId }))
    },
    [updateSnapshot]
  )

  const createFolder = React.useCallback(
    async (parentId: string | null, name: string, bucketId = defaultBucketId) => {
      const session = snapshotRef.current.auth.session
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      if (!session || !bucket?.backendId) {
        toast.error("当前没有可用的存储挂载")
        return null
      }

      const trimmedName = name.trim()
      if (!trimmedName) {
        return null
      }

      const apiParentId = parentId && !parentId.startsWith("root:") ? Number(parentId) : undefined
      const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
      const tempId = `optimistic-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const tempNode: FileNode = {
        id: tempId,
        bucketId: bucket.id,
        parentId: uiParentId,
        kind: "folder",
        name: trimmedName,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      updateSnapshot((current) => ({
        ...current,
        nodes: [...current.nodes, tempNode],
      }))

      try {
        const created = await apiCreateFolder(session.tokens.accessToken, {
          mount_id: bucket.backendId,
          parent_id: apiParentId,
          name: trimmedName,
        })
        const realNode = mapNodeToFileNode(created, bucket.id, uiParentId, snapshotRef.current.settings.timezone)
        updateSnapshot((current) => ({
          ...current,
          nodes: current.nodes.map((node) => (node.id === tempId ? realNode : node)),
        }))
        return realNode
      } catch (error) {
        updateSnapshot((current) => ({
          ...current,
          nodes: current.nodes.filter((node) => node.id !== tempId),
        }))
        toast.error(error instanceof Error ? error.message : "创建文件夹失败")
        return null
      }
    },
    [defaultBucketId, updateSnapshot]
  )

  const renameNode = React.useCallback(async (nodeId: string, name: string) => {
    const session = snapshotRef.current.auth.session
    const backendId = Number(nodeId)
    if (!session || Number.isNaN(backendId)) {
      return
    }

    await apiRenameNode(session.tokens.accessToken, backendId, { name: name.trim() })
    await reloadWorkspace()
  }, [reloadWorkspace])

  const moveNodes = React.useCallback(async () => {
    toast.info("当前 MVP 暂不支持真实移动操作")
  }, [])

  const duplicateNodes = React.useCallback(async () => {
    toast.info("当前 MVP 暂不支持真实复制副本")
  }, [])

  const deleteNodes = React.useCallback(async (nodeIds: string[], hardDelete = false) => {
    const session = snapshotRef.current.auth.session
    const backendIds = nodeIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    if (!session || backendIds.length === 0) {
      return
    }

    // Collect the selected nodes and all their descendants for optimistic removal.
    const idsToRemove = new Set(nodeIds)
    const collectDescendants = (parentIds: string[]) => {
      const children = snapshotRef.current.nodes.filter(
        (node) => node.parentId && parentIds.includes(node.parentId)
      )
      if (children.length === 0) return
      const childIds = children.map((node) => node.id)
      childIds.forEach((id) => idsToRemove.add(id))
      collectDescendants(childIds)
    }
    collectDescendants(nodeIds)

    const previousNodes = snapshotRef.current.nodes

    if (hardDelete) {
      updateSnapshot((current) => ({
        ...current,
        nodes: current.nodes.filter((node) => !idsToRemove.has(node.id)),
      }))
    } else {
      const deletedAt = formatDateTime(new Date().toISOString(), snapshotRef.current.settings.timezone)
      updateSnapshot((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          idsToRemove.has(node.id) ? { ...node, deletedAt } : node
        ),
      }))
    }

    try {
      await apiDeleteNodes(session.tokens.accessToken, {
        node_ids: backendIds,
        hard_delete: hardDelete,
      })
    } catch (error) {
      updateSnapshot((current) => ({
        ...current,
        nodes: previousNodes,
      }))
      toast.error(error instanceof Error ? error.message : "删除失败")
    }
  }, [updateSnapshot])

  const restoreNodes = React.useCallback(async (nodeIds: string[]) => {
    const session = snapshotRef.current.auth.session
    const backendIds = nodeIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    if (!session || backendIds.length === 0) {
      return
    }

    await apiRestoreNodes(session.tokens.accessToken, {
      node_ids: backendIds,
    })
    await reloadWorkspace()
  }, [reloadWorkspace])

  const permanentlyDeleteNodes = React.useCallback(async (nodeIds: string[]) => {
    await deleteNodes(nodeIds, true)
  }, [deleteNodes])

  const shareNodes = React.useCallback(
    async (nodeIds: string[]) => {
      const nodes = nodeIds
        .map((id) => snapshotRef.current.nodes.find((node) => node.id === id))
        .filter(Boolean) as FileNode[]

      if (nodes.length === 0) {
        toast.info("当前没有可分享的文件")
        return [] as ShareRecord[]
      }

      const newRecords: ShareRecord[] = nodes.map((node) => ({
        id: createShareSlug(),
        nodeId: node.id,
        access: "公开访问",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        views: 0,
        downloads: 0,
        nodeName: node.name,
        nodeKind: node.kind,
        nodeExt: node.ext,
        nodeSize: node.size,
        nodeMediaType: node.mediaType,
        nodePreview: node.preview,
      }))

      updateSnapshot((current) => ({
        ...current,
        shares: [...current.shares, ...newRecords],
      }))

      toast.success(`已生成 ${newRecords.length} 条分享链接`)
      return newRecords
    },
    [updateSnapshot]
  )

  const deleteShares = React.useCallback(
    (shareIds: string[]) => {
      updateSnapshot((current) => ({
        ...current,
        shares: current.shares.filter((record) => !shareIds.includes(record.id)),
      }))
    },
    [updateSnapshot]
  )

  const recordShareView = React.useCallback(
    (shareId: string) => {
      updateSnapshot((current) => ({
        ...current,
        shares: current.shares.map((record) =>
          record.id === shareId ? { ...record, views: record.views + 1 } : record
        ),
      }))
    },
    [updateSnapshot]
  )

  const recordShareDownload = React.useCallback(
    (shareId: string) => {
      updateSnapshot((current) => ({
        ...current,
        shares: current.shares.map((record) =>
          record.id === shareId ? { ...record, downloads: record.downloads + 1 } : record
        ),
      }))
    },
    [updateSnapshot]
  )

  const copyNodes = React.useCallback(
    (nodeIds: string[]) => {
      updateSnapshot((current) => ({
        ...current,
        clipboard: { type: "copy", nodeIds },
      }))
    },
    [updateSnapshot]
  )

  const cutNodes = React.useCallback(
    (nodeIds: string[]) => {
      updateSnapshot((current) => ({
        ...current,
        clipboard: { type: "cut", nodeIds },
      }))
    },
    [updateSnapshot]
  )

  const pasteNodes = React.useCallback(async () => {
    toast.info("当前 MVP 暂不支持真实粘贴操作")
  }, [])

  const getFileContent = React.useCallback((fileId: string) => snapshot.fileContents[fileId] ?? "", [snapshot.fileContents])

  const updateFileContent = React.useCallback(() => {
    toast.info("在线编辑保存功能暂未接入后端")
  }, [])

  const updateUploadQueueItem = React.useCallback((id: string, patch: Partial<UploadQueueItem>) => {
    setUploadQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const processUploadItem = React.useCallback(
    async (id: string) => {
      const saved = uploadFilesRef.current.get(id)
      const session = snapshotRef.current.auth.session
      if (!saved || !session) {
        return
      }

      const bucket = snapshotRef.current.buckets.find((item) => item.id === saved.target.mountId)
      if (!bucket?.backendId) {
        updateUploadQueueItem(id, {
          status: "failed",
          errorMessage: "未找到可用存储挂载",
        })
        return
      }

      const controller = new AbortController()
      uploadControllersRef.current.set(id, controller)

      let sessionId: string | undefined
      try {
        updateUploadQueueItem(id, {
          status: "preparing",
          progress: 0,
          uploadedBytes: 0,
          totalBytes: saved.file.size,
          speedText: "计算校验值...",
          errorMessage: undefined,
        })
        const apiParentId =
          saved.target.parentId && !saved.target.parentId.startsWith("root:")
            ? Number(saved.target.parentId)
            : undefined

        const checksum = await sha256File(saved.file)
        const plan = await createUploadSession(session.tokens.accessToken, {
          mount_id: bucket.backendId,
          parent_id: apiParentId,
          file_name: saved.file.name,
          relative_path: saved.relativePath,
          checksum,
          size: saved.file.size,
          content_type: saved.file.type || "application/octet-stream",
          mode: "multipart",
        })
        sessionId = plan.session_id
        if (plan.is_duplicate) {
          updateUploadQueueItem(id, {
            sessionId,
            status: "completed",
            progress: 100,
            uploadedBytes: saved.file.size,
            speedText: "秒传完成",
          })
          await reloadWorkspace()
          return
        }
        updateUploadQueueItem(id, {
          sessionId,
          expiresAt: plan.expires_at ?? undefined,
          status: "uploading",
        })

        const partSize = Math.max(plan.part_size || saved.file.size || 1, 1)
        const partCount = Math.max(plan.upload_urls.length, Math.ceil((saved.file.size || 1) / partSize), 1)
        const startAt = Date.now()
        let uploadedBytes = 0
        const completedParts: Array<{ part_number: number; etag: string; size: number }> = []

        for (let index = 0; index < partCount; index += 1) {
          if (controller.signal.aborted) {
            throw new DOMException("aborted", "AbortError")
          }

          const partNumber = index + 1
          const start = index * partSize
          const end = saved.file.size ? Math.min(saved.file.size, start + partSize) : start + partSize
          const chunk = saved.file.slice(start, end)
          const uploadPlan = plan.upload_urls[index]
          let etag = `part-${partNumber}`

          if (!uploadPlan || uploadPlan.url.startsWith("/api/") || bucket.storageType === "local") {
            const part = await uploadLocalPart(
              session.tokens.accessToken,
              sessionId,
              chunk,
              partNumber,
              chunk.size,
              controller.signal
            )
            etag = part.etag ?? etag
          } else {
            const response = await fetch(uploadPlan.url, {
              method: uploadPlan.method,
              headers: uploadPlan.headers,
              body: chunk,
              signal: controller.signal,
            })
            if (!response.ok) {
              throw new Error("上传分片失败")
            }
            etag = response.headers.get("etag") ?? response.headers.get("ETag") ?? etag
            await recordRemotePart(
              session.tokens.accessToken,
              sessionId,
              partNumber,
              etag,
              chunk.size,
              controller.signal
            )
          }

          uploadedBytes += chunk.size
          const elapsedSeconds = Math.max((Date.now() - startAt) / 1000, 0.2)
          const speed = uploadedBytes / elapsedSeconds
          const progress = saved.file.size > 0 ? Math.min((uploadedBytes / saved.file.size) * 100, 100) : 100
          completedParts.push({
            part_number: partNumber,
            etag,
            size: chunk.size,
          })
          updateUploadQueueItem(id, {
            status: "uploading",
            uploadedBytes,
            progress,
            speedText: `${formatBytes(speed)}/s 已上传 ${formatBytes(uploadedBytes)} / ${formatBytes(saved.file.size)}`,
          })
        }

        updateUploadQueueItem(id, {
          status: "processing",
          progress: 100,
          speedText: "处理中...",
        })
        await completeUpload(session.tokens.accessToken, sessionId, completedParts)
        updateUploadQueueItem(id, {
          status: "completed",
          progress: 100,
          uploadedBytes: saved.file.size,
          speedText: "已上传",
        })
        await reloadWorkspace()
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError"
        if (sessionId) {
          try {
            await abortUpload(session.tokens.accessToken, sessionId, aborted ? "client_abort" : "client_failed")
          } catch {
            // ignore abort cleanup failures
          }
        }
        updateUploadQueueItem(id, {
          status: aborted ? "canceled" : "failed",
          errorMessage: aborted ? "已取消" : error instanceof Error ? error.message : "上传失败",
          speedText: aborted ? "已取消" : "上传失败",
        })
      } finally {
        uploadControllersRef.current.delete(id)
      }
    },
    [reloadWorkspace, updateUploadQueueItem]
  )

  const requestUpload = React.useCallback((parentId: string | null = null, mountId?: string) => {
    const session = snapshotRef.current.auth.session
    const targetMountId = mountId ?? snapshotRef.current.activeBucketId
    if (!session || !targetMountId) {
      toast.error("当前没有可用的上传目标")
      return
    }

    pendingUploadTargetRef.current = {
      mountId: targetMountId,
      parentId,
    }
    fileInputRef.current?.click()
  }, [])

  const requestFolderUpload = React.useCallback((parentId: string | null = null, mountId?: string) => {
    const session = snapshotRef.current.auth.session
    const targetMountId = mountId ?? snapshotRef.current.activeBucketId
    if (!session || !targetMountId) {
      toast.error("当前没有可用的上传目标")
      return
    }

    pendingUploadTargetRef.current = {
      mountId: targetMountId,
      parentId,
    }
    folderInputRef.current?.click()
  }, [])

  const handleFileInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>, isFolder: boolean) => {
    const target = pendingUploadTargetRef.current
    const files: File[] = event.target.files ? Array.from(event.target.files as ArrayLike<File>) : []
    event.target.value = ""

    if (!target || files.length === 0) {
      return
    }

    const nextItems = files.map<UploadQueueItem>((file) => {
      const id = createId("upload")
      const relativePath = isFolder && file.webkitRelativePath ? file.webkitRelativePath : undefined
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
        createdAt: nowString(),
      }
    })

    setUploadQueue((current) => [...nextItems, ...current])
    setUploadQueueOpen(true)

    for (const item of nextItems) {
      void processUploadItem(item.id)
    }
  }, [processUploadItem])

  const retryUpload = React.useCallback((id: string) => {
    if (!uploadFilesRef.current.get(id)) {
      return
    }

    updateUploadQueueItem(id, {
      status: "pending",
      progress: 0,
      uploadedBytes: 0,
      expiresAt: undefined,
      speedText: "准备中...",
      errorMessage: undefined,
    })
    void processUploadItem(id)
  }, [processUploadItem, updateUploadQueueItem])

  const removeUpload = React.useCallback((id: string) => {
    const controller = uploadControllersRef.current.get(id)
    if (controller) {
      controller.abort()
      return
    }

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

  const value = React.useMemo<AppStateValue>(() => ({
    auth: snapshot.auth,
    authSession,
    authReady,
    currentUser,
    isAuthenticated,
    profile: snapshot.profile,
    settings: snapshot.settings,
    security: snapshot.security,
    loginActivity: snapshot.loginActivity,
    buckets,
    activeBucket,
    nodes: snapshot.nodes,
    shares: snapshot.shares,
    offlineTasks,
    uploadQueue,
    uploadQueueOpen,
    clipboard: snapshot.clipboard,
    effectiveTheme,
    setThemeMode,
    updateSettings,
    updateProfile,
    login,
    loginWithPasskey,
    verifyTwoFactor,
    register,
    logout,
    verifyPassword,
    resetPasswordVerification,
    updateSecurity,
    setActiveBucket,
    reloadWorkspace,
    requestUpload,
    requestFolderUpload,
    setUploadQueueOpen,
    retryUpload,
    removeUpload,
    clearCompletedUploads,
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
    renameNode,
    moveNodes,
    duplicateNodes,
    deleteNodes,
    restoreNodes,
    permanentlyDeleteNodes,
    shareNodes,
    deleteShares,
    recordShareView,
    recordShareDownload,
    copyNodes,
    cutNodes,
    pasteNodes,
    formatBytes,
    getFileContent,
    updateFileContent,
  }), [
    activeBucket,
    authReady,
    authSession,
    buckets,
    clearCompletedUploads,
    copyNodes,
    createFolder,
    currentUser,
    cutNodes,
    deleteNodes,
    deleteShares,
    duplicateNodes,
    effectiveTheme,
    recordShareDownload,
    recordShareView,
    getCategoryNodes,
    getFileContent,
    getFolderPathId,
    getFoldersForBucket,
    getNodeById,
    getNodesInFolder,
    getRecycleNodes,
    getShareRecords,
    getSharedWithMeNodes,
    getTreeNodes,
    isAuthenticated,
    login,
    loginWithPasskey,
    verifyTwoFactor,
    logout,
    moveNodes,
    offlineTasks,
    pasteNodes,
    permanentlyDeleteNodes,
    register,
    reloadWorkspace,
    removeUpload,
    renameNode,
    requestFolderUpload,
    requestUpload,
    resetPasswordVerification,
    restoreNodes,
    retryUpload,
    setActiveBucket,
    setThemeMode,
    shareNodes,
    snapshot.auth,
    snapshot.clipboard,
    snapshot.loginActivity,
    snapshot.nodes,
    snapshot.profile,
    snapshot.security,
    snapshot.settings,
    snapshot.shares,
    updateFileContent,
    updateProfile,
    updateSecurity,
    updateSettings,
    uploadQueue,
    uploadQueueOpen,
    verifyPassword,
  ])

  return (
    <AppStateContext.Provider value={value}>
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
        webkitdirectory="true"
        directory=""
        className="hidden"
        onChange={(event) => handleFileInputChange(event, true)}
      />
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const context = React.useContext(AppStateContext)
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.")
  }

  return context
}
