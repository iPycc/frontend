import type { MouseEvent } from "react"
import { IconCheck } from "@tabler/icons-react"

import { type FileNode } from "@/lib/models"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { type InlineNameEdit, type ItemHandlers } from "./types"
import { FileGlyph } from "./FileGlyph"
import { InlineNameEditor } from "./InlineNameEditor"
import { ItemContextMenu } from "./ItemContextMenu"

interface FileListProps extends ItemHandlers {
  items: FileNode[]
  selectedIds: string[]
  inlineEdit?: InlineNameEdit
}

export function FileList({
  items,
  selectedIds,
  inlineEdit,
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
}: FileListProps) {
  if (items.length === 0) {
    return <EmptyState title="没有任何内容" description="在此处上传文件或创建文件夹" />
  }

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-14 text-center">图标</TableHead>
          <TableHead>名称</TableHead>
          <TableHead className="w-36">类型</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const selected = selectedIds.includes(item.id)
          const editing = inlineEdit?.itemId === item.id

          if (editing && inlineEdit) {
            return (
              <TableRow key={item.id} data-file-card data-file-card-id={item.id}>
                <TableCell className="w-14 px-3 py-2.5 text-center">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/70">
                    <FileGlyph item={item} />
                  </div>
                </TableCell>
                <TableCell className="min-w-0 py-2.5">
                  <InlineNameEditor
                    edit={inlineEdit}
                    originalName={inlineEdit.mode === "rename" ? item.name : undefined}
                    className="max-w-md"
                  />
                </TableCell>
                <TableCell className="w-36 py-2.5 text-sm text-muted-foreground">
                  {getItemMeta(item)}
                </TableCell>
              </TableRow>
            )
          }

          return (
            <ContextMenu key={item.id}>
              <ContextMenuTrigger
                onContextMenu={(event) => {
                  event.stopPropagation()
                  onPrepareContext(item.id)
                }}
                render={
                  <TableRow
                    data-file-card
                    data-file-card-id={item.id}
                    className={cn(
                      "group",
                      selected && "bg-primary/[0.06] shadow-[inset_3px_0_0_var(--primary)] hover:bg-primary/[0.08] dark:bg-primary/10"
                    )}
                  >
                    <TableCell className="w-14 px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={(event: MouseEvent) => {
                          event.stopPropagation()
                          onSelectNode(item.id, event)
                        }}
                        className={cn(
                          "relative flex size-8 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50",
                          selected ? "bg-transparent" : "bg-muted/70 group-hover:bg-transparent"
                        )}
                        aria-label={selected ? `取消选择 ${item.name}` : `选择 ${item.name}`}
                        aria-pressed={selected}
                      >
                        <span className={cn("transition-opacity", selected ? "opacity-0" : "opacity-100 group-hover:opacity-0")}><FileGlyph item={item} /></span>
                        <span className={cn(
                          "absolute inset-0 m-auto flex size-5 items-center justify-center rounded-full border-2 transition-opacity",
                          selected ? "border-primary bg-primary text-primary-foreground opacity-100" : "border-muted-foreground/55 bg-background text-transparent opacity-0 group-hover:opacity-100"
                        )}>
                          <IconCheck size={12} stroke={2.5} />
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="min-w-0 py-2.5">
                      <button
                        type="button"
                        onClick={(event: MouseEvent) => {
                          event.stopPropagation()
                          onSelectNode(item.id, event)
                        }}
                        onDoubleClick={(event: MouseEvent) => {
                          event.stopPropagation()
                          onOpenNode(item)
                        }}
                        className="block w-full truncate text-left text-sm text-foreground"
                      >
                        {item.name}
                      </button>
                    </TableCell>
                    <TableCell className="w-36 py-2.5">
                      <button
                        type="button"
                        onClick={(event: MouseEvent) => {
                          event.stopPropagation()
                          onSelectNode(item.id, event)
                        }}
                        onDoubleClick={(event: MouseEvent) => {
                          event.stopPropagation()
                          onOpenNode(item)
                        }}
                        className="block w-full truncate text-left text-sm text-muted-foreground"
                      >
                        {getItemMeta(item)}
                      </button>
                    </TableCell>
                  </TableRow>
                }
              />
              <ItemContextMenu
                item={item}
                getIds={() => getContextIds(item.id)}
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
        })}
      </TableBody>
    </Table>
  )
}

function getItemMeta(item: FileNode) {
  if (item.kind === "folder") return "文件夹"
  if (item.ext) return item.ext.toUpperCase()
  return "文件"
}
