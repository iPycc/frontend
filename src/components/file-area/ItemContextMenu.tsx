import { type FileNode } from "@/lib/models"
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu"

interface ItemContextMenuProps {
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
  onPropertiesRequest: (ids: string[]) => void
  onCreateChildFolder: (parentId: string) => void
}

export function ItemContextMenu({
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
}: ItemContextMenuProps) {
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
      <ContextMenuItem onClick={() => onPropertiesRequest(ids)}>
        属性
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

