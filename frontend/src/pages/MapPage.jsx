import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetsStore, useReportsStore } from '../store';
import LeafletMap from '../components/map/LeafletMap';
import CesiumMap from '../components/map/CesiumMap';
import { Map as MapIcon, Globe } from 'lucide-react';

export default function MapPage() {
  const { assets, fetchAssets } = useAssetsStore();
  const { reports, fetchReports } = useReportsStore();
  const [tab, setTab] = useState('leaflet');
  const navigate = useNavigate();
  const cesiumEnabled = !!import.meta.env.VITE_CESIUM_ION_TOKEN;

  useEffect(() => {
    fetchAssets();
    fetchReports();
  }, []);

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button
          className={`btn btn-sm ${tab === 'leaflet' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('leaflet')}
        >
          <MapIcon size={14} /> 2D Leaflet
        </button>
        <button
          className={`btn btn-sm ${tab === 'cesium' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setTab('cesium')}
          disabled={!cesiumEnabled}
          title={cesiumEnabled ? '' : 'Cần VITE_CESIUM_ION_TOKEN'}
        >
          <Globe size={14} /> 3D Cesium {!cesiumEnabled && '(disabled)'}
        </button>
      </div>

      <div className="map-container" style={{ flex: 1, height: '100%' }}>
        {tab === 'leaflet' ? (
          <LeafletMap
            assets={assets}
            reports={reports}
            onReportSelect={(r) => navigate(`/reports/${r.id}`)}
            onBboxChange={(bbox) => fetchAssets({ bbox })}
          />
        ) : (
          <CesiumMap assets={assets} reports={reports} />
        )}
      </div>
    </div>
  );
}
