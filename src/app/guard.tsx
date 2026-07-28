import { Navigate } from "react-router-dom"

import { ShareLayout } from "@/components/share"
import { useAppState } from "@/lib/app-state"

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
  const { authReady, isAuthenticated } = useAppState()
  if (!authReady) {
    return null
  }
  return isAuthenticated ? <ShareLayout /> : <Navigate to="/login" replace />
}
