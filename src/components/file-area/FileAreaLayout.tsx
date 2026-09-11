import * as React from "react"
import type { MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  IconClipboard,
  IconFolderPlus,
  IconLayoutGrid,
  IconList,
  IconLoader2,
  IconRefresh,
  IconSortAscending,
  IconUpload,
} from "@tabler/icons-react"

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
import { FileAreaPendingContent } from "./FileAreaPending"
import type { InlineNameEdit } from "./types"

interface FileAreaProps {
  items: FileNode[]
  loading: boolean
  loaded: boolean
  metadataLoaded: boolean
  folderCount: number
  fileCount: number
  hasMore: boolean
  currentPath: string
  selectedIds: string[]
  inlineEdit?: InlineNameEdit
  viewMode: ViewMode
  sortValue: SortValue
  pageSize: number
  showThumbnail?: boolean
  canPaste: boolean
  onSelectNode: (id: string, event: MouseEvent) => void
  onSelectIds: (ids: string[]) => void
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
  loaded,
  metadataLoaded,
  folderCount,
  fileCount,
  hasMore,
  currentPath,
  selectedIds,
  inlineEdit,
  viewMode,
  sortValue,
  pageSize,
  showThumbnail = false,
  canPaste,
  onSelectNode,
  onSelectIds,
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
  const [selectionBox, setSelectionBox] = React.useState<SelectionBox | null>(null)
  const dragDepthRef = React.useRef(0)
  const selectionRef = React.useRef<SelectionState | null>(null)
  const selectedIdsRef = React.useRef(selectedIds)
  const ignoreNextBackgroundClickRef = React.useRef(false)
  const contentRef = React.useRef<HTMLDivElement>(null)
  selectedIdsRef.current = selectedIds
  const folders = items.filter((item) => item.kind === "folder")
  const files = items.filter((item) => item.kind === "file")

  const handleBackgroundClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement
    // React events from portalled overlays still bubble through the component
    // tree. Only treat clicks whose DOM target is actually inside the file area
    // as background clicks.
    if (!event.currentTarget.contains(target)) return
    if (target.closest("[data-file-card]")) return
    if (ignoreNextBackgroundClickRef.current) {
      ignoreNextBackgroundClickRef.current = false
      event.stopPropagation()
      return
    }
    onClearSelection?.()
  }

  const handleSelectionStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    // Context menus and dialogs are portalled outside this element, even though
    // their React events bubble through it. Do not let those presses start a
    // marquee selection or capture the pointer away from the overlay.
    if (!event.currentTarget.contains(target)) return
    if (event.button !== 0 || target.closest("[data-file-card]")) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    window.getSelection()?.removeAllRanges()
    const initialIds = event.ctrlKey || event.metaKey ? selectedIds : []
    selectionRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      initialIds,
      moved: false,
    }
    onSelectIds(initialIds)
  }

  React.useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const selection = selectionRef.current
      const container = contentRef.current
      if (!selection || !container) return
      event.preventDefault()

      const left = Math.min(selection.startX, event.clientX)
      const top = Math.min(selection.startY, event.clientY)
      const width = Math.abs(event.clientX - selection.startX)
      const height = Math.abs(event.clientY - selection.startY)
      if (!selection.moved && width < 4 && height < 4) return
      selection.moved = true

      const bounds = { left, top, right: left + width, bottom: top + height }
      const ids = Array.from(container.querySelectorAll<HTMLElement>("[data-file-card]"))
        .filter((element) => rectanglesIntersect(bounds, element.getBoundingClientRect()))
        .map((element) => element.dataset.fileCardId)
        .filter((id): id is string => Boolean(id))

      onSelectIds(Array.from(new Set([...selection.initialIds, ...ids])))
      setSelectionBox({ left, top, width, height })
    }

    const handlePointerUp = () => {
      const selection = selectionRef.current
      if (!selection) return
      if (selection.moved) ignoreNextBackgroundClickRef.current = true
      selectionRef.current = null
      setSelectionBox(null)
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [onSelectIds])

  const openNode = (node: FileNode) => {
    if (node.kind === "folder") {
      const parentPath = currentPath === "/" ? "" : currentPath
      const folderPath = `${parentPath}/${node.name}`
      navigate(`/app?folder=${encodeURIComponent(folderPath)}`)
      return
    }
    onOpenFile(node)
  }

  const prepareItemContext = (nodeId: string) => {
    const currentIds = selectedIdsRef.current
    const contextIds = currentIds.includes(nodeId) && currentIds.length > 1 ? currentIds : [nodeId]
    selectedIdsRef.current = contextIds
    onPrepareContext(nodeId)
  }

  const getContextIds = (nodeId: string) => {
    const currentIds = selectedIdsRef.current
    return currentIds.includes(nodeId) && currentIds.length > 1 ? currentIds : [nodeId]
  }

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
          <div
            ref={contentRef}
            className="custom-scrollbar flex-1 select-none overflow-y-auto pr-0.5 md:pr-2"
            onClick={handleBackgroundClick}
            onPointerDown={handleSelectionStart}
          >
            {items.length === 0 && !metadataLoaded ? null : loading && items.length === 0 ? (
              <FileAreaPendingContent
                metadataLoaded
                folderCount={folderCount}
                fileCount={fileCount}
                pageSize={pageSize}
                viewMode={viewMode}
                showThumbnail={showThumbnail}
              />
            ) : items.length === 0 && !loaded ? null : items.length === 0 ? (
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
                        inlineEdit={inlineEdit}
                        onSelectNode={onSelectNode}
                        onPrepareContext={prepareItemContext}
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
                        inlineEdit={inlineEdit}
                        showThumbnail={showThumbnail}
                        onSelectNode={onSelectNode}
                        onPrepareContext={prepareItemContext}
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
                    inlineEdit={inlineEdit}
                    onSelectNode={onSelectNode}
                    onPrepareContext={prepareItemContext}
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
            {selectionBox ? (
              <div
                aria-hidden="true"
                className="pointer-events-none fixed z-30 border border-white bg-white/[0.14]"
                style={selectionBox}
              />
            ) : null}
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={onCreateFolder}><IconFolderPlus />新建文件夹</ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger><IconUpload />上传</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={onUploadRequest}><IconUpload />上传文件</ContextMenuItem>
            <ContextMenuItem onClick={onUploadFolderRequest}><IconFolderPlus />上传文件夹</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onClick={onRefresh}><IconRefresh />刷新</ContextMenuItem>
        <ContextMenuItem disabled={!canPaste} onClick={onPaste}>
          <IconClipboard />
          粘贴
          <ContextMenuShortcut>{canPaste ? "Ctrl+V" : ""}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger><IconLayoutGrid />视图</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => onViewModeChange("grid")}><IconLayoutGrid />网格视图</ContextMenuItem>
            <ContextMenuItem onClick={() => onViewModeChange("list")}><IconList />列表视图</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger><IconSortAscending />排序</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {sortLabels.map((item) => (
              <ContextMenuItem key={item.value} onClick={() => onSortChange(item.value)}>
                <IconSortAscending />
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

type SelectionBox = {
  left: number
  top: number
  width: number
  height: number
}

type SelectionState = {
  startX: number
  startY: number
  initialIds: string[]
  moved: boolean
}

function rectanglesIntersect(
  first: { left: number; top: number; right: number; bottom: number },
  second: DOMRect
) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
}
