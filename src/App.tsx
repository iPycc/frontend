import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/MainLayout";
import { AppFiles } from "./pages/AppFiles";
import {
  Buckets,
  Shares,
  Recycle,
  Tasks,
  Profile,
  Users,
  Guests,
  System,
  SharedWithMe,
  Mounts,
  Offline,
  Store,
  Discussions
} from "./pages/Placeholders";
import { Login } from "./pages/Login";
import { Setup } from "./pages/Setup";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />

        <Route element={<MainLayout />}>
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

          <Route path="/settings/profile" element={<Profile />} />

          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/guests" element={<Guests />} />
          <Route path="/admin/system" element={<System />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<Setup />} />
      </Routes>
    </BrowserRouter>
  );
}
