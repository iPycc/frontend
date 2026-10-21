import { requestJson } from "./client"

export type StorageDriverId =
  | "local_fs"
  | "tencent_cos"
  | "aliyun_oss"
  | "drive_139"
  | "drive_189"
  | "drive_wo"
  | (string & {})

export type StorageDriver = {
  id: StorageDriverId
  label: string
  kind: string
  icon_key: string
  enabled: boolean
  capabilities: string[]
}

export type StorageDriverInspection = {
  provider: StorageDriverId
  account_id: string
  display_name?: string | null
  root_id: string
  used_bytes: number
  total_bytes: number
  free_bytes: number
  extra: Record<string, unknown>
}

export type StoragePolicy = {
  id: number
  name: string
  provider: StorageDriverId
  bucket_name: string
  region?: string | null
  endpoint?: string | null
  base_prefix: string
  credentials_configured: boolean
  credential_fields: string[]
  status: string
  description?: string | null
  multipart_threshold_mb: number
  part_size_mb: number
  presign_ttl_seconds: number
  is_default: boolean
  cors_auto_configured: boolean
  extra: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type MountMode = "managed" | "mirror"
export type MountSyncStatus = "never" | "idle" | "pending" | "running" | "completed" | "failed"

export type MountSyncResult = {
  mount_id: number
  mode: MountMode
  status: MountSyncStatus
  generation?: string | null
  cursor?: string | null
  complete: boolean
  started_at?: string | null
  completed_at?: string | null
  scanned: number
  created: number
  updated: number
  unchanged: number
  conflicts: number
  missing: number
  synced_objects: number
  error?: string | null
}

export type BucketMount = {
  id: number
  owner_id: number
  policy_id: number
  name: string
  mount_slug: string
  root_path: string
  provider_label?: string | null
  driver_id: StorageDriverId
  driver_label: string
  driver_kind: string
  driver_capabilities: string[]
  is_enabled: boolean
  mode: MountMode
  read_only: boolean
  legacy_prefixed_keys: boolean
  sync_status: MountSyncStatus
  last_sync_at?: string | null
  sync_error?: string | null
  synced_objects: number
  quota_bytes?: number | null
  extra: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type MountDeletePreview = {
  mount_id: number
  mount_name: string
  provider: StorageDriverId
  bucket_name: string
  prefix: string
  file_count: number
  folder_count: number
  active_upload_count: number
  pending_cleanup_count: number
  remote_objects: boolean | null
  has_contents: boolean
}

export type MountDeleteResult = {
  message: string
  deleted_objects: number
}

export type CreateStoragePolicyInput = {
  name: string
  provider: StorageDriverId
  bucket_name: string
  region?: string | null
  endpoint?: string | null
  base_prefix?: string
  credentials?: Record<string, string>
  status?: string
  description?: string | null
  multipart_threshold_mb?: number
  part_size_mb?: number
  presign_ttl_seconds?: number
  is_default?: boolean
  cors_auto_configured?: boolean
  extra?: Record<string, unknown>
}
export type UpdateStoragePolicyInput = Partial<CreateStoragePolicyInput>
export type CreateBucketMountInput = {
  owner_id?: number | null
  policy_id: number
  name: string
  mount_slug: string
  root_path?: string
  provider_label?: string | null
  is_enabled?: boolean
  mode?: MountMode
  read_only?: boolean
  legacy_prefixed_keys?: boolean
  quota_bytes?: number | null
  extra?: Record<string, unknown>
}
export type UpdateBucketMountInput = Partial<CreateBucketMountInput>

export async function listStorageDrivers(token: string) {
  return requestJson<StorageDriver[]>("/storage/drivers", { token })
}

export async function inspectStorageDriver(
  token: string,
  provider: StorageDriverId,
  credentials: Record<string, string>
) {
  return requestJson<StorageDriverInspection>(`/storage/drivers/${provider}/inspect`, {
    method: "POST",
    token,
    body: { credentials },
  })
}

export async function listPolicies(token: string) {
  return requestJson<StoragePolicy[]>("/admin/policy", { token })
}

export async function createPolicy(token: string, body: CreateStoragePolicyInput) {
  return requestJson<StoragePolicy>("/admin/policy", {
    method: "POST",
    token,
    body,
  })
}

export async function updatePolicy(token: string, policyId: number, body: UpdateStoragePolicyInput) {
  return requestJson<StoragePolicy>(`/admin/policy/${policyId}`, {
    method: "PATCH",
    token,
    body,
  })
}

export async function deletePolicy(token: string, policyId: number) {
  return requestJson<{ message: string }>(`/admin/policy/${policyId}`, {
    method: "DELETE",
    token,
  })
}

export async function listMounts(token: string) {
  return requestJson<BucketMount[]>("/admin/mount", { token })
}

export async function createMount(token: string, body: CreateBucketMountInput) {
  return requestJson<BucketMount>("/admin/mount", {
    method: "POST",
    token,
    body,
  })
}

export async function updateMount(token: string, mountId: number, body: UpdateBucketMountInput) {
  return requestJson<BucketMount>(`/admin/mount/${mountId}`, {
    method: "PATCH",
    token,
    body,
  })
}

export async function getMountDeletePreview(token: string, mountId: number) {
  return requestJson<MountDeletePreview>(`/admin/mount/${mountId}/delete-preview`, { token })
}

export async function deleteMount(token: string, mountId: number, deleteObjects = false) {
  return requestJson<MountDeleteResult>(`/admin/mount/${mountId}?delete_objects=${deleteObjects}`, {
    method: "DELETE",
    token,
  })
}

export async function applyMountCors(token: string, mountId: number) {
  return requestJson<Record<string, unknown>>(`/admin/mount/${mountId}/cors/apply`, {
    method: "POST",
    token,
  })
}

export async function getMountSync(token: string, mountId: number, signal?: AbortSignal) {
  return requestJson<MountSyncResult>(`/admin/mount/${mountId}/sync`, { token, signal })
}

export async function syncMount(token: string, mountId: number, signal?: AbortSignal) {
  return requestJson<MountSyncResult>(`/admin/mount/${mountId}/sync`, {
    method: "POST",
    token,
    signal,
    body: { page_size: 500, max_pages: 1 },
  })
}

export async function syncMountPages(token: string, mountId: number, signal?: AbortSignal) {
  let result = await syncMount(token, mountId, signal)
  for (let batch = 1; batch < 4 && result.status === "running" && result.cursor && !result.complete; batch += 1) {
    result = await syncMount(token, mountId, signal)
  }
  return result
}
