// src/hooks/useUser.ts
import { useEffect, useState } from "react";

export function useUser() {
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    // Giả lập fetch user từ localStorage hoặc API
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return { user };
}
