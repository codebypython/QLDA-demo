import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import { MapPin } from 'lucide-react';
import LeafletMap from './LeafletMap';

const DA_NANG_CENTER = [16.0678, 108.2208];

/**
 * Modal to pick lat/lng by clicking the map. Uses LeafletMap pick mode (no layer toggles clutter).
 */
export default function LocationPickerModal({
  open,
  onClose,
  initialLatitude = DA_NANG_CENTER[0],
  initialLongitude = DA_NANG_CENTER[1],
  onApply,
  title = 'Chọn vị trí trên bản đồ',
  contextAssets = [],
  contextReports = [],
}) {
  const [draftLat, setDraftLat] = useState(initialLatitude);
  const [draftLng, setDraftLng] = useState(initialLongitude);

  useEffect(() => {
    if (open) {
      setDraftLat(initialLatitude);
      setDraftLng(initialLongitude);
    }
  }, [open, initialLatitude, initialLongitude]);

  if (!open) return null;

  const handlePick = (lat, lng) => {
    setDraftLat(lat);
    setDraftLng(lng);
  };

  const handleApply = () => {
    onApply?.(draftLat, draftLng);
    onClose?.();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 500,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 'min(720px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={18} /> {title}
        </h4>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Nhấp vào bản đồ để đặt điểm; lớp tài sản / sự cố tham chiếu hiển thị trên map.
        </p>
        <div style={{ flex: 1, minHeight: 320, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <LeafletMap
            height={360}
            assets={contextAssets}
            reports={contextReports}
            mapCenter={[draftLat, draftLng]}
            mapZoom={16}
            showLayerControls={false}
            pickMarker={{ latitude: draftLat, longitude: draftLng }}
            onCoordPick={handlePick}
          />
        </div>
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13 }}>
            <strong>Vĩ độ:</strong> {Number(draftLat).toFixed(6)} &nbsp;
            <strong>Kinh độ:</strong> {Number(draftLng).toFixed(6)}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={handleApply}>Áp dụng</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
          </div>
        </div>
      </div>
    </div>
  );
}
