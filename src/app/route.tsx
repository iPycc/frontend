import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { Boot } from "@/app/boot"
import { isProtected, ShareGuard } from "@/app/guard"
import { AudioPlayerProvider } from "@/components/audio/AudioPlayerProvider"
import { ShareLayout } from "@/components/share"
import { MainLayout } from "@/components/shared/MainLayout"
import { Toaster } from "@/components/ui/sonner"
import { useAppState } from "@/lib/app-state"
import { AppFiles } from "@/pages/AppFiles"
import { AuthLayout } from "@/pages/AuthLayout"
import { Buckets } from "@/pages/Buckets"
import { Discussions } from "@/pages/Discussions"
import { Login } from "@/pages/Login"
import { Mounts } from "@/pages/Mounts"
import { Offline } from "@/pages/Offline"
import { Recycle } from "@/pages/Recycle"
import { Register } from "@/pages/Register"
import { ShareDetail } from "@/pages/ShareDetail"
import { ShareNotFound } from "@/pages/ShareNotFound"
import { SharedWithMe } from "@/pages/SharedWithMe"
import { Shares } from "@/pages/Shares"
import { Store } from "@/pages/Store"
import { Tasks } from "@/pages/Tasks"
import { Guests } from "@/pages/admin/Guests"
import { System } from "@/pages/admin/System"
import { Users } from "@/pages/admin/Users"
import {
  PersonalizationSettingsPage,
  ProfileSettingsPage,
  SecuritySettingsPage,
  SettingsLayout,
  StorageSettingsPage,
  WebsiteSettingsPage,
} from "@/pages/settings"

export default function App() {
  const { authReady, authSession, currentUser, isAuthenticated } = useAppState()
  const isAdmin = currentUser?.role === "admin"
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/"

  if (!authReady && authSession && isProtected(currentPath)) {
    return (
      <>
        <Toaster position="bottom-center" richColors />
        <Boot />
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
            <Route
              path="website"
              element={
                isAdmin ? (
                  <WebsiteSettingsPage />
                ) : (
                  <Navigate to="/settings/profile" replace />
                )
              }
            />
          </Route>

          <Route path="/images" element={<AppFiles />} />

          <Route path="/admin/users" element={isAdmin ? <Users /> : <Navigate to="/app" replace />} />
          <Route path="/admin/guests" element={isAdmin ? <Guests /> : <Navigate to="/app" replace />} />
          <Route path="/admin/system" element={isAdmin ? <System /> : <Navigate to="/app" replace />} />
        </Route>

        <Route element={<ShareGuard />}>
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
