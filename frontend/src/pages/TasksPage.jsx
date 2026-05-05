import { useEffect, useState } from 'react';
import { tasksAPI } from '../services/api';
import { useAuthStore } from '../store';
import { Plus, CheckCircle, Download, Upload, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

const PRIORITY_BADGE = { low: 'badge-blue', medium: 'badge-amber', high: 'badge-red', urgent: 'badge-red' };
const STATUS_BADGE = { open: 'badge-blue', assigned: 'badge-purple', in_progress: 'badge-amber', completed: 'badge-green' };

export default function TasksPage() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [order, setOrder] = useState('-created_at');
  const [statusFilter, setStatusFilter] = useState('');
  const [completeModal, setCompleteModal] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });

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
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [order, statusFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await tasksAPI.create(form);
      toast.success('Tạo tác vụ thành công!');
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'medium' });
      fetchTasks();
    } catch { toast.error('Lỗi tạo tác vụ'); }
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
    } catch { toast.error('Lỗi'); }
  };

  return (
    <div>
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
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 12, alignItems: 'end' }}>
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
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Tiêu đề</th><th>Liên kết</th><th>Ưu tiên</th><th>Trạng thái</th><th>Người thực hiện</th><th>Ngày tạo</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Đang tải...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Chưa có tác vụ</td></tr>
              ) : tasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.title}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {t.report_summary
                      ? (<a href={`/reports/${t.report}`} style={{ color: 'var(--accent-cyan)' }}>
                          #{String(t.report).slice(0, 8)} {t.report_summary.incident_type_display}
                        </a>)
                      : '—'}
                  </td>
                  <td><span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                  <td>{t.assigned_to_name || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.created_at).toLocaleDateString('vi')}</td>
                  <td>
                    {t.status !== 'completed' && (isTaskforce || canCreate) && (
                      <button className="btn btn-sm btn-primary" onClick={() => setCompleteModal(t)}>
                        <CheckCircle size={14} /> Xong
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {completeModal && (
        <CompleteModal
          task={completeModal}
          onClose={() => setCompleteModal(null)}
          onSubmit={(payload) => handleComplete(completeModal.id, payload)}
        />
      )}
    </div>
  );
}

function CompleteModal({ task, onClose, onSubmit }) {
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div className="card" style={{ minWidth: 420, maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <h4 className="card-title" style={{ marginBottom: 12 }}>Hoàn thành: {task.title}</h4>
        <div className="form-group">
          <label className="form-label">Ghi chú</label>
          <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Ảnh hoàn thành (after)</label>
          <input className="form-input" type="file" accept="image/*"
            onChange={(e) => setImage(e.target.files[0])} />
        </div>
        <button className="btn btn-primary" onClick={() => onSubmit({ notes, image })}>
          <Upload size={14} /> Xác nhận
        </button>
        <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={onClose}>Hủy</button>
      </div>
    </div>
  );
}
