import { type FileNode } from "@/lib/models"
import type { MouseEvent } from "react"
import {
  IconCopy,
  IconCut,
  IconDownload,
  IconEye,
  IconFolderOpen,
  IconFolderPlus,
  IconFolderSymlink,
  IconInfoCircle,
  IconPencil,
  IconShare3,
  IconTrash,
} from "@tabler/icons-react"
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu"
import { hasCapability } from "@/lib/models"
import { useAppState } from "@/state/app"

interface ItemContextMenuProps {
  item: FileNode
  getIds: () => string[]
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
  getIds,
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
  const { currentUser } = useAppState()
  const canCopy = hasCapability(currentUser, "file.copy")
  const canShare = hasCapability(currentUser, "share.manage")
  const ids = getIds()
  const multiple = ids.length > 1
  const isFolder = item.kind === "folder"
  const runItemAction = (action: () => void) => (event: MouseEvent) => {
    event.stopPropagation()
    action()
  }

  return (
    <ContextMenuContent onContextMenu={(event) => event.stopPropagation()}>
      <ContextMenuLabel>
        {multiple ? `已选 ${ids.length} 项` : isFolder ? "文件夹" : "文件"}
      </ContextMenuLabel>
      <ContextMenuItem onClick={runItemAction(() => onOpenNode(item))}>
        {isFolder ? <IconFolderOpen /> : <IconEye />}
        {isFolder ? "打开" : "预览"}
        <ContextMenuShortcut>{isFolder ? "Enter" : "Space"}</ContextMenuShortcut>
      </ContextMenuItem>
      {isFolder && !multiple ? (
        <ContextMenuItem onClick={runItemAction(() => onCreateChildFolder(item.id))}>
          <IconFolderPlus />
          新建子文件夹
        </ContextMenuItem>
      ) : null}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={runItemAction(() => onDownloadRequest(getIds()))}><IconDownload />下载</ContextMenuItem>
      {canShare ? <ContextMenuItem onClick={runItemAction(() => onShareRequest(getIds()))}><IconShare3 />分享</ContextMenuItem> : null}
      {canCopy ? <ContextMenuItem onClick={runItemAction(() => onCopyRequest(getIds()))}><IconCopy />复制</ContextMenuItem> : null}
      <ContextMenuItem onClick={runItemAction(() => onCutRequest(getIds()))}><IconCut />剪切</ContextMenuItem>
      <ContextMenuItem onClick={runItemAction(() => onRenameRequest(getIds()))}><IconPencil />重命名</ContextMenuItem>
      <ContextMenuItem onClick={runItemAction(() => onMoveRequest(getIds()))}><IconFolderSymlink />移动到…</ContextMenuItem>
      <ContextMenuItem variant="destructive" onClick={runItemAction(() => onDeleteRequest(getIds()))}>
        <IconTrash />
        删除
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={runItemAction(() => onPropertiesRequest(getIds()))}>
        <IconInfoCircle />
        属性
      </ContextMenuItem>
    </ContextMenuContent>
  )
}

