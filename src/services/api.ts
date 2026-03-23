/**
 * Cloudrave API 服务层
 *
 * 定义所有与后端交互的接口抽象。
 * 当前使用 mock 实现（通过 app-state 本地状态），
 * 后续对接真实后端时，只需在此文件中替换各方法的实现即可。
 */

import type {
  AuthState,
  BucketMount,
  FileNode,
  LoginActivityEntry,
  OfflineTask,
  SecurityState,
  ShareRecord,
  UserProfile,
  UserSettings,
} from "@/lib/types"

/* ------------------------------------------------------------------ */
/*  认证模块                                                           */
/* ------------------------------------------------------------------ */

export interface AuthApi {
  /** 邮箱密码登录 */
  login(email: string, password: string): Promise<{ success: boolean; message?: string }>
  /** 注册 */
  register(input: { email: string; password: string; username: string }): Promise<{ success: boolean; message?: string }>
  /** 登出 */
  logout(): Promise<void>
  /** 获取当前登录状态 */
  getAuthState(): Promise<AuthState>
}

/* ------------------------------------------------------------------ */
/*  用户模块                                                           */
/* ------------------------------------------------------------------ */

export interface UserApi {
  /** 获取用户资料 */
  getProfile(): Promise<UserProfile>
  /** 更新用户资料 */
  updateProfile(patch: Partial<UserProfile>): Promise<UserProfile>
  /** 获取用户设置 */
  getSettings(): Promise<UserSettings>
  /** 更新用户设置 */
  updateSettings(patch: Partial<UserSettings>): Promise<UserSettings>
  /** 获取安全设置 */
  getSecurity(): Promise<SecurityState>
  /** 更新安全设置 */
  updateSecurity(patch: Partial<SecurityState>): Promise<SecurityState>
  /** 验证密码 */
  verifyPassword(password: string): Promise<boolean>
  /** 获取登录记录 */
  getLoginActivity(): Promise<LoginActivityEntry[]>
}

/* ------------------------------------------------------------------ */
/*  存储桶模块                                                         */
/* ------------------------------------------------------------------ */

export interface BucketApi {
  /** 获取所有存储桶 */
  listBuckets(): Promise<BucketMount[]>
  /** 获取单个存储桶 */
  getBucket(bucketId: string): Promise<BucketMount>
  /** 创建存储桶 */
  createBucket(input: Omit<BucketMount, "id" | "rootNodeId" | "createdAt">): Promise<BucketMount>
  /** 更新存储桶 */
  updateBucket(bucketId: string, patch: Partial<BucketMount>): Promise<BucketMount>
  /** 重命名存储桶 */
  renameBucket(bucketId: string, name: string): Promise<void>
  /** 删除存储桶 */
  deleteBucket(bucketId: string): Promise<void>
}

/* ------------------------------------------------------------------ */
/*  文件模块                                                           */
/* ------------------------------------------------------------------ */

export interface FileApi {
  /** 获取文件夹下的节点列表 */
  listNodes(folderId: string, bucketId: string): Promise<FileNode[]>
  /** 获取单个节点 */
  getNode(nodeId: string): Promise<FileNode>
  /** 创建文件夹 */
  createFolder(parentId: string, name: string, bucketId: string): Promise<FileNode>
  /** 重命名节点 */
  renameNode(nodeId: string, name: string): Promise<void>
  /** 移动节点 */
  moveNodes(nodeIds: string[], targetParentId: string, bucketId: string): Promise<void>
  /** 复制节点 */
  duplicateNodes(nodeIds: string[]): Promise<FileNode[]>
  /** 删除节点（移入回收站） */
  deleteNodes(nodeIds: string[]): Promise<void>
  /** 恢复节点 */
  restoreNodes(nodeIds: string[]): Promise<void>
  /** 永久删除节点 */
  permanentlyDeleteNodes(nodeIds: string[]): Promise<void>
  /** 按分类获取文件 */
  getCategoryNodes(category: "image" | "video" | "audio" | "document", bucketId: string): Promise<FileNode[]>
  /** 获取回收站节点 */
  getRecycleNodes(): Promise<FileNode[]>
  /** 获取与我共享的节点 */
  getSharedWithMeNodes(): Promise<FileNode[]>
}

/* ------------------------------------------------------------------ */
/*  分享模块                                                           */
/* ------------------------------------------------------------------ */

export interface ShareApi {
  /** 获取分享记录 */
  listShares(): Promise<ShareRecord[]>
  /** 创建分享 */
  createShare(nodeIds: string[]): Promise<ShareRecord[]>
  /** 删除分享 */
  deleteShare(shareId: string): Promise<void>
}

/* ------------------------------------------------------------------ */
/*  离线任务模块                                                       */
/* ------------------------------------------------------------------ */

export interface OfflineTaskApi {
  /** 获取离线任务列表 */
  listTasks(): Promise<OfflineTask[]>
  /** 添加离线任务 */
  addTask(url: string): Promise<OfflineTask>
  /** 删除离线任务 */
  deleteTask(taskId: string): Promise<void>
}

/* ------------------------------------------------------------------ */
/*  统一 API 入口                                                      */
/* ------------------------------------------------------------------ */

export interface CloudraveApi {
  auth: AuthApi
  user: UserApi
  bucket: BucketApi
  file: FileApi
  share: ShareApi
  offlineTask: OfflineTaskApi
}
