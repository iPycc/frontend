import { type FileNode } from "@/lib/models"
import { type InlineNameEdit, type ItemHandlers } from "./types"
import { FileCard } from "./FileCard"

interface FileSectionProps extends ItemHandlers {
  title?: string
  emptyText?: string
  items: FileNode[]
  selectedIds: string[]
  showThumbnail?: boolean
  inlineEdit?: InlineNameEdit
}

export function FileSection({
  title,
  emptyText,
  items,
  selectedIds,
  showThumbnail = false,
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
}: FileSectionProps) {
  return (
    <section>
      {title ? (
        <h2 className="mb-2 text-sm font-medium text-foreground sm:mb-3 md:mb-4">{title}</h2>
      ) : null}
      {items.length === 0 ? (
        emptyText ? <div className="text-sm text-muted-foreground">{emptyText}</div> : null
      ) : (
        <div className="file-section-grid">
          {items.map((item) => (
            <div key={item.id}>
              <FileCard
                item={item}
                selected={selectedIds.includes(item.id)}
                showThumbnail={showThumbnail}
                inlineEdit={inlineEdit}
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

