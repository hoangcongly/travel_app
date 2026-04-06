export interface Place {
  id: number;
  place_id: string | null;
  name: string;
  category: string | null;
  address: string | null;
  lat: number;
  lon: number;
  distance_meters?: number;
  rating?: number;
  review_count?: number;
  image_url?: string | null;
}

export interface RoutePlan {
  total_distance_meters: number;
  waypoints: any[];
  polyline: string | null;
  optimized_order: number[];
  weather_context?: {
    temperature: number;
    condition: "Clear" | "Cloudy" | "Rainy" | "Storm" | "Unknown";
    code: number;
  };
}
