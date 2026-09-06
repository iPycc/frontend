import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

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
import { EMPTY_PAGE_STATE } from "@/state/core"
import { CREATE_FOLDER_EVENT } from "@/lib/file-area-events"
import type { InlineNameEdit } from "@/components/file-area/types"

const FileArea = React.lazy(() => import("@/components/file-area/FileAreaLayout").then((module) => ({ default: module.FileArea })))
const MoveDialog = React.lazy(() => import("@/components/file-area/MoveDialog").then((module) => ({ default: module.MoveDialog })))
const CreateShareDialog = React.lazy(() => import("@/components/file-area/CreateShareDialog").then((module) => ({ default: module.CreateShareDialog })))
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

const INLINE_FOLDER_ID = "__cloudrave-new-folder__"

type InlineEditState = {
  mode: "create" | "rename"
  itemId: string
  parentId: string | null
  value: string
  originalName?: string
  pending: boolean
  error?: string
}

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

function getAvailableFolderName(siblingNames: Set<string>) {
  const base = "新建文件夹"
  if (!siblingNames.has(base)) return base
  let index = 2
  while (siblingNames.has(`${base} (${index})`)) index += 1
  return `${base} (${index})`
}

export function AppFiles() {
  const location = useLocation()
  const navigate = useNavigate()
  const { openAudio } = useAudioPlayer()
  const fileDownload = useFileDownload()
  const {
    clipboard,
    activeBucket,
    authReady,
    authSession,
    isAuthenticated,
    settings,
    nodes,
    updateSettings,
    getCategoryNodes,
    getFolderPathId,
    getFoldersForBucket,
    getNodeById,
    getNodesInFolder,
    loadDirectory,
    loadDirectoryFolders,
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
  const [inlineEdit, setInlineEdit] = React.useState<InlineEditState | null>(null)
  const [moveIds, setMoveIds] = React.useState<string[]>([])
  const [moveTargetId, setMoveTargetId] = React.useState<string>("")
  const [shareDialogNodes, setShareDialogNodes] = React.useState<FileNode[]>([])
  const [downloadDialogNodes, setDownloadDialogNodes] = React.useState<FileNode[]>([])
  const [deleteIds, setDeleteIds] = React.useState<string[]>([])
  const [previewFile, setPreviewFile] = React.useState<FileNode | null>(null)
  const [resolvedFolder, setResolvedFolder] = React.useState<{ path: string; id: string } | null>(null)
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
  const knownFolderId = getFolderPathId(currentPath)
  const currentFolderId = resolvedFolder?.path === currentPath ? resolvedFolder.id : knownFolderId
  const unresolvedFolder = Boolean(!category && currentPath && !currentFolderId)
  const pageState = unresolvedFolder
    ? EMPTY_PAGE_STATE
    : category
    ? getCategoryPageState(category)
    : getDirectoryPageState(currentFolderId)
  const routeDataReady = Boolean(
    !unresolvedFolder &&
    pageState.loaded &&
    pageState.queryKey === `${sortValue}:${pageSize}`
  )

  usePageTitle(getPageTitle(category, currentPath))

  const items = React.useMemo(() => {
    return category && category in categoryMap ? getCategoryNodes(category) : getNodesInFolder(currentPath)
  }, [category, currentPath, getCategoryNodes, getNodesInFolder])

  const fileAreaItems = React.useMemo(() => {
    if (inlineEdit?.mode !== "create" || inlineEdit.parentId !== currentFolderId) return items
    const draft: FileNode = {
      id: INLINE_FOLDER_ID,
      backendId: null,
      bucketId: activeBucket.id,
      mountBackendId: activeBucket.backendId,
      parentId: inlineEdit.parentId,
      parentBackendId: inlineEdit.parentId && !inlineEdit.parentId.startsWith("root:")
        ? Number(inlineEdit.parentId)
        : null,
      kind: "folder",
      name: inlineEdit.value,
      size: 0,
      updatedAt: new Date().toISOString(),
    }
    return [draft, ...items]
  }, [activeBucket.backendId, activeBucket.id, currentFolderId, inlineEdit, items])

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
    return getFoldersForBucket(undefined, false).map((node) => ({
      id: node.id,
      name: node.name,
      parentId: node.parentId,
    }))
  }, [getFoldersForBucket])

  const moveBrowserItems = React.useMemo(
    () => nodes.filter((node) => node.bucketId === activeBucket.id && !node.deletedAt && !node.isSystemRoot),
    [activeBucket.id, nodes]
  )

  const blockedMoveFolderIds = React.useMemo(() => {
    const blocked = new Set(moveIds)
    let changed = true
    while (changed) {
      changed = false
      for (const folder of folderOptions) {
        if (folder.parentId && blocked.has(folder.parentId) && !blocked.has(folder.id)) {
          blocked.add(folder.id)
          changed = true
        }
      }
    }
    return Array.from(blocked)
  }, [folderOptions, moveIds])

  React.useEffect(() => {
    let cancelled = false
    setRouteLoading(true)

    if (!authReady || !isAuthenticated || !activeBucket.id) {
      return () => {
        cancelled = true
      }
    }

    if (routeDataReady) {
      if (!category && currentFolderId) {
        setResolvedFolder({ path: currentPath, id: currentFolderId })
      }
      setRouteLoading(false)
      return () => {
        cancelled = true
      }
    }

    const loadRoute = async () => {
      try {
        if (category) {
          setResolvedFolder(null)
          await loadCategory(category, activeBucket.id, {
            reset: true,
            limit: pageSize,
            sort: sortValue,
          })
          return
        }

        const folderId = await resolveFolderPath(currentPath, activeBucket.id, { limit: pageSize })
        if (cancelled) return
        setResolvedFolder(folderId ? { path: currentPath, id: folderId } : null)
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
  }, [activeBucket.id, authReady, category, currentFolderId, currentPath, isAuthenticated, loadCategory, loadDirectory, pageSize, resolveFolderPath, routeDataReady, sortValue])

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

  const handleCreateFolder = React.useCallback((parentId: string | null = currentFolderId) => {
    const targetParentId = parentId || activeBucket.rootNodeId
    const siblingNames = new Set(
      getFoldersForBucket(undefined, false)
        .filter((folder) => folder.parentId === targetParentId)
        .map((folder) => folder.name)
    )
    const name = getAvailableFolderName(siblingNames)

    if (targetParentId !== currentFolderId) {
      const parent = getNodeById(targetParentId)
      if (parent?.kind === "folder") {
        const parentPath = currentPath === "/" ? "" : currentPath
        const nextPath = `${parentPath}/${parent.name}`.replace(/^\//, "")
        navigate(`/app?folder=${encodeURIComponent(nextPath)}`)
      }
    }

    setSelectedIds([])
    setInlineEdit({
      mode: "create",
      itemId: INLINE_FOLDER_ID,
      parentId: targetParentId,
      value: name,
      pending: false,
    })
  }, [activeBucket.rootNodeId, currentFolderId, currentPath, getFoldersForBucket, getNodeById, navigate])

  React.useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ parentId?: string | null }>).detail
      handleCreateFolder(detail?.parentId ?? currentFolderId)
    }
    window.addEventListener(CREATE_FOLDER_EVENT, listener)
    return () => window.removeEventListener(CREATE_FOLDER_EVENT, listener)
  }, [currentFolderId, handleCreateFolder])

  const updateInlineName = React.useCallback((value: string) => {
    setInlineEdit((current) => current ? { ...current, value, error: undefined } : current)
  }, [])

  const cancelInlineEdit = React.useCallback(() => setInlineEdit(null), [])

  const submitInlineEdit = React.useCallback(async () => {
    if (!inlineEdit || inlineEdit.pending) return
    const name = inlineEdit.value.trim()
    if (!name) {
      setInlineEdit(null)
      return
    }
    if (/[\\/]/.test(name)) {
      setInlineEdit((current) => current ? { ...current, error: "名称不能包含路径分隔符" } : current)
      return
    }

    const editing = inlineEdit
    if (editing.mode === "rename" && name === editing.originalName?.trim()) {
      setInlineEdit(null)
      return
    }
    setInlineEdit((current) => current ? { ...current, value: name, pending: true, error: undefined } : current)
    if (editing.mode === "create") {
      const created = await createFolder(editing.parentId, name)
      if (created) {
        setInlineEdit(null)
      } else {
        setInlineEdit((current) => current?.itemId === editing.itemId ? { ...current, pending: false } : current)
      }
      return
    }

    try {
      await renameNode(editing.itemId, name)
      setInlineEdit(null)
    } catch (error) {
      setInlineEdit((current) => current?.itemId === editing.itemId
        ? { ...current, pending: false, error: error instanceof Error ? error.message : "重命名失败" }
        : current)
    }
  }, [createFolder, inlineEdit, renameNode])

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
    setPreviewFile(null)
    setSelectedIds([])
    setInlineEdit({
      mode: "rename",
      itemId: node.id,
      parentId: node.parentId,
      value: node.name,
      originalName: node.name,
      pending: false,
    })
  }

  const handleMoveRequest = (ids: string[]) => {
    const initialTargetId = currentFolderId || activeBucket.rootNodeId
    setMoveIds(ids)
    setMoveTargetId(initialTargetId)
    void Promise.all([
      loadDirectory(initialTargetId, activeBucket.id, { reset: true, limit: pageSize, sort: sortValue }),
      loadDirectoryFolders(initialTargetId, activeBucket.id),
    ]).catch((error) => toast.error(error instanceof Error ? error.message : "目录加载失败"))
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

  const inlineNameEdit: InlineNameEdit | undefined = inlineEdit
    ? {
        itemId: inlineEdit.itemId,
        mode: inlineEdit.mode,
        value: inlineEdit.value,
        pending: inlineEdit.pending,
        error: inlineEdit.error,
        onValueChange: updateInlineName,
        onSubmit: () => void submitInlineEdit(),
        onCancel: cancelInlineEdit,
      }
    : undefined

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
              <div
                className="app-panel min-w-0 flex-1 rounded-xl border border-border dark:border-white/10"
                aria-hidden="true"
              />
            )}
          >
            <FileArea
              items={fileAreaItems}
              loading={routeLoading || unresolvedFolder || pageState.loading}
              loaded={pageState.loaded}
              metadataLoaded={pageState.metadataLoaded}
              folderCount={pageState.folderCount}
              fileCount={pageState.fileCount}
              hasMore={Boolean(pageState.nextCursor)}
              currentPath={currentPath}
              selectedIds={selectedIds}
              inlineEdit={inlineNameEdit}
              viewMode={viewMode}
              sortValue={sortValue}
              pageSize={pageSize}
              showThumbnail={thumbnailsEnabled}
              canPaste={Boolean(clipboard)}
              onSelectNode={handleSelectNode}
              onSelectIds={setSelectedIds}
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

        {moveIds.length > 0 ? (
          <MoveDialog
            open
            folders={folderOptions}
            items={moveBrowserItems}
            root={{ id: activeBucket.rootNodeId, name: activeBucket.name }}
            disabledFolderIds={blockedMoveFolderIds}
            value={moveTargetId}
            onValueChange={setMoveTargetId}
            onBrowseFolder={async (folderId) => {
              await Promise.all([
                loadDirectory(folderId, activeBucket.id, { reset: true, limit: pageSize, sort: "name-asc" }),
                loadDirectoryFolders(folderId, activeBucket.id),
              ])
            }}
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

      </React.Suspense>
    </>
  )
}
