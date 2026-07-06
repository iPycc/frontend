import { requestJson } from "./client"

export type StoragePolicy = {
  id: number
  name: string
  provider: "local_fs" | "tencent_cos"
  bucket_name: string
  region?: string | null
  endpoint?: string | null
  base_prefix: string
  secret_id?: string | null
  secret_key?: string | null
  session_token?: string | null
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

export type BucketMount = {
  id: number
  owner_id: number
  policy_id: number
  name: string
  mount_slug: string
  root_path: string
  provider_label?: string | null
  is_enabled: boolean
  quota_bytes?: number | null
  extra: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CreateStoragePolicyInput = {
  name: string
  provider: "local_fs" | "tencent_cos"
  bucket_name: string
  region?: string | null
  endpoint?: string | null
  base_prefix?: string
  secret_id?: string | null
  secret_key?: string | null
  session_token?: string | null
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
  quota_bytes?: number | null
  extra?: Record<string, unknown>
}
export type UpdateBucketMountInput = Partial<CreateBucketMountInput>

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

export async function deleteMount(token: string, mountId: number) {
  return requestJson<{ message: string }>(`/admin/mount/${mountId}`, {
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
