"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify"; // Thêm thư viện Toastify để thông báo

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Thêm state để hiển thị mật khẩu
  const router = useRouter();

  const generateCaptcha = () => {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  const handleLogin = async (e) => {
    e?.preventDefault();

    if (captchaInput.trim().toUpperCase() !== captcha) {
      setError("Mã captcha không đúng. Vui lòng thử lại.");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }

    const loginData = {
      username,
      password,
    };

    try {
      const response = await fetch("http://localhost:8080/identity/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Đăng nhập thất bại");
      }

      
      localStorage.setItem("authToken", result.token);

     
      toast.success("Đăng nhập thành công!");

 
      router.push("/"); 
    } catch (error) {
      console.error("Đăng nhập thất bại:", error);
      toast.error("Đăng nhập thất bại: " + error.message);
    }
  };

  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setError("");
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setUsername(value);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1
          className="text-3xl font-extrabold text-gray-800 text-center mb-6"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          🔑 Đăng nhập
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="number"
            placeholder="Mã số sinh viên"
            value={username}
            onChange={handleUsernameChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          
          {/* Thêm nút ẩn/hiện mật khẩu */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"} 
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)} 
              className="absolute right-3 top-3 text-gray-500"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Captcha input */}
          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Nhập mã captcha"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              className="w-1/2 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
            <div className="flex items-center space-x-2">
              <div className="px-3 py-2 font-bold bg-gray-100 rounded-lg text-lg tracking-widest select-none">
                {captcha}
              </div>
              <button
                type="button"
                onClick={handleRefreshCaptcha}
                title="Làm mới mã"
                className="text-blue-500 hover:text-blue-700 text-xl"
              >
                🔄
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium mt-1">{error}</p>
          )}

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-all shadow-md cursor-pointer"
          >
            Đăng nhập
          </button>
        </form>

        <div className="flex justify-end mt-2">
          <button
            onClick={() => router.push("/forgot-password")}
            className="text-sm text-blue-500 hover:underline hover:text-blue-700 font-medium transition-all cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        </div>

        <div className="flex justify-center mt-4 items-center space-x-2">
          <label className="transition-all">Chưa có tài khoản?</label>
          <button
            onClick={() => router.push("/register")}
            className="text-blue-500 hover:underline hover:text-blue-700 transition-all cursor-pointer font-semibold"
          >
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
}
