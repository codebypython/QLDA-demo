import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReportsStore, useAuthStore, useSettingsStore } from '../store';
import { reportsAPI, aiAPI, usersAPI, areasAPI, assetsAPI, getErrorMessage } from '../services/api';
import { Plus, Upload, Eye, Download, X, CheckCircle, MapPin, ExternalLink } from 'lucide-react';
import LocationPickerModal from '../components/map/LocationPickerModal';
import ConfirmActionModal from '../components/common/ConfirmActionModal';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  pending: 'badge-amber', assigned: 'badge-blue', in_progress: 'badge-purple',
  resolved: 'badge-green', rejected: 'badge-red',
};

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { reports, fetchReports, loading } = useReportsStore();
  const { settings } = useSettingsStore();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [areas, setAreas] = useState([]);
  const [taskforces, setTaskforces] = useState([]);
  const [assignModal, setAssignModal] = useState(null);
  const [pendingClassify, setPendingClassify] = useState(null);
  const [form, setForm] = useState({
    description: '', incident_type: 'other', severity: 'medium',
    latitude: 16.0678, longitude: 108.2208,
  });
  const [imageFile, setImageFile] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [pickMapOpen, setPickMapOpen] = useState(false);
  const [mapAssets, setMapAssets] = useState([]);
  const [finalizeReportId, setFinalizeReportId] = useState(null);

  const isOperator = user?.role === 'operator' || user?.role === 'admin';

  useEffect(() => {
    if (showForm) {
      assetsAPI.list({ bbox: '108.17,16.03,108.26,16.14' }).then(({ data }) => {
        const rows = data.results || data;
        setMapAssets(rows.slice(0, 80));
      }).catch(() => setMapAssets([]));
    }
  }, [showForm]);

  useEffect(() => {
    fetchReports(statusFilter ? { status: statusFilter } : {});
  }, [statusFilter]);

  useEffect(() => {
    areasAPI.list()
      .then(({ data }) => setAreas(data.results || data))
      .catch((err) => toast.error('Không thể tải danh sách khu vực: ' + getErrorMessage(err)));
    if (isOperator) {
      usersAPI.listByRole('taskforce')
        .then(({ data }) => setTaskforces(data))
        .catch((err) => toast.error('Không thể tải danh sách lực lượng tác vụ: ' + getErrorMessage(err)));
    }
  }, [isOperator]);

  const filteredReports = areaFilter
    ? reports.filter((r) => {
        const a = areas.find((x) => x.code === areaFilter);
        if (!a) return true;
        return r.latitude >= a.bbox[1] && r.latitude <= a.bbox[3]
          && r.longitude >= a.bbox[0] && r.longitude <= a.bbox[2];
      })
    : reports;

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setAiResult(null);
    if (!file) return;
    try {
      const { data } = await aiAPI.classify(file);
      setAiResult(data);
      const threshold = settings.ai_confidence_threshold ?? 0.5;
      if (data.primary_class && data.primary_class !== 'unknown') {
        if (data.confidence >= threshold) {
          setForm((f) => ({ ...f, incident_type: data.primary_class }));
          toast.success(`AI: ${data.primary_class} (${(data.confidence * 100).toFixed(0)}%)`);
        } else {
          setPendingClassify(data);
        }
      }
    } catch (err) {
      toast.error('AI service không khả dụng: ' + getErrorMessage(err));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (imageFile) payload.image = imageFile;
      if (aiResult?.confidence) payload.ai_confidence = aiResult.confidence;
      await reportsAPI.create(payload);
      toast.success('Gửi báo cáo thành công!');
      setShowForm(false);
      setImageFile(null);
      setAiResult(null);
      fetchReports();
    } catch (err) {
      toast.error('Lỗi gửi báo cáo: ' + getErrorMessage(err));
    }
  };

  const handleStatusUpdate = async (id, status, extra = {}) => {
    try {
      await reportsAPI.updateStatus(id, { status, ...extra });
      toast.success('Cập nhật trạng thái thành công');
      fetchReports();
      setAssignModal(null);
    } catch (err) {
      toast.error('Lỗi cập nhật: ' + getErrorMessage(err));
      throw new Error('update_failed');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Báo cáo sự cố ({filteredReports.length})</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="assigned">Đã phân công</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="resolved">Đã giải quyết</option>
            <option value="rejected">Từ chối</option>
          </select>
          <select className="form-select" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="">Tất cả khu vực</option>
            {areas.map((a) => (<option key={a.id} value={a.code}>{a.name}</option>))}
          </select>
          {isOperator && (
            <button className="btn btn-secondary" onClick={() => reportsAPI.export({ format: 'csv' })}>
              <Download size={14} /> CSV
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Báo cáo mới
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 className="card-title" style={{ marginBottom: 12 }}>Tạo báo cáo sự cố</h4>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Loại sự cố</label>
                <select className="form-select" value={form.incident_type} onChange={(e) => setForm({ ...form, incident_type: e.target.value })}>
                  <option value="littering">Xả rác</option><option value="pothole">Ổ gà</option>
                  <option value="broken_lamp">Đèn hỏng</option><option value="vandalism">Phá hoại</option>
                  <option value="flooding">Ngập nước</option><option value="crowd">Tụ tập đông</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mức độ</label>
                <select className="form-select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  <option value="low">Thấp</option><option value="medium">Trung bình</option>
                  <option value="high">Cao</option><option value="critical">Nghiêm trọng</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Vĩ độ</label>
                <input className="form-input" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: +e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Kinh độ</label>
                <input className="form-input" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: +e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickMapOpen(true)}>
                <MapPin size={14} /> Chọn trên map
              </button>
              <a
                className="btn btn-secondary btn-sm"
                href={`/map?focus=${encodeURIComponent(`${form.latitude},${form.longitude},16`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={14} /> Mở GIS
              </a>
            </div>
            <div className="form-group">
              <label className="form-label">Mô tả</label>
              <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Hình ảnh (AI sẽ tự phân loại)</label>
              <input type="file" accept="image/*" onChange={handleImageChange} className="form-input" />
              {aiResult && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent-cyan)' }}>
                  AI: {aiResult.primary_class} ({(aiResult.confidence * 100).toFixed(0)}% confidence)
                  {aiResult.mock && ' [mock mode]'}
                </div>
              )}
              {pendingClassify && (
                <div style={{ marginTop: 8, padding: 10, background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: 13, marginBottom: 6 }}>
                    AI confidence thấp ({(pendingClassify.confidence * 100).toFixed(0)}%).
                    Có thể là <strong>{pendingClassify.primary_class}</strong>?
                  </p>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => {
                    setForm((f) => ({ ...f, incident_type: pendingClassify.primary_class }));
                    setPendingClassify(null);
                  }}>Đồng ý</button>
                  <button type="button" className="btn btn-sm btn-secondary" style={{ marginLeft: 6 }}
                    onClick={() => setPendingClassify(null)}>Bỏ qua</button>
                </div>
              )}
            </div>
            <button type="submit" className="btn btn-primary"><Upload size={14} /> Gửi báo cáo</button>
          </form>
          <LocationPickerModal
            open={pickMapOpen}
            onClose={() => setPickMapOpen(false)}
            initialLatitude={form.latitude}
            initialLongitude={form.longitude}
            contextAssets={mapAssets}
            contextReports={Array.isArray(reports) ? reports.slice(0, 50) : []}
            title="Chọn vị trí báo cáo"
            onApply={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
          />
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>ID</th><th>Loại</th><th>Mức độ</th><th>Trạng thái</th><th>AI</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Đang tải...</td></tr>
              ) : filteredReports.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Chưa có báo cáo</td></tr>
              ) : filteredReports.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    <a onClick={() => navigate(`/reports/${r.id}`)} style={{ cursor: 'pointer', color: 'var(--accent-cyan)' }}>
                      {String(r.id).slice(0, 8)}
                    </a>
                  </td>
                  <td><span className="badge badge-blue">{r.incident_type_display || r.incident_type}</span></td>
                  <td><span className={`badge ${r.severity === 'critical' ? 'badge-red' : r.severity === 'high' ? 'badge-amber' : 'badge-blue'}`}>{r.severity_display || r.severity}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status_display || r.status}</span></td>
                  <td>{r.ai_confidence ? `${(r.ai_confidence * 100).toFixed(0)}%` : '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString('vi')}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/reports/${r.id}`)} title="Chi tiết">
                      <Eye size={12} />
                    </button>
                    {isOperator && r.status === 'pending' && (
                      <button className="btn btn-sm btn-primary" onClick={() => setAssignModal(r)}>Phân công</button>
                    )}
                    {isOperator && (r.status === 'assigned' || r.status === 'in_progress') && (
                      <button className="btn btn-sm btn-primary" type="button" onClick={() => setFinalizeReportId(r.id)}>
                        <CheckCircle size={12} /> Hoàn tất
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {assignModal && (
        <AssignModal
          report={assignModal}
          taskforces={taskforces}
          onClose={() => setAssignModal(null)}
          onAssign={(uid) => handleStatusUpdate(assignModal.id, 'assigned', { assigned_to: uid })}
        />
      )}

      <ConfirmActionModal
        open={!!finalizeReportId}
        onClose={() => setFinalizeReportId(null)}
        title="Xác nhận đóng / giải quyết sự cố"
        description="Đánh dấu báo cáo là đã giải quyết là quyết định cuối từ phía điều hành. Luồng xử lý thường không thể hoàn tác bằng một nút; chỉ đóng khi đã kiểm tra đủ chứng cứ và công việc thực địa."
        confirmLabel="Xác nhận đã giải quyết"
        typedPhrase="XÁC NHẬN"
        typedPhraseHint="Nhập chính xác cụm sau (không phân biệt hoa thường):"
        acknowledgeLabel="Tôi đã đối chiếu báo cáo, tác vụ / bình luận liên quan và xác nhận sự cố đã được xử lý đúng quy trình."
        onConfirm={() => handleStatusUpdate(finalizeReportId, 'resolved')}
      />
    </div>
  );
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function AssignModal({ report, taskforces, onClose, onAssign }) {
  const [picked, setPicked] = useState('');
  // Suggestion: nearest by alphabetical (we have no geolocation per user) — fall back to first.
  // If we had user.last_lat/lng, we'd use haversine. Keep placeholder for future.
  const suggested = taskforces[0];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div className="card" style={{ minWidth: 420, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h4 className="card-title">Phân công taskforce</h4>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Báo cáo: {report.incident_type_display} tại ({report.latitude.toFixed(4)}, {report.longitude.toFixed(4)})
        </p>
        {suggested && (
          <div style={{ padding: 10, marginBottom: 12, background: 'rgba(6,182,212,0.1)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Gợi ý:</div>
            <div style={{ fontWeight: 600 }}>{suggested.full_name} ({suggested.email})</div>
            <button className="btn btn-sm btn-primary" style={{ marginTop: 6 }} onClick={() => onAssign(suggested.id)}>
              Phân công người này
            </button>
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Hoặc chọn thủ công</label>
          <select className="form-select" value={picked} onChange={(e) => setPicked(e.target.value)}>
            <option value="">— chọn —</option>
            {taskforces.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" disabled={!picked} onClick={() => onAssign(picked)}>
          Phân công
        </button>
      </div>
    </div>
  );
}
