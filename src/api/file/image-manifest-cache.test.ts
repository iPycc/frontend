import assert from "node:assert/strict"
import test from "node:test"
import { requestImageManifest, type ImageManifestRequests } from "./image-manifest-cache"
import type { PreviewManifest } from "./type"

const ready = { kind: "image", status: "ready", assets: { source: { url: "/source" }, dzi: { url: "/tiles", expires_at: new Date(0).toISOString() } } } as unknown as PreviewManifest

test("expired DZI assets invalidate a manifest even when the source is valid", async () => {
  const requests: ImageManifestRequests = new Map()
  let loads = 0
  const load = async () => { loads++; return ready }
  await requestImageManifest(requests, "image", load)
  await requestImageManifest(requests, "image", load)
  assert.equal(loads, 2)
})

test("invalid manifest responses reject through the caller promise and allow retry", async () => {
  const requests: ImageManifestRequests = new Map()
  await assert.rejects(requestImageManifest(requests, "image", async () => null as unknown as PreviewManifest), /预览响应无效/)
  assert.equal(await requestImageManifest(requests, "image", async () => ready), ready)
})

test("pending image requests have a finite cache deadline", () => {
  const requests: ImageManifestRequests = new Map()
  requestImageManifest(requests, "image", () => new Promise(() => {}))
  assert.ok(Number.isFinite(requests.get("image")?.expiresAt))
})
