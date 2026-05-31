import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auditAPI } from '../../services/api';

export default function ActivityPage() {
  const [params] = useSearchParams();
  const actor = params.get('actor') || '';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verb, setVerb] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = {};
      if (actor) queryParams.actor = actor;
      if (verb) queryParams.verb = verb;
      const { data } = await auditAPI.list(queryParams);
      setLogs(data.results || data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [actor, verb]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Hoạt động hệ thống ({logs.length})</h3>
        <input className="form-input" placeholder="Filter verb..." style={{ width: 200 }}
          value={verb} onChange={(e) => setVerb(e.target.value)} />
      </div>

      <div className="card">
        <div style={{ position: 'relative', paddingLeft: 24 }}>
          <div style={{
            position: 'absolute', left: 8, top: 0, bottom: 0,
            width: 2, background: 'var(--border-color)',
          }} />
          {loading ? <p>Đang tải...</p> : logs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Không có hoạt động</p>
          ) : logs.map((l) => {
            const friendlyDetails = translateDetails(l.details);
            return (
              <div key={l.id} style={{ position: 'relative', marginBottom: 12, padding: '6px 12px' }}>
                <div style={{
                  position: 'absolute', left: -20, top: 8, width: 12, height: 12,
                  borderRadius: '50%', background: 'var(--accent-cyan)',
                  border: '2px solid var(--bg-card)',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{translateVerb(l.verb)}</strong> đối với <strong>{translateTargetType(l.target_type)}</strong> (Mã: {String(l.target_id).slice(0, 8)})
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {l.actor_name || l.actor_email || 'Hệ thống'}
                      {l.actor_role && (
                        <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px' }}>{l.actor_role}</span>
                      )}
                      {' • '}
                      {new Date(l.created_at).toLocaleString('vi')}
                    </div>
                    {friendlyDetails && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {friendlyDetails}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Activity Log Vietnamese translation helpers
const translateVerb = (verb) => {
  const map = {
    'created': 'Tạo mới',
    'assigned': 'Phân công',
    'started': 'Bắt đầu xử lý',
    'in_progress': 'Đang tiến hành',
    'completed': 'Hoàn thành tác vụ',
    'resolved': 'Giải quyết báo cáo',
    'rejected': 'Từ chối báo cáo',
    'report.status_changed': 'Cập nhật trạng thái',
  };
  return map[verb] || verb;
};

const translateTargetType = (targetType) => {
  const map = {
    'IncidentReport': 'Báo cáo sự cố',
    'Task': 'Tác vụ sửa chữa',
    'Asset': 'Tài sản hạ tầng',
    'MaintenanceLog': 'Nhật ký bảo trì',
  };
  return map[targetType] || targetType;
};

const translateDetails = (details) => {
  if (!details || typeof details !== 'object' || Object.keys(details).length === 0) return null;
  
  const keyMap = {
    'from': 'Trạng thái cũ',
    'to': 'Trạng thái mới',
    'reason': 'Lý do',
    'assigned_to': 'Người đảm nhận',
    'priority': 'Độ ưu tiên',
    'title': 'Tiêu đề',
    'description': 'Mô tả',
    'notes': 'Ghi chú',
    'severity': 'Mức độ',
  };
  
  const statusMap = {
    'pending': 'Chờ duyệt',
    'assigned': 'Đã giao việc',
    'in_progress': 'Đang xử lý',
    'resolved': 'Đã giải quyết',
    'rejected': 'Từ chối',
  };
  
  const priorityMap = {
    'low': 'Thấp',
    'medium': 'Trung bình',
    'high': 'Cao',
    'urgent': 'Khẩn cấp',
  };

  const severityMap = {
    'low': 'Thấp',
    'medium': 'Trung bình',
    'high': 'Cao',
    'critical': 'Nghiêm trọng',
  };

  const parts = [];
  Object.entries(details).forEach(([key, val]) => {
    if (val === null || val === undefined || val === '') return;
    const cleanKey = keyMap[key] || key;
    let cleanVal = String(val);
    if (key === 'from' || key === 'to') cleanVal = statusMap[val] || cleanVal;
    if (key === 'priority') cleanVal = priorityMap[val] || cleanVal;
    if (key === 'severity') cleanVal = severityMap[val] || cleanVal;
    parts.push(`${cleanKey}: "${cleanVal}"`);
  });
  
  return parts.length > 0 ? parts.join(' • ') : null;
};

