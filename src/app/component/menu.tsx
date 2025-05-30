"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { CiCamera } from "react-icons/ci";
import { toast, Toaster } from "react-hot-toast";
import { useRefreshToken } from "../../hooks/useRefreshToken";

interface Role {
  name?: string;
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
  position?: {
    name?: string;
  };
  joinedDate?: string; // Đã có trong interface User của bạn
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

type ProfileErrors = {
  firstName?: string;
  lastName?: string;
  dob?: string;
  email?: string;
};

const capitalizeEachWord = (str: string = ""): string => {
  if (!str) return "";
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const roleDisplayMap: Record<string, string> = {
  ADMIN: "Quản trị viên",
  USER: "Thành viên nòng cốt",
  GUEST: "Thành viên vãng lai",
};

const formatDateForDisplay = (dateString: string | undefined | null): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (e) {
    return "Ngày không hợp lệ";
  }
};

interface UserMenuProps {
  user: User | null;
  onLogout: () => void;
}

export default function UserMenu({ user, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false); // Đổi tên để rõ ràng hơn
  const [updatedUser, setUpdatedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordVisibility, setPasswordVisibility] = useState({ // Đổi tên cho state quản lý hiển thị mật khẩu
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [changePasswordError, setChangePasswordError] = useState("");
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { refreshToken } = useRefreshToken();

  useEffect(() => {
    if (showProfile && user) {
      setUpdatedUser(user);
    }
  }, [showProfile, user]);

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    let pValue: any = value;
    if (name === "gender") {
      pValue = value === "Nam" ? true : value === "Nữ" ? false : undefined;
    } else if (name === "dob") {
      pValue = value ? new Date(value).toISOString().split("T")[0] : "";
    } else if (name === "firstName" || name === "lastName") {
      pValue = capitalizeEachWord(value);
    }
    setUpdatedUser((prev) => ({ ...prev!, [name]: pValue }));
    if (profileErrors[name as keyof ProfileErrors]) {
      setProfileErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateProfile = (data: User | null): ProfileErrors => {
    const errors: ProfileErrors = {};
    if (!data) return errors;
    if (data.dob) {
      try {
        const birthDate = new Date(data.dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const mDiff = today.getMonth() - birthDate.getMonth();
        if (
          mDiff < 0 ||
          (mDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        if (isNaN(age) || age < 17) {
          errors.dob = "Bạn phải đủ 17 tuổi.";
        }
      } catch (e) {
        errors.dob = "Ngày sinh không hợp lệ.";
      }
    } else {
      errors.dob = "Nhập ngày sinh.";
    }
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (data.email && !gmailRegex.test(data.email)) {
      errors.email = "Email phải đúng định dạng @gmail.com.";
    } else if (!data.email) {
      errors.email = "Nhập email.";
    }
    return errors;
  };

  const handleSaveProfile = async () => {
    if (!user?.id || !updatedUser) return;
    const validationErrors = validateProfile(updatedUser);
    setProfileErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast.error("Kiểm tra lại thông tin.");
      return;
    }
    setIsSavingProfile(true);
    let token = localStorage.getItem("authToken");

    const bodyToSend: UserUpdateFormData = {
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      dob: updatedUser.dob,
      gender: updatedUser.gender,
      email: updatedUser.email,
    };
    Object.keys(bodyToSend).forEach(
      (key) =>
        (bodyToSend[key as keyof UserUpdateFormData] === undefined ||
          bodyToSend[key as keyof UserUpdateFormData] === null) &&
        delete bodyToSend[key as keyof UserUpdateFormData]
    );

    try {
      let headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/byuser/${user.id}`,
        { method: "PUT", headers, body: JSON.stringify(bodyToSend) }
      );

      if (
        (response.status === 401 || response.status === 403) &&
        refreshToken
      ) {
        const newAuthToken = await refreshToken();
        if (newAuthToken) {
          token = newAuthToken;
          localStorage.setItem("authToken", newAuthToken);
          headers["Authorization"] = `Bearer ${newAuthToken}`;
          response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/byuser/${user.id}`,
            { method: "PUT", headers, body: JSON.stringify(bodyToSend) }
          );
        } else {
          throw new Error("Phiên làm mới token thất bại.");
        }
      }

      const data = await response.json();
      if (response.ok && data.code === 1000) {
        toast.success("Cập nhật thông tin thành công!");
        localStorage.setItem("user", JSON.stringify(data.result)); 
        setUpdatedUser(data.result);
        setIsEditing(false);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        throw new Error(data.message || "Cập nhật thất bại");
      }
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`);
    } finally {
      setIsSavingProfile(false);
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
    let token = localStorage.getItem("authToken");

    const bodyToSend: PasswordChangeData = {
      passwordOld: passwordFormData.currentPassword,
      password: passwordFormData.newPassword,
    };

    try {
      let headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/byuser/${user.id}`,
        { method: "PUT", headers, body: JSON.stringify(bodyToSend) }
      );

      if (
        (response.status === 401 || response.status === 403) &&
        refreshToken
      ) {
        const newAuthToken = await refreshToken();
        if (newAuthToken) {
          token = newAuthToken;
          localStorage.setItem("authToken", newAuthToken);
          headers["Authorization"] = `Bearer ${newAuthToken}`;
          response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/byuser/${user.id}`,
            { method: "PUT", headers, body: JSON.stringify(bodyToSend) }
          );
        } else {
          throw new Error("Phiên làm mới token thất bại.");
        }
      }

      const data = await response.json();
      if (response.ok && data.code === 1000) {
        toast.success("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        setPasswordFormData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowChangePasswordModal(false);
        onLogout();
      } else {
        throw new Error(
          data.message || "Đổi mật khẩu thất bại (Mật khẩu cũ sai?)"
        );
      }
    } catch (error: any) {
      setChangePasswordError(error.message || "Đã xảy ra lỗi.");
      toast.error(`Lỗi: ${error.message}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCameraClick = () => {
    inputRef.current?.click();
  };

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return;
    setIsUploadingAvatar(true);
    const uploadToastId = toast.loading("Đang tải lên ảnh đại diện...");
    let token = localStorage.getItem("authToken");

    const formData = new FormData();
    formData.append("file", file);

    try {
      let headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/${user.id}/avatar`,
        { method: "PATCH", headers, body: formData }
      );

      if (
        (response.status === 401 || response.status === 403) &&
        refreshToken
      ) {
        const newAuthToken = await refreshToken();
        if (newAuthToken) {
          token = newAuthToken;
          localStorage.setItem("authToken", newAuthToken);
          headers["Authorization"] = `Bearer ${newAuthToken}`;
          response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/${user.id}/avatar`,
            { method: "PATCH", headers, body: formData }
          );
        } else {
          throw new Error("Phiên làm mới token thất bại.");
        }
      }

      const data = await response.json();
      if (response.ok && data.code === 1000) {
        toast.success("Cập nhật ảnh đại diện thành công!", {
          id: uploadToastId,
        });
        const newAvatarUrl = data.result?.avatar;
        if (newAvatarUrl) {
          const updatedUserDataFromUpload = {
            ...(user || {}),
            avatar: newAvatarUrl,
          } as User;
          setUpdatedUser(updatedUserDataFromUpload);
          localStorage.setItem(
            "user",
            JSON.stringify(updatedUserDataFromUpload)
          );
          if (typeof window !== "undefined") {
             window.location.reload();
          }
        }
      } else {
        throw new Error(data.message || "Upload ảnh đại diện thất bại");
      }
    } catch (error: any) {
      toast.error(`Lỗi upload: ${error.message}`, { id: uploadToastId });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user?.id) {
      uploadAvatar(file);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const menuItemClassName =
    "block w-full text-left px-4 py-2 text-sm text-gray-700 cursor-pointer ui-active:bg-gray-100 ui-not-active:bg-white hover:bg-gray-200";
  const logoutItemClassName =
    "block w-full text-left px-4 py-2 text-sm cursor-pointer text-red-600 ui-active:bg-red-500 ui-active:text-white ui-not-active:bg-white hover:bg-red-50";

  const profileFields = [
    { label: "Họ", name: "lastName", type: "text" },
    { label: "Tên", name: "firstName", type: "text" },
    { label: "Email", name: "email", type: "text" },
    { label: "Giới tính", name: "gender", type: "select" },
    { label: "Mã số", name: "username", type: "text", readOnly: true },
    { label: "Ngày sinh", name: "dob", type: "date" },
    { label: "Vị trí", name: "position.name", type: "text", readOnly: true },
    { label: "Vai trò", name: "roles.name", type: "text", readOnly: true },
    { label: "Ngày tham gia", name: "joinedDate", type: "text", readOnly: true },
  ];

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <Menu as="div" className="relative inline-block text-left z-[60]">
        <MenuButton
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 hover:bg-gray-200 rounded cursor-pointer"
        >
          <img
            src={user?.avatar || "/default-avatar.png"}
            alt="Avatar"
            className="w-6 h-6 rounded-full object-cover border border-blue-200"
            onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
          />
          <span className="font-medium text-sm">
            {" "}
            {user
              ? `${user.lastName || ""} ${user.firstName || ""}`.trim() ||
                user.username
              : "Tài khoản"}{" "}
          </span>
        </MenuButton>
        <MenuItems className="absolute right-0 mt-2 w-52 border rounded-lg bg-white shadow-lg z-[60] overflow-hidden focus:outline-none">
          <MenuItem
            as="button"
            onClick={() => {
              setShowProfile(true);
              setIsEditing(false);
              setIsOpen(false);
              setUpdatedUser(user);
              setProfileErrors({});
            }}
            className={menuItemClassName}
          >
            {" "}
            Thông tin cá nhân{" "}
          </MenuItem>
          <MenuItem
            as="button"
            onClick={() => {
              setShowChangePasswordModal(true);
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
            {" "}
            Đổi mật khẩu{" "}
          </MenuItem>
          <MenuItem
            as="button"
            onClick={onLogout}
            className={logoutItemClassName}
          >
            {" "}
            Đăng xuất{" "}
          </MenuItem>
        </MenuItems>
      </Menu>

      {showProfile && updatedUser && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[70]"
          onClick={() => {
            if (!isEditing && !isUploadingAvatar) {
              setShowProfile(false);
              setProfileErrors({});
            }
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
              <div className="relative">
                <img
                  src={updatedUser.avatar || "/default-avatar.png"}
                  alt="Avatar"
                  className="w-28 h-28 rounded-full border-4 border-blue-200 object-cover shadow-md"
                  onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
                />
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                    {" "}
                    <svg
                      className="animate-spin h-8 w-8 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      {" "}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      ></circle>{" "}
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        className="opacity-75"
                      ></path>{" "}
                    </svg>{" "}
                  </div>
                )}
              </div>
              {isEditing && (
                <>
                  {" "}
                  <button
                    className={`mt-2 cursor-pointer rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 shadow text-xs flex items-center gap-1 ${
                      isUploadingAvatar ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={handleCameraClick}
                    disabled={isUploadingAvatar}
                  >
                    {" "}
                    <CiCamera /> {isUploadingAvatar
                      ? "Đang tải..."
                      : "Đổi ảnh"}{" "}
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
              {profileFields.map((field) => {
                let displayValue: any;
                if (field.name === "position.name") {
                  displayValue = updatedUser.position?.name || "";
                } else if (field.name === "roles.name") {
                  const roleNameFromUser =
                    updatedUser.roles?.[0]?.name?.toUpperCase();
                  displayValue = roleNameFromUser
                    ? roleDisplayMap[roleNameFromUser] ||
                      updatedUser.roles?.[0]?.name ||
                      "Chưa xác định"
                    : "Chưa có vai trò";
                } else if (field.name === "joinedDate") {
                  displayValue = formatDateForDisplay(updatedUser.joinedDate);
                }
                else {
                  displayValue = (updatedUser as any)[field.name];
                }
                return (
                  <div key={field.name} className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600 mb-1">
                      {" "}
                      {field.label}{" "}
                      {isEditing &&
                        !field.readOnly &&
                        field.name !== "gender" &&
                        field.name !== "username" && (
                          <span className="text-red-500 ml-1">*</span>
                        )}{" "}
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
                        disabled={!isEditing || isUploadingAvatar}
                        className={`px-4 py-2 rounded-lg text-sm outline-none transition border ${
                          isEditing
                            ? "bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-300 text-gray-900"
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
                        value={
                            field.name === "dob" && updatedUser.dob ? 
                            updatedUser.dob.split("T")[0] : 
                            (displayValue || "")
                        }
                        onChange={handleProfileChange}
                        readOnly={!isEditing || field.readOnly}
                        disabled={isUploadingAvatar || field.readOnly}
                        className={`px-4 py-2 rounded-lg text-sm outline-none transition border ${
                          isEditing && !field.readOnly
                            ? "bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-300 text-gray-900"
                            : "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      />
                    )}
                    {profileErrors[field.name as keyof ProfileErrors] &&
                      isEditing && (
                        <p className="text-red-500 text-xs mt-1">
                          {profileErrors[field.name as keyof ProfileErrors]}
                        </p>
                      )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-4">
              {isEditing ? (
                <>
                  {" "}
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || isUploadingAvatar}
                    className={`px-5 py-2 rounded-lg font-semibold cursor-pointer shadow transition flex items-center justify-center ${
                      isSavingProfile || isUploadingAvatar
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
                      setProfileErrors({});
                    }}
                    disabled={isSavingProfile || isUploadingAvatar}
                    className="px-5 py-2 bg-gray-300 hover:bg-gray-400 cursor-pointer text-gray-800 rounded-lg font-semibold shadow transition"
                  >
                    Hủy
                  </button>{" "}
                </>
              ) : (
                <>
                  {" "}
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={isUploadingAvatar}
                    className={`px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow transition cursor-pointer ${
                      isUploadingAvatar ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Cập nhật
                  </button>{" "}
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      setProfileErrors({});
                    }}
                    disabled={isUploadingAvatar}
                    className={`px-5 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow transition cursor-pointer ${
                      isUploadingAvatar ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    Đóng
                  </button>{" "}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showChangePasswordModal && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-[70]"
          onClick={() => setShowChangePasswordModal(false)}
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
              <p className="text-sm text-gray-500">Cập nhật mật khẩu mới</p>{" "}
            </div>
            {[
              { label: "Mật khẩu hiện tại", name: "currentPassword" },
              { label: "Mật khẩu mới", name: "newPassword" },
              { label: "Nhập lại mật khẩu mới", name: "confirmPassword" },
            ].map((field) => (
              <div key={field.name} className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {" "}
                  {field.label} <span className="text-red-500">*</span>{" "}
                </label>
                <input
                  type={
                    passwordVisibility[field.name as keyof typeof passwordVisibility]
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
                  required
                  className="w-full px-4 py-2 text-black pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPasswordVisibility((prev) => ({
                      ...prev,
                      [field.name]:
                        !prev[field.name as keyof typeof passwordVisibility],
                    }))
                  }
                  className="absolute right-3 top-8 text-gray-500 hover:text-gray-800"
                >
                  {" "}
                  {passwordVisibility[field.name as keyof typeof passwordVisibility]
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
                className={`bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 py-2 rounded hover:opacity-90 shadow flex items-center justify-center ${
                  isChangingPassword ? "cursor-wait" : "cursor-pointer"
                }`}
              >
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
                  setShowChangePasswordModal(false);
                  setChangePasswordError("");
                  setPasswordFormData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 cursor-pointer"
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