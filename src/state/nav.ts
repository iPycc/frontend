import * as React from "react"

import {
  getCategoryNodePageMetadata,
  getNodePageMetadata,
  listCategoryNodePage,
  listNodePage,
  listRecycle,
} from "@/api/files"
import { listMyShares as apiListMyShares } from "@/api/share"
import {
  type AppSnapshot,
  type FileNode,
  type SortValue,
} from "@/lib/models"
import { useNavGet } from "@/state/nav/get"
import { saveFileRouteCache } from "@/state/file-route-cache"
import {
  EMPTY_PAGE_STATE,
  categoryPageKey,
  directoryPageKey,
  mapNodeToFileNode,
  mapShareRead,
  removeCachedSubtrees,
  type NodeCategory,
  type PageLoadOptions,
  type PageLoadState,
} from "@/state/core"

type Setter<T> = React.Dispatch<React.SetStateAction<T>>

type NavDeps = {
  defaultBucketId: string
  snapshot: AppSnapshot
  snapshotRef: { current: AppSnapshot }
  pageStates: Record<string, PageLoadState>
  pageStatesRef: { current: Record<string, PageLoadState> }
  pageRequestsRef: { current: Map<string, Promise<void>> }
  categoryNodesByKey: Record<string, FileNode[]>
  treeFolderNodes: FileNode[]
  recycleNodes: FileNode[]
  updateSnapshot: (recipe: (current: AppSnapshot) => AppSnapshot) => void
  updatePageState: (key: string, recipe: (current: PageLoadState) => PageLoadState) => void
  setPageStates: Setter<Record<string, PageLoadState>>
  setCategoryNodesByKey: Setter<Record<string, FileNode[]>>
  setTreeFolderNodes: Setter<FileNode[]>
  setRecycleNodes: Setter<FileNode[]>
  setRecycleLoading: Setter<boolean>
  setSharesLoading: Setter<boolean>
}

