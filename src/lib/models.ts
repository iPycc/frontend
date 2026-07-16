export type ThemeMode = "light" | "dark" | "system"
export type SortValue = "updated-desc" | "updated-asc" | "name-asc" | "name-desc" | "size-desc"
export type ViewMode = "grid" | "list" | "gallery"
export type MediaType = "image" | "video" | "audio" | "document" | "archive" | "code" | "other"

export type StorageStrategyKey = "tencent" | "local" | "aliyun"
export type UserRole = "admin" | "user" | "guest"

export interface UserProfile {
  username: string
  avatar: string
  email: string
  uid: string
  registeredAt: string
  group: string
  homepage: string
}

export interface UserSettings {
  language: string
  timezone: string
  themeMode: ThemeMode
  accentTheme: string
  showSidebarTree: boolean
}

export interface PasskeyCredential {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string
}

export interface SecurityState {
  passwordVerified: boolean
  passwordUpdatedAt: string
  twoFactorEnabled: boolean
  passkeysEnabled: boolean
  passkeys: PasskeyCredential[]
}

export interface AppUser {
  id: string
  email: string
  username: string
  avatar: string
  role: UserRole
  group: string
  registeredAt: string
  twoFactorEnabled?: boolean
}

export interface AuthTokens {
  accessToken: string
  accessExpiresAt: string
  refreshExpiresAt: string
}

export interface AuthSession {
  user: AppUser
  tokens: AuthTokens
}

export interface AuthState {
  session: AuthSession | null
}

export interface LoginActivityEntry {
  id: string
  method: string
  device: string
  ip: string
  time: string
  result?: string
  identifier?: string
}

export interface BucketStrategy {
  multipartThreshold: string
  partSize: string
  presignTtl: string
  concurrency: number
  protocol: "https" | "http"
  pathStyle: boolean
  accelerate: boolean
}

export interface BucketMount {
  id: string
  backendId?: number
  policyId?: number
  name: string
  provider: string
  providerLabel?: string
  storageType?: StorageStrategyKey
  ownerId?: string
  ownerBackendId?: number
  region?: string
  endpoint?: string
  bucket?: string
  basePrefix?: string
  secretId?: string
  secretKey?: string
  sessionToken?: string
  strategy: BucketStrategy
  rootNodeId: string
  rootPath?: string
  mountSlug?: string
  createdAt: string
  updatedAt?: string
  corsStatus: "healthy" | "warning"
  corsMessage: string
  advancedMode: boolean
  isLocal: boolean
  canEditConnection: boolean
  canDelete: boolean
  canRename: boolean
  quota?: {
    used: number
    total: number
  }
  extra?: Record<string, unknown>
}

export interface FileNode {
  id: string
  backendId?: number
  bucketId: string
  mountBackendId?: number
  parentId: string | null
  parentBackendId?: number | null
  kind: "folder" | "file"
  name: string
  ext?: string
  size?: number
  updatedAt: string
  createdAt?: string
  mediaType?: MediaType
  preview?: string
  sharedWithMe?: boolean
  deletedAt?: string
  isSystemRoot?: boolean
  blobPath?: string | null
}

export interface ShareRecord {
  id: string
  nodeId: string
  access: string
  expiresAt: string
  createdAt: string
  views: number
  downloads: number
  maxDownloads?: number | null
  password?: string | null
  nodeName?: string
  nodeKind?: "folder" | "file"
  nodeExt?: string
  nodeSize?: number
  nodeMediaType?: MediaType
  nodePreview?: string
}

export interface OfflineTask {
  id: string
  name: string
  url: string
  status: string
  progress: number
  updatedAt: string
}

export interface UploadQueueItem {
  id: string
  fileName: string
  relativePath?: string
  fileSize: number
  mountId: string
  parentId: string | null
  status: "pending" | "preparing" | "uploading" | "processing" | "completed" | "failed" | "canceled"
  progress: number
  uploadedBytes: number
  totalBytes: number
  speedText: string
  sessionId?: string
  expiresAt?: string
  errorMessage?: string
  createdAt: string
}

export interface ClipboardState {
  type: "copy" | "cut"
  nodeIds: string[]
}

