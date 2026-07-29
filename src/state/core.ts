import * as React from "react"

import {
  buildPreviewUrl,
  buildPreviewImageUrl,
  buildPreviewVideoPosterUrl,
  listUserMounts,
  listMountUsage,
  type ExplorerMount,
  type ExplorerNode,
} from "@/api/files"
import { ShareAccess, type ShareRead } from "@/api/share"
import { getCurrentProfile } from "@/api/user"
import {
  defaultAppSnapshot,
  defaultSecurity,
  defaultSettings,
  inferMediaType,
  type AppSnapshot,
  type AppUser,
  type AuthSession,
  type AuthState,
  type BucketMount,
  type FileNode,
  type LoginActivityEntry,
  type SecurityState,
  type ShareRecord,
  type SortValue,
  type ThemeMode,
  type UserProfile,
  type UserSettings,
} from "@/lib/models"

export const STORAGE_KEY = "cloudrave-app-state-v2"

export type AuthRegisterInput = {
  email: string
  password: string
  username: string
}

export type ShareCreateOptions = {
  access?: "public" | "password"
  password?: string
  expiresInHours?: number | null
  maxDownloads?: number | null
}

export type AuthResult = {
  success: boolean
  message?: string
  twoFactorToken?: string
  method?: "password" | "passkey"
}

