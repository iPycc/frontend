import * as React from "react"

import { GoogleIcon } from "@/components/icons/google-icon"
import { Spinner } from "@/components/ui/spinner"
import {
  readGoogleOAuthCompletion,
  publishGoogleOAuthResult,
  type GoogleOAuthFlow,
} from "@/lib/google-oauth-popup"

function getFallbackUrl(flow: GoogleOAuthFlow, result: string) {
  if (flow === "test") {
    return `/settings/security?google_oauth_test=${encodeURIComponent(result)}`
  }
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

export function GoogleOAuthComplete() {
  const message = React.useMemo(() => readGoogleOAuthCompletion(window.location), [])
  const { flow, result } = message

  React.useEffect(() => {
    publishGoogleOAuthResult(message)
    const completionTimer = window.setTimeout(() => {
      window.close()
      if (!window.closed) {
        window.location.replace(getFallbackUrl(flow, result))
      }
    }, 120)

    return () => window.clearTimeout(completionTimer)
  }, [flow, result, message])

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
