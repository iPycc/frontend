import { loadFileViewPreferences } from "@/lib/file-view-preferences"
import {
  type AppSnapshot,
  type FileNode,
  type SortValue,
} from "@/lib/models"
import {
  EMPTY_PAGE_STATE,
  categoryPageKey,
  createMountRootNode,
  directoryPageKey,
  type NodeCategory,
  type PageLoadState,
} from "@/state/core"

const FILE_ROUTE_CACHE_KEY = "cloudrave.file-route-cache.v1"
const FILE_ROUTE_CACHE_VERSION = 1
const FILE_ROUTE_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000
const FILE_ROUTE_CATEGORIES = new Set<NodeCategory>(["image", "video", "audio", "document"])

type CachedFileNode = Pick<
  FileNode,
  | "id"
  | "backendId"
  | "bucketId"
  | "mountBackendId"
  | "parentId"
  | "parentBackendId"
  | "kind"
  | "name"
  | "ext"
  | "size"
  | "updatedAt"
  | "createdAt"
  | "mediaType"
>

type CachedFileRoute = {
  version: typeof FILE_ROUTE_CACHE_VERSION
  savedAt: number
  userId: string
  bucketId: string
  backendId: number
  path: string
  category: NodeCategory | null
  parentId: string
  queryKey: string
  nextCursor: string | null
  totalCount: number
  folderCount: number
  fileCount: number
  nodes: CachedFileNode[]
}

export type InitialFileRouteState = {
  snapshot: AppSnapshot
  pageStates: Record<string, PageLoadState>
  categoryNodesByKey: Record<string, FileNode[]>
}

type SaveFileRouteInput = {
  snapshot: AppSnapshot
  bucketId: string
  parentId: string
  category: NodeCategory | null
  nodes: FileNode[]
  pageState: PageLoadState
}

