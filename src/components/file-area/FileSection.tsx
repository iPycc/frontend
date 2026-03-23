import { type FileNode } from "@/lib/mock-data"
import { type ItemHandlers } from "./types"
import { FileCard } from "./FileCard"

interface FileSectionProps extends ItemHandlers {
  title?: string
  emptyText?: string
  items: FileNode[]
  selectedIds: string[]
  showThumbnail?: boolean
}

export function FileSection({
  title,
  emptyText,
  items,
  selectedIds,
  showThumbnail = false,
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
        <h2 className="mb-4 text-sm font-medium text-foreground">{title}</h2>
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
                showThumbnail={showThumbnail}
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
