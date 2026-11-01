import { requestJson, requestResponse } from "@/api/client"

export type DatabaseBackend = "sqlite" | "mysql" | "postgresql"
export type DatabaseDataChoice = "source" | "target"
export type DatabaseMigrationPhase =
  | "queued"
  | "connecting"
  | "inventory"
  | "backup"
  | "schema"
  | "copying"
  | "verifying"
  | "ready"
  | "failed"

export type DatabaseProfile = {
  backend: DatabaseBackend
  host: string | null
  port: number | null
  user: string | null
  name: string
  password_configured: boolean
}

export type DatabaseDataSummary = {
  total_rows: number
  has_data: boolean
  tables: Array<{ table: string; rows: number }>
}

export type DatabaseConnection = {
  reachable: boolean
  backend: DatabaseBackend
  server_version: string | null
  schema_version: number | null
  instance_id: string | null
  summary: DatabaseDataSummary
  database_created: boolean
  error_code:
    | "database_not_found"
    | "database_creation_failed"
    | "authentication_failed"
    | "permission_denied"
    | "connection_failed"
    | "unknown"
    | null
  error: string | null
}

export type DatabaseMigrationLog = {
  seq: number
  timestamp: string
  level: "info" | "warning" | "error"
  message: string
}

export type DatabaseMigration = {
  id: string
  source_backend: DatabaseBackend
  target_backend: DatabaseBackend
  data_choice: DatabaseDataChoice
  phase: DatabaseMigrationPhase
  progress: number
  current_table: string | null
  processed_rows: number
  total_rows: number
  detail: string
  restart_required: boolean
  backup_available: boolean
  backup_name: string | null
  error: string | null
  created_at: string
  updated_at: string
  logs: DatabaseMigrationLog[]
}

export type DatabaseStatus = {
  managed_by: "config" | "url" | "environment"
  editable: boolean
  config_path: string
  active: DatabaseProfile
  requested: DatabaseProfile
  profiles: DatabaseProfile[]
  switch_pending: boolean
  activation_pending: boolean
  activation_failed: boolean
  source: DatabaseConnection | null
  target: DatabaseConnection | null
  current_migration: DatabaseMigration | null
  recent_migrations: DatabaseMigration[]
  warning: string | null
}

export type DatabaseConfigInput = {
  backend: DatabaseBackend
  host?: string | null
  port?: number | null
  user?: string | null
  password?: string | null
  name?: string | null
  sqlite_path?: string | null
}

let initialDatabaseStatusRequest: Promise<DatabaseStatus> | null = null

// Shared by the admin-only page-load check, including a simultaneous mount
// of the global alert and the system settings route.
export function getInitialDatabaseStatus() {
  initialDatabaseStatusRequest ??= getDatabaseStatus()
  return initialDatabaseStatusRequest
}

export function getDatabaseStatus(afterSeq = 0, signal?: AbortSignal) {
  return requestJson<DatabaseStatus>(`/admin/database/status?after_seq=${afterSeq}`, {
    signal,
    cache: "no-store",
  }).then((status) => {
    if (afterSeq === 0) initialDatabaseStatusRequest = Promise.resolve(status)
    return status
  })
}

export function updateDatabaseConfig(input: DatabaseConfigInput) {
  return requestJson<DatabaseProfile>("/admin/database/config", { method: "PUT", body: input })
}

export function testDatabaseConnection(input: DatabaseConfigInput) {
  return requestJson<DatabaseConnection>("/admin/database/test", { method: "POST", body: input })
}

export function startDatabaseMigration(input: {
  data_choice: DatabaseDataChoice
  current_password: string
  confirmation: string
}) {
  return requestJson<DatabaseMigration>("/admin/database/migrations", { method: "POST", body: input })
}

export function getDatabaseMigration(id: string, afterSeq = 0, signal?: AbortSignal) {
  return requestJson<DatabaseMigration>(
    `/admin/database/migrations/${encodeURIComponent(id)}?after_seq=${afterSeq}`,
    { signal, cache: "no-store" }
  )
}

export async function downloadDatabaseBackup(migration: DatabaseMigration) {
  const response = await requestResponse(
    `/admin/database/migrations/${encodeURIComponent(migration.id)}/backup`
  )
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = migration.backup_name || `cloudrave-database-backup-${migration.id}.jsonl.gz`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
