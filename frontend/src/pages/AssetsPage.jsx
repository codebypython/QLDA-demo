import { useEffect, useState } from 'react';
import { useAssetsStore } from '../store';
import { assetsAPI } from '../services/api';
import { Plus, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AssetsPage() {
  const { assets, fetchAssets, loading } = useAssetsStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', asset_type: 'bench', latitude: 16.0678, longitude: 108.2208 });

  useEffect(() => { fetchAssets(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await assetsAPI.create(form);
      toast.success('Tạo tài sản thành công!');
      setShowForm(false);
      setForm({ name: '', asset_type: 'bench', latitude: 16.0678, longitude: 108.2208 });
      fetchAssets();
    } catch (err) {
      toast.error('Lỗi tạo tài sản');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa tài sản này?')) return;
    try {
      await assetsAPI.delete(id);
      toast.success('Đã xóa');
      fetchAssets();
    } catch { toast.error('Lỗi xóa'); }
  };

  const STATUS_BADGE = { active: 'badge-green', damaged: 'badge-red', maintenance: 'badge-amber' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Danh sách tài sản ({assets.length})</h3>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Thêm tài sản
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tên</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Loại</label>
              <select className="form-select" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
                <option value="bench">Ghế đá</option>
                <option value="trash_can">Thùng rác</option>
                <option value="lamp">Cột đèn</option>
                <option value="toilet">Nhà vệ sinh</option>
                <option value="tree">Cây xanh</option>
                <option value="sign">Biển báo</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Vĩ độ</label>
              <input className="form-input" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: +e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Kinh độ</label>
              <input className="form-input" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: +e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">Tạo</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tên</th><th>Loại</th><th>Trạng thái</th><th>Vị trí</th><th>Ngày lắp đặt</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Đang tải...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Chưa có tài sản</td></tr>
              ) : assets.map((a) => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td><span className="badge badge-blue">{a.asset_type_display || a.asset_type}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[a.status] || 'badge-blue'}`}>{a.status_display || a.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{a.installed_at || '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleDelete(a.id)} title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
