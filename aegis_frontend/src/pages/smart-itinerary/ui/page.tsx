"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import DragDropStops from "@/features/routing/drag-drop-stops/ui";
import { Place, RoutePlan } from "@/entities/place/model/types";
import { MapPin, Info, ArrowUpRight, CloudRain, Navigation } from "lucide-react";

// Tắt SSR cho Map vì Leaflet cần 'window' object
const SmartMapWidget = dynamic(() => import("@/widgets/SmartMapWidget/ui").then(mod => mod.default || mod), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse flex items-center justify-center text-aegis-muted font-medium">Đang tải bản đồ AEGIS...</div>
});

/**
 * Smart Itinerary Page
 * ────────────────────
 * - Split-view Layout: Side Panel (30%) + Smart Map (70%).
 * - Quản lý trạm dừng mẫu TP.HCM.
 */

const MOCK_PLACES: Place[] = [
  {
    id: 1,
    place_id: "ChIJU-T_vNZZwokR_K6W6_9qrcA",
    name: "Dinh Độc Lập",
    category: "Cung điện / Lịch sử",
    address: "135 Nam Kỳ Khởi Nghĩa, Bến Thành, Quận 1",
    lat: 10.7769,
    lon: 106.6953,
    rating: 4.6,
  },
  {
    id: 2,
    place_id: "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
    name: "Nhà thờ Đức Bà Sài Gòn",
    category: "Văn hóa / Tôn giáo",
    address: "1 Công xã Paris, Bến Nghé, Quận 1",
    lat: 10.7797,
    lon: 106.6993,
    rating: 4.7,
  },
  {
    id: 3,
    place_id: "ChIJ_K6W6_9qrcA...",
    name: "Bưu điện Thành phố Hồ Chí Minh",
    category: "Bưu điện / Kiến trúc",
    address: "2 Công xã Paris, Bến Nghé, Quận 1",
    lat: 10.7799,
    lon: 106.7001,
    rating: 4.8,
  },
];

const MOCK_ROUTING: RoutePlan = {
  total_distance_meters: 1540.5,
  waypoints: [],
  polyline: null, // Test Fallback Polyline (Đường thẳng nét đứt)
  optimized_order: [1, 2, 3],
  weather_context: {
    temperature: 32,
    condition: "Rainy", // Thử nghiệm Banner cảnh báo
    code: 63,
  },
};

export default function SmartItineraryPage() {
  const [stops, setStops] = useState<Place[]>(MOCK_PLACES);

  // Tính lại Routing (Simulated) khi thứ tự stops thay đổi
  const routeInfo = useMemo(() => {
    return {
      ...MOCK_ROUTING,
      optimized_order: stops.map((s) => s.id),
      total_distance_meters: stops.length > 1 ? 1200 : 0,
    };
  }, [stops]);

  const handleOrderChange = (newStops: Place[]) => {
    setStops(newStops);
  };

  const handleRemoveStop = (id: number) => {
    setStops((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <main className="flex h-screen bg-aegis-bg overflow-hidden animate-fade-in">
      
      {/* Side Panel: 30% Width */}
      <aside className="w-[30%] h-full flex flex-col glass border-r bg-aegis-bg/40 z-10">
        <header className="p-6 space-y-2 border-b border-white/5">
          <div className="flex items-center gap-2 text-aegis-accent">
            <Navigation size={22} className="pulse-ring" />
            <h1 className="text-xl font-bold font-display tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-aegis-accent to-aegis-accent-2">
               Smart Itinerary 
            </h1>
          </div>
          <p className="text-xs text-aegis-muted">Sếp có thể thay đổi thứ tự các trạm dừng bằng cách kéo thả thẻ bên dưới.</p>
        </header>

        {/* Thông tin lộ trình tổng quát */}
        <section className="p-6 bg-aegis-card/20 group">
           <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:border-aegis-accent/20 transition-colors">
              <div className="flex flex-col">
                  <span className="text-[10px] text-aegis-muted flex items-center gap-1 uppercase tracking-widest font-bold">Lộ trình tổng quát</span>
                  <span className="text-lg font-bold text-aegis-text">~{(routeInfo.total_distance_meters / 1000).toFixed(1)} km</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                  <ArrowUpRight size={20} />
              </div>
           </div>
        </section>

        {/* Danh sách Kéo thả */}
        <section className="flex-1 overflow-y-auto px-6 pb-20 custom-scrollbar">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-aegis-muted uppercase tracking-widest flex items-center gap-2">
                Trạm dừng ({stops.length})
              </h3>
              <button className="text-[10px] text-aegis-accent hover:underline font-bold">+ Thêm điểm</button>
            </div>
            <DragDropStops 
              stops={stops} 
              onOrderChange={handleOrderChange} 
              onRemove={handleRemoveStop} 
            />
          </div>
        </section>

        {/* Footer actions */}
        <footer className="p-6 glass-strong absolute bottom-8 left-6 right-6 rounded-2xl flex items-center justify-center gap-3 shadow-2xl">
           <button className="flex-1 py-3 bg-aegis-accent hover:bg-sky-400 text-aegis-bg font-bold rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all active:scale-95">
              Xác nhận lộ trình
           </button>
           <button className="p-3 bg-white/5 hover:bg-white/10 text-aegis-text rounded-xl transition-all">
              <Info size={18} />
           </button>
        </footer>
      </aside>

      {/* Map Widget: 70% Width */}
      <section className="flex-1 h-full shadow-2xl relative">
        <SmartMapWidget 
          stops={stops} 
          routeInfo={routeInfo} 
        />
      </section>

    </main>
  );
}
