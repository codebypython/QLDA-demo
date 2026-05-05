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
          ) : logs.map((l) => (
            <div key={l.id} style={{ position: 'relative', marginBottom: 12, padding: '6px 12px' }}>
              <div style={{
                position: 'absolute', left: -20, top: 8, width: 12, height: 12,
                borderRadius: '50%', background: 'var(--accent-cyan)',
                border: '2px solid var(--bg-card)',
              }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{l.verb}</strong> on {l.target_type} #{String(l.target_id).slice(0, 8)}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {l.actor_name || l.actor_email || 'Hệ thống'}
                    {l.actor_role && (
                      <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px' }}>{l.actor_role}</span>
                    )}
                    {' • '}
                    {new Date(l.created_at).toLocaleString('vi')}
                  </div>
                  {l.details && Object.keys(l.details).length > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {JSON.stringify(l.details)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
