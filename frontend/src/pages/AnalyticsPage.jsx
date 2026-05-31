import { useEffect, useState } from 'react';
import { reportsAPI, getErrorMessage } from '../services/api';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#94a3b8' } } },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(99,179,237,0.05)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(99,179,237,0.05)' } },
  },
};

export default function AnalyticsPage() {
  const [bucket, setBucket] = useState('day');
  const [timeline, setTimeline] = useState([]);
  const [responseTime, setResponseTime] = useState([]);
  const [hourHeatmap, setHourHeatmap] = useState([]);
  const [topAreas, setTopAreas] = useState([]);
  const [aiAccuracy, setAiAccuracy] = useState([]);

  const [loading, setLoading] = useState({
    timeline: false,
    responseTime: false,
    hourHeatmap: false,
    topAreas: false,
    aiAccuracy: false,
  });

  const [errors, setErrors] = useState({
    timeline: '',
    responseTime: '',
    hourHeatmap: '',
    topAreas: '',
    aiAccuracy: '',
  });

  const loadTimeline = () => {
    setLoading(prev => ({ ...prev, timeline: true }));
    setErrors(prev => ({ ...prev, timeline: '' }));
    reportsAPI.analytics.timeline(bucket)
      .then(({ data }) => setTimeline(data))
      .catch((err) => setErrors(prev => ({ ...prev, timeline: 'Không thể tải biểu đồ: ' + getErrorMessage(err) })))
      .finally(() => setLoading(prev => ({ ...prev, timeline: false })));
  };

  const loadResponseTime = () => {
    setLoading(prev => ({ ...prev, responseTime: true }));
    setErrors(prev => ({ ...prev, responseTime: '' }));
    reportsAPI.analytics.responseTime()
      .then(({ data }) => setResponseTime(data))
      .catch((err) => setErrors(prev => ({ ...prev, responseTime: 'Không thể tải biểu đồ: ' + getErrorMessage(err) })))
      .finally(() => setLoading(prev => ({ ...prev, responseTime: false })));
  };

  const loadHourHeatmap = () => {
    setLoading(prev => ({ ...prev, hourHeatmap: true }));
    setErrors(prev => ({ ...prev, hourHeatmap: '' }));
    reportsAPI.analytics.hourHeatmap()
      .then(({ data }) => setHourHeatmap(data))
      .catch((err) => setErrors(prev => ({ ...prev, hourHeatmap: 'Không thể tải biểu đồ: ' + getErrorMessage(err) })))
      .finally(() => setLoading(prev => ({ ...prev, hourHeatmap: false })));
  };

  const loadTopAreas = () => {
    setLoading(prev => ({ ...prev, topAreas: true }));
    setErrors(prev => ({ ...prev, topAreas: '' }));
    reportsAPI.analytics.topAreas()
      .then(({ data }) => setTopAreas(data))
      .catch((err) => setErrors(prev => ({ ...prev, topAreas: 'Không thể tải biểu đồ: ' + getErrorMessage(err) })))
      .finally(() => setLoading(prev => ({ ...prev, topAreas: false })));
  };

  const loadAiAccuracy = () => {
    setLoading(prev => ({ ...prev, aiAccuracy: true }));
    setErrors(prev => ({ ...prev, aiAccuracy: '' }));
    reportsAPI.analytics.aiAccuracy()
      .then(({ data }) => setAiAccuracy(data))
      .catch((err) => setErrors(prev => ({ ...prev, aiAccuracy: 'Không thể tải biểu đồ: ' + getErrorMessage(err) })))
      .finally(() => setLoading(prev => ({ ...prev, aiAccuracy: false })));
  };

  useEffect(() => {
    loadTimeline();
  }, [bucket]);

  useEffect(() => {
    loadResponseTime();
    loadHourHeatmap();
    loadTopAreas();
    loadAiAccuracy();
  }, []);

  const renderChartContainer = (loadingVal, errorVal, emptyVal, chartComponent, reloadFn) => {
    if (loadingVal) {
      return <div className="map-fallback"><p>Đang tải dữ liệu biểu đồ...</p></div>;
    }
    if (errorVal) {
      return (
        <div className="map-fallback" style={{ display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--accent-red)', fontSize: 13, padding: '0 16px', margin: 0, textAlign: 'center' }}>{errorVal}</p>
          <button className="btn btn-secondary btn-sm" onClick={reloadFn}>Tải lại</button>
        </div>
      );
    }
    if (emptyVal) {
      return <div className="map-fallback"><p>Chưa có dữ liệu</p></div>;
    }
    return chartComponent;
  };

  const timelineData = {
    labels: timeline.map((t) => t.date ? new Date(t.date).toLocaleDateString('vi') : ''),
    datasets: [{
      label: 'Số báo cáo',
      data: timeline.map((t) => t.count),
      borderColor: '#06b6d4',
      backgroundColor: 'rgba(6,182,212,0.2)',
      fill: true, tension: 0.3,
    }],
  };

  const responseData = {
    labels: responseTime.map((r) => r.incident_type),
    datasets: [{
      label: 'Giờ trung bình',
      data: responseTime.map((r) => (r.avg_seconds / 3600).toFixed(2)),
      backgroundColor: '#3b82f6',
    }],
  };

  const hourData = {
    labels: hourHeatmap.map((h) => `${h.hour}h`),
    datasets: [{
      label: 'Số báo cáo theo giờ',
      data: hourHeatmap.map((h) => h.count),
      backgroundColor: 'rgba(245,158,11,0.6)',
    }],
  };

  const areaData = {
    labels: topAreas.map((a) => a.area_name),
    datasets: [{
      label: 'Số báo cáo',
      data: topAreas.map((a) => a.count),
      backgroundColor: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    }],
  };

  const aiData = {
    labels: aiAccuracy.map((a) => a.bucket),
    datasets: [{
      data: aiAccuracy.map((a) => a.count),
      backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
    }],
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Phân tích nâng cao</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {['day', 'week', 'month'].map((b) => (
            <button key={b}
              className={`btn btn-sm ${bucket === b ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setBucket(b)}>
              {b === 'day' ? 'Ngày' : b === 'week' ? 'Tuần' : 'Tháng'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h4 className="card-title">Số báo cáo theo {bucket === 'day' ? 'ngày' : bucket === 'week' ? 'tuần' : 'tháng'}</h4>
          <div style={{ height: 280 }}>
            {renderChartContainer(
              loading.timeline,
              errors.timeline,
              timeline.length === 0,
              <Line data={timelineData} options={chartOptions} />,
              loadTimeline
            )}
          </div>
        </div>

        <div className="card">
          <h4 className="card-title">Thời gian phản hồi (giờ)</h4>
          <div style={{ height: 280 }}>
            {renderChartContainer(
              loading.responseTime,
              errors.responseTime,
              responseTime.length === 0,
              <Bar data={responseData} options={chartOptions} />,
              loadResponseTime
            )}
          </div>
        </div>

        <div className="card">
          <h4 className="card-title">Báo cáo theo giờ trong ngày</h4>
          <div style={{ height: 280 }}>
            {renderChartContainer(
              loading.hourHeatmap,
              errors.hourHeatmap,
              hourHeatmap.length === 0,
              <Bar data={hourData} options={chartOptions} />,
              loadHourHeatmap
            )}
          </div>
        </div>

        <div className="card">
          <h4 className="card-title">Top khu vực</h4>
          <div style={{ height: 280 }}>
            {renderChartContainer(
              loading.topAreas,
              errors.topAreas,
              topAreas.length === 0,
              <Bar data={areaData} options={chartOptions} />,
              loadTopAreas
            )}
          </div>
        </div>

        <div className="card">
          <h4 className="card-title">Phân bố confidence AI</h4>
          <div style={{ height: 280 }}>
            {renderChartContainer(
              loading.aiAccuracy,
              errors.aiAccuracy,
              aiAccuracy.length === 0,
              <Doughnut data={aiData} options={{ ...chartOptions, scales: undefined }} />,
              loadAiAccuracy
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
