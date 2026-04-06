import polyline from "@mapbox/polyline";

/**
 * AEGIS Polyline Decoder
 * ──────────────────────
 * Giải mã chuỗi polyline từ OSRM thành mảng tọa độ [lat, lon]
 * dùng cho Leaflet Polyline component.
 */

export type Coordinate = [number, number];

export function decodePolyline(encoded: string | null | undefined): Coordinate[] {
  if (!encoded) return [];
  try {
    // polyline.decode() trả về [[lat, lon], ...] mặc định
    return polyline.decode(encoded) as Coordinate[];
  } catch (error) {
    console.error("[AEGIS] Lỗi giải mã polyline:", error);
    return [];
  }
}

/**
 * Tính toán fallback đường thẳng nếu polyline bị lỗi
 */
export function getDirectRoute(coords: Coordinate[]): Coordinate[] {
  return coords;
}
