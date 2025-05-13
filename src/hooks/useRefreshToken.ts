"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

const REFRESH_URL = "${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/auth/refresh";

export function useRefreshToken() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    const currentRefreshToken = localStorage.getItem("refreshToken");

    if (!currentRefreshToken) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authenticated");
      return null;
    }

    if (refreshing) {
      console.warn("Refresh token request already in progress.");
      return localStorage.getItem("authToken");
    }

    if (isMounted.current) {
      setRefreshing(true);
    }

    try {
      const response = await fetch(REFRESH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        console.error("Refresh token failed:", response.status, data?.message);
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authenticated");
        router.push('/login?sessionExpired=true');
        return null;
      }

      const newToken = data.result?.token;
      if (newToken) {
        localStorage.setItem("authToken", newToken);
        if (data.result?.authenticated !== undefined) {
          localStorage.setItem("authenticated", String(data.result.authenticated));
        }
        if (data.result?.refreshToken) {
          localStorage.setItem("refreshToken", data.result.refreshToken);
        }
        return newToken;
      } else {
        console.warn("Refresh response OK, but no new token.");
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authenticated");
        router.push('/login?sessionExpired=true');
        return null;
      }
    } catch (error) {
      console.error("Error during token refresh:", error);
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authenticated");
      router.push('/login?sessionExpired=true');
      return null;
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  }, [refreshing, router]);

  return { refreshToken, refreshing };
}