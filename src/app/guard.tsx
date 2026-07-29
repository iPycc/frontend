import { Navigate } from "react-router-dom"

import * as React from "react"
import { useAuthState } from "@/state/app"

const ShareLayout = React.lazy(async () => ({ default: (await import("@/components/share/ShareLayout")).ShareLayout }))

export function isProtected(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/share" ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/images")
  )
}

export function ShareGuard() {
  const { authReady, isAuthenticated } = useAuthState()
  if (!authReady) {
    return null
  }
  return isAuthenticated ? <React.Suspense fallback={null}><ShareLayout /></React.Suspense> : <Navigate to="/login" replace />
}
