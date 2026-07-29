import { Navigate } from "react-router-dom"

import { ShareLayout } from "@/components/share/ShareLayout"
import { useAuthState } from "@/state/app"

export function ShareGuard() {
  const { authReady, isAuthenticated } = useAuthState()
  if (!authReady) {
    return null
  }
  return isAuthenticated ? <ShareLayout /> : <Navigate to="/login" replace />
}
