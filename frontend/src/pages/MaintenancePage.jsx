import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LeafletMap from '../components/map/LeafletMap';
import ConfirmActionModal from '../components/common/ConfirmActionModal';
import { maintenanceAPI, assetsAPI, reportsAPI, getErrorMessage } from '../services/api';
import { useAuthStore } from '../store';
import { Plus, CheckCircle, Download, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  scheduled: 'badge-blue', in_progress: 'badge-amber',
  completed: 'badge-green', cancelled: 'badge-red',
};

export default function MaintenancePage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [reportsPick, setReportsPick] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    asset: '', report: '', status: 'scheduled', scheduled_at: '', notes: '',
  });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    asset: '', technician: '', status: 'scheduled', scheduled_at: '', notes: '', report: '',
  });
  const [previewReportDetail, setPreviewReportDetail] = useState(null);
  const [editPreviewReportDetail, setEditPreviewReportDetail] = useState(null);
  const [completeConfirmId, setCompleteConfirmId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const isOp = user?.role === 'operator' || user?.role === 'admin';
  const isTf = user?.role === 'taskforce';

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await maintenanceAPI.list(statusFilter ? { status: statusFilter } : {});
      setLogs(data.results || data);
    } catch (err) {
      console.warn('Không thể tải log bảo trì:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    assetsAPI.list().then(({ data }) => setAssets(data.results || data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (isTf) {
      reportsAPI.list({}).then(({ data }) => {
        const rows = data.results || data;
        setReportsPick(rows);
      }).catch(() => {});
    }
  }, [isTf]);

  useEffect(() => { fetchLogs(); }, [statusFilter]);

  useEffect(() => {
    if (!form.report) {
      setPreviewReportDetail(null);
      return undefined;
    }
    reportsAPI.get(form.report).then(({ data }) => setPreviewReportDetail(data)).catch(() => setPreviewReportDetail(null));
    return undefined;
  }, [form.report]);

  useEffect(() => {
    if (!editForm.report) {
      setEditPreviewReportDetail(null);
      return undefined;
    }
    reportsAPI.get(editForm.report).then(({ data }) => setEditPreviewReportDetail(data)).catch(() => setEditPreviewReportDetail(null));
    return undefined;
  }, [editForm.report]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        asset: form.asset,
        status: form.status,
        notes: form.notes,
        scheduled_at: form.scheduled_at || null,
      };
      if (form.report) payload.report = form.report;
      await maintenanceAPI.create(payload);
      toast.success('Tạo log bảo trì');
      setShowForm(false);
      setForm({ asset: '', report: '', status: 'scheduled', scheduled_at: '', notes: '' });
      fetchLogs();
    } catch (err) {
      toast.error('Lỗi tạo nhật ký bảo trì: ' + getErrorMessage(err));
    }
  };

  const finalizeMaintenanceComplete = async () => {
    if (!completeConfirmId) return;
    try {
      await maintenanceAPI.update(completeConfirmId, { status: 'completed' });
      toast.success('Đánh dấu hoàn thành');
      fetchLogs();
    } catch (err) {
      toast.error('Lỗi hoàn thành bảo trì: ' + getErrorMessage(err));
      throw new Error('complete_failed');
    }
  };

  const openEdit = (m) => {
    setEditId(m.id);
    setEditForm({
      asset: m.asset,
      technician: m.technician || '',
      status: m.status,
      scheduled_at: m.scheduled_at ? m.scheduled_at.slice(0, 16) : '',
      notes: m.notes || '',
      report: m.report || '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editId) return;
    try {
      const payload = {
        notes: editForm.notes,
        scheduled_at: editForm.scheduled_at ? new Date(editForm.scheduled_at).toISOString() : null,
        status: editForm.status,
      };
      if (isOp) {
        payload.asset = editForm.asset;
        payload.technician = editForm.technician || null;
        payload.report = editForm.report || null;
      }
      await maintenanceAPI.update(editId, payload);
      toast.success('Đã cập nhật');
      setEditId(null);
      fetchLogs();
    } catch (err) {
      toast.error('Lỗi cập nhật nhật ký bảo trì: ' + getErrorMessage(err));
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await maintenanceAPI.delete(deleteId);
      toast.success('Đã xóa nhật ký bảo trì thành công');
      fetchLogs();
    } catch (err) {
      toast.error('Lỗi xóa nhật ký bảo trì: ' + getErrorMessage(err));
    }
  };

  const statusOptsCreate = isTf
    ? (
      <>
        <option value="scheduled">Đã lên lịch</option>
        <option value="in_progress">Đang thực hiện</option>
      </>
      )
    : (
      <>
        <option value="scheduled">Đã lên lịch</option>
        <option value="in_progress">Đang thực hiện</option>
        <option value="completed">Hoàn thành</option>
      </>
      );

  const statusOptsEdit = (
    <>
      <option value="scheduled">Đã lên lịch</option>
      <option value="in_progress">Đang thực hiện</option>
      <option value="completed">Hoàn thành</option>
      <option value="cancelled">Hủy bỏ</option>
    </>
  );

  const createSelectedAsset = assets.find((a) => a.id === form.asset);
  const createMapCenter = (() => {
    if (createSelectedAsset?.latitude != null && createSelectedAsset?.longitude != null) {
      return [createSelectedAsset.latitude, createSelectedAsset.longitude];
    }
    if (previewReportDetail?.latitude != null && previewReportDetail?.longitude != null) {
      return [previewReportDetail.latitude, previewReportDetail.longitude];
    }
    return null;
  })();

  const editSelectedAsset = assets.find((a) => a.id === editForm.asset);
  const editMapCenter = (() => {
    if (editSelectedAsset?.latitude != null && editSelectedAsset?.longitude != null) {
      return [editSelectedAsset.latitude, editSelectedAsset.longitude];
    }
    if (editPreviewReportDetail?.latitude != null && editPreviewReportDetail?.longitude != null) {
      return [editPreviewReportDetail.latitude, editPreviewReportDetail.longitude];
    }
    return null;
  })();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Bảo trì ({logs.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Hủy bỏ</option>
          </select>
          {isOp && (
            <button className="btn btn-secondary" onClick={() => maintenanceAPI.export({ format: 'csv' })}>
              <Download size={14} /> CSV
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Thêm log
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Asset</label>
                <select className="form-select" required value={form.asset}
                  onChange={(e) => setForm({ ...form, asset: e.target.value })}>
                  <option value="">Chọn asset...</option>
                  {assets.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </div>
              {isTf && (
                <div className="form-group">
                  <label className="form-label">Báo cáo liên quan (tùy chọn)</label>
                  <select className="form-select" value={form.report}
                    onChange={(e) => setForm({ ...form, report: e.target.value })}>
                    <option value="">—</option>
                    {reportsPick.map((r) => (
                      <option key={r.id} value={r.id}>#{String(r.id).slice(0, 8)} — {r.incident_type_display || r.incident_type}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {statusOptsCreate}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lịch</label>
                <input className="form-input" type="datetime-local" value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <textarea className="form-textarea" value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {(createSelectedAsset || previewReportDetail) && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8, fontSize: 12 }}>
                  {createSelectedAsset && (
                    <Link to={`/map?asset=${createSelectedAsset.id}`} style={{ color: 'var(--accent-cyan)' }}>
                      Xem tài sản trên GIS
                    </Link>
                  )}
                  {previewReportDetail && (
                    <Link to={`/map?report=${previewReportDetail.id}`} style={{ color: 'var(--accent-cyan)' }}>
                      Xem báo cáo trên GIS
                    </Link>
                  )}
                </div>
                {createMapCenter && (
                  <LeafletMap
                    height={220}
                    assets={createSelectedAsset ? [createSelectedAsset] : []}
                    reports={previewReportDetail ? [previewReportDetail] : []}
                    mapCenter={createMapCenter}
                    mapZoom={16}
                    showLayerControls={false}
                  />
                )}
              </div>
            )}
            <button type="submit" className="btn btn-primary">Tạo</button>
          </form>
        </div>
      )}

      {editId && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 className="card-title">Sửa log bảo trì</h4>
          <form onSubmit={saveEdit}>
            {isOp ? (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Asset</label>
                  <select className="form-select" required value={editForm.asset}
                    onChange={(e) => setEditForm({ ...editForm, asset: e.target.value })}>
                    {assets.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Kỹ thuật viên (UUID)</label>
                  <input className="form-input" value={editForm.technician}
                    onChange={(e) => setEditForm({ ...editForm, technician: e.target.value })} placeholder="UUID người chịu trách nhiệm" />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Report (UUID, tùy chọn)</label>
                  <input className="form-input" value={editForm.report || ''}
                    onChange={(e) => setEditForm({ ...editForm, report: e.target.value })} />
                </div>
              </div>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  {statusOptsEdit}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Lịch</label>
                <input className="form-input" type="datetime-local" value={editForm.scheduled_at}
                  onChange={(e) => setEditForm({ ...editForm, scheduled_at: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Ghi chú</label>
              <textarea className="form-textarea" value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            {(editSelectedAsset || editPreviewReportDetail) && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8, fontSize: 12 }}>
                  {editSelectedAsset && (
                    <Link to={`/map?asset=${editSelectedAsset.id}`} style={{ color: 'var(--accent-cyan)' }}>
                      Xem tài sản trên GIS
                    </Link>
                  )}
                  {editPreviewReportDetail && (
                    <Link to={`/map?report=${editPreviewReportDetail.id}`} style={{ color: 'var(--accent-cyan)' }}>
                      Xem báo cáo trên GIS
                    </Link>
                  )}
                </div>
                {editMapCenter && (
                  <LeafletMap
                    height={220}
                    assets={editSelectedAsset ? [editSelectedAsset] : []}
                    reports={editPreviewReportDetail ? [editPreviewReportDetail] : []}
                    mapCenter={editMapCenter}
                    mapZoom={16}
                    showLayerControls={false}
                  />
                )}
              </div>
            )}
            <button type="submit" className="btn btn-primary">Lưu</button>
            <button type="button" className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => setEditId(null)}>Hủy</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Asset</th><th>Kỹ thuật viên</th><th>Trạng thái</th><th>Lịch</th><th>Hoàn thành</th><th>Ghi chú</th><th></th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Đang tải...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Chưa có log bảo trì</td></tr>
              ) : logs.map((m) => (
                <tr key={m.id}>
                  <td>{m.asset_name || m.asset}</td>
                  <td>{m.technician_name || '—'}</td>
                  <td><span className={`badge ${STATUS_BADGE[m.status]}`}>{m.status}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('vi') : '—'}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {m.completed_at ? new Date(m.completed_at).toLocaleString('vi') : '—'}
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.notes}</td>
                  <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {m.status !== 'completed' && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setCompleteConfirmId(m.id)}>
                        <CheckCircle size={12} /> Hoàn thành
                      </button>
                    )}
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => openEdit(m)}>
                      <Pencil size={12} />
                    </button>
                    {isOp && (
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => handleDelete(m.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmActionModal
        open={!!completeConfirmId}
        onClose={() => setCompleteConfirmId(null)}
        title="Hoàn thành log bảo trì"
        description="Trạng thái sẽ được ghi là hoàn thành kèm thời điểm đóng. Thao tác này thể hiện kết thúc thực tế của phiên bảo trì và thường không có nút “hoàn tác” trên giao diện."
        confirmLabel="Xác nhận hoàn thành"
        acknowledgeLabel="Tôi xác nhận công việc đã hoàn tất theo hiện trường hoặc chứng từ hợp lệ."
        onConfirm={finalizeMaintenanceComplete}
      />
      <ConfirmActionModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa nhật ký bảo trì"
        description="Bạn có chắc chắn muốn xóa nhật ký bảo trì này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa nhật ký"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  );
}
