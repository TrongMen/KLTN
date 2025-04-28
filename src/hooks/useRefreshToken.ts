"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation"; // Import useRouter nếu bạn muốn chuyển hướng từ hook

const REFRESH_URL = "http://localhost:8080/identity/auth/refresh";

export function useRefreshToken() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter(); // Khởi tạo router nếu cần chuyển hướng

  useEffect(() => {
    // Chỉ đọc localStorage ở client sau khi component đã mount
    const storedToken = localStorage.getItem("authToken");
    setAuthToken(storedToken);
    setIsInitialized(true); // Đánh dấu đã khởi tạo
  }, []); // Dependency rỗng đảm bảo chạy 1 lần

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const currentRefreshToken = localStorage.getItem("refreshToken");

    if (!currentRefreshToken) {
      setAuthToken(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authenticated");
      // Có thể xem xét chuyển hướng ở đây nếu đang ở trang cần auth
      // if (window.location.pathname !== '/login') { // Ví dụ kiểm tra trang hiện tại
      //   router.push('/login?sessionExpired=true');
      // }
      return null;
    }

    if (refreshing) {
      return authToken; // Trả về token hiện tại nếu đang refresh
    }

    setRefreshing(true);
    try {
      const response = await fetch(REFRESH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Refresh token failed:", response.status, data?.message);
        setAuthToken(null);
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authenticated");
        setRefreshing(false);
        // Chuyển hướng về login khi refresh thất bại (ví dụ: refresh token hết hạn)
        router.push('/login?sessionExpired=true');
        return null;
      }

      const newToken = data.result?.token;
      if (newToken) {
        localStorage.setItem("authToken", newToken);
        setAuthToken(newToken);

        if (data.result?.authenticated !== undefined) {
          localStorage.setItem("authenticated", String(data.result.authenticated)); // Lưu dạng string
        }
        if (data.result?.refreshToken) {
          localStorage.setItem("refreshToken", data.result.refreshToken);
        }

        setRefreshing(false);
        return newToken;
      } else {
        // Dù response ok nhưng không có token mới -> logout
        console.warn("Refresh response OK, but no new token in data.result.token");
        setAuthToken(null);
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authenticated");
        setRefreshing(false);
        router.push('/login?sessionExpired=true');
        return null;
      }

    } catch (error) {
      console.error("Error during token refresh:", error);
      setAuthToken(null);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authenticated");
      setRefreshing(false);
     
      router.push('/login?sessionExpired=true');
      return null;
    }
  }, [refreshing, authToken, router]); // Thêm router vào dependency

  return { authToken, refreshToken, refreshing, isInitialized };
}