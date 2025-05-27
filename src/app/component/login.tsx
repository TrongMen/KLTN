"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from 'react-hot-toast';
import ConfirmationDialog from "../../utils/ConfirmationDialog";
import { UpdateIcon } from "@radix-ui/react-icons"; // Thêm import icon

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (captchaInput.trim().toUpperCase() !== captcha) {
      setError("Mã captcha không đúng. Vui lòng thử lại.");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      setLoading(false);
      return;
    }

    try {
      const authResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/auth/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        }
      );

      const authData = await authResponse.json();
      if (!authResponse.ok || authData.code !== 1000) {
        throw new Error(authData.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }

      const token = authData.result?.token;
      if (!token) throw new Error("Không nhận được token xác thực.");
      
      const userInfoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/myInfo`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const userInfoData = await userInfoResponse.json();
      if (!userInfoResponse.ok || userInfoData.code !== 1000 || !userInfoData.result) {
        throw new Error(userInfoData.message || "Lỗi khi lấy thông tin người dùng.");
      }

      const userDetails = userInfoData.result;

      if (userDetails.locked) {
        localStorage.removeItem("authToken"); 
        let lockMessage = "Tài khoản của bạn đã bị khóa.";
        if (userDetails.lockReason) {
          lockMessage += ` Lý do: ${userDetails.lockReason}.`;
        }
        lockMessage += " Vui lòng liên hệ quản trị viên.";
        toast.error(lockMessage, { duration: 5000 });
        handleRefreshCaptcha();
        setPassword("");
        setLoading(false);
        return;
      }
      
      localStorage.setItem("authToken", token);
      toast.success("Đăng nhập thành công!");

      const roleName = userDetails.roles?.[0]?.name?.toUpperCase();
      
      setTimeout(() => {
        switch (roleName) {
          case "ADMIN":
          case "SYSADMIN":
            router.push("/admin");
            break;
          case "GUEST":
            router.push("/guest");
            break;
          case "USER":
            router.push("/user");
            break;
          default:
            localStorage.removeItem("authToken");
            toast.error(
              `Vai trò "${roleName || 'không xác định'}" không được hỗ trợ hoặc không tồn tại.`
            );
            router.push("/");
            handleRefreshCaptcha();
            setPassword("");
            break;
        }
        setLoading(false);
      }, 500);
    } catch (error: any) {
      toast.error("Đăng nhập thất bại: " + error.message);
      handleRefreshCaptcha();
      setPassword("");
      setLoading(false);
    }
  };
  
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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
            type="text"
            inputMode="numeric"
            pattern="\d*"
            placeholder="Mã số sinh viên"
            value={username}
            onChange={handleUsernameChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            maxLength={10}
            required
            disabled={loading}
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 ${loading ? 'cursor-not-allowed' : 'hover:text-blue-500'}`}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              disabled={loading}
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
              required
              autoComplete="off"
              disabled={loading}
            />
            <div className="flex items-center space-x-2">
              <div className="px-3 py-2 font-bold bg-gray-100 rounded-lg text-lg tracking-widest select-none border border-gray-300">
                {captcha}
              </div>
              <button
                type="button"
                onClick={handleRefreshCaptcha}
                title="Làm mới mã"
                className={`text-blue-500 hover:text-blue-700 text-xl p-1 rounded-full hover:bg-gray-100 transition-colors ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
                disabled={loading}
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
            className={`w-full mt-2 py-3 text-white font-semibold rounded-lg transition-all shadow-md flex items-center justify-center ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
            }`}
            disabled={loading}
          >
            {loading ? (
              <>
                <UpdateIcon className="w-5 h-5 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

         <div className="flex justify-end mt-2">
           <button
             onClick={() => router.push("/forgot-password")}
             className={`text-sm text-blue-500 font-medium transition-all ${loading ? 'cursor-not-allowed text-gray-400' : 'hover:underline hover:text-blue-700 cursor-pointer'}`}
             disabled={loading} 
           >
             Quên mật khẩu?
           </button>
         </div>


        <div className="flex justify-center mt-4 items-center space-x-2">
          <label className="transition-all text-sm text-gray-600">
            Bạn chưa có tài khoản?
          </label>
          <button
            onClick={() => router.push("/register")}
            className={`text-blue-500 font-semibold text-sm transition-all ${loading ? 'cursor-not-allowed text-gray-400' : 'hover:underline hover:text-blue-700 cursor-pointer'}`}
            disabled={loading} 
          >
            Đăng ký ngay
          </button>
        </div>
      </div>
    </div>
  );
}