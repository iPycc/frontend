import { requestJson } from "./client"

export type UploadMode = "single_put" | "multipart"
export type UploadRequestMode = "auto" | UploadMode

export type UploadPartPlan = {
  part_number: number
  method: string
  url: string
  headers: Record<string, string>
  expires_at?: string | null
}

export type UploadSessionPlan = {
  session_id: string
  upload_mode: UploadMode
  upload_id?: string | null
  object_key: string
  part_size: number
  part_count?: number
  upload_urls: UploadPartPlan[]
  expires_at?: string | null
  is_duplicate?: boolean
  node_id?: number | null
}

export type UploadSession = {
  id: string
  mount_id: number
  node_id?: number | null
  path: string
  mode: UploadMode
  state: "created" | "uploading" | "completing" | "aborting" | "completed" | "aborted" | "expired" | "failed"
  upload_id?: string | null
  file_name: string
  content_type?: string | null
  checksum?: string | null
  size: number
  part_size: number
  created_at: string
  updated_at: string
  parts: Array<{
    id: number
    part_number: number
    etag?: string | null
    size: number
    uploaded_at: string
  }>
}

export type CreateUploadSessionInput = {
  mount_id: number
  parent_id?: number | null
  file_name: string
  relative_path?: string | null
  checksum?: string | null | undefined
  object_key?: string | null
  mode?: UploadRequestMode
  size: number
  part_size?: number
  content_type?: string | null
}

export async function createUploadSession(token: string, body: CreateUploadSessionInput) {
  return requestJson<UploadSessionPlan>("/explorer/upload", {
    method: "POST",
    token,
    body,
  })
}

export async function getUploadSession(token: string, sessionId: string) {
  return requestJson<UploadSession>(`/explorer/upload/${sessionId}`, {
    token,
  })
}

export async function getUploadPartUrl(
  token: string,
  sessionId: string,
  partNumber: number,
  signal?: AbortSignal
) {
  return requestJson<UploadPartPlan>(`/explorer/upload/${sessionId}/part/${partNumber}/url`, {
    token,
    signal,
  })
}

export async function uploadLocalPart(
  token: string,
  sessionId: string,
  file: Blob,
  partNumber: number,
  size?: number,
  signal?: AbortSignal
) {
  const form = new FormData()
  form.set("part_number", String(partNumber))
  form.set("size", String(size ?? file.size))
  form.set("file", file)

  return requestJson<UploadSession["parts"][number]>(`/explorer/upload/${sessionId}/part`, {
    method: "POST",
    token,
    body: form,
    signal,
  })
}

export async function recordRemotePart(
  token: string,
  sessionId: string,
  partNumber: number,
  etag: string,
  size: number,
  signal?: AbortSignal
) {
  const form = new FormData()
  form.set("part_number", String(partNumber))
  form.set("etag", etag)
  form.set("size", String(size))

  return requestJson<UploadSession["parts"][number]>(`/explorer/upload/${sessionId}/part`, {
    method: "POST",
    token,
    body: form,
    signal,
  })
}

export async function completeUpload(
  token: string,
  sessionId: string,
  parts: Array<{ part_number: number; etag: string; size: number }>
) {
  return requestJson<UploadSession>(`/explorer/upload/${sessionId}/complete`, {
    method: "POST",
    token,
    body: { parts },
  })
}

export async function abortUpload(token: string, sessionId: string, reason?: string) {
  return requestJson<UploadSession>(`/explorer/upload/${sessionId}/abort`, {
    method: "POST",
    token,
    body: { reason },
  })
}
