"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";

// Định nghĩa tạm thời MainUserType nếu không có import
type MainUserType = {
  id: string;
  email?: string | null /* các trường khác */;
} | null;

// --- Component ConfirmDialog ---
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-600 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 cursor-pointer bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 cursor-pointer bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- Kết thúc Component ConfirmDialog ---

// --- Component MembersTabContent ---

// Interfaces
interface ApiPosition {
  id: string;
  name: string;
}

interface ApiOrganizerRole {
  // Interface mới cho vai trò tổ chức
  id: string;
  name: string;
}

interface ApiUser {
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
  organizerRole?: ApiOrganizerRole | null; // Thêm vai trò tổ chức
}

interface DisplayMember {
  id: string;
  displayName: string;
  roleName: string; // ADMIN, USER, GUEST
  email: string | null;
  avatar: string | null;
  positionName: string | null;
  organizerRoleName: string | null; // Thêm tên vai trò tổ chức
}

interface MembersTabContentProps {
  user: MainUserType | null;
  userRole: "ADMIN" | "USER" | "GUEST" | string;
  currentUserEmail: string | null;
}

// Constants
const roleDisplayMap: Record<string, string> = {
  ADMIN: "Quản trị viên",
  GUEST: "Thành viên vãng lai",
  USER: "Thành viên nòng cốt",
  UNKNOWN: "Chưa xác định",
};