export function isPasskeyCanceled(error: unknown) {
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

export type NodeCategory = "image" | "video" | "audio" | "document"

export type PageLoadState = {
  loading: boolean
  loaded: boolean
  nextCursor: string | null
  queryKey: string
}

export type PageLoadOptions = {
  reset?: boolean
  limit?: number
  sort?: SortValue
}

export const EMPTY_PAGE_STATE: PageLoadState = {
  loading: false,
  loaded: false,
  nextCursor: null,
  queryKey: "",
}

export function directoryPageKey(mode: "content" | "folders", bucketId: string, parentId: string) {
  return `directory:${mode}:${bucketId}:${parentId}`
}

export function categoryPageKey(category: NodeCategory, bucketId: string) {
  return `category:${category}:${bucketId}`
}

export type AppStateValue = {
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
  clipboard: AppSnapshot["clipboard"]
  effectiveTheme: Exclude<ThemeMode, "system">
  setThemeMode: (mode: ThemeMode) => void
  updateSettings: (patch: Partial<UserSettings>) => void
  updateProfile: (patch: Partial<UserProfile>) => void
  login: (email: string, password: string) => Promise<AuthResult>
  loginWithPasskey: (emailHint?: string) => Promise<AuthResult>
  verifyTwoFactor: (twoFactorToken: string, code: string, method?: "password" | "passkey") => Promise<AuthResult>
  register: (input: AuthRegisterInput) => Promise<AuthResult>
  logout: (scope?: "current" | "all") => Promise<void>
  verifyPassword: (value: string) => boolean
  resetPasswordVerification: () => void
  updateSecurity: (patch: Partial<SecurityState>) => void
  setActiveBucket: (bucketId: string) => void
  reloadWorkspace: () => Promise<void>
  getNodeById: (nodeId: string) => FileNode | undefined
  getFolderPathId: (path: string, bucketId?: string) => string | null
  getNodesInFolder: (path: string, bucketId?: string) => FileNode[]
  getTreeNodes: (bucketId?: string) => FileNode[]
  getFoldersForBucket: (bucketId?: string, includeRoot?: boolean) => FileNode[]
  getCategoryNodes: (category: NodeCategory, bucketId?: string) => FileNode[]
  loadDirectory: (parentId: string | null, bucketId?: string, options?: PageLoadOptions) => Promise<void>
  loadDirectoryFolders: (parentId: string | null, bucketId?: string) => Promise<void>
  resolveFolderPath: (path: string, bucketId?: string, options?: PageLoadOptions) => Promise<string | null>
  getDirectoryPageState: (parentId: string | null, bucketId?: string) => PageLoadState
  getFolderTreePageState: (parentId: string | null, bucketId?: string) => PageLoadState
  loadCategory: (category: NodeCategory, bucketId?: string, options?: PageLoadOptions) => Promise<void>
  getCategoryPageState: (category: NodeCategory, bucketId?: string) => PageLoadState
  loadRecycle: () => Promise<void>
  recycleLoading: boolean
  loadShares: () => Promise<void>
  sharesLoading: boolean
  getSharedWithMeNodes: () => FileNode[]
  getRecycleNodes: () => FileNode[]
  getShareRecords: () => Array<ShareRecord & { node?: FileNode }>
  createFolder: (parentId: string | null, name: string, bucketId?: string) => Promise<FileNode | null>
  createFile: (parentId: string | null, name: string, bucketId?: string) => Promise<FileNode | null>
  renameNode: (nodeId: string, name: string) => Promise<void>
  moveNodes: (nodeIds: string[], targetParentId: string | null, bucketId?: string) => Promise<void>
  duplicateNodes: (nodeIds: string[]) => Promise<void>
  deleteNodes: (nodeIds: string[], hardDelete?: boolean) => Promise<void>
  restoreNodes: (nodeIds: string[]) => Promise<void>
  permanentlyDeleteNodes: (nodeIds: string[]) => Promise<void>
  shareNodes: (nodeIds: string[], options?: ShareCreateOptions) => Promise<ShareRecord[]>
  deleteShares: (shareIds: string[]) => Promise<void>
  recordShareView: (shareId: string) => void
  recordShareDownload: (shareId: string) => void
  copyNodes: (nodeIds: string[]) => void
  cutNodes: (nodeIds: string[]) => void
  pasteNodes: (targetParentId: string | null, bucketId?: string) => Promise<void>
  formatBytes: (size?: number) => string
  getFileContent: (fileId: string) => string
  updateFileContent: (fileId: string, content: string) => void
}

export const AppStateContext = React.createContext<AppStateValue | null>(null)

export type AuthStateValue = Pick<
  AppStateValue,
  | "auth"
  | "authSession"
  | "authReady"
  | "currentUser"
  | "isAuthenticated"
  | "login"
  | "loginWithPasskey"
  | "verifyTwoFactor"
  | "register"
  | "logout"
>

export type SettingsStateValue = Pick<
  AppStateValue,
  | "authSession"
  | "currentUser"
  | "profile"
  | "settings"
  | "security"
  | "loginActivity"
  | "effectiveTheme"
  | "setThemeMode"
  | "updateSettings"
  | "updateProfile"
  | "verifyPassword"
  | "resetPasswordVerification"
  | "updateSecurity"
  | "logout"
>

export const AuthStateContext = React.createContext<AuthStateValue | null>(null)
export const SettingsStateContext = React.createContext<SettingsStateValue | null>(null)

export const EMPTY_BUCKET: BucketMount = {
  id: "",
  backendId: 0,
  policyId: 0,
  name: "我的文件",
  provider: "Local Storage",
  storageType: "local",
  ownerBackendId: 0,
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
  mountMode: "managed",
  readOnly: false,
    legacyPrefixedKeys: false,
    objectKeyStyle: "readable",
  syncStatus: "idle",
  syncedObjects: 0,
  createdAt: "",
  corsStatus: "healthy",
  corsMessage: "",
  advancedMode: false,
  isLocal: true,
  canEditConnection: false,
  canDelete: false,
  canRename: false,
}

export function createEmptyProfile(): UserProfile {
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

export function loadSnapshot(): AppSnapshot {
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

export function formatDateTime(value?: string | null, timezone?: string) {
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

export function mapMountToBucket(mount: ExplorerMount, user: AppUser | null, timezone?: string): BucketMount {
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
      concurrency: Number(extra.concurrency ?? (storageType === "local" ? 1 : 3)),
      protocol: "https",
      pathStyle: false,
      accelerate: false,
    },
    rootNodeId: `root:${mount.id}`,
    rootPath: mount.root_path,
    mountMode: mount.mode ?? (extra.mount_mode === "mirror" ? "mirror" : "managed"),
    readOnly: mount.read_only ?? Boolean(extra.read_only),
    legacyPrefixedKeys: mount.legacy_prefixed_keys ?? Boolean(extra.legacy_prefixed_keys),
    objectKeyStyle: extra.object_key_style === "opaque" ? "opaque" : "readable",
    syncStatus: mount.sync_status ?? "idle",
    lastSyncAt: formatDateTime(mount.last_sync_at, timezone) || undefined,
    syncError: mount.sync_error ?? undefined,
    syncedObjects: mount.synced_objects ?? Number(extra.synced_objects ?? 0),
    mountSlug: mount.mount_slug,
    createdAt: formatDateTime(mount.created_at, timezone),
    updatedAt: formatDateTime(mount.updated_at, timezone),
    corsStatus: extra.cors_status === "warning" ? "warning" : "healthy",
    corsMessage: storageRoot ? `已绑定目录：${storageRoot}` : "已连接真实存储",
    advancedMode: Boolean(extra.advanced_mode),
    isLocal: storageType === "local",
    canEditConnection: (user?.role === "user" || user?.role === "admin") && !systemManaged,
    canDelete: (user?.role === "user" || user?.role === "admin") && !systemManaged,
    canRename: (user?.role === "user" || user?.role === "admin") && !systemManaged,
    extra,
  }
}

export function extractExtension(name: string) {
  const index = name.lastIndexOf(".")
  if (index <= 0 || index === name.length - 1) {
    return undefined
  }
  return name.slice(index + 1).toLowerCase()
}

export function mapNodeToFileNode(node: ExplorerNode, bucketId: string, parentId: string | null, timezone?: string): FileNode {
  const mediaType = node.type === "file" ? inferMediaType(node.name, "file") : undefined
  let preview: string | undefined
  if (node.type === "file" && node.blob_path && (mediaType === "image" || mediaType === "video" || mediaType === "audio")) {
    preview = mediaType === "image"
      ? buildPreviewImageUrl(node.id, "thumbnail_2x", node.updated_at)
      : mediaType === "video"
        ? buildPreviewVideoPosterUrl(node.id, node.updated_at)
        : buildPreviewUrl(node.id)
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

export function mapShareRead(share: ShareRead): ShareRecord {
  const nodeName = share.node_name ?? undefined
  const nodeKind = share.node_type ?? undefined
  const nodeMediaType = nodeName && nodeKind === "file" ? inferMediaType(nodeName, "file") : undefined

  return {
    id: share.id,
    nodeId: String(share.node_id),
    access: share.access === ShareAccess.PASSWORD ? "密码访问" : "公开访问",
    expiresAt: share.expires_at ?? "",
    createdAt: share.created_at,
    views: share.view_count,
    downloads: share.download_count,
    maxDownloads: share.max_downloads,
    nodeName,
    nodeKind,
    nodeExt: nodeName && nodeKind === "file" ? extractExtension(nodeName) : undefined,
    nodeSize: share.node_size ?? undefined,
    nodeMediaType,
    itemCount: share.item_count,
  }
}

export function removeCachedSubtrees(nodes: FileNode[], directIds: Set<string>) {
  if (directIds.size === 0) {
    return nodes
  }

  const removedIds = new Set(directIds)
  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) {
      if (node.parentId && removedIds.has(node.parentId) && !removedIds.has(node.id)) {
        removedIds.add(node.id)
        changed = true
      }
    }
  }
  return nodes.filter((node) => !removedIds.has(node.id))
}

export type WorkspaceBasics = {
  profilePayload: Awaited<ReturnType<typeof getCurrentProfile>>
  rawMounts: ExplorerMount[]
  mountUsage: Awaited<ReturnType<typeof listMountUsage>>
}

let workspaceBasicsRequest: { token: string; promise: Promise<WorkspaceBasics> } | null = null

export async function fetchWorkspaceBasics(token: string): Promise<WorkspaceBasics> {
  if (workspaceBasicsRequest?.token === token) {
    return workspaceBasicsRequest.promise
  }

  const promise = Promise.all([getCurrentProfile(token), listUserMounts(token), listMountUsage(token)]).then(
    ([profilePayload, rawMounts, mountUsage]) => ({ profilePayload, rawMounts, mountUsage })
  )
  workspaceBasicsRequest = { token, promise }

  try {
    return await promise
  } finally {
    if (workspaceBasicsRequest?.promise === promise) {
      workspaceBasicsRequest = null
    }
  }
}

export function createMountRootNode(bucket: BucketMount): FileNode {
  return {
    id: bucket.rootNodeId,
    backendId: null,
    bucketId: bucket.id,
    mountBackendId: bucket.backendId,
    parentId: null,
    parentBackendId: null,
    kind: "folder",
    name: bucket.name,
    size: 0,
    updatedAt: bucket.updatedAt || bucket.createdAt,
    createdAt: bucket.createdAt,
    isSystemRoot: true,
  }
}
