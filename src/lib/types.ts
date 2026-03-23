/**
 * Cloudrave 统一类型定义
 *
 * 所有业务相关的 TypeScript 类型集中在此文件中维护，
 * 方便后续对接真实后端 API 时复用。
 */

/* ------------------------------------------------------------------ */
/*  基础枚举 / 联合类型                                                */
/* ------------------------------------------------------------------ */

export type ThemeMode = "light" | "dark" | "system"
export type SortValue = "updated-desc" | "updated-asc" | "name-asc" | "name-desc" | "size-desc"
export type ViewMode = "grid" | "list" | "gallery"
export type MediaType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "code"
  | "other"

/* ------------------------------------------------------------------ */
/*  用户 & 认证                                                        */
/* ------------------------------------------------------------------ */

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

export interface MockAuthUser {
  id: string
  email: string
  password: string
  username: string
  avatar: string
  group: string
  registeredAt: string
}

export interface AuthState {
  currentUserId: string | null
  users: MockAuthUser[]
}

export interface LoginActivityEntry {
  id: string
  method: string
  device: string
  ip: string
  time: string
}

/* ------------------------------------------------------------------ */
/*  存储桶 & 策略                                                      */
/* ------------------------------------------------------------------ */

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
  name: string
  provider: string
  region?: string
  endpoint?: string
  bucket?: string
  basePrefix?: string
  secretId?: string
  secretKey?: string
  sessionToken?: string
  strategy: BucketStrategy
  rootNodeId: string
  createdAt: string
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
}

/* ------------------------------------------------------------------ */
/*  文件 & 节点                                                        */
/* ------------------------------------------------------------------ */

export interface FileNode {
  id: string
  bucketId: string
  parentId: string | null
  kind: "folder" | "file"
  name: string
  ext?: string
  size?: number
  updatedAt: string
  mediaType?: MediaType
  preview?: string
  sharedWithMe?: boolean
  deletedAt?: string
  isSystemRoot?: boolean
}

/* ------------------------------------------------------------------ */
/*  分享 & 离线任务                                                    */
/* ------------------------------------------------------------------ */

export interface ShareRecord {
  id: string
  nodeId: string
  access: "公开链接" | "密码访问" | "团队内可见"
  expiresAt: string
  createdAt: string
  views: number
  downloads: number
}

export interface OfflineTask {
  id: string
  name: string
  url: string
  status: "队列中" | "下载中" | "已完成" | "失败"
  progress: number
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/*  剪贴板 & 全局快照                                                  */
/* ------------------------------------------------------------------ */

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
}
