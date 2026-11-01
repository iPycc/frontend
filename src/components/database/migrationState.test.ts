import assert from "node:assert/strict"
import test from "node:test"

import type { DatabaseMigration, DatabaseStatus } from "@/api/database"
import { currentMigrationFromStatus, wizardStepFromStatus } from "./migrationState"

function statusWith(migration: DatabaseMigration | null): DatabaseStatus {
  const source = { backend: "mysql" as const, host: null, port: null, user: null, name: "cloudrave", password_configured: true }
  const target = { ...source, backend: "postgresql" as const }
  const connection = {
    reachable: true, backend: "postgresql" as const, server_version: null,
    schema_version: null, instance_id: null,
    summary: { total_rows: 0, has_data: false, tables: [] },
    database_created: false, error_code: null, error: null,
  }
  return {
    managed_by: "config", editable: true, config_path: "config.ini",
    active: source, requested: target, profiles: [source, target],
    switch_pending: true, activation_pending: false, activation_failed: false,
    source: { ...connection, backend: "mysql" }, target: connection,
    current_migration: migration, recent_migrations: migration ? [migration] : [], warning: null,
  }
}

function migration(source_backend: "sqlite" | "mysql", target_backend: "mysql" | "postgresql", phase: "ready" | "copying", restart_required: boolean): DatabaseMigration {
  return {
    id: "migration-id", source_backend, target_backend, data_choice: "source",
    phase, progress: phase === "ready" ? 100 : 45, current_table: null,
    processed_rows: 10, total_rows: 100, detail: "", restart_required,
    backup_available: false, backup_name: null, error: null,
    created_at: "2026-09-15T00:00:00Z", updated_at: "2026-09-15T00:00:00Z", logs: [],
  }
}

test("an old SQLite to MySQL migration cannot send a MySQL to PostgreSQL wizard to step four", () => {
  const status = statusWith(migration("sqlite", "mysql", "ready", false))
  assert.equal(currentMigrationFromStatus(status), null)
  assert.equal(wizardStepFromStatus(status), 2)
})

test("a current MySQL to PostgreSQL migration resumes at the progress step", () => {
  const active = migration("mysql", "postgresql", "copying", false)
  const status = statusWith(active)
  assert.equal(currentMigrationFromStatus(status), active)
  assert.equal(wizardStepFromStatus(status), 4)
})

test("a completed current migration stays at step four until restart", () => {
  const status = statusWith(migration("mysql", "postgresql", "ready", true))
  status.activation_pending = true
  assert.equal(wizardStepFromStatus(status), 4)
})
