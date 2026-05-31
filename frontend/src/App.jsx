import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useSettingsStore } from './store';
import Layout from './components/common/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import AssetsPage from './pages/AssetsPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import TasksPage from './pages/TasksPage';
import MaintenancePage from './pages/MaintenancePage';
import AnalyticsPage from './pages/AnalyticsPage';
import MonitorsPage from './pages/MonitorsPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import ActivityPage from './pages/admin/ActivityPage';
import SettingsPage from './pages/admin/SettingsPage';
import AreasAdminPage from './pages/admin/AreasAdminPage';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

function ProtectedRoute({ children, allow }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allow && user && !allow.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { isAuthenticated, loadProfile } = useAuthStore();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
      fetchSettings();
    }
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a2332',
            color: '#f1f5f9',
            border: '1px solid rgba(99,179,237,0.15)',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/assets" element={
                    <ProtectedRoute allow={['operator', 'admin']}><AssetsPage /></ProtectedRoute>
                  } />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/reports/:id" element={<ReportDetailPage />} />
                  <Route path="/tasks" element={
                    <ProtectedRoute allow={['operator', 'taskforce', 'admin']}><TasksPage /></ProtectedRoute>
                  } />
                  <Route path="/maintenance" element={
                    <ProtectedRoute allow={['operator', 'taskforce', 'admin']}><MaintenancePage /></ProtectedRoute>
                  } />
                  <Route path="/monitors" element={
                    <ProtectedRoute allow={['operator', 'admin']}><MonitorsPage /></ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute allow={['operator', 'admin']}><AnalyticsPage /></ProtectedRoute>
                  } />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin/users" element={
                    <ProtectedRoute allow={['admin']}><UsersAdminPage /></ProtectedRoute>
                  } />
                  <Route path="/admin/activity" element={
                    <ProtectedRoute allow={['admin']}><ActivityPage /></ProtectedRoute>
                  } />
                  <Route path="/admin/areas" element={
                    <ProtectedRoute allow={['admin']}><AreasAdminPage /></ProtectedRoute>
                  } />
                  <Route path="/admin/settings" element={
                    <ProtectedRoute allow={['admin']}><SettingsPage /></ProtectedRoute>
                  } />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
