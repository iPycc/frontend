import { publishPopupResult, subscribePopupResults } from "./oauth-popup-channel"

export const QQ_OAUTH_POPUP_NAME = "cloudrave-qq-oauth"
export const QQ_OAUTH_MESSAGE_TYPE = "cloudrave:qq-oauth-result"
const QQ_OAUTH_CHANNEL_NAME = "cloudrave-qq-oauth"
const QQ_OAUTH_STORAGE_KEY = "cloudrave-qq-oauth-result"
const QQ_OAUTH_SESSION_KEY = "cloudrave-qq-oauth-flow"

export type QQOAuthFlow = "login" | "link"

export type QQOAuthMessage = {
  type: typeof QQ_OAUTH_MESSAGE_TYPE
  flow: QQOAuthFlow
  result: string
}

export function openQQOAuthPopup(url: string, flow: QQOAuthFlow) {
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

  const popup = window.open(url, QQ_OAUTH_POPUP_NAME, features)
  try {
    popup?.sessionStorage.setItem(QQ_OAUTH_SESSION_KEY, flow)
  } catch {
    // The completion URL and cross-window channels remain available if storage is blocked.
  }
  popup?.focus()
  return popup
}

export function isQQOAuthPopupWindow() {
  if (window.name === QQ_OAUTH_POPUP_NAME) return true
  try {
    const flow = window.sessionStorage.getItem(QQ_OAUTH_SESSION_KEY)
    return flow === "login" || flow === "link"
  } catch {
    return false
  }
}

function isQQOAuthPayload(value: unknown, flow: QQOAuthFlow): value is QQOAuthMessage {
  return Boolean(
    value &&
    typeof value === "object" &&
    "type" in value &&
    value.type === QQ_OAUTH_MESSAGE_TYPE &&
    "flow" in value &&
    value.flow === flow &&
    "result" in value &&
    typeof value.result === "string"
  )
}

export function publishQQOAuthResult(message: QQOAuthMessage) {
  publishPopupResult(message, QQ_OAUTH_CHANNEL_NAME, QQ_OAUTH_STORAGE_KEY)
}

export function readQQOAuthPopupResult(popup: Window, flow: QQOAuthFlow): QQOAuthMessage | null {
  try {
    const location = popup.location
    if (location.origin !== window.location.origin) return null
    const params = new URLSearchParams(location.search)
    if (location.pathname === "/oauth/qq/complete") {
      const result = params.get("result")
      if (result) {
        return { type: QQ_OAUTH_MESSAGE_TYPE, flow, result }
      }
      return null
    }
    if (location.pathname === "/app" || location.pathname.startsWith("/app/")) {
      return { type: QQ_OAUTH_MESSAGE_TYPE, flow, result: "success" }
    }
    if (location.pathname === "/login") {
      if (params.get("oauth_2fa") === "qq") {
        return { type: QQ_OAUTH_MESSAGE_TYPE, flow, result: "two_factor" }
      }
      const error = params.get("qq_oauth_error")
      if (error) {
        return { type: QQ_OAUTH_MESSAGE_TYPE, flow, result: error }
      }
      return null
    }
    if (location.pathname === "/settings/security") {
      const result = params.get("qq_oauth_link")
      if (result) {
        return { type: QQ_OAUTH_MESSAGE_TYPE, flow, result }
      }
    }
  } catch {
    // Reading location is expected to fail while the popup is on graph.qq.com.
  }
  return null
}

export function subscribeQQOAuthResults(
  flow: QQOAuthFlow,
  getPopup: () => Window | null,
  handler: (message: QQOAuthMessage) => void
) {
  return subscribePopupResults(
    QQ_OAUTH_CHANNEL_NAME, QQ_OAUTH_STORAGE_KEY, getPopup,
    (data): data is QQOAuthMessage => isQQOAuthPayload(data, flow), handler
  )
}
