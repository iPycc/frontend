import * as React from "react"
import { toast } from "sonner"

import { copyNodes as apiCopyNodes } from "@/api/files"
import { type AppSnapshot } from "@/lib/models"

type ClipDeps = {
  defaultBucketId: string
  snapshotRef: { current: AppSnapshot }
  updateSnapshot: (recipe: (current: AppSnapshot) => AppSnapshot) => void
  moveNodes: (nodeIds: string[], parentId: string | null, bucketId?: string) => Promise<void>
  refreshCachedDirectory: (parentId: string | null, bucketId: string) => Promise<void>
  refreshLoadedCategories: (bucketId: string) => Promise<void>
}

export function useClipActions({
  defaultBucketId,
  snapshotRef,
  updateSnapshot,
  moveNodes,
  refreshCachedDirectory,
  refreshLoadedCategories,
}: ClipDeps) {
  const copyNodes = React.useCallback(
    (nodeIds: string[]) => {
      updateSnapshot((current) => ({
        ...current,
        clipboard: { type: "copy", nodeIds },
      }))
    },
    [updateSnapshot]
  )

  const cutNodes = React.useCallback(
    (nodeIds: string[]) => {
      updateSnapshot((current) => ({
        ...current,
        clipboard: { type: "cut", nodeIds },
      }))
    },
    [updateSnapshot]
  )

  const pasteNodes = React.useCallback(async (
    targetParentId: string | null,
    bucketId = defaultBucketId
  ) => {
    const current = snapshotRef.current.clipboard
    if (!current?.nodeIds.length) return
    try {
      if (current.type === "cut") {
        await moveNodes(current.nodeIds, targetParentId, bucketId)
        updateSnapshot((snapshot) => ({ ...snapshot, clipboard: null }))
      } else {
        const session = snapshotRef.current.auth.session
        const bucket = snapshotRef.current.buckets.find((item) => item.id === bucketId)
        const backendIds = current.nodeIds.map(Number).filter((id) => Number.isFinite(id))
        if (!session || !bucket || backendIds.length === 0) return
        const target = targetParentId && !targetParentId.startsWith("root:") ? Number(targetParentId) : null
        const copied = await apiCopyNodes(session.tokens.accessToken, {
          node_ids: backendIds,
          target_parent_id: target,
        })
        const uiParentId = targetParentId && !targetParentId.startsWith("root:") ? targetParentId : bucket.rootNodeId
        await Promise.all([
          refreshCachedDirectory(uiParentId, bucket.id),
          refreshLoadedCategories(bucket.id),
        ])
        toast.success(`已粘贴 ${copied.length} 项`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "粘贴失败")
    }
  }, [defaultBucketId, moveNodes, refreshCachedDirectory, refreshLoadedCategories, updateSnapshot])

  return {
    copyNodes,
    cutNodes,
    pasteNodes,
  }
}
