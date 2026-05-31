import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssetsStore } from '../store';
import { assetsAPI, getErrorMessage } from '../services/api';
import LocationPickerModal from '../components/map/LocationPickerModal';
import ConfirmActionModal from '../components/common/ConfirmActionModal';
import { Plus, Trash2, Edit, MapPin, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_LAT = 16.0678;
const DEFAULT_LNG = 108.2208;
const MAP_BBOX = '108.17,16.03,108.26,16.14';

export default function AssetsPage() {
  const { assets, fetchAssets, loading } = useAssetsStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', asset_type: 'bench', latitude: DEFAULT_LAT, longitude: DEFAULT_LNG,
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '', asset_type: 'bench', status: 'active', installed_at: '',
    latitude: DEFAULT_LAT, longitude: DEFAULT_LNG,
  });
  const [pickCreateOpen, setPickCreateOpen] = useState(false);
  const [pickEditOpen, setPickEditOpen] = useState(false);
  const [mapCtx, setMapCtx] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { fetchAssets(); }, []);

  useEffect(() => {
    if (showForm || editingId) {
      assetsAPI.list({ bbox: MAP_BBOX }).then(({ data }) => {
        const rows = data.results || data;
        setMapCtx(rows.slice(0, 80));
      }).catch(() => setMapCtx([]));
    }
  }, [showForm, editingId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await assetsAPI.create(form);
      toast.success('Tạo tài sản thành công!');
      setShowForm(false);
      setForm({ name: '', asset_type: 'bench', latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
      fetchAssets();
    } catch (err) {
      toast.error('Lỗi tạo tài sản: ' + getErrorMessage(err));
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await assetsAPI.delete(deleteId);
      toast.success('Đã xóa tài sản thành công');
      fetchAssets();
    } catch (err) {
      toast.error('Lỗi xóa tài sản: ' + getErrorMessage(err));
    }
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      asset_type: a.asset_type,
      status: a.status || 'active',
      installed_at: a.installed_at || '',
      latitude: a.latitude ?? DEFAULT_LAT,
      longitude: a.longitude ?? DEFAULT_LNG,
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const payload = {
        name: editForm.name,
        asset_type: editForm.asset_type,
        status: editForm.status,
        installed_at: editForm.installed_at || null,
        latitude: editForm.latitude,
        longitude: editForm.longitude,
      };
      await assetsAPI.update(editingId, payload);
      toast.success('Đã cập nhật tài sản thành công');
      setEditingId(null);
      fetchAssets();
    } catch (err) {
      toast.error('Lỗi cập nhật tài sản: ' + getErrorMessage(err));
    }
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

      <LocationPickerModal
        open={pickCreateOpen}
        onClose={() => setPickCreateOpen(false)}
        initialLatitude={form.latitude}
        initialLongitude={form.longitude}
        onApply={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
        title="Chọn vị trí tài sản (mới)"
        contextAssets={mapCtx}
        contextReports={[]}
      />
      <LocationPickerModal
        open={pickEditOpen}
        onClose={() => setPickEditOpen(false)}
        initialLatitude={editForm.latitude}
        initialLongitude={editForm.longitude}
        onApply={(lat, lng) => setEditForm({ ...editForm, latitude: lat, longitude: lng })}
        title="Chọn vị trí tài sản (sửa)"
        contextAssets={mapCtx}
        contextReports={[]}
      />

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: 12, alignItems: 'end' }}>
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
            <button type="button" className="btn btn-secondary" onClick={() => setPickCreateOpen(true)}>
              <MapPin size={14} /> Chọn map
            </button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <a
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                href={`/map?focus=${encodeURIComponent(`${form.latitude},${form.longitude},16`)}`}
              >
                <ExternalLink size={14} /> GIS
              </a>
              <button type="submit" className="btn btn-primary">Tạo</button>
            </div>
          </form>
        </div>
      )}

      {editingId && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 className="card-title">Sửa tài sản</h4>
          <form onSubmit={handleEditSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Tên</label>
              <input className="form-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Loại</label>
              <select className="form-select" value={editForm.asset_type} onChange={(e) => setEditForm({ ...editForm, asset_type: e.target.value })}>
                <option value="bench">Ghế đá</option>
                <option value="trash_can">Thùng rác</option>
                <option value="lamp">Cột đèn</option>
                <option value="toilet">Nhà vệ sinh</option>
                <option value="tree">Cây xanh</option>
                <option value="sign">Biển báo</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                <option value="active">Hoạt động</option>
                <option value="damaged">Hư hỏng</option>
                <option value="maintenance">Bảo trì</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Ngày lắp</label>
              <input className="form-input" type="date" value={editForm.installed_at} onChange={(e) => setEditForm({ ...editForm, installed_at: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0, gridColumn: '1 / 3' }}>
              <label className="form-label">Tọa độ (vĩ độ / kinh độ)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="form-input" type="number" step="any" value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: +e.target.value })} />
                <input className="form-input" type="number" step="any" value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: +e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'end', gridColumn: '3 / -1' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setPickEditOpen(true)}>
                <MapPin size={14} /> Chọn map
              </button>
              <Link
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                to={`/map?asset=${editingId}`}
              >
                <ExternalLink size={14} /> GIS
              </Link>
              <button type="submit" className="btn btn-primary">Lưu</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Hủy</button>
            </div>
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
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
                    {' '}
                    <Link to={`/map?asset=${a.id}`} style={{ color: 'var(--accent-cyan)', marginLeft: 6 }}>Map</Link>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{a.installed_at || '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(a)} title="Sửa">
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-sm btn-secondary" style={{ marginLeft: 6 }} onClick={() => handleDelete(a.id)} title="Xóa">
                      <Trash2 size={14} />
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
        title="Xác nhận xóa tài sản"
        description="Bạn có chắc chắn muốn xóa tài sản này? Hành động này không thể hoàn tác và có thể ảnh hưởng đến các tác vụ hoặc nhật ký bảo trì liên quan."
        confirmLabel="Xóa tài sản"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  );
}
