import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssetsStore, useReportsStore } from '../store';
import LeafletMap from '../components/map/LeafletMap';
import CesiumMap from '../components/map/CesiumMap';
import { assetsAPI, reportsAPI, tasksAPI } from '../services/api';
import { Map as MapIcon, Globe } from 'lucide-react';

export default function MapPage() {
  const { assets, fetchAssets } = useAssetsStore();
  const { reports, fetchReports } = useReportsStore();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('report');
  const assetId = searchParams.get('asset');
  const taskId = searchParams.get('task');
  const focusParam = searchParams.get('focus');

  const [fetchedReport, setFetchedReport] = useState(null);
  const [fetchedAsset, setFetchedAsset] = useState(null);
  const [fetchedTask, setFetchedTask] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);

  const [tab, setTab] = useState('leaflet');
  const navigate = useNavigate();
  const cesiumEnabled = !!import.meta.env.VITE_CESIUM_ION_TOKEN;

  useEffect(() => {
    fetchAssets();
    fetchReports();
  }, []);

  useEffect(() => {
    if (!focusParam) return;
    const parts = focusParam.split(',').map((s) => parseFloat(String(s).trim()));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      setMapCenter([parts[0], parts[1]]);
      setMapZoom(Number.isFinite(parts[2]) ? parts[2] : 16);
    }
  }, [focusParam]);

  useEffect(() => {
    if (!reportId) {
      setFetchedReport(null);
      return undefined;
    }
    let cancelled = false;
    reportsAPI.get(reportId).then(({ data }) => {
      if (!cancelled) setFetchedReport(data);
    }).catch(() => {
      if (!cancelled) setFetchedReport(null);
    });
    return () => { cancelled = true; };
  }, [reportId]);

  useEffect(() => {
    if (!assetId) {
      setFetchedAsset(null);
      return undefined;
    }
    let cancelled = false;
    assetsAPI.get(assetId).then(({ data }) => {
      if (!cancelled) setFetchedAsset(data);
    }).catch(() => {
      if (!cancelled) setFetchedAsset(null);
    });
    return () => { cancelled = true; };
  }, [assetId]);

  useEffect(() => {
    if (!taskId) {
      setFetchedTask(null);
      return undefined;
    }
    let cancelled = false;
    tasksAPI.get(taskId).then(({ data }) => {
      if (!cancelled) setFetchedTask(data);
    }).catch(() => {
      if (!cancelled) setFetchedTask(null);
    });
    return () => { cancelled = true; };
  }, [taskId]);

  useEffect(() => {
    if (focusParam) return;
    if (taskId && fetchedTask?.location_latitude != null && fetchedTask?.location_longitude != null) {
      setMapCenter([fetchedTask.location_latitude, fetchedTask.location_longitude]);
      setMapZoom(16);
      return;
    }
    if (
      taskId && fetchedTask
      && (fetchedTask.location_latitude == null || fetchedTask.location_longitude == null)
      && !reportId && !assetId
    ) {
      setMapCenter(null);
      setMapZoom(null);
      return;
    }
    if (reportId && fetchedReport?.latitude != null && fetchedReport?.longitude != null) {
      setMapCenter([fetchedReport.latitude, fetchedReport.longitude]);
      setMapZoom(16);
      return;
    }
    if (assetId && fetchedAsset?.latitude != null && fetchedAsset?.longitude != null) {
      setMapCenter([fetchedAsset.latitude, fetchedAsset.longitude]);
      setMapZoom(16);
      return;
    }
    if (!reportId && !assetId && !focusParam && !taskId) {
      setMapCenter(null);
      setMapZoom(null);
    }
  }, [focusParam, taskId, reportId, assetId, fetchedTask, fetchedReport, fetchedAsset]);

  const displayReports = useMemo(() => {
    const list = Array.isArray(reports) ? [...reports] : [];
    if (fetchedReport?.id != null && !list.some((r) => r.id === fetchedReport.id)) {
      list.push(fetchedReport);
    }
    return list;
  }, [reports, fetchedReport]);

  const displayAssets = useMemo(() => {
    const list = Array.isArray(assets) ? [...assets] : [];
    if (fetchedAsset?.id != null && !list.some((a) => a.id === fetchedAsset.id)) {
      list.push(fetchedAsset);
    }
    return list;
  }, [assets, fetchedAsset]);

  const taskPointMarkers = useMemo(() => {
    if (fetchedTask?.location_latitude == null || fetchedTask?.location_longitude == null) return [];
    return [{
      key: fetchedTask.id,
      latitude: fetchedTask.location_latitude,
      longitude: fetchedTask.location_longitude,
      label: fetchedTask.title || 'Tác vụ',
    }];
  }, [fetchedTask]);

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
            assets={displayAssets}
            reports={displayReports}
            onReportSelect={(r) => navigate(`/reports/${r.id}`)}
            onBboxChange={(bbox) => fetchAssets({ bbox })}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            pointMarkers={taskPointMarkers}
          />
        ) : (
          <CesiumMap assets={displayAssets} reports={displayReports} />
        )}
      </div>
    </div>
  );
}
