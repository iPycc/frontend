import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { isGoogleOAuthPopupWindow } from "./lib/google-oauth-popup"
import { isGitHubOAuthPopupWindow } from "./lib/github-oauth-popup"
import { GitHubOAuthComplete } from "./pages/auth/GitHubOAuthComplete"
import { GoogleOAuthComplete } from "./pages/auth/GoogleOAuthComplete"
import { AppStateProvider } from "./state/app"
import "./index.css"

function isGitHubOAuthReturn() {
  const { pathname, search } = window.location
  if (pathname === "/oauth/github/complete") {
    return true
  }
  if (!isGitHubOAuthPopupWindow()) {
    return false
  }

  const params = new URLSearchParams(search)
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    (pathname === "/login" && (params.has("oauth_error") || params.get("oauth_2fa") === "github")) ||
    (pathname === "/settings/security" && params.has("oauth_link"))
  )
}

function isGoogleOAuthReturn() {
  const { pathname, search } = window.location
  if (pathname === "/oauth/google/complete") {
    return true
  }
  if (!isGoogleOAuthPopupWindow()) {
    return false
  }

  const params = new URLSearchParams(search)
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    (pathname === "/login" && (params.has("google_oauth_error") || params.get("oauth_2fa") === "google")) ||
    (pathname === "/settings/security" && params.has("google_oauth_link"))
  )
}

const rootContent = isGitHubOAuthReturn() ? (
  <GitHubOAuthComplete />
) : isGoogleOAuthReturn() ? (
  <GoogleOAuthComplete />
) : (
  <AppStateProvider>
    <App />
  </AppStateProvider>
)

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {rootContent}
  </StrictMode>,
)
