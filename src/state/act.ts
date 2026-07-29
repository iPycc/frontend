import * as React from "react"

import {
  copyNodes as apiCopyNodes,
  createFile as apiCreateFile,
  createFolder as apiCreateFolder,
  deleteNodes as apiDeleteNodes,
  moveNodes as apiMoveNodes,
  renameNode as apiRenameNode,
  restoreNodes as apiRestoreNodes,
} from "@/api/files"
import {
  inferMediaType,
  type AppSnapshot,
  type FileNode,
} from "@/lib/models"
import { toast } from "sonner"

import { useClipActions } from "@/state/act/clip"
import { useShareActions } from "@/state/act/share"
import {
  directoryPageKey,
  extractExtension,
  formatDateTime,
  mapNodeToFileNode,
  removeCachedSubtrees,
  type PageLoadState,
} from "@/state/core"

type Setter<T> = React.Dispatch<React.SetStateAction<T>>

type ActionDeps = {
  defaultBucketId: string
  snapshotRef: { current: AppSnapshot }
  pageStatesRef: { current: Record<string, PageLoadState> }
  updateSnapshot: (recipe: (current: AppSnapshot) => AppSnapshot) => void
  setPageStates: Setter<Record<string, PageLoadState>>
  setCategoryNodesByKey: Setter<Record<string, FileNode[]>>
  setTreeFolderNodes: Setter<FileNode[]>
  setRecycleNodes: Setter<FileNode[]>
  refreshCachedDirectory: (parentId: string | null, bucketId: string) => Promise<void>
  refreshLoadedCategories: (bucketId: string) => Promise<void>
  loadRecycle: () => Promise<void>
  getNodeById: (nodeId: string) => FileNode | undefined
}

