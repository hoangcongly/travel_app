"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import L from "leaflet";
import { decodePolyline, type Coordinate } from "@/shared/lib/polyline";
import { Place, RoutePlan } from "@/entities/place/model/types";

// Dynamic import Leaflet components to avoid SSR errors
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);

interface SmartMapWidgetProps {
  stops: Place[];
  routeInfo?: RoutePlan;
  className?: string;
}

/**
 * AEGIS Smart Map Widget
 * ──────────────────────
 * - Hiển thị bản đồ với markers địa danh (color-coded).
 * - Vẽ tuyến đường (polyline) với logic fallback nét đứt nếu polyline === null.
 * - Layer cảnh báo thời tiết khi "Rainy".
 */

export default function SmartMapWidget({
  stops,
  routeInfo,
  className = "",
}: SmartMapWidgetProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Fix default marker icon issue in Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  // Decode polyline or prepare dashed fallback
  const polylineCoords = useMemo(() => {
    if (routeInfo?.polyline) {
      return decodePolyline(routeInfo.polyline);
    }
    // Fallback: Tuyến đường chim bay (Straight lines)
    if (stops && stops.length > 0) {
      return stops.map((p) => [p.lat, p.lon] as Coordinate);
    }
    return [];
  }, [routeInfo, stops]);

  const isDashed = !routeInfo?.polyline && polylineCoords.length > 1;

  if (!isClient) {
    return (
      <div className={`w-full h-full bg-aegis-surface animate-pulse ${className}`} />
    );
  }

  const center: Coordinate =
    stops.length > 0 ? [stops[0].lat, stops[0].lon] : [10.7769, 106.7009];

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <MapContainer
        center={center}
        zoom={14}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Tuyến đường Polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: isDashed ? "#64748b" : "#38bdf8",
              weight: 4,
              dashArray: isDashed ? "10, 10" : undefined,
              opacity: 0.8,
            }}
          />
        )}

        {/* Địa danh Markers */}
        {stops.map((place, idx) => (
          <Marker key={`${place.id}-${idx}`} position={[place.lat, place.lon]}>
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-aegis-accent">{place.name}</h3>
                <p className="text-xs text-aegis-muted">{place.address}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded">
                    {place.category}
                  </span>
                  {place.rating && (
                    <span className="text-[10px] text-yellow-500 font-bold">
                      ★ {place.rating}
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Overlay: Cảnh báo thời tiết (Weather Banner) */}
      {(routeInfo?.weather_context?.condition === "Rainy" || 
        routeInfo?.weather_context?.condition === "Storm") && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-fit px-6 py-3 glass-strong neon-glow border-red-500/20 rounded-full flex items-center gap-3 animate-slide-down">
          <span className="animate-pulse text-red-500">🌧️</span>
          <span className="text-sm font-medium">Trời đang mưa to! Sếp nhớ mang ô khi ghé thăm các trạm dừng.</span>
        </div>
      )}

      {/* Map Search Overlay / Legend */}
      <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2">
        <div className="glass p-3 rounded-xl flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
             <div className="w-3 h-0.5 bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
             <span>Lộ trình OSRM</span>
          </div>
          <div className="flex items-center gap-2 ml-2">
             <div className="w-3 h-0.5 bg-slate-500 border-dashed border-b" />
             <span>Đường bay (Fallback)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
