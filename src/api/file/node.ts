import { requestJson } from "@/api/client"
import type {
  CreateFileInput,
  CreateFolderInput,
  DeleteNodesInput,
  ExplorerMount,
  ExplorerNode,
  ExplorerNodePage,
  ExplorerNodeSearchResult,
  ListNodePageOptions,
  NodeActivity,
  RenameNodeInput,
  RestoreNodesInput,
  TransferNodesInput,
} from "@/api/file/type"

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

export async function listNodesForDownload(mountId: number, parentId: number) {
  const query = new URLSearchParams({ mount_id: String(mountId), parent_id: String(parentId) })
  return requestJson<ExplorerNode[]>(`/explorer/node?${query.toString()}`)
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

export async function createFile(token: string, body: CreateFileInput) {
  return requestJson<ExplorerNode>("/explorer/node/file", {
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

export async function moveNodes(token: string, body: TransferNodesInput) {
  return requestJson<ExplorerNode[]>("/explorer/node/move", {
    method: "POST",
    token,
    body,
  })
}

export async function copyNodes(token: string, body: TransferNodesInput) {
  return requestJson<ExplorerNode[]>("/explorer/node/copy", {
    method: "POST",
    token,
    body,
  })
}

export function recordNodeOpen(nodeId: number) {
  return requestJson<void>(`/explorer/node/${nodeId}/open`, { method: "POST" })
}

export function listNodeActivity(nodeId: number) {
  return requestJson<NodeActivity[]>(`/explorer/node/${nodeId}/activity`)
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
