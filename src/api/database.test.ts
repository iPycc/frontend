import assert from "node:assert/strict"
import test from "node:test"

import {
  getDatabaseMigration,
  getDatabaseStatus,
  getInitialDatabaseStatus,
  startDatabaseMigration,
  testDatabaseConnection,
  updateDatabaseConfig,
} from "./database"

test("database administration client uses the versioned admin contract", async (context) => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string; method: string; body?: unknown }> = []
  globalThis.fetch = async (input, init) => {
    const rawBody = typeof init?.body === "string" ? JSON.parse(init.body) : undefined
    calls.push({ url: String(input), method: init?.method ?? "GET", body: rawBody })
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }
  context.after(() => {
    globalThis.fetch = originalFetch
  })

  await getDatabaseStatus(7)
  await testDatabaseConnection({ backend: "mysql", host: "db", port: 3306, user: "app", password: "secret", name: "cloudrave" })
  await updateDatabaseConfig({ backend: "postgresql", host: "db", port: 5432, user: "app", password: null, name: "cloudrave" })
  await startDatabaseMigration({ data_choice: "source", current_password: "admin-secret", confirmation: "cloudrave" })
  await getDatabaseMigration("migration-id", 12)

  assert.deepEqual(calls.map((call) => [call.method, call.url]), [
    ["GET", "/api/v1/admin/database/status?after_seq=7"],
    ["POST", "/api/v1/admin/database/test"],
    ["PUT", "/api/v1/admin/database/config"],
    ["POST", "/api/v1/admin/database/migrations"],
    ["GET", "/api/v1/admin/database/migrations/migration-id?after_seq=12"],
  ])
  assert.deepEqual(calls[3].body, {
    data_choice: "source",
    current_password: "admin-secret",
    confirmation: "cloudrave",
  })
})

test("admin page-load database checks share one request and explicit refresh updates the snapshot", async (context) => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response(JSON.stringify({ active: { backend: calls === 1 ? "mysql" : "postgresql" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }
  context.after(() => { globalThis.fetch = originalFetch })

  const [globalCheck, systemPageCheck] = await Promise.all([
    getInitialDatabaseStatus(),
    getInitialDatabaseStatus(),
  ])
  assert.equal(calls, 1)
  assert.equal(globalCheck, systemPageCheck)
  assert.equal((await getInitialDatabaseStatus()).active.backend, "mysql")
  assert.equal(calls, 1)

  await getDatabaseStatus()
  assert.equal((await getInitialDatabaseStatus()).active.backend, "postgresql")
  assert.equal(calls, 2)
})
