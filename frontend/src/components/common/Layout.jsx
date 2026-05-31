import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import {
  LayoutDashboard, Map, Package, AlertTriangle,
  ClipboardList, LogOut, Shield, Wrench, BarChart3,
  Users, Activity, Settings, User as UserIcon,
  MapPinned,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const ALL_NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan', section: 'dashboard', roles: ['citizen', 'operator', 'taskforce', 'admin'] },
  { to: '/map', icon: Map, label: 'Bản đồ GIS', section: 'dashboard', roles: ['citizen', 'operator', 'taskforce', 'admin'] },
  { to: '/assets', icon: Package, label: 'Tài sản hạ tầng', section: 'quản lý', roles: ['operator', 'admin'] },
  { to: '/reports', icon: AlertTriangle, label: 'Báo cáo sự cố', section: 'quản lý', roles: ['citizen', 'operator', 'taskforce', 'admin'] },
  { to: '/tasks', icon: ClipboardList, label: 'Tác vụ', section: 'quản lý', roles: ['operator', 'taskforce', 'admin'] },
  { to: '/maintenance', icon: Wrench, label: 'Bảo trì', section: 'quản lý', roles: ['operator', 'taskforce', 'admin'] },
  { to: '/analytics', icon: BarChart3, label: 'Phân tích', section: 'quản lý', roles: ['operator', 'admin'] },
  { to: '/admin/areas', icon: MapPinned, label: 'Khu vực', section: 'quản trị', roles: ['admin'] },
  { to: '/admin/users', icon: Users, label: 'Người dùng', section: 'quản trị', roles: ['admin'] },
  { to: '/admin/activity', icon: Activity, label: 'Hoạt động', section: 'quản trị', roles: ['admin'] },
  { to: '/admin/settings', icon: Settings, label: 'Cài đặt', section: 'quản trị', roles: ['admin'] },
  { to: '/profile', icon: UserIcon, label: 'Hồ sơ', section: 'cá nhân', roles: ['citizen', 'operator', 'taskforce', 'admin'] },
];

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const role = user?.role || 'citizen';
  const navItems = ALL_NAV_ITEMS.filter((n) => n.roles.includes(role));

  const pageTitle = navItems.find((n) => n.to === location.pathname)?.label
    || (location.pathname.startsWith('/reports/') ? 'Chi tiết báo cáo' : 'InfraWatch');

  let lastSection = '';

  return (
    <div className="app-layout">
      <aside className="sidebar animate-slide">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Shield size={22} color="white" />
            </div>
            <div>
              <h1>InfraWatch</h1>
              <p>Quản lý Hạ tầng — Đà Nẵng</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const showSection = item.section !== lastSection;
            lastSection = item.section;
            return (
              <div key={item.to}>
                {showSection && (
                  <div className="nav-section-label">{item.section}</div>
                )}
                <NavLink
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  end={item.to === '/'}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div style={{
          padding: '16px 12px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {user?.full_name || user?.email || 'User'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {user?.role || 'citizen'}
            </div>
          </div>
          <button
            onClick={logout}
            className="btn btn-sm btn-secondary"
            title="Đăng xuất"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-bar">
          <h2 className="top-bar-title">{pageTitle}</h2>
          <div className="top-bar-actions" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <NotificationBell />
            <span className="badge badge-green">● Online</span>
          </div>
        </header>
        <div className="page-content animate-fade">
          {children}
        </div>
      </div>
    </div>
  );
}
