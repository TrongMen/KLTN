"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from 'react-hot-toast';

const InputWithIcon: React.FC<{icon: React.ReactNode, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, type?: string}> = ({
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
      {icon}
    </span>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
    />
  </div>
);

export default function Register() {
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("male");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!password || !firstName || !lastName || !dob || !email || !studentId) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    const requestBody = {
      username: studentId,
      password,
      firstName,
      lastName,
      dob,
      email,
      gender: gender === "male",
    };

    try {
      setLoading(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = "Đăng ký thất bại";
        if (result && result.message) {
            errorMessage = result.message;
        } else if (response.status === 409) {
            errorMessage = "Mã số sinh viên hoặc email đã tồn tại.";
        }
        throw new Error(errorMessage);
      }
      
      if (result.code !== 1000) {
         throw new Error(result.message || "Đăng ký thất bại do lỗi không xác định từ máy chủ.");
      }

      toast.success("Đăng ký thành công! Bạn sẽ được chuyển đến trang đăng nhập.");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Đăng ký thất bại do lỗi không mong muốn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-400 to-blue-600 p-4">
      <Toaster toastOptions={{ duration: 3500 }} />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <h1
          className="text-3xl font-extrabold text-gray-800 text-center mb-6"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          ✍️ Đăng ký
        </h1>

        <div className="space-y-4">
          <div className="flex gap-4">
            <InputWithIcon
              type="text"
              placeholder="Họ"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              icon="👤"
            />
            <InputWithIcon
              type="text"
              placeholder="Tên"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              icon="👤"
            />
          </div>
          <InputWithIcon
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon="👨‍💻"
          />

          <InputWithIcon
            type="text"
            placeholder="Mã số sinh viên"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            icon="🆔"
          />

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Giới tính:
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center space-x-1">
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === "male"}
                  onChange={() => setGender("male")}
                />
                <span>Nam</span>
              </label>
              <label className="flex items-center space-x-1">
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === "female"}
                  onChange={() => setGender("female")}
                />
                <span>Nữ</span>
              </label>
            </div>
          </div>

          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
          />

          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
              🔑
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-500"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <button
          onClick={handleRegister}
          className={`w-full mt-4 py-3 text-white font-semibold rounded-lg transition-all shadow-md cursor-pointer ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
          }`}
          disabled={loading}
        >
          {loading ? "⏳ Đang xử lý..." : "Xác nhận"}
        </button>

        <div className="flex justify-center mt-4 items-center space-x-2">
          <label className="transition-all">Đã có tài khoản?</label>
          <button
            onClick={() => router.push("/login")}
            className="text-green-500 hover:underline hover:text-green-700 transition-all cursor-pointer font-semibold"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}