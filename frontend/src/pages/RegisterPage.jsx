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

  // Validation States
  const [errors, setErrors] = useState({
    email: '', username: '', full_name: '',
    password: '', password_confirm: '',
  });
  const [touched, setTouched] = useState({
    email: false, username: false, full_name: false,
    password: false, password_confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateField = (name, value, currentForm = form) => {
    let errMsg = '';
    if (name === 'email') {
      if (!value) {
        errMsg = 'Email không được để trống';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errMsg = 'Định dạng email không hợp lệ (ví dụ: name@domain.com)';
      }
    } else if (name === 'username') {
      if (!value) {
        errMsg = 'Tên tài khoản không được để trống';
      } else if (value.length < 3) {
        errMsg = 'Tên tài khoản phải từ 3 ký tự trở lên';
      } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
        errMsg = 'Tên tài khoản chỉ được chứa chữ cái, số và dấu gạch dưới';
      }
    } else if (name === 'full_name') {
      if (!value) {
        errMsg = 'Họ tên không được để trống';
      } else if (value.trim().length < 2) {
        errMsg = 'Họ tên phải từ 2 ký tự trở lên';
      }
    } else if (name === 'password') {
      if (!value) {
        errMsg = 'Mật khẩu không được để trống';
      } else if (value.length < 6) {
        errMsg = 'Mật khẩu phải dài tối thiểu 6 ký tự';
      }
    } else if (name === 'password_confirm') {
      if (!value) {
        errMsg = 'Nhập lại mật khẩu không được để trống';
      } else if (value !== currentForm.password) {
        errMsg = 'Mật khẩu xác nhận không trùng khớp';
      }
    }
    return errMsg;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate current field
    const errMsg = validateField(name, value, nextForm);
    setErrors(prev => ({ ...prev, [name]: errMsg }));

    // Revalidate password confirm if password was modified
    if (name === 'password' && nextForm.password_confirm) {
      const confirmMsg = validateField('password_confirm', nextForm.password_confirm, nextForm);
      setErrors(prev => ({ ...prev, password_confirm: confirmMsg }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const errMsg = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: errMsg }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched and validate
    const nextErrors = {};
    let firstErrorField = '';

    Object.keys(form).forEach((key) => {
      const errMsg = validateField(key, form[key]);
      nextErrors[key] = errMsg;
      if (errMsg && !firstErrorField) {
        firstErrorField = key;
      }
    });

    setTouched({
      email: true, username: true, full_name: true,
      password: true, password_confirm: true,
    });
    setErrors(nextErrors);

    if (firstErrorField) {
      toast.error('Vui lòng kiểm tra và sửa lại thông tin nhập liệu bị lỗi');
      const element = document.getElementById(`register-${firstErrorField}`);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    try {
      await authAPI.register(form);
      toast.success('Đăng ký thành công, vui lòng đăng nhập');
      navigate('/login');
    } catch (err) {
      const data = err.response?.data || {};
      const serverErrors = {};
      let firstServerField = '';

      // Check for specific field errors from server
      if (data.email) {
        serverErrors.email = Array.isArray(data.email) ? data.email.join(', ') : String(data.email);
        if (!firstServerField) firstServerField = 'email';
      }
      if (data.username) {
        serverErrors.username = Array.isArray(data.username) ? data.username.join(', ') : String(data.username);
        if (!firstServerField) firstServerField = 'username';
      }
      if (data.full_name) {
        serverErrors.full_name = Array.isArray(data.full_name) ? data.full_name.join(', ') : String(data.full_name);
        if (!firstServerField) firstServerField = 'full_name';
      }
      if (data.password) {
        serverErrors.password = Array.isArray(data.password) ? data.password.join(', ') : String(data.password);
        if (!firstServerField) firstServerField = 'password';
      }

      if (firstServerField) {
        setErrors(prev => ({ ...prev, ...serverErrors }));
        setTouched(prev => ({ ...prev, [firstServerField]: true }));
        
        toast.error(serverErrors[firstServerField]);

        const element = document.getElementById(`register-${firstServerField}`);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        const msg = Object.values(data).flat().join(', ') || 'Lỗi đăng ký từ hệ thống';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
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
          <h2>Đăng ký công dân</h2>
          <p>Tạo tài khoản InfraWatch để báo cáo sự cố hạ tầng</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="register-email"
              name="email"
              className={`form-input ${touched.email && errors.email ? 'is-invalid' : ''}`}
              type="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.email && errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Tên tài khoản</label>
            <input
              id="register-username"
              name="username"
              className={`form-input ${touched.username && errors.username ? 'is-invalid' : ''}`}
              type="text"
              value={form.username}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.username && errors.username && (
              <span className="error-message">{errors.username}</span>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Họ tên</label>
            <input
              id="register-full_name"
              name="full_name"
              className={`form-input ${touched.full_name && errors.full_name ? 'is-invalid' : ''}`}
              type="text"
              value={form.full_name}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.full_name && errors.full_name && (
              <span className="error-message">{errors.full_name}</span>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              id="register-password"
              name="password"
              className={`form-input ${touched.password && errors.password ? 'is-invalid' : ''}`}
              type="password"
              value={form.password}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.password && errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Nhập lại mật khẩu</label>
            <input
              id="register-password_confirm"
              name="password_confirm"
              className={`form-input ${touched.password_confirm && errors.password_confirm ? 'is-invalid' : ''}`}
              type="password"
              value={form.password_confirm}
              onChange={handleChange}
              onBlur={handleBlur}
              required
            />
            {touched.password_confirm && errors.password_confirm && (
              <span className="error-message">{errors.password_confirm}</span>
            )}
          </div>
          
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}
          >
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
