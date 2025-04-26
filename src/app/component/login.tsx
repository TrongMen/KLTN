"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const generateCaptcha = () => {
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  };
  


  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setError("");
  };

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
      // 1. Gọi API đăng nhập để lấy token
      const authResponse = await fetch(
        "http://localhost:8080/identity/auth/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      const authData = await authResponse.json();
      if (!authResponse.ok) {
        throw new Error(authData.message || "Đăng nhập thất bại");
      }

      // 2. Lưu token vào localStorage
      const token = authData.result?.token;
      if (!token) throw new Error("Không nhận được token");
      localStorage.setItem("authToken", token);

      // 3. Gọi API lấy thông tin user
      const userInfoResponse = await fetch(
        "http://localhost:8080/identity/users/myInfo",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const userInfo = await userInfoResponse.json();
      if (!userInfoResponse.ok) {
        throw new Error(userInfo.message || "Lỗi khi lấy thông tin user");
      }

      console.log(localStorage.getItem("authToken"));
      console.log(userInfo.result?.roles?.[0]?.name); // sửa chỗ này

      const roleName = userInfo.result?.roles?.[0]?.name?.toUpperCase();
      console.log("User role:", roleName);

      switch (roleName) {
        case "ADMIN":
          router.push("/admin");
          break;
        case "GUEST":
          router.push("/guest");
          break;
        case "USER":
          router.push("/user");
          break;
        default:
          router.push("/");
          toast.error(`Role "${roleName}" không được hỗ trợ`);
      }
      

      toast.success("Đăng nhập thành công!");
    } catch (error) {
      console.error("Đăng nhập thất bại:", error);
      toast.error("Đăng nhập thất bại: " + error.message);
      handleRefreshCaptcha();
      setPassword("");
      return;
    }
  };


  const handleUsernameChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setUsername(value);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <Toaster toastOptions={{ duration: 3500 }} />
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

          <div className="flex items-center space-x-3">
            <input
              type="text"
              placeholder="Nhập mã captcha"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
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
