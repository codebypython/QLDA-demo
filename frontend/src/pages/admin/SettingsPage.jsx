import { useEffect, useState } from 'react';
import { systemAPI } from '../../services/api';
import { Save, Upload, Trash2, Shield } from 'lucide-react';
import { useSettingsStore } from '../../store';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { fetchSettings } = useSettingsStore();
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
      
      // Instantly propagate branding changes to sidebar layout
      await fetchSettings();
      load();
    } catch { 
      toast.error('Lỗi khi lưu cài đặt'); 
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Cài đặt hệ thống</h3>

      <div className="card" style={{ maxWidth: 720 }}>
        <form onSubmit={save}>
          
          {/* System Name */}
          <div className="form-group">
            <label className="form-label">Tên hệ thống</label>
            <input className="form-input" value={settings.system_name || ''}
              onChange={(e) => setSettings({ ...settings, system_name: e.target.value })} />
          </div>

          {/* Logo Uploader & Preview (Replaces old text input URL paste) */}
          <div className="form-group">
            <label className="form-label">Logo hệ thống</label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8 }}>
              
              {/* Logo Preview Box */}
              <div style={{
                width: 80, height: 80, borderRadius: 'var(--radius)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0
              }}>
                {settings.logo_url ? (
                  <img 
                    src={settings.logo_url} 
                    alt="Logo Preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  />
                ) : (
                  <Shield size={32} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
                )}
              </div>

              {/* Upload Actions & Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => document.getElementById('settings-logo-uploader').click()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Upload size={14} /> Chọn ảnh từ máy
                  </button>
                  {settings.logo_url && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSettings({ ...settings, logo_url: '' })}
                      style={{ color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                      <Trash2 size={14} /> Xóa logo
                    </button>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Hỗ trợ định dạng PNG, JPG, JPEG. Kích thước ảnh tối đa 2MB. Logo được lưu trữ an toàn dưới dạng Base64 trong cơ sở dữ liệu.
                </span>
                <input 
                  id="settings-logo-uploader"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error('Kích thước ảnh vượt quá dung lượng cho phép (tối đa 2MB).');
                        return;
                      }
                      const r = new FileReader();
                      r.onloadend = () => {
                        setSettings({ ...settings, logo_url: r.result });
                      };
                      r.readAsDataURL(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
              </div>

            </div>
          </div>

          {/* AI Confidence Threshold */}
          <div className="form-group">
            <label className="form-label">AI confidence threshold (0-1)</label>
            <input className="form-input" type="number" step="0.05" min="0" max="1"
              value={settings.ai_confidence_threshold ?? 0.5}
              onChange={(e) => setSettings({ ...settings, ai_confidence_threshold: parseFloat(e.target.value) })} />
          </div>

          {/* Map Center Coordinate & Zoom */}
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

          {/* Notification Polling seconds */}
          <div className="form-group">
            <label className="form-label">Polling thông báo (giây)</label>
            <input className="form-input" type="number"
              value={settings.notification_polling_seconds ?? 30}
              onChange={(e) => setSettings({ ...settings, notification_polling_seconds: parseInt(e.target.value, 10) })} />
          </div>

          <button type="submit" className="btn btn-primary"><Save size={14} /> Lưu cài đặt</button>
        </form>
      </div>
    </div>
  );
}
