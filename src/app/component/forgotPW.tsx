"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState(""); 
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(false); 
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); 
    setIsLoading(true); 

    try {
      const response = await fetch(
        `http://localhost:8080/identity/users/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, email }), 
        }
      );

      const data = await response.json();

      if (response.ok && data.code === 1000) {
        setSubmitted(true);
      } else {
        setError(data.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
      }
    } catch (err) {
      console.error("API call failed:", err);
      setError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại.");
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1
          className="text-2xl font-bold text-center text-gray-800 mb-6"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          🔐 Quên mật khẩu
        </h1>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600 mb-2">
              Nhập tên đăng nhập và địa chỉ email đã đăng ký để nhận hướng dẫn
              đặt lại mật khẩu.
            </p>
            {error && (
              <div className="text-center text-red-600 font-medium p-2 bg-red-100 rounded-md">
                {error}
              </div>
            )}
            <input
              type="text"
              placeholder="Tên đăng nhập"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              disabled={isLoading}
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              disabled={isLoading} 
            />
            <button
              type="submit"
              className={`w-full cursor-pointer py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all shadow-md ${
                isLoading ? "opacity-50 cursor-not-allowed" : "" 
              }`}
              disabled={isLoading} 
            >
              {isLoading ? "Đang gửi..." : "Gửi yêu cầu"}
            </button>
          </form>
        ) : (
          <div className="text-center text-green-600 font-medium">
            ✅ Yêu cầu đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email của
            bạn!
          </div>
        )}

        <button
          onClick={() => router.push("/login")}
          className="block mx-auto cursor-pointer mt-6 text-blue-500 hover:underline hover:text-blue-700 text-sm font-medium transition-all"
          disabled={isLoading} 
        >
          ← Quay lại trang đăng nhập
        </button>
      </div>
    </div>
  );
}