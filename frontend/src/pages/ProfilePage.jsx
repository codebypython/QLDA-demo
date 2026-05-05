import { useEffect, useState } from 'react';
import { useAuthStore } from '../store';
import { authAPI, reportsAPI } from '../services/api';
import { Save, Lock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, loadProfile } = useAuthStore();
  const [form, setForm] = useState({ full_name: '', phone: '', username: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [pwd, setPwd] = useState({ old_password: '', new_password: '', new_password_confirm: '' });
  const [myReports, setMyReports] = useState([]);

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        username: user.username || '',
      });
    }
    if (user?.role === 'citizen') {
      reportsAPI.list().then(({ data }) => setMyReports(data.results || data)).catch(() => {});
    }
  }, [user?.id]);

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (avatarFile) payload.avatar = avatarFile;
      await authAPI.updateProfile(payload);
      await loadProfile();
      toast.success('Cập nhật hồ sơ thành công');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi cập nhật');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.new_password !== pwd.new_password_confirm) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    try {
      await authAPI.changePassword(pwd.old_password, pwd.new_password);
      toast.success('Đổi mật khẩu thành công');
      setPwd({ old_password: '', new_password: '', new_password_confirm: '' });
    } catch (err) {
      const data = err.response?.data || {};
      toast.error(Object.values(data).flat().join(', ') || 'Lỗi đổi mật khẩu');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 16 }}>Thông tin cá nhân</h3>
        <form onSubmit={saveProfile}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" value={user?.email || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Họ tên</label>
            <input className="form-input" value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Số điện thoại</label>
            <input className="form-input" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Vai trò</label>
            <input className="form-input" value={user?.role || ''} disabled />
          </div>
          <div className="form-group">
            <label className="form-label">Ảnh đại diện</label>
            <input type="file" accept="image/*" className="form-input"
              onChange={(e) => setAvatarFile(e.target.files[0])} />
            {user?.avatar && (
              <img src={user.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', marginTop: 8 }} />
            )}
          </div>
          <button type="submit" className="btn btn-primary"><Save size={14} /> Lưu</button>
        </form>
      </div>

      <div>
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="card-title" style={{ marginBottom: 16 }}>Đổi mật khẩu</h3>
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label className="form-label">Mật khẩu hiện tại</label>
              <input className="form-input" type="password" required
                value={pwd.old_password} onChange={(e) => setPwd({ ...pwd, old_password: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Mật khẩu mới</label>
              <input className="form-input" type="password" required
                value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Nhập lại</label>
              <input className="form-input" type="password" required
                value={pwd.new_password_confirm} onChange={(e) => setPwd({ ...pwd, new_password_confirm: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary"><Lock size={14} /> Đổi mật khẩu</button>
          </form>
        </div>

        {user?.role === 'citizen' && (
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: 12 }}>
              <AlertTriangle size={16} style={{ verticalAlign: -2 }} /> Báo cáo của tôi ({myReports.length})
            </h3>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {myReports.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Bạn chưa có báo cáo nào</p>
              ) : myReports.map((r) => (
                <div key={r.id} style={{
                  padding: 10, borderBottom: '1px solid var(--border-color)',
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600 }}>{r.incident_type_display}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {r.status_display} — {new Date(r.created_at).toLocaleString('vi')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
