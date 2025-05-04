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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false); // Thêm state loading
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
    setLoading(true); // Bắt đầu loading
    setError(""); // Xóa lỗi cũ

    if (captchaInput.trim().toUpperCase() !== captcha) {
      setError("Mã captcha không đúng. Vui lòng thử lại.");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      setLoading(false); // Kết thúc loading nếu captcha sai
      return;
    }

    const loginData = {
      username,
      password,
    };

    try {
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

      const token = authData.result?.token;
      if (!token) throw new Error("Không nhận được token");
      localStorage.setItem("authToken", token);

      const userInfoResponse = await fetch(
        "http://localhost:8080/identity/users/myInfo",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const userInfo = await userInfoResponse.json();
      if (!userInfoResponse.ok) {
        localStorage.removeItem("authToken"); // Xóa token nếu không lấy được thông tin user
        throw new Error(userInfo.message || "Lỗi khi lấy thông tin user");
      }

      const roleName = userInfo.result?.roles?.[0]?.name?.toUpperCase();

      toast.success("Đăng nhập thành công!");

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
          // Có thể xử lý trường hợp role không xác định hoặc đẩy về trang mặc định
           localStorage.removeItem("authToken"); // Xóa token nếu role không hợp lệ
           toast.error(`Role "${roleName}" không được hỗ trợ hoặc không tồn tại.`);
           router.push("/"); // Chuyển về trang chủ hoặc trang login
           handleRefreshCaptcha();
           setPassword("");
          break;
      }
    } catch (error) {
      console.error("Đăng nhập thất bại:", error);
      toast.error("Đăng nhập thất bại: " + error.message);
      handleRefreshCaptcha();
      setPassword("");
    } finally {
      setLoading(false); // Kết thúc loading dù thành công hay thất bại
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    // Cho phép nhập số và giới hạn độ dài nếu cần, ví dụ 10 ký tự
    if (/^\d*$/.test(value) && value.length <= 10) {
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
            type="text" // Thay đổi type thành text để hiển thị placeholder tốt hơn và xử lý input dễ hơn
            inputMode="numeric" // Gợi ý bàn phím số trên di động
            pattern="\d*" // Chỉ cho phép nhập số về mặt HTML5 (cần validate thêm)
            placeholder="Mã số sinh viên"
            value={username}
            onChange={handleUsernameChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            maxLength={10} // Giới hạn độ dài ví dụ
            required // Thêm required nếu cần
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              required // Thêm required nếu cần
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-500"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
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
              className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              maxLength={5}
              required // Thêm required nếu cần
            />
            <div className="flex items-center space-x-2">
              <div className="px-3 py-2 font-bold bg-gray-100 rounded-lg text-lg tracking-widest select-none border border-gray-300">
                {captcha}
              </div>
              <button
                type="button"
                onClick={handleRefreshCaptcha}
                title="Làm mới mã"
                className="text-blue-500 hover:text-blue-700 text-xl p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                🔄
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium mt-1">{error}</p>
          )}

          {/* Cập nhật nút đăng nhập */}
          <button
            type="submit"
            className={`w-full mt-2 py-3 text-white font-semibold rounded-lg transition-all shadow-md ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
            }`}
            disabled={loading}
          >
            {loading ? "⏳ Đang xử lý..." : "Đăng nhập"}
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
          <label className="transition-all text-sm text-gray-600">Bạn chưa có tài khoản?</label>
          <button
            onClick={() => router.push("/register")}
            className="text-blue-500 hover:underline hover:text-blue-700 transition-all cursor-pointer font-semibold text-sm"
          >
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
}