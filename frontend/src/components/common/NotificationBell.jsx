import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import { useAuthStore } from '../../store';

export default function NotificationBell() {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const ref = useRef(null);

  const fetchAll = async () => {
    try {
      const [{ data: list }, { data: cnt }] = await Promise.all([
        notificationsAPI.list(),
        notificationsAPI.unreadCount(),
      ]);
      setItems((list.results || list).slice(0, 10));
      setUnread(cnt.unread || 0);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!isAuth) return;
    fetchAll();
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [isAuth]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleClick = async (n) => {
    if (!n.is_read) {
      try {
        await notificationsAPI.markRead(n.id);
        setUnread((c) => Math.max(0, c - 1));
      } catch { /* ignore */ }
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await notificationsAPI.markAllRead();
      setUnread(0);
      setItems((arr) => arr.map((n) => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  if (!isAuth) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="btn btn-sm btn-secondary"
        onClick={() => setOpen((o) => !o)}
        title="Thông báo"
        style={{ position: 'relative' }}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--accent-red)', color: 'white',
            borderRadius: '50%', minWidth: 18, height: 18, padding: '0 4px',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360, maxHeight: 480, overflowY: 'auto',
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-card)',
          zIndex: 100, padding: 8,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', borderBottom: '1px solid var(--border-color)',
          }}>
            <strong>Thông báo</strong>
            <button onClick={markAll} className="btn btn-sm btn-secondary" title="Đánh dấu tất cả là đã đọc">
              <CheckCheck size={12} /> Đọc hết
            </button>
          </div>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Không có thông báo
            </div>
          ) : items.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', marginBottom: 4,
                background: n.is_read ? 'transparent' : 'rgba(59,130,246,0.06)',
                borderLeft: n.is_read ? 'none' : '3px solid var(--accent-blue)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
              {n.message && (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {n.message}
                </div>
              )}
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {new Date(n.created_at).toLocaleString('vi')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
