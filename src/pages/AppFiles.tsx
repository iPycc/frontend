import * as React from "react"
import { useLocation } from "react-router-dom"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"

import { FileArea } from "@/components/file-area"
import {
  RenameDialog,
  MoveDialog,
  PropertiesDialog,
  ShareDialog,
  DeleteConfirmDialog,
} from "@/components/file-area"
import { Toolbar } from "@/components/toolbar/Toolbar"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { type FileNode, type SortValue, type ViewMode } from "@/lib/mock-data"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const categoryMap = {
  image: "图片",
  video: "视频",
  audio: "音乐",
  document: "文档",
} as const

function getPageTitle(
  category: keyof typeof categoryMap | null,
  currentPath: string
): string {
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

export function AppFiles() {
  const location = useLocation()
  const {
    clipboard,
    activeBucket,
    getCategoryNodes,
    getFolderPathId,
    getFoldersForBucket,
    getNodeById,
    getNodesInFolder,
    createFolder,
    createSampleFile,
    renameNode,
    moveNodes,
    deleteNodes,
    shareNodes,
    copyNodes,
    cutNodes,
    pasteNodes,
    formatBytes,
  } = useAppState()
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid")
  const [sortValue, setSortValue] = React.useState<SortValue>("name-asc")
  const [renameTargetId, setRenameTargetId] = React.useState<string | null>(null)
  const [renameValue, setRenameValue] = React.useState("")
  const [moveIds, setMoveIds] = React.useState<string[]>([])
  const [moveTargetId, setMoveTargetId] = React.useState<string>("")
  const [propertyId, setPropertyId] = React.useState<string | null>(null)
  const [shareLinks, setShareLinks] = React.useState<string[]>([])
  const [deleteIds, setDeleteIds] = React.useState<string[]>([])
  const [createFolderOpen, setCreateFolderOpen] = React.useState(false)
  const [createFolderName, setCreateFolderName] = React.useState("新建文件夹")
  const [createFolderParentId, setCreateFolderParentId] = React.useState<string | null>(null)
  const [fileAreaLoading, setFileAreaLoading] = React.useState(false)
  const [fileAreaLoadingLabel, setFileAreaLoadingLabel] = React.useState("正在载入内容")
  const loadingTimerRef = React.useRef<number | null>(null)
  const routeKeyRef = React.useRef<string | null>(null)

  const basePath = "/app"
  const category = new URLSearchParams(location.search).get(
    "type"
  ) as keyof typeof categoryMap | null
  const currentPath =
    location.pathname.startsWith(basePath) && location.pathname !== basePath
      ? decodeURIComponent(location.pathname.substring(basePath.length))
      : ""

  const currentFolderId = getFolderPathId(currentPath)

  const pageTitle = getPageTitle(category, currentPath)
  usePageTitle(pageTitle)

  const items = React.useMemo(() => {
    const source =
      category && category in categoryMap
        ? getCategoryNodes(category)
        : getNodesInFolder(currentPath)

    return [...source].sort((left, right) =>
      compareNodes(left, right, sortValue)
    )
  }, [category, currentPath, getCategoryNodes, getNodesInFolder, sortValue])

  const pathParts = currentPath.split("/").filter(Boolean)
  const propertyNode = propertyId ? getNodeById(propertyId) : undefined
  const folderOptions = React.useMemo(() => {
    const root = { id: activeBucket.rootNodeId, name: `${activeBucket.name} /` }

    return [
      root,
      ...getFoldersForBucket(undefined, false).map((node) => ({
        id: node.id,
        name: node.name,
      })),
    ]
  }, [activeBucket.name, activeBucket.rootNodeId, getFoldersForBucket])

  // Reset selection on path or category change
  React.useEffect(() => {
    setSelectedIds([])
  }, [currentPath, category])

  const startFileAreaLoading = React.useCallback(
    (label = "正在载入内容", duration = 420) => {
      setFileAreaLoadingLabel(label)
      setFileAreaLoading(true)

      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current)
      }

      loadingTimerRef.current = window.setTimeout(() => {
        setFileAreaLoading(false)
        loadingTimerRef.current = null
      }, duration)
    },
    []
  )

  React.useEffect(() => {
    const routeKey = `${location.pathname}${location.search}`

    if (routeKeyRef.current && routeKeyRef.current !== routeKey) {
      startFileAreaLoading("正在进入文件夹", 220)
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

  const flash = React.useCallback((message: string) => {
    const toastMap: Record<string, string> = {
      "create-folder": "文件夹已创建",
      "upload-mock": "文件已上传",
      "refresh": "内容已刷新",
      "copy": "已复制到剪贴板",
      "cut": "已剪切",
      "paste": "已粘贴",
    }
    const text = toastMap[message] || (message.startsWith("download-") ? "开始下载" : null)
    if (text) toast.success(text)
  }, [])

  const handleSelectNode = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  const handlePrepareContext = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current : [id]))
  }

  const handleCreateFolder = (parentId = currentFolderId) => {
    setCreateFolderParentId(parentId)
    setCreateFolderName("新建文件夹")
    setCreateFolderOpen(true)
  }

  const submitCreateFolder = () => {
    const name = createFolderName.trim()
    if (!name) return
    createFolder(createFolderParentId, name)
    setCreateFolderOpen(false)
    flash("create-folder")
  }

  const handleUploadMock = () => {
    createSampleFile(currentFolderId)
    flash("upload-mock")
  }

  const handleRefresh = () => {
    startFileAreaLoading("正在同步目录", 560)
    flash("refresh")
  }

  const handleRenameRequest = (ids: string[]) => {
    const node = getNodeById(ids[0])
    if (!node || ids.length !== 1) {
      return
    }

    setRenameTargetId(node.id)
    setRenameValue(node.name)
  }

  const handleMoveRequest = (ids: string[]) => {
    setMoveIds(ids)
    setMoveTargetId(currentFolderId || activeBucket.rootNodeId)
  }

  const handleShareRequest = (ids: string[]) => {
    const records = shareNodes(ids)
    setShareLinks(
      records.map((record) => `https://share.cloudrave.app/${record.id}`)
    )
  }

  const handleDownloadRequest = (ids: string[]) => {
    flash(`download-${ids.join(",")}`)
  }

  const handleDeleteRequest = (ids: string[]) => {
    setDeleteIds(ids)
  }

  const handleCopy = () => {
    copyNodes(selectedIds)
    flash("copy")
  }

  const handleCut = () => {
    cutNodes(selectedIds)
    flash("cut")
  }

  const handleCopyIds = (ids: string[]) => {
    copyNodes(ids)
    flash("copy-ids")
  }

  const handleCutIds = (ids: string[]) => {
    cutNodes(ids)
    flash("cut-ids")
  }

  const handlePaste = () => {
    pasteNodes(currentFolderId)
    flash("paste")
  }

  const submitRename = (name: string) => {
    if (!renameTargetId) return
    renameNode(renameTargetId, name)
    setRenameTargetId(null)
    setRenameValue("")
  }

  const submitMove = (targetId: string) => {
    if (!moveIds.length) return
    moveNodes(moveIds, targetId)
    setMoveIds([])
  }

  const submitDelete = () => {
    deleteNodes(deleteIds)
    setSelectedIds([])
    setDeleteIds([])
  }

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
        onRefresh={handleRefresh}
        onCreateFolder={() => handleCreateFolder()}
        onPaste={handlePaste}
        canPaste={Boolean(clipboard)}
        onCopy={handleCopy}
        onCut={handleCut}
        onDelete={() => handleDeleteRequest(selectedIds)}
        onRename={() => handleRenameRequest(selectedIds)}
        onShare={() => handleShareRequest(selectedIds)}
        onDownload={() => handleDownloadRequest(selectedIds)}
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
            isLoading={fileAreaLoading}
            loadingLabel={fileAreaLoadingLabel}
            canPaste={Boolean(clipboard)}
            onSelectNode={handleSelectNode}
            onPrepareContext={handlePrepareContext}
            onClearSelection={() => setSelectedIds([])}
            onRenameRequest={handleRenameRequest}
            onMoveRequest={handleMoveRequest}
            onShareRequest={handleShareRequest}
            onDownloadRequest={handleDownloadRequest}
            onDeleteRequest={handleDeleteRequest}
            onCopyRequest={handleCopyIds}
            onCutRequest={handleCutIds}
            onPropertiesRequest={setPropertyId}
            onCreateFolder={() => handleCreateFolder()}
            onCreateChildFolder={handleCreateFolder}
            onUploadMock={handleUploadMock}
            onRefresh={handleRefresh}
            onPaste={handlePaste}
            onViewModeChange={setViewMode}
            onSortChange={setSortValue}
          />
        </motion.div>
      </AnimatePresence>

      <RenameDialog
        open={Boolean(renameTargetId)}
        defaultValue={renameValue}
        onClose={() => setRenameTargetId(null)}
        onSubmit={submitRename}
      />

      <MoveDialog
        open={moveIds.length > 0}
        folderOptions={folderOptions}
        defaultTargetId={moveTargetId}
        onClose={() => setMoveIds([])}
        onSubmit={submitMove}
      />

      <PropertiesDialog
        node={propertyNode}
        bucketName={activeBucket.name}
        formatBytes={formatBytes}
        onClose={() => setPropertyId(null)}
      />

      <ShareDialog
        links={shareLinks}
        onClose={() => setShareLinks([])}
      />

      <DeleteConfirmDialog
        open={deleteIds.length > 0}
        count={deleteIds.length}
        onClose={() => setDeleteIds([])}
        onConfirm={submitDelete}
      />

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>新建文件夹</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitCreateFolder()
            }}
          >
            <Input
              autoFocus
              value={createFolderName}
              onChange={(e) => setCreateFolderName(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="文件夹名称"
              className="mt-2"
            />
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setCreateFolderOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={!createFolderName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </form>
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
    case "updated-asc":
      return left.updatedAt.localeCompare(right.updatedAt)
    case "name-asc":
      return left.name.localeCompare(right.name, "zh-CN")
    case "name-desc":
      return right.name.localeCompare(left.name, "zh-CN")
    case "size-desc":
      return (right.size || 0) - (left.size || 0)
    case "updated-desc":
    default:
      return right.updatedAt.localeCompare(left.updatedAt)
  }
}
