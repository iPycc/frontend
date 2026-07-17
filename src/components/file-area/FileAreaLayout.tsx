import type { MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { IconChevronRight, IconFolder, IconLoader2 } from "@tabler/icons-react"

import { type FileNode, type SortValue, type ViewMode } from "@/lib/models"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { FileSection } from "./FileSection"
import { FileList } from "./FileList"

interface FileAreaProps {
  items: FileNode[]
  loading: boolean
  hasMore: boolean
  currentPath: string
  selectedIds: string[]
  viewMode: ViewMode
  sortValue: SortValue
  showThumbnail?: boolean
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
  onPropertiesRequest: (ids: string[]) => void
  onOpenFile: (node: FileNode) => void
  onCreateFolder: () => void
  onCreateChildFolder: (parentId: string) => void
  onUploadRequest: () => void
  onRefresh: () => void
  onLoadMore: () => void
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
  loading,
  hasMore,
  currentPath,
  selectedIds,
  viewMode,
  sortValue,
  showThumbnail = false,
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
  onUploadRequest,
  onRefresh,
  onLoadMore,
  onPaste,
  onViewModeChange,
  onSortChange,
}: FileAreaProps) {
  const navigate = useNavigate()
  const folders = items.filter((item) => item.kind === "folder")
  const files = items.filter((item) => item.kind === "file")

  const handleBackgroundClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    if (target.closest("[data-file-card]")) return
    onClearSelection?.()
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

  const getContextIds = (nodeId: string) => (selectedIds.includes(nodeId) && selectedIds.length > 1 ? selectedIds : [nodeId])

  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">
        <div
          className="app-panel relative flex flex-1 flex-col overflow-hidden rounded-xl border border-border p-3 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:shadow-none md:p-5"
          onClick={handleBackgroundClick}
        >
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-0.5 md:pr-2" onClick={handleBackgroundClick}>
            {loading && items.length === 0 ? (
              <DirectorySkeleton viewMode={viewMode} />
            ) : items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState title="没有任何内容" description="在此处上传文件或创建文件夹" />
              </div>
            ) : viewMode === "grid" ? (
              <div className="flex flex-1 flex-col gap-4 md:gap-8">
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
            {hasMore ? (
              <div className="flex justify-center py-6">
                <Button variant="outline" disabled={loading} onClick={onLoadMore}>
                  {loading ? <IconLoader2 data-icon="inline-start" className="animate-spin" /> : null}
                  {loading ? "正在加载" : "加载更多"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={onCreateFolder}>新建文件夹</ContextMenuItem>
        <ContextMenuItem onClick={onUploadRequest}>上传文件</ContextMenuItem>
        <ContextMenuItem onClick={onRefresh}>刷新</ContextMenuItem>
        <ContextMenuItem disabled={!canPaste} onClick={onPaste}>
          粘贴
          <ContextMenuShortcut>{canPaste ? "Ctrl+V" : ""}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>视图</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => onViewModeChange("grid")}>网格视图</ContextMenuItem>
            <ContextMenuItem onClick={() => onViewModeChange("list")}>列表视图</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>排序</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {sortLabels.map((item) => (
              <ContextMenuItem key={item.value} onClick={() => onSortChange(item.value)}>
                {item.label}
                <ContextMenuShortcut>{sortValue === item.value ? "当前" : ""}</ContextMenuShortcut>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function DirectorySkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-3" aria-label="正在加载目录">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="file-section-grid" aria-label="正在加载目录">
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  )
}
