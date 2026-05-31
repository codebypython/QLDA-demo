import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssetsStore } from '../store';
import { assetsAPI, getErrorMessage } from '../services/api';
import LocationPickerModal from '../components/map/LocationPickerModal';
import ConfirmActionModal from '../components/common/ConfirmActionModal';
import LeafletMap from '../components/map/LeafletMap';
import { Plus, Trash2, Edit, MapPin, ExternalLink, Map, Check, X, Camera, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_LAT = 16.0678;
const DEFAULT_LNG = 108.2208;
const MAP_BBOX = '108.17,16.03,108.26,16.14';

export default function AssetsPage() {
  const { assets, fetchAssets, loading } = useAssetsStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', asset_type: 'bench', latitude: DEFAULT_LAT, longitude: DEFAULT_LNG,
    status_image: '', // base64 representation of status photo
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '', asset_type: 'bench', status: 'active', installed_at: '',
    latitude: DEFAULT_LAT, longitude: DEFAULT_LNG,
    status_image: '', // base64 representation of status photo
  });
  const [pickCreateOpen, setPickCreateOpen] = useState(false);
  const [pickEditOpen, setPickEditOpen] = useState(false);
  const [mapCtx, setMapCtx] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggedAssets, setDraggedAssets] = useState({});

  const tempAssets = assets.map(a => {
    if (draggedAssets[a.id]) {
      return {
        ...a,
        latitude: draggedAssets[a.id].latitude,
        longitude: draggedAssets[a.id].longitude,
      };
    }
    return a;
  });

  const handleAssetDragEnd = (assetId, newLat, newLng) => {
    setDraggedAssets(prev => ({
      ...prev,
      [assetId]: { latitude: newLat, longitude: newLng },
    }));
  };

  const handleSaveDragPositions = async () => {
    const ids = Object.keys(draggedAssets);
    if (ids.length === 0) return;
    const loadToast = toast.loading('Đang lưu tọa độ mới...');
    try {
      await Promise.all(
        ids.map(id => {
          const coords = draggedAssets[id];
          return assetsAPI.update(id, coords);
        })
      );
      toast.success('Đã lưu tọa độ mới thành công!', { id: loadToast });
      setDraggedAssets({});
      setIsDragMode(false);
      fetchAssets();
    } catch (err) {
      toast.error('Lỗi khi lưu vị trí: ' + getErrorMessage(err), { id: loadToast });
    }
  };

  const handleCancelDrag = () => {
    setDraggedAssets({});
    setIsDragMode(false);
  };

  useEffect(() => { fetchAssets(); }, []);

  useEffect(() => {
    if (showForm || editingId) {
      assetsAPI.list({ bbox: MAP_BBOX }).then(({ data }) => {
        const rows = data.results || data;
        setMapCtx(rows.slice(0, 80));
      }).catch(() => setMapCtx([]));
    }
  }, [showForm, editingId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        asset_type: form.asset_type,
        latitude: form.latitude,
        longitude: form.longitude,
        metadata: form.status_image ? { status_image: form.status_image } : {},
      };
      await assetsAPI.create(payload);
      toast.success('Tạo tài sản thành công!');
      setShowForm(false);
      setForm({ name: '', asset_type: 'bench', latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, status_image: '' });
      fetchAssets();
    } catch (err) {
      toast.error('Lỗi tạo tài sản: ' + getErrorMessage(err));
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await assetsAPI.delete(deleteId);
      toast.success('Đã xóa tài sản thành công');
      fetchAssets();
    } catch (err) {
      toast.error('Lỗi xóa tài sản: ' + getErrorMessage(err));
    }
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      asset_type: a.asset_type,
      status: a.status || 'active',
      installed_at: a.installed_at || '',
      latitude: a.latitude ?? DEFAULT_LAT,
      longitude: a.longitude ?? DEFAULT_LNG,
      status_image: a.metadata?.status_image || '',
    });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    try {
      const originalAsset = assets.find(a => a.id === editingId);
      const payload = {
        name: editForm.name,
        asset_type: editForm.asset_type,
        status: editForm.status,
        installed_at: editForm.installed_at || null,
        latitude: editForm.latitude,
        longitude: editForm.longitude,
        metadata: {
          ...(originalAsset?.metadata || {}),
          status_image: editForm.status_image || null,
        }
      };
      await assetsAPI.update(editingId, payload);
      toast.success('Đã cập nhật tài sản thành công');
      setEditingId(null);
      fetchAssets();
    } catch (err) {
      toast.error('Lỗi cập nhật tài sản: ' + getErrorMessage(err));
    }
  };

  const STATUS_BADGE = { active: 'badge-green', damaged: 'badge-red', maintenance: 'badge-amber' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Danh sách tài sản ({assets.length})</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            className={`btn ${isDragMode ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => {
              if (isDragMode) {
                handleCancelDrag();
              } else {
                setIsDragMode(true);
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--accent-cyan)' }}
          >
            <Map size={16} /> {isDragMode ? 'Tắt chế độ bản đồ' : 'Kéo thả sửa vị trí'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Thêm tài sản
          </button>
        </div>
      </div>

      {isDragMode && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid var(--accent-cyan)', background: 'var(--bg-glass)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h4 className="card-title" style={{ margin: 0, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Map size={18} /> Chế độ kéo thả vị trí tài sản
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                Kéo thả các Marker tài sản trên bản đồ bên dưới để thay đổi tọa độ.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveDragPositions}
                disabled={Object.keys(draggedAssets).length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Check size={14} /> Lưu ({Object.keys(draggedAssets).length}) vị trí
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={handleCancelDrag}
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <X size={14} /> Hủy bỏ
              </button>
            </div>
          </div>
          
          {Object.keys(draggedAssets).length > 0 && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px dashed #3b82f6',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 12,
              fontSize: 13,
              color: 'var(--text-primary)'
            }}>
              💡 Đang có <strong>{Object.keys(draggedAssets).length}</strong> tài sản tạm thời di chuyển vị trí. Vui lòng bấm <strong>"Lưu vị trí"</strong> để lưu thay đổi vào cơ sở dữ liệu.
            </div>
          )}

          <div style={{ height: 450, borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <LeafletMap
              assets={tempAssets}
              enableDragAsset={true}
              onAssetDragEnd={handleAssetDragEnd}
              showLayerControls={false}
            />
          </div>
        </div>
      )}

      <LocationPickerModal
        open={pickCreateOpen}
        onClose={() => setPickCreateOpen(false)}
        initialLatitude={form.latitude}
        initialLongitude={form.longitude}
        onApply={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
        title="Chọn vị trí tài sản (mới)"
        contextAssets={mapCtx}
        contextReports={[]}
      />
      <LocationPickerModal
        open={pickEditOpen}
        onClose={() => setPickEditOpen(false)}
        initialLatitude={editForm.latitude}
        initialLongitude={editForm.longitude}
        onApply={(lat, lng) => setEditForm({ ...editForm, latitude: lat, longitude: lng })}
        title="Chọn vị trí tài sản (sửa)"
        contextAssets={mapCtx}
        contextReports={[]}
      />

      {/* Add Asset Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Thêm tài sản mới
          </h4>
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 12 }}>
            
            {/* Left Column: Input text fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tên tài sản</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Loại tài sản</label>
                <select className="form-select" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
                  <option value="bench">Ghế đá</option>
                  <option value="trash_can">Thùng rác</option>
                  <option value="lamp">Cột đèn</option>
                  <option value="toilet">Nhà vệ sinh</option>
                  <option value="tree">Cây xanh</option>
                  <option value="sign">Biển báo</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Vĩ độ</label>
                  <input className="form-input" type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: +e.target.value })} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Kinh độ</label>
                  <input className="form-input" type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: +e.target.value })} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }} onClick={() => setPickCreateOpen(true)}>
                  <MapPin size={14} /> Chọn map
                </button>
                <a
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none', flex: 1 }}
                  href={`/map?focus=${encodeURIComponent(`${form.latitude},${form.longitude},16`)}`}
                >
                  <ExternalLink size={14} /> GIS
                </a>
                <button type="submit" className="btn btn-primary" style={{ flex: 1.2 }}>Tạo</button>
              </div>
            </div>

            {/* Right Column: Custom Image upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="form-label">Hình ảnh hiện trạng thực tế</label>
              
              <div 
                style={{
                  flex: 1,
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  minHeight: 180,
                  position: 'relative'
                }}
                onClick={() => document.getElementById('asset-create-photo').click()}
              >
                <input 
                  id="asset-create-photo" 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const r = new FileReader();
                      r.onloadend = () => setForm({ ...form, status_image: r.result });
                      r.readAsDataURL(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                
                {form.status_image ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
                    <img 
                      src={form.status_image} 
                      alt="Preview" 
                      style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} 
                    />
                    <button 
                      type="button" 
                      className="btn btn-sm btn-secondary"
                      style={{ color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)', fontSize: 11 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm({ ...form, status_image: '' });
                      }}
                    >
                      Xóa ảnh
                    </button>
                  </div>
                ) : (
                  // Slate dark grey technical placeholder representing NO IMAGE
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-muted)', border: '1px solid var(--border-color)'
                    }}>
                      <Camera size={18} style={{ opacity: 0.6 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Chưa có ảnh</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bấm để tải ảnh thủ công lên</span>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Edit Asset Form */}
      {editingId && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Edit size={16} /> Sửa tài sản hạ tầng
          </h4>
          <form onSubmit={handleEditSave} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginTop: 12 }}>
            
            {/* Left Column: Text inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tên tài sản</label>
                  <input className="form-input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Loại</label>
                  <select className="form-select" value={editForm.asset_type} onChange={(e) => setEditForm({ ...editForm, asset_type: e.target.value })}>
                    <option value="bench">Ghế đá</option>
                    <option value="trash_can">Thùng rác</option>
                    <option value="lamp">Cột đèn</option>
                    <option value="toilet">Nhà vệ sinh</option>
                    <option value="tree">Cây xanh</option>
                    <option value="sign">Biển báo</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Trạng thái</label>
                  <select className="form-select" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                    <option value="active">Hoạt động</option>
                    <option value="damaged">Hư hỏng</option>
                    <option value="maintenance">Bảo trì</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Ngày lắp</label>
                  <input className="form-input" type="date" value={editForm.installed_at} onChange={(e) => setEditForm({ ...editForm, installed_at: e.target.value })} />
                </div>
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Tọa độ (vĩ độ / kinh độ)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input" type="number" step="any" value={editForm.latitude} onChange={(e) => setEditForm({ ...editForm, latitude: +e.target.value })} />
                  <input className="form-input" type="number" step="any" value={editForm.longitude} onChange={(e) => setEditForm({ ...editForm, longitude: +e.target.value })} />
                </div>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={() => setPickEditOpen(true)}>
                  <MapPin size={14} /> Chọn map
                </button>
                <Link
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none' }}
                  to={`/map?asset=${editingId}`}
                >
                  <ExternalLink size={14} /> GIS
                </Link>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu</button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditingId(null)}>Hủy</button>
              </div>
            </div>

            {/* Right Column: Custom Image upload */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="form-label">Hình ảnh hiện trạng thực tế</label>
              
              <div 
                style={{
                  flex: 1,
                  border: '2px dashed var(--border-color)',
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  minHeight: 180,
                  position: 'relative'
                }}
                onClick={() => document.getElementById('asset-edit-photo').click()}
              >
                <input 
                  id="asset-edit-photo" 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const r = new FileReader();
                      r.onloadend = () => setEditForm({ ...editForm, status_image: r.result });
                      r.readAsDataURL(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                
                {editForm.status_image ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
                    <img 
                      src={editForm.status_image} 
                      alt="Preview" 
                      style={{ width: '100%', maxHeight: 120, objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} 
                    />
                    <button 
                      type="button" 
                      className="btn btn-sm btn-secondary"
                      style={{ color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)', fontSize: 11 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditForm({ ...editForm, status_image: '' });
                      }}
                    >
                      Xóa ảnh
                    </button>
                  </div>
                ) : (
                  // Slate dark grey technical placeholder representing NO IMAGE
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-muted)', border: '1px solid var(--border-color)'
                    }}>
                      <Camera size={18} style={{ opacity: 0.6 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Chưa có ảnh</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bấm để tải ảnh thủ công lên</span>
                  </div>
                )}
              </div>
            </div>

          </form>
        </div>
      )}

      {/* Assets List Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 64 }}>Ảnh</th>
                <th>Tên</th>
                <th>Loại</th>
                <th>Trạng thái</th>
                <th>Vị trí</th>
                <th>Ngày lắp đặt</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Đang tải...</td></tr>
              ) : assets.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Chưa có tài sản</td></tr>
              ) : assets.map((a) => (
                <tr key={a.id}>
                  {/* Image Column */}
                  <td>
                    {a.metadata?.status_image ? (
                      <img 
                        src={a.metadata.status_image} 
                        alt="Asset status" 
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}
                      />
                    ) : (
                      // Sleek grey background placeholder for NO IMAGE
                      <div style={{
                        width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)'
                      }}
                      title="Chưa cập nhật hình ảnh"
                      >
                        <Camera size={14} style={{ opacity: 0.35 }} />
                      </div>
                    )}
                  </td>
                  
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td><span className="badge badge-blue">{a.asset_type_display || a.asset_type}</span></td>
                  <td><span className={`badge ${STATUS_BADGE[a.status] || 'badge-blue'}`}>{a.status_display || a.status}</span></td>
                  <td style={{ color: draggedAssets[a.id] ? 'var(--accent-cyan)' : 'var(--text-muted)', fontSize: 12, fontWeight: draggedAssets[a.id] ? '600' : 'normal' }}>
                    {draggedAssets[a.id] 
                      ? `${draggedAssets[a.id].latitude.toFixed(4)}*, ${draggedAssets[a.id].longitude.toFixed(4)}* (Mới)`
                      : `${a.latitude?.toFixed(4)}, ${a.longitude?.toFixed(4)}`
                    }
                    {' '}
                    <Link to={`/map?asset=${a.id}`} style={{ color: 'var(--accent-cyan)', marginLeft: 6 }}>Map</Link>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{a.installed_at || '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => openEdit(a)} title="Sửa">
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-sm btn-secondary" style={{ marginLeft: 6 }} onClick={() => handleDelete(a.id)} title="Xóa">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <ConfirmActionModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa tài sản"
        description="Bạn có chắc chắn muốn xóa tài sản này? Hành động này không thể hoàn tác và có thể ảnh hưởng đến các tác vụ hoặc nhật ký bảo trì liên quan."
        confirmLabel="Xóa tài sản"
        cancelLabel="Hủy"
        variant="danger"
      />
    </div>
  );
}
