/**
 * 类型定义统一从 @/lib/types 导入，此处做 re-export 以保持向后兼容。
 */
export type {
  ThemeMode,
  SortValue,
  ViewMode,
  MediaType,
  UserProfile,
  UserSettings,
  PasskeyCredential,
  SecurityState,
  MockAuthUser,
  AuthState,
  LoginActivityEntry,
  BucketStrategy,
  BucketMount,
  FileNode,
  ShareRecord,
  OfflineTask,
  ClipboardState,
  AppSnapshot,
} from "@/lib/types"

import type {
  UserProfile,
  UserSettings,
  SecurityState,
  MockAuthUser,
  AuthState,
  LoginActivityEntry,
  BucketMount,
  FileNode,
  ShareRecord,
  OfflineTask,
  AppSnapshot,
} from "@/lib/types"

const localRootId = "bucket-local-root"

export const defaultProfile: UserProfile = {
  username: "Cloudrave Admin",
  avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Cloudrave",
  email: "admin@cloudrave.org",
  uid: "u_20260310_a8m1",
  registeredAt: "2025-12-18 09:24",
  group: "超级管理员",
  homepage: "https://cloudrave.app/u/cloudrave-admin",
}

export const defaultSettings: UserSettings = {
  language: "zh-CN",
  timezone: "Asia/Shanghai",
  themeMode: "light",
  accentTheme: "默认蓝",
  showSidebarTree: true,
}

export const defaultSecurity: SecurityState = {
  passwordVerified: false,
  passwordUpdatedAt: "2026-02-28 18:30",
  twoFactorEnabled: false,
  passkeysEnabled: true,
  passkeys: [
    {
      id: "passkey-1",
      name: "Windows 上的 Chrome",
      createdAt: "2026-01-22 03:47",
      lastUsedAt: "2026-03-15 09:12",
    },
  ],
}

export const defaultMockAuthUsers: MockAuthUser[] = [
  {
    id: "auth-admin",
    email: "admin@cloudrave.org",
    password: "admin123",
    username: "Cloudrave Admin",
    avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Cloudrave",
    group: "超级管理员",
    registeredAt: "2025-12-18 09:24",
  },
]

export const defaultAuth: AuthState = {
  currentUserId: null,
  users: defaultMockAuthUsers,
}

export const defaultLoginActivity: LoginActivityEntry[] = [
  { id: "login-1", method: "通行密钥 - Windows 上的 Chrome", device: "Chrome - Windows - Other", ip: "188.253.4.192", time: "1 小时前" },
  { id: "login-2", method: "QQ", device: "Chrome - Windows - Other", ip: "188.253.4.192", time: "1 小时前" },
  { id: "login-3", method: "QQ", device: "Chrome - Windows - Other", ip: "2409:8a56:2331:43f1:d6f:5320:38b8:ff86", time: "2026/3/4 21:54:45" },
  { id: "login-4", method: "通行密钥 - Windows 上的 Chrome", device: "Chrome - Windows - Other", ip: "103.220.218.90", time: "2026/1/22 03:47:45" },
  { id: "login-5", method: "QQ", device: "Chrome - Windows - Other", ip: "103.220.218.90", time: "2026/1/22 03:47:24" },
  { id: "login-6", method: "QQ", device: "Chrome - Windows - Other", ip: "188.253.124.85", time: "2026/1/9 21:40:38" },
]

export const defaultBuckets: BucketMount[] = [
  {
    id: "bucket-local",
    name: "我的腾讯云存储",
    provider: "Tencent COS",
    region: "ap-guangzhou",
    endpoint: "cos.ap-guangzhou.myqcloud.com",
    bucket: "cloudrave-assets-prod-1250000000",
    basePrefix: "team-assets",
    secretId: "AKID********************",
    secretKey: "********************************",
    strategy: {
      multipartThreshold: "64 MB",
      partSize: "16 MB",
      presignTtl: "900",
      concurrency: 4,
      protocol: "https",
      pathStyle: false,
      accelerate: false,
    },
    rootNodeId: localRootId,
    createdAt: "2026-03-10 10:00",
    corsStatus: "healthy",
    corsMessage: "存储桶域名和签名策略已同步",
    advancedMode: true,
    isLocal: false,
    canEditConnection: true,
    canDelete: false,
    canRename: true,
    quota: { used: 12.6 * 1024 * 1024 * 1024, total: 128 * 1024 * 1024 * 1024 },
  },
]

export const defaultNodes: FileNode[] = ([
  { id: localRootId, bucketId: "bucket-local", parentId: null, kind: "folder", name: "我的腾讯云存储", updatedAt: "2026-03-12 00:00", isSystemRoot: true },
  { id: "folder-design", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "设计资源", updatedAt: "2026-03-12 00:12" },
  { id: "folder-docs", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "产品文档", updatedAt: "2026-03-11 17:25" },
  { id: "folder-media", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "媒体库", updatedAt: "2026-03-10 20:08" },
  { id: "folder-project", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "项目 Alpha", updatedAt: "2026-03-11 14:46" },
  { id: "folder-shared", bucketId: "bucket-local", parentId: localRootId, kind: "folder", name: "团队共享", updatedAt: "2026-03-09 13:28" },
  { id: "file-courseware-1", bucketId: "bucket-local", parentId: localRootId, kind: "file", name: "新生第一课.pptx", ext: "pptx", size: 4200000, updatedAt: "2026-03-12 08:12", mediaType: "document" },
  { id: "file-courseware-2", bucketId: "bucket-local", parentId: localRootId, kind: "file", name: "第二章导学.pptx", ext: "pptx", size: 3900000, updatedAt: "2026-03-12 07:42", mediaType: "document" },
  { id: "file-courseware-3", bucketId: "bucket-local", parentId: localRootId, kind: "file", name: "课堂练习题.pptx", ext: "pptx", size: 5100000, updatedAt: "2026-03-11 20:18", mediaType: "document" },
  { id: "file-courseware-4", bucketId: "bucket-local", parentId: localRootId, kind: "file", name: "结课复习.pptx", ext: "pptx", size: 3600000, updatedAt: "2026-03-11 18:46", mediaType: "document" },
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
] as FileNode[]).map(node => {
  if (node.kind === "file" && (node.mediaType === "image" || node.mediaType === "video")) {
    return { ...node, preview: `https://picsum.photos/seed/${node.id}/1920/1080` }
  }
  return node
})

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
  auth: defaultAuth,
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
