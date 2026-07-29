import * as React from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { ShareGuard } from "@/app/guard"
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider"
import { ShareLayout } from "@/components/share"
import { MainLayout } from "@/components/shared/MainLayout"
import { Toaster } from "@/components/ui/sonner"
import { AuthLayout } from "@/pages/AuthLayout"
import { AppFiles } from "@/pages/AppFiles"
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import { SettingsLayout } from "@/pages/settings/SettingsLayout"
import { useAuthState } from "@/state/app"

function lazyNamed<T extends React.ComponentType<any>>(
  loader: () => Promise<Record<string, T>>,
  name: string
) {
  return React.lazy(async () => ({ default: (await loader())[name] }))
}

const Buckets = lazyNamed(() => import("@/pages/Buckets"), "Buckets")
const Discussions = lazyNamed(() => import("@/pages/Discussions"), "Discussions")
const Mounts = lazyNamed(() => import("@/pages/Mounts"), "Mounts")
const Offline = lazyNamed(() => import("@/pages/Offline"), "Offline")
const Recycle = lazyNamed(() => import("@/pages/Recycle"), "Recycle")
const ShareDetail = lazyNamed(() => import("@/pages/ShareDetail"), "ShareDetail")
const ShareNotFound = lazyNamed(() => import("@/pages/ShareNotFound"), "ShareNotFound")
const SharedWithMe = lazyNamed(() => import("@/pages/SharedWithMe"), "SharedWithMe")
const Shares = lazyNamed(() => import("@/pages/Shares"), "Shares")
const Store = lazyNamed(() => import("@/pages/Store"), "Store")
const Tasks = lazyNamed(() => import("@/pages/Tasks"), "Tasks")
const Guests = lazyNamed(() => import("@/pages/admin/Guests"), "Guests")
const System = lazyNamed(() => import("@/pages/admin/System"), "System")
const Users = lazyNamed(() => import("@/pages/admin/Users"), "Users")
const ProfileSettingsPage = lazyNamed(() => import("@/pages/settings/ProfileSettingsPage"), "ProfileSettingsPage")
const PersonalizationSettingsPage = lazyNamed(() => import("@/pages/settings/PersonalizationSettingsPage"), "PersonalizationSettingsPage")
const SecuritySettingsPage = lazyNamed(() => import("@/pages/settings/SecuritySettingsPage"), "SecuritySettingsPage")
const StorageSettingsPage = lazyNamed(() => import("@/pages/settings/StorageSettingsPage"), "StorageSettingsPage")
const WebsiteSettingsPage = lazyNamed(() => import("@/pages/settings/WebsiteSettingsPage"), "WebsiteSettingsPage")

function Deferred({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={null}>{children}</React.Suspense>
}

export default function App() {
  const { authReady, authSession, currentUser, isAuthenticated } = useAuthState()
  const isAdmin = currentUser?.role === "admin"
  const isGuest = currentUser?.role === "guest"
  const hasSession = isAuthenticated || Boolean(authSession)

  const guestRestricted = (element: React.ReactNode) => isGuest
    ? <Navigate to="/app" replace />
    : <Deferred>{element}</Deferred>

  return (
    <BrowserRouter>
      <AudioPlayerProvider>
        <Toaster position="bottom-center" richColors />
        <Routes>
            <Route path="/" element={<Navigate to={hasSession ? "/app" : "/login"} replace />} />
            <Route element={!authReady || hasSession ? <MainLayout /> : <Navigate to="/login" replace />}>
              <Route path="/app" element={<AppFiles />} />
              <Route path="/app/buckets" element={guestRestricted(<Buckets />)} />
              <Route path="/app/recycle" element={<Deferred><Recycle /></Deferred>} />
              <Route path="/app/tasks" element={guestRestricted(<Tasks />)} />
              <Route path="/app/shared-with-me" element={guestRestricted(<SharedWithMe />)} />
              <Route path="/app/mounts" element={guestRestricted(<Mounts />)} />
              <Route path="/app/offline" element={guestRestricted(<Offline />)} />
              <Route path="/app/store" element={guestRestricted(<Store />)} />
              <Route path="/app/discussions" element={guestRestricted(<Discussions />)} />

              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to={isGuest ? "/settings/security" : "/settings/profile"} replace />} />
                <Route path="profile" element={isGuest ? <Navigate to="/settings/security" replace /> : <Deferred><ProfileSettingsPage /></Deferred>} />
                <Route path="personalization" element={isGuest ? <Navigate to="/settings/security" replace /> : <Deferred><PersonalizationSettingsPage /></Deferred>} />
                <Route path="security" element={<Deferred><SecuritySettingsPage /></Deferred>} />
                <Route path="storage" element={isGuest ? <Navigate to="/settings/security" replace /> : <Deferred><StorageSettingsPage /></Deferred>} />
                <Route path="website" element={isAdmin ? <Deferred><WebsiteSettingsPage /></Deferred> : <Navigate to={isGuest ? "/settings/security" : "/settings/profile"} replace />} />
              </Route>

              <Route path="/images" element={<AppFiles />} />
              <Route path="/admin/users" element={isAdmin ? <Deferred><Users /></Deferred> : <Navigate to="/app" replace />} />
              <Route path="/admin/guests" element={isAdmin ? <Deferred><Guests /></Deferred> : <Navigate to="/app" replace />} />
              <Route path="/admin/system" element={isAdmin ? <Deferred><System /></Deferred> : <Navigate to="/app" replace />} />
            </Route>

            <Route element={<ShareGuard />}><Route path="/share" element={isGuest ? <Navigate to="/app" replace /> : <Deferred><Shares /></Deferred>} /></Route>
            <Route element={<ShareLayout />}><Route path="/share/:slug" element={<Deferred><ShareDetail /></Deferred>} /><Route path="/share/*" element={<Deferred><ShareNotFound /></Deferred>} /></Route>
            <Route element={hasSession ? <Navigate to="/app" replace /> : <AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/setup" element={<Navigate to="/register" replace />} />
            </Route>
          </Routes>
      </AudioPlayerProvider>
    </BrowserRouter>
  )
}