export interface AppSnapshot {
  profile: UserProfile
  settings: UserSettings
  security: SecurityState
  auth: AuthState
  loginActivity: LoginActivityEntry[]
  buckets: BucketMount[]
  activeBucketId: string
  nodes: FileNode[]
  shares: ShareRecord[]
  offlineTasks: OfflineTask[]
  clipboard: ClipboardState | null
  fileContents: Record<string, string>
}

export const defaultSettings: UserSettings = {
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  themeMode: "system",
  accentTheme: "Blue",
  showSidebarTree: true,
}

export const defaultSecurity: SecurityState = {
  passwordVerified: false,
  passwordUpdatedAt: "",
  twoFactorEnabled: false,
  passkeysEnabled: false,
  passkeys: [],
}

export const defaultAppSnapshot: AppSnapshot = {
  profile: {
    username: "",
    avatar: "",
    email: "",
    uid: "",
    registeredAt: "",
    group: "",
    homepage: "",
  },
  settings: defaultSettings,
  security: defaultSecurity,
  auth: {
    session: null,
  },
  loginActivity: [],
  buckets: [],
  activeBucketId: "",
  nodes: [],
  shares: [],
  offlineTasks: [],
  clipboard: null,
  fileContents: {},
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function normalizeLocalStorageSegment(value: string) {
  return value
    .trim()
    .replace(/[<>:"|?*]/g, "-")
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

export function buildLocalStoragePath(value: string) {
  const normalized = normalizeLocalStorageSegment(value) || "default"
  return `/upload/${normalized}/`
}

export function validateLocalStoragePath(path: string) {
  const normalized = path.trim().replace(/\\/g, "/")

  if (!normalized) {
    return { isValid: false, message: "请输入本机存储目录。", normalized }
  }

  if (!normalized.startsWith("/upload/")) {
    return { isValid: false, message: "目录必须以 /upload/ 开头。", normalized }
  }

  if (normalized.includes("..")) {
    return { isValid: false, message: "目录不能包含相对路径 .. 。", normalized }
  }

  if (/[<>:"|?*]/.test(normalized)) {
    return { isValid: false, message: "目录包含非法字符 < > : \" | ? * 。", normalized }
  }

  if (/\/{2,}/.test(normalized)) {
    return { isValid: false, message: "目录不能包含连续的 / 。", normalized }
  }

  return { isValid: true, message: "目录可用。", normalized }
}

export function getLocalStoragePathSuggestions(value: string) {
  const raw = value.trim()
  const base = raw.startsWith("/") ? raw.replace(/\\/g, "/") : buildLocalStoragePath(raw || "workspace")
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base

  return Array.from(
    new Set([
      `${normalizedBase}/`,
      `${normalizedBase}/assets/`,
      `${normalizedBase}/documents/`,
      `${normalizedBase}/uploads/`,
    ])
  )
}

export function formatBytes(size?: number) {
  if (!size) {
    return "-"
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  let index = 0
  let value = size

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }

  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${value.toFixed(precision)} ${units[index]}`
}

export function getBucketRoot(snapshot: Pick<AppSnapshot, "buckets">, bucketId: string) {
  return snapshot.buckets.find((bucket) => bucket.id === bucketId)?.rootNodeId ?? null
}

export function isVisibleNode(node: FileNode) {
  return !node.deletedAt && !node.isSystemRoot
}

export function inferMediaType(name: string, kind: FileNode["kind"] = "file"): MediaType | undefined {
  if (kind === "folder") {
    return undefined
  }

  const ext = name.split(".").pop()?.toLowerCase() ?? ""

  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "ico", "heic"].includes(ext)) {
    return "image"
  }
  if (["mp4", "mov", "mkv", "avi", "webm", "flv", "m4v", "wmv"].includes(ext)) {
    return "video"
  }
  if (["mp3", "wav", "flac", "ogg", "m4a", "aac"].includes(ext)) {
    return "audio"
  }
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) {
    return "archive"
  }
  if (
    [
      "ts",
      "tsx",
      "js",
      "jsx",
      "json",
      "py",
      "go",
      "rs",
      "java",
      "kt",
      "php",
      "rb",
      "c",
      "cpp",
      "h",
      "hpp",
      "css",
      "scss",
      "less",
      "html",
      "xml",
      "yaml",
      "yml",
      "toml",
      "ini",
      "sql",
      "sh",
      "ps1",
      "bat",
      "md",
    ].includes(ext)
  ) {
    return "code"
  }
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt"].includes(ext)) {
    return "document"
  }

  return "other"
}
