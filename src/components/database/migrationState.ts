import type { DatabaseMigration, DatabaseStatus } from "@/api/database"

export type WizardStep = 1 | 2 | 3 | 4

export function currentMigrationFromStatus(status?: DatabaseStatus | null): DatabaseMigration | null {
  const migration = status?.current_migration
  if (!status?.switch_pending || !migration) return null
  if (migration.source_backend !== status.active.backend || migration.target_backend !== status.requested.backend) return null
  if (migration.phase === "ready" && !migration.restart_required) return null
  return migration
}

export function wizardStepFromStatus(status?: DatabaseStatus | null): WizardStep {
  if (status?.activation_pending || currentMigrationFromStatus(status)) return 4
  if (status?.switch_pending && status.target?.reachable) return 2
  return 1
}
