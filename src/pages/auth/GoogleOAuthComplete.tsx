import * as React from "react"

import { GoogleIcon } from "@/components/icons/google-icon"
import { Spinner } from "@/components/ui/spinner"
import {
  GOOGLE_OAUTH_MESSAGE_TYPE,
  publishGoogleOAuthResult,
  type GoogleOAuthFlow,
  type GoogleOAuthMessage,
} from "@/lib/google-oauth-popup"

function getFallbackUrl(flow: GoogleOAuthFlow, result: string) {
  if (flow === "link") {
    return `/settings/security?google_oauth_link=${encodeURIComponent(result)}`
  }
  if (result === "success") {
    return "/app"
  }
  if (result === "two_factor") {
    return "/login?oauth_2fa=google"
  }
  return `/login?google_oauth_error=${encodeURIComponent(result)}`
}

function readOAuthResult() {
  const params = new URLSearchParams(window.location.search)

  if (window.location.pathname === "/app" || window.location.pathname.startsWith("/app/")) {
    return { flow: "login" as const, result: "success" }
  }
  if (window.location.pathname === "/login") {
    if (params.get("oauth_2fa") === "google") {
      return { flow: "login" as const, result: "two_factor" }
    }
    return { flow: "login" as const, result: params.get("google_oauth_error") || "provider_error" }
  }
  if (window.location.pathname === "/settings/security") {
    return { flow: "link" as const, result: params.get("google_oauth_link") || "provider_error" }
  }

  return {
    flow: params.get("flow") === "link" ? "link" as const : "login" as const,
    result: params.get("result") || "provider_error",
  }
}

export function GoogleOAuthComplete() {
  const { flow, result } = React.useMemo(readOAuthResult, [])

  React.useEffect(() => {
    const message: GoogleOAuthMessage = {
      type: GOOGLE_OAUTH_MESSAGE_TYPE,
      flow,
      result,
    }

    publishGoogleOAuthResult(message)
    const completionTimer = window.setTimeout(() => {
      window.close()
      if (!window.closed) {
        window.location.replace(getFallbackUrl(flow, result))
      }
    }, 120)

    return () => window.clearTimeout(completionTimer)
  }, [flow, result])

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-background text-foreground">
          <GoogleIcon className="size-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Spinner />
          正在完成 Google 授权...
        </div>
        <p className="text-sm text-muted-foreground">授权窗口将自动关闭。</p>
      </div>
    </main>
  )
}
