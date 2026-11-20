import { requestJson } from "./client"

import type {
  BucketMount,
  CreateBucketMountInput,
  CreateStoragePolicyInput,
  MountSyncResult,
  StoragePolicy,
  UpdateBucketMountInput,
  UpdateStoragePolicyInput,
} from "./storage"

export type UserMountResource = {
  policy: StoragePolicy
  mount: BucketMount
}

export type UserMountDeletePreview = {
  mount_id: number
  mount_name: string
  provider: string
  bucket_name: string
  prefix: string
  file_count: number
  folder_count: number
  active_upload_count: number
  pending_cleanup_count: number
  remote_objects: boolean | null
  has_contents: boolean
}

export type UserMountDeleteResult = {
  message: string
  deleted_objects: number
  policy_deleted: boolean
}

type UserBucketMountInput = Omit<CreateBucketMountInput, "policy_id" | "owner_id">

export type OssDomainResult = {
  cname_target: string
  domains?: { domain: string; status: string }[]
  domain?: string
  txt_name?: string
  token?: string
  expires_at?: string
  status?: string
  bound?: boolean
  test_url?: string
}

export async function manageOssDomains(token: string, mountId: number, action: "list" | "token" | "bind" | "unbind" | "check", domain = "") {
  return requestJson<OssDomainResult>(`/mounts/${mountId}/oss/domains`, {
    method: "POST", token, body: { action, domain },
  })
}

export async function createUserMount(
  token: string,
  policy: CreateStoragePolicyInput,
  mount: UserBucketMountInput
) {
  return requestJson<UserMountResource>("/mounts", {
    method: "POST",
    token,
    body: { policy, mount },
  })
}

export async function updateUserMount(
  token: string,
  mountId: number,
  policy: UpdateStoragePolicyInput,
  mount: UpdateBucketMountInput
) {
  return requestJson<UserMountResource>(`/mounts/${mountId}`, {
    method: "PATCH",
    token,
    body: { policy, mount },
  })
}

export async function getUserMountDeletePreview(token: string, mountId: number) {
  return requestJson<UserMountDeletePreview>(`/mounts/${mountId}/delete-preview`, { token })
}

export async function deleteUserMount(token: string, mountId: number, deleteObjects = false) {
  return requestJson<UserMountDeleteResult>(`/mounts/${mountId}?delete_objects=${deleteObjects}`, {
    method: "DELETE",
    token,
  })
}

export async function applyUserMountCors(token: string, mountId: number) {
  return requestJson<Record<string, unknown>>(`/mounts/${mountId}/cors/auto-config`, {
    method: "POST",
    token,
  })
}

export async function getUserMountSync(token: string, mountId: number, signal?: AbortSignal) {
  return requestJson<MountSyncResult>(`/mounts/${mountId}/sync`, { token, signal })
}

export type MountSyncTask = {
  id: string
  mount_id: number
  owner_id: number
  status: "pending" | "running" | "paused" | "completed" | "failed" | "canceled"
  error?: string | null
  name?: string | null
  scanned: number
  created: number
  updated: number
  conflicts: number
  skipped: number
  missing: number
  created_at: string
  updated_at: string
}

export function startUserMountSyncTask(token: string, mountId: number) {
  return requestJson<MountSyncTask>(`/mounts/${mountId}/sync/task`, {
    method: "POST",
    token,
  })
}

export function controlUserMountSyncTask(mountId: number, taskId: string, action: "pause" | "resume" | "cancel") {
  return requestJson<MountSyncTask>(`/mounts/${mountId}/sync/task/${encodeURIComponent(taskId)}/${action}`, {
    method: "POST",
  })
}

export function listMountSyncTasks() {
  return requestJson<MountSyncTask[]>("/explorer/sync-tasks")
}

export type PathPlanTask = {
  migration?: {
    id: string
    status: "pending" | "running" | "paused" | "completed" | "failed" | "canceled"
    migrated: number
    prepared?: number
    conflicts: number
    error: string | null
  } | null
  id: string
  mount_id: number
  name: string | null
  template: string
  rename_to?: string | null
  move_to?: number | null
  copy_to?: number | null
  copy_name?: string | null
  root_node_id?: number | null
  is_restore?: boolean
  source_name?: string | null
  status: MountSyncTask["status"]
  scanned: number
  ready: number
  unchanged: number
  conflicts: number
  bytes_to_copy: number
  error: string | null
}

export type PathPlanConflict = { id: number; node_id: number; source: string | null; target: string | null; reason: string }

export type PathTemplatePreview = {
  root_key: string
  nested_key: string
  directory_key: string
}

export function previewPathTemplate(mountId: number, template: string, signal: AbortSignal) {
  return requestJson<PathTemplatePreview>(`/mounts/${mountId}/path-plan/preview`, {
    method: "POST", body: { template }, signal,
  })
}

export function startPathPlan(mountId: number, template: string) {
  return requestJson<PathPlanTask>(`/mounts/${mountId}/path-plan`, { method: "POST", body: { template } })
}

export function controlPathPlan(task: PathPlanTask, action: "pause" | "resume" | "cancel") {
  return requestJson<PathPlanTask>(`/mounts/${task.mount_id}/path-plan/${encodeURIComponent(task.id)}/${action}`, { method: "POST" })
}

export function controlPathMigration(task: PathPlanTask, action: "start" | "pause" | "resume" | "cancel") {
  return requestJson<PathPlanTask["migration"]>(
    `/mounts/${task.mount_id}/path-plan/${encodeURIComponent(task.id)}/migrate/${action}`, { method: "POST" }
  )
}

export function listPathPlans() {
  return requestJson<PathPlanTask[]>("/explorer/path-plans")
}

export function listPathPlanConflicts(taskId: string, afterId = 0, signal?: AbortSignal) {
  return requestJson<{ items: PathPlanConflict[]; next_after_id: number | null }>(
    `/explorer/path-plans/${encodeURIComponent(taskId)}/conflicts?after_id=${afterId}&limit=100`, { signal })
}

export type MountSyncConflict = {
  id: number
  key: string
  reason: "invalid_path" | "folder_conflict" | "source_unavailable" | "indexed_elsewhere" | "name_conflict"
}

export type MountSyncConflictPage = {
  items: MountSyncConflict[]
  next_after_id: number | null
}

export function listMountSyncConflicts(taskId: string, afterId = 0, signal?: AbortSignal) {
  return requestJson<MountSyncConflictPage>(
    `/explorer/sync-tasks/${encodeURIComponent(taskId)}/conflicts?after_id=${afterId}&limit=100`,
    { signal }
  )
}

export async function syncUserMount(token: string, mountId: number, signal?: AbortSignal) {
  return requestJson<MountSyncResult>(`/mounts/${mountId}/sync`, {
    method: "POST",
    token,
    body: {},
    signal,
  })
}

export async function syncUserMountPages(token: string, mountId: number, signal?: AbortSignal) {
  let result = await syncUserMount(token, mountId, signal)
  while (!result.complete && result.status === "running") {
    result = await syncUserMount(token, mountId, signal)
  }
  return result
}
