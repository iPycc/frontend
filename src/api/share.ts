import { requestJson } from "@/api/client"

export enum ShareAccess {
  PUBLIC = "public",
  PASSWORD = "password",
}

export type ShareCreateInput = {
  node_ids: number[]
  access: ShareAccess
  password?: string | null
  expires_in_hours?: number | null
  max_downloads?: number | null
}

export type ShareRead = {
  id: string
  node_id: number
  access: ShareAccess
  expires_at: string | null
  max_downloads: number | null
  download_count: number
  view_count: number
  is_active: boolean
  created_at: string
  node_name: string | null
  node_type: "folder" | "file" | null
  node_size: number | null
  item_count: number
}

export type ShareVerifyInput = {
  password?: string | null
}

export type ShareAccessTokenResponse = {
  access_token: string
}

export type ShareNodeInfo = {
  share_id: string
  access: ShareAccess
  node_id: number | null
  node_name: string
  node_type: string
  node_size: number
  owner_name: string
  owner_avatar: string | null
  expires_at: string | null
  max_downloads: number | null
  download_count: number
  view_count: number
  folder_count: number
  file_count: number
  items: SharedNode[]
}

export type SharedNode = {
  id: number
  parent_id: number | null
  name: string
  type: "folder" | "file"
  size: number
}

export async function createShare(token: string, body: ShareCreateInput) {
  return requestJson<ShareRead>("/share", {
    method: "POST",
    token,
    body,
  })
}

export async function listMyShares(token: string) {
  return requestJson<ShareRead[]>("/share/my", { token })
}

export async function revokeShare(token: string, shareId: string) {
  return requestJson<{ message: string }>(`/share/${shareId}`, {
    method: "DELETE",
    token,
  })
}

export async function getShareInfo(shareId: string, accessToken?: string | null) {
  const query = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : ""
  return requestJson<ShareNodeInfo>(`/share/${shareId}${query}`)
}

export async function listSharedNodes(shareId: string, parentId?: number | null, accessToken?: string | null) {
  const query = new URLSearchParams()
  if (parentId !== undefined && parentId !== null) query.set("parent_id", String(parentId))
  if (accessToken) query.set("access_token", accessToken)
  const suffix = query.size ? `?${query.toString()}` : ""
  return requestJson<SharedNode[]>(`/share/${shareId}/nodes${suffix}`)
}

export async function verifySharePassword(shareId: string, body: ShareVerifyInput) {
  return requestJson<ShareAccessTokenResponse>(`/share/${shareId}/verify`, {
    method: "POST",
    body,
  })
}

export async function recordSharedDirectoryDownload(shareId: string, accessToken?: string | null) {
  const query = accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : ""
  return requestJson<{ message: string }>(`/share/${shareId}/download/record${query}`, { method: "POST" })
}

export function buildSharedDownloadUrl(shareId: string, accessToken?: string | null, nodeId?: number | null) {
  const url = `/api/v1/share/${shareId}/download`
  const query = new URLSearchParams()
  if (accessToken) query.set("access_token", accessToken)
  if (nodeId !== undefined && nodeId !== null) query.set("node_id", String(nodeId))
  return query.size ? `${url}?${query.toString()}` : url
}

export function buildSharedSelectionDownloadUrl(
  shareId: string,
  accessToken: string | null | undefined,
  nodeIds: number[]
) {
  const url = `/api/v1/share/${shareId}/download`
  const query = new URLSearchParams()
  if (accessToken) query.set("access_token", accessToken)
  nodeIds.forEach((nodeId) => query.append("node_ids", String(nodeId)))
  return query.size ? `${url}?${query.toString()}` : url
}

export function buildSharedPreviewUrl(shareId: string, accessToken?: string | null, nodeId?: number | null) {
  const url = `/api/v1/share/${shareId}/preview`
  const query = new URLSearchParams()
  if (accessToken) query.set("access_token", accessToken)
  if (nodeId !== undefined && nodeId !== null) query.set("node_id", String(nodeId))
  return query.size ? `${url}?${query.toString()}` : url
}

export function buildSharedCoverUrl(shareId: string, accessToken?: string | null, nodeId?: number | null) {
  const url = `/api/v1/share/${shareId}/cover`
  const query = new URLSearchParams()
  if (accessToken) query.set("access_token", accessToken)
  if (nodeId !== undefined && nodeId !== null) query.set("node_id", String(nodeId))
  return query.size ? `${url}?${query.toString()}` : url
}
