import assert from "node:assert/strict"
import test from "node:test"

import { requiresUploadResponseHeader, usesCloudraveTransport } from "@/lib/upload/transport"

test("upload transport follows backend metadata instead of URL or provider", () => {
  assert.equal(usesCloudraveTransport({ transport: "cloudrave" }), true)
  assert.equal(usesCloudraveTransport({ transport: "presigned" }), false)
})

test("required response headers are case insensitive", () => {
  assert.equal(requiresUploadResponseHeader({ required_response_headers: ["ETag"] }, "etag"), true)
  assert.equal(requiresUploadResponseHeader({ required_response_headers: [] }, "ETag"), false)
})
