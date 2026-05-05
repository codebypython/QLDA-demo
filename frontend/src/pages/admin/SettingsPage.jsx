import { useEffect, useState } from 'react';
import { systemAPI } from '../../services/api';
import { Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    system_name: '',
    logo_url: '',
    ai_confidence_threshold: 0.5,
    default_map_center: { lat: 16.0678, lng: 108.2208, zoom: 14 },
    notification_polling_seconds: 30,
  });

  const load = async () => {
    try {
      const { data } = await systemAPI.getSettings();
      setSettings((s) => ({ ...s, ...data }));
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await systemAPI.updateSettings(settings);
      toast.success('Cập nhật cài đặt thành công');
      load();
    } catch { toast.error('Lỗi lưu'); }
  };

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Cài đặt hệ thống</h3>

      <div className="card" style={{ maxWidth: 720 }}>
        <form onSubmit={save}>
          <div className="form-group">
            <label className="form-label">Tên hệ thống</label>
            <input className="form-input" value={settings.system_name || ''}
              onChange={(e) => setSettings({ ...settings, system_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Logo URL</label>
            <input className="form-input" value={settings.logo_url || ''}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">AI confidence threshold (0-1)</label>
            <input className="form-input" type="number" step="0.05" min="0" max="1"
              value={settings.ai_confidence_threshold ?? 0.5}
              onChange={(e) => setSettings({ ...settings, ai_confidence_threshold: parseFloat(e.target.value) })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Map center lat</label>
              <input className="form-input" type="number" step="any"
                value={settings.default_map_center?.lat ?? 16.0678}
                onChange={(e) => setSettings({
                  ...settings,
                  default_map_center: { ...settings.default_map_center, lat: parseFloat(e.target.value) },
                })} />
            </div>
            <div className="form-group">
              <label className="form-label">Map center lng</label>
              <input className="form-input" type="number" step="any"
                value={settings.default_map_center?.lng ?? 108.2208}
                onChange={(e) => setSettings({
                  ...settings,
                  default_map_center: { ...settings.default_map_center, lng: parseFloat(e.target.value) },
                })} />
            </div>
            <div className="form-group">
              <label className="form-label">Zoom</label>
              <input className="form-input" type="number"
                value={settings.default_map_center?.zoom ?? 14}
                onChange={(e) => setSettings({
                  ...settings,
                  default_map_center: { ...settings.default_map_center, zoom: parseInt(e.target.value, 10) },
                })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Polling thông báo (giây)</label>
            <input className="form-input" type="number"
              value={settings.notification_polling_seconds ?? 30}
              onChange={(e) => setSettings({ ...settings, notification_polling_seconds: parseInt(e.target.value, 10) })} />
          </div>
          <button type="submit" className="btn btn-primary"><Save size={14} /> Lưu</button>
        </form>
      </div>
    </div>
  );
}
