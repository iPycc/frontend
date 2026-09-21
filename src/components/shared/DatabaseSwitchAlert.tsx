import * as React from "react"
import { useLocation } from "react-router-dom"

import { getInitialDatabaseStatus, type DatabaseStatus } from "@/api/database"
import { DatabaseMigrationDialog } from "@/components/database/DatabaseMigrationDialog"
import { useAppState } from "@/state/app"

const migratingPhases = new Set(["queued", "connecting", "inventory", "backup", "schema", "copying", "verifying"])

export function DatabaseSwitchAlert() {
  const { currentUser } = useAppState()
  const location = useLocation()
  const [status, setStatus] = React.useState<DatabaseStatus | null>(null)
  const [open, setOpen] = React.useState(false)
  const dismissed = React.useRef<string | null>(null)
  const currentPath = React.useRef(location.pathname)
  currentPath.current = location.pathname
  const isAdmin = currentUser?.role === "admin"

  React.useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void getInitialDatabaseStatus().then((next) => {
      if (cancelled) return
      setStatus(next)
      const migration = next.current_migration
      const requiresAttention = next.switch_pending || next.activation_pending || next.activation_failed || Boolean(migration && migratingPhases.has(migration.phase))
      const signature = `${next.active.backend}:${next.requested.backend}:${migration?.id ?? "none"}:${migration?.phase ?? "none"}`
      if (requiresAttention && dismissed.current !== signature && currentPath.current !== "/admin/system") {
        setOpen(true)
      }
      if (!requiresAttention) dismissed.current = null
    }).catch(() => {
      // Other application health surfaces handle session and network failures.
    })
    return () => { cancelled = true }
  }, [isAdmin])

  if (!isAdmin) return null

  return (
    <DatabaseMigrationDialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen && status) {
          dismissed.current = `${status.active.backend}:${status.requested.backend}:${status.current_migration?.id ?? "none"}:${status.current_migration?.phase ?? "none"}`
        }
      }}
      initialStatus={status}
      onStatusChange={setStatus}
    />
  )
}