// Component Definition
const MembersTabContent: React.FC<MembersTabContentProps> = ({
  user,
  userRole,
  currentUserEmail,
}) => {
  // State Variables
  const [tab, setTab] = useState<"all" | "admin" | "core" | "casual">("all");
  const [members, setMembers] = useState<DisplayMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za" | "none">("none");
  // States for Position
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [assigningPositionTo, setAssigningPositionTo] = useState<string | null>(
    null
  );
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  // States for Organizer Role (Mới)
  const [organizerRoles, setOrganizerRoles] = useState<ApiOrganizerRole[]>([]);
  const [assigningOrganizerRoleTo, setAssigningOrganizerRoleTo] = useState<
    string | null
  >(null);
  const [selectedOrganizerRoleId, setSelectedOrganizerRoleId] =
    useState<string>("");
  // States for Confirm Dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmDialogProps, setConfirmDialogProps] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Data Fetching Callbacks
  const fetchMembers = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError((prev) =>
        prev
          ? `${prev}\nKhông tìm thấy token xác thực.`
          : "Không tìm thấy token xác thực."
      );
      toast.error("Yêu cầu xác thực. Vui lòng đăng nhập lại.");
      return;
    }
    try {
      const response = await fetch("http://localhost:8080/identity/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let errorMessage = `Lỗi ${response.status}: Không thể tải danh sách thành viên.`;
        if (response.status === 401 || response.status === 403) {
          errorMessage =
            "Phiên đăng nhập hết hạn hoặc không có quyền truy cập.";
          localStorage.removeItem("authToken");
        } else {
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            /* Ignore */
          }
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const transformedMembers = data.result.map(
          (apiUser: ApiUser): DisplayMember => {
            const roleName =
              apiUser.roles?.[0]?.name?.toUpperCase() || "UNKNOWN";
            let displayName = [apiUser.lastName, apiUser.firstName]
              .filter(Boolean)
              .join(" ")
              .trim();
            if (!displayName)
              displayName =
                apiUser.username || `User (${apiUser.id.substring(0, 6)})`;
            return {
              id: apiUser.id,
              displayName: displayName,
              roleName: roleName,
              email: apiUser.email,
              avatar: apiUser.avatar,
              positionName: apiUser.position?.name || null,
              organizerRoleName: apiUser.organizerRole?.name || null, // Lấy tên vai trò tổ chức
            };
          }
        );
        setMembers(transformedMembers);
      } else {
        throw new Error(
          data.message || "Dữ liệu thành viên trả về không đúng định dạng."
        );
      }
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách thành viên:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi không mong muốn khi tải thành viên.";
      setError((prev) => (prev ? `${prev}\n${msg}` : msg));
      toast.error(`Lỗi tải thành viên: ${msg}`);
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
        let errorMessage = `Lỗi ${response.status}: Không thể tải danh sách vị trí.`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result))
        setPositions(data.result);
      else
        throw new Error(data.message || "Dữ liệu vị trí trả về không hợp lệ.");
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách vị trí:", err);
      const msg = err instanceof Error ? err.message : "Lỗi tải vị trí.";
      setError((prevError) => (prevError ? `${prevError}\n${msg}` : msg));
      toast.error(`Lỗi tải vị trí: ${msg}`);
    }
  }, []);

  const fetchOrganizerRoles = useCallback(async () => {
    // Hàm mới fetch vai trò tổ chức
    const token = localStorage.getItem("authToken");
    if (!token) return;
    try {
      const response = await fetch(
        "http://localhost:8080/identity/api/organizerrole",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        let errorMessage = `Lỗi ${response.status}: Không thể tải danh sách vai trò tổ chức.`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result))
        setOrganizerRoles(data.result);
      else
        throw new Error(
          data.message || "Dữ liệu vai trò tổ chức trả về không hợp lệ."
        );
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách vai trò tổ chức:", err);
      const msg =
        err instanceof Error ? err.message : "Lỗi tải vai trò tổ chức.";
      setError((prevError) => (prevError ? `${prevError}\n${msg}` : msg));
      toast.error(`Lỗi tải vai trò tổ chức: ${msg}`);
    }
  }, []);

  // Effect for Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setMembers([]);
      setPositions([]);
      setOrganizerRoles([]); // Reset vai trò tổ chức
      // Chạy song song cả 3 fetch
      await Promise.all([
        fetchMembers(),
        fetchPositions(),
        fetchOrganizerRoles(),
      ]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần

  // Memoized Processed Members List
  const processedMembers = useMemo(() => {
    let membersToProcess = members.filter((member) => {
      if (tab === "all") return true;
      if (tab === "admin") return member.roleName === "ADMIN";
      if (tab === "core") return member.roleName === "USER";
      if (tab === "casual") return member.roleName === "GUEST";
      return false;
    });

    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.trim().toLowerCase();
      membersToProcess = membersToProcess.filter(
        (member) =>
          member.displayName.toLowerCase().includes(lowerSearchTerm) ||
          (member.email &&
            member.email.toLowerCase().includes(lowerSearchTerm)) || // Thêm tìm kiếm theo vai trò/vị trí nếu muốn
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
  }, [members, tab, searchTerm, sortOrder]);

  // --- Position Handlers ---
  const handleAssignPositionClick = (memberId: string) => {
    setAssigningPositionTo(memberId);
    setSelectedPositionId("");
    setAssigningOrganizerRoleTo(null); // Đóng cái kia nếu đang mở
    setSelectedOrganizerRoleId("");
  };

  const handleAssignPosition = (memberId: string) => {
    if (!selectedPositionId) {
      toast.error("Vui lòng chọn một vị trí để gán.");
      return;
    }
    const member = members.find((m) => m.id === memberId);
    const position = positions.find((p) => p.id === selectedPositionId);
    if (!member || !position) {
      toast.error("Thông tin thành viên hoặc vị trí không hợp lệ.");
      return;
    }

    const assignPromise = new Promise<void>(async (resolve, reject) => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        reject(new Error("Không tìm thấy token xác thực."));
        return;
      }
      try {
        const response = await fetch(
          `http://localhost:8080/identity/users/${memberId}/position?positionId=${selectedPositionId}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
        );
        const responseData = await response.json();
        if (!response.ok)
          throw new Error(
            responseData.message ||
              `Lỗi ${response.status}: Không thể gán vị trí.`
          );
        if (responseData.code !== 1000)
          throw new Error(
            responseData.message || "API trả về lỗi không mong muốn."
          );
        resolve();
      } catch (error) {
        console.error("Lỗi khi gán vị trí:", error);
        reject(error);
      }
    });

    toast.promise(assignPromise, {
      loading: `Đang gán vị trí "${position.name}" cho ${member.displayName}...`,
      success: () => {
        setAssigningPositionTo(null);
        setSelectedPositionId("");
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, positionName: position.name } : m
          )
        );
        return `Gán vị trí "${position.name}" thành công!`;
      },
      error: (err) =>
        `Gán vị trí thất bại: ${err.message || "Lỗi không xác định"}`,
    });
  };

  const handleRemovePosition = (memberId: string, memberName: string) => {
    setConfirmDialogProps({
      title: "Xác nhận xóa vị trí",
      message: `Bạn có chắc chắn muốn xóa vị trí "${
        members.find((m) => m.id === memberId)?.positionName
      }" đã gán cho thành viên "${memberName}"?\nHành động này không thể hoàn tác.`,
      onConfirm: () => {
        const removePromise = new Promise<void>(async (resolve, reject) => {
          const token = localStorage.getItem("authToken");
          if (!token) {
            reject(new Error("Không tìm thấy token xác thực."));
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
                responseData.message ||
                  `Lỗi ${response.status}: Không thể xóa vị trí.`
              );
            if (responseData.code !== 1000)
              throw new Error(
                responseData.message ||
                  "API trả về lỗi không mong muốn khi xóa vị trí."
              );
            resolve();
          } catch (error) {
            console.error("Lỗi khi xóa vị trí:", error);
            reject(error);
          }
        });
        toast.promise(removePromise, {
          loading: `Đang xóa vị trí của ${memberName}...`,
          success: () => {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === memberId ? { ...m, positionName: null } : m
              )
            );
            setAssigningPositionTo(null);
            setSelectedPositionId("");
            return `Xóa vị trí của ${memberName} thành công!`;
          },
          error: (err) =>
            `Xóa vị trí thất bại: ${err.message || "Lỗi không xác định"}`,
        });
      },
    });
    setIsConfirmOpen(true);
  };

  // --- Organizer Role Handlers (Mới) ---
  const handleAssignOrganizerRoleClick = (memberId: string) => {
    setAssigningOrganizerRoleTo(memberId);
    setSelectedOrganizerRoleId("");
    setAssigningPositionTo(null); // Đóng cái kia nếu đang mở
    setSelectedPositionId("");
  };

  const handleAssignOrganizerRole = (memberId: string) => {
    if (!selectedOrganizerRoleId) {
      toast.error("Vui lòng chọn một vai trò tổ chức để gán.");
      return;
    }
    const member = members.find((m) => m.id === memberId);
    const role = organizerRoles.find((r) => r.id === selectedOrganizerRoleId);
    if (!member || !role) {
      toast.error("Thông tin thành viên hoặc vai trò tổ chức không hợp lệ.");
      return;
    }

    const assignPromise = new Promise<void>(async (resolve, reject) => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        reject(new Error("Không tìm thấy token xác thực."));
        return;
      }
      try {
        const response = await fetch(
          `http://localhost:8080/identity/users/${memberId}/organizer-role?organizerRoleId=${selectedOrganizerRoleId}`,
          { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
        );
        const responseData = await response.json();
        if (!response.ok)
          throw new Error(
            responseData.message ||
              `Lỗi ${response.status}: Không thể gán vai trò tổ chức.`
          );
        if (responseData.code !== 1000)
          throw new Error(
            responseData.message || "API trả về lỗi không mong muốn."
          );
        resolve();
      } catch (error) {
        console.error("Lỗi khi gán vai trò tổ chức:", error);
        reject(error);
      }
    });

    toast.promise(assignPromise, {
      loading: `Đang gán vai trò "${role.name}" cho ${member.displayName}...`,
      success: () => {
        setAssigningOrganizerRoleTo(null);
        setSelectedOrganizerRoleId("");
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, organizerRoleName: role.name } : m
          )
        );
        return `Gán vai trò "${role.name}" thành công!`;
      },
      error: (err) =>
        `Gán vai trò thất bại: ${err.message || "Lỗi không xác định"}`,
    });
  };

  const handleRemoveOrganizerRole = (memberId: string, memberName: string) => {
    const currentRoleName = members.find(
      (m) => m.id === memberId
    )?.organizerRoleName;
    if (!currentRoleName) return; // Should not happen if button is shown correctly

    setConfirmDialogProps({
      title: "Xác nhận xóa vai trò",
      message: `Bạn có chắc chắn muốn xóa vai trò "${currentRoleName}" đã gán cho thành viên "${memberName}"?\nHành động này không thể hoàn tác.`,
      onConfirm: () => {
        const removePromise = new Promise<void>(async (resolve, reject) => {
          const token = localStorage.getItem("authToken");
          if (!token) {
            reject(new Error("Không tìm thấy token xác thực."));
            return;
          }
          try {
            // API endpoint để xóa vai trò (PUT không có query param)
            const response = await fetch(
              `http://localhost:8080/identity/users/${memberId}/organizer-role`,
              { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
            );
            const responseData = await response.json();
            if (!response.ok)
              throw new Error(
                responseData.message ||
                  `Lỗi ${response.status}: Không thể xóa vai trò tổ chức.`
              );
            if (responseData.code !== 1000)
              throw new Error(
                responseData.message ||
                  "API trả về lỗi không mong muốn khi xóa vai trò."
              );
            resolve();
          } catch (error) {
            console.error("Lỗi khi xóa vai trò tổ chức:", error);
            reject(error);
          }
        });

        toast.promise(removePromise, {
          loading: `Đang xóa vai trò của ${memberName}...`,
          success: () => {
            setMembers((prev) =>
              prev.map((m) =>
                m.id === memberId ? { ...m, organizerRoleName: null } : m
              )
            );
            setAssigningOrganizerRoleTo(null); // Đóng UI nếu đang mở
            setSelectedOrganizerRoleId("");
            return `Xóa vai trò của ${memberName} thành công!`;
          },
          error: (err) =>
            `Xóa vai trò thất bại: ${err.message || "Lỗi không xác định"}`,
        });
      },
    });
    setIsConfirmOpen(true); // Mở dialog xác nhận
  };

  // --- JSX Rendering ---
  return (
    <div className="flex flex-col h-full p-4 md:p-5 bg-gray-50 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0 gap-2">
        <h2 className="text-xl md:text-2xl font-bold text-pink-600">
          Thành viên câu lạc bộ
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => setTab("all")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "all"
              ? "border-b-2 border-purple-500 text-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          👥 Tất cả ({members.length})
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "admin"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          👑 QTV ({members.filter((m) => m.roleName === "ADMIN").length})
        </button>
        <button
          onClick={() => setTab("core")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "core"
              ? "border-b-2 border-green-500 text-green-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          💪 Nòng cốt ({members.filter((m) => m.roleName === "USER").length})
        </button>
        <button
          onClick={() => setTab("casual")}
          className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
            tab === "casual"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🧍‍♂️ Vãng lai ({members.filter((m) => m.roleName === "GUEST").length})
        </button>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0">
        <div className="relative flex-grow">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên, email, vị trí, vai trò..."
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
            <option value="az">A - Z</option>
            <option value="za">Z - A</option>
          </select>
        </div>
      </div>

      {/* Member List */}
      <div className="space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {loading ? (
          <p className="text-center text-gray-500 py-4">Đang tải...</p>
        ) : error ? (
          <div className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200 whitespace-pre-line">
            ⚠️ {error}
          </div>
        ) : processedMembers.length > 0 ? (
          processedMembers.map((member) => (
            <div
              key={member.id}
              className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center hover:bg-gray-50 transition-colors duration-150"
            >
              {/* Member Info */}
              <div className="flex items-center gap-3 overflow-hidden mr-2 mb-2 sm:mb-0 flex-grow">
                <img
                  src={
                    member.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      member.displayName
                    )}&background=random&color=fff&size=128`
                  }
                  alt={`Avatar của ${member.displayName}`}
                  className="w-10 h-10 rounded-full object-cover border flex-shrink-0 bg-gray-200"
                />
                <div className="overflow-hidden">
                  <h3
                    className="font-semibold text-sm md:text-base text-gray-800 truncate"
                    title={member.displayName}
                  >
                    {member.displayName}
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
                    {/* Hiển thị cả vị trí và vai trò nếu có */}
                    {(member.positionName || member.organizerRoleName) && " ("}
                    {member.positionName}
                    {member.positionName && member.organizerRoleName && " / "}
                    {member.organizerRoleName}
                    {(member.positionName || member.organizerRoleName) && ")"}
                  </p>
                </div>
              </div>
              {/* Action Buttons / Position & Role Assignment */}
              <div className="flex flex-col items-end sm:items-center gap-2 flex-shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
                {" "}
                {/* Chỉnh layout nút */}
                {/* Chỉ Admin mới thấy các nút phân quyền/vị trí cho USER khác */}
                {userRole === "ADMIN" &&
                  (member.roleName === "USER" || member.roleName === "GUEST") &&
                  member.email !== currentUserEmail && (
                    <>
                      {/* --- Position Assignment UI --- */}
                      <div className="flex items-center gap-1 flex-wrap justify-end w-full">
                        {" "}
                        {/* Đảm bảo các nút trên 1 hàng */}
                        {assigningPositionTo === member.id ? (
                          <>
                            <label
                              htmlFor={`position-select-${member.id}`}
                              className="sr-only"
                            >
                              Chọn vị trí
                            </label>
                            <select
                              id={`position-select-${member.id}`}
                              value={selectedPositionId}
                              onChange={(e) =>
                                setSelectedPositionId(e.target.value)
                              }
                              className="p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white min-w-[100px] flex-grow sm:flex-grow-0"
                            >
                              <option value="" disabled>
                                -- Vị trí --
                              </option>
                              {positions.length === 0 && !loading && (
                                <option disabled>Không có</option>
                              )}
                              {positions.map((pos) => (
                                <option key={pos.id} value={pos.id}>
                                  {pos.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssignPosition(member.id)}
                              disabled={!selectedPositionId}
                              className="px-1.5 py-0.5 cursor-pointer bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Gán
                            </button>
                            <button
                              onClick={() => setAssigningPositionTo(null)}
                              className="px-1.5 py-0.5 cursor-pointer bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAssignPositionClick(member.id)}
                            className="text-sky-600 hover:text-sky-800 p-1 cursor-pointer rounded hover:bg-sky-100 transition-colors duration-150 text-xs font-medium border border-sky-300 px-1.5"
                            title={`Phân vị trí cho ${member.displayName}`}
                          >
                            {member.positionName ? "Đổi vị trí" : "Phân vị trí"}
                          </button>
                        )}
                        {member.positionName &&
                          assigningPositionTo !== member.id && (
                            <button
                              onClick={() =>
                                handleRemovePosition(
                                  member.id,
                                  member.displayName
                                )
                              }
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer rounded hover:bg-red-100 transition-colors duration-150"
                              title={`Xóa vị trí của ${member.displayName}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                              <span className="sr-only">Xóa vị trí</span>
                            </button>
                          )}
                      </div>

                      {/* --- Organizer Role Assignment UI --- */}
                      <div className="flex items-center gap-1 flex-wrap justify-end w-full">
                        {" "}
                        {/* Đảm bảo các nút trên 1 hàng */}
                        {assigningOrganizerRoleTo === member.id ? (
                          <>
                            <label
                              htmlFor={`role-select-${member.id}`}
                              className="sr-only"
                            >
                              Chọn vai trò
                            </label>
                            <select
                              id={`role-select-${member.id}`}
                              value={selectedOrganizerRoleId}
                              onChange={(e) =>
                                setSelectedOrganizerRoleId(e.target.value)
                              }
                              className="p-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[100px] flex-grow sm:flex-grow-0"
                            >
                              <option value="" disabled>
                                -- Vai trò --
                              </option>
                              {organizerRoles.length === 0 && !loading && (
                                <option disabled>Không có</option>
                              )}
                              {organizerRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() =>
                                handleAssignOrganizerRole(member.id)
                              }
                              disabled={!selectedOrganizerRoleId}
                              className="px-1.5 py-0.5 cursor-pointer bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Gán
                            </button>
                            <button
                              onClick={() => setAssigningOrganizerRoleTo(null)}
                              className="px-1.5 py-0.5 cursor-pointer bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                            >
                              Hủy
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              handleAssignOrganizerRoleClick(member.id)
                            }
                            className="text-purple-600 hover:text-purple-800 p-1 cursor-pointer rounded hover:bg-purple-100 transition-colors duration-150 text-xs font-medium border border-purple-300 px-1.5"
                            title={`Phân vai trò cho ${member.displayName}`}
                          >
                            {member.organizerRoleName
                              ? "Đổi vai trò"
                              : "Phân vai trò"}
                          </button>
                        )}
                        {member.organizerRoleName &&
                          assigningOrganizerRoleTo !== member.id && (
                            <button
                              onClick={() =>
                                handleRemoveOrganizerRole(
                                  member.id,
                                  member.displayName
                                )
                              }
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer rounded hover:bg-red-100 transition-colors duration-150"
                              title={`Xóa vai trò của ${member.displayName}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                              <span className="sr-only">Xóa vai trò</span>
                            </button>
                          )}
                      </div>
                    </>
                  )}
              </div>{" "}
              {/* End Action Buttons Wrapper */}
            </div> // End Member Card Div
          )) // End Map
        ) : (
          <p className="text-center text-gray-500 italic py-4">
            {searchTerm
              ? "Không tìm thấy thành viên nào khớp."
              : "Không có thành viên nào."}
          </p>
        )}
      </div>

      {/* Render ConfirmDialog */}
      {confirmDialogProps && (
        <ConfirmDialog
          isOpen={isConfirmOpen}
          title={confirmDialogProps.title}
          message={confirmDialogProps.message}
          onConfirm={() => {
            confirmDialogProps.onConfirm();
            setIsConfirmOpen(false);
            setConfirmDialogProps(null);
          }}
          onCancel={() => {
            setIsConfirmOpen(false);
            setConfirmDialogProps(null);
          }}
          confirmText="Xác nhận"
          cancelText="Hủy"
        />
      )}
    </div> 
  );
};


export default MembersTabContent; 
