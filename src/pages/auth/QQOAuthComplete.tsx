import * as React from "react"

import { QQIcon } from "@/components/icons/qq-icon"
import { Spinner } from "@/components/ui/spinner"
import {
  publishQQOAuthResult,
  QQ_OAUTH_MESSAGE_TYPE,
  type QQOAuthFlow,
  type QQOAuthMessage,
} from "@/lib/qq-oauth-popup"

function getFallbackUrl(flow: QQOAuthFlow, result: string) {
  if (flow === "link") return `/settings/security?qq_oauth_link=${encodeURIComponent(result)}`
  if (result === "success") return "/app"
  if (result === "two_factor") return "/login?oauth_2fa=qq"
  return `/login?qq_oauth_error=${encodeURIComponent(result)}`
}

function readOAuthResult() {
  const params = new URLSearchParams(window.location.search)
  return {
    flow: params.get("flow") === "link" ? "link" as const : "login" as const,
    result: params.get("result") || "provider_error",
  }
}

export function QQOAuthComplete() {
  const { flow, result } = React.useMemo(readOAuthResult, [])
  React.useEffect(() => {
    const message: QQOAuthMessage = { type: QQ_OAUTH_MESSAGE_TYPE, flow, result }
    publishQQOAuthResult(message)
    const timer = window.setTimeout(() => {
      window.close()
      if (!window.closed) window.location.replace(getFallbackUrl(flow, result))
    }, 120)
    return () => window.clearTimeout(timer)
  }, [flow, result])

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-background text-[#12B7F5]">
          <QQIcon className="size-7" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Spinner />
          正在完成 QQ 授权...
        </div>
        <p className="text-sm text-muted-foreground">授权窗口将自动关闭。</p>
      </div>
    </main>
  )
}
