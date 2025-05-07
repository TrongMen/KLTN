"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast, Toaster } from "react-hot-toast";
import Image from "next/image";
import { User as MainUserType } from "../homeuser";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  MagnifyingGlassIcon,
  Component1Icon,
  ListBulletIcon,
  TrashIcon,
  ReloadIcon,
  LockClosedIcon,
  LockOpen1Icon,
  InformationCircledIcon,
} from "@radix-ui/react-icons";
import UserProfileModal from "../modals/UserProfileModal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  requiresReason?: boolean;
  onConfirmWithReason?: (reason: string) => void;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmButtonClass?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  requiresReason = false,
  onConfirmWithReason,
  reasonLabel = "Lý do:",
  reasonPlaceholder = "Nhập lý do...",
  confirmButtonClass = "bg-red-500 hover:bg-red-600",
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiresReason && onConfirmWithReason) {
      if (!reason.trim()) {
        toast.error("Vui lòng nhập lý do.");
        return;
      }
      onConfirmWithReason(reason.trim());
    } else if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 z-[80] flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-600 mb-4 whitespace-pre-line">{message}</p>
        {requiresReason && (
          <div className="mb-4">
            <label
              htmlFor="confirm-reason-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {reasonLabel}
            </label>
            <textarea
              id="confirm-reason-input"
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
            />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 cursor-pointer bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={requiresReason && !reason.trim()}
            className={`px-4 py-2 cursor-pointer text-white rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ApiPosition {
  id: string;
  name: string;
}

export interface ApiOrganizerRole {
  id: string;
  name: string;
}

export interface LockedByInfo {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
}

export interface ApiUser {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  dob: string | null;
  roles: { name: string; description?: string; permissions?: any[] }[];
  avatar: string | null;
  email: string | null;
  gender: boolean | null;
  position?: ApiPosition | null;
  organizerRole?: ApiOrganizerRole | null;
  locked: boolean;
  lockedAt?: string | null;
  lockedBy?: LockedByInfo | null;
  lockReason?: string | null;
  qrCodeUrl?: string | null;
}

export interface DisplayMember {
  id: string;
  displayName: string;
  roleName: string;
  email: string | null;
  avatar: string | null;
  positionName: string | null;
  organizerRoleName: string | null;
  locked: boolean;
}

export interface DisplayLockedMemberInfo extends DisplayMember {
  lockedAt: string | null;
  lockReason: string | null;
  lockedByInfo: LockedByInfo | null;
  lockedByDisplayName: string;
}

interface MembersTabContentProps {
  user: MainUserType | null;
  userRole: "ADMIN" | "USER" | "GUEST" | string;
  currentUserEmail: string | null;
}

const roleDisplayMap: Record<string, string> = {
  ADMIN: "Quản trị viên",
  GUEST: "Thành viên vãng lai",
  USER: "Thành viên nòng cốt",
  UNKNOWN: "Chưa xác định",
};

const MembersTabContent: React.FC<MembersTabContentProps> = ({
  user,
  userRole,
  currentUserEmail,
}) => {
  const [tab, setTab] = useState<
    "all" | "admin" | "core" | "casual" | "locked"
  >("all");
  const [allApiUsers, setAllApiUsers] = useState<ApiUser[]>([]);
  const [displayMembers, setDisplayMembers] = useState<DisplayMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "none">("none");

  const [rawLockedUsers, setRawLockedUsers] = useState<ApiUser[]>([]);
  const [displayLockedUsers, setDisplayLockedUsers] = useState<
    DisplayLockedMemberInfo[]
  >([]);
  const [loadingLocked, setLoadingLocked] = useState<boolean>(false);
  const [errorLocked, setErrorLocked] = useState<string | null>(null);

  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [assigningPositionTo, setAssigningPositionTo] = useState<string | null>(
    null
  );
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [organizerRoles, setOrganizerRoles] = useState<ApiOrganizerRole[]>([]);
  const [assigningOrganizerRoleTo, setAssigningOrganizerRoleTo] = useState<
    string | null
  >(null);
  const [selectedOrganizerRoleId, setSelectedOrganizerRoleId] =
    useState<string>("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmDialogProps, setConfirmDialogProps] = useState<Omit<
    ConfirmDialogProps,
    "isOpen" | "onCancel"
  > | null>(null);
  const [lockingMemberId, setLockingMemberId] = useState<string | null>(null);
  const [unlockingMemberId, setUnlockingMemberId] = useState<string | null>(
    null
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] =
    useState<ApiUser | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "card">("list");

  const isCurrentUserAdmin = useMemo(() => {
    if (!user || !user.roles) return false;
    return user.roles.some((role) =>
      typeof role === "string"
        ? role.toUpperCase() === "ADMIN"
        : role.name?.toUpperCase() === "ADMIN"
    );
  }, [user]);

  const formatDateNullable = (
    dateString: string | undefined | null
  ): string => {
    if (!dateString) return "Không rõ";
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "Ngày không hợp lệ";
    }
  };

  const transformApiUserToDisplayMember = (apiUser: ApiUser): DisplayMember => {
    const roleName = apiUser.roles?.[0]?.name?.toUpperCase() || "UNKNOWN";
    let displayName = [apiUser.lastName, apiUser.firstName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (!displayName)
      displayName = apiUser.username || `User (${apiUser.id.substring(0, 6)})`;
    return {
      id: apiUser.id,
      displayName,
      roleName,
      email: apiUser.email,
      avatar: apiUser.avatar,
      positionName: apiUser.position?.name || null,
      organizerRoleName: apiUser.organizerRole?.name || null,
      locked: apiUser.locked,
    };
  };

  const transformApiUserToDisplayLockedMemberInfo = (
    apiUser: ApiUser
  ): DisplayLockedMemberInfo => {
    const baseDisplayMember = transformApiUserToDisplayMember(apiUser);
    let lockedByDisplayName = "Không rõ";
    if (apiUser.lockedBy) {
      lockedByDisplayName =
        [apiUser.lockedBy.lastName, apiUser.lockedBy.firstName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        apiUser.lockedBy.username ||
        `Admin (${apiUser.lockedBy.id.substring(0, 6)})`;
    }
    return {
      ...baseDisplayMember,
      lockedAt: apiUser.lockedAt || null,
      lockReason: apiUser.lockReason || null,
      lockedByInfo: apiUser.lockedBy || null,
      lockedByDisplayName,
    };
  };

  const fetchMembers = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Không tìm thấy token xác thực.");
      toast.error("Yêu cầu xác thực.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/identity/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let errMsg = `Lỗi ${response.status}`;
        if (response.status === 401 || response.status === 403) {
          errMsg = "Phiên hết hạn/Không có quyền.";
          localStorage.removeItem("authToken");
        } else {
          try {
            const errData = await response.json();
            errMsg = errData.message || errMsg;
          } catch (e) {}
        }
        throw new Error(errMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setAllApiUsers(data.result);
        setDisplayMembers(data.result.map(transformApiUserToDisplayMember));
      } else {
        throw new Error(data.message || "Dữ liệu thành viên không hợp lệ.");
      }
      setError(null);
    } catch (err: any) {
      console.error("Lỗi tải thành viên:", err);
      const msg = err instanceof Error ? err.message : "Lỗi tải thành viên.";
      setError(msg);
      toast.error(`Lỗi tải thành viên: ${msg}`);
      setDisplayMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLockedUsers = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setErrorLocked("Không tìm thấy token xác thực.");
      toast.error("Yêu cầu xác thực để xem danh sách bị khóa.");
      setLoadingLocked(false);
      return;
    }
    setLoadingLocked(true);
    setErrorLocked(null);
    try {
      const response = await fetch(
        "http://localhost:8080/identity/users/locked",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        let errMsg = `Lỗi ${response.status}`;
        if (response.status === 401 || response.status === 403) {
          errMsg = "Phiên hết hạn/Không có quyền.";
          localStorage.removeItem("authToken");
        } else {
          try {
            const errData = await response.json();
            errMsg = errData.message || errMsg;
          } catch (e) {}
        }
        throw new Error(errMsg);
      }
      const data = await response.json();
      if (
        data.code === 1000 &&
        data.result &&
        Array.isArray(data.result.content)
      ) {
        setRawLockedUsers(data.result.content);
        setDisplayLockedUsers(
          data.result.content.map(transformApiUserToDisplayLockedMemberInfo)
        );
      } else {
        throw new Error(
          data.message || "Dữ liệu tài khoản bị khóa không hợp lệ."
        );
      }
    } catch (err: any) {
      console.error("Lỗi tải tài khoản bị khóa:", err);
      const msg =
        err instanceof Error ? err.message : "Lỗi tải tài khoản bị khóa.";
      setErrorLocked(msg);
      toast.error(`Lỗi tải DS bị khóa: ${msg}`);
      setDisplayLockedUsers([]);
    } finally {
      setLoadingLocked(false);
    }
  }, []);

  const fetchPositions = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const response = await fetch(
        "http://localhost:8080/identity/api/positions",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        let errMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.message || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result))
        setPositions(data.result);
      else throw new Error(data.message || "Dữ liệu vị trí không hợp lệ.");
    } catch (err: any) {
      console.error("Lỗi tải vị trí:", err);
      const msg = err instanceof Error ? err.message : "Lỗi tải vị trí.";
      setError((prev) => (prev ? `${prev}\n${msg}` : msg));
      toast.error(`Lỗi tải vị trí: ${msg}`);
    }
  }, []);

  const fetchOrganizerRoles = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const response = await fetch(
        "http://localhost:8080/identity/api/organizerrole",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        let errMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.message || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result))
        setOrganizerRoles(data.result);
      else
        throw new Error(
          data.message || "Dữ liệu vai trò tổ chức không hợp lệ."
        );
    } catch (err: any) {
      console.error("Lỗi tải vai trò tổ chức:", err);
      const msg =
        err instanceof Error ? err.message : "Lỗi tải vai trò tổ chức.";
      setError((prev) => (prev ? `${prev}\n${msg}` : msg));
      toast.error(`Lỗi tải vai trò tổ chức: ${msg}`);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDisplayMembers([]);
    setPositions([]);
    setOrganizerRoles([]);
    Promise.all([
      fetchMembers(),
      fetchPositions(),
      fetchOrganizerRoles(),
    ]).finally(() => setLoading(false));
  }, [fetchMembers, fetchPositions, fetchOrganizerRoles]);

  useEffect(() => {
    if (tab === "locked" && !loadingLocked) {
      fetchLockedUsers();
    }
  }, [tab, fetchLockedUsers, ]);

  const processedMembers = useMemo(() => {
    let membersToProcess: Array<DisplayMember | DisplayLockedMemberInfo> = [];
    if (tab === "locked") {
      membersToProcess = [...displayLockedUsers];
    } else {
      membersToProcess = displayMembers.filter((member) => {
        if (tab === "all") return true;
        if (tab === "admin") return member.roleName === "ADMIN";
        if (tab === "core") return member.roleName === "USER";
        if (tab === "casual") return member.roleName === "GUEST";
        return false;
      });
    }

    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.trim().toLowerCase();
      membersToProcess = membersToProcess.filter(
        (member) =>
          member.displayName.toLowerCase().includes(lowerSearchTerm) ||
          (member.email &&
            member.email.toLowerCase().includes(lowerSearchTerm)) ||
          (tab === "locked" &&
            (member as DisplayLockedMemberInfo).lockReason
              ?.toLowerCase()
              .includes(lowerSearchTerm)) ||
          (tab === "locked" &&
            (member as DisplayLockedMemberInfo).lockedByDisplayName
              ?.toLowerCase()
              .includes(lowerSearchTerm)) ||
          (member.positionName &&
            member.positionName.toLowerCase().includes(lowerSearchTerm)) ||
          (member.organizerRoleName &&
            member.organizerRoleName.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (sortOrder === "az")
      membersToProcess.sort((a, b) =>
        a.displayName.localeCompare(b.displayName, "vi", {
          sensitivity: "base",
        })
      );
    else if (sortOrder === "za")
      membersToProcess.sort((a, b) =>
        b.displayName.localeCompare(a.displayName, "vi", {
          sensitivity: "base",
        })
      );
    return membersToProcess;
  }, [displayMembers, displayLockedUsers, tab, searchTerm, sortOrder]);

  const handleAssignPositionClick = (memberId: string) => {
    setAssigningPositionTo(memberId);
    const currentUserData = allApiUsers.find((u) => u.id === memberId);
    setSelectedPositionId(currentUserData?.position?.id || "");
    setAssigningOrganizerRoleTo(null);
    setSelectedOrganizerRoleId("");
  };

  const handleAssignOrganizerRoleClick = (memberId: string) => {
    setAssigningOrganizerRoleTo(memberId);
    const currentUserData = allApiUsers.find((u) => u.id === memberId);
    setSelectedOrganizerRoleId(currentUserData?.organizerRole?.id || "");
    setAssigningPositionTo(null);
    setSelectedPositionId("");
  };

  const handleAssignPosition = (memberId: string) => {
    if (!selectedPositionId) {
      toast.error("Vui lòng chọn vị trí.");
      return;
    }
    const member = displayMembers.find((m) => m.id === memberId);
    const position = positions.find((p) => p.id === selectedPositionId);
    if (!member || !position) {
      toast.error("Thông tin không hợp lệ.");
      return;
    }
    const assignPromise = new Promise<void>(async (resolve, reject) => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        reject(new Error("Token không tồn tại."));
        return;
      }
      try {
        const response = await fetch(
          `http://localhost:8080/identity/users/${memberId}/position?positionId=${selectedPositionId}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
        );
        const responseData = await response.json();
        if (!response.ok)
          throw new Error(responseData.message || `Lỗi ${response.status}.`);
        if (responseData.code !== 1000)
          throw new Error(responseData.message || "Lỗi API.");
        resolve();
      } catch (error) {
        console.error("Lỗi gán vị trí:", error);
        reject(error);
      }
    });
    toast.promise(assignPromise, {
      loading: `Đang gán vị trí "${position.name}"...`,
      success: () => {
        setAssigningPositionTo(null);
        setSelectedPositionId("");
        fetchMembers();
        return `Gán vị trí thành công!`;
      },
      error: (err) => `Gán thất bại: ${err.message}`,
    });
  };

  const handleRemovePosition = (memberId: string, memberName: string) => {
    const currentPositionName = displayMembers.find(
      (m) => m.id === memberId
    )?.positionName;
    setConfirmDialogProps({
      title: "Xác nhận xóa vị trí",
      message: `Xóa vị trí "${currentPositionName}" của "${memberName}"?`,
      onConfirm: () => {
        const removePromise = new Promise<void>(async (resolve, reject) => {
          const token = localStorage.getItem("authToken");
          if (!token) {
            reject(new Error("Token không tồn tại."));
            return;
          }
          try {
            const response = await fetch(
              `http://localhost:8080/identity/users/${memberId}/position`,
              { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
            );
            const responseData = await response.json();
            if (!response.ok)
              throw new Error(
                responseData.message || `Lỗi ${response.status}.`
              );
            if (responseData.code !== 1000)
              throw new Error(responseData.message || "Lỗi API.");
            resolve();
          } catch (error) {
            console.error("Lỗi xóa vị trí:", error);
            reject(error);
          }
        });
        toast.promise(removePromise, {
          loading: `Đang xóa vị trí của ${memberName}...`,
          success: () => {
            setAssigningPositionTo(null);
            setSelectedPositionId("");
            fetchMembers();
            setIsConfirmOpen(false);
            setConfirmDialogProps(null);
            return `Xóa vị trí thành công!`;
          },
          error: (err) => {
            setIsConfirmOpen(false);
            setConfirmDialogProps(null);
            return `Xóa thất bại: ${err.message}`;
          },
        });
      },
    });
    setIsConfirmOpen(true);
  };

  const handleAssignOrganizerRole = (memberId: string) => {
    if (!selectedOrganizerRoleId) {
      toast.error("Vui lòng chọn vai trò tổ chức.");
      return;
    }
    const member = displayMembers.find((m) => m.id === memberId);
    const role = organizerRoles.find((r) => r.id === selectedOrganizerRoleId);
    if (!member || !role) {
      toast.error("Thông tin không hợp lệ.");
      return;
    }
    const assignPromise = new Promise<void>(async (resolve, reject) => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        reject(new Error("Token không tồn tại."));
        return;
      }
      try {
        const response = await fetch(
          `http://localhost:8080/identity/users/${memberId}/organizer-role?organizerRoleId=${selectedOrganizerRoleId}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
        );
        const responseData = await response.json();
        if (!response.ok)
          throw new Error(responseData.message || `Lỗi ${response.status}.`);
        if (responseData.code !== 1000)
          throw new Error(responseData.message || "Lỗi API.");
        resolve();
      } catch (error) {
        console.error("Lỗi gán vai trò tổ chức:", error);
        reject(error);
      }
    });
    toast.promise(assignPromise, {
      loading: `Đang gán vai trò "${role.name}"...`,
      success: () => {
        setAssigningOrganizerRoleTo(null);
        setSelectedOrganizerRoleId("");
        fetchMembers();
        return `Gán vai trò thành công!`;
      },
      error: (err) => `Gán thất bại: ${err.message}`,
    });
  };

  const handleRemoveOrganizerRole = (memberId: string, memberName: string) => {
    const currentRoleName = displayMembers.find(
      (m) => m.id === memberId
    )?.organizerRoleName;
    if (!currentRoleName) return;
    setConfirmDialogProps({
      title: "Xác nhận xóa vai trò",
      message: `Xóa vai trò "${currentRoleName}" của "${memberName}"?`,
      onConfirm: () => {
        const removePromise = new Promise<void>(async (resolve, reject) => {
          const token = localStorage.getItem("authToken");
          if (!token) {
            reject(new Error("Token không tồn tại."));
            return;
          }
          try {
            const response = await fetch(
              `http://localhost:8080/identity/users/${memberId}/organizer-role`,
              { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
            );
            const responseData = await response.json();
            if (!response.ok)
              throw new Error(
                responseData.message || `Lỗi ${response.status}.`
              );
            if (responseData.code !== 1000)
              throw new Error(responseData.message || "Lỗi API.");
            resolve();
          } catch (error) {
            console.error("Lỗi xóa vai trò tổ chức:", error);
            reject(error);
          }
        });
        toast.promise(removePromise, {
          loading: `Đang xóa vai trò của ${memberName}...`,
          success: () => {
            setAssigningOrganizerRoleTo(null);
            setSelectedOrganizerRoleId("");
            fetchMembers();
            setIsConfirmOpen(false);
            setConfirmDialogProps(null);
            return `Xóa vai trò thành công!`;
          },
          error: (err) => {
            setIsConfirmOpen(false);
            setConfirmDialogProps(null);
            return `Xóa thất bại: ${err.message}`;
          },
        });
      },
    });
    setIsConfirmOpen(true);
  };

  const executeLockAccount = async (
    userIdToLock: string,
    reason: string,
    memberName: string
  ) => {
    const adminUserId = user?.id;
    if (!adminUserId || !isCurrentUserAdmin) {
      toast.error("Bạn không có quyền thực hiện hành động này.");
      setIsConfirmOpen(false);
      setConfirmDialogProps(null);
      return;
    }
    if (userIdToLock === adminUserId) {
      toast.error("Không thể tự khóa tài khoản của chính mình.");
      setIsConfirmOpen(false);
      setConfirmDialogProps(null);
      return;
    }
    setLockingMemberId(userIdToLock);
    const toastId = toast.loading(`Đang khóa tài khoản ${memberName}...`);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.", { id: toastId });
        throw new Error("Token không tồn tại.");
      }
      const url = `http://localhost:8080/identity/users/${userIdToLock}/lock?lockedById=${adminUserId}&reason=${encodeURIComponent(
        reason
      )}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseData = await response.json();
      if (!response.ok || responseData.code !== 1000) {
        throw new Error(
          responseData.message || `Lỗi khóa tài khoản (${response.status})`
        );
      }
      toast.success(
        responseData.message || `Đã khóa tài khoản ${memberName}!`,
        { id: toastId }
      );
      await Promise.all([fetchMembers(), fetchLockedUsers()]);
      if (selectedUserProfile && selectedUserProfile.id === userIdToLock) {
        const updatedUser =
          rawLockedUsers.find((u) => u.id === userIdToLock) ||
          allApiUsers.find((u) => u.id === userIdToLock);
        if (updatedUser) setSelectedUserProfile(updatedUser);
      }
    } catch (err: any) {
      toast.error(`Khóa thất bại: ${err.message}`, { id: toastId });
      console.error("Lỗi khóa tài khoản:", err);
    } finally {
      setLockingMemberId(null);
      setIsConfirmOpen(false);
      setConfirmDialogProps(null);
    }
  };

  const handleLockAccountTrigger = (
    memberData: ApiUser | DisplayMember | DisplayLockedMemberInfo
  ) => {
    const memberId = memberData.id;
    const fullMemberInfo =
      allApiUsers.find((u) => u.id === memberId) ||
      rawLockedUsers.find((u) => u.id === memberId) ||
      (memberData as ApiUser);
    const memberName =
      (fullMemberInfo as DisplayMember).displayName ||
      `${fullMemberInfo.lastName || ""} ${
        fullMemberInfo.firstName || ""
      }`.trim() ||
      fullMemberInfo.username ||
      "Thành viên";

    if (
      !user ||
      !isCurrentUserAdmin ||
      (user && fullMemberInfo.id === user.id)
    ) {
      toast.error("Không thể thực hiện hành động này hoặc bạn không có quyền.");
      return;
    }
    if (fullMemberInfo.locked) {
      toast.error(`Tài khoản "${memberName}" đã bị khóa.`);
      return;
    }
    setConfirmDialogProps({
      title: "Xác nhận khóa tài khoản",
      message: `Bạn có chắc muốn khóa tài khoản của "${memberName}"?`,
      requiresReason: true,
      reasonLabel: `Lý do khóa tài khoản ${memberName}:`,
      reasonPlaceholder: "Ví dụ: Vi phạm quy định...",
      confirmText: "Khóa tài khoản",
      confirmButtonClass: "bg-red-500 hover:bg-red-600",
      onConfirmWithReason: (reason) => {
        executeLockAccount(fullMemberInfo.id, reason, memberName);
      },
    });
    setIsConfirmOpen(true);
  };

  const executeUnlockAccount = async (
    userIdToUnlock: string,
    memberName: string
  ) => {
    if (!isCurrentUserAdmin) {
      toast.error("Bạn không có quyền thực hiện hành động này.");
      setIsConfirmOpen(false);
      setConfirmDialogProps(null);
      return;
    }
    setUnlockingMemberId(userIdToUnlock);
    const toastId = toast.loading(`Đang mở khóa tài khoản ${memberName}...`);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.", { id: toastId });
        throw new Error("Token không tồn tại.");
      }
      const url = `http://localhost:8080/identity/users/${userIdToUnlock}/unlock`;
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const responseData = await response.json();
      if (!response.ok || responseData.code !== 1000) {
        throw new Error(
          responseData.message || `Lỗi mở khóa tài khoản (${response.status})`
        );
      }
      toast.success(
        responseData.message || `Đã mở khóa tài khoản ${memberName}!`,
        { id: toastId }
      );
      await Promise.all([fetchMembers(), fetchLockedUsers()]);
      if (selectedUserProfile && selectedUserProfile.id === userIdToUnlock) {
        const updatedUser = allApiUsers.find((u) => u.id === userIdToUnlock);
        if (updatedUser) setSelectedUserProfile(updatedUser);
      }
    } catch (err: any) {
      toast.error(`Mở khóa thất bại: ${err.message}`, { id: toastId });
      console.error("Lỗi mở khóa tài khoản:", err);
    } finally {
      setUnlockingMemberId(null);
      setIsConfirmOpen(false);
      setConfirmDialogProps(null);
    }
  };

  const handleUnlockAccountTrigger = (
    memberData: ApiUser | DisplayLockedMemberInfo
  ) => {
    const memberId = memberData.id;
    const fullMemberInfo =
      rawLockedUsers.find((u) => u.id === memberId) ||
      allApiUsers.find((u) => u.id === memberId) ||
      (memberData as ApiUser);
    const memberName =
      (fullMemberInfo as DisplayMember).displayName ||
      `${fullMemberInfo.lastName || ""} ${
        fullMemberInfo.firstName || ""
      }`.trim() ||
      fullMemberInfo.username ||
      "Thành viên";

    if (!isCurrentUserAdmin) {
      toast.error("Bạn không có quyền thực hiện hành động này.");
      return;
    }
    if (!fullMemberInfo.locked) {
      toast.error(`Tài khoản "${memberName}" không bị khóa.`);
      return;
    }
    setConfirmDialogProps({
      title: "Xác nhận mở khóa tài khoản",
      message: `Bạn có chắc muốn mở khóa tài khoản của "${memberName}"?`,
      confirmText: "Mở khóa",
      confirmButtonClass: "bg-green-500 hover:bg-green-600",
      onConfirm: () => executeUnlockAccount(fullMemberInfo.id, memberName),
    });
    setIsConfirmOpen(true);
  };

  const handleViewProfile = (memberId: string) => {
    const userToView =
      allApiUsers.find((u) => u.id === memberId) ||
      rawLockedUsers.find((u) => u.id === memberId);
    if (userToView) {
      setSelectedUserProfile(userToView);
      setIsProfileModalOpen(true);
    } else {
      toast.error("Không tìm thấy thông tin chi tiết.");
    }
  };

  const actionButtonBaseClasses =
    "p-1.5 rounded hover:bg-opacity-80 transition-colors duration-150 text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const assignButtonClasses = `${actionButtonBaseClasses} bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100 hover:border-sky-400`;
  const removeButtonClasses = `${actionButtonBaseClasses} text-red-500 hover:text-red-700 hover:bg-red-100`;
  const lockButtonClasses = `${actionButtonBaseClasses} bg-red-50 text-red-600 hover:bg-red-100 border border-red-300`;
  const unlockButtonClasses = `${actionButtonBaseClasses} bg-green-50 text-green-600 hover:bg-green-100 border border-green-300`;

  return (
    <div className="flex flex-col h-full p-4 md:p-5 bg-gray-50 relative">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0 gap-2">
        <h2 className="text-xl md:text-2xl font-bold text-pink-600">
          {" "}
          Thành viên câu lạc bộ{" "}
        </h2>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setTab("all")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "all"
              ? "border-b-2 border-purple-500 text-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {" "}
          👥 Tất cả ({displayMembers.length}){" "}
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "admin"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {" "}
          👑 QTV ({
            displayMembers.filter((m) => m.roleName === "ADMIN").length
          }){" "}
        </button>
        <button
          onClick={() => setTab("core")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "core"
              ? "border-b-2 border-green-500 text-green-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {" "}
          💪 Nòng cốt (
          {displayMembers.filter((m) => m.roleName === "USER").length}){" "}
        </button>
        <button
          onClick={() => setTab("casual")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "casual"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {" "}
          🧍 Vãng lai (
          {displayMembers.filter((m) => m.roleName === "GUEST").length}){" "}
        </button>
        {isCurrentUserAdmin && (
          <button
            onClick={() => setTab("locked")}
            className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
              tab === "locked"
                ? "border-b-2 border-orange-500 text-orange-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {" "}
            <LockClosedIcon className="inline-block h-4 w-4 mr-1 align-text-bottom" />{" "}
            Bị khóa ({displayLockedUsers.length}){" "}
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0 items-center">
        <div className="relative flex-grow">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <MagnifyingGlassIcon className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder={
              tab === "locked"
                ? "Tìm theo tên, email, lý do, người khóa..."
                : "Tìm theo tên, email, vị trí, vai trò..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-9 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
            aria-label="Tìm kiếm thành viên"
          />
        </div>
        <div className="flex-shrink-0">
          <label htmlFor="sort-select" className="text-sm text-gray-600 mr-1">
            {" "}
            Sắp xếp:{" "}
          </label>
          <select
            id="sort-select"
            value={sortOrder}
            onChange={(e) =>
              setSortOrder(e.target.value as "az" | "za" | "none")
            }
            className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 h-[38px] shadow-sm bg-white appearance-none pr-7"
            aria-label="Sắp xếp thành viên"
          >
            <option value="none">Mặc định</option>{" "}
            <option value="az">A - Z</option> <option value="za">Z - A</option>
          </select>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 p-1 bg-gray-200 rounded-lg">
          <button
            onClick={() => setDisplayMode("list")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              displayMode === "list"
                ? "bg-white text-purple-600 shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            aria-pressed={displayMode === "list"}
            title="Hiển thị dạng danh sách"
          >
            <ListBulletIcon className="w-4 h-4 inline-block sm:mr-1" />
          </button>
          <button
            onClick={() => setDisplayMode("card")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              displayMode === "card"
                ? "bg-white text-purple-600 shadow"
                : "text-gray-600 hover:bg-gray-100"
            }`}
            aria-pressed={displayMode === "card"}
            title="Hiển thị dạng thẻ"
          >
            <Component1Icon className="w-4 h-4 inline-block sm:mr-1" />
          </button>
        </div>
      </div>

      <div
        className={`overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 ${
          displayMode === "list"
            ? "space-y-3"
            : displayMode === "card" && tab !== "locked"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
            : displayMode === "card" && tab === "locked"
            ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            : "space-y-3"
        }`}
      >
        {(loading && tab !== "locked") ||
        (loadingLocked && tab === "locked") ? (
          <p className="text-center text-gray-500 py-4">Đang tải...</p>
        ) : (error && tab !== "locked") || (errorLocked && tab === "locked") ? (
          <div className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200 whitespace-pre-line">
            {" "}
            ⚠️ {tab === "locked" ? errorLocked : error}{" "}
          </div>
        ) : processedMembers.length > 0 ? (
          processedMembers.map((memberItem) => {
            const isLockedTabActive = tab === "locked";
            const member = memberItem as DisplayMember &
              Partial<DisplayLockedMemberInfo>;

            if (
              displayMode === "list" ||
              (isLockedTabActive && displayMode === "list")
            ) {
              return (
                <div
                  key={member.id}
                  className={`p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-start hover:bg-gray-50 transition-colors duration-150 ${
                    member.locked && !isLockedTabActive
                      ? "opacity-70 border-l-4 border-red-300"
                      : ""
                  } ${isLockedTabActive ? "border-l-4 border-orange-300" : ""}`}
                >
                  <div
                    className="flex items-center gap-3 overflow-hidden mr-2 mb-3 sm:mb-0 flex-grow cursor-pointer"
                    onClick={() => handleViewProfile(member.id)}
                  >
                    <img
                      src={
                        member.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          member.displayName
                        )}&background=random&color=fff&size=128`
                      }
                      alt={`Avatar của ${member.displayName}`}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border flex-shrink-0 bg-gray-200"
                    />
                    <div className="overflow-hidden">
                      <h3
                        className="font-semibold text-sm md:text-base text-gray-800 truncate"
                        title={member.displayName}
                      >
                        {member.displayName}
                        {member.locked && (
                          <span
                            className={`text-xs font-semibold ml-1 ${
                              isLockedTabActive
                                ? "text-orange-600"
                                : "text-red-500"
                            }`}
                          >
                            (Bị khóa)
                          </span>
                        )}
                      </h3>
                      {member.email && (
                        <p
                          className="text-gray-600 text-xs md:text-sm truncate"
                          title={member.email}
                        >
                          {" "}
                          📧 {member.email}{" "}
                        </p>
                      )}
                      <p
                        className={`text-xs md:text-sm font-medium ${
                          member.roleName === "ADMIN"
                            ? "text-red-600"
                            : member.roleName === "USER"
                            ? "text-green-600"
                            : member.roleName === "GUEST"
                            ? "text-blue-600"
                            : "text-gray-500"
                        }`}
                      >
                        {roleDisplayMap[member.roleName] || member.roleName}
                        {!isLockedTabActive &&
                          (member.positionName || member.organizerRoleName) &&
                          " ("}
                        {!isLockedTabActive && member.positionName}
                        {!isLockedTabActive &&
                          member.positionName &&
                          member.organizerRoleName &&
                          " / "}
                        {!isLockedTabActive && member.organizerRoleName}
                        {!isLockedTabActive &&
                          (member.positionName || member.organizerRoleName) &&
                          ")"}
                      </p>
                      {isLockedTabActive && member.lockReason !== undefined && (
                        <>
                          <p
                            className="text-xs text-gray-500 mt-0.5"
                            title={member.lockReason || ""}
                          >
                            <strong>Lý do:</strong>{" "}
                            {member.lockReason || "Không có"}
                          </p>
                          <p className="text-xs text-gray-500">
                            <strong>Khóa lúc:</strong>{" "}
                            {formatDateNullable(member.lockedAt)}
                          </p>
                          <p
                            className="text-xs text-gray-500"
                            title={member.lockedByDisplayName}
                          >
                            <strong>Người khóa:</strong>{" "}
                            {member.lockedByDisplayName}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-stretch sm:items-end gap-2 flex-shrink-0 w-full sm:w-auto sm:max-w-xs md:max-w-sm">
                    {!isLockedTabActive &&
                      isCurrentUserAdmin &&
                      (member.roleName === "USER" ||
                        member.roleName === "GUEST") &&
                      user &&
                      member.id !== user.id && (
                        <>
                          {assigningPositionTo === member.id ? (
                            <div className="p-2.5 border border-sky-300 rounded-md bg-sky-50 w-full shadow-sm">
                              {" "}
                              <label
                                htmlFor={`position-select-list-${member.id}`}
                                className="block text-xs font-medium text-sky-700 mb-1.5"
                              >
                                Gán vị trí cho {member.displayName}:
                              </label>{" "}
                              <div className="flex items-center gap-2">
                                {" "}
                                <select
                                  id={`position-select-list-${member.id}`}
                                  value={selectedPositionId}
                                  onChange={(e) =>
                                    setSelectedPositionId(e.target.value)
                                  }
                                  className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm"
                                >
                                  {" "}
                                  <option value="" disabled>
                                    {positions.length > 0
                                      ? "-- Chọn Vị trí --"
                                      : loading
                                      ? "Đang tải..."
                                      : "Không có vị trí"}
                                  </option>{" "}
                                  {positions.map((pos) => (
                                    <option key={pos.id} value={pos.id}>
                                      {pos.name}
                                    </option>
                                  ))}{" "}
                                </select>{" "}
                                <button
                                  onClick={() =>
                                    handleAssignPosition(member.id)
                                  }
                                  disabled={!selectedPositionId}
                                  className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                  Lưu
                                </button>{" "}
                                <button
                                  onClick={() => {
                                    setAssigningPositionTo(null);
                                    setSelectedPositionId("");
                                  }}
                                  className="px-3 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 font-medium"
                                >
                                  Hủy
                                </button>{" "}
                              </div>{" "}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 w-full justify-end">
                              {" "}
                              <button
                                onClick={() =>
                                  handleAssignPositionClick(member.id)
                                }
                                className={`${assignButtonClasses} flex-grow sm:flex-grow-0 justify-center cursor-pointer`}
                                title={
                                  member.positionName
                                    ? `Đổi vị trí: ${member.positionName}`
                                    : "Phân vị trí"
                                }
                              >
                                <Component1Icon className="h-3.5 w-3.5" />
                                <span>
                                  {member.positionName
                                    ? "Đổi Vị trí"
                                    : "Phân Vị trí"}
                                </span>
                              </button>{" "}
                              {member.positionName && (
                                <button
                                  onClick={() =>
                                    handleRemovePosition(
                                      member.id,
                                      member.displayName
                                    )
                                  }
                                  className={`${removeButtonClasses} px-2 cursor-pointer`}
                                  title={`Xóa vị trí ${member.positionName}`}
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              )}{" "}
                            </div>
                          )}
                          {assigningOrganizerRoleTo === member.id ? (
                            <div className="p-2.5 border border-purple-300 rounded-md bg-purple-50 w-full shadow-sm mt-2">
                              {" "}
                              <label
                                htmlFor={`role-select-list-${member.id}`}
                                className="block text-xs font-medium text-purple-700 mb-1.5"
                              >
                                Gán vai trò BTC cho {member.displayName}:
                              </label>{" "}
                              <div className="flex items-center gap-2">
                                {" "}
                                <select
                                  id={`role-select-list-${member.id}`}
                                  value={selectedOrganizerRoleId}
                                  onChange={(e) =>
                                    setSelectedOrganizerRoleId(e.target.value)
                                  }
                                  className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                >
                                  {" "}
                                  <option value="" disabled>
                                    {organizerRoles.length > 0
                                      ? "-- Chọn Vai trò BTC --"
                                      : loading
                                      ? "Đang tải..."
                                      : "Không có vai trò"}
                                  </option>{" "}
                                  {organizerRoles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                      {role.name}
                                    </option>
                                  ))}{" "}
                                </select>{" "}
                                <button
                                  onClick={() =>
                                    handleAssignOrganizerRole(member.id)
                                  }
                                  disabled={!selectedOrganizerRoleId}
                                  className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                  Lưu
                                </button>{" "}
                                <button
                                  onClick={() => {
                                    setAssigningOrganizerRoleTo(null);
                                    setSelectedOrganizerRoleId("");
                                  }}
                                  className="px-3 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 font-medium"
                                >
                                  Hủy
                                </button>{" "}
                              </div>{" "}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 w-full justify-end mt-1.5">
                              {" "}
                              <button
                                onClick={() =>
                                  handleAssignOrganizerRoleClick(member.id)
                                }
                                className={`bg-purple-50 cursor-pointer text-purple-700 border border-purple-300 hover:bg-purple-100 hover:border-purple-400 ${actionButtonBaseClasses} flex-grow sm:flex-grow-0 justify-center`}
                                title={
                                  member.organizerRoleName
                                    ? `Đổi vai trò : ${member.organizerRoleName}`
                                    : "Phân vai trò "
                                }
                              >
                                <ListBulletIcon className="h-3.5 w-3.5" />
                                <span>
                                  {member.organizerRoleName
                                    ? "Đổi vai trò "
                                    : "Phân vai trò "}
                                </span>
                              </button>{" "}
                              {member.organizerRoleName && (
                                <button
                                  onClick={() =>
                                    handleRemoveOrganizerRole(
                                      member.id,
                                      member.displayName
                                    )
                                  }
                                  className={`${removeButtonClasses} px-2 cursor-pointer`}
                                  title={`Xóa vai trò ${member.organizerRoleName}`}
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              )}{" "}
                            </div>
                          )}
                          {!member.locked && (
                            <button
                              onClick={() => handleLockAccountTrigger(member)}
                              disabled={lockingMemberId === member.id}
                              className={`${lockButtonClasses} w-full sm:w-auto justify-center mt-2 cursor-pointer ${
                                lockingMemberId === member.id
                                  ? "cursor-wait"
                                  : ""
                              }`}
                              title={`Khóa tài khoản của ${member.displayName}`}
                            >
                              {lockingMemberId === member.id ? (
                                <ReloadIcon className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <LockClosedIcon className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1">
                                {lockingMemberId === member.id
                                  ? "Đang khóa..."
                                  : "Khóa tài khoản"}
                              </span>
                            </button>
                          )}
                        </>
                      )}
                    {isLockedTabActive &&
                      isCurrentUserAdmin &&
                      member.locked && (
                        <button
                          onClick={() =>
                            handleUnlockAccountTrigger(
                              member as DisplayLockedMemberInfo
                            )
                          }
                          disabled={unlockingMemberId === member.id}
                          className={`${unlockButtonClasses} w-full sm:w-auto justify-center mt-2 ${
                            unlockingMemberId === member.id ? "cursor-wait" : ""
                          }`}
                          title={`Mở khóa tài khoản của ${member.displayName}`}
                        >
                          {unlockingMemberId === member.id ? (
                            <ReloadIcon className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <LockOpen1Icon className="h-3.5 w-3.5" />
                          )}
                          <span className="ml-1">
                            {unlockingMemberId === member.id
                              ? "Đang mở..."
                              : "Mở khóa"}
                          </span>
                        </button>
                      )}
                  </div>
                </div>
              );
            }
            if (displayMode === "card" && !isLockedTabActive) {
              return (
                <div
                  key={member.id}
                  className={`p-4 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center hover:shadow-xl transition-shadow duration-200 ${
                    member.locked ? "opacity-60 border-l-4 border-red-400" : ""
                  }`}
                >
                  {" "}
                  <img
                    src={
                      member.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        member.displayName
                      )}&background=random&color=fff&size=128`
                    }
                    alt={`Avatar của ${member.displayName}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 mb-3 cursor-pointer"
                    onClick={() => handleViewProfile(member.id)}
                  />{" "}
                  <h3
                    className="font-semibold text-base md:text-lg text-gray-800 truncate w-full cursor-pointer"
                    title={member.displayName}
                    onClick={() => handleViewProfile(member.id)}
                  >
                    {" "}
                    {member.displayName}{" "}
                    {member.locked && (
                      <span className="text-xs text-red-500 font-semibold ml-1">
                        (Bị khóa)
                      </span>
                    )}{" "}
                  </h3>{" "}
                  {member.email && (
                    <p
                      className="text-gray-600 text-xs md:text-sm truncate w-full"
                      title={member.email}
                    >
                      {member.email}
                    </p>
                  )}{" "}
                  <p
                    className={`text-xs md:text-sm font-medium mt-1 ${
                      member.roleName === "ADMIN"
                        ? "text-red-600"
                        : member.roleName === "USER"
                        ? "text-green-600"
                        : member.roleName === "GUEST"
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    {" "}
                    {roleDisplayMap[member.roleName] || member.roleName}{" "}
                  </p>{" "}
                  {(member.positionName || member.organizerRoleName) && (
                    <p
                      className="text-xs text-gray-500 mt-0.5 w-full truncate"
                      title={`${member.positionName || ""}${
                        member.positionName && member.organizerRoleName
                          ? " / "
                          : ""
                      }${member.organizerRoleName || ""}`}
                    >
                      {" "}
                      {member.positionName}
                      {member.positionName && member.organizerRoleName && " / "}
                      {member.organizerRoleName}{" "}
                    </p>
                  )}{" "}
                  <div className="mt-4 w-full space-y-2">
                    {" "}
                    {isCurrentUserAdmin &&
                      (member.roleName === "USER" ||
                        member.roleName === "GUEST") &&
                      user &&
                      member.id !== user.id && (
                        <>
                          {" "}
                          {assigningPositionTo === member.id ? (
                            <div className="p-2.5 border border-sky-300 rounded-md bg-sky-50 w-full shadow-sm text-left">
                              {" "}
                              <label
                                htmlFor={`position-select-card-${member.id}`}
                                className="block text-xs font-medium text-sky-700 mb-1.5"
                              >
                                Vị trí:
                              </label>{" "}
                              <div className="flex items-center gap-2">
                                {" "}
                                <select
                                  id={`position-select-card-${member.id}`}
                                  value={selectedPositionId}
                                  onChange={(e) =>
                                    setSelectedPositionId(e.target.value)
                                  }
                                  className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm"
                                >
                                  {" "}
                                  <option value="" disabled>
                                    {positions.length > 0
                                      ? "-- Chọn --"
                                      : loading
                                      ? "..."
                                      : "Không có"}
                                  </option>{" "}
                                  {positions.map((pos) => (
                                    <option key={pos.id} value={pos.id}>
                                      {pos.name}
                                    </option>
                                  ))}{" "}
                                </select>{" "}
                                <button
                                  onClick={() =>
                                    handleAssignPosition(member.id)
                                  }
                                  disabled={!selectedPositionId}
                                  className="p-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 font-medium"
                                >
                                  <CheckCircledIcon className="w-4 h-4" />
                                </button>{" "}
                                <button
                                  onClick={() => {
                                    setAssigningPositionTo(null);
                                    setSelectedPositionId("");
                                  }}
                                  className="p-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 font-medium"
                                >
                                  <CrossCircledIcon className="w-4 h-4" />
                                </button>{" "}
                              </div>{" "}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 w-full">
                              {" "}
                              <button
                                onClick={() =>
                                  handleAssignPositionClick(member.id)
                                }
                                className={`${assignButtonClasses} w-full cursor-pointer justify-center text-xs py-2`}
                                title={
                                  member.positionName
                                    ? `Đổi vị trí: ${member.positionName}`
                                    : "Phân vị trí"
                                }
                              >
                                {" "}
                                <Component1Icon className="h-4 w-4 mr-1" />
                                {member.positionName
                                  ? "Đổi vị trí"
                                  : "Phân vị trí"}{" "}
                              </button>{" "}
                              {member.positionName && (
                                <button
                                  onClick={() =>
                                    handleRemovePosition(
                                      member.id,
                                      member.displayName
                                    )
                                  }
                                  className={`${removeButtonClasses} p-2`}
                                  title={`Xóa vị trí ${member.positionName}`}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}{" "}
                            </div>
                          )}{" "}
                          {assigningOrganizerRoleTo === member.id ? (
                            <div className="p-2.5 border border-purple-300 rounded-md bg-purple-50 w-full shadow-sm text-left mt-2">
                              {" "}
                              <label
                                htmlFor={`role-select-card-${member.id}`}
                                className="block text-xs font-medium text-purple-700 mb-1.5"
                              >
                                Vai trò BTC:
                              </label>{" "}
                              <div className="flex items-center gap-2">
                                {" "}
                                <select
                                  id={`role-select-card-${member.id}`}
                                  value={selectedOrganizerRoleId}
                                  onChange={(e) =>
                                    setSelectedOrganizerRoleId(e.target.value)
                                  }
                                  className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                >
                                  {" "}
                                  <option value="" disabled>
                                    {organizerRoles.length > 0
                                      ? "-- Chọn --"
                                      : loading
                                      ? "..."
                                      : "Không có"}
                                  </option>{" "}
                                  {organizerRoles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                      {role.name}
                                    </option>
                                  ))}{" "}
                                </select>{" "}
                                <button
                                  onClick={() =>
                                    handleAssignOrganizerRole(member.id)
                                  }
                                  disabled={!selectedOrganizerRoleId}
                                  className="p-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 font-medium"
                                >
                                  <CheckCircledIcon className="w-4 h-4" />
                                </button>{" "}
                                <button
                                  onClick={() => {
                                    setAssigningOrganizerRoleTo(null);
                                    setSelectedOrganizerRoleId("");
                                  }}
                                  className="p-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 font-medium"
                                >
                                  <CrossCircledIcon className="w-4 h-4" />
                                </button>{" "}
                              </div>{" "}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 w-full mt-1.5">
                              {" "}
                              <button
                                onClick={() =>
                                  handleAssignOrganizerRoleClick(member.id)
                                }
                                className={`bg-purple-50 cursor-pointer text-purple-700 border border-purple-300 hover:bg-purple-100 hover:border-purple-400 ${actionButtonBaseClasses} w-full justify-center text-xs py-2`}
                                title={
                                  member.organizerRoleName
                                    ? `Đổi vai trò : ${member.organizerRoleName}`
                                    : "Phân vai trò "
                                }
                              >
                                {" "}
                                <ListBulletIcon className="h-4 w-4 mr-1" />
                                {member.organizerRoleName
                                  ? "Đổi vai trò "
                                  : "Phân vai trò "}{" "}
                              </button>{" "}
                              {member.organizerRoleName && (
                                <button
                                  onClick={() =>
                                    handleRemoveOrganizerRole(
                                      member.id,
                                      member.displayName
                                    )
                                  }
                                  className={`${removeButtonClasses} p-2 cursor-pointer`}
                                  title={`Xóa vai trò ${member.organizerRoleName}`}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}{" "}
                            </div>
                          )}{" "}
                          {!member.locked && (
                            <button
                              onClick={() => handleLockAccountTrigger(member)}
                              disabled={lockingMemberId === member.id}
                              className={`${lockButtonClasses} w-full cursor-pointer justify-center mt-1.5 text-xs py-2 ${
                                lockingMemberId === member.id
                                  ? "cursor-wait"
                                  : ""
                              }`}
                              title={`Khóa tài khoản`}
                            >
                              {" "}
                              {lockingMemberId === member.id ? (
                                <ReloadIcon className="h-4 w-4 animate-spin" />
                              ) : (
                                <LockClosedIcon className="h-4 w-4" />
                              )}{" "}
                              <span className="ml-1">
                                {lockingMemberId === member.id
                                  ? "Đang khóa..."
                                  : "Khóa tài khoản"}
                              </span>{" "}
                            </button>
                          )}{" "}
                        </>
                      )}{" "}
                  </div>{" "}
                </div>
              );
            }
            if (displayMode === "card" && isLockedTabActive) {
              return (
                <div
                  key={member.id}
                  className="p-4 bg-white rounded-lg shadow-xl border border-orange-300 flex flex-col items-center text-center"
                >
                  {" "}
                  <img
                    src={
                      member.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        member.displayName
                      )}&background=random&color=fff&size=128`
                    }
                    alt={`Avatar của ${member.displayName}`}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border-2 border-orange-200 mb-3 cursor-pointer"
                    onClick={() => handleViewProfile(member.id)}
                  />{" "}
                  <h3
                    className="font-semibold text-base md:text-lg text-gray-800 truncate w-full cursor-pointer"
                    title={member.displayName}
                    onClick={() => handleViewProfile(member.id)}
                  >
                    {" "}
                    {member.displayName}{" "}
                    <span className="text-xs text-orange-600 font-semibold ml-1">
                      (Bị khóa)
                    </span>{" "}
                  </h3>{" "}
                  {member.email && (
                    <p
                      className="text-gray-600 text-xs md:text-sm truncate w-full"
                      title={member.email}
                    >
                      {member.email}
                    </p>
                  )}{" "}
                  <p
                    className={`text-xs md:text-sm font-medium mt-1 ${
                      member.roleName === "ADMIN"
                        ? "text-red-600"
                        : member.roleName === "USER"
                        ? "text-green-600"
                        : member.roleName === "GUEST"
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    {" "}
                    {roleDisplayMap[member.roleName] || member.roleName}{" "}
                  </p>{" "}
                  <div className="mt-3 pt-3 border-t border-gray-200 w-full text-left text-xs space-y-1">
                    {" "}
                    <p
                      className="text-gray-600"
                      title={member.lockReason || ""}
                    >
                      <strong>Lý do khóa:</strong>{" "}
                      <span className="text-gray-800">
                        {member.lockReason || "Không có"}
                      </span>
                    </p>{" "}
                    <p className="text-gray-600">
                      <strong>Khóa vào lúc:</strong>{" "}
                      <span className="text-gray-800">
                        {formatDateNullable(member.lockedAt)}
                      </span>
                    </p>{" "}
                    <p
                      className="text-gray-600"
                      title={member.lockedByDisplayName}
                    >
                      <strong>Người khóa:</strong>{" "}
                      <span className="text-gray-800">
                        {member.lockedByDisplayName}
                      </span>
                    </p>{" "}
                  </div>{" "}
                  {isCurrentUserAdmin && member.locked && (
                    <div className="mt-4 w-full">
                      {" "}
                      <button
                        onClick={() =>
                          handleUnlockAccountTrigger(
                            member as DisplayLockedMemberInfo
                          )
                        }
                        disabled={unlockingMemberId === member.id}
                        className={`${unlockButtonClasses} w-full justify-center text-xs py-2 ${
                          unlockingMemberId === member.id ? "cursor-wait" : ""
                        }`}
                        title={`Mở khóa tài khoản của ${member.displayName}`}
                      >
                        {" "}
                        {unlockingMemberId === member.id ? (
                          <ReloadIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <LockOpen1Icon className="h-4 w-4" />
                        )}{" "}
                        <span className="ml-1">
                          {unlockingMemberId === member.id
                            ? "Đang mở..."
                            : "Mở khóa "}
                        </span>{" "}
                      </button>{" "}
                    </div>
                  )}{" "}
                </div>
              );
            }
            return null;
          })
        ) : (
          <p className="text-center text-gray-500 italic py-4">
            {" "}
            {searchTerm
              ? "Không tìm thấy tài khoản nào khớp."
              : tab === "locked"
              ? "Không có tài khoản nào bị khóa."
              : "Không có thành viên nào."}{" "}
          </p>
        )}
      </div>

      {confirmDialogProps && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title={confirmDialogProps.title}
          message={confirmDialogProps.message}
          onConfirm={confirmDialogProps.onConfirm}
          onCancel={() => {
            setIsConfirmOpen(false);
            setConfirmDialogProps(null);
          }}
          confirmText={confirmDialogProps.confirmText}
          cancelText={confirmDialogProps.cancelText}
          requiresReason={confirmDialogProps.requiresReason}
          onConfirmWithReason={confirmDialogProps.onConfirmWithReason}
          reasonLabel={confirmDialogProps.reasonLabel}
          reasonPlaceholder={confirmDialogProps.reasonPlaceholder}
          confirmButtonClass={confirmDialogProps.confirmButtonClass}
        />
      )}
      {selectedUserProfile && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedUserProfile(null);
          }}
          userProfile={selectedUserProfile}
          currentUser={user}
          onTriggerLockAccount={
            handleLockAccountTrigger as (userToLock: ApiUser) => void
          }
          onTriggerUnlockAccount={
            handleUnlockAccountTrigger as (userToUnlock: ApiUser) => void
          }
          isLockingTargetUser={lockingMemberId === selectedUserProfile?.id}
          isUnlockingTargetUser={unlockingMemberId === selectedUserProfile?.id}
        />
      )}
    </div>
  );
};

export default MembersTabContent;
