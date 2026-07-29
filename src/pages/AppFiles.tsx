import * as React from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"

import { FileAreaPending } from "@/components/file-area/FileAreaPending"
import { Toolbar } from "@/components/toolbar/Toolbar"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/state/app"
import { useUploadState } from "@/lib/upload/provider"
import { usePropertiesPanel } from "@/components/shared/PropertiesPanelContext"
import { type FileNode, type SortValue, type ViewMode } from "@/lib/models"
import { buildArchiveDownloadUrl, buildDownloadUrl, buildFolderDownloadUrl, listNodesForDownload, prefetchPreviewManifest, recordNodeOpen } from "@/api/files"
import { updateUserPreferences } from "@/api/user"
import { useAudioPlayer } from "@/components/audio/AudioPlayerProvider"
import { useFileDownload } from "@/hooks/use-file-download"
import { loadFileViewPreferences, saveFileViewPreferences } from "@/lib/file-view-preferences"

const RenameDialog = React.lazy(() => import("@/components/file-area/RenameDialog").then((module) => ({ default: module.RenameDialog })))
const FileArea = React.lazy(() => import("@/components/file-area/FileAreaLayout").then((module) => ({ default: module.FileArea })))
const MoveDialog = React.lazy(() => import("@/components/file-area/MoveDialog").then((module) => ({ default: module.MoveDialog })))
const CreateShareDialog = React.lazy(() => import("@/components/file-area/CreateShareDialog").then((module) => ({ default: module.CreateShareDialog })))
const CreateFolderDialog = React.lazy(() => import("@/components/file-area/CreateFolderDialog").then((module) => ({ default: module.CreateFolderDialog })))
const DeleteConfirmDialog = React.lazy(() => import("@/components/file-area/DeleteConfirmDialog").then((module) => ({ default: module.DeleteConfirmDialog })))
const FilePreviewModal = React.lazy(() => import("@/components/file-area/FilePreviewModal").then((module) => ({ default: module.FilePreviewModal })))
const DownloadMethodDialog = React.lazy(() => import("@/components/download/DownloadMethodDialog").then((module) => ({ default: module.DownloadMethodDialog })))
const TransferManager = React.lazy(() => import("@/components/transfer/TransferManager").then((module) => ({ default: module.TransferManager })))

const categoryMap = {
  image: "图片",
  video: "视频",
  audio: "音频",
  document: "文档",
} as const

function getPageTitle(category: keyof typeof categoryMap | null, currentPath: string) {
  if (category && category in categoryMap) {
    return categoryMap[category]
  }
  if (currentPath) {
    const parts = currentPath.split("/").filter(Boolean)
    if (parts.length > 0) {
      return parts[parts.length - 1]
    }
  }
  return "我的文件"
}

function isPreviewable(file: FileNode) {
  const mt = file.mediaType
  if (mt === "image" || mt === "video" || mt === "audio" || mt === "document" || mt === "code" || mt === "archive") return true
  const ext = file.ext?.toLowerCase() ?? ""
  return ["txt", "md", "json", "log", "csv", "xml", "yaml", "yml", "ini", "conf", "zip", "tar", "gz", "tgz", "7z", "rar"].includes(ext)
}

