import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersAPI, getErrorMessage } from '../../services/api';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import { Plus, Trash2, Power, PowerOff, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_BADGE = {
  admin: 'badge-red', operator: 'badge-blue',
  taskforce: 'badge-purple', citizen: 'badge-green',
};

export default function UsersAdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    email: '', username: '', full_name: '', role: 'citizen', password: '',
  });
  const [deleteId, setDeleteId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = roleFilter ? { role: roleFilter } : {};
      const { data } = await usersAPI.adminList(params);
      setUsers(data.results || data);
    } catch (err) {
      console.warn('Không thể tải danh sách người dùng:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await usersAPI.adminCreate(form);
      toast.success('Tạo user thành công');
      setShowForm(false);
      setForm({ email: '', username: '', full_name: '', role: 'citizen', password: '' });
      fetchUsers();
    } catch (err) {
      toast.error('Lỗi tạo user: ' + getErrorMessage(err));
    }
  };

  const toggleActive = async (u) => {
    try {
      if (u.is_active) await usersAPI.deactivate(u.id);
      else await usersAPI.activate(u.id);
      fetchUsers();
    } catch (err) {
      toast.error('Lỗi chuyển đổi trạng thái: ' + getErrorMessage(err));
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await usersAPI.adminDelete(deleteId);
      toast.success('Xóa người dùng thành công');
      fetchUsers();
    } catch (err) {
      toast.error('Lỗi xóa người dùng: ' + getErrorMessage(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Quản lý người dùng ({users.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Tất cả role</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="taskforce">TaskForce</option>
            <option value="citizen">Citizen</option>
          </select>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Thêm user
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="citizen">Citizen</option>
                  <option value="taskforce">TaskForce</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu</label>
                <input className="form-input" type="password" required
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Tạo</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Email</th><th>Họ tên</th><th>Role</th><th>Active</th><th>Tham gia</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Đang tải...</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.full_name || '—'}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                  <td>
                    {u.is_active
                      ? <span className="badge badge-green">Active</span>
                      : <span className="badge badge-red">Disabled</span>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(u.date_joined).toLocaleDateString('vi')}
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <Link to={`/admin/activity?actor=${u.id}`} className="btn btn-sm btn-secondary" title="Xem hoạt động">
                      <Activity size={12} />
                    </Link>
                    <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(u)}
                      title={u.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                      {u.is_active ? <PowerOff size={12} /> : <Power size={12} />}
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(u.id)} title="Xóa">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ConfirmActionModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa người dùng"
        description="Bạn có chắc chắn muốn xóa người dùng này khỏi hệ thống? Hành động này sẽ thực hiện hard delete và không thể hoàn tác."
        confirmLabel="Xóa người dùng"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  );
}
