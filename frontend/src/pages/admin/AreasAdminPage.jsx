import { useEffect, useState } from 'react';
import { areasAPI, getErrorMessage } from '../../services/api';
import ConfirmActionModal from '../../components/common/ConfirmActionModal';
import { Plus, Trash2, Edit, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '',
  code: '',
  bbox_min_lng: '',
  bbox_min_lat: '',
  bbox_max_lng: '',
  bbox_max_lat: '',
  manager: '',
};

export default function AreasAdminPage() {
  const [areas, setAreas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);

  const load = () => {
    areasAPI.list()
      .then(({ data }) => setAreas(data.results || data))
      .catch((err) => {
        console.warn('Không thể tải danh sách khu vực:', err);
      });
  };

  useEffect(() => { load(); }, []);

  const startEdit = (a) => {
    setEditId(a.id);
    setForm({
      name: a.name,
      code: a.code,
      bbox_min_lng: a.bbox_min_lng,
      bbox_min_lat: a.bbox_min_lat,
      bbox_max_lng: a.bbox_max_lng,
      bbox_max_lat: a.bbox_max_lat,
      manager: a.manager || '',
    });
    setShowForm(true);
  };

  const reset = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const payload = () => {
    const p = {
      name: form.name,
      code: form.code,
      bbox_min_lng: parseFloat(form.bbox_min_lng),
      bbox_min_lat: parseFloat(form.bbox_min_lat),
      bbox_max_lng: parseFloat(form.bbox_max_lng),
      bbox_max_lat: parseFloat(form.bbox_max_lat),
    };
    p.manager = form.manager?.trim() ? form.manager.trim() : null;
    return p;
  };

  const validateBBox = () => {
    const minLng = parseFloat(form.bbox_min_lng);
    const minLat = parseFloat(form.bbox_min_lat);
    const maxLng = parseFloat(form.bbox_max_lng);
    const maxLat = parseFloat(form.bbox_max_lat);

    if (isNaN(minLng) || isNaN(minLat) || isNaN(maxLng) || isNaN(maxLat)) {
      return 'Tất cả tọa độ bbox phải là số hợp lệ.';
    }
    if (minLng >= maxLng) {
      return 'Kinh độ tối thiểu (min lng) phải nhỏ hơn kinh độ tối đa (max lng).';
    }
    if (minLat >= maxLat) {
      return 'Vĩ độ tối thiểu (min lat) phải nhỏ hơn vĩ độ tối đa (max lat).';
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    const validationError = validateBBox();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      if (editId) {
        await areasAPI.update(editId, payload());
        toast.success('Đã cập nhật khu vực');
      } else {
        await areasAPI.create(payload());
        toast.success('Đã thêm khu vực');
      }
      reset();
      load();
    } catch (err) {
      toast.error('Lỗi lưu khu vực: ' + getErrorMessage(err));
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await areasAPI.delete(deleteId);
      toast.success('Đã xóa khu vực thành công');
      load();
    } catch (err) {
      toast.error('Lỗi xóa khu vực: ' + getErrorMessage(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}><MapPin size={18} style={{ verticalAlign: '-3px' }} /> Quản lý khu vực (admin)</h3>
        <button className="btn btn-primary" onClick={() => { reset(); setShowForm(true); }}>
          <Plus size={16} /> Thêm khu vực
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 className="card-title">{editId ? 'Sửa khu vực' : 'Khu vực mới'}</h4>
          <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <div className="form-group"><label className="form-label">Tên</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">Mã code</label>
              <input className="form-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">bbox min lng</label>
              <input className="form-input" type="number" step="any" value={form.bbox_min_lng} onChange={(e) => setForm({ ...form, bbox_min_lng: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">bbox min lat</label>
              <input className="form-input" type="number" step="any" value={form.bbox_min_lat} onChange={(e) => setForm({ ...form, bbox_min_lat: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">bbox max lng</label>
              <input className="form-input" type="number" step="any" value={form.bbox_max_lng} onChange={(e) => setForm({ ...form, bbox_max_lng: e.target.value })} required /></div>
            <div className="form-group"><label className="form-label">bbox max lat</label>
              <input className="form-input" type="number" step="any" value={form.bbox_max_lat} onChange={(e) => setForm({ ...form, bbox_max_lat: e.target.value })} required /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Manager user ID (UUID, tùy chọn)</label>
              <input className="form-input" value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} placeholder="Để trống nếu không có" />
            </div>
            <p style={{ gridColumn: '1 / -1', fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              BBox theo WGS84: min kinh độ, min vĩ độ, max kinh độ, max vĩ độ — nên khớp với vùng hiển thị trên trang{' '}
              <a href="/map" style={{ color: 'var(--accent-cyan)' }}>GIS</a> (zoom/pan rồi đối chiếu tọa độ góc khung nhìn).
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
              <button type="submit" className="btn btn-primary">Lưu</button>
              <button type="button" className="btn btn-secondary" onClick={reset}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Tên</th><th>Mã</th><th>BBox</th><th></th></tr>
            </thead>
            <tbody>
              {areas.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 24 }}>Chưa có dữ liệu</td></tr>
              ) : areas.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td><span className="badge badge-blue">{a.code}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{JSON.stringify(a.bbox)}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => startEdit(a)} title="Sửa"><Edit size={14} /></button>
                    <button className="btn btn-sm btn-secondary" style={{ marginLeft: 6 }} onClick={() => handleDelete(a.id)} title="Xóa"><Trash2 size={14} /></button>
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
        title="Xác nhận xóa khu vực"
        description="Bạn có chắc chắn muốn xóa khu vực này? Hành động này không thể hoàn tác và các phân vùng GIS tương quan có thể bị ảnh hưởng."
        confirmLabel="Xóa khu vực"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  );
}
