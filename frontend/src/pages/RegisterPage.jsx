import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '', username: '', full_name: '',
    password: '', password_confirm: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.password_confirm) {
      toast.error('Mật khẩu không khớp');
      return;
    }
    setLoading(true);
    try {
      await authAPI.register(form);
      toast.success('Đăng ký thành công, vui lòng đăng nhập');
      navigate('/login');
    } catch (err) {
      const data = err.response?.data || {};
      const msg = Object.values(data).flat().join(', ') || 'Lỗi đăng ký';
      toast.error(msg);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card animate-fade">
        <div className="login-title">
          <div style={{
            width: 56, height: 56, margin: '0 auto 16px',
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)',
          }}>
            <Shield size={28} color="white" />
          </div>
          <h2>Đăng ký công dân</h2>
          <p>Tạo tài khoản InfraWatch để báo cáo sự cố hạ tầng</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" required
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Họ tên</label>
            <input className="form-input"
              value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input className="form-input" type="password" required
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Nhập lại mật khẩu</label>
            <input className="form-input" type="password" required
              value={form.password_confirm} onChange={(e) => setForm({ ...form, password_confirm: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}>
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          Đã có tài khoản? <Link to="/login" style={{ color: 'var(--accent-cyan)' }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