export function useActions({
  defaultBucketId,
  snapshotRef,
  pageStatesRef,
  updateSnapshot,
  setPageStates,
  setCategoryNodesByKey,
  setTreeFolderNodes,
  setRecycleNodes,
  refreshCachedDirectory,
  refreshLoadedCategories,
  loadRecycle,
  getNodeById,
}: ActionDeps) {
  const createFolder = React.useCallback(
    async (parentId: string | null, name: string, bucketId = defaultBucketId) => {
      const session = snapshotRef.current.auth.session
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      if (!session || !bucket?.backendId) {
        toast.error("当前没有可用的存储挂载")
        return null
      }

      const trimmedName = name.trim()
      if (!trimmedName) {
        return null
      }

      const apiParentId = parentId && !parentId.startsWith("root:") ? Number(parentId) : undefined
      const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
      const tempId = `optimistic-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const tempNode: FileNode = {
        id: tempId,
        backendId: null,
        bucketId: bucket.id,
        mountBackendId: bucket.backendId,
        parentId: uiParentId,
        parentBackendId: apiParentId ?? null,
        kind: "folder",
        name: trimmedName,
        size: 0,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      updateSnapshot((current) => ({
        ...current,
        nodes: [...current.nodes, tempNode],
      }))

      try {
        const created = await apiCreateFolder(session.tokens.accessToken, {
          mount_id: bucket.backendId,
          parent_id: apiParentId,
          name: trimmedName,
        })
        const realNode = mapNodeToFileNode(created, bucket.id, uiParentId, snapshotRef.current.settings.timezone)
        updateSnapshot((current) => ({
          ...current,
          nodes: current.nodes.map((node) => (node.id === tempId ? realNode : node)),
        }))
        if (pageStatesRef.current[directoryPageKey("folders", bucket.id, uiParentId)]?.loaded) {
          setTreeFolderNodes((current) => [
            ...current.filter((node) => node.id !== realNode.id),
            realNode,
          ])
        }
        await refreshCachedDirectory(uiParentId, bucket.id)
        return realNode
      } catch (error) {
        updateSnapshot((current) => ({
          ...current,
          nodes: current.nodes.filter((node) => node.id !== tempId),
        }))
        toast.error(error instanceof Error ? error.message : "创建文件夹失败")
        return null
      }
    },
    [defaultBucketId, refreshCachedDirectory, updateSnapshot]
  )

  const createFile = React.useCallback(
    async (parentId: string | null, name: string, bucketId = defaultBucketId) => {
      const session = snapshotRef.current.auth.session
      const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
      if (!session || !bucket?.backendId) {
        toast.error("当前没有可用的存储挂载")
        return null
      }

      const trimmedName = name.trim()
      if (!trimmedName) return null

      const apiParentId = parentId && !parentId.startsWith("root:") ? Number(parentId) : undefined
      const uiParentId = parentId && !parentId.startsWith("root:") ? parentId : bucket.rootNodeId
      const tempId = `optimistic-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const now = new Date().toISOString()
      const tempNode: FileNode = {
        id: tempId,
        backendId: null,
        bucketId: bucket.id,
        mountBackendId: bucket.backendId,
        parentId: uiParentId,
        parentBackendId: apiParentId ?? null,
        kind: "file",
        name: trimmedName,
        ext: extractExtension(trimmedName),
        mediaType: inferMediaType(trimmedName, "file"),
        size: 0,
        updatedAt: now,
        createdAt: now,
      }

      updateSnapshot((current) => ({ ...current, nodes: [...current.nodes, tempNode] }))

      try {
        const created = await apiCreateFile(session.tokens.accessToken, {
          mount_id: bucket.backendId,
          parent_id: apiParentId,
          name: trimmedName,
        })
        const realNode = mapNodeToFileNode(created, bucket.id, uiParentId, snapshotRef.current.settings.timezone)
        updateSnapshot((current) => ({
          ...current,
          nodes: current.nodes.map((node) => (node.id === tempId ? realNode : node)),
        }))
        await refreshCachedDirectory(uiParentId, bucket.id)
        return realNode
      } catch (error) {
        updateSnapshot((current) => ({
          ...current,
          nodes: current.nodes.filter((node) => node.id !== tempId),
        }))
        toast.error(error instanceof Error ? error.message : "创建文件失败")
        return null
      }
    },
    [defaultBucketId, refreshCachedDirectory, updateSnapshot]
  )

  const renameNode = React.useCallback(async (nodeId: string, name: string) => {
    const session = snapshotRef.current.auth.session
    const backendId = Number(nodeId)
    if (!session || Number.isNaN(backendId)) {
      return
    }

    const existing = snapshotRef.current.nodes.find((node) => node.id === nodeId)
    const renamed = await apiRenameNode(session.tokens.accessToken, backendId, { name: name.trim() })
    if (!existing) {
      return
    }
    const mapped = mapNodeToFileNode(
      renamed,
      existing.bucketId,
      existing.parentId,
      snapshotRef.current.settings.timezone
    )
    updateSnapshot((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === nodeId ? mapped : node)),
    }))
    setTreeFolderNodes((current) => current.map((node) => (node.id === nodeId ? mapped : node)))
    setCategoryNodesByKey((current) =>
      Object.fromEntries(
        (Object.entries(current) as Array<[string, FileNode[]]>).map(([key, nodes]) => [
          key,
          nodes
            .map((node) => (node.id === nodeId ? mapped : node))
            .filter((node) => !key.startsWith("category:") || key.startsWith(`category:${node.mediaType}:`)),
        ])
      )
    )
    await Promise.all([
      refreshCachedDirectory(existing.parentId, existing.bucketId),
      refreshLoadedCategories(existing.bucketId),
    ])
  }, [refreshCachedDirectory, refreshLoadedCategories, updateSnapshot])

  const moveNodes = React.useCallback(async (
    nodeIds: string[],
    targetParentId: string | null,
    bucketId = defaultBucketId
  ) => {
    const session = snapshotRef.current.auth.session
    const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
    const backendIds = nodeIds.map(Number).filter((id) => Number.isFinite(id))
    if (!session || !bucket?.backendId || backendIds.length === 0) return
    const target = targetParentId && !targetParentId.startsWith("root:") ? Number(targetParentId) : null
    if (target !== null && !Number.isFinite(target)) return

    const sourceNodes = nodeIds.map((id) => snapshotRef.current.nodes.find((node) => node.id === id)).filter(Boolean) as FileNode[]
    const sourceParents = Array.from(new Set(sourceNodes.map((node) => node.parentId)))
    const moved = await apiMoveNodes(session.tokens.accessToken, {
      node_ids: backendIds,
      target_parent_id: target,
    })
    const uiParentId = targetParentId && !targetParentId.startsWith("root:") ? targetParentId : bucket.rootNodeId
    const mapped = moved.map((node) => mapNodeToFileNode(node, bucket.id, uiParentId, snapshotRef.current.settings.timezone))
    const mappedById = new Map(mapped.map((node) => [node.id, node]))
    updateSnapshot((current) => ({
      ...current,
      nodes: current.nodes.map((node) => mappedById.get(node.id) ?? node),
    }))
    await Promise.all([
      ...sourceParents.map((parentId) => refreshCachedDirectory(parentId, bucket.id)),
      refreshCachedDirectory(uiParentId, bucket.id),
      refreshLoadedCategories(bucket.id),
    ])
    toast.success(`已移动 ${mapped.length} 项`)
  }, [defaultBucketId, refreshCachedDirectory, refreshLoadedCategories, updateSnapshot])

  const duplicateNodes = React.useCallback(async (nodeIds: string[]) => {
    const first = nodeIds.map((id) => snapshotRef.current.nodes.find((node) => node.id === id)).find(Boolean)
    if (!first) return
    const session = snapshotRef.current.auth.session
    const backendIds = nodeIds.map(Number).filter((id) => Number.isFinite(id))
    if (!session || backendIds.length === 0) return
    const copied = await apiCopyNodes(session.tokens.accessToken, {
      node_ids: backendIds,
      target_parent_id: first.parentId && !first.parentId.startsWith("root:") ? Number(first.parentId) : null,
    })
    await refreshCachedDirectory(first.parentId, first.bucketId)
    await refreshLoadedCategories(first.bucketId)
    toast.success(`已创建 ${copied.length} 个副本`)
  }, [refreshCachedDirectory, refreshLoadedCategories])

  const deleteNodes = React.useCallback(async (nodeIds: string[], hardDelete = false) => {
    const session = snapshotRef.current.auth.session
    const backendIds = nodeIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    if (!session || backendIds.length === 0) {
      return
    }
    const selectedNodes = nodeIds.map(getNodeById).filter(Boolean) as FileNode[]
    const deletingFolder = selectedNodes.some((node) => node.kind === "folder")
    const affectedDirectories = Array.from(
      new Map(selectedNodes.map((node) => [`${node.bucketId}:${node.parentId ?? ""}`, node])).values()
    )
    const affectedBucketIds = Array.from(new Set(selectedNodes.map((node) => node.bucketId)))

    // Collect the selected nodes and all their descendants for optimistic removal.
    const idsToRemove = new Set(nodeIds)
    const collectDescendants = (parentIds: string[]) => {
      const children = snapshotRef.current.nodes.filter(
        (node) => node.parentId && parentIds.includes(node.parentId)
      )
      if (children.length === 0) return
      const childIds = children.map((node) => node.id)
      childIds.forEach((id) => idsToRemove.add(id))
      collectDescendants(childIds)
    }
    collectDescendants(nodeIds)

    const previousNodes = snapshotRef.current.nodes

    if (hardDelete) {
      updateSnapshot((current) => ({
        ...current,
        nodes: current.nodes.filter((node) => !idsToRemove.has(node.id)),
      }))
    } else {
      const deletedAt = formatDateTime(new Date().toISOString(), snapshotRef.current.settings.timezone)
      updateSnapshot((current) => ({
        ...current,
        nodes: current.nodes.map((node) =>
          idsToRemove.has(node.id) ? { ...node, deletedAt } : node
        ),
      }))
    }

    try {
      await apiDeleteNodes(session.tokens.accessToken, {
        node_ids: backendIds,
        hard_delete: hardDelete,
      })
      if (deletingFolder) {
        setCategoryNodesByKey({})
        const nextPageStates = Object.fromEntries(
          Object.entries(pageStatesRef.current).filter(([key]) => !key.startsWith("category:"))
        )
        pageStatesRef.current = nextPageStates
        setPageStates(nextPageStates)
      } else {
        setCategoryNodesByKey((current) =>
          Object.fromEntries(
            (Object.entries(current) as Array<[string, FileNode[]]>).map(([key, nodes]) => [
              key,
              nodes.filter((node) => !idsToRemove.has(node.id)),
            ])
          )
        )
      }
      setTreeFolderNodes((current) => removeCachedSubtrees(current, idsToRemove))
      setRecycleNodes((current) => current.filter((node) => !idsToRemove.has(node.id)))
      await Promise.all(
        affectedDirectories.map((node) => refreshCachedDirectory(node.parentId, node.bucketId))
      )
      if (!deletingFolder) {
        await Promise.all(affectedBucketIds.map(refreshLoadedCategories))
      }
    } catch (error) {
      updateSnapshot((current) => ({
        ...current,
        nodes: previousNodes,
      }))
      toast.error(error instanceof Error ? error.message : "删除失败")
    }
  }, [getNodeById, refreshCachedDirectory, refreshLoadedCategories, updateSnapshot])

  const restoreNodes = React.useCallback(async (nodeIds: string[]) => {
    const session = snapshotRef.current.auth.session
    const backendIds = nodeIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    if (!session || backendIds.length === 0) {
      return
    }
    const restoringNodes = nodeIds.map(getNodeById).filter(Boolean) as FileNode[]

    await apiRestoreNodes(session.tokens.accessToken, {
      node_ids: backendIds,
    })
    setRecycleNodes((current) => current.filter((node) => !nodeIds.includes(node.id)))
    await Promise.all([
      ...restoringNodes.map((node) => refreshCachedDirectory(node.parentId, node.bucketId)),
      ...Array.from(new Set(restoringNodes.map((node) => node.bucketId))).map(refreshLoadedCategories),
      loadRecycle(),
    ])
  }, [getNodeById, loadRecycle, refreshCachedDirectory, refreshLoadedCategories])

  const permanentlyDeleteNodes = React.useCallback(async (nodeIds: string[]) => {
    await deleteNodes(nodeIds, true)
  }, [deleteNodes])

  const {
    shareNodes,
    deleteShares,
    recordShareView,
    recordShareDownload,
  } = useShareActions({
    snapshotRef,
    updateSnapshot,
    getNodeById,
  })

  const {
    copyNodes,
    cutNodes,
    pasteNodes,
  } = useClipActions({
    defaultBucketId,
    snapshotRef,
    updateSnapshot,
    moveNodes,
    refreshCachedDirectory,
    refreshLoadedCategories,
  })


  return {
    createFolder,
    createFile,
    renameNode,
    moveNodes,
    duplicateNodes,
    deleteNodes,
    restoreNodes,
    permanentlyDeleteNodes,
    shareNodes,
    deleteShares,
    recordShareView,
    recordShareDownload,
    copyNodes,
    cutNodes,
    pasteNodes,
  }
}
