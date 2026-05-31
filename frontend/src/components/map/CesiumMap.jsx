import { useEffect, useRef } from 'react';

export default function CesiumMap({ assets = [], reports = [], currentUserPos = null, nearbyUsers = [] }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
    if (!token) return;
    (async () => {
      const Cesium = await import('cesium');
      await import('cesium/Build/Cesium/Widgets/widgets.css');
      if (cancelled || !containerRef.current) return;
      Cesium.Ion.defaultAccessToken = token;
      const viewer = new Cesium.Viewer(containerRef.current, {
        terrainProvider: await Cesium.createWorldTerrainAsync(),
        timeline: false,
        animation: false,
        baseLayerPicker: true,
      });
      viewerRef.current = viewer;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(108.2208, 16.0678, 5000),
      });

      assets.forEach((a) => {
        if (!a.latitude || !a.longitude) return;
        const statusImgHtml = a.metadata?.status_image
          ? `<img src="${a.metadata.status_image}" style="width:100%;max-height:150px;object-fit:cover;border-radius:4px;margin-bottom:8px;" alt="status"/>`
          : '';
        const descriptionHtml = `
          <div style="font-family: sans-serif; padding: 4px; color: #fff;">
            ${statusImgHtml}
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">${a.name}</div>
            <div style="font-size: 12px; margin-bottom: 4px;">Loại: <b>${a.asset_type_display || a.asset_type}</b></div>
            <div style="font-size: 12px;">Trạng thái: <b style="color: ${a.status === 'damaged' ? '#ef4444' : a.status === 'maintenance' ? '#f59e0b' : '#22c55e'}">${a.status_display || a.status}</b></div>
          </div>
        `;
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(a.longitude, a.latitude, 10),
          point: { 
            pixelSize: 8, 
            color: a.status === 'damaged' 
              ? Cesium.Color.RED 
              : a.status === 'maintenance' 
                ? Cesium.Color.ORANGE 
                : Cesium.Color.CYAN 
          },
          label: { text: a.name, font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -16), showBackground: true },
          description: descriptionHtml,
        });
      });
      reports.forEach((r) => {
        if (!r.latitude || !r.longitude) return;
        const descriptionHtml = `
          <div style="font-family: sans-serif; padding: 4px; color: #fff;">
            ${r.image ? `<img src="${r.image}" style="width:100%;max-height:150px;object-fit:cover;border-radius:4px;margin-bottom:8px;" alt="report"/>` : ''}
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">${r.incident_type_display || r.incident_type}</div>
            <p style="font-size: 12px; margin-bottom: 4px;">${r.description || ''}</p>
            <div style="font-size: 12px;">Trạng thái: <b>${r.status_display || r.status}</b></div>
          </div>
        `;
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(r.longitude, r.latitude, 5),
          point: { pixelSize: 10, color: Cesium.Color.RED },
          description: descriptionHtml,
        });
      });

      if (currentUserPos && currentUserPos[0] != null && currentUserPos[1] != null) {
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(currentUserPos[1], currentUserPos[0], 12),
          point: { pixelSize: 12, color: Cesium.Color.BLUE },
          label: { text: "Vị trí của bạn (3D GPS)", font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -18), showBackground: true },
        });
      }

      nearbyUsers.forEach((nu) => {
        if (!nu.latitude || !nu.longitude) return;
        const descriptionHtml = `
          <div style="font-family: sans-serif; padding: 4px; color: #fff;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px;">🔴 ${nu.name}</div>
            <div style="font-size: 12px; margin-bottom: 4px;">Vai trò: <b>${nu.role}</b></div>
            <div style="font-size: 12px;">Trạng thái: <b style="color:#22c55e">Hoạt động</b></div>
          </div>
        `;
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(nu.longitude, nu.latitude, 10),
          point: { pixelSize: 10, color: Cesium.Color.RED },
          label: { text: nu.name, font: '11px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -16), showBackground: true },
          description: descriptionHtml,
        });
      });

    })();
    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [assets, reports, currentUserPos, nearbyUsers]);

  if (!import.meta.env.VITE_CESIUM_ION_TOKEN) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 8,
        color: 'var(--text-muted)', textAlign: 'center', padding: 24,
      }}>
        <div>Chưa cấu hình Cesium Ion token.</div>
        <div style={{ fontSize: 12 }}>
          Đặt biến <code>VITE_CESIUM_ION_TOKEN</code> trong <code>.env</code> để bật chế độ 3D.
        </div>
      </div>
    );
  }
  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
