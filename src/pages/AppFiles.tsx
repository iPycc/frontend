import * as React from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"

import { FileArea, RenameDialog, MoveDialog, ShareDialog, DeleteConfirmDialog, FilePreviewModal, DocumentPreviewModal, UploadQueueDock } from "@/components/file-area"
import { Toolbar } from "@/components/toolbar/Toolbar"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { usePropertiesPanel } from "@/components/shared/PropertiesPanel"
import { type FileNode, type SortValue, type ViewMode } from "@/lib/models"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { buildDownloadUrl } from "@/api/files"

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

function getPreviewType(file: FileNode): "media" | "document" | null {
  const mt = file.mediaType
  if (mt === "image" || mt === "video" || mt === "audio") return "media"
  if (mt === "document" || mt === "code") return "document"
  const ext = file.ext?.toLowerCase() ?? ""
  if (["txt", "md", "json", "log", "csv", "xml", "yaml", "yml", "ini", "conf"].includes(ext)) return "document"
  return null
}

export function AppFiles() {
  const location = useLocation()
  const {
    authSession,
    clipboard,
    activeBucket,
    getCategoryNodes,
    getFolderPathId,
    getFoldersForBucket,
    getNodeById,
    getNodesInFolder,
    createFolder,
    renameNode,
    moveNodes,
    deleteNodes,
    shareNodes,
    copyNodes,
    cutNodes,
    pasteNodes,
    formatBytes,
    requestUpload,
  } = useAppState()
  const {
    open: openPropertiesPanel,
    openMulti: openMultiPropertiesPanel,
    toggle: togglePropertiesPanel,
    close: closePropertiesPanel,
    node: panelNode,
    nodes: panelNodes,
  } = usePropertiesPanel()
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")
  const [sortValue, setSortValue] = React.useState<SortValue>("name-asc")
  const [thumbnailsEnabled, setThumbnailsEnabled] = React.useState(true)
  const [pageSize, setPageSize] = React.useState(200)
  const [renameTargetId, setRenameTargetId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState("")
  const [moveIds, setMoveIds] = React.useState<string[]>([])
  const [moveTargetId, setMoveTargetId] = React.useState<string>("")
  const [shareLinks, setShareLinks] = React.useState<string[]>([])
  const [deleteIds, setDeleteIds] = React.useState<string[]>([])
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false)
  const [createFolderName, setCreateFolderName] = React.useState("新建文件夹")
  const [createFolderParentId, setCreateFolderParentId] = React.useState<string | null>(null)
  const [fileAreaLoading, setFileAreaLoading] = React.useState(false)
  const [fileAreaLoadingLabel, setFileAreaLoadingLabel] = React.useState("正在加载内容")
  const [mediaPreviewFile, setMediaPreviewFile] = React.useState<FileNode | null>(null)
  const [docPreviewFile, setDocPreviewFile] = React.useState<FileNode | null>(null)
  const loadingTimerRef = React.useRef<number | null>(null)
  const routeKeyRef = React.useRef<string | null>(null)

  const searchParams = new URLSearchParams(location.search)
  const category = searchParams.get("type") as keyof typeof categoryMap | null
  const currentPath = searchParams.get("folder") ?? ""
  const currentFolderId = getFolderPathId(currentPath)

  usePageTitle(getPageTitle(category, currentPath))

  const items = React.useMemo(() => {
    const source = category && category in categoryMap ? getCategoryNodes(category) : getNodesInFolder(currentPath)
    return [...source].sort((left, right) => compareNodes(left, right, sortValue))
  }, [category, currentPath, getCategoryNodes, getNodesInFolder, sortValue])

  const selectedNodes = React.useMemo(
    () => selectedIds.map(getNodeById).filter(Boolean) as FileNode[],
    [getNodeById, selectedIds]
  )
  const selectedNodeIdsSignature = React.useMemo(() => selectedNodes.map((node) => node.id).join("|"), [selectedNodes])
  const panelNodeIdsSignature = React.useMemo(() => panelNodes.map((node) => node.id).join("|"), [panelNodes])

  const mediaFiles = React.useMemo(
    () => items.filter((item) => item.kind === "file" && getPreviewType(item) === "media"),
    [items]
  )

  const mediaPreviewIndex = React.useMemo(() => {
    if (!mediaPreviewFile) return 0
    const idx = mediaFiles.findIndex((f) => f.id === mediaPreviewFile.id)
    return idx >= 0 ? idx : 0
  }, [mediaPreviewFile, mediaFiles])

  const pathParts = currentPath.split("/").filter(Boolean)
  const folderOptions = React.useMemo(() => {
    const root = { id: activeBucket.rootNodeId, name: `${activeBucket.name} /` }
    return [root, ...getFoldersForBucket(undefined, false).map((node) => ({ id: node.id, name: node.name }))]
  }, [activeBucket.name, activeBucket.rootNodeId, getFoldersForBucket])

  React.useEffect(() => {
    setSelectedIds([])
  }, [currentPath, category])

  // Properties panel is managed independently; do not auto-close on selection change.

  const startFileAreaLoading = React.useCallback((label = "正在加载内容", duration = 320) => {
    setFileAreaLoadingLabel(label)
    setFileAreaLoading(true)
    if (loadingTimerRef.current) {
      window.clearTimeout(loadingTimerRef.current)
    }
    loadingTimerRef.current = window.setTimeout(() => {
      setFileAreaLoading(false)
      loadingTimerRef.current = null
    }, duration)
  }, [])

  React.useEffect(() => {
    const routeKey = `${location.pathname}${location.search}`
    if (routeKeyRef.current && routeKeyRef.current !== routeKey) {
      startFileAreaLoading("正在进入目录", 220)
    }
    routeKeyRef.current = routeKey
  }, [location.pathname, location.search, startFileAreaLoading])

  React.useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current)
      }
    }
  }, [])

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
    setCreateFolderName("新建文件夹")
    setCreateFolderOpen(true)
  }

  const submitCreateFolder = async () => {
    const name = createFolderName.trim()
    if (!name) return
    await createFolder(createFolderParentId, name)
    setCreateFolderOpen(false)
    toast.success("文件夹已创建")
  }

  const handleUpload = () => {
    requestUpload(currentFolderId)
  }

  const handleRefresh = () => {
    startFileAreaLoading("正在同步目录", 420)
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

  const handleShareRequest = async (ids: string[]) => {
    const records = await shareNodes(ids)
    setShareLinks(records.map((record) => `https://share.cloudrave.app/${record.id}`))
  }

  const handleDownloadRequest = async (ids: string[]) => {
    if (!authSession) {
      return
    }

    try {
      for (const id of ids) {
        const node = getNodeById(id)
        if (!node?.backendId) {
          continue
        }

        const response = await fetch(buildDownloadUrl(node.backendId), {
          headers: {
            Authorization: `Bearer ${authSession.tokens.accessToken}`,
          },
        })
        if (!response.ok) {
          throw new Error(`下载 ${node.name} 失败`)
        }

        const blob = await response.blob()
        const objectUrl = window.URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = objectUrl
        anchor.download = node.name
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.URL.revokeObjectURL(objectUrl)
      }

      toast.success("开始下载")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载失败")
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
    (node: FileNode) => {
      const type = getPreviewType(node)
      if (type === "media") {
        setMediaPreviewFile(node)
      } else if (type === "document") {
        setDocPreviewFile(node)
      } else {
        openPropertiesPanel(node)
      }
    },
    [openPropertiesPanel]
  )

  const handleMediaPrev = React.useCallback(() => {
    if (mediaFiles.length <= 1) return
    const idx = (mediaPreviewIndex - 1 + mediaFiles.length) % mediaFiles.length
    setMediaPreviewFile(mediaFiles[idx])
  }, [mediaFiles, mediaPreviewIndex])

  const handleMediaNext = React.useCallback(() => {
    if (mediaFiles.length <= 1) return
    const idx = (mediaPreviewIndex + 1) % mediaFiles.length
    setMediaPreviewFile(mediaFiles[idx])
  }, [mediaFiles, mediaPreviewIndex])

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
        onDownload={() => void handleDownloadRequest(selectedIds)}
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
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname + location.search}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="contents"
        >
          <FileArea
            items={items}
            currentPath={currentPath}
            selectedIds={selectedIds}
            viewMode={viewMode}
            sortValue={sortValue}
            showThumbnail={thumbnailsEnabled}
            isLoading={fileAreaLoading}
            loadingLabel={fileAreaLoadingLabel}
            canPaste={Boolean(clipboard)}
            onSelectNode={handleSelectNode}
            onPrepareContext={handlePrepareContext}
            onClearSelection={() => setSelectedIds([])}
            onRenameRequest={handleRenameRequest}
            onMoveRequest={handleMoveRequest}
            onShareRequest={(ids) => void handleShareRequest(ids)}
            onDownloadRequest={(ids) => void handleDownloadRequest(ids)}
            onDeleteRequest={handleDeleteRequest}
            onCopyRequest={handleCopyIds}
            onCutRequest={handleCutIds}
            onPropertiesRequest={handlePropertiesRequest}
            onOpenFile={handleOpenFile}
            onCreateFolder={() => handleCreateFolder()}
            onCreateChildFolder={handleCreateFolder}
            onUploadRequest={handleUpload}
            onRefresh={handleRefresh}
            onPaste={() => void handlePaste()}
            onViewModeChange={setViewMode}
            onSortChange={setSortValue}
          />
        </motion.div>
      </AnimatePresence>

      <UploadQueueDock parentId={currentFolderId} />

      <FilePreviewModal
        open={Boolean(mediaPreviewFile)}
        file={mediaPreviewFile}
        currentIndex={mediaPreviewIndex}
        totalCount={mediaFiles.length}
        onClose={() => setMediaPreviewFile(null)}
        onDownload={(ids) => void handleDownloadRequest(ids)}
        onProperties={(id) => handlePropertiesRequest([id])}
        onCopy={handleCopyIds}
        onCut={handleCutIds}
        onRename={handleRenameRequest}
        onMove={handleMoveRequest}
        onShare={(ids) => void handleShareRequest(ids)}
        onDelete={handleDeleteRequest}
        onPrev={handleMediaPrev}
        onNext={handleMediaNext}
      />

      <DocumentPreviewModal
        open={Boolean(docPreviewFile)}
        file={docPreviewFile}
        onClose={() => setDocPreviewFile(null)}
      />

      <RenameDialog
        open={Boolean(renameTargetId)}
        title="重命名"
        value={renameValue}
        onValueChange={setRenameValue}
        onCancel={() => {
          setRenameTargetId(null)
          setRenameValue("")
        }}
        onSubmit={(value) => void submitRename(value)}
      />

      <MoveDialog
        open={moveIds.length > 0}
        folders={folderOptions}
        value={moveTargetId}
        onValueChange={setMoveTargetId}
        onCancel={() => setMoveIds([])}
        onSubmit={(value) => void submitMove(value)}
      />

      <ShareDialog
        open={shareLinks.length > 0}
        links={shareLinks}
        onOpenChange={(open) => !open && setShareLinks([])}
      />

      <DeleteConfirmDialog
        open={deleteIds.length > 0}
        count={deleteIds.length}
        onCancel={() => setDeleteIds([])}
        onConfirm={() => void submitDelete()}
      />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">请输入文件夹名称</label>
            <Input
              value={createFolderName}
              onChange={(event) => setCreateFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitCreateFolder()
              }}
              autoFocus
              onFocus={(event) => event.target.select()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              取消
            </Button>
            <Button onClick={() => void submitCreateFolder()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function compareNodes(left: FileNode, right: FileNode, sortValue: SortValue) {
  if (left.kind !== right.kind) {
    return left.kind === "folder" ? -1 : 1
  }

  switch (sortValue) {
    case "updated-desc":
      return right.updatedAt.localeCompare(left.updatedAt)
    case "updated-asc":
      return left.updatedAt.localeCompare(right.updatedAt)
    case "name-desc":
      return right.name.localeCompare(left.name, "zh-CN")
    case "size-desc":
      return (right.size ?? 0) - (left.size ?? 0)
    case "name-asc":
    default:
      return left.name.localeCompare(right.name, "zh-CN")
  }
}

