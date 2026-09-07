import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { isGitHubOAuthPopupWindow } from "./lib/github-oauth-popup"
import { GitHubOAuthComplete } from "./pages/auth/GitHubOAuthComplete"
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

const rootContent = isGitHubOAuthReturn() ? (
  <GitHubOAuthComplete />
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
