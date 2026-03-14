export type ThemeMode = "light" | "dark" | "system"
export type SortValue = "updated-desc" | "updated-asc" | "name-asc" | "name-desc" | "size-desc"
export type ViewMode = "grid" | "list"
export type MediaType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "archive"
  | "code"
  | "other"

export interface UserProfile {
  username: string
  avatar: string
  email: string
  uid: string
  registeredAt: string
  group: string
}

export interface UserSettings {
  language: string
  timezone: string
  themeMode: ThemeMode
  accentTheme: string
  showSidebarTree: boolean
}

export interface SecurityState {
  passwordVerified: boolean
  twoFactorEnabled: boolean
  passkeysEnabled: boolean
}

export interface LoginActivityEntry {
  id: string
  method: string
  device: string
  ip: string
  time: string
}

export interface BucketStrategy {
  multipartThreshold: string
  partSize: string
  presignTtl: string
  concurrency: number
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
  strategy: BucketStrategy
  rootNodeId: string
  createdAt: string
  corsStatus: "healthy" | "warning"
  corsMessage: string
  isLocal: boolean
  canEditConnection: boolean
  canDelete: boolean
  canRename: boolean
  quota?: {
    used: number
    total: number
  }
}

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

export interface ClipboardState {
  type: "copy" | "cut"
  nodeIds: string[]
}

export interface AppSnapshot {
  profile: UserProfile
  settings: UserSettings
  security: SecurityState
  loginActivity: LoginActivityEntry[]
  buckets: BucketMount[]
  activeBucketId: string
  nodes: FileNode[]
  shares: ShareRecord[]
  offlineTasks: OfflineTask[]
  clipboard: ClipboardState | null
}

const localRootId = "bucket-local-root"

export const defaultProfile: UserProfile = {
  username: "Cloudrave Admin",
  avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Cloudrave",
  email: "admin@cloudrave.app",
  uid: "u_20260310_a8m1",
  registeredAt: "2025-12-18 09:24",
  group: "超级管理员",
}

export const defaultSettings: UserSettings = {
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  themeMode: "system",
  accentTheme: "默认蓝",
  showSidebarTree: true,
}

export const defaultSecurity: SecurityState = {
  passwordVerified: false,
  twoFactorEnabled: false,
  passkeysEnabled: false,
}

export const defaultLoginActivity: LoginActivityEntry[] = [
  { id: "login-1", method: "密码", device: "Chrome / Windows 11", ip: "223.104.58.10", time: "2026-03-12 00:18" },
  { id: "login-2", method: "验证码", device: "Safari / iPhone 15", ip: "120.230.16.81", time: "2026-03-11 21:42" },
  { id: "login-3", method: "密码", device: "Edge / macOS", ip: "117.136.12.40", time: "2026-03-11 09:03" },
  { id: "login-4", method: "二维码", device: "Cloudrave Desktop", ip: "61.148.245.66", time: "2026-03-10 22:16" },
]

export const defaultBuckets: BucketMount[] = [
  {
    id: "bucket-local",
    name: "本机存储",
    provider: "Local",
    strategy: {
      multipartThreshold: "64 MB",
      partSize: "16 MB",
      presignTtl: "900",
      concurrency: 4,
    },
    rootNodeId: localRootId,
    createdAt: "2026-03-10 10:00",
    corsStatus: "healthy",
    corsMessage: "本地存储无需额外 CORS 配置",
    isLocal: true,
    canEditConnection: false,
    canDelete: false,
    canRename: true,
    quota: { used: 1.5 * 1024 * 1024 * 1024, total: 50 * 1024 * 1024 * 1024 }, // 1.5GB of 50GB
  },
]

