import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Files from './pages/Files';
import Storage from './pages/Storage';
import Settings from './pages/Settings';
import Shares from './pages/Shares';
import AdminUsers from './pages/admin/Users';
import SharePreview from './pages/SharePreview';
import { ColorModeProvider } from './contexts/ColorModeContext';
import CssBaseline from '@mui/material/CssBaseline';
import { NotificationProvider } from './contexts/NotificationContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role !== 'admin') return <Navigate to="/files" />;
  return <>{children}</>;
}

function App() {
  return (
    <ColorModeProvider>
      <CssBaseline />
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/share" element={<SharePreview />} />
          <Route path="/s/:token" element={<SharePreview />} />
          <Route path="/v1/s/:token" element={<SharePreview />} />
          
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/files" replace />} />
            <Route path="files" element={<Files />} />
            <Route path="files/:folderId" element={<Files />} />
            <Route path="storage" element={<Storage />} />
            <Route path="shares" element={<Shares />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />
          </Route>
        </Routes>
      </NotificationProvider>
    </ColorModeProvider>
  );
}

export default App;
