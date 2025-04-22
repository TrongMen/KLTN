"use client";
import { useState, useEffect } from "react";

const REFRESH_URL = "http://localhost:8080/identity/auth/refresh";

export function useRefreshToken() {
  const [authToken, setAuthToken] = useState(localStorage.getItem("authToken") || null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      setAuthToken(null);
      return null;
    }

    setRefreshing(true);
    try {
      const response = await fetch(REFRESH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthToken(null);
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("authenticated");
        setRefreshing(false);
        return null;
      }

      if (data.result?.token) {
        localStorage.setItem("authToken", data.result.token);
        setAuthToken(data.result.token);
      }
      if (data.result?.authenticated !== undefined) {
        localStorage.setItem("authenticated", data.result.authenticated);
      }
      setRefreshing(false);
      return data.result.token;
    } catch (error) {
      console.error("Lỗi làm mới token:", error);
      setRefreshing(false);
      return null;
    }
  };

  useEffect(() => {
    // Optionally, refresh token on mount or at intervals
  }, []);

  return { authToken, refreshToken, refreshing };
}