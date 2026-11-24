import { publishPopupResult, subscribePopupResults } from "./oauth-popup-channel"

export const GOOGLE_OAUTH_POPUP_NAME = "cloudrave-google-oauth"
export const GOOGLE_OAUTH_MESSAGE_TYPE = "cloudrave:google-oauth-result"
const GOOGLE_OAUTH_CHANNEL_NAME = "cloudrave-google-oauth"
const GOOGLE_OAUTH_STORAGE_KEY = "cloudrave-google-oauth-result"
const GOOGLE_OAUTH_SESSION_KEY = "cloudrave-google-oauth-flow"

export type GoogleOAuthFlow = "login" | "link" | "test"

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
    return flow === "login" || flow === "link" || flow === "test"
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
      (data.flow === "login" || data.flow === "link" || data.flow === "test") &&
      (!flow || data.flow === flow) &&
      "result" in data &&
      typeof data.result === "string"
  )
}

export function publishGoogleOAuthResult(message: GoogleOAuthMessage) {
  publishPopupResult(message, GOOGLE_OAUTH_CHANNEL_NAME, GOOGLE_OAUTH_STORAGE_KEY)
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
    if (location.pathname === "/oauth/google/complete") {
      const value = params.get("flow")
      const returnedFlow = value === "link" || value === "test" ? value : "login"
      return returnedFlow === flow
        ? { type: GOOGLE_OAUTH_MESSAGE_TYPE, flow, result: params.get("result") || "provider_error" }
        : null
    }
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
  return subscribePopupResults(
    GOOGLE_OAUTH_CHANNEL_NAME, GOOGLE_OAUTH_STORAGE_KEY, getPopup,
    (data): data is GoogleOAuthMessage => isGoogleOAuthPayload(data, flow), handler
  )
}
