import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAssetsStore, useReportsStore, useAuthStore } from '../store';
import LeafletMap from '../components/map/LeafletMap';
import CesiumMap from '../components/map/CesiumMap';
import { assetsAPI, reportsAPI, tasksAPI, authAPI, getErrorMessage } from '../services/api';
import { Map as MapIcon, Globe, Check, X, Edit3, Compass } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MapPage() {
  const { assets, fetchAssets } = useAssetsStore();
  const { reports, fetchReports } = useReportsStore();
  const { user } = useAuthStore();
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

  // Active User Geolocation States
  const [currentUserPos, setCurrentUserPos] = useState(null);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [activeLocations, setActiveLocations] = useState([]);

  // Drag and drop asset coordinates states
  const [isDragMode, setIsDragMode] = useState(false);
  const [draggedAssets, setDraggedAssets] = useState({});

  const isOperator = user?.role === 'operator' || user?.role === 'admin';

  // Watch Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Trình duyệt không hỗ trợ Geolocation");
      setCurrentUserPos([16.0678, 108.2208]);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentUserPos([latitude, longitude]);
      },
      (error) => {
        console.error("Lỗi lấy vị trí người dùng:", error);
        setCurrentUserPos([16.0678, 108.2208]);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Sync current user location to backend periodically (Real-time Sharing)
  useEffect(() => {
    if (!currentUserPos) return;
    const [lat, lng] = currentUserPos;
    
    const share = () => {
      authAPI.shareLocation(lat, lng, true).catch(() => {});
    };
    
    share();
    const intervalId = setInterval(share, 10000); // Sync every 10 seconds
    
    return () => {
      clearInterval(intervalId);
      // Clean up sharing when user closes page
      authAPI.shareLocation(null, null, false).catch(() => {});
    };
  }, [currentUserPos]);

  // Poll other active users' locations from backend
  useEffect(() => {
    const fetchActiveUsers = async () => {
      try {
        const { data } = await authAPI.getActiveLocations();
        setActiveLocations(data || []);
      } catch (err) {
        console.warn("Lỗi đồng bộ vị trí hoạt động:", err);
      }
    };
    
    fetchActiveUsers();
    const intervalId = setInterval(fetchActiveUsers, 8000); // Pull coordinates every 8 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Simulate nearby active users relative to currentUserPos (Fallback for solo testing)
  useEffect(() => {
    if (!currentUserPos) return;
    const [lat, lng] = currentUserPos;
    const items = [
      { name: 'Lê Văn Hải', role: 'Đội kỹ thuật bảo trì #1', offset: [0.0021, -0.0034] },
      { name: 'Nguyễn Thị Mai', role: 'Giám sát viên hiện trường', offset: [-0.0032, 0.0041] },
      { name: 'Phạm Quốc Anh', role: 'Kỹ thuật viên chiếu sáng', offset: [0.0045, 0.0018] },
      { name: 'Trần Minh Hoàng', role: 'Đội xử lý sự cố khẩn cấp', offset: [-0.0019, -0.0028] }
    ];
    const simulated = items.map((item, idx) => ({
      id: `nearby-user-${idx}`,
      name: item.name,
      role: item.role,
      latitude: lat + item.offset[0],
      longitude: lng + item.offset[1]
    }));
    setNearbyUsers(simulated);
  }, [currentUserPos]);

  const handleAssetDragEnd = (assetId, newLat, newLng) => {
    setDraggedAssets(prev => ({
      ...prev,
      [assetId]: { latitude: newLat, longitude: newLng },
    }));
  };

  const handleSaveDragPositions = async () => {
    const ids = Object.keys(draggedAssets);
    if (ids.length === 0) {
      setIsDragMode(false);
      return;
    }
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

  const tempAssets = useMemo(() => {
    return displayAssets.map(a => {
      if (draggedAssets[a.id]) {
        return {
          ...a,
          latitude: draggedAssets[a.id].latitude,
          longitude: draggedAssets[a.id].longitude,
        };
      }
      return a;
    });
  }, [displayAssets, draggedAssets]);

  const taskPointMarkers = useMemo(() => {
    if (fetchedTask?.location_latitude == null || fetchedTask?.location_longitude == null) return [];
    return [{
      key: fetchedTask.id,
      latitude: fetchedTask.location_latitude,
      longitude: fetchedTask.location_longitude,
      label: fetchedTask.title || 'Tác vụ',
    }];
  }, [fetchedTask]);

  // Combine real-time active locations with simulated ones for demonstration completeness
  const displayNearbyUsers = useMemo(() => {
    if (activeLocations && activeLocations.length > 0) {
      return activeLocations.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        latitude: u.latitude,
        longitude: u.longitude,
      }));
    }
    return nearbyUsers;
  }, [activeLocations, nearbyUsers]);

  return (
    <div style={{ height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${tab === 'leaflet' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('leaflet')}
            disabled={isDragMode}
          >
            <MapIcon size={14} /> 2D Leaflet
          </button>
          <button
            className={`btn btn-sm ${tab === 'cesium' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab('cesium')}
            disabled={!cesiumEnabled || isDragMode}
            title={cesiumEnabled ? '' : 'Cần VITE_CESIUM_ION_TOKEN'}
          >
            <Globe size={14} /> 3D Cesium {!cesiumEnabled && '(disabled)'}
          </button>
        </div>

        {isOperator && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isDragMode ? (
              <>
                <span style={{ fontSize: 13, color: 'var(--accent-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚠️ Đang sửa vị trí ({Object.keys(draggedAssets).length} thay đổi)
                </span>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleSaveDragPositions}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Check size={14} /> Lưu vị trí
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={handleCancelDrag}
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <X size={14} /> Hủy bỏ
                </button>
              </>
            ) : (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => {
                  setTab('leaflet');
                  setIsDragMode(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, borderColor: 'var(--accent-cyan)' }}
              >
                <Edit3 size={14} /> Bật sửa vị trí (Kéo thả)
              </button>
            )}
          </div>
        )}
      </div>

      {isDragMode && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px dashed #3b82f6',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 12,
          fontSize: 13,
          color: 'var(--text-primary)'
        }}>
          💡 <strong>Chế độ chỉnh sửa đang BẬT:</strong> Nhấp giữ và kéo các Marker thiết bị trên bản đồ để di chuyển vị trí. Bấm <strong>"Lưu vị trí"</strong> khi đã di chuyển xong để áp dụng, hoặc <strong>"Hủy bỏ"</strong> để thoát.
        </div>
      )}

      <div className="map-container" style={{ flex: 1, height: '100%' }}>
        {tab === 'leaflet' ? (
          <LeafletMap
            assets={tempAssets}
            reports={displayReports}
            onReportSelect={(r) => navigate(`/reports/${r.id}`)}
            onBboxChange={(bbox) => fetchAssets({ bbox })}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            pointMarkers={taskPointMarkers}
            enableDragAsset={isDragMode}
            onAssetDragEnd={handleAssetDragEnd}
            currentUserPos={currentUserPos}
            nearbyUsers={displayNearbyUsers}
          />
        ) : (
          <CesiumMap
            assets={tempAssets}
            reports={displayReports}
            currentUserPos={currentUserPos}
            nearbyUsers={displayNearbyUsers}
          />
        )}
      </div>
    </div>
  );
}
