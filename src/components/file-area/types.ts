import type { MouseEvent } from "react"
import { type FileNode } from "@/lib/mock-data"

export interface ItemHandlers {
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
}
