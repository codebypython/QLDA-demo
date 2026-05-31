import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportsAPI, usersAPI, getErrorMessage } from '../services/api';
import { useAuthStore } from '../store';
import LeafletMap from '../components/map/LeafletMap';
import ConfirmActionModal from '../components/common/ConfirmActionModal';
import {
  ArrowLeft, MessageSquare, Send, CheckCircle, X, Image as ImageIcon,
  Pencil, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  pending: 'badge-amber', assigned: 'badge-blue', in_progress: 'badge-purple',
  resolved: 'badge-green', rejected: 'badge-red',
};

const INCIDENT_OPTS = [
  ['littering', 'Xả rác'], ['pothole', 'Ổ gà'], ['broken_lamp', 'Đèn hỏng'],
  ['vandalism', 'Phá hoại'], ['flooding', 'Ngập nước'], ['crowd', 'Tụ tập đông'], ['other', 'Khác'],
];

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
  const [editReportOpen, setEditReportOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ description: '', incident_type: 'other', severity: 'medium' });
  const [reportImageFile, setReportImageFile] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [resolveConfirmOpen, setResolveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [deleteReportOpen, setDeleteReportOpen] = useState(false);
  const [deleteCommentId, setDeleteCommentId] = useState(null);

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
      toast.error('Không tải được báo cáo: ' + getErrorMessage(err));
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
    } catch (err) {
      toast.error('Lỗi gửi bình luận: ' + getErrorMessage(err));
    }
  };

  const updateStatus = async (newStatus, extra = {}) => {
    try {
      await reportsAPI.updateStatus(id, { status: newStatus, ...extra });
      toast.success('Đã cập nhật trạng thái');
      load();
    } catch (err) {
      toast.error('Lỗi cập nhật: ' + getErrorMessage(err));
      throw err;
    }
  };

  const handleAssign = () => {
    if (!assignTo) {
      toast.error('Chọn taskforce member');
      return;
    }
    updateStatus('assigned', { assigned_to: assignTo });
  };

  const openReportEdit = () => {
    if (!report) return;
    setReportForm({
      description: report.description || '',
      incident_type: report.incident_type || 'other',
      severity: report.severity || 'medium',
    });
    setReportImageFile(null);
    setEditReportOpen(true);
  };

  const submitReportEdit = async (e) => {
    e.preventDefault();
    const fd = { ...reportForm };
    if (reportImageFile) fd.image = reportImageFile;
    try {
      await reportsAPI.update(id, fd);
      toast.success('Đã lưu');
      setEditReportOpen(false);
      load();
    } catch (err) {
      toast.error('Không lưu được báo cáo: ' + getErrorMessage(err));
    }
  };

  const deleteReport = () => {
    setDeleteReportOpen(true);
  };

  const handleDeleteReportConfirm = async () => {
    try {
      await reportsAPI.delete(id);
      toast.success('Đã xóa báo cáo thành công');
      navigate('/reports');
    } catch (err) {
      toast.error('Không xóa được báo cáo: ' + getErrorMessage(err));
    }
  };

  const startEditComment = (c) => {
    setEditingCommentId(c.id);
    setEditingCommentBody(c.body);
  };

  const saveCommentEdit = async (commentId) => {
    try {
      await reportsAPI.patchComment(id, commentId, editingCommentBody);
      setEditingCommentId(null);
      load();
    } catch (err) {
      toast.error('Lỗi cập nhật bình luận: ' + getErrorMessage(err));
    }
  };

  const deleteComment = (commentId) => {
    setDeleteCommentId(commentId);
  };

  const handleDeleteCommentConfirm = async () => {
    if (!deleteCommentId) return;
    try {
      await reportsAPI.deleteComment(id, deleteCommentId);
      toast.success('Đã xóa bình luận thành công');
      load();
    } catch (err) {
      toast.error('Lỗi xóa bình luận: ' + getErrorMessage(err));
    }
  };

  if (!report) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;
  }

  const isOperator = user?.role === 'operator' || user?.role === 'admin';
  const isReporter = user && String(report.reporter) === String(user.id);
  const citizenCanEditPending = isReporter && user?.role === 'citizen' && report.status === 'pending';
  const operatorCanEdit = isOperator;
  const canEditReportFields = citizenCanEditPending || operatorCanEdit;
  const citizenCanDelete = isReporter && user?.role === 'citizen' && report.status === 'pending';
  const operatorCanDelete = isOperator;
  const taskWithImage = report.tasks?.find?.((t) => t.completion_image);

  const commentCanEdit = (c) => (
    user && (String(c.author) === String(user.id) || isOperator)
  );
  const commentCanDelete = (c) => (
    user && (String(c.author) === String(user.id) || isOperator)
  );

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
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className={`badge ${STATUS_BADGE[report.status]}`}>{report.status_display}</span>
                  <span className="badge badge-amber">{report.severity_display}</span>
                  {report.ai_confidence && (
                    <span className="badge badge-blue">AI {(report.ai_confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {canEditReportFields && (
                  <button type="button" className="btn btn-sm btn-secondary" onClick={openReportEdit}>
                    <Pencil size={14} /> Sửa
                  </button>
                )}
                {(citizenCanDelete || operatorCanDelete) && (
                  <button type="button" className="btn btn-sm btn-secondary" onClick={deleteReport}>
                    <Trash2 size={14} /> Xóa
                  </button>
                )}
                {isOperator && report.status !== 'resolved' && report.status !== 'rejected' && (
                  <>
                    {report.status === 'pending' && (
                      <>
                        <select className="form-select" value={assignTo} onChange={(e) => setAssignTo(e.target.value)} style={{ minWidth: 160 }}>
                          <option value="">Chọn taskforce...</option>
                          {taskforces.map((t) => (
                            <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                          ))}
                        </select>
                        <button className="btn btn-sm btn-primary" onClick={handleAssign}>Phân công</button>
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRejectConfirmOpen(true)}>
                          <X size={14} /> Từ chối
                        </button>
                      </>
                    )}
                    {(report.status === 'assigned' || report.status === 'in_progress') && (
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => setResolveConfirmOpen(true)}>
                        <CheckCircle size={14} /> Hoàn tất
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {editReportOpen ? (
              <form onSubmit={submitReportEdit} style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Loại sự cố</label>
                    <select className="form-select" value={reportForm.incident_type} onChange={(e) => setReportForm({ ...reportForm, incident_type: e.target.value })}>
                      {INCIDENT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mức độ</label>
                    <select className="form-select" value={reportForm.severity} onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })}>
                      <option value="low">Thấp</option><option value="medium">Trung bình</option>
                      <option value="high">Cao</option><option value="critical">Nghiêm trọng</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả</label>
                  <textarea className="form-textarea" value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Ảnh mới (tùy chọn)</label>
                  <input type="file" accept="image/*" className="form-input" onChange={(e) => setReportImageFile(e.target.files[0] || null)} />
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Lưu</button>
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={() => setEditReportOpen(false)}>Hủy</button>
              </form>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>{report.description}</p>
            )}
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
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>{c.author_name || c.author_email}</strong>
                      {' • '}
                      <span className="badge badge-blue" style={{ fontSize: 9, padding: '2px 6px' }}>{c.author_role}</span>
                      {' • '}
                      {new Date(c.created_at).toLocaleString('vi')}
                    </span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      {commentCanEdit(c) && (
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => startEditComment(c)}><Pencil size={12} /></button>
                      )}
                      {commentCanDelete(c) && (
                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => deleteComment(c.id)}><Trash2 size={12} /></button>
                      )}
                    </span>
                  </div>
                  {editingCommentId === c.id ? (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input className="form-input" style={{ flex: 1, minWidth: 200 }} value={editingCommentBody} onChange={(e) => setEditingCommentBody(e.target.value)} />
                      <button type="button" className="btn btn-sm btn-primary" onClick={() => saveCommentEdit(c.id)}>Lưu</button>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingCommentId(null)}>Hủy</button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 4 }}>{c.body}</div>
                  )}
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

      <ConfirmActionModal
        open={resolveConfirmOpen}
        onClose={() => setResolveConfirmOpen(false)}
        title="Xác nhận đóng / giải quyết sự cố"
        description="Đánh dấu báo cáo là đã giải quyết là quyết định cuối. Luồng xử lý thường không thể hoàn tác bằng một nút; chỉ thực hiện khi đã kiểm tra chứng cứ và công việc thực địa."
        confirmLabel="Xác nhận đã giải quyết"
        typedPhrase="XÁC NHẬN"
        typedPhraseHint="Nhập chính xác cụm sau (không phân biệt hoa thường):"
        acknowledgeLabel="Tôi đã đối chiếu báo cáo, tác vụ / bình luận liên quan và xác nhận sự cố đã được xử lý đúng quy trình."
        onConfirm={() => updateStatus('resolved')}
      />
      <ConfirmActionModal
        open={rejectConfirmOpen}
        onClose={() => setRejectConfirmOpen(false)}
        title="Từ chối báo cáo"
        description="Báo cáo sẽ được đánh dấu từ chối với lý do hệ thống mặc định. Xem lại nội dung và trách nhiệm trước khi tiếp tục."
        confirmLabel="Từ chối báo cáo"
        acknowledgeLabel="Tôi xác nhận muốn từ chối báo cáo này và hiểu thao tác có tính chất cuối cùng đối với luồng xử lý chuẩn."
        onConfirm={() => updateStatus('rejected', { reason: 'Không đủ điều kiện' })}
      />
      <ConfirmActionModal
        open={deleteReportOpen}
        onClose={() => setDeleteReportOpen(false)}
        onConfirm={handleDeleteReportConfirm}
        title="Xác nhận xóa báo cáo sự cố"
        description="Bạn có chắc chắn muốn xóa báo cáo sự cố này? Tất cả các bình luận, hoạt động và liên kết tác vụ có liên quan sẽ bị hủy và hành động này KHÔNG THỂ HOÀN TÁC."
        confirmLabel="Xóa báo cáo"
        cancelLabel="Hủy"
        variant="danger"
      />
      <ConfirmActionModal
        open={!!deleteCommentId}
        onClose={() => setDeleteCommentId(null)}
        onConfirm={handleDeleteCommentConfirm}
        title="Xác nhận xóa bình luận"
        description="Bạn có chắc chắn muốn xóa bình luận này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa bình luận"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  );
}
