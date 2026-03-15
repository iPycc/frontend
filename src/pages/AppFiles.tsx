import * as React from "react"
import { useLocation } from "react-router-dom"

import { FileArea } from "../components/FileArea"
import { Toolbar } from "../components/Toolbar"
import { useAppState } from "@/lib/app-state"
import { type FileNode, type SortValue, type ViewMode } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const categoryMap = {
  image: "图片",
  video: "视频",
  audio: "音乐",
  document: "文档",
} as const

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
  const [renameTargetId, setRenameTargetId] = React.useState<string | null>(
    null
  )
  const [renameValue, setRenameValue] = React.useState("")
  const [moveIds, setMoveIds] = React.useState<string[]>([])
  const [moveTargetId, setMoveTargetId] = React.useState<string>("")
  const [propertyId, setPropertyId] = React.useState<string | null>(null)
  const [shareLinks, setShareLinks] = React.useState<string[]>([])
  const [deleteIds, setDeleteIds] = React.useState<string[]>([])

  const basePath = "/app"
  const category = new URLSearchParams(location.search).get(
    "type"
  ) as keyof typeof categoryMap | null
  const currentPath =
    location.pathname.startsWith(basePath) && location.pathname !== basePath
      ? decodeURIComponent(location.pathname.substring(basePath.length))
      : ""

  const currentFolderId = getFolderPathId(currentPath)

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

  const flash = React.useCallback((_message: string) => {}, [])

  const handleSelectNode = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    // 左侧图标改为独立多选区，单击即可加入或取消当前选择集合。
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
    createFolder(parentId, "新建文件夹")
    flash("create-folder")
  }

  const handleUploadMock = () => {
    createSampleFile(currentFolderId)
    flash("upload-mock")
  }

  const handleRefresh = () => {
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

  const submitRename = () => {
    if (!renameTargetId || !renameValue.trim()) {
      return
    }

    renameNode(renameTargetId, renameValue.trim())
    setRenameTargetId(null)
    setRenameValue("")
  }

  const submitMove = () => {
    if (!moveIds.length) {
      return
    }

    moveNodes(moveIds, moveTargetId)
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
      <FileArea
        items={items}
        currentPath={currentPath}
        selectedIds={selectedIds}
        viewMode={viewMode}
        sortValue={sortValue}
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

      <Dialog
        open={Boolean(renameTargetId)}
        onOpenChange={(open) => !open && setRenameTargetId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名</DialogTitle>
            <DialogDescription>修改当前文件或文件夹名称。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>名称</Label>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTargetId(null)}>
              取消
            </Button>
            <Button onClick={submitRename}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={moveIds.length > 0} onOpenChange={(open) => !open && setMoveIds([])}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移动到</DialogTitle>
            <DialogDescription>
              从当前 bucket 中选择新的目标文件夹。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>目标目录</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={moveTargetId}
              onChange={(event) => setMoveTargetId(event.target.value)}
            >
              {folderOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveIds([])}>
              取消
            </Button>
            <Button onClick={submitMove}>移动</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(propertyNode)}
        onOpenChange={(open) => !open && setPropertyId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>属性</DialogTitle>
            <DialogDescription>查看当前对象的 mock 元信息。</DialogDescription>
          </DialogHeader>
          {propertyNode ? (
            <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              <div>名称：{propertyNode.name}</div>
              <div>
                类型：
                {propertyNode.kind === "folder"
                  ? "文件夹"
                  : propertyNode.ext?.toUpperCase() || "文件"}
              </div>
              <div>大小：{formatBytes(propertyNode.size)}</div>
              <div>更新时间：{propertyNode.updatedAt}</div>
              <div>Bucket：{activeBucket.name}</div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setPropertyId(null)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={shareLinks.length > 0}
        onOpenChange={(open) => !open && setShareLinks([])}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>分享链接</DialogTitle>
            <DialogDescription>
              当前为 mock 链接，可用于页面演示。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {shareLinks.map((link) => (
              <div
                key={link}
                className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm"
              >
                {link}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShareLinks([])}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteIds.length > 0}
        onOpenChange={(open) => !open && setDeleteIds([])}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移入回收站</DialogTitle>
            <DialogDescription>
              {deleteIds.length === 1
                ? "该对象会移动到回收站，可在回收站中恢复。"
                : `共 ${deleteIds.length} 个对象会移动到回收站。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteIds([])}>
              取消
            </Button>
            <Button onClick={submitDelete}>确认删除</Button>
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
