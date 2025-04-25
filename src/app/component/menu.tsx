"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaUserCircle } from "react-icons/fa";
import { CiCamera } from "react-icons/ci";
import { toast, Toaster } from "react-hot-toast";
import { useRefreshToken } from "../../hooks/useRefreshToken";

// --- ConfirmationDialog Component Definition ---
interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
}
function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  confirmVariant = "primary",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;
  const confirmBtnClasses = useMemo(() => {
    let b =
      "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger") {
      b +=
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    } else {
      b +=
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
    }
    return b;
  }, [confirmVariant]);
  const cancelBtnClasses =
    "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className={`text-lg font-bold mb-3 ${
            confirmVariant === "danger" ? "text-red-700" : "text-gray-800"
          }`}
        >
          {title}
        </h3>
        <div className="text-sm text-gray-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel} className={cancelBtnClasses}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={confirmBtnClasses}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Interfaces ---
interface Role {
  name: string;
  description?: string;
  permissions?: any[];
}
interface User {
  id: string;
  roles?: Role[];
  firstName?: string;
  lastName?: string;
  username?: string;
  dob?: string;
  avatar?: string;
  email?: string;
  gender?: boolean;
  role?: string;
}
interface UserUpdateFormData {
  firstName?: string;
  lastName?: string;
  dob?: string;
  gender?: boolean;
  email?: string;
}
interface PasswordChangeData {
  passwordOld: string;
  password?: string;
}

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [updatedUser, setUpdatedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [changePasswordError, setChangePasswordError] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { refreshToken } = useRefreshToken();

  const fetchUserInfo = useCallback(async (showToast = false) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setUser(null);
        localStorage.removeItem("user");
        return;
      }
      const res = await fetch("http://localhost:8080/identity/users/myInfo", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.result) {
        setUser(data.result);
        setUpdatedUser(data.result);
        localStorage.setItem("user", JSON.stringify(data.result));
        if (showToast) toast.success("Refreshed user info!");
      } else {
        console.error("Failed fetch user info:", data.message);
        if (res.status === 401 || res.status === 403) handleLogout();
      }
    } catch (error) {
      console.error("API error fetch user info:", error);
      setUser(null);
      localStorage.removeItem("user");
    }
  }, []);
  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const handleLogout = useCallback(async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        await fetch("http://localhost:8080/identity/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
      }
    } catch (error) {
      console.error("API logout error:", error);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      setUser(null);
      router.push("/login");
    }
  }, [router]);
  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "gender") {
      setUpdatedUser((prev) => ({
        ...prev!,
        [name]: value === "Nam" ? true : value === "Nữ" ? false : undefined,
      }));
    } else if (name === "dob") {
      const dateValue = value
        ? new Date(value).toISOString().split("T")[0]
        : "";
      setUpdatedUser((prev) => ({ ...prev!, [name]: dateValue }));
    } else {
      setUpdatedUser((prev) => ({ ...prev!, [name]: value }));
    }
  };
  const handlePasswordInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPasswordFormData({
      ...passwordFormData,
      [e.target.name]: e.target.value,
    });
    if (changePasswordError) setChangePasswordError("");
  };

  const handleSaveProfile = async () => {
    if (!user?.id || !updatedUser) return;
    setIsSavingProfile(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsSavingProfile(false);
      return;
    }
    const body: UserUpdateFormData = {
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      dob: updatedUser.dob,
      gender: updatedUser.gender,
      email: updatedUser.email,
    };
    Object.keys(body).forEach(
      (key) =>
        (body[key as keyof UserUpdateFormData] === undefined ||
          body[key as keyof UserUpdateFormData] === null) &&
        delete body[key as keyof UserUpdateFormData]
    );
    console.log("Sending profile update:", body);
    try {
      const res = await fetch(
        `http://localhost:8080/identity/users/byuser/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (res.ok && data.code === 1000) {
        toast.success("Cập nhật thành công!");
        setUser(data.result);
        setUpdatedUser(data.result);
        localStorage.setItem("user", JSON.stringify(data.result));
        setIsEditing(false);
      } else {
        throw new Error(data.message || "Cập nhật thất bại");
      }
    } catch (error: any) {
      console.error("Lỗi cập nhật profile:", error);
      toast.error(`Lỗi: ${error.message}`);
      setUpdatedUser(user);
    } finally {
      setIsSavingProfile(false);
    }
  };
  const handlePasswordChangeSubmit = async () => {
    if (!user?.id) return;
    setChangePasswordError("");
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setChangePasswordError("Mật khẩu mới không khớp.");
      return;
    }
    if (!passwordFormData.currentPassword || !passwordFormData.newPassword) {
      setChangePasswordError("Vui lòng nhập đủ mật khẩu.");
      return;
    }
    setIsChangingPassword(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsChangingPassword(false);
      return;
    }
    const body: PasswordChangeData = {
      passwordOld: passwordFormData.currentPassword,
      password: passwordFormData.newPassword,
    };
    console.log("Sending password change...");
    try {
      const res = await fetch(
        `http://localhost:8080/identity/users/byuser/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (res.ok && data.code === 1000) {
        toast.success("Đổi mật khẩu thành công!");
        setPasswordFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowChangePassword(false);
      } else {
        throw new Error(data.message || "Đổi mật khẩu thất bại");
      }
    } catch (error: any) {
      console.error("Lỗi đổi mật khẩu:", error);
      setChangePasswordError(error.message || "Đã xảy ra lỗi.");
      toast.error(`Lỗi: ${error.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };
  const handleCameraClick = () => {
    inputRef.current?.click();
  };
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUpdatedUser((prev) => ({
          ...prev!,
          avatar: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
      toast.info("Upload Avatar đang phát triển.");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  // Class chung cho các menu item, sử dụng data attribute từ Headless UI
  const menuItemClassName =
    "block w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer ui-active:bg-gray-100 ui-not-active:bg-white hover:bg-gray-200";
  const logoutItemClassName =
    "block w-full text-left px-4 py-2 text-sm cursor-pointer text-red-600 ui-active:bg-red-500 ui-active:text-white ui-not-active:bg-white hover:bg-red-50";

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Menu as="div" className="relative inline-block text-left">
        <MenuButton
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded cursor-pointer"
        >
          <img
            src={user?.avatar || "/default-avatar.png"}
            alt="Avatar"
            className="w-6 h-6 rounded-full object-cover border border-blue-200"
            onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
          />
          <span className="font-medium text-sm">
            {user?.username ?? "Tài khoản"}
          </span>
        </MenuButton>

        {/* Sử dụng <Transition> của Headless UI cho hiệu ứng (optional) */}
        <Menu.Items className="absolute right-0 mt-2 w-52 border rounded-lg bg-white shadow-lg z-50 overflow-hidden focus:outline-none">
          {/* *** SỬA LẠI MenuItem DÙNG as="button" *** */}
          <Menu.Item
            as="button"
            onClick={() => {
              setShowProfile(true);
              setIsEditing(false);
              setIsOpen(false);
              setUpdatedUser(user);
            }}
            className={menuItemClassName}
          >
            Thông tin cá nhân
          </Menu.Item>
          <Menu.Item
            as="button"
            onClick={() => {
              setShowChangePassword(true);
              setIsOpen(false);
              setChangePasswordError("");
              setPasswordFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
            }}
            className={menuItemClassName}
          >
            Đổi mật khẩu
          </Menu.Item>
          <Menu.Item
            as="button"
            onClick={handleLogout}
            className={logoutItemClassName}
          >
            Đăng xuất
          </Menu.Item>
        </Menu.Items>
      </Menu>

      {showProfile && updatedUser && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50"
          onClick={() => {
            if (!isEditing) setShowProfile(false);
          }}
        >
          <div
            className="bg-white p-6 md:p-8 rounded-2xl shadow-xl w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-center text-blue-600 mb-6">
              Thông tin cá nhân
            </h2>
            <div className="flex flex-col items-center mb-6 gap-2">
              <img
                src={updatedUser.avatar || "/default-avatar.png"}
                alt="Avatar"
                className="w-28 h-28 rounded-full border-4 border-blue-200 object-cover shadow-md"
                onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
              />
              {isEditing && (
                <>
                  {" "}
                  <button
                    className="cursor-pointer rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 shadow text-xs flex items-center gap-1"
                    onClick={handleCameraClick}
                  >
                    {" "}
                    <CiCamera /> Đổi ảnh{" "}
                  </button>{" "}
                  <input
                    type="file"
                    ref={inputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />{" "}
                </>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { label: "Tên", name: "firstName" },
                { label: "Họ", name: "lastName" },
                { label: "Email", name: "email" },
                { label: "Ngày sinh", name: "dob", type: "date" },
                { label: "Giới tính", name: "gender", type: "select" },
                { label: "Username", name: "username", readOnly: true },
              ].map((field) => (
                <div key={field.name} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-600 mb-1">
                    {field.label}
                  </label>
                  {field.type === "select" ? (
                    <select
                      name={field.name}
                      value={
                        updatedUser.gender === true
                          ? "Nam"
                          : updatedUser.gender === false
                          ? "Nữ"
                          : ""
                      }
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                      className={`px-4 py-2 rounded-lg text-sm outline-none transition border ${
                        isEditing
                          ? "bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-300 text-black"
                          : "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {" "}
                      <option value="">-- Chọn --</option>{" "}
                      <option value="Nam">Nam</option>{" "}
                      <option value="Nữ">Nữ</option>{" "}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      name={field.name}
                      value={updatedUser[field.name as keyof User] || ""}
                      onChange={handleProfileChange}
                      readOnly={!isEditing || field.readOnly}
                      className={`px-4 py-2 rounded-lg text-sm outline-none transition border ${
                        isEditing && !field.readOnly
                          ? "bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-300 text-black"
                          : "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4">
              {isEditing ? (
                <>
                  {" "}
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className={`px-5 py-2 rounded-lg font-semibold shadow transition flex items-center justify-center ${
                      isSavingProfile
                        ? "bg-green-300 cursor-not-allowed"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                  >
                    {" "}
                    {isSavingProfile ? (
                      <>
                        <svg
                          className="animate-spin mr-2 h-4 w-4"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="opacity-25"
                          ></circle>
                          <path
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            className="opacity-75"
                          ></path>
                        </svg>
                        ...
                      </>
                    ) : (
                      "Lưu"
                    )}{" "}
                  </button>{" "}
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setUpdatedUser(user);
                    }}
                    disabled={isSavingProfile}
                    className="px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow transition"
                  >
                    {" "}
                    Hủy{" "}
                  </button>{" "}
                </>
              ) : (
                <>
                  {" "}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2 bg-blue-500 cursor-pointer hover:bg-blue-600 text-white rounded-lg font-semibold shadow transition"
                  >
                    
                    Cập nhật
                  </button>
                  <button
                    onClick={() => setShowProfile(false)}
                    className="px-5 py-2 bg-gray-300 hover:bg-gray-400 cursor-pointer text-gray-800 rounded-lg font-semibold shadow transition"
                  >
                    {" "}
                    Đóng{" "}
                  </button>{" "}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50"
          onClick={() => setShowChangePassword(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              {" "}
              <h2 className="text-2xl font-bold text-pink-600">
                Đổi mật khẩu
              </h2>{" "}
              <p className="text-sm text-gray-500"> Cập nhật mật khẩu mới </p>{" "}
            </div>
            {[
              { label: "Mật khẩu hiện tại", name: "currentPassword" },
              { label: "Mật khẩu mới", name: "newPassword" },
              { label: "Nhập lại mật khẩu mới", name: "confirmPassword" },
            ].map((field) => (
              <div key={field.name} className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {" "}
                  {field.label}{" "}
                </label>
                <input
                  type={
                    showPassword[field.name as keyof typeof showPassword]
                      ? "text"
                      : "password"
                  }
                  name={field.name}
                  value={
                    passwordFormData[
                      field.name as keyof typeof passwordFormData
                    ]
                  }
                  onChange={handlePasswordInputChange}
                  className="w-full px-4 py-2 text-black pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((prev) => ({
                      ...prev,
                      [field.name]:
                        !prev[field.name as keyof typeof showPassword],
                    }))
                  }
                  className="absolute right-3 top-8 text-gray-500 hover:text-gray-800"
                >
                  {" "}
                  {showPassword[field.name as keyof typeof showPassword]
                    ? "🙈"
                    : "👁️"}{" "}
                </button>
              </div>
            ))}
            {changePasswordError && (
              <p className="text-red-500 text-sm text-center mb-4">
                {changePasswordError}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handlePasswordChangeSubmit}
                disabled={isChangingPassword}
                className={`bg-gradient-to-r from-pink-400 to-pink-600 text-white px-4 py-2  cursor-pointer rounded hover:opacity-90 shadow flex items-center justify-center ${
                  isChangingPassword ? "cursor-wait" : ""
                }`}
              >
                {" "}
                {isChangingPassword ? (
                  <>
                    <svg
                      className="animate-spin mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      ></circle>
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        className="opacity-75"
                      ></path>
                    </svg>
                    ...
                  </>
                ) : (
                  "Xác nhận"
                )}
              </button>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setChangePasswordError("");
                  setPasswordFormData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="px-4 py-2 cursor-pointer bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
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
