import * as React from "react"

import {
  getBucketRoot,
  isVisibleNode,
  type AppSnapshot,
  type FileNode,
} from "@/lib/models"
import { categoryPageKey, type NodeCategory } from "@/state/core"

type GetDeps = {
  defaultBucketId: string
  snapshot: AppSnapshot
  categoryNodesByKey: Record<string, FileNode[]>
  recycleNodes: FileNode[]
  treeFolderNodes: FileNode[]
}

export function useNavGet({
  defaultBucketId,
  snapshot,
  categoryNodesByKey,
  recycleNodes,
  treeFolderNodes,
}: GetDeps) {
  const getNodeById = React.useCallback(
    (nodeId: string) =>
      snapshot.nodes.find((node) => node.id === nodeId) ??
      (Object.values(categoryNodesByKey) as FileNode[][]).flat().find((node) => node.id === nodeId) ??
      recycleNodes.find((node) => node.id === nodeId) ??
      treeFolderNodes.find((node) => node.id === nodeId),
    [categoryNodesByKey, recycleNodes, snapshot.nodes, treeFolderNodes]
  )

  const getFolderPathId = React.useCallback(
    (path: string, bucketId = defaultBucketId) => {
      const rootId = getBucketRoot(snapshot, bucketId)
      if (!rootId) {
        return null
      }

      const parts = path.split("/").filter(Boolean)
      let parentId = rootId

      for (const part of parts) {
        const match = snapshot.nodes.find(
          (node) =>
            node.bucketId === bucketId &&
            node.parentId === parentId &&
            node.kind === "folder" &&
            !node.deletedAt &&
            node.name === part
        )

        if (!match) {
          return null
        }

        parentId = match.id
      }

      return parentId
    },
    [defaultBucketId, snapshot]
  )

  const getNodesInFolder = React.useCallback(
    (path: string, bucketId = defaultBucketId) => {
      const folderId = getFolderPathId(path, bucketId)
      if (!folderId) {
        return []
      }

      return snapshot.nodes.filter(
        (node) => node.bucketId === bucketId && node.parentId === folderId && isVisibleNode(node)
      )
    },
    [defaultBucketId, getFolderPathId, snapshot.nodes]
  )

  const getFoldersForBucket = React.useCallback(
    (bucketId = defaultBucketId, includeRoot = false) => {
      const rootId = getBucketRoot(snapshot, bucketId)
      const foldersById = new Map(
        [...snapshot.nodes, ...treeFolderNodes]
          .filter((node) => node.kind === "folder")
          .map((node) => [node.id, node])
      )
      return Array.from(foldersById.values())
        .filter((node) => {
          if (node.bucketId !== bucketId || node.kind !== "folder" || node.deletedAt) {
            return false
          }

          if (includeRoot) {
            return true
          }

          return node.id !== rootId
        })
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
    },
    [defaultBucketId, snapshot, treeFolderNodes]
  )

  const getTreeNodes = React.useCallback(
    (bucketId = defaultBucketId) => {
      const rootId = getBucketRoot(snapshot, bucketId)
      if (!rootId) {
        return []
      }

      return snapshot.nodes.filter(
        (node) => node.bucketId === bucketId && node.parentId === rootId && node.kind === "folder" && !node.deletedAt
      )
    },
    [defaultBucketId, snapshot]
  )

  const getCategoryNodes = React.useCallback(
    (category: NodeCategory, bucketId = defaultBucketId) =>
      categoryNodesByKey[categoryPageKey(category, bucketId)] ?? [],
    [categoryNodesByKey, defaultBucketId]
  )

  const getSharedWithMeNodes = React.useCallback(() => [] as FileNode[], [])
  const getRecycleNodes = React.useCallback(() => recycleNodes, [recycleNodes])
  const getShareRecords = React.useCallback(
    () =>
      snapshot.shares.map((record) => ({
        ...record,
        node:
          getNodeById(record.nodeId) ??
          (record.nodeName
            ? {
                id: record.nodeId,
                bucketId: "",
                parentId: null,
                kind: record.nodeKind ?? "file",
                name: record.nodeName,
                ext: record.nodeExt,
                size: record.nodeSize,
                updatedAt: record.createdAt,
                mediaType: record.nodeMediaType,
                preview: record.nodePreview,
              }
            : undefined),
      })),
    [snapshot.shares, getNodeById]
  )

  return {
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