export const defaultNodes: FileNode[] = [
  { id: localRootId, bucketId: "bucket-local", parentId: null, kind: "folder", name: "本机存储", updatedAt: "2026-03-12 00:00", isSystemRoot: true },
  { id: "folder-design", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "设计资源", updatedAt: "2026-03-12 00:12" },
  { id: "folder-docs", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "产品文档", updatedAt: "2026-03-11 17:25" },
  { id: "folder-media", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "媒体库", updatedAt: "2026-03-10 20:08" },
  { id: "folder-project", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "项目 Alpha", updatedAt: "2026-03-11 14:46" },
  { id: "folder-shared", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "团队共享", updatedAt: "2026-03-09 13:28" },
  { id: "folder-design-brand", bucketId: "bucket-local", parentId: "folder-design", kind: "folder", name: "品牌稿", updatedAt: "2026-03-11 08:00" },
  { id: "folder-design-screen", bucketId: "bucket-local", parentId: "folder-design", kind: "folder", name: "界面稿", updatedAt: "2026-03-11 08:10" },
  { id: "folder-media-video", bucketId: "bucket-local", parentId: "folder-media", kind: "folder", name: "视频素材", updatedAt: "2026-03-10 22:10" },
  { id: "folder-media-audio", bucketId: "bucket-local", parentId: "folder-media", kind: "folder", name: "音频素材", updatedAt: "2026-03-10 22:21" },
  { id: "folder-docs-prd", bucketId: "bucket-local", parentId: "folder-docs", kind: "folder", name: "PRD", updatedAt: "2026-03-09 19:16" },
  { id: "file-ui-fig", bucketId: "bucket-local", parentId: "folder-design-screen", kind: "file", name: "cloudrave-desktop.fig", ext: "fig", size: 124000000, updatedAt: "2026-03-12 00:07", mediaType: "image" },
  { id: "file-logo-png", bucketId: "bucket-local", parentId: "folder-design-brand", kind: "file", name: "brand-logo.png", ext: "png", size: 2900000, updatedAt: "2026-03-11 23:40", mediaType: "image" },
  { id: "file-cover-jpg", bucketId: "bucket-local", parentId: "folder-design-brand", kind: "file", name: "campaign-cover.jpg", ext: "jpg", size: 4200000, updatedAt: "2026-03-10 16:03", mediaType: "image" },
  { id: "file-demo-mp4", bucketId: "bucket-local", parentId: "folder-media-video", kind: "file", name: "product-demo.mp4", ext: "mp4", size: 1280000000, updatedAt: "2026-03-11 18:24", mediaType: "video" },
  { id: "file-ad-mov", bucketId: "bucket-local", parentId: "folder-media-video", kind: "file", name: "launch-trailer.mov", ext: "mov", size: 860000000, updatedAt: "2026-03-10 15:18", mediaType: "video" },
  { id: "file-theme-mp3", bucketId: "bucket-local", parentId: "folder-media-audio", kind: "file", name: "brand-theme.mp3", ext: "mp3", size: 9800000, updatedAt: "2026-03-10 10:11", mediaType: "audio" },
  { id: "file-podcast-wav", bucketId: "bucket-local", parentId: "folder-media-audio", kind: "file", name: "weekly-sync.wav", ext: "wav", size: 48600000, updatedAt: "2026-03-09 22:05", mediaType: "audio" },
  { id: "file-prd-docx", bucketId: "bucket-local", parentId: "folder-docs-prd", kind: "file", name: "cloudrave-prd-v3.docx", ext: "docx", size: 2400000, updatedAt: "2026-03-11 07:52", mediaType: "document" },
  { id: "file-spec-pdf", bucketId: "bucket-local", parentId: "folder-docs-prd", kind: "file", name: "storage-spec.pdf", ext: "pdf", size: 6100000, updatedAt: "2026-03-10 09:18", mediaType: "document" },
  { id: "file-sheet-xlsx", bucketId: "bucket-local", parentId: "folder-project", kind: "file", name: "roadmap.xlsx", ext: "xlsx", size: 1800000, updatedAt: "2026-03-11 12:40", mediaType: "document" },
  { id: "file-archive-zip", bucketId: "bucket-local", parentId: "folder-project", kind: "file", name: "design-handoff.zip", ext: "zip", size: 530000000, updatedAt: "2026-03-10 12:50", mediaType: "archive" },
  { id: "file-code-tsx", bucketId: "bucket-local", parentId: "folder-project", kind: "file", name: "settings-page.tsx", ext: "tsx", size: 124000, updatedAt: "2026-03-12 00:14", mediaType: "code" },
  { id: "file-share-pdf", bucketId: "bucket-local", parentId: "folder-shared", kind: "file", name: "合作提案.pdf", ext: "pdf", size: 3800000, updatedAt: "2026-03-08 17:42", mediaType: "document", sharedWithMe: true },
  { id: "file-share-png", bucketId: "bucket-local", parentId: "folder-shared", kind: "file", name: "渠道海报.png", ext: "png", size: 2200000, updatedAt: "2026-03-07 18:08", mediaType: "image", sharedWithMe: true },
  { id: "file-recycle-doc", bucketId: "bucket-local", parentId: "folder-docs", kind: "file", name: "旧版需求说明.docx", ext: "docx", size: 1600000, updatedAt: "2026-03-01 09:30", mediaType: "document", deletedAt: "2026-03-11 20:16" },
  { id: "file-recycle-video", bucketId: "bucket-local", parentId: "folder-media-video", kind: "file", name: "test-render.mp4", ext: "mp4", size: 420000000, updatedAt: "2026-02-28 12:31", mediaType: "video", deletedAt: "2026-03-10 18:05" },
]

export const defaultShares: ShareRecord[] = [
  {
    id: "share-1",
    nodeId: "file-spec-pdf",
    access: "公开链接",
    expiresAt: "2026-04-01 00:00",
    createdAt: "2026-03-09 12:20",
    views: 38,
    downloads: 12,
  },
  {
    id: "share-2",
    nodeId: "file-demo-mp4",
    access: "密码访问",
    expiresAt: "2026-03-20 23:59",
    createdAt: "2026-03-10 15:10",
    views: 15,
    downloads: 5,
  },
]

export const defaultOfflineTasks: OfflineTask[] = [
  {
    id: "offline-1",
    name: "Ubuntu 镜像",
    url: "https://releases.ubuntu.com/24.04/ubuntu.iso",
    status: "下载中",
    progress: 64,
    updatedAt: "2026-03-12 00:14",
  },
  {
    id: "offline-2",
    name: "素材包归档",
    url: "https://cdn.example.com/archive.zip",
    status: "队列中",
    progress: 0,
    updatedAt: "2026-03-11 23:48",
  },
  {
    id: "offline-3",
    name: "培训视频",
    url: "https://media.example.com/training.mp4",
    status: "已完成",
    progress: 100,
    updatedAt: "2026-03-11 21:08",
  },
]

export const defaultAppSnapshot: AppSnapshot = {
  profile: defaultProfile,
  settings: defaultSettings,
  security: defaultSecurity,
  loginActivity: defaultLoginActivity,
  buckets: defaultBuckets,
  activeBucketId: defaultBuckets[0].id,
  nodes: defaultNodes,
  shares: defaultShares,
  offlineTasks: defaultOfflineTasks,
  clipboard: null,
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
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
