import { publishPopupResult, subscribePopupResults } from "./oauth-popup-channel"

export const GITHUB_OAUTH_POPUP_NAME = "cloudrave-github-oauth"
export const GITHUB_OAUTH_MESSAGE_TYPE = "cloudrave:github-oauth-result"
const GITHUB_OAUTH_CHANNEL_NAME = "cloudrave-github-oauth"
const GITHUB_OAUTH_STORAGE_KEY = "cloudrave-github-oauth-result"
const GITHUB_OAUTH_SESSION_KEY = "cloudrave-github-oauth-flow"

export type GitHubOAuthFlow = "login" | "link"

export type GitHubOAuthMessage = {
  type: typeof GITHUB_OAUTH_MESSAGE_TYPE
  flow: GitHubOAuthFlow
  result: string
}

export function openGitHubOAuthPopup(url: string, flow: GitHubOAuthFlow) {
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

  const popup = window.open(url, GITHUB_OAUTH_POPUP_NAME, features)
  try {
    popup?.sessionStorage.setItem(GITHUB_OAUTH_SESSION_KEY, flow)
  } catch {
    // The completion URL and cross-window channels remain available if storage is blocked.
  }
  popup?.focus()
  return popup
}

export function isGitHubOAuthPopupWindow() {
  if (window.name === GITHUB_OAUTH_POPUP_NAME) {
    return true
  }
  try {
    const flow = window.sessionStorage.getItem(GITHUB_OAUTH_SESSION_KEY)
    return flow === "login" || flow === "link"
  } catch {
    return false
  }
}

function isGitHubOAuthPayload(data: unknown, flow?: GitHubOAuthFlow): data is GitHubOAuthMessage {
  return Boolean(
    data &&
      typeof data === "object" &&
      "type" in data &&
      data.type === GITHUB_OAUTH_MESSAGE_TYPE &&
      "flow" in data &&
      (data.flow === "login" || data.flow === "link") &&
      (!flow || data.flow === flow) &&
      "result" in data &&
      typeof data.result === "string"
  )
}

export function publishGitHubOAuthResult(message: GitHubOAuthMessage) {
  publishPopupResult(message, GITHUB_OAUTH_CHANNEL_NAME, GITHUB_OAUTH_STORAGE_KEY)
}

export function readGitHubOAuthPopupResult(
  popup: Window,
  flow: GitHubOAuthFlow
): GitHubOAuthMessage | null {
  try {
    const location = popup.location
    if (location.origin !== window.location.origin) {
      return null
    }

    const params = new URLSearchParams(location.search)
    if (flow === "login") {
      if (location.pathname === "/app" || location.pathname.startsWith("/app/")) {
        return { type: GITHUB_OAUTH_MESSAGE_TYPE, flow, result: "success" }
      }
      if (location.pathname === "/login") {
        if (params.get("oauth_2fa") === "github") {
          return { type: GITHUB_OAUTH_MESSAGE_TYPE, flow, result: "two_factor" }
        }
        const error = params.get("oauth_error")
        if (error) {
          return { type: GITHUB_OAUTH_MESSAGE_TYPE, flow, result: error }
        }
      }
      return null
    }

    if (location.pathname === "/settings/security") {
      const result = params.get("oauth_link")
      if (result) {
        return { type: GITHUB_OAUTH_MESSAGE_TYPE, flow, result }
      }
    }
  } catch {
    // Reading location is expected to fail while the popup is on github.com.
  }

  return null
}

export function subscribeGitHubOAuthResults(
  flow: GitHubOAuthFlow,
  getPopup: () => Window | null,
  handler: (message: GitHubOAuthMessage) => void
) {
  return subscribePopupResults(
    GITHUB_OAUTH_CHANNEL_NAME, GITHUB_OAUTH_STORAGE_KEY, getPopup,
    (data): data is GitHubOAuthMessage => isGitHubOAuthPayload(data, flow), handler
  )
}