export function AppFiles() {
  const location = useLocation()
  const { openAudio } = useAudioPlayer()
  const fileDownload = useFileDownload()
  const {
    clipboard,
    activeBucket,
    authReady,
    authSession,
    isAuthenticated,
    settings,
    updateSettings,
    getCategoryNodes,
    getFolderPathId,
    getFoldersForBucket,
    getNodeById,
    getNodesInFolder,
    loadDirectory,
    resolveFolderPath,
    getDirectoryPageState,
    loadCategory,
    getCategoryPageState,
    createFolder,
    renameNode,
    moveNodes,
    deleteNodes,
    shareNodes,
    copyNodes,
    cutNodes,
    pasteNodes,
    formatBytes,
  } = useAppState()
  const {
    requestUpload,
    requestFolderUpload,
    queueUploadFiles,
  } = useUploadState()
  const {
    open: openPropertiesPanel,
    openMulti: openMultiPropertiesPanel,
    toggle: togglePropertiesPanel,
    close: closePropertiesPanel,
    node: panelNode,
    nodes: panelNodes,
  } = usePropertiesPanel()
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [viewPreferences, setViewPreferences] = React.useState(loadFileViewPreferences)
  const { viewMode, sortValue, pageSize } = viewPreferences
  const thumbnailsEnabled = settings.thumbnailsEnabled
  const thumbnailPreferenceRequestRef = React.useRef(0)
  const [renameTargetId, setRenameTargetId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState("")
  const [moveIds, setMoveIds] = React.useState<string[]>([])
  const [moveTargetId, setMoveTargetId] = React.useState<string>("")
  const [shareDialogNodes, setShareDialogNodes] = React.useState<FileNode[]>([])
  const [downloadDialogNodes, setDownloadDialogNodes] = React.useState<FileNode[]>([])
  const [deleteIds, setDeleteIds] = React.useState<string[]>([])
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false)
  const [createFolderParentId, setCreateFolderParentId] = React.useState<string | null>(null)
  const [previewFile, setPreviewFile] = React.useState<FileNode | null>(null)
  const [resolvedFolderId, setResolvedFolderId] = React.useState<string | null>(null)
  const [routeLoading, setRouteLoading] = React.useState(true)

  const setViewMode = React.useCallback((value: ViewMode) => {
    setViewPreferences((current) => ({ ...current, viewMode: value }))
  }, [])
  const setSortValue = React.useCallback((value: SortValue) => {
    setViewPreferences((current) => ({ ...current, sortValue: value }))
  }, [])
  const setThumbnailsEnabled = React.useCallback((value: boolean) => {
    const previous = settings.thumbnailsEnabled
    const requestId = thumbnailPreferenceRequestRef.current + 1
    thumbnailPreferenceRequestRef.current = requestId
    updateSettings({ thumbnailsEnabled: value })
    const token = authSession?.tokens.accessToken
    if (!token) {
      updateSettings({ thumbnailsEnabled: previous })
      return
    }
    void updateUserPreferences(token, { thumbnailsEnabled: value }).catch((error) => {
      if (thumbnailPreferenceRequestRef.current !== requestId) return
      updateSettings({ thumbnailsEnabled: previous })
      toast.error(error instanceof Error ? error.message : "缩略图设置保存失败")
    })
  }, [authSession?.tokens.accessToken, settings.thumbnailsEnabled, updateSettings])
  const setPageSize = React.useCallback((value: number) => {
    setViewPreferences((current) => ({ ...current, pageSize: value }))
  }, [])

  React.useEffect(() => {
    saveFileViewPreferences(viewPreferences)
  }, [viewPreferences])

  const searchParams = new URLSearchParams(location.search)
  const rawCategory = searchParams.get("type")
  const category = rawCategory && rawCategory in categoryMap ? (rawCategory as keyof typeof categoryMap) : null
  const currentPath = searchParams.get("folder") ?? ""
  const currentFolderId = resolvedFolderId ?? getFolderPathId(currentPath)
  const pageState = category
    ? getCategoryPageState(category)
    : getDirectoryPageState(currentFolderId)

  usePageTitle(getPageTitle(category, currentPath))

  const items = React.useMemo(() => {
    return category && category in categoryMap ? getCategoryNodes(category) : getNodesInFolder(currentPath)
  }, [category, currentPath, getCategoryNodes, getNodesInFolder])

  const selectedNodes = React.useMemo(
    () => selectedIds.map(getNodeById).filter(Boolean) as FileNode[],
    [getNodeById, selectedIds]
  )
  const selectedNodeIdsSignature = React.useMemo(() => selectedNodes.map((node) => node.id).join("|"), [selectedNodes])
  const panelNodeIdsSignature = React.useMemo(() => panelNodes.map((node) => node.id).join("|"), [panelNodes])

  const previewableFiles = React.useMemo(
    () => items.filter((item) => item.kind === "file" && isPreviewable(item)),
    [items]
  )

  const previewIndex = React.useMemo(() => {
    if (!previewFile) return 0
    const idx = previewableFiles.findIndex((file) => file.id === previewFile.id)
    return idx >= 0 ? idx : 0
  }, [previewFile, previewableFiles])

  const adjacentPreviewFiles = React.useMemo(() => {
    if (previewableFiles.length <= 1) return []
    return [
      previewableFiles[(previewIndex - 1 + previewableFiles.length) % previewableFiles.length],
      previewableFiles[(previewIndex + 1) % previewableFiles.length],
    ]
  }, [previewIndex, previewableFiles])

  const pathParts = currentPath.split("/").filter(Boolean)
  const folderOptions = React.useMemo(() => {
    const root = { id: activeBucket.rootNodeId, name: `${activeBucket.name} /` }
    return [root, ...getFoldersForBucket(undefined, false).map((node) => ({ id: node.id, name: node.name }))]
  }, [activeBucket.name, activeBucket.rootNodeId, getFoldersForBucket])

  React.useEffect(() => {
    let cancelled = false
    setRouteLoading(true)

    if (!authReady || !isAuthenticated || !activeBucket.id) {
      return () => {
        cancelled = true
      }
    }

    const loadRoute = async () => {
      try {
        if (category) {
          setResolvedFolderId(null)
          await loadCategory(category, activeBucket.id, {
            reset: true,
            limit: pageSize,
            sort: sortValue,
          })
          return
        }

        const folderId = await resolveFolderPath(currentPath, activeBucket.id, { limit: pageSize })
        if (cancelled) return
        setResolvedFolderId(folderId)
        if (folderId) {
          await loadDirectory(folderId, activeBucket.id, {
            reset: true,
            limit: pageSize,
            sort: sortValue,
          })
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "目录加载失败")
        }
      } finally {
        if (!cancelled) {
          setRouteLoading(false)
        }
      }
    }

    void loadRoute()
    return () => {
      cancelled = true
    }
  }, [activeBucket.id, authReady, category, currentPath, isAuthenticated, loadCategory, loadDirectory, pageSize, resolveFolderPath, sortValue])

  React.useEffect(() => {
    setSelectedIds([])
  }, [currentPath, category])

  // Properties panel is managed independently; do not auto-close on selection change.

  const handlePropertiesRequest = React.useCallback(
    (ids: string[]) => {
      if (ids.length === 1) {
        const node = getNodeById(ids[0])
        if (node) togglePropertiesPanel(node)
      } else if (ids.length > 1) {
        const nodes = ids.map(getNodeById).filter(Boolean) as FileNode[]
        if (nodes.length > 0) {
          if (panelNode && ids.join("|") === panelNodes.map((n) => n.id).join("|")) {
            closePropertiesPanel()
          } else {
            openMultiPropertiesPanel(nodes)
          }
        }
      }
    },
    [getNodeById, togglePropertiesPanel, openMultiPropertiesPanel, closePropertiesPanel, panelNode, panelNodes]
  )

  const handleSelectNode = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const handlePrepareContext = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current : [id]))
  }

  const handleCreateFolder = (parentId = currentFolderId) => {
    setCreateFolderParentId(parentId)
    setCreateFolderOpen(true)
  }

  const submitCreateFolder = async (name: string) => {
    const created = await createFolder(createFolderParentId, name)
    if (created) {
      toast.success("文件夹已创建")
    }
  }

  const handleUpload = () => {
    requestUpload(currentFolderId)
  }

  const handleFolderUpload = () => {
    requestFolderUpload(currentFolderId)
  }

  const handleRefresh = async () => {
    if (category) {
      await loadCategory(category, activeBucket.id, {
        reset: true,
        limit: pageSize,
        sort: sortValue,
      })
      return
    }
    if (currentFolderId) {
      await loadDirectory(currentFolderId, activeBucket.id, {
        reset: true,
        limit: pageSize,
        sort: sortValue,
      })
    }
  }

  const handleLoadMore = async () => {
    if (category) {
      await loadCategory(category, activeBucket.id, { limit: pageSize, sort: sortValue })
      return
    }
    if (currentFolderId) {
      await loadDirectory(currentFolderId, activeBucket.id, { limit: pageSize, sort: sortValue })
    }
  }

  const handleRenameRequest = (ids: string[]) => {
    const node = getNodeById(ids[0])
    if (!node || ids.length !== 1) return
    setRenameTargetId(node.id)
    setRenameValue(node.name)
  }

  const handleMoveRequest = (ids: string[]) => {
    setMoveIds(ids)
    setMoveTargetId(currentFolderId || activeBucket.rootNodeId)
  }

  const handleShareRequest = (ids: string[]) => {
    const nodes = ids
      .map((id) => getNodeById(id))
      .filter(Boolean) as FileNode[]
    if (nodes.length === 0) {
      toast.info("当前没有可分享的文件")
      return
    }
    setShareDialogNodes(nodes)
  }

  const handleCreateShare = async (nodeIds: string[], options: import("@/components/file-area/CreateShareDialog").ShareOptions) => {
    const records = await shareNodes(nodeIds, {
      access: options.access,
      password: options.password,
      expiresInHours: options.expiresInHours,
      maxDownloads: options.maxDownloads,
    })
    return records
  }

  const downloadSingleFile = async (node: FileNode) => {
    try {
      if (!node.backendId) throw new Error("没有可下载的文件")
      const completed = await fileDownload.download(buildDownloadUrl(node.backendId), node.name)
      if (completed) toast.success("下载已保存")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载失败")
    }
  }

  const handleDownloadRequest = (ids: string[]) => {
    const nodes = ids.map(getNodeById).filter((node): node is FileNode => Boolean(node?.backendId))
    if (!nodes.length) {
      toast.error("没有可下载的文件")
      return
    }
    if (nodes.length === 1 && nodes[0].kind === "file") {
      void downloadSingleFile(nodes[0])
      return
    }
    setDownloadDialogNodes(nodes)
  }

  const downloadAsArchive = async () => {
    const nodes = downloadDialogNodes
    if (!nodes.length) return
    const backendIds = nodes.map((node) => node.backendId).filter((id): id is number => Boolean(id))
    const onlyNode = nodes.length === 1 ? nodes[0] : null
    try {
      const url = onlyNode?.kind === "folder"
        ? buildFolderDownloadUrl(backendIds[0])
        : buildArchiveDownloadUrl(backendIds)
      const name = onlyNode ? `${onlyNode.name}.zip` : `Cloudrave-${nodes.length}项.zip`
      const completed = await fileDownload.download(url, name)
      if (completed) toast.success("ZIP 下载已保存")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载失败")
    } finally {
      setDownloadDialogNodes([])
    }
  }

  const downloadAsDirectory = async () => {
    const nodes = downloadDialogNodes
    if (!nodes.length) return
    const mountId = nodes[0].mountBackendId ?? activeBucket.backendId
    if (!mountId) {
      toast.error("无法确定文件所在的存储挂载")
      return
    }
    try {
      const completed = await fileDownload.downloadToDirectory(
        nodes.map((node) => ({ id: node.backendId as number, name: node.name, type: node.kind, size: node.size })),
        {
          getChildren: async (folder) => (await listNodesForDownload(mountId, folder.id)).map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type,
            size: node.size,
          })),
          buildFileUrl: (file) => buildDownloadUrl(file.id),
        }
      )
      if (completed) toast.success("原始文件已保存")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "文件夹下载失败")
    } finally {
      setDownloadDialogNodes([])
    }
  }

  const handleDeleteRequest = (ids: string[]) => {
    setDeleteIds(ids)
  }

  const handleCopy = () => {
    copyNodes(selectedIds)
    toast.success("已复制到剪贴板")
  }

  const handleCut = () => {
    cutNodes(selectedIds)
    toast.success("已剪切")
  }

  const handleCopyIds = (ids: string[]) => {
    copyNodes(ids)
    toast.success("已复制到剪贴板")
  }

  const handleCutIds = (ids: string[]) => {
    cutNodes(ids)
    toast.success("已剪切")
  }

  const handlePaste = async () => {
    await pasteNodes(currentFolderId)
  }

  const submitRename = async (name: string) => {
    if (!renameTargetId) return
    await renameNode(renameTargetId, name)
    setRenameTargetId(null)
    setRenameValue("")
    toast.success("已重命名")
  }

  const submitMove = async (targetId: string) => {
    if (!moveIds.length) return
    await moveNodes(moveIds, targetId)
    setMoveIds([])
  }

  const submitDelete = async () => {
    await deleteNodes(deleteIds)
    setSelectedIds([])
    setDeleteIds([])
    toast.success("已移入回收站")
  }

  const handleOpenFile = React.useCallback(
    async (node: FileNode) => {
      if (node.backendId) {
        void recordNodeOpen(node.backendId).catch(() => undefined)
      }
      if (node.mediaType === "audio") {
        openAudio(node, previewableFiles)
        return
      }
      if (node.backendId) {
        try {
          await prefetchPreviewManifest(node.backendId)
        } catch {
          // The modal owns the visible retry/error state.
        }
      }
      setPreviewFile(node)
    },
    [openAudio, previewableFiles]
  )

  const handlePreviewPrev = React.useCallback(async () => {
    if (previewableFiles.length <= 1) return
    const index = (previewIndex - 1 + previewableFiles.length) % previewableFiles.length
    const next = previewableFiles[index]
    if (next.backendId) await prefetchPreviewManifest(next.backendId).catch(() => undefined)
    setPreviewFile(next)
  }, [previewIndex, previewableFiles])

  const handlePreviewNext = React.useCallback(async () => {
    if (previewableFiles.length <= 1) return
    const index = (previewIndex + 1) % previewableFiles.length
    const next = previewableFiles[index]
    if (next.backendId) await prefetchPreviewManifest(next.backendId).catch(() => undefined)
    setPreviewFile(next)
  }, [previewIndex, previewableFiles])

  return (
    <>
      <Toolbar
        pathParts={pathParts}
        currentLabel={category ? categoryMap[category] : undefined}
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortValue={sortValue}
        onSortChange={setSortValue}
        thumbnailsEnabled={thumbnailsEnabled}
        onThumbnailsChange={setThumbnailsEnabled}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onRefresh={handleRefresh}
        onCreateFolder={() => handleCreateFolder()}
        onPaste={() => void handlePaste()}
        canPaste={Boolean(clipboard)}
        onCopy={handleCopy}
        onCut={handleCut}
        onDelete={() => handleDeleteRequest(selectedIds)}
        onRename={() => handleRenameRequest(selectedIds)}
        onShare={() => void handleShareRequest(selectedIds)}
        onDownload={() => handleDownloadRequest(selectedIds)}
        onProperties={() => {
          if (selectedNodes.length === 1) {
            handlePropertiesRequest([selectedNodes[0].id])
          } else if (selectedNodes.length > 1) {
            if (panelNode && selectedNodeIdsSignature === panelNodeIdsSignature) {
              closePropertiesPanel()
            } else {
              openMultiPropertiesPanel(selectedNodes)
            }
          }
        }}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div key={location.pathname + location.search} className="flex min-w-0 flex-1">
          <React.Suspense
            fallback={(
              <FileAreaPending
                metadataLoaded={pageState.metadataLoaded}
                folderCount={pageState.folderCount}
                fileCount={pageState.fileCount}
                pageSize={pageSize}
                viewMode={viewMode}
                showThumbnail={thumbnailsEnabled}
              />
            )}
          >
            <FileArea
              items={items}
              loading={routeLoading || pageState.loading}
              metadataLoaded={pageState.metadataLoaded}
              folderCount={pageState.folderCount}
              fileCount={pageState.fileCount}
              hasMore={Boolean(pageState.nextCursor)}
              currentPath={currentPath}
              selectedIds={selectedIds}
              viewMode={viewMode}
              sortValue={sortValue}
              pageSize={pageSize}
              showThumbnail={thumbnailsEnabled}
              canPaste={Boolean(clipboard)}
              onSelectNode={handleSelectNode}
              onPrepareContext={handlePrepareContext}
              onClearSelection={() => setSelectedIds([])}
              onRenameRequest={handleRenameRequest}
              onMoveRequest={handleMoveRequest}
              onShareRequest={(ids) => void handleShareRequest(ids)}
              onDownloadRequest={handleDownloadRequest}
              onDeleteRequest={handleDeleteRequest}
              onCopyRequest={handleCopyIds}
              onCutRequest={handleCutIds}
              onPropertiesRequest={handlePropertiesRequest}
              onOpenFile={handleOpenFile}
              onCreateFolder={() => handleCreateFolder()}
              onCreateChildFolder={handleCreateFolder}
              onUploadRequest={handleUpload}
              onUploadFolderRequest={handleFolderUpload}
              onDropUpload={(files) => queueUploadFiles(files, currentFolderId)}
              onRefresh={() => void handleRefresh()}
              onLoadMore={() => void handleLoadMore()}
              onPaste={() => void handlePaste()}
              onViewModeChange={setViewMode}
              onSortChange={setSortValue}
            />
          </React.Suspense>
        </div>

        <React.Suspense fallback={null}>
          <TransferManager
            parentId={currentFolderId}
            downloadTask={fileDownload.task}
            onCancelDownload={fileDownload.cancel}
            onDismissDownload={fileDownload.dismiss}
            placement="content"
          />
        </React.Suspense>
      </div>
      <React.Suspense fallback={null}>
        {downloadDialogNodes.length > 0 ? (
          <DownloadMethodDialog
            open
            itemCount={downloadDialogNodes.length}
            supportsDirectoryDownload={fileDownload.supportsDirectoryDownload}
            onOpenChange={(open) => !open && setDownloadDialogNodes([])}
            onDirectoryDownload={() => void downloadAsDirectory()}
            onArchiveDownload={() => void downloadAsArchive()}
          />
        ) : null}

        {previewFile ? (
          <FilePreviewModal
            key={previewFile.id}
            open
            file={previewFile}
            preloadFiles={adjacentPreviewFiles}
            currentIndex={previewIndex}
            totalCount={previewableFiles.length}
            onClose={() => setPreviewFile(null)}
            onDownload={handleDownloadRequest}
            onProperties={(id) => handlePropertiesRequest([id])}
            onCopy={handleCopyIds}
            onCut={handleCutIds}
            onRename={handleRenameRequest}
            onMove={handleMoveRequest}
            onShare={(ids) => void handleShareRequest(ids)}
            onDelete={handleDeleteRequest}
            onPrev={handlePreviewPrev}
            onNext={handlePreviewNext}
          />
        ) : null}

        {renameTargetId ? (
          <RenameDialog
            open
            title="重命名"
            value={renameValue}
            onValueChange={setRenameValue}
            onCancel={() => {
              setRenameTargetId(null)
              setRenameValue("")
            }}
            onSubmit={(value) => void submitRename(value)}
          />
        ) : null}

        {moveIds.length > 0 ? (
          <MoveDialog
            open
            folders={folderOptions}
            value={moveTargetId}
            onValueChange={setMoveTargetId}
            onCancel={() => setMoveIds([])}
            onSubmit={(value) => void submitMove(value)}
          />
        ) : null}

        {shareDialogNodes.length > 0 ? (
          <CreateShareDialog
            open
            nodes={shareDialogNodes}
            onOpenChange={(open) => !open && setShareDialogNodes([])}
            onCreate={handleCreateShare}
          />
        ) : null}

        {deleteIds.length > 0 ? (
          <DeleteConfirmDialog
            open
            count={deleteIds.length}
            onCancel={() => setDeleteIds([])}
            onConfirm={() => void submitDelete()}
          />
        ) : null}

        {createFolderOpen ? (
          <CreateFolderDialog
            open
            onOpenChange={setCreateFolderOpen}
            defaultName="新建文件夹"
            locationLabel={currentPath ? `位置：${currentPath}` : activeBucket.name}
            onSubmit={(name) => void submitCreateFolder(name)}
          />
        ) : null}
      </React.Suspense>
    </>
  )
}
