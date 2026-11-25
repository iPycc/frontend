import assert from "node:assert/strict"
import { test } from "node:test"
import { openGoogleOAuthPopup, closeGoogleOAuthPopup, publishGoogleOAuthResult, readGoogleOAuthCompletion, subscribeGoogleOAuthResults, GOOGLE_OAUTH_MESSAGE_TYPE } from "./google-oauth-popup"

test("Google popup transports isolate attempts and survive blocked BroadcastChannel", () => {
  const listeners = new Map<string, (event: any) => void>()
  const storage: string[] = []
  const received: unknown[] = []
  const original = Object.getOwnPropertyDescriptor(globalThis, "window")
  const popups: any[] = []
  const makePopup = () => {
    const values = new Map<string, string>()
    const popup = { location: { href: "" }, sessionStorage: { setItem: (k: string, v: string) => values.set(k,v), getItem: (k: string) => values.get(k) ?? null }, focus() {}, close() {} }
    popups.push(popup)
    return popup
  }
  const browser = {
    name: "", screen: { availWidth: 1920, availHeight: 1080 }, screenX: 0, screenY: 0, outerWidth: 1200, outerHeight: 800,
    location: { origin: "https://cloud.example.com" }, open: makePopup,
    opener: { postMessage() { throw new Error("COOP blocked") } },
    BroadcastChannel: class { constructor() { throw new Error("blocked") } },
    localStorage: { setItem(_key: string, value: string) { storage.push(value) }, removeItem() {} },
    sessionStorage: { getItem: (_key: string): string | null => null },
    addEventListener(type: string, listener: (event: any) => void) { listeners.set(type, listener) },
    removeEventListener(type: string) { listeners.delete(type) },
  }
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser })
  try {
    const popup = openGoogleOAuthPopup("https://api.example.com/start", "login").popup!
    const other = openGoogleOAuthPopup("https://api.example.com/start", "login").popup!
    browser.sessionStorage = popups[0].sessionStorage
    const result = readGoogleOAuthCompletion({ pathname: "/oauth/google/complete", search: "?flow=login&result=success" })
    assert.equal(result.type, GOOGLE_OAUTH_MESSAGE_TYPE)
    assert.equal(result.result, "success")
    assert.ok(result.attemptId)
    const stop = subscribeGoogleOAuthResults("login", () => popup, (value) => received.push(value))
    listeners.get("message")?.({ origin: "https://other.example", source: popup, data: result })
    listeners.get("message")?.({ origin: browser.location.origin, source: other, data: result })
    listeners.get("message")?.({ origin: browser.location.origin, source: popup, data: { ...result, attemptId: "old" } })
    listeners.get("message")?.({ origin: browser.location.origin, source: popup, data: result })
    assert.deepEqual(received, [result])
    publishGoogleOAuthResult(result)
    assert.equal(JSON.parse(storage[0]).attemptId, result.attemptId)
    listeners.get("storage")?.({ key: "cloudrave-google-oauth-result", newValue: JSON.stringify({ ...result, attemptId: "other" }) })
    assert.equal(received.length, 1)
    closeGoogleOAuthPopup(popup)
    listeners.get("storage")?.({ key: "cloudrave-google-oauth-result", newValue: JSON.stringify(result) })
    assert.equal(received.length, 1)
    assert.equal(readGoogleOAuthCompletion({ pathname: "/settings/security", search: "?google_oauth_test=success" }).flow, "test")
    stop()
    assert.equal(listeners.size, 0)
    const blocked = makePopup()
    blocked.sessionStorage.setItem = () => { throw new Error("storage blocked") }
    browser.open = () => blocked
    const unavailable = openGoogleOAuthPopup("https://api.example.com/start", "test")
    assert.equal(unavailable.popup, null)
    assert.match(unavailable.error ?? "", /会话存储/)
    assert.equal(blocked.location.href, "")
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original)
    else Reflect.deleteProperty(globalThis, "window")
  }
})
