import { cookies } from "next/headers"; // 👈 Chỉ server mới chạy được cái này
import { fetchWithRetry, FetchOptions } from "./core-fetch"; // Import từ file sạch

// Hàm wrapper dành riêng cho Server (Tự gắn Cookie & URL)
export const apiClient = async (endpoint: string, options: FetchOptions = {}): Promise<Response> => {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const url = `${base}${endpoint}`;

  const cookieStore = cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ');

  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookieHeader,
    ...options.headers,
  } as HeadersInit;

  return fetchWithRetry(url, { ...options, headers });
};