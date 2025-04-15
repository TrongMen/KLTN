"use client";

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"


const InputWithIcon = ({
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
  const [fullName, setFullName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState(""); 
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("male");
  const [dob, setDob] = useState("");
  const [email, setEmail] = useState(""); // Định nghĩa email
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!password || !firstName || !lastName || !phone || !dob || !email || !studentId) {
      toast.error("Vui lòng nhập đầy đủ thông tin!");
      return;
    }
  
    const requestBody = {
      username: studentId,  // Mã sinh viên
      password,  // Mật khẩu
      firstName, // Tên
      lastName,  // Họ
      dob,       // Ngày sinh
      email,     // Email nhập từ người dùng
      gender: gender === "male", // Giới tính: true cho Nam, false cho Nữ
    };
  
    try {
      setLoading(true);
  
      const response = await fetch("http://localhost:8080/identity/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.message || "Đăng ký thất bại");
      }
  
      toast.success(" Đăng ký thành công!");
      router.push("/login");
    } catch (error) {
      console.error("Error:", error);
      toast.error(" Đăng ký thất bại: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-400 to-blue-600 p-4">
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
            type="tel"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon="📱"
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
