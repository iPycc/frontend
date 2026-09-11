export const GOOGLE_OAUTH_POPUP_NAME = "cloudrave-google-oauth"
export const GOOGLE_OAUTH_MESSAGE_TYPE = "cloudrave:google-oauth-result"
const GOOGLE_OAUTH_CHANNEL_NAME = "cloudrave-google-oauth"
const GOOGLE_OAUTH_STORAGE_KEY = "cloudrave-google-oauth-result"
const GOOGLE_OAUTH_SESSION_KEY = "cloudrave-google-oauth-flow"

export type GoogleOAuthFlow = "login" | "link"

export type GoogleOAuthMessage = {
  type: typeof GOOGLE_OAUTH_MESSAGE_TYPE
  flow: GoogleOAuthFlow
  result: string
}

export function openGoogleOAuthPopup(url: string, flow: GoogleOAuthFlow) {
  const width = Math.min(720, window.screen.availWidth)
  const height = Math.min(760, window.screen.availHeight)
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2))
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2))
  const features = [
    "popup=yes",
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    "resizable=yes",
    "scrollbars=yes",
  ].join(",")

  const popup = window.open(url, GOOGLE_OAUTH_POPUP_NAME, features)
  try {
    popup?.sessionStorage.setItem(GOOGLE_OAUTH_SESSION_KEY, flow)
  } catch {
    // The completion URL and cross-window channels remain available if storage is blocked.
  }
  popup?.focus()
  return popup
}

export function isGoogleOAuthPopupWindow() {
  if (window.name === GOOGLE_OAUTH_POPUP_NAME) {
    return true
  }
  try {
    const flow = window.sessionStorage.getItem(GOOGLE_OAUTH_SESSION_KEY)
    return flow === "login" || flow === "link"
  } catch {
    return false
  }
}

function isGoogleOAuthPayload(data: unknown, flow?: GoogleOAuthFlow): data is GoogleOAuthMessage {
  return Boolean(
    data &&
      typeof data === "object" &&
      "type" in data &&
      data.type === GOOGLE_OAUTH_MESSAGE_TYPE &&
      "flow" in data &&
      (data.flow === "login" || data.flow === "link") &&
      (!flow || data.flow === flow) &&
      "result" in data &&
      typeof data.result === "string"
  )
}

export function publishGoogleOAuthResult(message: GoogleOAuthMessage) {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(message, window.location.origin)
  }

  if (typeof window.BroadcastChannel !== "undefined") {
    const channel = new window.BroadcastChannel(GOOGLE_OAUTH_CHANNEL_NAME)
    channel.postMessage(message)
    channel.close()
  }

  try {
    window.localStorage.setItem(
      GOOGLE_OAUTH_STORAGE_KEY,
      JSON.stringify({ ...message, timestamp: Date.now() })
    )
    window.localStorage.removeItem(GOOGLE_OAUTH_STORAGE_KEY)
  } catch {
    // BroadcastChannel and window.opener remain available when storage is blocked.
  }
}

export function readGoogleOAuthPopupResult(
  popup: Window,
  flow: GoogleOAuthFlow
): GoogleOAuthMessage | null {
  try {
    const location = popup.location
    if (location.origin !== window.location.origin) {
      return null
    }

    const params = new URLSearchParams(location.search)
    if (flow === "login") {
      if (location.pathname === "/app" || location.pathname.startsWith("/app/")) {
        return { type: GOOGLE_OAUTH_MESSAGE_TYPE, flow, result: "success" }
      }
      if (location.pathname === "/login") {
        if (params.get("oauth_2fa") === "google") {
          return { type: GOOGLE_OAUTH_MESSAGE_TYPE, flow, result: "two_factor" }
        }
        const error = params.get("google_oauth_error")
        if (error) {
          return { type: GOOGLE_OAUTH_MESSAGE_TYPE, flow, result: error }
        }
      }
      return null
    }

    if (location.pathname === "/settings/security") {
      const result = params.get("google_oauth_link")
      if (result) {
        return { type: GOOGLE_OAUTH_MESSAGE_TYPE, flow, result }
      }
    }
  } catch {
    // Reading location is expected to fail while the popup is on accounts.google.com.
  }

  return null
}

export function subscribeGoogleOAuthResults(
  flow: GoogleOAuthFlow,
  getPopup: () => Window | null,
  handler: (message: GoogleOAuthMessage) => void
) {
  const deliver = (data: unknown) => {
    if (getPopup() && isGoogleOAuthPayload(data, flow)) {
      handler(data)
    }
  }

  const handleWindowMessage = (event: MessageEvent<unknown>) => {
    if (event.origin === window.location.origin && event.source === getPopup()) {
      deliver(event.data)
    }
  }

  const channel = typeof window.BroadcastChannel !== "undefined"
    ? new window.BroadcastChannel(GOOGLE_OAUTH_CHANNEL_NAME)
    : null
  const handleChannelMessage = (event: MessageEvent<unknown>) => deliver(event.data)
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== GOOGLE_OAUTH_STORAGE_KEY || !event.newValue) {
      return
    }
    try {
      deliver(JSON.parse(event.newValue))
    } catch {
      // Ignore malformed cross-window data.
    }
  }

  window.addEventListener("message", handleWindowMessage)
  window.addEventListener("storage", handleStorage)
  channel?.addEventListener("message", handleChannelMessage)

  return () => {
    window.removeEventListener("message", handleWindowMessage)
    window.removeEventListener("storage", handleStorage)
    channel?.close()
  }
}
