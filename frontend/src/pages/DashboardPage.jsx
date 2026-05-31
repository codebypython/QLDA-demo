import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssetsStore, useReportsStore, useAuthStore } from '../store';
import { reportsAPI, tasksAPI, usersAPI, assetsAPI, getErrorMessage } from '../services/api';
import {
  Package, AlertTriangle, CheckCircle, Clock, Users, Activity,
  ClipboardList, Plus,
} from 'lucide-react';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement,
  Tooltip, Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8' } } },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(99,179,237,0.05)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(99,179,237,0.05)' } },
  },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const role = user?.role || 'citizen';
  if (role === 'citizen') return <CitizenDashboard />;
  if (role === 'taskforce') return <TaskforceDashboard />;
  return <OperatorDashboard isAdmin={role === 'admin'} />;
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon"><Icon size={40} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function CitizenDashboard() {
  const [myReports, setMyReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadMyReports = () => {
    setLoading(true);
    setError('');
    reportsAPI.list()
      .then(({ data }) => setMyReports(data.results || data))
      .catch((err) => setError('Không thể tải báo cáo của bạn: ' + getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMyReports(); }, []);

  const total = myReports.length;
  const resolved = myReports.filter((r) => r.status === 'resolved').length;
  const pending = myReports.filter((r) => r.status === 'pending').length;

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải thông tin dashboard...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }} className="card">
        <p style={{ color: 'var(--accent-red)', marginBottom: 12 }}>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={loadMyReports}>Thử lại</button>
      </div>
    );
  }

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={AlertTriangle} value={total} label="Báo cáo của tôi" color="blue" />
        <StatCard icon={Clock} value={pending} label="Chờ xử lý" color="amber" />
        <StatCard icon={CheckCircle} value={resolved} label="Đã giải quyết" color="green" />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="card-title">Báo cáo gần đây của tôi</h3>
          <Link to="/reports" className="btn btn-primary btn-sm"><Plus size={14} /> Tạo báo cáo</Link>
        </div>
        {myReports.slice(0, 8).map((r) => (
          <div key={r.id} style={{
            padding: 12, borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>{r.incident_type_display}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(r.created_at).toLocaleString('vi')}
              </div>
            </div>
            <Link to={`/reports/${r.id}`} className="btn btn-sm btn-secondary">Chi tiết</Link>
          </div>
        ))}
        {myReports.length === 0 && (
          <p style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
            Bạn chưa có báo cáo nào. <Link to="/reports">Tạo báo cáo đầu tiên</Link>
          </p>
        )}
      </div>
    </div>
  );
}

function TaskforceDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadTasks = () => {
    setLoading(true);
    setError('');
    tasksAPI.list({ assigned_to: 'me', order: 'priority' })
      .then(({ data }) => setTasks(data.results || data))
      .catch((err) => setError('Không thể tải danh sách tác vụ của bạn: ' + getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTasks(); }, []);

  const pending = tasks.filter((t) => t.status !== 'completed').length;
  const done = tasks.filter((t) => t.status === 'completed').length;
  const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'completed').length;

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách tác vụ...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }} className="card">
        <p style={{ color: 'var(--accent-red)', marginBottom: 12 }}>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={loadTasks}>Thử lại</button>
      </div>
    );
  }

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={ClipboardList} value={pending} label="Tác vụ đang nhận" color="amber" />
        <StatCard icon={AlertTriangle} value={urgent} label="Khẩn cấp" color="red" />
        <StatCard icon={CheckCircle} value={done} label="Đã hoàn thành" color="green" />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 className="card-title">Tác vụ ưu tiên</h3>
        {tasks.filter((t) => t.status !== 'completed').slice(0, 10).map((t) => (
          <div key={t.id} style={{
            padding: 12, borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Ưu tiên: <span className="badge badge-amber">{t.priority}</span>
                {t.report_summary && (
                  <span style={{ marginLeft: 8 }}>
                    Vị trí: {t.report_summary.latitude?.toFixed(4)}, {t.report_summary.longitude?.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            <Link to={`/tasks`} className="btn btn-sm btn-primary">Xử lý</Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperatorDashboard({ isAdmin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assetStats, setAssetStats] = useState(null);
  const [reportStats, setReportStats] = useState(null);
  const [taskforces, setTaskforces] = useState([]);

  const loadOperatorData = async () => {
    setLoading(true);
    setError('');
    try {
      const promises = [
        assetsAPI.stats(),
        reportsAPI.stats()
      ];
      if (isAdmin) {
        promises.push(usersAPI.adminList());
      }
      const results = await Promise.all(promises);
      setAssetStats(results[0].data);
      setReportStats(results[1].data);
      if (isAdmin) {
        setTaskforces(results[2].data.results || results[2].data);
      }
    } catch (err) {
      setError('Không thể tải dữ liệu phân tích vận hành: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOperatorData(); }, [isAdmin]);

  const totalAssets = assetStats?.total || 0;
  const totalReports = reportStats?.total || 0;
  const resolvedReports = reportStats?.by_status?.find((s) => s.status === 'resolved')?.count || 0;
  const pendingReports = reportStats?.by_status?.find((s) => s.status === 'pending')?.count || 0;

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tính toán thống kê vận hành...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }} className="card">
        <p style={{ color: 'var(--accent-red)', marginBottom: 12 }}>{error}</p>
        <button className="btn btn-primary btn-sm" onClick={loadOperatorData}>Thử lại</button>
      </div>
    );
  }

  const assetTypeData = {
    labels: Object.keys(assetStats?.by_type || {}),
    datasets: [{
      data: Object.values(assetStats?.by_type || {}),
      backgroundColor: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderWidth: 0,
    }],
  };

  const reportTypeData = {
    labels: (reportStats?.by_type || []).map((r) => r.incident_type),
    datasets: [{
      label: 'Số lượng',
      data: (reportStats?.by_type || []).map((r) => r.count),
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: '#3b82f6', borderWidth: 1, borderRadius: 6,
    }],
  };

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={Package} value={totalAssets} label="Tài sản hạ tầng" color="blue" />
        <StatCard icon={AlertTriangle} value={totalReports} label="Báo cáo sự cố" color="amber" />
        <StatCard icon={CheckCircle} value={resolvedReports} label="Đã giải quyết" color="green" />
        <StatCard icon={Clock} value={pendingReports} label="Chờ xử lý" color="red" />
        {isAdmin && (
          <StatCard icon={Users} value={taskforces.length} label="Người dùng" color="blue" />
        )}
      </div>

      <div className="charts-grid" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Phân bố tài sản</h3>
          </div>
          <div style={{ height: 280 }}>
            {totalAssets > 0
              ? <Doughnut data={assetTypeData} options={{ ...chartOptions, scales: undefined }} />
              : <div className="map-fallback"><p>Chưa có dữ liệu</p></div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Sự cố theo loại</h3>
          </div>
          <div style={{ height: 280 }}>
            {totalReports > 0 ? <Bar data={reportTypeData} options={chartOptions} />
              : <div className="map-fallback"><p>Chưa có dữ liệu</p></div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 className="card-title">Truy cập nhanh</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <Link to="/reports?status=pending" className="btn btn-secondary">
            <Clock size={14} /> Báo cáo chờ xử lý ({pendingReports})
          </Link>
          <Link to="/analytics" className="btn btn-secondary">
            <Activity size={14} /> Phân tích nâng cao
          </Link>
          {isAdmin && (
            <Link to="/admin/activity" className="btn btn-secondary">
              <Activity size={14} /> Hoạt động hệ thống
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
