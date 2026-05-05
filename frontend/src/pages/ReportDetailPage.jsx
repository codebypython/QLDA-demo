import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { reportsAPI, usersAPI } from '../services/api';
import { useAuthStore } from '../store';
import LeafletMap from '../components/map/LeafletMap';
import { ArrowLeft, MessageSquare, Send, CheckCircle, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  pending: 'badge-amber', assigned: 'badge-blue', in_progress: 'badge-purple',
  resolved: 'badge-green', rejected: 'badge-red',
};

export default function ReportDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [report, setReport] = useState(null);
  const [comments, setComments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [body, setBody] = useState('');
  const [taskforces, setTaskforces] = useState([]);
  const [assignTo, setAssignTo] = useState('');

  const load = async () => {
    try {
      const [{ data: r }, { data: c }, { data: t }] = await Promise.all([
        reportsAPI.get(id),
        reportsAPI.comments(id),
        reportsAPI.timeline(id),
      ]);
      setReport(r);
      setComments(c);
      setTimeline(t);
    } catch (err) {
      toast.error('Không tải được báo cáo');
    }
  };

  useEffect(() => {
    load();
    if (user && (user.role === 'operator' || user.role === 'admin')) {
      usersAPI.listByRole('taskforce').then(({ data }) => setTaskforces(data)).catch(() => {});
    }
  }, [id, user?.role]);

  const sendComment = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await reportsAPI.addComment(id, body);
      setBody('');
      load();
    } catch { toast.error('Lỗi gửi bình luận'); }
  };

  const updateStatus = async (newStatus, extra = {}) => {
    try {
      await reportsAPI.updateStatus(id, { status: newStatus, ...extra });
      toast.success('Đã cập nhật trạng thái');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Lỗi cập nhật');
    }
  };

  const handleAssign = () => {
    if (!assignTo) {
      toast.error('Chọn taskforce member');
      return;
    }
    updateStatus('assigned', { assigned_to: assignTo });
  };

  if (!report) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
  }

  const isOperator = user?.role === 'operator' || user?.role === 'admin';
  const taskWithImage = report.tasks?.find?.((t) => t.completion_image);

  return (
    <div>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
        <ArrowLeft size={14} /> Quay lại
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>
                  {report.incident_type_display} #{String(report.id).slice(0, 8)}
                </h3>
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <span className={`badge ${STATUS_BADGE[report.status]}`}>{report.status_display}</span>
                  <span className="badge badge-amber">{report.severity_display}</span>
                  {report.ai_confidence && (
                    <span className="badge badge-blue">AI {(report.ai_confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
              {isOperator && report.status !== 'resolved' && report.status !== 'rejected' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {report.status === 'pending' && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <select className="form-select" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={{ minWidth: 180 }}>
                        <option value="">Chọn taskforce...</option>
                        {taskforces.map((t) => (
                          <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                        ))}
                      </select>
                      <button className="btn btn-sm btn-primary" onClick={handleAssign}>Phân công</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => updateStatus('rejected', { reason: 'Không đủ điều kiện' })}>
                        <X size={14} /> Từ chối
                      </button>
                    </div>
                  )}
                  {(report.status === 'assigned' || report.status === 'in_progress') && (
                    <button className="btn btn-sm btn-primary" onClick={() => updateStatus('resolved')}>
                      <CheckCircle size={14} /> Hoàn tất
                    </button>
                  )}
                </div>
              )}
            </div>

            <p style={{ color: 'var(--text-secondary)' }}>{report.description}</p>
            <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              Báo cáo bởi: {report.reporter_name || '—'} • {new Date(report.created_at).toLocaleString('vi')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {report.image && (
              <div className="card">
                <h4 className="card-title"><ImageIcon size={14} /> Ảnh báo cáo (before)</h4>
                <img src={report.image} alt="report" style={{ width: '100%', borderRadius: 'var(--radius-sm)', marginTop: 8 }} />
              </div>
            )}
            {taskWithImage && (
              <div className="card">
                <h4 className="card-title"><CheckCircle size={14} /> Ảnh hoàn thành (after)</h4>
                <img src={taskWithImage.completion_image} alt="after" style={{ width: '100%', borderRadius: 'var(--radius-sm)', marginTop: 8 }} />
              </div>
            )}
          </div>

          <div className="card" style={{ height: 300, marginBottom: 16 }}>
            <h4 className="card-title" style={{ marginBottom: 8 }}>Vị trí</h4>
            <div style={{ height: 240 }}>
              <LeafletMap reports={[report]} />
            </div>
          </div>

          <div className="card">
            <h4 className="card-title" style={{ marginBottom: 12 }}>
              <MessageSquare size={14} /> Bình luận ({comments.length})
            </h4>
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 12 }}>
              {comments.map((c) => (
                <div key={c.id} style={{
                  padding: 10, borderRadius: 'var(--radius-sm)',
                  marginBottom: 8, background: 'var(--bg-card-hover)',
                }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{c.author_name || c.author_email}</strong>
                    {' • '}
                    <span className="badge badge-blue" style={{ fontSize: 9, padding: '2px 6px' }}>{c.author_role}</span>
                    {' • '}
                    {new Date(c.created_at).toLocaleString('vi')}
                  </div>
                  <div style={{ marginTop: 4 }}>{c.body}</div>
                </div>
              ))}
            </div>
            <form onSubmit={sendComment} style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" placeholder="Viết bình luận..." value={body}
                onChange={(e) => setBody(e.target.value)} />
              <button type="submit" className="btn btn-primary"><Send size={14} /></button>
            </form>
          </div>
        </div>

        <div className="card">
          <h4 className="card-title" style={{ marginBottom: 12 }}>Timeline</h4>
          <div style={{ position: 'relative', paddingLeft: 16 }}>
            <div style={{
              position: 'absolute', left: 4, top: 8, bottom: 8,
              width: 2, background: 'var(--border-color)',
            }} />
            {timeline.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có hoạt động</p>
            )}
            {timeline.map((t) => (
              <div key={t.id} style={{ position: 'relative', marginBottom: 12 }}>
                <div style={{
                  position: 'absolute', left: -16, top: 4, width: 10, height: 10,
                  borderRadius: '50%', background: 'var(--accent-cyan)',
                }} />
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.verb}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {t.actor_name || t.actor_email || 'Hệ thống'} • {new Date(t.created_at).toLocaleString('vi')}
                </div>
                {t.details && Object.keys(t.details).length > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {Object.entries(t.details).map(([k, v]) => (
                      <span key={k}>{k}: {String(v)}; </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