function currentFileRoute() {
  if (typeof window === "undefined" || !["/app", "/images"].includes(window.location.pathname)) {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const rawCategory = window.location.pathname === "/images" ? "image" : params.get("type")
  const category = rawCategory && FILE_ROUTE_CATEGORIES.has(rawCategory as NodeCategory)
    ? rawCategory as NodeCategory
    : null

  return {
    path: category ? "" : params.get("folder") ?? "",
    category,
  }
}

function sanitizeNode(node: FileNode): CachedFileNode {
  return {
    id: node.id,
    backendId: node.backendId,
    bucketId: node.bucketId,
    mountBackendId: node.mountBackendId,
    parentId: node.parentId,
    parentBackendId: node.parentBackendId,
    kind: node.kind,
    name: node.name,
    ext: node.ext,
    size: node.size,
    updatedAt: node.updatedAt,
    createdAt: node.createdAt,
    mediaType: node.mediaType,
  }
}

function isCachedNode(value: unknown): value is CachedFileNode {
  if (!value || typeof value !== "object") return false
  const node = value as Partial<CachedFileNode>
  return (
    typeof node.id === "string" &&
    (typeof node.backendId === "number" || node.backendId === null) &&
    typeof node.bucketId === "string" &&
    typeof node.mountBackendId === "number" &&
    (typeof node.parentId === "string" || node.parentId === null) &&
    (typeof node.parentBackendId === "number" || node.parentBackendId === null) &&
    (node.kind === "folder" || node.kind === "file") &&
    typeof node.name === "string" &&
    typeof node.size === "number" &&
    typeof node.updatedAt === "string"
  )
}

function resolveFolderId(path: string, rootId: string, nodes: FileNode[]) {
  let parentId = rootId
  for (const part of path.split("/").filter(Boolean)) {
    const folder = nodes.find((node) => (
      node.kind === "folder" &&
      node.parentId === parentId &&
      node.name === part
    ))
    if (!folder) return null
    parentId = folder.id
  }
  return parentId
}

function collectAncestors(snapshot: AppSnapshot, bucketId: string, parentId: string) {
  const bucket = snapshot.buckets.find((item) => item.id === bucketId)
  if (!bucket || parentId === bucket.rootNodeId) return []

  const ancestors: FileNode[] = []
  const seen = new Set<string>()
  let currentId: string | null = parentId
  while (currentId && currentId !== bucket.rootNodeId && !seen.has(currentId)) {
    seen.add(currentId)
    const node = snapshot.nodes.find((item) => item.id === currentId && item.bucketId === bucketId)
    if (!node || node.kind !== "folder") return []
    ancestors.unshift(node)
    currentId = node.parentId
  }
  return currentId === bucket.rootNodeId ? ancestors : []
}

function isCachedRoute(value: unknown): value is CachedFileRoute {
  if (!value || typeof value !== "object") return false
  const route = value as Partial<CachedFileRoute>
  return (
    route.version === FILE_ROUTE_CACHE_VERSION &&
    typeof route.savedAt === "number" &&
    typeof route.userId === "string" &&
    typeof route.bucketId === "string" &&
    typeof route.backendId === "number" &&
    typeof route.path === "string" &&
    (route.category === null || FILE_ROUTE_CATEGORIES.has(route.category as NodeCategory)) &&
    typeof route.parentId === "string" &&
    typeof route.queryKey === "string" &&
    (typeof route.nextCursor === "string" || route.nextCursor === null) &&
    typeof route.totalCount === "number" &&
    typeof route.folderCount === "number" &&
    typeof route.fileCount === "number" &&
    Array.isArray(route.nodes) &&
    route.nodes.every(isCachedNode)
  )
}

export function loadInitialFileRouteState(snapshot: AppSnapshot): InitialFileRouteState {
  const empty = { snapshot, pageStates: {}, categoryNodesByKey: {} }
  if (typeof window === "undefined") return empty

  const route = currentFileRoute()
  const session = snapshot.auth.session
  const bucket = snapshot.buckets.find((item) => item.id === snapshot.activeBucketId) ?? snapshot.buckets[0]
  if (!route || !session || !bucket) return empty

  try {
    const raw = window.sessionStorage.getItem(FILE_ROUTE_CACHE_KEY)
    if (!raw) return empty
    const cached: unknown = JSON.parse(raw)
    if (!isCachedRoute(cached)) {
      window.sessionStorage.removeItem(FILE_ROUTE_CACHE_KEY)
      return empty
    }

    const { pageSize, sortValue } = loadFileViewPreferences()
    if (
      Date.now() - cached.savedAt > FILE_ROUTE_CACHE_MAX_AGE_MS ||
      cached.userId !== session.user.id ||
      cached.bucketId !== bucket.id ||
      cached.backendId !== bucket.backendId ||
      cached.path !== route.path ||
      cached.category !== route.category ||
      cached.queryKey !== `${sortValue}:${pageSize}` ||
      cached.nodes.some((node) => node.bucketId !== bucket.id)
    ) {
      return empty
    }

    const nodes = cached.nodes.map((node) => ({ ...node }))
    if (!route.category && resolveFolderId(route.path, bucket.rootNodeId, nodes) !== cached.parentId) {
      return empty
    }

    const stateKey = route.category
      ? categoryPageKey(route.category, bucket.id)
      : directoryPageKey("content", bucket.id, cached.parentId)
    const pageState: PageLoadState = {
      ...EMPTY_PAGE_STATE,
      loaded: false,
      metadataLoaded: true,
      nextCursor: cached.nextCursor,
      queryKey: cached.queryKey,
      totalCount: cached.totalCount,
      folderCount: cached.folderCount,
      fileCount: cached.fileCount,
    }
    const rootNode = createMountRootNode(bucket)

    return {
      snapshot: {
        ...snapshot,
        nodes: [rootNode, ...nodes],
      },
      pageStates: { [stateKey]: pageState },
      categoryNodesByKey: route.category ? { [stateKey]: nodes } : {},
    }
  } catch {
    window.sessionStorage.removeItem(FILE_ROUTE_CACHE_KEY)
    return empty
  }
}

export function saveFileRouteCache({
  snapshot,
  bucketId,
  parentId,
  category,
  nodes,
  pageState,
}: SaveFileRouteInput) {
  if (typeof window === "undefined") return

  const route = currentFileRoute()
  const session = snapshot.auth.session
  const bucket = snapshot.buckets.find((item) => item.id === bucketId)
  if (!route || !session || !bucket || route.category !== category) return

  const ancestors = category ? [] : collectAncestors(snapshot, bucketId, parentId)
  if (!category) {
    const currentParentId = resolveFolderId(route.path, bucket.rootNodeId, ancestors)
    if (currentParentId !== parentId) return
  }

  const cachedNodes = Array.from(
    new Map([...ancestors, ...nodes].map((node) => [node.id, sanitizeNode(node)])).values()
  )
  const payload: CachedFileRoute = {
    version: FILE_ROUTE_CACHE_VERSION,
    savedAt: Date.now(),
    userId: session.user.id,
    bucketId,
    backendId: bucket.backendId,
    path: route.path,
    category,
    parentId,
    queryKey: pageState.queryKey,
    nextCursor: pageState.nextCursor,
    totalCount: pageState.totalCount,
    folderCount: pageState.folderCount,
    fileCount: pageState.fileCount,
    nodes: cachedNodes,
  }
  window.sessionStorage.setItem(FILE_ROUTE_CACHE_KEY, JSON.stringify(payload))
}

export function clearFileRouteCache() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(FILE_ROUTE_CACHE_KEY)
  }
}

export function getCachedFolderChain(snapshot: AppSnapshot, path: string, bucketId: string) {
  const bucket = snapshot.buckets.find((item) => item.id === bucketId)
  if (!bucket) return null

  const ancestors: FileNode[] = []
  let parentId = bucket.rootNodeId
  for (const part of path.split("/").filter(Boolean)) {
    const folder = snapshot.nodes.find((node) => (
      node.bucketId === bucketId &&
      node.kind === "folder" &&
      node.parentId === parentId &&
      node.name === part
    ))
    if (!folder) return null
    ancestors.push(folder)
    parentId = folder.id
  }
  return { parentId, ancestors }
}

export function pageStateFromResponse(
  queryKey: `${SortValue}:${number}`,
  response: { next_cursor: string | null; total: number; folder_count: number; file_count: number }
): PageLoadState {
  return {
    ...EMPTY_PAGE_STATE,
    loaded: true,
    metadataLoaded: true,
    nextCursor: response.next_cursor,
    queryKey,
    totalCount: response.total,
    folderCount: response.folder_count,
    fileCount: response.file_count,
  }
}
