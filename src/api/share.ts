import { requestJson } from "@/api/client"

export enum ShareAccess {
  PUBLIC = "public",
  PASSWORD = "password",
}

export type ShareCreateInput = {
  node_id: number
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
  node_id: number
  node_name: string
  node_type: string
  expires_at: string | null
  max_downloads: number | null
  download_count: number
  view_count: number
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

export async function getShareInfo(shareId: string) {
  return requestJson<ShareNodeInfo>(`/share/${shareId}`)
}

export async function verifySharePassword(shareId: string, body: ShareVerifyInput) {
  return requestJson<ShareAccessTokenResponse>(`/share/${shareId}/verify`, {
    method: "POST",
    body,
  })
}

export function buildSharedDownloadUrl(shareId: string, accessToken?: string | null) {
  const url = `/api/v1/share/${shareId}/download`
  if (!accessToken) return url
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}access_token=${encodeURIComponent(accessToken)}`
}
