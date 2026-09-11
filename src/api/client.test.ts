import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import { configureAuthClient, requestJson } from "./client"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  configureAuthClient({})
})

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function authorizationHeader(init?: RequestInit) {
  return new Headers(init?.headers).get("Authorization")
}

test("a stale 401 reuses the current access token without refreshing again", async () => {
  let currentToken = "token-v2"
  let refreshCalls = 0
  const authorizations: Array<string | null> = []

  globalThis.fetch = async (_input, init) => {
    const authorization = authorizationHeader(init)
    authorizations.push(authorization)

    if (authorization === "Bearer token-v1") {
      return jsonResponse({ detail: "Session token rotated" }, 401)
    }

    return jsonResponse({ ok: true })
  }

  configureAuthClient({
    getAccessToken: () => currentToken,
    refreshAccessToken: async () => {
      refreshCalls += 1
      currentToken = "token-v3"
      return currentToken
    },
  })

  const result = await requestJson<{ ok: boolean }>("/resource", { token: "token-v1" })

  assert.deepEqual(result, { ok: true })
  assert.equal(refreshCalls, 0)
  assert.deepEqual(authorizations, ["Bearer token-v1", "Bearer token-v2"])
})

test("delayed concurrent 401 responses cannot start a second token rotation", async () => {
  let currentToken = "token-v1"
  let refreshCalls = 0
  let oldTokenRequests = 0

  globalThis.fetch = async (_input, init) => {
    const authorization = authorizationHeader(init)

    if (authorization === "Bearer token-v1") {
      oldTokenRequests += 1
      const delay = oldTokenRequests === 3 ? 30 : 0
      await new Promise((resolve) => setTimeout(resolve, delay))
      return jsonResponse({ detail: "Session token rotated" }, 401)
    }

    return jsonResponse({ ok: true })
  }

  configureAuthClient({
    getAccessToken: () => currentToken,
    refreshAccessToken: async () => {
      refreshCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 10))
      currentToken = "token-v2"
      return currentToken
    },
  })

  const results = await Promise.all([
    requestJson<{ ok: boolean }>("/resource", { token: "token-v1" }),
    requestJson<{ ok: boolean }>("/resource", { token: "token-v1" }),
    requestJson<{ ok: boolean }>("/resource", { token: "token-v1" }),
  ])

  assert.deepEqual(results, [{ ok: true }, { ok: true }, { ok: true }])
  assert.equal(refreshCalls, 1)
})
