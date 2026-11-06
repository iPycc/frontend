import assert from "node:assert/strict"
import { test } from "node:test"
import { publishGoogleOAuthResult, readGoogleOAuthPopupResult, GOOGLE_OAUTH_MESSAGE_TYPE } from "./google-oauth-popup"

test("publishes through same-origin channels when COOP blocks opener", () => {
  const messages: unknown[] = []
  const storage: string[] = []
  const original = Object.getOwnPropertyDescriptor(globalThis, "window")
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location: { origin: "https://cloud.example.com" },
    opener: {
      get closed() { throw new Error("must not read closed") },
      postMessage() { throw new Error("COOP blocked") },
    },
    BroadcastChannel: class {
      postMessage(message: unknown) { messages.push(message) }
      close() {}
    },
    localStorage: {
      setItem(_key: string, value: string) { storage.push(value) },
      removeItem() {},
    },
  } })
  try {
    const result = { type: GOOGLE_OAUTH_MESSAGE_TYPE as typeof GOOGLE_OAUTH_MESSAGE_TYPE, flow: "login" as const, result: "success" }
    publishGoogleOAuthResult(result)
    assert.deepEqual(messages, [result])
    assert.equal(JSON.parse(storage[0]).result, "success")
    const popup = { location: { origin: "https://cloud.example.com", pathname: "/oauth/google/complete", search: "?flow=login&result=success" } } as Window
    assert.deepEqual(readGoogleOAuthPopupResult(popup, "login"), result)
    assert.equal(readGoogleOAuthPopupResult(popup, "link"), null)
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original)
    else Reflect.deleteProperty(globalThis, "window")
  }
})

