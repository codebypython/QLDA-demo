import { useState } from 'react';
import { useAuthStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@infra.local');
  const [password, setPassword] = useState('admin123456');
  const [showPw, setShowPw] = useState(false);
  
  // Validation States
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });

  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const validateField = (name, value) => {
    let errMsg = '';
    if (name === 'email') {
      if (!value) {
        errMsg = 'Email không được để trống';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errMsg = 'Định dạng email không hợp lệ (ví dụ: name@domain.com)';
      }
    } else if (name === 'password') {
      if (!value) {
        errMsg = 'Mật khẩu không được để trống';
      } else if (value.length < 6) {
        errMsg = 'Mật khẩu phải dài tối thiểu 6 ký tự';
      }
    }
    return errMsg;
  };

  const handleEmailChange = (val) => {
    setEmail(val);
    setTouched(prev => ({ ...prev, email: true }));
    setErrors(prev => ({ ...prev, email: validateField('email', val) }));
  };

  const handlePasswordChange = (val) => {
    setPassword(val);
    setTouched(prev => ({ ...prev, password: true }));
    setErrors(prev => ({ ...prev, password: validateField('password', val) }));
  };

  const handleBlur = (field, val) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validateField(field, val) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all as touched and validate
    const emailErr = validateField('email', email);
    const passwordErr = validateField('password', password);
    
    setTouched({ email: true, password: true });
    setErrors({ email: emailErr, password: passwordErr });

    if (emailErr || passwordErr) {
      toast.error('Vui lòng điền đúng định dạng thông tin nhập liệu');
      const firstField = emailErr ? 'email' : 'password';
      const element = document.getElementById(`login-${firstField}`);
      if (element) {
        element.focus();
      }
      return;
    }

    try {
      await login(email, password);
      toast.success('Đăng nhập thành công!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.detail || 'Sai thông tin đăng nhập, vui lòng kiểm tra lại email hoặc mật khẩu';
      toast.error(msg);
      
      // Auto-focus and highlight the password input to allow immediate retyping
      const element = document.getElementById('login-password');
      if (element) {
        element.focus();
        element.select();
      }
    }
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
          <h2>InfraWatch</h2>
          <p>Hệ thống Quản lý Hạ tầng Thông minh</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="login-email"
              className={`form-input ${touched.email && errors.email ? 'is-invalid' : ''}`}
              type="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={(e) => handleBlur('email', e.target.value)}
              required
              autoFocus
            />
            {touched.email && errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                className={`form-input ${touched.password && errors.password ? 'is-invalid' : ''}`}
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={(e) => handleBlur('password', e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  zIndex: 2,
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {touched.password && errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>
          
          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 8 }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
          Chưa có tài khoản? <Link to="/register" style={{ color: 'var(--accent-cyan)' }}>Đăng ký công dân</Link>
        </p>
      </div>
    </div>
  );
}
