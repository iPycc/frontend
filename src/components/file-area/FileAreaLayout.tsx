import type { MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { IconFolder, IconLoader2 } from "@tabler/icons-react"

import { type FileNode, type SortValue, type ViewMode } from "@/lib/mock-data"
import { EmptyState } from "@/components/ui/empty-state"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { FileSection } from "./FileSection"
import { FileList } from "./FileList"

interface FileAreaProps {
  items: FileNode[]
  currentPath: string
  selectedIds: string[]
  viewMode: ViewMode
  sortValue: SortValue
  showThumbnail?: boolean
  isLoading?: boolean
  loadingLabel?: string
  canPaste: boolean
  onSelectNode: (id: string, event: MouseEvent) => void
  onPrepareContext: (id: string) => void
  onClearSelection?: () => void
  onRenameRequest: (ids: string[]) => void
  onMoveRequest: (ids: string[]) => void
  onShareRequest: (ids: string[]) => void
  onDownloadRequest: (ids: string[]) => void
  onDeleteRequest: (ids: string[]) => void
  onCopyRequest: (ids: string[]) => void
  onCutRequest: (ids: string[]) => void
  onPropertiesRequest: (id: string) => void
  onOpenFile: (node: FileNode) => void
  onCreateFolder: () => void
  onCreateChildFolder: (parentId: string) => void
  onUploadMock: () => void
  onRefresh: () => void
  onPaste: () => void
  onViewModeChange: (value: ViewMode) => void
  onSortChange: (value: SortValue) => void
}

const sortLabels: Array<{ value: SortValue; label: string }> = [
  { value: "updated-desc", label: "最近更新" },
  { value: "updated-asc", label: "最早更新" },
  { value: "name-asc", label: "名称 A-Z" },
  { value: "name-desc", label: "名称 Z-A" },
  { value: "size-desc", label: "大小优先" },
]

export function FileArea({
  items,
  currentPath,
  selectedIds,
  viewMode,
  sortValue,
  showThumbnail = false,
  isLoading = false,
  loadingLabel = "正在载入内容",
  canPaste,
  onSelectNode,
  onPrepareContext,
  onClearSelection,
  onRenameRequest,
  onMoveRequest,
  onShareRequest,
  onDownloadRequest,
  onDeleteRequest,
  onCopyRequest,
  onCutRequest,
  onPropertiesRequest,
  onOpenFile,
  onCreateFolder,
  onCreateChildFolder,
  onUploadMock,
  onRefresh,
  onPaste,
  onViewModeChange,
  onSortChange,
}: FileAreaProps) {
  const navigate = useNavigate()
  const folders = items.filter((item) => item.kind === "folder")
  const files = items.filter((item) => item.kind === "file")

  const handleBackgroundClick = (event: MouseEvent) => {
    // Deselect when clicking any empty area (not on a file card)
    const target = event.target as HTMLElement
    if (target.closest("[data-file-card]")) return
    if (onClearSelection) onClearSelection()
  }

  const openNode = (node: FileNode) => {
    if (node.kind === "folder") {
      const parentPath = currentPath === "/" ? "" : currentPath
      const folderPath = `${parentPath}/${node.name}`
      navigate(`/app?folder=${encodeURIComponent(folderPath)}`)
      return
    }
    onOpenFile(node)
  }

  const getContextIds = (nodeId: string) =>
    selectedIds.includes(nodeId) && selectedIds.length > 1
      ? selectedIds
      : [nodeId]

  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">
        <div
          className="app-panel relative flex flex-1 flex-col overflow-hidden rounded-xl border border-border p-5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:shadow-none"
          onClick={handleBackgroundClick}
        >
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-2 md:pr-1" onClick={handleBackgroundClick}>
            {items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState title="没有任何内容" description="在此处上传文件或创建文件夹" />
              </div>
            ) : viewMode === "grid" ? (
              <div className="flex flex-1 flex-col gap-8">
                {folders.length > 0 ? (
                  <FileSection
                    title="文件夹"
                    items={folders}
                    selectedIds={selectedIds}
                    onSelectNode={onSelectNode}
                    onPrepareContext={onPrepareContext}
                    onOpenNode={openNode}
                    onRenameRequest={onRenameRequest}
                    onMoveRequest={onMoveRequest}
                    onShareRequest={onShareRequest}
                    onDownloadRequest={onDownloadRequest}
                    onDeleteRequest={onDeleteRequest}
                    onCopyRequest={onCopyRequest}
                    onCutRequest={onCutRequest}
                    onPropertiesRequest={onPropertiesRequest}
                    onCreateChildFolder={onCreateChildFolder}
                    getContextIds={getContextIds}
                  />
                ) : null}
                {files.length > 0 ? (
                  <FileSection
                    title="文件"
                    items={files}
                    selectedIds={selectedIds}
                    showThumbnail={showThumbnail}
                    onSelectNode={onSelectNode}
                    onPrepareContext={onPrepareContext}
                    onOpenNode={openNode}
                    onRenameRequest={onRenameRequest}
                    onMoveRequest={onMoveRequest}
                    onShareRequest={onShareRequest}
                    onDownloadRequest={onDownloadRequest}
                    onDeleteRequest={onDeleteRequest}
                    onCopyRequest={onCopyRequest}
                    onCutRequest={onCutRequest}
                    onPropertiesRequest={onPropertiesRequest}
                    onCreateChildFolder={onCreateChildFolder}
                    getContextIds={getContextIds}
                  />
                ) : null}
              </div>
            ) : (
              <FileList
                items={items}
                selectedIds={selectedIds}
                onSelectNode={onSelectNode}
                onPrepareContext={onPrepareContext}
                onOpenNode={openNode}
                onRenameRequest={onRenameRequest}
                onMoveRequest={onMoveRequest}
                onShareRequest={onShareRequest}
                onDownloadRequest={onDownloadRequest}
                onDeleteRequest={onDeleteRequest}
                onCopyRequest={onCopyRequest}
                onCutRequest={onCutRequest}
                onPropertiesRequest={onPropertiesRequest}
                onCreateChildFolder={onCreateChildFolder}
                getContextIds={getContextIds}
              />
            )}
          </div>
          {isLoading ? <FileAreaLoading label={loadingLabel} /> : null}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={onCreateFolder}>新建文件夹</ContextMenuItem>
        <ContextMenuItem onClick={onUploadMock}>上传模拟文件</ContextMenuItem>
        <ContextMenuItem onClick={onRefresh}>刷新</ContextMenuItem>
        <ContextMenuItem disabled={!canPaste} onClick={onPaste}>
          粘贴
          <ContextMenuShortcut>{canPaste ? "Ctrl+V" : ""}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>视图</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => onViewModeChange("grid")}>
              网格视图
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onViewModeChange("list")}>
              列表视图
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>排序</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {sortLabels.map((item) => (
              <ContextMenuItem
                key={item.value}
                onClick={() => onSortChange(item.value)}
              >
                {item.label}
                <ContextMenuShortcut>
                  {sortValue === item.value ? "当前" : ""}
                </ContextMenuShortcut>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function FileAreaLoading({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
      <IconLoader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  )
}
