import assert from "node:assert/strict"
import test from "node:test"

import type { UploadQueueItem } from "@/lib/models"
import { persistUploadTasks, restoreUploadTasks } from "@/lib/upload/persistence"

function installStorage() {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    },
  })
}

function task(overrides: Partial<UploadQueueItem> = {}): UploadQueueItem {
  return {
    id: "upload-1",
    fileName: "large.bin",
    fileSize: 128,
    mountId: "mount-1",
    parentId: null,
    status: "uploading",
    progress: 50,
    uploadedBytes: 64,
    totalBytes: 128,
    speedText: "正在上传",
    sessionId: "session-1",
    createdAt: "2026-09-07 10:00:00",
    ...overrides,
  }
}

test("restored in-progress tasks wait for the original file and keep their session", () => {
  installStorage()
  persistUploadTasks("user-a", [task()])

  const [restored] = restoreUploadTasks("user-a")

  assert.equal(restored.status, "paused")
  assert.equal(restored.requiresFileSelection, true)
  assert.equal(restored.sessionId, "session-1")
  assert.equal(restored.uploadedBytes, 64)
})

test("upload task persistence is isolated per user", () => {
  installStorage()
  persistUploadTasks("user-a", [task()])

  assert.deepEqual(restoreUploadTasks("user-b"), [])
})
