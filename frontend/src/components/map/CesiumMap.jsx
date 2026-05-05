import { useEffect, useRef } from 'react';

export default function CesiumMap({ assets = [], reports = [] }) {
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
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(a.longitude, a.latitude, 10),
          point: { pixelSize: 8, color: Cesium.Color.CYAN },
          label: { text: a.name, font: '12px sans-serif', pixelOffset: new Cesium.Cartesian2(0, -16), showBackground: true },
        });
      });
      reports.forEach((r) => {
        if (!r.latitude || !r.longitude) return;
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(r.longitude, r.latitude, 5),
          point: { pixelSize: 10, color: Cesium.Color.RED },
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
  }, [assets, reports]);

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
