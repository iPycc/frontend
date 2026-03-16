import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { MainLayout } from "@/components/shared"
import { useAppState } from "@/lib/app-state"
import { AppFiles } from "@/pages/AppFiles"
import { AuthLayout } from "@/pages/AuthLayout"
import { Buckets } from "@/pages/Buckets"
import { Discussions } from "@/pages/Discussions"
import { Mounts } from "@/pages/Mounts"
import { Offline } from "@/pages/Offline"
import { Recycle } from "@/pages/Recycle"
import { Shares } from "@/pages/Shares"
import { SharedWithMe } from "@/pages/SharedWithMe"
import { Store } from "@/pages/Store"
import { Tasks } from "@/pages/Tasks"
import { Guests } from "@/pages/admin/Guests"
import { System } from "@/pages/admin/System"
import { Users } from "@/pages/admin/Users"
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import {
  PersonalizationSettingsPage,
  ProfileSettingsPage,
  SecuritySettingsPage,
  SettingsLayout,
  StorageSettingsPage,
} from "@/pages/settings"

export default function App() {
  const { isAuthenticated } = useAppState()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/app" : "/login"} replace />}
        />

        <Route
          element={
            isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />
          }
        >
          <Route path="/app" element={<AppFiles />} />
          <Route path="/app/buckets" element={<Buckets />} />
          <Route path="/app/shares" element={<Shares />} />
          <Route path="/app/recycle" element={<Recycle />} />
          <Route path="/app/tasks" element={<Tasks />} />
          <Route path="/app/shared-with-me" element={<SharedWithMe />} />
          <Route path="/app/mounts" element={<Mounts />} />
          <Route path="/app/offline" element={<Offline />} />
          <Route path="/app/store" element={<Store />} />
          <Route path="/app/discussions" element={<Discussions />} />
          <Route path="/app/*" element={<AppFiles />} />

          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route
              path="personalization"
              element={<PersonalizationSettingsPage />}
            />
            <Route path="security" element={<SecuritySettingsPage />} />
            <Route path="storage" element={<StorageSettingsPage />} />
          </Route>

          <Route path="/images" element={<AppFiles />} />

          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/guests" element={<Guests />} />
          <Route path="/admin/system" element={<System />} />
        </Route>

        <Route
          element={
            isAuthenticated ? <Navigate to="/app" replace /> : <AuthLayout />
          }
        >
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup" element={<Navigate to="/register" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
