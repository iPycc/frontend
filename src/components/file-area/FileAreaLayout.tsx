import * as React from "react"
import type { MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { IconChevronRight, IconFolder, IconLoader2 } from "@tabler/icons-react"

import { type FileNode, type SortValue, type ViewMode } from "@/lib/models"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
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
import { FileAreaLoading, FileAreaPendingContent } from "./FileAreaPending"

interface FileAreaProps {
  items: FileNode[]
  loading: boolean
  metadataLoaded: boolean
  folderCount: number
  fileCount: number
  hasMore: boolean
  currentPath: string
  selectedIds: string[]
  viewMode: ViewMode
  sortValue: SortValue
  pageSize: number
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
  onUploadFolderRequest: () => void
  onDropUpload: (files: Array<{ file: File; relativePath?: string }>) => void
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
  metadataLoaded,
  folderCount,
  fileCount,
  hasMore,
  currentPath,
  selectedIds,
  viewMode,
  sortValue,
  pageSize,
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
  onUploadFolderRequest,
  onDropUpload,
  onRefresh,
  onLoadMore,
  onPaste,
  onViewModeChange,
  onSortChange,
}: FileAreaProps) {
  const navigate = useNavigate()
  const [dragActive, setDragActive] = React.useState(false)
  const dragDepthRef = React.useRef(0)
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
          onDragEnter={(event) => {
            event.preventDefault()
            dragDepthRef.current += 1
            if (event.dataTransfer.types.includes("Files")) setDragActive(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = "copy"
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
            if (dragDepthRef.current === 0) setDragActive(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            dragDepthRef.current = 0
            setDragActive(false)
            void collectDroppedFiles(event.dataTransfer).then(onDropUpload)
          }}
        >
          {dragActive ? (
            <div className="pointer-events-none absolute inset-3 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-background/95 md:inset-5">
              <div className="text-center">
                <p className="text-base font-medium text-foreground">拖到这里上传</p>
                <p className="mt-1 text-sm text-muted-foreground">支持文件和完整文件夹层级</p>
              </div>
            </div>
          ) : null}
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-0.5 md:pr-2" onClick={handleBackgroundClick}>
            {items.length === 0 && !metadataLoaded ? (
              <FileAreaLoading />
            ) : loading && items.length === 0 ? (
              <FileAreaPendingContent
                metadataLoaded
                folderCount={folderCount}
                fileCount={fileCount}
                pageSize={pageSize}
                viewMode={viewMode}
                showThumbnail={showThumbnail}
              />
            ) : items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState title="没有任何内容" description="在此处上传文件或创建文件夹" />
              </div>
            ) : (
              <div className="flex min-h-full flex-col" aria-label={`目录内容，共 ${items.length} 项`}>
                {viewMode === "grid" ? (
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
              </div>
            )}
            {hasMore ? (
              <div className="flex flex-wrap items-center justify-center gap-3 py-6">
                <span className="text-xs text-muted-foreground">
                  已加载 {items.length} 项
                </span>
                <Button variant="outline" disabled={loading} onClick={onLoadMore}>
                  {loading ? <IconLoader2 data-icon="inline-start" className="animate-spin" /> : null}
                  {loading ? "正在加载" : `再加载 ${pageSize} 项`}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={onCreateFolder}>新建文件夹</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>上传</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={onUploadRequest}>上传文件</ContextMenuItem>
            <ContextMenuItem onClick={onUploadFolderRequest}>上传文件夹</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
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

type FileSystemEntryLike = {
  isFile: boolean
  isDirectory: boolean
  name: string
}

type FileSystemFileEntryLike = FileSystemEntryLike & {
  file: (success: (file: File) => void, error?: (reason: DOMException) => void) => void
}

type FileSystemDirectoryEntryLike = FileSystemEntryLike & {
  createReader: () => {
    readEntries: (success: (entries: FileSystemEntryLike[]) => void, error?: (reason: DOMException) => void) => void
  }
}

async function collectDroppedFiles(dataTransfer: DataTransfer) {
  const items = Array.from(dataTransfer.items)
  const entryItems = items
    .map((item) => {
      const withEntry = item as unknown as { webkitGetAsEntry?: () => FileSystemEntryLike | null }
      return withEntry.webkitGetAsEntry?.() ?? null
    })
    .filter((entry): entry is FileSystemEntryLike => Boolean(entry))

  if (!entryItems.length) {
    return Array.from(dataTransfer.files).map((file) => ({ file }))
  }

  const result: Array<{ file: File; relativePath?: string }> = []
  for (const entry of entryItems) {
    await walkDroppedEntry(entry, "", result)
  }
  return result
}

async function walkDroppedEntry(
  entry: FileSystemEntryLike,
  parentPath: string,
  result: Array<{ file: File; relativePath?: string }>
) {
  const path = parentPath ? `${parentPath}/${entry.name}` : entry.name
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      ;(entry as FileSystemFileEntryLike).file(resolve, reject)
    })
    result.push({ file, relativePath: parentPath ? path : undefined })
    return
  }
  if (!entry.isDirectory) return

  const reader = (entry as FileSystemDirectoryEntryLike).createReader()
  const children: FileSystemEntryLike[] = []
  while (true) {
    const batch = await new Promise<FileSystemEntryLike[]>((resolve, reject) => reader.readEntries(resolve, reject))
    if (!batch.length) break
    children.push(...batch)
  }
  for (const child of children) {
    await walkDroppedEntry(child, path, result)
  }
}
