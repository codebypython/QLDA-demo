import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Pans/zooms map when center or zoom props change (controlled view).
 */
export default function MapViewController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (!center || center.length !== 2) return;
    const [lat, lng] = center;
    if (lat == null || lng == null || Number.isNaN(+lat) || Number.isNaN(+lng)) return;
    const z = zoom != null ? zoom : map.getZoom();
    map.setView([+lat, +lng], z, { animate: true });
  }, [center, zoom, map]);
  return null;
}
