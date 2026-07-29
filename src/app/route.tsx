import * as React from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { Boot } from "@/app/boot"
import { isProtected, ShareGuard } from "@/app/guard"
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider"
import { Toaster } from "@/components/ui/sonner"
import { useAuthState } from "@/state/app"

function lazyNamed<T extends React.ComponentType<any>>(
  loader: () => Promise<Record<string, T>>,
  name: string
) {
  return React.lazy(async () => ({ default: (await loader())[name] }))
}

const MainLayout = lazyNamed(() => import("@/components/shared/MainLayout"), "MainLayout")
const ShareLayout = lazyNamed(() => import("@/components/share"), "ShareLayout")
const AppFiles = lazyNamed(() => import("@/pages/AppFiles"), "AppFiles")
const AuthLayout = lazyNamed(() => import("@/pages/AuthLayout"), "AuthLayout")
const Buckets = lazyNamed(() => import("@/pages/Buckets"), "Buckets")
const Discussions = lazyNamed(() => import("@/pages/Discussions"), "Discussions")
const Login = lazyNamed(() => import("@/pages/Login"), "Login")
const Mounts = lazyNamed(() => import("@/pages/Mounts"), "Mounts")
const Offline = lazyNamed(() => import("@/pages/Offline"), "Offline")
const Recycle = lazyNamed(() => import("@/pages/Recycle"), "Recycle")
const Register = lazyNamed(() => import("@/pages/Register"), "Register")
const ShareDetail = lazyNamed(() => import("@/pages/ShareDetail"), "ShareDetail")
const ShareNotFound = lazyNamed(() => import("@/pages/ShareNotFound"), "ShareNotFound")
const SharedWithMe = lazyNamed(() => import("@/pages/SharedWithMe"), "SharedWithMe")
const Shares = lazyNamed(() => import("@/pages/Shares"), "Shares")
const Store = lazyNamed(() => import("@/pages/Store"), "Store")
const Tasks = lazyNamed(() => import("@/pages/Tasks"), "Tasks")
const Guests = lazyNamed(() => import("@/pages/admin/Guests"), "Guests")
const System = lazyNamed(() => import("@/pages/admin/System"), "System")
const Users = lazyNamed(() => import("@/pages/admin/Users"), "Users")
const SettingsLayout = lazyNamed(() => import("@/pages/settings/SettingsLayout"), "SettingsLayout")
const ProfileSettingsPage = lazyNamed(() => import("@/pages/settings/ProfileSettingsPage"), "ProfileSettingsPage")
const PersonalizationSettingsPage = lazyNamed(() => import("@/pages/settings/PersonalizationSettingsPage"), "PersonalizationSettingsPage")
const SecuritySettingsPage = lazyNamed(() => import("@/pages/settings/SecuritySettingsPage"), "SecuritySettingsPage")
const StorageSettingsPage = lazyNamed(() => import("@/pages/settings/StorageSettingsPage"), "StorageSettingsPage")
const WebsiteSettingsPage = lazyNamed(() => import("@/pages/settings/WebsiteSettingsPage"), "WebsiteSettingsPage")

function RouteFallback() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">正在加载…</div>
}

export default function App() {
  const { authReady, authSession, currentUser, isAuthenticated } = useAuthState()
  const isAdmin = currentUser?.role === "admin"
  const isGuest = currentUser?.role === "guest"
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/"

  if (!authReady && authSession && isProtected(currentPath)) {
    return <><Toaster position="bottom-center" richColors /><Boot /></>
  }

  const guestRestricted = (element: React.ReactNode) => isGuest ? <Navigate to="/app" replace /> : element

  return (
    <BrowserRouter>
      <AudioPlayerProvider>
        <Toaster position="bottom-center" richColors />
        <React.Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={authReady ? <Navigate to={isAuthenticated ? "/app" : "/login"} replace /> : null} />
            <Route element={!authReady ? null : isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}>
              <Route path="/app" element={<AppFiles />} />
              <Route path="/app/buckets" element={guestRestricted(<Buckets />)} />
              <Route path="/app/recycle" element={<Recycle />} />
              <Route path="/app/tasks" element={guestRestricted(<Tasks />)} />
              <Route path="/app/shared-with-me" element={guestRestricted(<SharedWithMe />)} />
              <Route path="/app/mounts" element={guestRestricted(<Mounts />)} />
              <Route path="/app/offline" element={guestRestricted(<Offline />)} />
              <Route path="/app/store" element={guestRestricted(<Store />)} />
              <Route path="/app/discussions" element={guestRestricted(<Discussions />)} />

              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to={isGuest ? "/settings/security" : "/settings/profile"} replace />} />
                <Route path="profile" element={isGuest ? <Navigate to="/settings/security" replace /> : <ProfileSettingsPage />} />
                <Route path="personalization" element={isGuest ? <Navigate to="/settings/security" replace /> : <PersonalizationSettingsPage />} />
                <Route path="security" element={<SecuritySettingsPage />} />
                <Route path="storage" element={isGuest ? <Navigate to="/settings/security" replace /> : <StorageSettingsPage />} />
                <Route path="website" element={isAdmin ? <WebsiteSettingsPage /> : <Navigate to={isGuest ? "/settings/security" : "/settings/profile"} replace />} />
              </Route>

              <Route path="/images" element={<AppFiles />} />
              <Route path="/admin/users" element={isAdmin ? <Users /> : <Navigate to="/app" replace />} />
              <Route path="/admin/guests" element={isAdmin ? <Guests /> : <Navigate to="/app" replace />} />
              <Route path="/admin/system" element={isAdmin ? <System /> : <Navigate to="/app" replace />} />
            </Route>

            <Route element={<ShareGuard />}><Route path="/share" element={isGuest ? <Navigate to="/app" replace /> : <Shares />} /></Route>
            <Route element={<ShareLayout />}><Route path="/share/:slug" element={<ShareDetail />} /><Route path="/share/*" element={<ShareNotFound />} /></Route>
            <Route element={!authReady ? null : isAuthenticated ? <Navigate to="/app" replace /> : <AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/setup" element={<Navigate to="/register" replace />} />
            </Route>
          </Routes>
        </React.Suspense>
      </AudioPlayerProvider>
    </BrowserRouter>
  )
}
