import type { AuthSession, AuthTokens } from "@/lib/models"

export type AuthEventMessage =
  | {
      type: "session-updated"
      session: AuthSession
    }
  | {
      type: "logout"
      reason?: string
    }

const CHANNEL_NAME = "cloudrave-auth"
const STORAGE_EVENT_KEY = "cloudrave-auth-event"

export function createAuthChannel() {
  if (typeof window === "undefined" || typeof window.BroadcastChannel === "undefined") {
    return null
  }

  return new window.BroadcastChannel(CHANNEL_NAME)
}

export function emitAuthEvent(message: AuthEventMessage) {
  if (typeof window === "undefined") {
    return
  }

  const channel = createAuthChannel()
  channel?.postMessage(message)
  channel?.close()

  try {
    window.localStorage.setItem(STORAGE_EVENT_KEY, JSON.stringify({ ...message, ts: Date.now() }))
    window.localStorage.removeItem(STORAGE_EVENT_KEY)
  } catch {
    // Ignore storage broadcast failures; BroadcastChannel is the primary path.
  }
}

export function subscribeAuthEvents(handler: (message: AuthEventMessage) => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const channel = createAuthChannel()

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_EVENT_KEY || !event.newValue) {
      return
    }

    try {
      const parsed = JSON.parse(event.newValue) as AuthEventMessage & { ts?: number }
      if (parsed.type === "session-updated" || parsed.type === "logout") {
        handler(parsed)
      }
    } catch {
      // Ignore malformed broadcast payloads.
    }
  }

  if (channel) {
    channel.addEventListener("message", (event) => {
      const data = event.data as AuthEventMessage | undefined
      if (data?.type === "session-updated" || data?.type === "logout") {
        handler(data)
      }
    })
  }

  window.addEventListener("storage", onStorage)

  return () => {
    channel?.close()
    window.removeEventListener("storage", onStorage)
  }
}

export function isExpired(expiresAt?: string | null) {
  if (!expiresAt) {
    return true
  }

  const timestamp = Date.parse(expiresAt)
  if (Number.isNaN(timestamp)) {
    return true
  }

  return timestamp <= Date.now()
}

export function shouldRefreshSession(session: AuthSession | null) {
  if (!session) {
    return false
  }

  return isExpired(session.tokens.accessExpiresAt) && !isExpired(session.tokens.refreshExpiresAt)
}

export function mergeSessionTokens(session: AuthSession, tokens: AuthTokens): AuthSession {
  return {
    ...session,
    tokens,
  }
}

