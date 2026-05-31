import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI, usersAPI, reportsAPI, assetsAPI, getErrorMessage } from '../services/api';
import { useAuthStore } from '../store';
import LocationPickerModal from '../components/map/LocationPickerModal';
import ConfirmActionModal from '../components/common/ConfirmActionModal';
import {
  Plus, CheckCircle, Download, Upload, ArrowUpDown, Pencil, Trash2, Play, MapPin, MapPinOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_BADGE = { low: 'badge-blue', medium: 'badge-amber', high: 'badge-red', urgent: 'badge-red' };
const STATUS_BADGE = { open: 'badge-blue', assigned: 'badge-purple', in_progress: 'badge-amber', completed: 'badge-green' };

const DEFAULT_LAT = 16.0678;
const DEFAULT_LNG = 108.2208;
const MAP_BBOX = '108.17,16.03,108.26,16.14';

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function nearestAsset(lat, lng, assets, maxM = 1200) {
  let best = null;
  let bestD = Infinity;
  for (const a of assets) {
    if (a.latitude == null || a.longitude == null) continue;
    const d = haversineM(lat, lng, a.latitude, a.longitude);
    if (d <= maxM && d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best ? { asset: best, distanceM: bestD } : null;
}

async function suggestNearestAssetId(lat, lng, assetsPick) {
  let n = nearestAsset(lat, lng, assetsPick);
  if (!n) {
    try {
      const pad = 0.012;
      const { data } = await assetsAPI.list({
        bbox: `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`,
      });
      const rows = data.results || data;
      n = nearestAsset(lat, lng, Array.isArray(rows) ? rows : []);
    } catch {
      return null;
    }
  }
  return n;
}

function normalizeLocationPayload(latRaw, lngRaw) {
  const emptyL = latRaw === '' || latRaw == null;
  const emptyG = lngRaw === '' || lngRaw == null;
  if (emptyL && emptyG) return { location_latitude: null, location_longitude: null };
  if (emptyL !== emptyG) return { error: 'Nhập đủ vĩ độ và kinh độ, hoặc để trống cả hai.' };
  const lat = typeof latRaw === 'number' ? latRaw : parseFloat(latRaw);
  const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'Tọa độ không hợp lệ.' };
  return { location_latitude: lat, location_longitude: lng };
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [taskforces, setTaskforces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [order, setOrder] = useState('-created_at');
  const [statusFilter, setStatusFilter] = useState('');
  const [completeModal, setCompleteModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', priority: 'medium', assigned_to: '', due_date: '',
    report: '', related_asset: '', location_latitude: '', location_longitude: '',
  });
  const [reportsPick, setReportsPick] = useState([]);
  const [assetsPick, setAssetsPick] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', report: '', related_asset: '',
    location_latitude: '', location_longitude: '',
  });
  const [pickCreateOpen, setPickCreateOpen] = useState(false);
  const [pickEditOpen, setPickEditOpen] = useState(false);
  const [mapAssets, setMapAssets] = useState([]);
  const [mapReports, setMapReports] = useState([]);
  const [deleteId, setDeleteId] = useState(null);

  const isTaskforce = user?.role === 'taskforce';
  const canCreate = user?.role === 'operator' || user?.role === 'admin';

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = {};
      if (order === 'priority') params.order = 'priority';
      if (statusFilter) params.status = statusFilter;
      const { data } = await tasksAPI.list(params);
      setTasks(data.results || data);
    } catch (err) {
      console.warn('Không thể tải danh sách tác vụ:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [order, statusFilter]);

  useEffect(() => {
    if (canCreate) {
      usersAPI.listByRole('taskforce').then(({ data }) => setTaskforces(data)).catch(() => {});
      reportsAPI.list({}).then(({ data }) => {
        const rows = data.results || data;
        setReportsPick(Array.isArray(rows) ? rows.slice(0, 200) : []);
      }).catch(() => {});
      assetsAPI.list({}).then(({ data }) => {
        const rows = data.results || data;
        setAssetsPick(Array.isArray(rows) ? rows.slice(0, 200) : []);
      }).catch(() => {});
    }
  }, [canCreate]);

  useEffect(() => {
    if (!pickCreateOpen && !pickEditOpen) return;
    assetsAPI.list({ bbox: MAP_BBOX }).then(({ data }) => {
      const rows = data.results || data;
      setMapAssets(Array.isArray(rows) ? rows.slice(0, 80) : []);
    }).catch(() => setMapAssets([]));
    reportsAPI.list({}).then(({ data }) => {
      const rows = data.results || data;
      setMapReports(Array.isArray(rows) ? rows.slice(0, 50) : []);
    }).catch(() => setMapReports([]));
  }, [pickCreateOpen, pickEditOpen]);

  const applyPickerCreate = (lat, lng) => {
    let skipSuggest = false;
    setForm((prev) => {
      skipSuggest = !!prev.related_asset;
      return { ...prev, location_latitude: lat, location_longitude: lng };
    });
    queueMicrotask(async () => {
      if (skipSuggest) return;
      const n = await suggestNearestAssetId(lat, lng, assetsPick);
      if (n) {
        setForm((p) => (p.related_asset ? p : { ...p, related_asset: n.asset.id }));
        toast.success(`Đã gán tài sản gần nhất: ${n.asset.name} (~${Math.round(n.distanceM)} m)`);
      }
    });
  };

  const applyPickerEdit = (lat, lng) => {
    let skipSuggest = false;
    setEditForm((prev) => {
      skipSuggest = !!prev.related_asset;
      return { ...prev, location_latitude: lat, location_longitude: lng };
    });
    queueMicrotask(async () => {
      if (skipSuggest) return;
      const n = await suggestNearestAssetId(lat, lng, assetsPick);
      if (n) {
        setEditForm((p) => (p.related_asset ? p : { ...p, related_asset: n.asset.id }));
        toast.success(`Đã gán tài sản gần nhất: ${n.asset.name} (~${Math.round(n.distanceM)} m)`);
      }
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const loc = normalizeLocationPayload(form.location_latitude, form.location_longitude);
    if (loc.error) {
      toast.error(loc.error);
      return;
    }
    try {
      const payload = {
        title: form.title,
        description: form.description || '',
        priority: form.priority,
        report: form.report || null,
        related_asset: form.related_asset || null,
        location_latitude: loc.location_latitude,
        location_longitude: loc.location_longitude,
      };
      await tasksAPI.create(payload);
      toast.success('Tạo tác vụ thành công!');
      setShowForm(false);
      setForm({
        title: '', description: '', priority: 'medium', report: '', related_asset: '',
        location_latitude: '', location_longitude: '',
      });
      fetchTasks();
    } catch (err) {
      toast.error('Lỗi tạo tác vụ: ' + getErrorMessage(err));
    }
  };

  const handleComplete = async (taskId, payload) => {
    try {
      if (payload?.image) {
        const fd = new FormData();
        fd.append('notes', payload.notes || '');
        fd.append('completion_image', payload.image);
        await tasksAPI.complete(taskId, fd);
      } else {
        await tasksAPI.complete(taskId, { notes: payload?.notes || '' });
      }
      toast.success('Hoàn thành tác vụ!');
      setCompleteModal(null);
      fetchTasks();
    } catch (err) {
      toast.error('Lỗi hoàn thành tác vụ: ' + getErrorMessage(err));
    }
  };

  const openEdit = (t) => {
    setEditModal(t);
    setEditForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority || 'medium',
      assigned_to: t.assigned_to || '',
      due_date: t.due_date ? t.due_date.slice(0, 16) : '',
      report: t.report || '',
      related_asset: t.related_asset || '',
      location_latitude: t.location_latitude ?? '',
      location_longitude: t.location_longitude ?? '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editModal) return;
    const loc = normalizeLocationPayload(editForm.location_latitude, editForm.location_longitude);
    if (loc.error) {
      toast.error(loc.error);
      return;
    }
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        priority: editForm.priority,
        assigned_to: editForm.assigned_to || null,
        due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : null,
        report: editForm.report || null,
        related_asset: editForm.related_asset || null,
        location_latitude: loc.location_latitude,
        location_longitude: loc.location_longitude,
      };
      await tasksAPI.update(editModal.id, payload);
      toast.success('Đã cập nhật tác vụ thành công');
      setEditModal(null);
      fetchTasks();
    } catch (err) {
      toast.error('Lỗi cập nhật tác vụ: ' + getErrorMessage(err));
    }
  };

  const deleteTask = (tid) => {
    setDeleteId(tid);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await tasksAPI.delete(deleteId);
      toast.success('Đã xóa tác vụ thành công');
      fetchTasks();
    } catch (err) {
      toast.error('Lỗi xóa tác vụ: ' + getErrorMessage(err));
    }
  };

  const startProgress = async (tid) => {
    try {
      await tasksAPI.update(tid, { status: 'in_progress' });
      toast.success('Đã bắt đầu thực hiện tác vụ');
      fetchTasks();
    } catch (err) {
      toast.error('Không cập nhật được trạng thái tác vụ: ' + getErrorMessage(err));
    }
  };

  const createPickerLat = form.location_latitude === '' ? DEFAULT_LAT : +form.location_latitude;
  const createPickerLng = form.location_longitude === '' ? DEFAULT_LNG : +form.location_longitude;
  const editPickerLat = editForm.location_latitude === '' ? DEFAULT_LAT : +editForm.location_latitude;
  const editPickerLng = editForm.location_longitude === '' ? DEFAULT_LNG : +editForm.location_longitude;

  return (
    <div>
      <LocationPickerModal
        open={pickCreateOpen}
        onClose={() => setPickCreateOpen(false)}
        initialLatitude={Number.isFinite(createPickerLat) ? createPickerLat : DEFAULT_LAT}
        initialLongitude={Number.isFinite(createPickerLng) ? createPickerLng : DEFAULT_LNG}
        onApply={(lat, lng) => { applyPickerCreate(lat, lng); }}
        title="Chọn điểm tác vụ trên map"
        contextAssets={mapAssets}
        contextReports={mapReports}
      />
      <LocationPickerModal
        open={pickEditOpen}
        onClose={() => setPickEditOpen(false)}
        initialLatitude={Number.isFinite(editPickerLat) ? editPickerLat : DEFAULT_LAT}
        initialLongitude={Number.isFinite(editPickerLng) ? editPickerLng : DEFAULT_LNG}
        onApply={(lat, lng) => { applyPickerEdit(lat, lng); }}
        title="Chọn điểm tác vụ trên map (sửa)"
        contextAssets={mapAssets}
        contextReports={mapReports}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Quản lý tác vụ ({tasks.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="open">Mở</option>
            <option value="assigned">Đã phân công</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="completed">Hoàn thành</option>
          </select>
          <button className="btn btn-secondary" onClick={() => setOrder(order === 'priority' ? '-created_at' : 'priority')}>
            <ArrowUpDown size={14} /> {order === 'priority' ? 'Theo ngày' : 'Theo ưu tiên'}
          </button>
          {canCreate && (
            <button className="btn btn-secondary" onClick={() => tasksAPI.export({ format: 'csv' })}>
              <Download size={14} /> CSV
            </button>
          )}
          {canCreate && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={16} /> Tạo tác vụ
            </button>
          )}
        </div>
      </div>

      {showForm && canCreate && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tiêu đề</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Ưu tiên</label>
                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Thấp</option><option value="medium">Trung bình</option>
                  <option value="high">Cao</option><option value="urgent">Khẩn cấp</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">Tạo</button>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mô tả (tùy chọn)</label>
              <textarea className="form-textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Điểm tác vụ (tọa độ WGS84)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <input
                  className="form-input"
                  style={{ width: 140 }}
                  type="number"
                  step="any"
                  placeholder="Vĩ độ"
                  value={form.location_latitude}
                  onChange={(e) => setForm({ ...form, location_latitude: e.target.value })}
                />
                <input
                  className="form-input"
                  style={{ width: 140 }}
                  type="number"
                  step="any"
                  placeholder="Kinh độ"
                  value={form.location_longitude}
                  onChange={(e) => setForm({ ...form, location_longitude: e.target.value })}
                />
                <button type="button" className="btn btn-secondary" onClick={() => setPickCreateOpen(true)}>
                  <MapPin size={14} /> Chọn trên map
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  title="Xóa điểm đã ghi"
                  onClick={() => setForm({ ...form, location_latitude: '', location_longitude: '' })}
                >
                  <MapPinOff size={14} />
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Báo cáo liên quan</label>
                <select className="form-select" value={form.report} onChange={(e) => setForm({ ...form, report: e.target.value })}>
                  <option value="">— Không chọn —</option>
                  {reportsPick.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{String(r.id).slice(0, 8)} — {r.incident_type_display || r.incident_type}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tài sản neo (tùy chọn)</label>
                <select className="form-select" value={form.related_asset} onChange={(e) => setForm({ ...form, related_asset: e.target.value })}>
                  <option value="">— Không chọn —</option>
                  {assetsPick.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Tiêu đề</th><th>Liên kết / map</th><th>Ưu tiên</th><th>Trạng thái</th><th>Người thực hiện</th><th>Ngày tạo</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Đang tải...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Chưa có tác vụ</td></tr>
              ) : tasks.map((t) => {
                const hasTaskPin = t.location_latitude != null && t.location_longitude != null;
                const hasAny = !!(t.report_summary || t.asset_summary || hasTaskPin);
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {!hasAny ? '—' : null}
                        {t.report_summary && (
                          <>
                            <a href={`/reports/${t.report}`} style={{ color: 'var(--accent-cyan)' }}>
                              BC #{String(t.report).slice(0, 8)} {t.report_summary.incident_type_display}
                            </a>
                            {t.report_summary.latitude != null && t.report_summary.longitude != null && (
                              <span>
                                BC: {Number(t.report_summary.latitude).toFixed(4)}, {Number(t.report_summary.longitude).toFixed(4)}
                                {' '}
                                <Link to={`/map?report=${t.report}`} style={{ color: 'var(--accent-cyan)' }}>GIS</Link>
                              </span>
                            )}
                          </>
                        )}
                        {t.asset_summary && (
                          <>
                            <span>
                              TS: <Link to={`/map?asset=${t.related_asset}`} style={{ color: 'var(--accent-cyan)' }}>{t.asset_summary.name}</Link>
                            </span>
                            {t.asset_summary.latitude != null && t.asset_summary.longitude != null && (
                              <span style={{ fontSize: 11 }}>
                                {Number(t.asset_summary.latitude).toFixed(4)}, {Number(t.asset_summary.longitude).toFixed(4)}
                              </span>
                            )}
                          </>
                        )}
                        {hasTaskPin && (
                          <span>
                            Điểm tác vụ: {Number(t.location_latitude).toFixed(4)}, {Number(t.location_longitude).toFixed(4)}
                            {' '}
                            <Link to={`/map?task=${t.id}`} style={{ color: 'var(--accent-cyan)' }}>GIS</Link>
                          </span>
                        )}
                      </div>
                    </td>
                    <td><span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                    <td>{t.assigned_to_name || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString('vi')}</td>
                    <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {isTaskforce && t.status === 'assigned' && (
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => startProgress(t.id)} title="Bắt đầu">
                          <Play size={14} />
                        </button>
                      )}
                      {t.status !== 'completed' && (isTaskforce || canCreate) && (
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => setCompleteModal(t)}>
                          <CheckCircle size={14} /> Xong
                        </button>
                      )}
                      {canCreate && (
                        <>
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(t)} title="Sửa">
                            <Pencil size={14} />
                          </button>
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => deleteTask(t.id)} title="Xóa">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editModal && canCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }} onClick={() => setEditModal(null)}>
          <div className="card" style={{ minWidth: 480, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <h4 className="card-title">Sửa tác vụ</h4>
            <form onSubmit={saveEdit}>
              <div className="form-group">
                <label className="form-label">Tiêu đề</label>
                <input className="form-input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea className="form-textarea" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Ưu tiên</label>
                  <select className="form-select" value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}>
                    <option value="low">Thấp</option><option value="medium">Trung bình</option>
                    <option value="high">Cao</option><option value="urgent">Khẩn cấp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hạn</label>
                  <input className="form-input" type="datetime-local" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Điểm tác vụ</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    style={{ width: 130 }}
                    type="number"
                    step="any"
                    placeholder="Vĩ độ"
                    value={editForm.location_latitude}
                    onChange={(e) => setEditForm({ ...editForm, location_latitude: e.target.value })}
                  />
                  <input
                    className="form-input"
                    style={{ width: 130 }}
                    type="number"
                    step="any"
                    placeholder="Kinh độ"
                    value={editForm.location_longitude}
                    onChange={(e) => setEditForm({ ...editForm, location_longitude: e.target.value })}
                  />
                  <button type="button" className="btn btn-secondary" onClick={() => setPickEditOpen(true)}>
                    <MapPin size={14} /> Map
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditForm({ ...editForm, location_latitude: '', location_longitude: '' })}
                  >
                    <MapPinOff size={14} />
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phân công</label>
                <select className="form-select" value={editForm.assigned_to} onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}>
                  <option value="">— Chưa gán —</option>
                  {taskforces.map((tf) => (
                    <option key={tf.id} value={tf.id}>{tf.full_name} ({tf.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Báo cáo liên quan</label>
                  <select className="form-select" value={editForm.report} onChange={(e) => setEditForm({ ...editForm, report: e.target.value })}>
                    <option value="">— Không chọn —</option>
                    {reportsPick.map((r) => (
                      <option key={r.id} value={r.id}>
                        #{String(r.id).slice(0, 8)} — {r.incident_type_display || r.incident_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tài sản neo</label>
                  <select className="form-select" value={editForm.related_asset} onChange={(e) => setEditForm({ ...editForm, related_asset: e.target.value })}>
                    <option value="">— Không chọn —</option>
                    {assetsPick.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Lưu</button>
              <button type="button" className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setEditModal(null)}>Hủy</button>
            </form>
          </div>
        </div>
      )}

      {completeModal && (
        <CompleteModal
          task={completeModal}
          onClose={() => setCompleteModal(null)}
          onSubmit={(payload) => handleComplete(completeModal.id, payload)}
        />
      )}
      <ConfirmActionModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa tác vụ"
        description="Bạn có chắc chắn muốn xóa tác vụ này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa tác vụ"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  );
}

function CompleteModal({ task, onClose, onSubmit }) {
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    setNotes('');
    setImage(null);
    setAcknowledged(false);
  }, [task?.id]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div className="card" style={{ minWidth: 420, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <h4 className="card-title" style={{ marginBottom: 12 }}>Hoàn thành: {task.title}</h4>
        <div style={{
          padding: 12,
          marginBottom: 12,
          fontSize: 13,
          lineHeight: 1.5,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(245, 158, 11, 0.45)',
          background: 'rgba(245, 158, 11, 0.1)',
          color: 'var(--text-secondary)',
        }}>
          Sau khi xác nhận, tác vụ chuyển sang trạng thái <strong>hoàn thành</strong> và hệ thống có thể cập nhật luôn báo cáo liên quan. Thông thường <strong>không có nút hoàn tác</strong> trên giao diện; chỉ nhấn khi đã xử lý xong.
        </div>
        <div className="form-group">
          <label className="form-label">Ghi chú</label>
          <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Ảnh hoàn thành (after)</label>
          <input className="form-input" type="file" accept="image/*"
            onChange={(e) => setImage(e.target.files[0])} />
        </div>
        <label style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          marginBottom: 14,
          cursor: 'pointer',
          fontSize: 13,
          lineHeight: 1.45,
        }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>Tôi xác nhận đã hoàn tất xử lý và hiểu thao tác này mang tính kết thúc đối với tác vụ.</span>
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!acknowledged}
          onClick={() => onSubmit({ notes, image })}
        >
          <Upload size={14} /> Xác nhận
        </button>
        <button type="button" className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={onClose}>Hủy</button>
      </div>
    </div>
  );
}
