"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { toast, Toaster } from "react-hot-toast";
import Image from "next/image";
import {
  User as MainUserType,
  FullApiUser,
  LockedByInfo,
  Role,
  Position,
} from "../types/appTypeMember";
import { ApiUser, User as ModalCurrentUserType } from "../types/appTypes"; 

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
    if (isOpen) setReason("");
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

export interface DisplayMember {
  id: string;
  displayName: string;
  roleName: string;
  email: string | null;
  avatar: string | null;
  positionName: string | null;
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
  refreshToken: () => Promise<string | null>;
  onSessionExpired: () => void;
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
  refreshToken,
  onSessionExpired,
}) => {
  const [tab, setTab] = useState<
    "all" | "admin" | "core" | "casual" | "locked"
  >("all");
  const [allApiUsers, setAllApiUsers] = useState<FullApiUser[]>([]);
  const [displayMembers, setDisplayMembers] = useState<DisplayMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "none">("none");
  const [rawLockedUsers, setRawLockedUsers] = useState<FullApiUser[]>([]);
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
    useState<FullApiUser | null>(null);
  // >>> CHỖ NÀY RẤT QUAN TRỌNG: Đảm bảo displayMode là state với kiểu đúng <<<
  const [displayMode, setDisplayMode] = useState<"list" | "card">("list");
  const [isRefreshingManual, setIsRefreshingManual] = useState<boolean>(false);

  const isCurrentUserAdmin = useMemo(
    () => user?.roles?.some((role) => role.name?.toUpperCase() === "ADMIN"),
    [user]
  );

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

  const transformApiUserToDisplayMember = (
    apiUser: FullApiUser
  ): DisplayMember => {
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
      email: apiUser.email || null,
      avatar: apiUser.avatar || null,
      positionName: apiUser.position?.name || null,
      locked: apiUser.locked,
    };
  };
  const transformApiUserToDisplayLockedMemberInfo = (
    apiUser: FullApiUser
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

  const fetchMembers = useCallback(
    async (isManualRefresh = false) => {
      if (!isManualRefresh) setLoading(true);
      setError(null);
      let token = localStorage.getItem("authToken");

      if (!token && !isManualRefresh) {
        setError("Yêu cầu xác thực.");
        setLoading(false);
        onSessionExpired();
        return;
      }

      try {
        let response = await fetch("http://localhost:8080/identity/users", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        });

        if ((response.status === 401 || response.status === 403) && token) {
          const newToken = await refreshToken();
          if (newToken) {
            token = newToken;
            response = await fetch("http://localhost:8080/identity/users", {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
          } else {
            onSessionExpired();
            return;
          }
        }

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            onSessionExpired();
            return;
          }
          const errData = await response
            .json()
            .catch(() => ({ message: `Lỗi ${response.status}` }));
          throw new Error(errData.message || `Lỗi ${response.status}`);
        }

        const data = await response.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          setAllApiUsers(data.result);
          setDisplayMembers(data.result.map(transformApiUserToDisplayMember));
          setError(null);
        } else {
          throw new Error(data.message || "Dữ liệu thành viên không hợp lệ.");
        }
      } catch (err: any) {
        if (
          err.message !== "Phiên đăng nhập hết hạn." &&
          !err.message?.includes("Failed to fetch") &&
          !err.message?.includes("Token không tồn tại")
        ) {
          setError(err.message || "Lỗi tải thành viên.");
          toast.error(`Lỗi tải thành viên: ${err.message}`);
        }
        setDisplayMembers([]);
        setAllApiUsers([]);
      } finally {
        if (!isManualRefresh) setLoading(false);
      }
    },
    [refreshToken, onSessionExpired]
  );

  const fetchLockedUsers = useCallback(
    async (isManualRefresh = false) => {
      if (!isManualRefresh) setLoadingLocked(true);
      setErrorLocked(null);
      let token = localStorage.getItem("authToken");
      if (!token) {
        if (!isManualRefresh) setErrorLocked("Yêu cầu xác thực.");
        setLoadingLocked(false);
        onSessionExpired();
        return;
      }

      try {
        let response = await fetch(
          "http://localhost:8080/identity/users/locked",
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );
        if (response.status === 401 || response.status === 403) {
          const newToken = await refreshToken();
          if (newToken) {
            token = newToken;
            response = await fetch(
              "http://localhost:8080/identity/users/locked",
              {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
              }
            );
          } else {
            onSessionExpired();
            return;
          }
        }
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            onSessionExpired();
            return;
          }
          const errData = await response
            .json()
            .catch(() => ({ message: `Lỗi ${response.status}` }));
          throw new Error(errData.message || `Lỗi ${response.status}`);
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
          setErrorLocked(null);
        } else {
          throw new Error(
            data.message || "Dữ liệu tài khoản bị khóa không hợp lệ."
          );
        }
      } catch (err: any) {
        if (
          err.message !== "Phiên đăng nhập hết hạn." &&
          !err.message?.includes("Failed to fetch")
        ) {
          setErrorLocked(err.message || "Lỗi tải tài khoản bị khóa.");
          toast.error(`Lỗi tải DS bị khóa: ${err.message}`);
        }
        setDisplayLockedUsers([]);
        setRawLockedUsers([]);
      } finally {
        if (!isManualRefresh) setLoadingLocked(false);
      }
    },
    [refreshToken, onSessionExpired]
  );

  const fetchPositions = useCallback(async () => {
    let token = localStorage.getItem("authToken");
    if (!token) {
      onSessionExpired();
      return;
    }
    try {
      let response = await fetch(
        "http://localhost:8080/identity/api/positions",
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (response.status === 401 || response.status === 403) {
        const newToken = await refreshToken();
        if (newToken) {
          token = newToken;
          response = await fetch(
            "http://localhost:8080/identity/api/positions",
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
          );
        } else {
          onSessionExpired();
          return;
        }
      }
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          onSessionExpired();
          return;
        }
        const errData = await response
          .json()
          .catch(() => ({ message: `Lỗi ${response.status}` }));
        throw new Error(errData.message || `Lỗi ${response.status}`);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result))
        setPositions(data.result);
      else throw new Error(data.message || "Dữ liệu vị trí không hợp lệ.");
    } catch (err: any) {
      if (
        err.message !== "Phiên đăng nhập hết hạn." &&
        !err.message?.includes("Failed to fetch")
      ) {
        const msg = err instanceof Error ? err.message : "Lỗi tải vị trí.";
        setError((prev) => (prev ? `${prev}\n${msg}` : msg));
        toast.error(`Lỗi tải vị trí: ${msg}`);
      }
    }
  }, [refreshToken, onSessionExpired]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setDisplayMembers([]);
    setPositions([]);
    Promise.all([fetchMembers(), fetchPositions()]).finally(() =>
      setLoading(false)
    );
  }, [fetchMembers, fetchPositions]);

  useEffect(() => {
    if (tab === "locked" && !loadingLocked && !isRefreshingManual) {
      fetchLockedUsers();
    }
  }, [tab, fetchLockedUsers, loadingLocked, isRefreshingManual]);

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
            member.positionName.toLowerCase().includes(lowerSearchTerm))
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
      let token = localStorage.getItem("authToken");
      if (!token) {
        reject(new Error("Token không tồn tại."));
        onSessionExpired();
        return;
      }
      try {
        let response = await fetch(
          `http://localhost:8080/identity/users/${memberId}/position?positionId=${selectedPositionId}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.status === 401 || response.status === 403) {
          const newToken = await refreshToken();
          if (newToken) {
            token = newToken;
            response = await fetch(
              `http://localhost:8080/identity/users/${memberId}/position?positionId=${selectedPositionId}`,
              { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
            );
          } else {
            reject(new Error("Không thể làm mới token"));
            onSessionExpired();
            return;
          }
        }
        const responseData = await response.json();
        if (!response.ok || responseData.code !== 1000)
          throw new Error(responseData.message || `Lỗi ${response.status}.`);
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
        fetchMembers(true);
        return `Gán vị trí thành công!`;
      },
      error: (err) => `Gán thất bại: ${err.message}`,
    });
  };

  const handleRemovePosition = (memberId: string, memberName: string) => {
    const currentPositionName = displayMembers.find(
      (m) => m.id === memberId
    )?.positionName;
    if (!currentPositionName) return;
    setConfirmDialogProps({
      title: "Xác nhận xóa vị trí",
      message: `Xóa vị trí "${currentPositionName}" của "${memberName}"?`,
      onConfirm: () => {
        const removePromise = new Promise<void>(async (resolve, reject) => {
          let token = localStorage.getItem("authToken");
          if (!token) {
            reject(new Error("Token không tồn tại."));
            onSessionExpired();
            return;
          }
          try {
            let response = await fetch(
              `http://localhost:8080/identity/users/${memberId}/position`,
              { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.status === 401 || response.status === 403) {
              const newToken = await refreshToken();
              if (newToken) {
                token = newToken;
                response = await fetch(
                  `http://localhost:8080/identity/users/${memberId}/position`,
                  {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
              } else {
                reject(new Error("Không thể làm mới token"));
                onSessionExpired();
                return;
              }
            }
            const responseData = await response.json();
            if (!response.ok || responseData.code !== 1000)
              throw new Error(
                responseData.message || `Lỗi ${response.status}.`
              );
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
            fetchMembers(true);
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
      let token = localStorage.getItem("authToken");
      if (!token) {
        toast.dismiss(toastId);
        toast.error("Vui lòng đăng nhập lại.");
        onSessionExpired();
        setLockingMemberId(null);
        setIsConfirmOpen(false);
        setConfirmDialogProps(null);
        return;
      }

      const url = `http://localhost:8080/identity/users/${userIdToLock}/lock?lockedById=${adminUserId}&reason=${encodeURIComponent(
        reason
      )}`;
      let response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        const newToken = await refreshToken();
        if (newToken) {
          token = newToken;
          response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
        }
      }

      if (!response.ok) {
        const responseData = await response
          .json()
          .catch(() => ({
            message: `Lỗi không xác định (${response.status})`,
          }));
        throw new Error(
          responseData.message || `Lỗi khóa tài khoản (${response.status})`
        );
      }

      const responseData = await response.json();
      toast.success(
        responseData.message || `Đã khóa tài khoản ${memberName}!`,
        { id: toastId }
      );
      await Promise.all([fetchMembers(true), fetchLockedUsers(true)]);
      if (selectedUserProfile && selectedUserProfile.id === userIdToLock) {
        const updatedUser =
          rawLockedUsers.find((u) => u.id === userIdToLock) ||
          allApiUsers.find((u) => u.id === userIdToLock);
        if (updatedUser) setSelectedUserProfile(updatedUser);
      }
    } catch (err: any) {
      toast.error(`Khóa thất bại: ${err.message}`, { id: toastId });
      console.error("Lỗi khóa tài khoản:", err);
      if (
        err.message === "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại." ||
        err.message.includes("Token không tồn tại")
      ) {
        onSessionExpired();
      }
    } finally {
      setLockingMemberId(null);
      setIsConfirmOpen(false);
      setConfirmDialogProps(null);
    }
  };

  const handleLockAccountTrigger = (
    memberData: FullApiUser | DisplayMember | DisplayLockedMemberInfo
  ) => {
    const memberId = memberData.id;
    const fullMemberInfo =
      allApiUsers.find((u) => u.id === memberId) ||
      rawLockedUsers.find((u) => u.id === memberId) ||
      (memberData as FullApiUser);

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
      let token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.", { id: toastId });
        onSessionExpired();
        throw new Error("Token không tồn tại.");
      }
      const url = `http://localhost:8080/identity/users/${userIdToUnlock}/unlock`;
      let response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 401 || response.status === 403) {
        const newToken = await refreshToken();
        if (newToken) {
          token = newToken;
          response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          onSessionExpired();
          throw new Error("Không thể làm mới token");
        }
      }
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
      await Promise.all([fetchMembers(true), fetchLockedUsers(true)]);
      if (selectedUserProfile && selectedUserProfile.id === userIdToUnlock) {
        const updatedUser = allApiUsers.find((u) => u.id === userIdToUnlock);
        if (updatedUser) setSelectedUserProfile(updatedUser);
      }
    } catch (err: any) {
      toast.error(`Mở khóa thất bại: ${err.message}`, { id: toastId });
      console.error("Lỗi mở khóa tài khoản:", err);
      if (
        err.message.includes("hết hạn") ||
        err.message.includes("Token không tồn tại")
      ) {
        onSessionExpired();
      }
    } finally {
      setUnlockingMemberId(null);
      setIsConfirmOpen(false);
      setConfirmDialogProps(null);
    }
  };

  const handleUnlockAccountTrigger = (
    memberData: FullApiUser | DisplayLockedMemberInfo
  ) => {
    const memberId = memberData.id;
    const fullMemberInfo =
      rawLockedUsers.find((u) => u.id === memberId) ||
      allApiUsers.find((u) => u.id === memberId) ||
      (memberData as FullApiUser);
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

  const onLockFromModalCallback = (userFromModal: ApiUser) => {
    const fullUser =
      allApiUsers.find((u) => u.id === userFromModal.id) ||
      rawLockedUsers.find((u) => u.id === userFromModal.id);
    if (fullUser) {
      handleLockAccountTrigger(fullUser);
    } else {
      toast.error("Không thể khóa tài khoản: Thiếu thông tin người dùng.");
      console.error(
        "onLockFromModalCallback: Full user not found for ID",
        userFromModal.id
      );
    }
  };

  const onUnlockFromModalCallback = (userFromModal: ApiUser) => {
    const fullUser =
      allApiUsers.find((u) => u.id === userFromModal.id) ||
      rawLockedUsers.find((u) => u.id === userFromModal.id);
    if (fullUser) {
      handleUnlockAccountTrigger(fullUser);
    } else {
      toast.error("Không thể mở khóa tài khoản: Thiếu thông tin người dùng.");
      console.error(
        "onUnlockFromModalCallback: Full user not found for ID",
        userFromModal.id
      );
    }
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

  const handleRefresh = useCallback(async () => {
    setIsRefreshingManual(true);
    setError(null);
    setErrorLocked(null);
    try {
      if (tab === "locked") {
        await fetchLockedUsers(true);
      } else {
        await fetchMembers(true);
      }
      toast.success("Đã làm mới danh sách!");
    } catch (err) {
      toast.error("Làm mới thất bại.");
    } finally {
      setIsRefreshingManual(false);
    }
  }, [tab, fetchMembers, fetchLockedUsers]);

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
          Thành viên câu lạc bộ
        </h2>
        <button
          onClick={handleRefresh}
          disabled={loading || loadingLocked || isRefreshingManual}
          className="p-2 border border-gray-300 cursor-pointer rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center ml-auto sm:ml-4"
          title="Làm mới danh sách"
        >
          {isRefreshingManual ? (
            <ReloadIcon className="w-5 h-5 animate-spin text-pink-600" />
          ) : (
            <ReloadIcon className="w-5 h-5 text-pink-600" />
          )}
        </button>
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
          👥 Tất cả ({displayMembers.length})
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "admin"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          👑 QTV ({displayMembers.filter((m) => m.roleName === "ADMIN").length})
        </button>
        <button
          onClick={() => setTab("core")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "core"
              ? "border-b-2 border-green-500 text-green-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          💪 Nòng cốt (
          {displayMembers.filter((m) => m.roleName === "USER").length})
        </button>
        <button
          onClick={() => setTab("casual")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "casual"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🧍 Vãng lai (
          {displayMembers.filter((m) => m.roleName === "GUEST").length})
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
            <LockClosedIcon className="inline-block h-4 w-4 mr-1 align-text-bottom" />{" "}
            Bị khóa ({displayLockedUsers.length})
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
                : "Tìm theo tên, email, vị trí..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-9 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
            aria-label="Tìm kiếm thành viên"
          />
        </div>
        <div className="flex-shrink-0">
          <label htmlFor="sort-select" className="text-sm text-gray-600 mr-1">
            Sắp xếp:
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
            <option value="none">Mặc định</option>
            <option value="az">A - Z</option> <option value="za">Z - A</option>
          </select>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 p-1 bg-gray-200 rounded-lg">
          <button
            onClick={() => setDisplayMode("list")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
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
            className={`px-3 py-1 rounded-md text-sm cursor-pointer font-medium transition-colors ${
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
        {isRefreshingManual ? (
          <div className="flex justify-center items-center py-10 col-span-full">
            <ReloadIcon className="w-8 h-8 animate-spin text-pink-600" />
            <p className="ml-3 text-gray-500 italic">
              Đang tải danh sách thành viên...
            </p>
          </div>
        ) : (loading && tab !== "locked") ||
          (loadingLocked && tab === "locked") ? (
          <p className="text-center text-gray-500 py-4 col-span-full">
            Đang tải...
          </p>
        ) : (error && tab !== "locked") || (errorLocked && tab === "locked") ? (
          <div className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200 whitespace-pre-line col-span-full">
            ⚠️ {tab === "locked" ? errorLocked : error}
          </div>
        ) : processedMembers.length > 0 ? (
          processedMembers.map((memberItem) => {
            const isLockedTabActive = tab === "locked";
            const member = memberItem as DisplayMember &
              Partial<DisplayLockedMemberInfo>;
            if (
              displayMode === "list" 
            ) {
              return (
                <div
                  key={member.id}
                  className={`p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-start hover:shadow-md transition-shadow duration-150 ${
                    member.locked && !isLockedTabActive
                      ? "opacity-70 border-l-4 border-red-300"
                      : ""
                  } ${isLockedTabActive ? "border-l-4 border-orange-300" : ""}`}
                >
                  <div
                    className="flex items-center gap-3 overflow-hidden mr-2 mb-3 sm:mb-0 flex-grow cursor-pointer"
                    onClick={() => handleViewProfile(member.id)}
                  >
                    <Image
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
                          📧 {member.email}
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
                        {!isLockedTabActive && member.positionName && " ("}
                        {!isLockedTabActive && member.positionName}
                        {!isLockedTabActive && member.positionName && ")"}
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
                    {!isLockedTabActive && isCurrentUserAdmin && (
                      <>
                        {assigningPositionTo === member.id ? (
                          <div className="flex items-center gap-1 w-full">
                            <select
                              value={selectedPositionId}
                              onChange={(e) =>
                                setSelectedPositionId(e.target.value)
                              }
                              className="flex-grow p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-sm bg-white"
                            >
                              <option value="">Chọn vị trí...</option>
                              {positions.map((pos) => (
                                <option key={pos.id} value={pos.id}>
                                  {pos.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignPosition(member.id);
                              }}
                              disabled={!selectedPositionId}
                              className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                            >
                              <CheckCircledIcon />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningPositionTo(null);
                              }}
                              className="p-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-xs"
                            >
                              <CrossCircledIcon />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 w-full">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignPositionClick(member.id);
                              }}
                              className={`${assignButtonClasses} flex-grow justify-center`}
                              disabled={member.locked}
                            >
                              {member.positionName
                                ? `Đổi: ${member.positionName}`
                                : "Gán vị trí"}
                            </button>
                            {member.positionName && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePosition(
                                    member.id,
                                    member.displayName
                                  );
                                }}
                                className={removeButtonClasses}
                                title={`Xóa vị trí: ${member.positionName}`}
                                disabled={member.locked}
                              >
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {isCurrentUserAdmin && user && user.id !== member.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          member.locked
                            ? handleUnlockAccountTrigger(member)
                            : handleLockAccountTrigger(member);
                        }}
                        className={`${
                          member.locked
                            ? unlockButtonClasses
                            : lockButtonClasses
                        } w-full justify-center`}
                        disabled={
                          lockingMemberId === member.id ||
                          unlockingMemberId === member.id
                        }
                      >
                        {member.locked ? (
                          <>
                            <LockOpen1Icon className="mr-1" /> Mở khóa
                          </>
                        ) : (
                          <>
                            <LockClosedIcon className="mr-1" /> Khóa TK
                          </>
                        )}
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
                  className={`p-4 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center hover:shadow-xl transition-all duration-200 ease-in-out hover:scale-105 cursor-pointer min-h-[290px] ${
                    member.locked ? "opacity-60 border-l-4 border-red-400" : ""
                  }`}
                  onClick={() => handleViewProfile(member.id)}
                >
                  <Image
                    src={
                      member.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        member.displayName
                      )}&background=random&color=fff&size=128`
                    }
                    alt={member.displayName}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 mb-3 bg-gray-200"
                  />
                  <h3
                    className="font-semibold text-gray-800 text-base truncate w-full"
                    title={member.displayName}
                  >
                    {member.displayName}
                    {member.locked && (
                      <span className="text-red-500 text-xs ml-1">(Khóa)</span>
                    )}
                  </h3>
                  {member.email && (
                    <p
                      className="text-gray-500 text-xs truncate w-full"
                      title={member.email}
                    >
                      {member.email}
                    </p>
                  )}
                  <p
                    className={`text-xs font-medium mt-0.5 ${
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
                  </p>
                  {member.positionName && (
                    <div className="mt-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full w-full truncate">
                      {member.positionName}
                    </div>
                  )}
                  <div className="mt-auto pt-3 w-full max-w-[180px] mx-auto">
                    {isCurrentUserAdmin &&
                      user &&
                      user.id !== member.id &&
                      !member.locked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLockAccountTrigger(member);
                          }}
                          className={`${lockButtonClasses} w-full justify-center`}
                          disabled={lockingMemberId === member.id}
                        >
                          <LockClosedIcon className="mr-1" /> Khóa TK
                        </button>
                      )}
                  </div>
                </div>
              );
            }
            if (displayMode === "card" && isLockedTabActive) {
              return (
                <div
                  key={member.id}
                  className="p-4 bg-white rounded-lg shadow-xl border border-orange-300 flex flex-col items-center text-center hover:shadow-2xl transition-all duration-200 ease-in-out hover:scale-105 cursor-pointer min-h-[290px]"
                  onClick={() => handleViewProfile(member.id)}
                >
                  <Image
                    src={
                      member.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        member.displayName
                      )}&background=random&color=fff&size=128`
                    }
                    alt={member.displayName}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border-2 border-orange-200 mb-3 bg-gray-200"
                  />
                  <h3
                    className="font-semibold text-gray-800 text-base truncate w-full"
                    title={member.displayName}
                  >
                    {member.displayName}{" "}
                    <span className="text-orange-600 text-xs">(Bị khóa)</span>
                  </h3>
                  {member.email && (
                    <p
                      className="text-gray-500 text-xs truncate w-full"
                      title={member.email}
                    >
                      {member.email}
                    </p>
                  )}
                  <div className="text-left text-xs text-gray-600 mt-2 space-y-0.5 bg-orange-50 p-2 rounded-md w-full flex-grow">
                    <p title={member.lockReason || ""}>
                      <strong>Lý do:</strong> {member.lockReason || "Không có"}
                    </p>
                    <p>
                      <strong>Khóa lúc:</strong>{" "}
                      {formatDateNullable(member.lockedAt)}
                    </p>
                    <p title={member.lockedByDisplayName}>
                      <strong>Người khóa:</strong> {member.lockedByDisplayName}
                    </p>
                  </div>
                  <div className="mt-auto pt-3 w-full max-w-[180px] mx-auto">
                    {isCurrentUserAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlockAccountTrigger(member);
                        }}
                        className={`${unlockButtonClasses} w-full justify-center`}
                        disabled={unlockingMemberId === member.id}
                      >
                        <LockOpen1Icon className="mr-1" /> Mở khóa
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })
        ) : (
          <p className="text-center text-gray-500 italic py-4 col-span-full">
            {searchTerm
              ? "Không tìm thấy tài khoản nào khớp."
              : tab === "locked"
              ? "Không có tài khoản nào bị khóa."
              : "Không có thành viên nào."}
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
          userProfile={selectedUserProfile as ApiUser | null}
          currentUser={
            user
              ? {
                  ...user,
                  avatar: user.avatar === null ? undefined : user.avatar,
                }
              : null
          }
          onTriggerLockAccount={onLockFromModalCallback}
          onTriggerUnlockAccount={onUnlockFromModalCallback}
          isLockingTargetUser={lockingMemberId === selectedUserProfile?.id}
          isUnlockingTargetUser={unlockingMemberId === selectedUserProfile?.id}
        />
      )}
    </div>
  );
};

export default MembersTabContent;