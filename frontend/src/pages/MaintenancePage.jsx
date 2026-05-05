import { useEffect, useState } from 'react';
import { maintenanceAPI, assetsAPI } from '../services/api';
import { Plus, CheckCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  scheduled: 'badge-blue', in_progress: 'badge-amber',
  completed: 'badge-green', cancelled: 'badge-red',
};

export default function MaintenancePage() {
  const [logs, setLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    asset: '', status: 'scheduled', scheduled_at: '', notes: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const { data } = await maintenanceAPI.list(params);
      setLogs(data.results || data);
    } catch { toast.error('Lỗi tải log'); }
    setLoading(false);
  };

  useEffect(() => {
    assetsAPI.list().then(({ data }) => setAssets(data.results || data)).catch(() => {});
  }, []);
  useEffect(() => { fetchLogs(); }, [statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await maintenanceAPI.create(form);
      toast.success('Tạo log bảo trì');
      setShowForm(false);
      setForm({ asset: '', status: 'scheduled', scheduled_at: '', notes: '' });
      fetchLogs();
    } catch { toast.error('Lỗi tạo log'); }
  };

  const handleComplete = async (id) => {
    try {
      await maintenanceAPI.update(id, { status: 'completed' });
      toast.success('Đánh dấu hoàn thành');
      fetchLogs();
    } catch { toast.error('Lỗi'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Bảo trì ({logs.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="in_progress">Đang thực hiện</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Hủy bỏ</option>
          </select>
          <button className="btn btn-secondary" onClick={() => maintenanceAPI.export({ format: 'csv' })}>
            <Download size={14} /> CSV
          </button>
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
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="scheduled">Đã lên lịch</option>
                  <option value="in_progress">Đang thực hiện</option>
                  <option value="completed">Hoàn thành</option>
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
            <button type="submit" className="btn btn-primary">Tạo</button>
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
                  <td>
                    {m.status !== 'completed' && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleComplete(m.id)}>
                        <CheckCircle size={12} /> Hoàn thành
                      </button>
                    )}
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
