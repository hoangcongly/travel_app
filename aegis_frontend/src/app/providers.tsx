"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

/**
 * AEGIS Global Providers
 * ──────────────────────
 * Quản lý Server State (React Query) cho toàn bộ ứng dụng.
 * Cấu hình default retry = 1 để tránh spam API khi lỗi 4xx.
 */

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error: any) => {
              // Không retry nếu là lỗi Client (4xx)
              if (error?.status >= 400 && error?.status < 500) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