export function useNav({
  defaultBucketId,
  snapshot,
  snapshotRef,
  pageStates,
  pageStatesRef,
  pageRequestsRef,
  categoryNodesByKey,
  treeFolderNodes,
  recycleNodes,
  updateSnapshot,
  updatePageState,
  setPageStates,
  setCategoryNodesByKey,
  setTreeFolderNodes,
  setRecycleNodes,
  setRecycleLoading,
  setSharesLoading,
}: NavDeps) {
  const loadDirectoryPage = React.useCallback(
    async (
      mode: "content" | "folders",
      parentId: string | null,
      bucketId = snapshotRef.current.activeBucketId,
      options: PageLoadOptions = {}
    ) => {
      const session = snapshotRef.current.auth.session
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      const backendId = bucket?.backendId
      if (!session || !bucket || backendId === undefined) {
        return
      }

      const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
      const apiParentId = uiParentId.startsWith("root:") ? undefined : Number(uiParentId)
      if (apiParentId !== undefined && Number.isNaN(apiParentId)) {
        return
      }

      const limit = Math.min(Math.max(options.limit ?? (mode === "folders" ? 2000 : 200), 1), 2000)
      const sort = options.sort ?? "name-asc"
      const queryKey = `${sort}:${limit}`
      const stateKey = directoryPageKey(mode, bucket.id, uiParentId)
      const currentState = pageStatesRef.current[stateKey] ?? EMPTY_PAGE_STATE
      const reset = Boolean(options.reset || currentState.queryKey !== queryKey)

      if (!reset && currentState.loaded && !currentState.nextCursor) {
        return
      }

      const cursor = reset ? null : currentState.nextCursor
      const requestKey = `${stateKey}:${queryKey}:${cursor ?? "first"}`
      const inFlight = pageRequestsRef.current.get(requestKey)
      if (inFlight) {
        return inFlight
      }

      updatePageState(stateKey, (current) => ({
        ...current,
        loading: true,
        metadataLoading: reset,
        metadataLoaded: reset ? false : current.metadataLoaded,
        nextCursor: reset ? null : current.nextCursor,
        queryKey,
      }))

      const request = (async () => {
        try {
          if (reset) {
            void getNodePageMetadata(session.tokens.accessToken, {
              mountId: backendId,
              parentId: apiParentId,
              foldersOnly: mode === "folders",
            }).then((metadata) => {
              updatePageState(stateKey, (current) => {
                if (current.queryKey !== queryKey || !current.loading) return current
                return {
                  ...current,
                  metadataLoading: false,
                  metadataLoaded: true,
                  totalCount: metadata.total,
                  folderCount: metadata.folder_count,
                  fileCount: metadata.file_count,
                }
              })
            }).catch(() => {
              updatePageState(stateKey, (current) => current.queryKey === queryKey
                ? { ...current, metadataLoading: false }
                : current)
            })
          }
          const response = await listNodePage(session.tokens.accessToken, {
            mountId: backendId,
            parentId: apiParentId,
            limit,
            cursor,
            sort,
            foldersOnly: mode === "folders",
          })
          const mapped = response.items.map((node) =>
            mapNodeToFileNode(node, bucket.id, uiParentId, snapshotRef.current.settings.timezone)
          )

          if (mode === "folders") {
            setTreeFolderNodes((current) => {
              let baseNodes = current
              if (reset) {
                const mappedIds = new Set(mapped.map((node) => node.id))
                const directIds = new Set<string>(
                  current
                    .filter(
                      (node) =>
                        node.bucketId === bucket.id &&
                        node.parentId === uiParentId &&
                        !mappedIds.has(node.id)
                    )
                    .map((node) => node.id)
                )
                baseNodes = removeCachedSubtrees(current, directIds)
              }
              const nodesById = new Map(baseNodes.map((node) => [node.id, node]))
              for (const node of mapped) {
                nodesById.set(node.id, node)
              }
              return Array.from(nodesById.values())
            })
          } else {
            updateSnapshot((current) => {
              let baseNodes = current.nodes
              if (reset) {
                const mappedIds = new Set(mapped.map((node) => node.id))
                const directIds = new Set<string>(
                  current.nodes
                    .filter(
                      (node) =>
                        node.bucketId === bucket.id &&
                        node.parentId === uiParentId &&
                        !mappedIds.has(node.id)
                    )
                    .map((node) => node.id)
                )
                baseNodes = removeCachedSubtrees(current.nodes, directIds)
              }

              const nodesById = new Map(baseNodes.map((node) => [node.id, node]))
              for (const node of mapped) {
                nodesById.set(node.id, node)
              }
              return { ...current, nodes: Array.from(nodesById.values()) }
            })
          }

          const nextPageState: PageLoadState = {
            loading: false,
            loaded: true,
            metadataLoading: false,
            metadataLoaded: true,
            nextCursor: response.next_cursor,
            queryKey,
            totalCount: response.total,
            folderCount: response.folder_count,
            fileCount: response.file_count,
          }
          updatePageState(stateKey, () => nextPageState)

          if (mode === "content") {
            const directNodes = snapshotRef.current.nodes.filter((node) => (
              node.bucketId === bucket.id &&
              node.parentId === uiParentId &&
              !node.deletedAt &&
              !node.isSystemRoot
            ))
            saveFileRouteCache({
              snapshot: snapshotRef.current,
              bucketId: bucket.id,
              parentId: uiParentId,
              category: null,
              nodes: directNodes,
              pageState: nextPageState,
            })
          }
        } catch (error) {
          updatePageState(stateKey, (current) => ({ ...current, loading: false, metadataLoading: false }))
          throw error
        } finally {
          pageRequestsRef.current.delete(requestKey)
        }
      })()

      pageRequestsRef.current.set(requestKey, request)
      return request
    },
    [updatePageState, updateSnapshot]
  )

  const loadDirectory = React.useCallback(
    (parentId: string | null, bucketId = defaultBucketId, options: PageLoadOptions = {}) =>
      loadDirectoryPage("content", parentId, bucketId, options),
    [defaultBucketId, loadDirectoryPage]
  )

  const refreshCachedDirectory = React.useCallback(
    async (parentId: string | null, bucketId: string) => {
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      if (!bucket) return
      const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
      const state = pageStatesRef.current[directoryPageKey("content", bucket.id, uiParentId)]
      if (!state?.loaded) return
      const [sort, rawLimit] = state.queryKey.split(":") as [SortValue, string]
      await loadDirectory(uiParentId, bucket.id, {
        reset: true,
        sort,
        limit: Number(rawLimit) || 200,
      })
    },
    [loadDirectory]
  )

  const loadDirectoryFolders = React.useCallback(
    async (parentId: string | null, bucketId = defaultBucketId) => {
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      if (!bucket) {
        return
      }
      const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
      const stateKey = directoryPageKey("folders", bucket.id, uiParentId)
      let reset = (pageStatesRef.current[stateKey]?.queryKey ?? "") !== "name-asc:2000"

      do {
        await loadDirectoryPage("folders", uiParentId, bucket.id, {
          limit: 2000,
          sort: "name-asc",
          reset,
        })
        reset = false
      } while (pageStatesRef.current[stateKey]?.nextCursor)
    },
    [defaultBucketId, loadDirectoryPage]
  )

  const resolveFolderPath = React.useCallback(
    async (path: string, bucketId = defaultBucketId, options: PageLoadOptions = {}) => {
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      if (!bucket) {
        return null
      }

      const parts = path.split("/").filter(Boolean)
      let parentId = bucket.rootNodeId
      for (const part of parts) {
        let match = snapshotRef.current.nodes.find(
          (node) =>
            node.bucketId === bucket.id &&
            node.parentId === parentId &&
            node.kind === "folder" &&
            !node.deletedAt &&
            node.name === part
        )

        while (!match) {
          const stateKey = directoryPageKey("content", bucket.id, parentId)
          const before = pageStatesRef.current[stateKey]
          if (before?.loaded && !before.nextCursor && before.queryKey === `name-asc:${options.limit ?? 200}`) {
            break
          }
          await loadDirectoryPage("content", parentId, bucket.id, {
            limit: options.limit,
            sort: "name-asc",
            reset: before?.queryKey !== `name-asc:${options.limit ?? 200}`,
          })
          match = snapshotRef.current.nodes.find(
            (node) =>
              node.bucketId === bucket.id &&
              node.parentId === parentId &&
              node.kind === "folder" &&
              !node.deletedAt &&
              node.name === part
          )
          const after = pageStatesRef.current[stateKey]
          if (!match && after?.loaded && !after.nextCursor) {
            break
          }
        }

        if (!match) {
          return null
        }
        parentId = match.id
      }
      return parentId
    },
    [defaultBucketId, loadDirectoryPage]
  )

  const getDirectoryPageState = React.useCallback(
    (parentId: string | null, bucketId = defaultBucketId) => {
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      if (!bucket) {
        return EMPTY_PAGE_STATE
      }
      const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
      return pageStates[directoryPageKey("content", bucket.id, uiParentId)] ?? EMPTY_PAGE_STATE
    },
    [defaultBucketId, pageStates]
  )

  const getFolderTreePageState = React.useCallback(
    (parentId: string | null, bucketId = defaultBucketId) => {
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      if (!bucket) {
        return EMPTY_PAGE_STATE
      }
      const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
      return pageStates[directoryPageKey("folders", bucket.id, uiParentId)] ?? EMPTY_PAGE_STATE
    },
    [defaultBucketId, pageStates]
  )

  const loadCategory = React.useCallback(
    async (category: NodeCategory, bucketId = defaultBucketId, options: PageLoadOptions = {}) => {
      const session = snapshotRef.current.auth.session
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      const backendId = bucket?.backendId
      if (!session || !bucket || backendId === undefined) {
        return
      }

      const limit = Math.min(Math.max(options.limit ?? 200, 1), 2000)
      const sort = options.sort ?? "name-asc"
      const queryKey = `${sort}:${limit}`
      const stateKey = categoryPageKey(category, bucket.id)
      const currentState = pageStatesRef.current[stateKey] ?? EMPTY_PAGE_STATE
      const reset = Boolean(options.reset || currentState.queryKey !== queryKey)
      if (!reset && currentState.loaded && !currentState.nextCursor) {
        return
      }

      const cursor = reset ? null : currentState.nextCursor
      const requestKey = `${stateKey}:${queryKey}:${cursor ?? "first"}`
      const inFlight = pageRequestsRef.current.get(requestKey)
      if (inFlight) {
        return inFlight
      }

      updatePageState(stateKey, (current) => ({
        ...current,
        loading: true,
        metadataLoading: reset,
        metadataLoaded: reset ? false : current.metadataLoaded,
        nextCursor: reset ? null : current.nextCursor,
        queryKey,
      }))

      const request = (async () => {
        try {
          if (reset) {
            void getCategoryNodePageMetadata(session.tokens.accessToken, {
              mountId: backendId,
              category,
            }).then((metadata) => {
              updatePageState(stateKey, (current) => {
                if (current.queryKey !== queryKey || !current.loading) return current
                return {
                  ...current,
                  metadataLoading: false,
                  metadataLoaded: true,
                  totalCount: metadata.total,
                  folderCount: metadata.folder_count,
                  fileCount: metadata.file_count,
                }
              })
            }).catch(() => {
              updatePageState(stateKey, (current) => current.queryKey === queryKey
                ? { ...current, metadataLoading: false }
                : current)
            })
          }
          const response = await listCategoryNodePage(session.tokens.accessToken, {
            mountId: backendId,
            category,
            limit,
            cursor,
            sort,
          })
          const mapped = response.items.map((node) =>
            mapNodeToFileNode(
              node,
              bucket.id,
              node.parent_id ? String(node.parent_id) : bucket.rootNodeId,
              snapshotRef.current.settings.timezone
            )
          )
          updateSnapshot((current) => {
            const nodesById = new Map(current.nodes.map((node) => [node.id, node]))
            for (const node of mapped) {
              nodesById.set(node.id, node)
            }
            return { ...current, nodes: Array.from(nodesById.values()) }
          })
          setCategoryNodesByKey((current) => ({
            ...current,
            [stateKey]: reset
              ? mapped
              : Array.from(new Map([...(current[stateKey] ?? []), ...mapped].map((node) => [node.id, node])).values()),
          }))
          const nextPageState: PageLoadState = {
            loading: false,
            loaded: true,
            metadataLoading: false,
            metadataLoaded: true,
            nextCursor: response.next_cursor,
            queryKey,
            totalCount: response.total,
            folderCount: response.folder_count,
            fileCount: response.file_count,
          }
          updatePageState(stateKey, () => nextPageState)
          if (reset) {
            saveFileRouteCache({
              snapshot: snapshotRef.current,
              bucketId: bucket.id,
              parentId: bucket.rootNodeId,
              category,
              nodes: mapped,
              pageState: nextPageState,
            })
          }
        } catch (error) {
          updatePageState(stateKey, (current) => ({ ...current, loading: false, metadataLoading: false }))
          throw error
        } finally {
          pageRequestsRef.current.delete(requestKey)
        }
      })()

      pageRequestsRef.current.set(requestKey, request)
      return request
    },
    [defaultBucketId, updatePageState, updateSnapshot]
  )

  const getCategoryPageState = React.useCallback(
    (category: NodeCategory, bucketId = defaultBucketId) =>
      pageStates[categoryPageKey(category, bucketId)] ?? EMPTY_PAGE_STATE,
    [defaultBucketId, pageStates]
  )

  const refreshLoadedCategories = React.useCallback(
    async (bucketId: string) => {
      const categories: NodeCategory[] = ["image", "video", "audio", "document"]
      await Promise.all(
        categories.map(async (category) => {
          const state = pageStatesRef.current[categoryPageKey(category, bucketId)]
          if (!state?.loaded) return
          const [sort, rawLimit] = state.queryKey.split(":") as [SortValue, string]
          await loadCategory(category, bucketId, {
            reset: true,
            sort,
            limit: Number(rawLimit) || 200,
          })
        })
      )
    },
    [loadCategory]
  )

  const loadRecycle = React.useCallback(async () => {
    const session = snapshotRef.current.auth.session
    if (!session) {
      return
    }
    setRecycleLoading(true)
    try {
      const entries = await listRecycle(session.tokens.accessToken)
      setRecycleNodes(
        entries.map((node) =>
          mapNodeToFileNode(
            node,
            String(node.mount_id),
            node.parent_id ? String(node.parent_id) : `root:${node.mount_id}`,
            snapshotRef.current.settings.timezone
          )
        )
      )
    } finally {
      setRecycleLoading(false)
    }
  }, [])

  const loadShares = React.useCallback(async () => {
    const session = snapshotRef.current.auth.session
    if (!session) {
      return
    }
    setSharesLoading(true)
    try {
      const entries = await apiListMyShares(session.tokens.accessToken)
      updateSnapshot((current) => ({ ...current, shares: entries.map(mapShareRead) }))
    } finally {
      setSharesLoading(false)
    }
  }, [updateSnapshot])

  const {
    getNodeById,
    getFolderPathId,
    getNodesInFolder,
    getFoldersForBucket,
    getTreeNodes,
    getCategoryNodes,
    getSharedWithMeNodes,
    getRecycleNodes,
    getShareRecords,
  } = useNavGet({
    defaultBucketId,
    snapshot,
    categoryNodesByKey,
    recycleNodes,
    treeFolderNodes,
  })


  return {
    loadDirectory,
    refreshCachedDirectory,
    loadDirectoryFolders,
    resolveFolderPath,
    getDirectoryPageState,
    getFolderTreePageState,
    loadCategory,
    getCategoryPageState,
    refreshLoadedCategories,
    loadRecycle,
    loadShares,
    getNodeById,
    getFolderPathId,
    getNodesInFolder,
    getFoldersForBucket,
    getTreeNodes,
    getCategoryNodes,
    getSharedWithMeNodes,
    getRecycleNodes,
    getShareRecords,
  }
}
