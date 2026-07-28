import type { MountMode, MountSyncStatus } from "@/api/storage"
import type { SortValue } from "@/lib/models"

export type ExplorerMount = {
  id: number
  owner_id: number
  policy_id: number
  name: string
  mount_slug: string
  root_path: string
  provider_label?: string | null
  is_enabled: boolean
  mode: MountMode
  read_only: boolean
  legacy_prefixed_keys: boolean
  sync_status: MountSyncStatus
  last_sync_at?: string | null
  sync_error?: string | null
  synced_objects: number
  quota_bytes?: number | null
  extra: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type ExplorerNode = {
  id: number
  owner_id: number
  mount_id: number
  parent_id?: number | null
  type: "folder" | "file"
  status: "active" | "deleted"
  name: string
  blob_path?: string | null
  size: number
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export type CreateFolderInput = {
  mount_id: number
  parent_id?: number | null
  name: string
}

export type CreateFileInput = {
  mount_id: number
  parent_id?: number | null
  name: string
}

export type RenameNodeInput = {
  name: string
}

export type DeleteNodesInput = {
  node_ids: number[]
  hard_delete: boolean
}

export type TransferNodesInput = {
  node_ids: number[]
  target_parent_id?: number | null
}

export type RestoreNodesInput = {
  node_ids: number[]
}

export type ExplorerNodePage = {
  items: ExplorerNode[]
  next_cursor: string | null
}

export type ListNodePageOptions = {
  mountId: number
  parentId?: number | null
  limit: number
  cursor?: string | null
  sort?: SortValue
  foldersOnly?: boolean
}

export type ExplorerNodeSearchResult = {
  node: ExplorerNode
  parent_path: string
}

export type NodeActivity = {
  id: number
  action: string
  actor_id?: number | null
  actor_name: string
  actor_avatar?: string | null
  detail?: string | null
  created_at: string
}

export type BackgroundTask = {
  id: string
  owner_id: number
  kind: "archive_extract"
  name: string
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  detail?: string | null
  result_node_id?: number | null
  created_at: string
  updated_at: string
}

export type PreviewAsset = {
  url: string
  mime_type: string
  width?: number | null
  height?: number | null
  size?: number | null
  supports_range: boolean
  delivery?: "cloudrave" | "storage" | "external"
  expires_at?: string | null
}

export type PreviewKind = "image" | "video" | "audio" | "pdf" | "office" | "text" | "archive" | "unsupported"

export type PreviewManifest = {
  node_id: number
  name: string
  version: string
  kind: PreviewKind
  status: "ready" | "processing" | "unsupported" | "failed"
  mime_type: string
  size: number
  metadata: Record<string, unknown>
  assets: Record<string, PreviewAsset>
  capabilities: string[]
  requires_preparation: boolean
  preparation_available: boolean
  error?: string | null
}

export type OfficeCardPreviewData = {
  kind: "document" | "spreadsheet" | "presentation" | "unsupported"
  lines: string[]
  rows: string[][]
  cover_available: boolean
  cover_kind?: "thumbnail" | "slide-image" | null
  aspect_ratio?: number | null
}
