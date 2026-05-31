import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, LayerGroup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.heat';
import MapViewController from './MapViewController';

const ASSET_COLORS = {
  bench: '#3b82f6', trash_can: '#10b981', lamp: '#f59e0b',
  toilet: '#8b5cf6', tree: '#06b6d4', sign: '#ef4444',
};

const STATUS_BORDER = {
  active: '#22c55e', damaged: '#ef4444', maintenance: '#f59e0b',
};

const DA_NANG_CENTER = [16.0678, 108.2208];

function svgIcon(color, border, shape = 'circle') {
  const path = shape === 'triangle'
    ? `<polygon points="14,4 4,24 24,24" fill="${color}" stroke="${border}" stroke-width="2"/>`
    : `<circle cx="14" cy="14" r="9" fill="${color}" stroke="${border}" stroke-width="2"/>`;
  const html = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">${path}</svg>`;
  return L.divIcon({
    html,
    className: 'leaflet-svg-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function PickMarker({ pickMarker }) {
  if (!pickMarker || pickMarker.latitude == null || pickMarker.longitude == null) return null;
  const lat = +pickMarker.latitude;
  const lng = +pickMarker.longitude;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const icon = svgIcon('#6366f1', '#fff', 'circle');
  return (
    <Marker position={[lat, lng]} icon={icon}>
      <Popup>Điểm đã chọn</Popup>
    </Marker>
  );
}

function ClusterLayer({ assets, showAssets }) {
  const map = useMap();
  useEffect(() => {
    if (!showAssets) return;
    const cluster = L.markerClusterGroup({ chunkedLoading: true });
    assets.forEach((a) => {
      if (!a.latitude || !a.longitude) return;
      const icon = svgIcon(
        ASSET_COLORS[a.asset_type] || '#3b82f6',
        STATUS_BORDER[a.status] || '#fff',
      );
      const m = L.marker([a.latitude, a.longitude], { icon });
      m.bindPopup(`
        <div style="min-width:160px">
          <strong>${a.name}</strong><br/>
          Loại: ${a.asset_type_display || a.asset_type}<br/>
          Trạng thái: <span style="color:${STATUS_BORDER[a.status] || '#fff'}">${a.status_display || a.status}</span>
        </div>
      `);
      cluster.addLayer(m);
    });
    map.addLayer(cluster);
    return () => { map.removeLayer(cluster); };
  }, [assets, showAssets, map]);
  return null;
}

function PointMarkersLayer({ markers }) {
  if (!markers?.length) return null;
  return (
    <LayerGroup>
      {markers.map((m) => {
        if (m.latitude == null || m.longitude == null) return null;
        const lat = +m.latitude;
        const lng = +m.longitude;
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        const icon = svgIcon(m.color || '#a855f7', '#fff', 'circle');
        const k = m.key != null ? String(m.key) : `${lat},${lng}`;
        return (
          <Marker key={k} position={[lat, lng]} icon={icon}>
            {m.label ? <Popup>{m.label}</Popup> : <Popup>Tác vụ</Popup>}
          </Marker>
        );
      })}
    </LayerGroup>
  );
}

function ReportLayer({ reports, showReports, onSelect }) {
  if (!showReports) return null;
  return (
    <LayerGroup>
      {reports.map((r) => {
        if (!r.latitude || !r.longitude) return null;
        const icon = svgIcon('#ef4444', '#fbbf24', 'triangle');
        return (
          <Marker key={r.id} position={[r.latitude, r.longitude]} icon={icon}>
            <Popup>
              <strong>{r.incident_type_display || r.incident_type}</strong><br/>
              {r.description?.slice(0, 80)}<br/>
              <em>Trạng thái:</em> {r.status_display || r.status}<br/>
              <button
                style={{ marginTop: 6, padding: '4px 8px', cursor: 'pointer' }}
                onClick={() => onSelect && onSelect(r)}
              >Chi tiết</button>
            </Popup>
          </Marker>
        );
      })}
    </LayerGroup>
  );
}

function HeatLayer({ assets, showHeat }) {
  const map = useMap();
  useEffect(() => {
    if (!showHeat || !assets.length) return;
    const points = assets
      .filter((a) => a.latitude && a.longitude)
      .map((a) => [a.latitude, a.longitude, 0.5]);
    const layer = L.heatLayer(points, { radius: 25, blur: 15 });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [assets, showHeat, map]);
  return null;
}

function ClickToCoord({ onClick }) {
  useMapEvents({
    click(e) {
      onClick && onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MoveBboxEmitter({ onBboxChange }) {
  useMapEvents({
    moveend(e) {
      const b = e.target.getBounds();
      onBboxChange && onBboxChange(`${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`);
    },
  });
  return null;
}

export default function LeafletMap({
  assets = [], reports = [],
  onCoordPick, onReportSelect, onBboxChange,
  height = '100%',
  /** [lat, lng] — cập nhật view khi đổi */
  mapCenter = null,
  mapZoom = null,
  /** Hiện panel bật/tắt layer (tài sản, sự cố, heatmap) */
  showLayerControls = true,
  /** Marker cố định (ví dụ chế độ chọn vị trí) */
  pickMarker = null,
  /** Điểm bổ sung: [{ key, latitude, longitude, label?, color? }] */
  pointMarkers = [],
}) {
  const [showAssets, setShowAssets] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [showHeat, setShowHeat] = useState(false);

  const initialCenter = mapCenter && mapCenter.length === 2 && mapCenter[0] != null && mapCenter[1] != null
    ? [+mapCenter[0], +mapCenter[1]]
    : DA_NANG_CENTER;
  const initialZoom = mapZoom != null ? +mapZoom : 14;

  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        style={{ height: '100%', width: '100%', borderRadius: 'var(--radius)' }}
      >
        <MapViewController center={mapCenter && mapCenter.length === 2 ? [+mapCenter[0], +mapCenter[1]] : null} zoom={mapZoom} />
        <TileLayer
          attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClusterLayer assets={assets} showAssets={showAssets} />
        <ReportLayer reports={reports} showReports={showReports} onSelect={onReportSelect} />
        <HeatLayer assets={assets} showHeat={showHeat} />
        <PointMarkersLayer markers={pointMarkers} />
        <PickMarker pickMarker={pickMarker} />
        {onCoordPick && <ClickToCoord onClick={onCoordPick} />}
        {onBboxChange && <MoveBboxEmitter onBboxChange={onBboxChange} />}
      </MapContainer>

      {showLayerControls && (
      <div className="map-controls" style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 6,
        background: 'var(--bg-glass)', padding: 8, borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)', backdropFilter: 'blur(8px)',
      }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showAssets} onChange={(e) => setShowAssets(e.target.checked)} /> Tài sản
        </label>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showReports} onChange={(e) => setShowReports(e.target.checked)} /> Sự cố
        </label>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} /> Heatmap
        </label>
      </div>
      )}
    </div>
  );
}
