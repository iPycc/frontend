import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"

import { hashFile } from "./hash"

test("large files use a complete checksum for safe upload resume", async () => {
  const original = new Uint8Array(16 * 1024 * 1024 + 1)
  const changed = original.slice()
  changed[8 * 1024 * 1024] = 1
  const file = new File([original], "same.bin", { lastModified: 1 })
  const replacement = new File([changed], "same.bin", { lastModified: 1 })

  assert.equal(await hashFile(file), createHash("sha256").update(original).digest("hex"))
  assert.notEqual(await hashFile(file), await hashFile(replacement))
})


test("small-file hashing honors an already canceled upload", async () => {
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(hashFile(new File(["content"], "a.txt"), controller.signal), { name: "AbortError" })
})
