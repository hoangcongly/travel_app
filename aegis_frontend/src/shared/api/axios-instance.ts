import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * AEGIS Axios Singleton
 * ─────────────────────
 * - Base URL lấy từ env (NEXT_PUBLIC_API_BASE_URL).
 * - Request interceptor: inject Bearer token cho các route cần auth.
 * - Response interceptor: normalize lỗi 401/403/409/4xx/5xx thành
 *   một kiểu ApiError duy nhất để React Query onError xử lý.
 */

// ── Types ──────────────────────────────────────────────────────────
export interface ApiError {
  status: number;
  detail: string;
  raw: AxiosError;
}

// ── Các path yêu cầu Bearer token (mock JWT: "Bearer user-{id}") ──
const AUTH_PATHS = [
  "/api/v1/inventory/lock",
  "/api/v1/inventory/locks",
  "/api/v1/vision/closet",
];

function requiresAuth(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_PATHS.some((p) => url.includes(p));
}

// ── Instance ───────────────────────────────────────────────────────
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request Interceptor ────────────────────────────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (requiresAuth(config.url)) {
    // Trong MVP ta dùng mock token.  Production: thay bằng JWT thật.
    const userId =
      typeof window !== "undefined"
        ? localStorage.getItem("aegis_user_id") ?? "1"
        : "1";
    config.headers.Authorization = `Bearer user-${userId}`;
  }
  return config;
});

// ── Response Interceptor ───────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ detail?: string }>) => {
    const status = error.response?.status ?? 0;
    const detail =
      error.response?.data?.detail ??
      error.message ??
      "Lỗi không xác định";

    const apiError: ApiError = { status, detail, raw: error };

    // 401 / 403 → có thể redirect login (khi có auth thật)
    if (status === 401 || status === 403) {
      console.warn("[AEGIS] Unauthorized:", detail);
    }

    return Promise.reject(apiError);
  },
);

export default api;
