import type { MouseEvent } from "react"
import { IconFolderFilled } from "@tabler/icons-react"
import { useNavigate } from "react-router-dom"

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

  const getContextIds = (nodeId: string) =>
    selectedIds.includes(nodeId) && selectedIds.length > 1
      ? selectedIds
      : [nodeId]

  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">
        <div
          className="app-panel flex flex-1 flex-col overflow-hidden rounded-[15px] border border-[#dcdcdc] p-5 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:shadow-none"
          onClick={handleBackgroundClick}
        >
          <div className="custom-scrollbar flex-1 overflow-y-auto pr-1">
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
      {title ? (
        <h2 className="mb-4 text-[16px] text-[#2f2f2f] dark:text-[#f0f0f0]">{title}</h2>
      ) : null}
      {items.length === 0 ? (
        emptyText ? <div className="text-sm text-muted-foreground">{emptyText}</div> : null
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-3">
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
        <div
          className={cn(
            "group flex h-12 w-full items-center gap-3 rounded-[14px] border px-3.5 text-left transition-colors",
            selected
              ? "border-[#7fcbff] bg-[#ebf7ff] dark:border-[#265a87] dark:bg-[#112235]"
              : "border-transparent bg-[#f2f2f2] hover:bg-[#ececec] dark:bg-[#202020] dark:hover:bg-[#272727]"
          )}
        >
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onSelectNode(item.id, event)
            }}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors",
              selected
                ? "bg-[#dff2ff] text-primary dark:bg-[#16334f]"
                : "bg-[#ebebeb] text-[#777777] hover:bg-[#e2e2e2] dark:bg-[#272727] dark:text-[#9b9b9b] dark:hover:bg-[#2f2f2f]"
            )}
            aria-label={`选择 ${item.name}`}
          >
            <FileGlyph item={item} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpenNode(item)
            }}
            onDoubleClick={(event) => {
              event.stopPropagation()
              onOpenNode(item)
            }}
            className="min-w-0 flex-1 text-left"
          >
            <div className="truncate text-sm text-[#404040] dark:text-[#eaeaea]" title={item.name}>
              {truncateFilename(item.name, 22)}
            </div>
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
    <div className="overflow-hidden rounded-[20px] border border-[#dddddd] bg-white dark:border-white/10 dark:bg-[#171717]">
      <div className="grid grid-cols-[56px_minmax(0,1.8fr)_140px] gap-3 border-b border-[#e5e5e5] px-4 py-3 text-xs text-[#8a8a8a] dark:border-white/10 dark:text-[#8d8d8d]">
        <div className="text-center">选择</div>
        <div>名称</div>
        <div>类型</div>
      </div>
      <div className="divide-y divide-[#efefef] dark:divide-white/10">
        {items.map((item) => {
          const selected = selectedIds.includes(item.id)

          return (
            <div key={item.id}>
              <ContextMenu>
                <ContextMenuTrigger onContextMenu={() => onPrepareContext(item.id)}>
                  <div
                    className={cn(
                      "grid grid-cols-[56px_minmax(0,1.8fr)_140px] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#f7f7f7] dark:hover:bg-[#1d1d1d]",
                      selected ? "bg-[#eef8ff] dark:bg-[#112235]" : ""
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
                            ? "bg-[#dff2ff] text-primary dark:bg-[#16334f]"
                            : "bg-[#f3f3f3] text-[#777777] hover:bg-[#ebebeb] dark:bg-[#202020] dark:text-[#9b9b9b] dark:hover:bg-[#272727]"
                        )}
                        aria-label={`选择 ${item.name}`}
                      >
                        <FileGlyph item={item} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenNode(item)
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation()
                        onOpenNode(item)
                      }}
                      className="min-w-0 text-left"
                    >
                      <div className="truncate text-sm text-[#3f3f3f] dark:text-[#eaeaea]">
                        {item.name}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenNode(item)
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation()
                        onOpenNode(item)
                      }}
                      className="truncate text-left text-sm text-[#7e7e7e] dark:text-[#969696]"
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
    <ContextMenuContent >
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
      <ContextMenuItem onClick={() => onDownloadRequest(ids)}>下载</ContextMenuItem>
      <ContextMenuItem onClick={() => onShareRequest(ids)}>分享</ContextMenuItem>
      <ContextMenuItem onClick={() => onCopyRequest(ids)}>复制</ContextMenuItem>
      <ContextMenuItem onClick={() => onCutRequest(ids)}>剪切</ContextMenuItem>
      <ContextMenuItem onClick={() => onRenameRequest(ids)}>重命名</ContextMenuItem>
      <ContextMenuItem onClick={() => onMoveRequest(ids)}>移动到…</ContextMenuItem>
      <ContextMenuItem variant="destructive" onClick={() => onDeleteRequest(ids)}>
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

function FileGlyph({ item }: { item: FileNode }) {
  if (item.kind === "folder") {
    return <IconFolderFilled size={20} className="text-[#8d8d8d]" />
  }

  const ext = item.ext?.toLowerCase() ?? "file"
  const badge = ext.slice(0, 1).toUpperCase()
  const color = getFileBadgeColor(ext, item.mediaType)

  return (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-[5px] text-[10px] font-semibold text-white",
        color
      )}
    >
      {badge}
    </span>
  )
}

function getFileBadgeColor(ext: string, mediaType?: FileNode["mediaType"]) {
  if (["ppt", "pptx", "pdf"].includes(ext)) {
    return "bg-[#ff5b12]"
  }

  if (["doc", "docx"].includes(ext)) {
    return "bg-[#2563eb]"
  }

  if (["xls", "xlsx", "csv"].includes(ext)) {
    return "bg-[#16a34a]"
  }

  if (["zip", "rar", "7z"].includes(ext)) {
    return "bg-[#f59e0b]"
  }

  if (["ts", "tsx", "js", "jsx"].includes(ext) || mediaType === "code") {
    return "bg-[#0f9e8a]"
  }

  if (mediaType === "image") {
    return "bg-[#0ea5e9]"
  }

  if (mediaType === "video") {
    return "bg-[#8b5cf6]"
  }

  if (mediaType === "audio") {
    return "bg-[#ec4899]"
  }

  return "bg-[#7c7c7c]"
}
