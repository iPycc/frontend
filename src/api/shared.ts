import { requestJson } from "@/api/client"
import type { PreviewManifest } from "@/api/files"

export type SharedItem = {
  id: number
  parent_id: number | null
  name: string
  type: "folder" | "file"
  size: number
}

export type SharedMount = {
  id: number
  share_id: string
  access: "public" | "password" | null
  owner_id: number | null
  owner_username: string | null
  owner_avatar: string | null
  available: boolean
  unavailable_reason: string | null
  roots: SharedItem[]
  detail_url: string
  nodes_url: string
  created_at: string
}

export type SharedOwner = {
  id: number
  name: string
  avatar: string | null
  shareCount: number
  itemCount: number
  latestSharedAt: string
  mounts: SharedMount[]
}

export type SharedCreate = {
  share_id: string
  access_token?: string | null
}

export function mountShared(body: SharedCreate) {
  return requestJson<SharedMount>("/shared", { method: "POST", body })
}

export function listShared() {
  return requestJson<SharedMount[]>("/shared")
}

export function listSharedNodes(mountId: number, parentId?: number | null) {
  const query = new URLSearchParams()
  if (parentId !== undefined && parentId !== null) query.set("parent_id", String(parentId))
  const suffix = query.size ? `?${query.toString()}` : ""
  return requestJson<SharedItem[]>(`/shared/${mountId}/nodes${suffix}`)
}

export function unmountShared(mountId: number) {
  return requestJson<{ message: string }>(`/shared/${mountId}`, { method: "DELETE" })
}

export function saveShared(
  mountId: number,
  body: { node_id: number; target_mount_id: number; target_parent_id?: number | null }
) {
  return requestJson<{ id: number; name: string }>(`/shared/${mountId}/save`, {
    method: "POST",
    body,
  })
}

export function buildSharedMountPreviewUrl(mountId: number, nodeId: number) {
  return `/api/v1/shared/${mountId}/preview?node_id=${nodeId}`
}

export function getSharedMountPreviewManifest(mountId: number, nodeId: number, signal?: AbortSignal) {
  return requestJson<PreviewManifest>(
    `/shared/${mountId}/preview/manifest?node_id=${nodeId}`,
    { signal, cache: "no-store" }
  )
}

export function buildSharedMountDownloadUrl(mountId: number, nodeId: number) {
  return `/api/v1/shared/${mountId}/download?node_id=${nodeId}`
}

export function groupSharedOwners(items: SharedMount[]) {
  const groups = new Map<number, SharedOwner>()
  for (const mount of items) {
    if (!mount.owner_id) continue
    const current = groups.get(mount.owner_id)
    const mounts = current ? [...current.mounts, mount] : [mount]
    groups.set(mount.owner_id, {
      id: mount.owner_id,
      name: mount.owner_username ?? current?.name ?? `用户 #${mount.owner_id}`,
      avatar: mount.owner_avatar ?? current?.avatar ?? null,
      shareCount: mounts.length,
      itemCount: mounts.reduce((count, item) => count + item.roots.length, 0),
      latestSharedAt: current && current.latestSharedAt > mount.created_at
        ? current.latestSharedAt
        : mount.created_at,
      mounts,
    })
  }
  return Array.from(groups.values()).sort((left, right) =>
    right.latestSharedAt.localeCompare(left.latestSharedAt)
  )
}
