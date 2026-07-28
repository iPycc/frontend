import * as React from "react"
import { toast } from "sonner"

import {
  createShare as apiCreateShare,
  revokeShare as apiRevokeShare,
  ShareAccess,
  type ShareCreateInput,
} from "@/api/share"
import {
  type AppSnapshot,
  type FileNode,
  type ShareRecord,
} from "@/lib/models"
import {
  mapShareRead,
  type ShareCreateOptions,
} from "@/state/core"

type ShareDeps = {
  snapshotRef: { current: AppSnapshot }
  updateSnapshot: (recipe: (current: AppSnapshot) => AppSnapshot) => void
  getNodeById: (nodeId: string) => FileNode | undefined
}

export function useShareActions({
  snapshotRef,
  updateSnapshot,
  getNodeById,
}: ShareDeps) {
  const shareNodes = React.useCallback(
    async (nodeIds: string[], options: ShareCreateOptions = {}) => {
      const session = snapshotRef.current.auth.session
      const nodes = nodeIds
        .map(getNodeById)
        .filter(Boolean) as FileNode[]

      if (!session || nodes.length === 0) {
        toast.info("当前没有可分享的文件")
        return [] as ShareRecord[]
      }

      const input: ShareCreateInput = {
        node_ids: nodes.map((node) => node.backendId ?? Number(node.id)),
        access: options.access === "password" ? ShareAccess.PASSWORD : ShareAccess.PUBLIC,
        password: options.access === "password" && options.password ? options.password : null,
        expires_in_hours: options.expiresInHours ?? null,
        max_downloads: options.maxDownloads ?? null,
      }

      try {
        const share = await apiCreateShare(session.tokens.accessToken, input)
        const node = nodes.find((candidate) => candidate.backendId === share.node_id) ?? nodes[0]
        const newRecords: ShareRecord[] = [{
          ...mapShareRead(share),
          nodeName: node.name,
          nodeKind: node.kind,
          nodeExt: node.ext,
          nodeSize: node.size,
          nodeMediaType: node.mediaType,
          nodePreview: node.preview,
          itemCount: nodes.length,
        }]

        updateSnapshot((current) => ({
          ...current,
          shares: [...current.shares, ...newRecords],
        }))

        toast.success(`已生成 ${newRecords.length} 条分享链接`)
        return newRecords
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "创建分享失败")
        return [] as ShareRecord[]
      }
    },
    [getNodeById, updateSnapshot]
  )

  const deleteShares = React.useCallback(
    async (shareIds: string[]) => {
      const session = snapshotRef.current.auth.session
      if (!session) {
        updateSnapshot((current) => ({
          ...current,
          shares: current.shares.filter((record) => !shareIds.includes(record.id)),
        }))
        return
      }

      try {
        await Promise.all(shareIds.map((id) => apiRevokeShare(session.tokens.accessToken, id)))
        updateSnapshot((current) => ({
          ...current,
          shares: current.shares.filter((record) => !shareIds.includes(record.id)),
        }))
        toast.success("分享链接已删除")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "删除分享失败")
      }
    },
    [updateSnapshot]
  )

  const recordShareView = React.useCallback(
    (shareId: string) => {
      updateSnapshot((current) => ({
        ...current,
        shares: current.shares.map((record) =>
          record.id === shareId ? { ...record, views: record.views + 1 } : record
        ),
      }))
    },
    [updateSnapshot]
  )

  const recordShareDownload = React.useCallback(
    (shareId: string) => {
      updateSnapshot((current) => ({
        ...current,
        shares: current.shares.map((record) =>
          record.id === shareId ? { ...record, downloads: record.downloads + 1 } : record
        ),
      }))
    },
    [updateSnapshot]
  )

  return {
    shareNodes,
    deleteShares,
    recordShareView,
    recordShareDownload,
  }
}
