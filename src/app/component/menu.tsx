"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaUserCircle } from "react-icons/fa";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { CiCamera } from "react-icons/ci";

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [user, setUser] = useState(null);
  const [updatedUser, setUpdatedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [error, setError] = useState("");
  const router = useRouter();
  const inputRef = useRef();
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
      setUpdatedUser(storedUser);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsEditing(false);
    setShowProfile(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = () => {
    if (formData.currentPassword !== user?.password) {
      setError("Mật khẩu hiện tại không đúng.");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Mật khẩu mới không khớp.");
      return;
    }
    const updated = { ...user, password: formData.newPassword };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
    setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setError("");
    setShowChangePassword(false);
  };
  // Hàm xử lý khi nhấp vào biểu tượng camera
  const handleCameraClick = () => {
    inputRef.current.click();
  };
  return (
    <>
      <Menu as="div" className="relative inline-block text-left">
        <MenuButton
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded cursor-pointer"
        >
          <FaUserCircle className="text-xl" />
          <span className="font-medium">{user?.username ?? "Tài khoản"}</span>
        </MenuButton>

        {isOpen && (
          <MenuItems className="absolute right-0 mt-2 w-52  border rounded-lg bg-white shadow-md z-50">
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => {
                    setShowProfile(true);
                    setIsEditing(false);
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-black cursor-pointer ${
                    active ? "bg-gray-200" : ""
                  }`}
                >
                  Thông tin cá nhân
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={() => {
                    setShowChangePassword(true);
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-black cursor-pointer ${
                    active ? "bg-gray-200" : ""
                  }`}
                >
                  Đổi mật khẩu
                </button>
              )}
            </MenuItem>
            <MenuItem>
              {({ active }) => (
                <button
                  onClick={handleLogout}
                  className={`block w-full text-left px-4 py-2 cursor-pointer ${
                    active
                      ? "bg-red-500 text-white"
                      : "text-red-500 hover:bg-red-100"
                  }`}
                >
                  Đăng xuất
                </button>
              )}
            </MenuItem>
          </MenuItems>
        )}
      </Menu>

      {/* Modal thông tin cá nhân */}
      {showProfile && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-2xl">
            <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">
              Thông tin cá nhân
            </h2>

            <div className="flex justify-center mb-6">
              <img
                src={updatedUser?.avatarUrl ?? "/default-avatar.png"}
                alt="Avatar"
                className="w-28 h-28 rounded-full border-4 border-blue-200 object-cover shadow-md"
              />
            </div>
            <div className="flex justify-center mb-6">
              <button
                className="cursor-pointer rounded-full  bg-blue-100 hover:bg-blue-200 text-blue-700  py-2 px-4  shadow flex items-center gap-1"
                onClick={handleCameraClick}
              >
                <CiCamera size="1.4rem" />
              </button>
              <input
                type="file"
                ref={inputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setUpdatedUser((prev) => ({
                        ...prev,
                        avatarUrl: reader.result,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {[
                { label: "Họ và tên", name: "username" },
                { label: "Email", name: "email" },
                { label: "Ngày sinh", name: "dob" },
                { label: "Giới tính", name: "gender" },
                { label: "Số điện thoại", name: "phone" },
                { label: "Chức vụ", name: "position" },
                
              ].map((field) => (
                <div key={field.name} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-600 mb-1">
                    {field.label}
                  </label>
                  {field.name === "gender" ? (
                    <select
                      name="gender"
                      value={updatedUser?.gender ?? ""}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`px-4 py-2 rounded-lg text-sm text-black outline-none transition border ${
                        isEditing
                          ? "bg-white border-blue-400 focus:ring-2 focus:ring-blue-300"
                          : "bg-gray-100 border-gray-300 text-gray-500"
                      }`}
                    >
                      <option value="">-- Chọn giới tính --</option>
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                    </select>
                  ) : (
                    <input
                      type={field.name === "dob" ? "date" : "text"}
                      name={field.name}
                      value={updatedUser?.[field.name] ?? ""}
                      onChange={handleChange}
                      readOnly={!isEditing}
                      className={`px-4 py-2 rounded-lg text-sm text-black outline-none transition border ${
                        isEditing
                          ? "bg-white border-blue-400 focus:ring-2 focus:ring-blue-300"
                          : "bg-gray-100 border-gray-300 text-gray-500"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold shadow"
                  >
                    Lưu
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setUpdatedUser(user);
                    }}
                    className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow"
                  >
                    Hủy
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow"
                  >
                    Cập nhật
                  </button>
                  <button
                    onClick={() => setShowProfile(false)}
                    className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow"
                  >
                    Đóng
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal đổi mật khẩu */}
      {showChangePassword && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-pink-600">Đổi mật khẩu</h2>
              <p className="text-sm text-gray-500">
                Cập nhật mật khẩu mới cho tài khoản của bạn
              </p>
            </div>

            {[
              {
                label: "Mật khẩu hiện tại",
                name: "currentPassword",
              },
              {
                label: "Mật khẩu mới",
                name: "newPassword",
              },
              {
                label: "Nhập lại mật khẩu mới",
                name: "confirmPassword",
              },
            ].map((field) => (
              <div key={field.name} className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type={showPassword[field.name] ? "text" : "password"}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 text-black pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => ({
                      ...prev,
                      [field.name]: !prev[field.name],
                    }))
                  }
                  className="absolute right-3 top-11 transform -translate-y-1/2 text-gray-500 hover:text-gray-800"
                >
                  {showPassword[field.name] ? "🙈" : "👁️"}
                </button>
              </div>
            ))}

            {error && (
              <p className="text-red-500 text-sm text-center mb-4">{error}</p>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handlePasswordChange}
                className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 py-2 rounded hover:opacity-90 shadow"
              >
                Xác nhận
              </button>
              <button
                onClick={() => {
                  setFormData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                  setError("");
                  setShowChangePassword(false);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
