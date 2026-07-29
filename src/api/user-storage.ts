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
  provider: "local_fs" | "tencent_cos"
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
