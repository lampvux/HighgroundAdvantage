import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface RouteMapProps {
  originLat: number;
  originLon: number;
  targetLat: number;
  targetLon: number;
  vantageTitle: string;
  targetLabel: string;
  groundDistanceMeters: number;
}

export function RouteMap({
  originLat,
  originLon,
  targetLat,
  targetLon,
  vantageTitle,
  targetLabel,
  groundDistanceMeters,
}: RouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Clean OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Custom Icon for Vantage (Building)
    const vantageIcon = L.divIcon({
      className: 'custom-vantage-marker',
      html: `
        <div style="background-color: #0f172a; color: white; width: 34px; height: 34px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
            <path d="M9 22v-4h6v4"/>
            <path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/>
            <path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/>
            <path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    // Custom Icon for Target (Crosshair Pin)
    const targetIcon = L.divIcon({
      className: 'custom-target-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 38px; height: 38px; background-color: rgba(239, 68, 68, 0.25); border-radius: 9999px; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="background-color: #ef4444; color: white; width: 32px; height: 32px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.4); border: 2px solid white; font-weight: bold; font-size: 14px;">
            🎯
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const vantageMarker = L.marker([originLat, originLon], { icon: vantageIcon })
      .addTo(map)
      .bindPopup(`<strong>Your Vantage Point</strong><br>${vantageTitle}`);

    const targetMarker = L.marker([targetLat, targetLon], { icon: targetIcon })
      .addTo(map)
      .bindPopup(
        `<strong>Target Ground Spot</strong><br>${targetLabel}<br><span style="color:#64748b">${groundDistanceMeters}m away</span>`
      );

    // Draw route path line with realistic dashed style
    const routeCoords: [number, number][] = [
      [originLat, originLon],
      // slight realistic offset turning along street
      [originLat + (targetLat - originLat) * 0.5, originLon],
      [originLat + (targetLat - originLat) * 0.5, targetLon],
      [targetLat, targetLon],
    ];

    const polyline = L.polyline(routeCoords, {
      color: '#3b82f6',
      weight: 5,
      opacity: 0.85,
      dashArray: '8, 8',
    }).addTo(map);

    // Also draw direct sight line in subtle red
    const sightLine = L.polyline(
      [
        [originLat, originLon],
        [targetLat, targetLon],
      ],
      {
        color: '#ef4444',
        weight: 2,
        opacity: 0.4,
      }
    ).addTo(map);

    // Fit map bounds to view both points nicely
    const bounds = L.latLngBounds([
      [originLat, originLon],
      [targetLat, targetLon],
    ]);
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 18 });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [originLat, originLon, targetLat, targetLon, vantageTitle, targetLabel, groundDistanceMeters]);

  return (
    <div className="relative w-full max-w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full max-w-full overflow-hidden" />
      <div className="absolute top-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-xs text-xs font-medium text-slate-700 flex items-center gap-2 max-w-[calc(100%-24px)] truncate">
        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
        <span className="truncate">Route: {groundDistanceMeters}m</span>
      </div>
    </div>
  );
}
