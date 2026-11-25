import { publishPopupResult, subscribePopupResults } from "./oauth-popup-channel"

export const GOOGLE_OAUTH_TIMEOUT_MS = 10 * 60 * 1000
const attempts = new WeakMap<Window, string>()
const ATTEMPT_KEY = "cloudrave-google-oauth-attempt"

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
  attemptId?: string
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

  const attemptId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const popup = window.open("", `${GOOGLE_OAUTH_POPUP_NAME}-${attemptId}`, features)
  if (!popup) return { popup: null, error: "无法打开 Google 授权窗口，请允许弹出式窗口后重试。" }
  attempts.set(popup, attemptId)
  try {
    popup.sessionStorage.setItem(GOOGLE_OAUTH_SESSION_KEY, flow)
    popup.sessionStorage.setItem(ATTEMPT_KEY, attemptId)
  } catch {
    closeGoogleOAuthPopup(popup)
    return { popup: null, error: "无法初始化 Google 授权窗口，请允许本站使用会话存储后重试。" }
  }
  popup.location.href = url
  popup.focus()
  return { popup, error: null }
}

export function isGoogleOAuthPopupWindow() {
  if (window.name.startsWith(GOOGLE_OAUTH_POPUP_NAME)) {
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

export function readGoogleOAuthCompletion(location: Pick<Location, "pathname" | "search">): GoogleOAuthMessage {
  const params = new URLSearchParams(location.search)
  let flow: GoogleOAuthFlow = "login"
  let result = params.get("result") || "provider_error"
  if (location.pathname.startsWith("/app")) result = "success"
  else if (location.pathname === "/login") result = params.get("oauth_2fa") === "google" ? "two_factor" : params.get("google_oauth_error") || "provider_error"
  else if (location.pathname === "/settings/security") {
    flow = params.has("google_oauth_test") ? "test" : "link"
    result = params.get(`google_oauth_${flow}`) || "provider_error"
  } else {
    const value = params.get("flow")
    if (value === "test" || value === "link") flow = value
  }
  let attemptId: string | undefined
  try { attemptId = window.sessionStorage.getItem(ATTEMPT_KEY) ?? undefined } catch { /* Storage may be blocked. */ }
  return { type: GOOGLE_OAUTH_MESSAGE_TYPE, flow, result, attemptId }
}

export function closeGoogleOAuthPopup(popup: Window | null) {
  if (!popup) return
  attempts.delete(popup)
  try { popup.close() } catch { /* COOP can prevent closing the window. */ }
}

export function subscribeGoogleOAuthResults(
  flow: GoogleOAuthFlow,
  getPopup: () => Window | null,
  handler: (message: GoogleOAuthMessage) => void
) {
  return subscribePopupResults(
    GOOGLE_OAUTH_CHANNEL_NAME, GOOGLE_OAUTH_STORAGE_KEY, getPopup,
    (data): data is GoogleOAuthMessage => {
      const popup = getPopup()
      return Boolean(popup && isGoogleOAuthPayload(data, flow) && data.attemptId && data.attemptId === attempts.get(popup))
    }, handler
  )
}
