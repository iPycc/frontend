import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { resolveStorageStrategy } from "@/components/storage"
import type { BucketMount } from "@/lib/models"
import { buildAliyunPolicyInput, createEmptyAliyunDraft } from "@/pages/settings/store/build"

test("aliyun storage input uses write-only provider-neutral credentials", () => {
  const draft = {
    ...createEmptyAliyunDraft(),
    name: "OSS",
    bucketName: "bucket",
    accessKeyId: "id",
    accessKeySecret: "secret",
  }
  const input = buildAliyunPolicyInput(draft)
  assert.equal(input.provider, "aliyun_oss")
  assert.deepEqual(input.credentials, { access_key_id: "id", access_key_secret: "secret" })
  assert.equal("secret_id" in input, false)
})

test("mount strategy is selected from explicit driver metadata", () => {
  const bucket = { driverId: "aliyun_oss", storageType: "tencent", provider: "legacy label" } as BucketMount
  assert.equal(resolveStorageStrategy(bucket), "aliyun")
})

test("aliyun icon contains the supplied 1024 SVG paths", () => {
  const source = readFileSync(new URL("./ProviderIcon.tsx", import.meta.url), "utf8")
  assert.match(source, /viewBox="0 0 1024 1024"/)
  assert.match(source, /M512 64a448 448 0 1 1 0 896A448 448 0 0 1 512 64z/)
  assert.match(source, /M324\.8 602\.624a26\.752/)
})
