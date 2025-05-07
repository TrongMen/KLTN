"use client";

import React from "react";
import Image from "next/image";
import { Cross1Icon, LockClosedIcon, ReloadIcon } from "@radix-ui/react-icons";
import { ApiUser } from "../tabs/MembersTabContent";
import { User as MainUserType } from "../homeuser";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: ApiUser | null;
  currentUser: MainUserType | null;
  onTriggerLockAccount: (userToLock: ApiUser) => void;
  isLockingTargetUser: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  currentUser,
  onTriggerLockAccount,
  isLockingTargetUser,
}) => {
  if (!isOpen || !userProfile) return null;

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return "Chưa cập nhật";
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

  const getRoleDisplayName = (
    roles: { name: string }[] | undefined
  ): string => {
    if (!roles || roles.length === 0) return "Chưa có vai trò";
    const roleMap: Record<string, string> = {
      ADMIN: "Quản trị viên",
      USER: "Thành viên nòng cốt",
      GUEST: "Thành viên vãng lai",
    };
    return roles
      .map((role) => roleMap[role.name.toUpperCase()] || role.name)
      .join(", ");
  };

  // Kiểm tra xem người dùng hiện tại có phải là admin không
  // Giả định MainUserType có cấu trúc roles tương tự ApiUser
  const isCurrentUserAdmin = currentUser?.roles?.some((role) =>
    typeof role === "string"
      ? role.toUpperCase() === "ADMIN"
      : role.name?.toUpperCase() === "ADMIN"
  );

  const canLockThisUser =
    isCurrentUserAdmin &&
    userProfile.id !== currentUser?.id &&
    !userProfile.locked;

  const handleTriggerLock = () => {
    if (userProfile) {
      onTriggerLockAccount(userProfile);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-0 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 md:p-5 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg md:text-xl font-bold text-gray-800">
            Thông tin thành viên
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 cursor-pointer hover:text-red-600 transition-colors p-1 rounded-full"
            aria-label="Đóng modal"
          >
            <Cross1Icon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow p-5 md:p-6 space-y-4">
          <div className="flex flex-col items-center mb-4">
            <img
              src={
                userProfile.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  userProfile.firstName ||
                    userProfile.lastName ||
                    userProfile.username ||
                    "U"
                )}&background=random&color=fff&size=128`
              }
              alt={`Avatar của ${
                userProfile.firstName || userProfile.username
              }`}
              width={100}
              height={100}
              className="rounded-full object-cover border-2 border-gray-200 shadow-md"
            />
            <h3 className="text-xl font-semibold text-gray-800 mt-3">
              {`${userProfile.lastName || ""} ${
                userProfile.firstName || ""
              }`.trim() || userProfile.username}
            </h3>
            <p className="text-sm text-gray-500">
              {userProfile.email || "Chưa cập nhật email"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <strong className="font-medium text-gray-600">
                Tên đăng nhập:
              </strong>
              <p className="text-gray-800">
                {userProfile.username || "Chưa cập nhật"}
              </p>
            </div>
            <div>
              <strong className="font-medium text-gray-600">Ngày sinh:</strong>
              <p className="text-gray-800">{formatDate(userProfile.dob)}</p>
            </div>
            <div>
              <strong className="font-medium text-gray-600">Giới tính:</strong>
              <p className="text-gray-800">
                {userProfile.gender === true
                  ? "Nam"
                  : userProfile.gender === false
                  ? "Nữ"
                  : "Chưa cập nhật"}
              </p>
            </div>
            <div>
              <strong className="font-medium text-gray-600">
                Vai trò hệ thống:
              </strong>
              <p className="text-gray-800">
                {getRoleDisplayName(userProfile.roles)}
              </p>
            </div>
            <div>
              <strong className="font-medium text-gray-600">
                Vị trí trong CLB:
              </strong>
              <p className="text-gray-800">
                {userProfile.position?.name || "Chưa có"}
              </p>
            </div>
            <div>
              <strong className="font-medium text-gray-600">
                Vai trò tổ chức:
              </strong>
              <p className="text-gray-800">
                {userProfile.organizerRole?.name || "Không có"}
              </p>
            </div>
            <div>
              <strong className="font-medium text-gray-600">
                Tài khoản bị khóa:
              </strong>
              <p
                className={`text-gray-800 ${
                  userProfile.locked
                    ? "text-red-600 font-semibold"
                    : "text-green-600"
                }`}
              >
                {userProfile.locked ? "Có" : "Không"}
              </p>
            </div>
            {userProfile.locked && (
              <>
                <div>
                  <strong className="font-medium text-gray-600">
                    Ngày khóa:
                  </strong>
                  <p className="text-gray-800">
                    {formatDate(userProfile.lockedAt)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <strong className="font-medium text-gray-600">
                    Lý do khóa:
                  </strong>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {userProfile.lockReason || "Không có thông tin"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="px-4 md:px-6 py-3 border-t bg-gray-50 flex justify-end gap-3 items-center sticky bottom-0">
          {canLockThisUser && (
            <button
              onClick={handleTriggerLock}
              disabled={isLockingTargetUser || userProfile.locked}
              className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium flex items-center gap-1.5 ${
                isLockingTargetUser || userProfile.locked
                  ? "bg-red-300 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 cursor-pointer"
              }`}
            >
              {isLockingTargetUser ? (
                <ReloadIcon className="h-4 w-4 animate-spin" />
              ) : (
                <LockClosedIcon className="h-4 w-4" />
              )}
              {isLockingTargetUser
                ? "Đang khóa..."
                : userProfile.locked
                ? "Đã bị khóa"
                : "Khóa tài khoản"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm transition text-sm font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
