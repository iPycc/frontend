import type { MouseEvent } from "react"
import { type FileNode } from "@/lib/models"

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
  onPropertiesRequest: (ids: string[]) => void
  onCreateChildFolder: (parentId: string) => void
  getContextIds: (nodeId: string) => string[]
}

export interface InlineNameEdit {
  itemId: string
  mode: "create" | "rename"
  value: string
  pending?: boolean
  error?: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

