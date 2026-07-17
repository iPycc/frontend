import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom"

import { MainLayout } from "./components/shared/MainLayout"
import { ShareLayout } from "./components/share"
import { Skeleton } from "./components/ui/skeleton"
import { Toaster } from "./components/ui/sonner"
import { AudioPlayerProvider } from "./components/audio/AudioPlayerProvider"
import { useAppState } from "./lib/app-state"
import { AppFiles } from "./pages/AppFiles"
import { AuthLayout } from "./pages/AuthLayout"
import { Buckets } from "./pages/Buckets"
import { Discussions } from "./pages/Discussions"
import { Mounts } from "./pages/Mounts"
import { Offline } from "./pages/Offline"
import { Recycle } from "./pages/Recycle"
import { ShareDetail } from "./pages/ShareDetail"
import { ShareNotFound } from "./pages/ShareNotFound"
import { Shares } from "./pages/Shares"
import { SharedWithMe } from "./pages/SharedWithMe"
import { Store } from "./pages/Store"
import { Tasks } from "./pages/Tasks"
import { Guests } from "./pages/admin/Guests"
import { System } from "./pages/admin/System"
import { Users } from "./pages/admin/Users"
import { Login } from "./pages/Login"
import { Register } from "./pages/Register"
import {
  PersonalizationSettingsPage,
  ProfileSettingsPage,
  SecuritySettingsPage,
  SettingsLayout,
  StorageSettingsPage,
  WebsiteSettingsPage,
} from "./pages/settings"

function isProtectedPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/share" ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/images")
  )
}

function ProtectedShareLayout() {
  const { authReady, isAuthenticated } = useAppState()
  if (!authReady) {
    return null
  }
  return isAuthenticated ? <ShareLayout /> : <Navigate to="/login" replace />
}

function AppBootstrapShell() {
  return (
    <div className="app-shell flex h-screen w-full overflow-hidden text-foreground">
      <aside className="hidden h-full w-64 border-r border-border/60 bg-background/95 p-4 md:flex md:flex-col md:gap-4">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-11/12 rounded-xl" />
          <Skeleton className="h-9 w-10/12 rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
        <div className="mt-auto space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/60 bg-background/95 px-3 py-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-xl md:hidden" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 overflow-hidden px-1 pb-2 sm:px-2 sm:pb-3 md:px-4 md:pb-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-border/50 bg-background/70 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { authReady, authSession, currentUser, isAuthenticated } = useAppState()
  const isAdmin = currentUser?.role === "admin"
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/"

  if (!authReady && authSession && isProtectedPath(currentPath)) {
    return (
      <>
        <Toaster position="bottom-center" richColors />
        <AppBootstrapShell />
      </>
    )
  }

  return (
    <BrowserRouter>
      <AudioPlayerProvider>
        <Toaster position="bottom-center" richColors />
        <Routes>
        <Route
          path="/"
          element={authReady ? <Navigate to={isAuthenticated ? "/app" : "/login"} replace /> : null}
        />

        <Route
          element={
            !authReady ? null : isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />
          }
        >
          <Route path="/app" element={<AppFiles />} />
          <Route path="/app/buckets" element={<Buckets />} />
          <Route path="/app/recycle" element={<Recycle />} />
          <Route path="/app/tasks" element={<Tasks />} />
          <Route path="/app/shared-with-me" element={<SharedWithMe />} />
          <Route path="/app/mounts" element={<Mounts />} />
          <Route path="/app/offline" element={<Offline />} />
          <Route path="/app/store" element={<Store />} />
          <Route path="/app/discussions" element={<Discussions />} />

          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route
              path="personalization"
              element={<PersonalizationSettingsPage />}
            />
            <Route path="security" element={<SecuritySettingsPage />} />
            <Route path="storage" element={<StorageSettingsPage />} />
            <Route path="website" element={<WebsiteSettingsPage />} />
          </Route>

          <Route path="/images" element={<AppFiles />} />

          <Route path="/admin/users" element={isAdmin ? <Users /> : <Navigate to="/app" replace />} />
          <Route path="/admin/guests" element={isAdmin ? <Guests /> : <Navigate to="/app" replace />} />
          <Route path="/admin/system" element={isAdmin ? <System /> : <Navigate to="/app" replace />} />
        </Route>

        <Route element={<ProtectedShareLayout />}>
          <Route path="/share" element={<Shares />} />
        </Route>

        <Route element={<ShareLayout />}>
          <Route path="/share/:slug" element={<ShareDetail />} />
          <Route path="/share/*" element={<ShareNotFound />} />
        </Route>

        <Route
          element={
            !authReady ? null : isAuthenticated ? <Navigate to="/app" replace /> : <AuthLayout />
          }
        >
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup" element={<Navigate to="/register" replace />} />
        </Route>
        </Routes>
      </AudioPlayerProvider>
    </BrowserRouter>
  )
}
