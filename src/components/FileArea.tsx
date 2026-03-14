import type { MouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import {
  IconChevronRight,
  IconCode,
  IconFileText,
  IconFolderFilled,
  IconMusic,
  IconPhoto,
  IconPlayerPlay,
  IconTrash,
  IconVideo,
} from "@tabler/icons-react"

import { type FileNode, type SortValue, type ViewMode } from "@/lib/mock-data"
import { cn, truncateFilename } from "@/lib/utils"
import { EmptyState } from "./ui/empty-state"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./ui/context-menu"

interface FileAreaProps {
  items: FileNode[]
  currentPath: string
  selectedIds: string[]
  viewMode: ViewMode
  sortValue: SortValue
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
    if (event.target === event.currentTarget && onClearSelection) {
      onClearSelection()
    }
  }

  const openNode = (node: FileNode) => {
    if (node.kind === "folder") {
      const parentPath = currentPath === "/" ? "" : currentPath
      navigate(`/app${parentPath}/${encodeURIComponent(node.name)}`)
      return
    }

    onPropertiesRequest(node.id)
  }

  const getContextIds = (nodeId: string) => {
    return selectedIds.includes(nodeId) && selectedIds.length > 1
      ? selectedIds
      : [nodeId]
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">
        <div
          className="app-panel custom-scrollbar flex flex-1 flex-col overflow-y-auto rounded-2xl border border-border/60 p-4 shadow-sm"
          onClick={handleBackgroundClick}
        >
          {items.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState title="没有任何内容" description="在此处上传文件或创建文件夹" />
            </div>
          ) : viewMode === "grid" ? (
            <div className="flex flex-1 flex-col gap-8">
              {folders.length > 0 && files.length > 0 ? (
                <>
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
                  <FileSection
                    title="文件"
                    items={files}
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
                </>
              ) : folders.length > 0 ? (
                <FileSection
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
              ) : (
                <FileSection
                  items={files}
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
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuLabel>空白区域</ContextMenuLabel>
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

function FileSection({
  title,
  emptyText,
  items,
  selectedIds,
  onSelectNode,
  onPrepareContext,
  onOpenNode,
  onRenameRequest,
  onMoveRequest,
  onShareRequest,
  onDownloadRequest,
  onDeleteRequest,
  onCopyRequest,
  onCutRequest,
  onPropertiesRequest,
  onCreateChildFolder,
  getContextIds,
}: {
  title?: string
  emptyText?: string
  items: FileNode[]
  selectedIds: string[]
  onSelectNode: (id: string, event: MouseEvent) => void
  onPrepareContext: (id: string) => void
  onOpenNode: (node: FileNode) => void
  onRenameRequest: (ids: string[]) => void
  onMoveRequest: (ids: string[]) => void
  onShareRequest: (ids: string[]) => void
  onDownloadRequest: (ids: string[]) => void
  onDeleteRequest: (ids: string[]) => void
  onCopyRequest: (ids: string[]) => void
  onCutRequest: (ids: string[]) => void
  onPropertiesRequest: (id: string) => void
  onCreateChildFolder: (parentId: string) => void
  getContextIds: (nodeId: string) => string[]
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          {title}
        </h2>
      )}
      {items.length === 0 ? (
        emptyText && <div className="text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {items.map((item) => (
            <div key={item.id}>
              <FileCard
                item={item}
                selected={selectedIds.includes(item.id)}
                onSelectNode={onSelectNode}
                onPrepareContext={onPrepareContext}
                onOpenNode={onOpenNode}
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
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function FileCard({
  item,
  selected,
  onSelectNode,
  onPrepareContext,
  onOpenNode,
  onRenameRequest,
  onMoveRequest,
  onShareRequest,
  onDownloadRequest,
  onDeleteRequest,
  onCopyRequest,
  onCutRequest,
  onPropertiesRequest,
  onCreateChildFolder,
  getContextIds,
}: {
  item: FileNode
  selected: boolean
  onSelectNode: (id: string, event: MouseEvent) => void
  onPrepareContext: (id: string) => void
  onOpenNode: (node: FileNode) => void
  onRenameRequest: (ids: string[]) => void
  onMoveRequest: (ids: string[]) => void
  onShareRequest: (ids: string[]) => void
  onDownloadRequest: (ids: string[]) => void
  onDeleteRequest: (ids: string[]) => void
  onCopyRequest: (ids: string[]) => void
  onCutRequest: (ids: string[]) => void
  onPropertiesRequest: (id: string) => void
  onCreateChildFolder: (parentId: string) => void
  getContextIds: (nodeId: string) => string[]
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelectNode(item.id, event)
          }}
          onDoubleClick={(event) => {
            event.stopPropagation()
            onOpenNode(item)
          }}
          className={cn(
            "group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 transition-colors text-left",
            selected
              ? "border-transparent bg-primary/10"
              : "border-border/60 bg-background hover:bg-muted/40"
          )}
        >
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
              selected
                ? "bg-primary/20 text-primary"
                : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
            )}
            aria-label={`选择 ${item.name}`}
          >
            {getItemIcon(item)}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="min-w-0">
              <div
                className="truncate text-sm font-medium text-foreground"
                title={item.name}
              >
                {truncateFilename(item.name, 20)}
              </div>
            </div>
            <IconChevronRight
              size={16}
              className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </div>
        </button>
      </ContextMenuTrigger>
      <ItemContextMenu
        item={item}
        ids={getContextIds(item.id)}
        onOpenNode={onOpenNode}
        onRenameRequest={onRenameRequest}
        onMoveRequest={onMoveRequest}
        onShareRequest={onShareRequest}
        onDownloadRequest={onDownloadRequest}
        onDeleteRequest={onDeleteRequest}
        onCopyRequest={onCopyRequest}
        onCutRequest={onCutRequest}
        onPropertiesRequest={onPropertiesRequest}
        onCreateChildFolder={onCreateChildFolder}
      />
    </ContextMenu>
  )
}

function FileList({
  items,
  selectedIds,
  onSelectNode,
  onPrepareContext,
  onOpenNode,
  onRenameRequest,
  onMoveRequest,
  onShareRequest,
  onDownloadRequest,
  onDeleteRequest,
  onCopyRequest,
  onCutRequest,
  onPropertiesRequest,
  onCreateChildFolder,
  getContextIds,
}: {
  items: FileNode[]
  selectedIds: string[]
  onSelectNode: (id: string, event: MouseEvent) => void
  onPrepareContext: (id: string) => void
  onOpenNode: (node: FileNode) => void
  onRenameRequest: (ids: string[]) => void
  onMoveRequest: (ids: string[]) => void
  onShareRequest: (ids: string[]) => void
  onDownloadRequest: (ids: string[]) => void
  onDeleteRequest: (ids: string[]) => void
  onCopyRequest: (ids: string[]) => void
  onCutRequest: (ids: string[]) => void
  onPropertiesRequest: (id: string) => void
  onCreateChildFolder: (parentId: string) => void
  getContextIds: (nodeId: string) => string[]
}) {
  if (items.length === 0) {
    return <EmptyState title="没有任何内容" description="在此处上传文件或创建文件夹" />
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
      <div className="grid grid-cols-[56px_minmax(0,1.8fr)_140px] gap-3 border-b border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground">
        <div className="text-center">选择</div>
        <div>名称</div>
        <div>类型</div>
      </div>
      <div className="divide-y divide-border/60">
        {items.map((item) => {
          const selected = selectedIds.includes(item.id)

          return (
            <div key={item.id}>
              <ContextMenu>
                <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
                  <div
                    className={cn(
                      "grid grid-cols-[56px_minmax(0,1.8fr)_140px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/40",
                      selected ? "bg-primary/8" : ""
                    )}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSelectNode(item.id, event)
                        }}
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                          selected
                            ? "bg-primary/12 text-primary"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted"
                        )}
                        aria-label={`选择 ${item.name}`}
                      >
                        {getItemIcon(item)}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenNode(item)}
                      className="flex min-w-0 items-center justify-between gap-3 text-left"
                    >
                      <div className="truncate text-sm font-medium text-foreground">
                        {item.name}
                      </div>
                      <IconChevronRight
                        size={16}
                        className="shrink-0 text-muted-foreground"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenNode(item)}
                      className="truncate text-left text-sm text-muted-foreground"
                    >
                      {getItemMeta(item)}
                    </button>
                  </div>
                </ContextMenuTrigger>
                <ItemContextMenu
                  item={item}
                  ids={getContextIds(item.id)}
                  onOpenNode={onOpenNode}
                  onRenameRequest={onRenameRequest}
                  onMoveRequest={onMoveRequest}
                  onShareRequest={onShareRequest}
                  onDownloadRequest={onDownloadRequest}
                  onDeleteRequest={onDeleteRequest}
                  onCopyRequest={onCopyRequest}
                  onCutRequest={onCutRequest}
                  onPropertiesRequest={onPropertiesRequest}
                  onCreateChildFolder={onCreateChildFolder}
                />
              </ContextMenu>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ItemContextMenu({
  item,
  ids,
  onOpenNode,
  onRenameRequest,
  onMoveRequest,
  onShareRequest,
  onDownloadRequest,
  onDeleteRequest,
  onCopyRequest,
  onCutRequest,
  onPropertiesRequest,
  onCreateChildFolder,
}: {
  item: FileNode
  ids: string[]
  onOpenNode: (node: FileNode) => void
  onRenameRequest: (ids: string[]) => void
  onMoveRequest: (ids: string[]) => void
  onShareRequest: (ids: string[]) => void
  onDownloadRequest: (ids: string[]) => void
  onDeleteRequest: (ids: string[]) => void
  onCopyRequest: (ids: string[]) => void
  onCutRequest: (ids: string[]) => void
  onPropertiesRequest: (id: string) => void
  onCreateChildFolder: (parentId: string) => void
}) {
  const multiple = ids.length > 1
  const isFolder = item.kind === "folder"

  return (
    <ContextMenuContent>
      <ContextMenuLabel>
        {multiple ? `已选 ${ids.length} 项` : isFolder ? "文件夹" : "文件"}
      </ContextMenuLabel>
      <ContextMenuItem onClick={() => onOpenNode(item)}>
        {isFolder ? "打开" : "预览"}
        <ContextMenuShortcut>{isFolder ? "Enter" : "Space"}</ContextMenuShortcut>
      </ContextMenuItem>
      {isFolder && !multiple ? (
        <ContextMenuItem onClick={() => onCreateChildFolder(item.id)}>
          新建子文件夹
        </ContextMenuItem>
      ) : null}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onDownloadRequest(ids)}>
        下载
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onShareRequest(ids)}>
        分享
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCopyRequest(ids)}>
        复制
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onCutRequest(ids)}>剪切</ContextMenuItem>
      <ContextMenuItem onClick={() => onRenameRequest(ids)}>
        重命名
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onMoveRequest(ids)}>
        移动到…
      </ContextMenuItem>
      <ContextMenuItem
        variant="destructive"
        onClick={() => onDeleteRequest(ids)}
      >
        删除
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onPropertiesRequest(item.id)}>
        属性
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

function getItemMeta(item: FileNode) {
  if (item.kind === "folder") {
    return "文件夹"
  }

  if (item.ext) {
    return item.ext.toUpperCase()
  }

  return "文件"
}

function getItemIcon(item: FileNode) {
  if (item.kind === "folder") {
    return <IconFolderFilled size={20} className="text-primary" />
  }

  switch (item.mediaType) {
    case "image":
      return <IconPhoto size={20} className="text-sky-500" />
    case "video":
      return <IconVideo size={20} className="text-violet-500" />
    case "audio":
      return <IconMusic size={20} className="text-pink-500" />
    case "code":
      return <IconCode size={20} className="text-emerald-500" />
    case "document":
      return <IconFileText size={20} className="text-amber-500" />
    case "archive":
      return <IconTrash size={20} className="text-orange-500" />
    default:
      return <IconPlayerPlay size={20} className="text-slate-500" />
  }
}
