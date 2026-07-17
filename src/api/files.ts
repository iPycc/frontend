import { requestJson } from "./client"
import type { SortValue } from "@/lib/models"

export type ExplorerMount = {
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

export type ExplorerNode = {
  id: number
  owner_id: number
  mount_id: number
  parent_id?: number | null
  type: "folder" | "file"
  status: "active" | "deleted"
  name: string
  blob_path?: string | null
  size: number
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export type CreateFolderInput = {
  mount_id: number
  parent_id?: number | null
  name: string
}

export type RenameNodeInput = {
  name: string
}

export type DeleteNodesInput = {
  node_ids: number[]
  hard_delete: boolean
}

export type RestoreNodesInput = {
  node_ids: number[]
}

export type ExplorerNodePage = {
  items: ExplorerNode[]
  next_cursor: string | null
}

export type ListNodePageOptions = {
  mountId: number
  parentId?: number | null
  limit: number
  cursor?: string | null
  sort?: SortValue
  foldersOnly?: boolean
}

export type ExplorerNodeSearchResult = {
  node: ExplorerNode
  parent_path: string
}

export async function listUserMounts(token: string) {
  return requestJson<ExplorerMount[]>("/explorer/mount", {
    token,
  })
}

export async function listNodes(token: string, mountId: number, parentId?: number | null) {
  const query = new URLSearchParams({ mount_id: String(mountId) })
  if (parentId !== undefined && parentId !== null) {
    query.set("parent_id", String(parentId))
  }

  return requestJson<ExplorerNode[]>(`/explorer/node?${query.toString()}`, { token })
}

export async function listNodePage(token: string, options: ListNodePageOptions) {
  const query = new URLSearchParams({
    mount_id: String(options.mountId),
    limit: String(options.limit),
    sort: options.sort ?? "name-asc",
  })
  if (options.parentId !== undefined && options.parentId !== null) {
    query.set("parent_id", String(options.parentId))
  }
  if (options.cursor) {
    query.set("cursor", options.cursor)
  }
  if (options.foldersOnly) {
    query.set("folders_only", "true")
  }

  return requestJson<ExplorerNodePage>(`/explorer/node/page?${query.toString()}`, { token })
}

export async function listCategoryNodePage(
  token: string,
  options: Omit<ListNodePageOptions, "parentId" | "foldersOnly"> & {
    category: "image" | "video" | "audio" | "document"
  }
) {
  const query = new URLSearchParams({
    mount_id: String(options.mountId),
    category: options.category,
    limit: String(options.limit),
    sort: options.sort ?? "name-asc",
  })
  if (options.cursor) {
    query.set("cursor", options.cursor)
  }

  return requestJson<ExplorerNodePage>(`/explorer/node/category?${query.toString()}`, { token })
}

export async function searchNodes(
  token: string,
  mountId: number,
  queryText: string,
  signal?: AbortSignal
) {
  const query = new URLSearchParams({
    mount_id: String(mountId),
    q: queryText,
    limit: "20",
  })
  return requestJson<ExplorerNodeSearchResult[]>(`/explorer/node/search?${query.toString()}`, {
    token,
    signal,
  })
}

export async function createFolder(token: string, body: CreateFolderInput) {
  return requestJson<ExplorerNode>("/explorer/node/folder", {
    method: "POST",
    token,
    body,
  })
}

export async function renameNode(token: string, nodeId: number, body: RenameNodeInput) {
  return requestJson<ExplorerNode>(`/explorer/node/${nodeId}`, {
    method: "PATCH",
    token,
    body,
  })
}

export async function deleteNodes(token: string, body: DeleteNodesInput) {
  return requestJson<Record<string, unknown>>("/explorer/node", {
    method: "DELETE",
    token,
    body,
  })
}

export async function listRecycle(token: string) {
  return requestJson<ExplorerNode[]>("/explorer/recycle", { token })
}

export async function restoreNodes(token: string, body: RestoreNodesInput) {
  return requestJson<ExplorerNode[]>("/explorer/recycle/restore", {
    method: "POST",
    token,
    body,
  })
}

export async function permanentlyDeleteRecycleNodes(token: string, body: DeleteNodesInput) {
  return requestJson<Record<string, unknown>>("/explorer/recycle", {
    method: "DELETE",
    token,
    body,
  })
}

export function buildDownloadUrl(nodeId: number) {
  return `/api/v1/explorer/download/${nodeId}`
}

export function buildFolderDownloadUrl(nodeId: number) {
  return `/api/v1/explorer/download/folder/${nodeId}`
}
