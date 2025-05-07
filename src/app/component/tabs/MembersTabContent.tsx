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
    InformationCircledIcon, // Icon mới cho tab bị khóa
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
                        <label htmlFor="confirm-reason-input" className="block text-sm font-medium text-gray-700 mb-1">
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
                        className="px-4 py-2 cursor-pointer bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
    lockedBy?: LockedByInfo | null; // Sửa đổi ở đây
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
    locked: boolean; // Giữ lại để các tab khác có thể hiển thị trạng thái nếu cần
}

// Giao diện mới cho thông tin hiển thị của tài khoản bị khóa
export interface DisplayLockedMemberInfo extends DisplayMember {
    lockedAt: string | null;
    lockReason: string | null;
    lockedByInfo: LockedByInfo | null;
    lockedByDisplayName: string; // Tên hiển thị của người khóa
}


interface MembersTabContentProps {
    user: MainUserType | null; // MainUserType cũng cần có 'roles' là một array
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
    const [tab, setTab] = useState<"all" | "admin" | "core" | "casual" | "locked">("all");
    const [allApiUsers, setAllApiUsers] = useState<ApiUser[]>([]);
    const [displayMembers, setDisplayMembers] = useState<DisplayMember[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<"az" | "za" | "none">("none");

    // State cho danh sách tài khoản bị khóa
    const [rawLockedUsers, setRawLockedUsers] = useState<ApiUser[]>([]);
    const [displayLockedUsers, setDisplayLockedUsers] = useState<DisplayLockedMemberInfo[]>([]);
    const [loadingLocked, setLoadingLocked] = useState<boolean>(false);
    const [errorLocked, setErrorLocked] = useState<string | null>(null);


    const [positions, setPositions] = useState<ApiPosition[]>([]);
    const [assigningPositionTo, setAssigningPositionTo] = useState<string | null>(null);
    const [selectedPositionId, setSelectedPositionId] = useState<string>("");
    const [organizerRoles, setOrganizerRoles] = useState<ApiOrganizerRole[]>([]);
    const [assigningOrganizerRoleTo, setAssigningOrganizerRoleTo] = useState<string | null>(null);
    const [selectedOrganizerRoleId, setSelectedOrganizerRoleId] = useState<string>("");
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmDialogProps, setConfirmDialogProps] = useState<Omit<ConfirmDialogProps, 'isOpen' | 'onCancel'> | null>(null);
    const [lockingMemberId, setLockingMemberId] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState<ApiUser | null>(null);
    const [displayMode, setDisplayMode] = useState<'list' | 'card'>('list');

    const isCurrentUserAdmin = useMemo(() => {
        if (!user || !user.roles) return false;
        return user.roles.some(role => typeof role === 'string' ? role.toUpperCase() === 'ADMIN' : role.name?.toUpperCase() === 'ADMIN');
    }, [user]);

    const formatDateNullable = (dateString: string | undefined | null): string => {
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
        let displayName = [apiUser.lastName, apiUser.firstName].filter(Boolean).join(" ").trim();
        if (!displayName) displayName = apiUser.username || `User (${apiUser.id.substring(0, 6)})`;
        return {
            id: apiUser.id,
            displayName: displayName,
            roleName: roleName,
            email: apiUser.email,
            avatar: apiUser.avatar,
            positionName: apiUser.position?.name || null,
            organizerRoleName: apiUser.organizerRole?.name || null,
            locked: apiUser.locked,
        };
    };

    const transformApiUserToDisplayLockedMemberInfo = (apiUser: ApiUser): DisplayLockedMemberInfo => {
        const baseDisplayMember = transformApiUserToDisplayMember(apiUser);
        let lockedByDisplayName = "Không rõ";
        if (apiUser.lockedBy) {
            lockedByDisplayName = [apiUser.lockedBy.lastName, apiUser.lockedBy.firstName].filter(Boolean).join(" ").trim() || apiUser.lockedBy.username || `Admin (${apiUser.lockedBy.id.substring(0, 6)})`;
        }

        return {
            ...baseDisplayMember,
            lockedAt: apiUser.lockedAt || null,
            lockReason: apiUser.lockReason || null,
            lockedByInfo: apiUser.lockedBy || null,
            lockedByDisplayName: lockedByDisplayName,
        };
    };


    const fetchMembers = useCallback(async () => {
        const token = localStorage.getItem("authToken");
        if (!token) { setError("Không tìm thấy token xác thực."); toast.error("Yêu cầu xác thực."); setLoading(false); return; }
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8080/identity/users", { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) { let errMsg = `Lỗi ${response.status}`; if (response.status === 401 || response.status === 403) { errMsg = "Phiên hết hạn/Không có quyền."; localStorage.removeItem("authToken"); } else { try { const errData = await response.json(); errMsg = errData.message || errMsg; } catch (e) { } } throw new Error(errMsg); }
            const data = await response.json();
            if (data.code === 1000 && Array.isArray(data.result)) {
                setAllApiUsers(data.result); // Cập nhật cả lockedBy ở đây nếu API trả về
                setDisplayMembers(data.result.map(transformApiUserToDisplayMember));
            } else { throw new Error(data.message || "Dữ liệu thành viên không hợp lệ."); }
            setError(null);
        } catch (err: any) { console.error("Lỗi tải thành viên:", err); const msg = err instanceof Error ? err.message : "Lỗi tải thành viên."; setError(msg); toast.error(`Lỗi tải thành viên: ${msg}`); setDisplayMembers([]); }
        finally { setLoading(false); }
    }, []);

    const fetchLockedUsers = useCallback(async () => {
        const token = localStorage.getItem("authToken");
        if (!token) { setErrorLocked("Không tìm thấy token xác thực."); toast.error("Yêu cầu xác thực để xem danh sách bị khóa."); setLoadingLocked(false); return; }
        setLoadingLocked(true);
        setErrorLocked(null);
        try {
            const response = await fetch("http://localhost:8080/identity/users/locked", { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) { let errMsg = `Lỗi ${response.status}`; if (response.status === 401 || response.status === 403) { errMsg = "Phiên hết hạn/Không có quyền."; localStorage.removeItem("authToken"); } else { try { const errData = await response.json(); errMsg = errData.message || errMsg; } catch (e) { } } throw new Error(errMsg); }
            const data = await response.json();
            if (data.code === 1000 && data.result && Array.isArray(data.result.content)) {
                setRawLockedUsers(data.result.content);
                setDisplayLockedUsers(data.result.content.map(transformApiUserToDisplayLockedMemberInfo));
            } else { throw new Error(data.message || "Dữ liệu tài khoản bị khóa không hợp lệ."); }
        } catch (err: any) { console.error("Lỗi tải tài khoản bị khóa:", err); const msg = err instanceof Error ? err.message : "Lỗi tải tài khoản bị khóa."; setErrorLocked(msg); toast.error(`Lỗi tải DS bị khóa: ${msg}`); setDisplayLockedUsers([]);}
        finally { setLoadingLocked(false); }
    }, []);


    const fetchPositions = useCallback(async () => { /* ... không đổi ... */ }, []);
    const fetchOrganizerRoles = useCallback(async () => { /* ... không đổi ... */ }, []);

    useEffect(() => {
        setLoading(true); setError(null); setDisplayMembers([]); setPositions([]); setOrganizerRoles([]);
        Promise.all([fetchMembers(), fetchPositions(), fetchOrganizerRoles()]).finally(() => setLoading(false));
    }, [fetchMembers, fetchPositions, fetchOrganizerRoles]);

    // Tải danh sách khóa khi tab "locked" được chọn lần đầu
    useEffect(() => {
        if (tab === "locked" && rawLockedUsers.length === 0 && !loadingLocked) {
            fetchLockedUsers();
        }
    }, [tab, rawLockedUsers.length, fetchLockedUsers, loadingLocked]);


    const processedMembers = useMemo(() => {
        let membersToProcess: Array<DisplayMember | DisplayLockedMemberInfo> = [];

        if (tab === 'locked') {
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
            membersToProcess = membersToProcess.filter(member =>
                member.displayName.toLowerCase().includes(lowerSearchTerm) ||
                (member.email && member.email.toLowerCase().includes(lowerSearchTerm)) ||
                (tab === 'locked' && (member as DisplayLockedMemberInfo).lockReason?.toLowerCase().includes(lowerSearchTerm)) ||
                (tab === 'locked' && (member as DisplayLockedMemberInfo).lockedByDisplayName?.toLowerCase().includes(lowerSearchTerm)) ||
                (member.positionName && member.positionName.toLowerCase().includes(lowerSearchTerm)) ||
                (member.organizerRoleName && member.organizerRoleName.toLowerCase().includes(lowerSearchTerm))
            );
        }

        if (sortOrder === "az") membersToProcess.sort((a, b) => a.displayName.localeCompare(b.displayName, "vi", { sensitivity: "base" }));
        else if (sortOrder === "za") membersToProcess.sort((a, b) => b.displayName.localeCompare(a.displayName, "vi", { sensitivity: "base" }));

        return membersToProcess;
    }, [displayMembers, displayLockedUsers, tab, searchTerm, sortOrder]);


    const handleAssignPositionClick = (memberId: string) => { /* ... không đổi ... */ };
    const handleAssignOrganizerRoleClick = (memberId: string) => { /* ... không đổi ... */ };
    const handleAssignPosition = (memberId: string) => { /* ... không đổi ... */ };
    const handleRemovePosition = (memberId: string, memberName: string) => { /* ... không đổi ... */ };
    const handleAssignOrganizerRole = (memberId: string) => { /* ... không đổi ... */ };
    const handleRemoveOrganizerRole = (memberId: string, memberName: string) => { /* ... không đổi ... */ };

    const executeLockAccount = async (userIdToLock: string, reason: string, memberName: string) => {
        const adminUserId = user?.id;
        if (!adminUserId || !isCurrentUserAdmin) { toast.error("Bạn không có quyền thực hiện hành động này."); setIsConfirmOpen(false); setConfirmDialogProps(null); return; }
        if (userIdToLock === adminUserId) { toast.error("Không thể tự khóa tài khoản của chính mình."); setIsConfirmOpen(false); setConfirmDialogProps(null); return; }
        setLockingMemberId(userIdToLock);
        const toastId = toast.loading(`Đang khóa tài khoản ${memberName}...`);
        try {
            const token = localStorage.getItem("authToken");
            if (!token) { toast.error("Vui lòng đăng nhập lại.", { id: toastId }); throw new Error("Token không tồn tại."); }
            const url = `http://localhost:8080/identity/users/${userIdToLock}/lock?lockedById=${adminUserId}&reason=${encodeURIComponent(reason)}`;
            const response = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }});
            const responseData = await response.json();
            if (!response.ok || responseData.code !== 1000) { throw new Error(responseData.message || `Lỗi khóa tài khoản (${response.status})`); }
            toast.success(responseData.message || `Đã khóa tài khoản ${memberName}!`, { id: toastId });
            await fetchMembers(); // Tải lại danh sách chung
            if (tab === 'locked') await fetchLockedUsers(); // Tải lại danh sách bị khóa nếu đang ở tab đó

            if (selectedUserProfile && selectedUserProfile.id === userIdToLock) {
                const updatedProfile = allApiUsers.find(u => u.id === userIdToLock) || rawLockedUsers.find(u => u.id === userIdToLock);
                 if (updatedProfile) setSelectedUserProfile(updatedProfile);
                 else setSelectedUserProfile(prev => prev ? { ...prev, locked: true, lockReason: reason, lockedAt: new Date().toISOString(), lockedBy: user ? {id: user.id, username: user.username, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar} : undefined } : null);
            }
        } catch (err: any) { toast.error(`Khóa thất bại: ${err.message}`, { id: toastId }); console.error("Lỗi khóa tài khoản:", err); }
        finally { setLockingMemberId(null); setIsConfirmOpen(false); setConfirmDialogProps(null); }
    };

    const handleLockAccountTrigger = (memberOrLockedMember: ApiUser | DisplayMember | DisplayLockedMemberInfo) => {
        const memberId = memberOrLockedMember.id;
        // Lấy thông tin đầy đủ từ allApiUsers hoặc rawLockedUsers để đảm bảo có đủ thông tin
        const fullMemberInfo = allApiUsers.find(u => u.id === memberId) || rawLockedUsers.find(u => u.id === memberId);
        const memberToLock = fullMemberInfo || (memberOrLockedMember as ApiUser); // Fallback

        const memberName = (memberToLock as DisplayMember).displayName || `${(memberToLock as ApiUser).lastName} ${(memberToLock as ApiUser).firstName}`.trim() || (memberToLock as ApiUser).username || "Thành viên";

        if (!user || !isCurrentUserAdmin || (user && memberToLock.id === user.id)) { toast.error("Không thể thực hiện hành động này hoặc bạn không có quyền."); return; }
        if (memberToLock.locked) { toast.error(`Tài khoản "${memberName}" đã bị khóa.`); return; }
        setConfirmDialogProps({
            title: "Xác nhận khóa tài khoản", message: `Bạn có chắc muốn khóa tài khoản của "${memberName}"?`, requiresReason: true,
            reasonLabel: `Lý do khóa tài khoản ${memberName}:`, reasonPlaceholder: "Ví dụ: Vi phạm quy định...", confirmText: "Khóa tài khoản",
            onConfirmWithReason: (reason) => { executeLockAccount(memberToLock.id, reason, memberName); },
        });
        setIsConfirmOpen(true);
    };

    const handleViewProfile = (memberId: string) => {
        const userToView = allApiUsers.find(u => u.id === memberId) || rawLockedUsers.find(u => u.id === memberId);
        if (userToView) { setSelectedUserProfile(userToView); setIsProfileModalOpen(true); }
        else { toast.error("Không tìm thấy thông tin chi tiết."); }
    };

    const actionButtonBaseClasses = "p-1.5 rounded hover:bg-opacity-80 transition-colors duration-150 text-xs font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed";
    const assignButtonClasses = `${actionButtonBaseClasses} bg-sky-50 text-sky-700 border border-sky-300 hover:bg-sky-100 hover:border-sky-400`;
    const removeButtonClasses = `${actionButtonBaseClasses} text-red-500 hover:text-red-700 hover:bg-red-100`;
    const lockButtonClasses = `${actionButtonBaseClasses} bg-red-50 text-red-600 hover:bg-red-100 border border-red-300`;

    return (
        <div className="flex flex-col h-full p-4 md:p-5 bg-gray-50 relative">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0 gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-pink-600"> Thành viên câu lạc bộ </h2>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
                <button onClick={() => setTab("all")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${tab === "all" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500 hover:text-gray-700"}`}> 👥 Tất cả ({displayMembers.length}) </button>
                <button onClick={() => setTab("admin")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${tab === "admin" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"}`}> 👑 QTV ({displayMembers.filter((m) => m.roleName === "ADMIN").length}) </button>
                <button onClick={() => setTab("core")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${tab === "core" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700"}`}> 💪 Nòng cốt ({displayMembers.filter((m) => m.roleName === "USER").length}) </button>
                <button onClick={() => setTab("casual")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${tab === "casual" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}> 🧍 Vãng lai ({displayMembers.filter((m) => m.roleName === "GUEST").length}) </button>
                {isCurrentUserAdmin && (
                    <button onClick={() => setTab("locked")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${tab === "locked" ? "border-b-2 border-orange-500 text-orange-600" : "text-gray-500 hover:text-gray-700"}`}> <LockClosedIcon className="inline-block h-4 w-4 mr-1 align-text-bottom" /> Bị khóa ({displayLockedUsers.length}) </button>
                )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-shrink-0 items-center">
                <div className="relative flex-grow">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><MagnifyingGlassIcon className="h-4 w-4" /></span>
                    <input type="text" placeholder={tab === 'locked' ? "Tìm theo tên, email, lý do, người khóa..." : "Tìm theo tên, email, vị trí, vai trò..."} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 pl-9 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-sm" aria-label="Tìm kiếm thành viên" />
                </div>
                <div className="flex-shrink-0">
                    <label htmlFor="sort-select" className="text-sm text-gray-600 mr-1"> Sắp xếp: </label>
                    <select id="sort-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "az" | "za" | "none")} className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 h-[38px] shadow-sm bg-white appearance-none pr-7" aria-label="Sắp xếp thành viên" >
                        <option value="none">Mặc định</option> <option value="az">A - Z</option> <option value="za">Z - A</option>
                    </select>
                </div>
                 <div className="flex-shrink-0 flex items-center gap-2 p-1 bg-gray-200 rounded-lg">
                    <button onClick={() => setDisplayMode('list')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${displayMode === 'list' ? 'bg-white text-purple-600 shadow' : 'text-gray-600 hover:bg-gray-100'}`} aria-pressed={displayMode === 'list'} title="Hiển thị dạng danh sách" ><ListBulletIcon className="w-4 h-4 inline-block sm:mr-1" /></button>
                    <button onClick={() => setDisplayMode('card')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${displayMode === 'card' ? 'bg-white text-purple-600 shadow' : 'text-gray-600 hover:bg-gray-100'}`} aria-pressed={displayMode === 'card'} title="Hiển thị dạng thẻ" ><Component1Icon className="w-4 h-4 inline-block sm:mr-1" /></button>
                </div>
            </div>

            {/* Display Area */}
            <div className={`overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 ${
                displayMode === 'list' || tab === 'locked' && displayMode === 'list' ? 'space-y-3' : 
                displayMode === 'card' && tab !== 'locked' ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4' :
                tab === 'locked' && displayMode === 'card' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : '' // Layout cho tab khóa dạng thẻ
            }`}>
                {(loading && tab !== 'locked') || (loadingLocked && tab === 'locked') ? (<p className="text-center text-gray-500 py-4">Đang tải...</p>
                ) : (error && tab !== 'locked') || (errorLocked && tab === 'locked') ? (
                    <div className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200 whitespace-pre-line"> ⚠️ {tab === 'locked' ? errorLocked : error} </div>
                ) : processedMembers.length > 0 ? (
                    processedMembers.map((member) => {
                        const isLockedTabActive = tab === 'locked';
                        const lockedInfo = member as DisplayLockedMemberInfo; // Type assertion for locked tab

                        if (displayMode === 'list' || isLockedTabActive) { // List mode or always list for locked tab for now
                           return ( <div key={member.id} className={`p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-start hover:bg-gray-50 transition-colors duration-150 ${member.locked && !isLockedTabActive ? 'opacity-70 border-l-4 border-red-300' : ''}`}>
                                <div className="flex items-center gap-3 overflow-hidden mr-2 mb-3 sm:mb-0 flex-grow cursor-pointer" onClick={() => handleViewProfile(member.id)}>
                                    <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=random&color=fff&size=128`} alt={`Avatar của ${member.displayName}`} width={40} height={40} className="w-10 h-10 rounded-full object-cover border flex-shrink-0 bg-gray-200" />
                                    <div className="overflow-hidden">
                                        <h3 className="font-semibold text-sm md:text-base text-gray-800 truncate" title={member.displayName}>
                                            {member.displayName}
                                            {member.locked && <span className={`text-xs font-semibold ml-1 ${isLockedTabActive ? 'text-orange-600' : 'text-red-500'}`}>(Bị khóa)</span>}
                                        </h3>
                                        {member.email && (<p className="text-gray-600 text-xs md:text-sm truncate" title={member.email}> 📧 {member.email} </p>)}
                                        <p className={`text-xs md:text-sm font-medium ${member.roleName === "ADMIN" ? "text-red-600" : member.roleName === "USER" ? "text-green-600" : member.roleName === "GUEST" ? "text-blue-600" : "text-gray-500"}`}>
                                            {roleDisplayMap[member.roleName] || member.roleName}
                                            {(!isLockedTabActive && (member.positionName || member.organizerRoleName)) && " ("}
                                            {!isLockedTabActive && member.positionName}
                                            {!isLockedTabActive && member.positionName && member.organizerRoleName && " / "}
                                            {!isLockedTabActive && member.organizerRoleName}
                                            {!isLockedTabActive && (member.positionName || member.organizerRoleName) && ")"}
                                        </p>
                                        {isLockedTabActive && (
                                            <>
                                                <p className="text-xs text-gray-500 mt-0.5" title={lockedInfo.lockReason || ""}><strong>Lý do:</strong> {lockedInfo.lockReason || "Không có"}</p>
                                                <p className="text-xs text-gray-500"><strong>Khóa lúc:</strong> {formatDateNullable(lockedInfo.lockedAt)}</p>
                                                <p className="text-xs text-gray-500" title={lockedInfo.lockedByDisplayName}><strong>Người khóa:</strong> {lockedInfo.lockedByDisplayName}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {!isLockedTabActive && isCurrentUserAdmin && (member.roleName === "USER" || member.roleName === "GUEST") && user && member.id !== user.id && (
                                    <div className="flex flex-col items-stretch sm:items-end gap-2 flex-shrink-0 w-full sm:w-auto sm:max-w-xs md:max-w-sm">
                                         {assigningPositionTo === member.id ? (
                                            <div className="p-2.5 border border-sky-300 rounded-md bg-sky-50 w-full shadow-sm">
                                                <label htmlFor={`position-select-list-${member.id}`} className="block text-xs font-medium text-sky-700 mb-1.5">Gán vị trí cho {member.displayName}:</label>
                                                <div className="flex items-center gap-2">
                                                    <select id={`position-select-list-${member.id}`} value={selectedPositionId} onChange={(e) => setSelectedPositionId(e.target.value)} className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm">
                                                        <option value="" disabled>{positions.length > 0 ? "-- Chọn Vị trí --" : (loading ? "Đang tải..." : "Không có vị trí")}</option>
                                                        {positions.map((pos) => (<option key={pos.id} value={pos.id}>{pos.name}</option>))}
                                                    </select>
                                                    <button onClick={() => handleAssignPosition(member.id)} disabled={!selectedPositionId} className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium">Lưu</button>
                                                    <button onClick={() => { setAssigningPositionTo(null); setSelectedPositionId(""); }} className="px-3 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 font-medium">Hủy</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 w-full justify-end">
                                                <button onClick={() => handleAssignPositionClick(member.id)} className={`${assignButtonClasses} flex-grow sm:flex-grow-0 justify-center`} title={member.positionName ? `Đổi vị trí: ${member.positionName}` : "Phân vị trí"}><Component1Icon className="h-3.5 w-3.5" /><span>{member.positionName ? "Đổi Vị trí" : "Phân Vị trí"}</span></button>
                                                {member.positionName && (<button onClick={() => handleRemovePosition(member.id, member.displayName)} className={`${removeButtonClasses} px-2`} title={`Xóa vị trí ${member.positionName}`}><TrashIcon className="h-3.5 w-3.5" /></button>)}
                                            </div>
                                        )}
                                        {assigningOrganizerRoleTo === member.id ? (
                                            <div className="p-2.5 border border-purple-300 rounded-md bg-purple-50 w-full shadow-sm mt-2">
                                                <label htmlFor={`role-select-list-${member.id}`} className="block text-xs font-medium text-purple-700 mb-1.5">Gán vai trò BTC cho {member.displayName}:</label>
                                                <div className="flex items-center gap-2">
                                                    <select id={`role-select-list-${member.id}`} value={selectedOrganizerRoleId} onChange={(e) => setSelectedOrganizerRoleId(e.target.value)} className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm">
                                                        <option value="" disabled>{organizerRoles.length > 0 ? "-- Chọn Vai trò BTC --" : (loading ? "Đang tải..." : "Không có vai trò")}</option>
                                                        {organizerRoles.map((role) => (<option key={role.id} value={role.id}>{role.name}</option>))}
                                                    </select>
                                                    <button onClick={() => handleAssignOrganizerRole(member.id)} disabled={!selectedOrganizerRoleId} className="px-3 py-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium">Lưu</button>
                                                    <button onClick={() => { setAssigningOrganizerRoleTo(null); setSelectedOrganizerRoleId(""); }} className="px-3 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 font-medium">Hủy</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 w-full justify-end mt-1.5">
                                                <button onClick={() => handleAssignOrganizerRoleClick(member.id)} className={`bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 hover:border-purple-400 ${actionButtonBaseClasses} flex-grow sm:flex-grow-0 justify-center`} title={member.organizerRoleName ? `Đổi vai trò BTC: ${member.organizerRoleName}` : "Phân vai trò Ban Tổ Chức"}><ListBulletIcon className="h-3.5 w-3.5" /><span>{member.organizerRoleName ? "Đổi Vai trò BTC" : "Phân Vai trò BTC"}</span></button>
                                                {member.organizerRoleName && (<button onClick={() => handleRemoveOrganizerRole(member.id, member.displayName)} className={`${removeButtonClasses} px-2`} title={`Xóa vai trò ${member.organizerRoleName}`}><TrashIcon className="h-3.5 w-3.5" /></button>)}
                                            </div>
                                        )}
                                        {!member.locked && (
                                            <button onClick={() => handleLockAccountTrigger(member)} disabled={lockingMemberId === member.id} className={`${lockButtonClasses} w-full sm:w-auto justify-center mt-2 ${lockingMemberId === member.id ? "cursor-wait" : ""}`} title={`Khóa tài khoản của ${member.displayName}`}>
                                                {lockingMemberId === member.id ? <ReloadIcon className="h-3.5 w-3.5 animate-spin" /> : <LockClosedIcon className="h-3.5 w-3.5" />}
                                                <span className="ml-1">{lockingMemberId === member.id ? "Đang khóa..." : "Khóa Tài khoản"}</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                                {isLockedTabActive && isCurrentUserAdmin && (
                                     <div className="flex flex-col items-stretch sm:items-end gap-2 flex-shrink-0 w-full sm:w-auto sm:max-w-xs md:max-w-sm">
                                        {/* Chức năng mở khóa có thể được thêm ở đây */}
                                        {/* <button className="...">Mở khóa</button> */}
                                     </div>
                                )}
                            </div>
                           )
                        }
                        // Card display mode for non-locked tabs
                        if (displayMode === 'card' && !isLockedTabActive) {
                           return (
                            <div key={member.id} className={`p-4 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col items-center text-center hover:shadow-xl transition-shadow duration-200 ${member.locked ? 'opacity-60 border-l-4 border-red-400' : ''}`}>
                                <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=random&color=fff&size=128`} alt={`Avatar của ${member.displayName}`} width={80} height={80} className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 mb-3 cursor-pointer" onClick={() => handleViewProfile(member.id)} />
                                <h3 className="font-semibold text-base md:text-lg text-gray-800 truncate w-full cursor-pointer" title={member.displayName} onClick={() => handleViewProfile(member.id)}>
                                    {member.displayName}
                                    {member.locked && <span className="text-xs text-red-500 font-semibold ml-1">(Bị khóa)</span>}
                                </h3>
                                {member.email && (<p className="text-gray-600 text-xs md:text-sm truncate w-full" title={member.email}>{member.email}</p>)}
                                <p className={`text-xs md:text-sm font-medium mt-1 ${member.roleName === "ADMIN" ? "text-red-600" : member.roleName === "USER" ? "text-green-600" : member.roleName === "GUEST" ? "text-blue-600" : "text-gray-500"}`}>
                                    {roleDisplayMap[member.roleName] || member.roleName}
                                </p>
                                {(member.positionName || member.organizerRoleName) && (
                                    <p className="text-xs text-gray-500 mt-0.5 w-full truncate" title={`${member.positionName || ''}${member.positionName && member.organizerRoleName ? ' / ' : ''}${member.organizerRoleName || ''}`}>
                                        {member.positionName}{member.positionName && member.organizerRoleName && " / "}{member.organizerRoleName}
                                    </p>
                                )}
                                <div className="mt-4 w-full space-y-2">
                                    {isCurrentUserAdmin && (member.roleName === "USER" || member.roleName === "GUEST") && user && member.id !== user.id && (
                                        <>
                                            {assigningPositionTo === member.id ? ( /* ... form gán vị trí ... */  <div className="p-2.5 border border-sky-300 rounded-md bg-sky-50 w-full shadow-sm text-left"> <label htmlFor={`position-select-card-${member.id}`} className="block text-xs font-medium text-sky-700 mb-1.5">Vị trí:</label> <div className="flex items-center gap-2"> <select id={`position-select-card-${member.id}`} value={selectedPositionId} onChange={(e) => setSelectedPositionId(e.target.value)} className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-sm"> <option value="" disabled>{positions.length > 0 ? "-- Chọn --" : (loading ? "..." : "Không có")}</option> {positions.map((pos) => (<option key={pos.id} value={pos.id}>{pos.name}</option>))} </select> <button onClick={() => handleAssignPosition(member.id)} disabled={!selectedPositionId} className="p-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 font-medium"><CheckCircledIcon className="w-4 h-4"/></button> <button onClick={() => { setAssigningPositionTo(null); setSelectedPositionId("");}} className="p-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 font-medium"><CrossCircledIcon className="w-4 h-4"/></button> </div> </div>
                                            ) : (
                                                <div className="flex items-center gap-2 w-full">
                                                    <button onClick={() => handleAssignPositionClick(member.id)} className={`${assignButtonClasses} w-full justify-center text-xs py-2`} title={member.positionName ? `Đổi vị trí: ${member.positionName}` : "Phân vị trí"}>
                                                        <Component1Icon className="h-4 w-4 mr-1" />{member.positionName ? "Đổi Vị trí" : "Phân Vị trí"}
                                                    </button>
                                                    {member.positionName && (<button onClick={() => handleRemovePosition(member.id, member.displayName)} className={`${removeButtonClasses} p-2`} title={`Xóa vị trí ${member.positionName}`}><TrashIcon className="h-4 w-4" /></button>)}
                                                </div>
                                            )}
                                            {assigningOrganizerRoleTo === member.id ? ( /* ... form gán vai trò BTC ... */ <div className="p-2.5 border border-purple-300 rounded-md bg-purple-50 w-full shadow-sm text-left mt-2"> <label htmlFor={`role-select-card-${member.id}`} className="block text-xs font-medium text-purple-700 mb-1.5">Vai trò BTC:</label> <div className="flex items-center gap-2"> <select id={`role-select-card-${member.id}`} value={selectedOrganizerRoleId} onChange={(e) => setSelectedOrganizerRoleId(e.target.value)} className="flex-grow p-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"> <option value="" disabled>{organizerRoles.length > 0 ? "-- Chọn --" : (loading ? "..." : "Không có")}</option> {organizerRoles.map((role) => (<option key={role.id} value={role.id}>{role.name}</option>))} </select> <button onClick={() => handleAssignOrganizerRole(member.id)} disabled={!selectedOrganizerRoleId} className="p-1.5 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50 font-medium"><CheckCircledIcon className="w-4 h-4"/></button> <button onClick={() => { setAssigningOrganizerRoleTo(null); setSelectedOrganizerRoleId("");}} className="p-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 font-medium"><CrossCircledIcon className="w-4 h-4"/></button> </div> </div>
                                            ) : (
                                                <div className="flex items-center gap-2 w-full mt-1.5">
                                                    <button onClick={() => handleAssignOrganizerRoleClick(member.id)} className={`bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 hover:border-purple-400 ${actionButtonBaseClasses} w-full justify-center text-xs py-2`} title={member.organizerRoleName ? `Đổi vai trò BTC: ${member.organizerRoleName}` : "Phân vai trò BTC"}>
                                                        <ListBulletIcon className="h-4 w-4 mr-1" />{member.organizerRoleName ? "Đổi Vai trò BTC" : "Phân Vai trò BTC"}
                                                    </button>
                                                    {member.organizerRoleName && (<button onClick={() => handleRemoveOrganizerRole(member.id, member.displayName)} className={`${removeButtonClasses} p-2`} title={`Xóa vai trò ${member.organizerRoleName}`}><TrashIcon className="h-4 w-4" /></button>)}
                                                </div>
                                            )}
                                            {!member.locked && (
                                                <button onClick={() => handleLockAccountTrigger(member)} disabled={lockingMemberId === member.id} className={`${lockButtonClasses} w-full justify-center mt-1.5 text-xs py-2 ${lockingMemberId === member.id ? "cursor-wait" : ""}`} title={`Khóa tài khoản`}>
                                                    {lockingMemberId === member.id ? <ReloadIcon className="h-4 w-4 animate-spin" /> : <LockClosedIcon className="h-4 w-4" />}
                                                    <span className="ml-1">{lockingMemberId === member.id ? "Đang khóa..." : "Khóa TK"}</span>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                           )
                        }
                        // Card display mode for locked tab
                        if (displayMode === 'card' && isLockedTabActive) {
                            return (
                                <div key={lockedInfo.id} className="p-4 bg-white rounded-lg shadow-xl border border-orange-300 flex flex-col items-center text-center">
                                     <img src={lockedInfo.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(lockedInfo.displayName)}&background=random&color=fff&size=128`} alt={`Avatar của ${lockedInfo.displayName}`} width={80} height={80} className="w-20 h-20 rounded-full object-cover border-2 border-orange-200 mb-3 cursor-pointer" onClick={() => handleViewProfile(lockedInfo.id)} />
                                     <h3 className="font-semibold text-base md:text-lg text-gray-800 truncate w-full cursor-pointer" title={lockedInfo.displayName} onClick={() => handleViewProfile(lockedInfo.id)}>
                                         {lockedInfo.displayName} <span className="text-xs text-orange-600 font-semibold ml-1">(Bị khóa)</span>
                                     </h3>
                                     {lockedInfo.email && (<p className="text-gray-600 text-xs md:text-sm truncate w-full" title={lockedInfo.email}>{lockedInfo.email}</p>)}
                                     <p className={`text-xs md:text-sm font-medium mt-1 ${lockedInfo.roleName === "ADMIN" ? "text-red-600" : lockedInfo.roleName === "USER" ? "text-green-600" : lockedInfo.roleName === "GUEST" ? "text-blue-600" : "text-gray-500"}`}>
                                        {roleDisplayMap[lockedInfo.roleName] || lockedInfo.roleName}
                                     </p>
                                     <div className="mt-3 pt-3 border-t border-gray-200 w-full text-left text-xs space-y-1">
                                        <p className="text-gray-600" title={lockedInfo.lockReason || ""}><strong>Lý do khóa:</strong> <span className="text-gray-800">{lockedInfo.lockReason || "Không có"}</span></p>
                                        <p className="text-gray-600"><strong>Khóa vào lúc:</strong> <span className="text-gray-800">{formatDateNullable(lockedInfo.lockedAt)}</span></p>
                                        <p className="text-gray-600" title={lockedInfo.lockedByDisplayName}><strong>Người khóa:</strong> <span className="text-gray-800">{lockedInfo.lockedByDisplayName}</span></p>
                                     </div>
                                     {isCurrentUserAdmin && (
                                         <div className="mt-4 w-full">
                                             {/* <button className="...">Mở khóa tài khoản</button> */}
                                         </div>
                                     )}
                                </div>
                            )
                        }
                        return null; // Should not happen if displayMode and tab are handled
                    })
                ) : (<p className="text-center text-gray-500 italic py-4"> {searchTerm ? "Không tìm thấy tài khoản nào khớp." : (tab === 'locked' ? "Không có tài khoản nào bị khóa." : "Không có thành viên nào.")} </p>)}
            </div>

            {confirmDialogProps && (
                <ConfirmDialog isOpen={isConfirmOpen} title={confirmDialogProps.title} message={confirmDialogProps.message}
                    onConfirm={confirmDialogProps.onConfirm}
                    onCancel={() => { setIsConfirmOpen(false); setConfirmDialogProps(null); }}
                    confirmText={confirmDialogProps.confirmText} cancelText={confirmDialogProps.cancelText}
                    requiresReason={confirmDialogProps.requiresReason} onConfirmWithReason={confirmDialogProps.onConfirmWithReason}
                    reasonLabel={confirmDialogProps.reasonLabel} reasonPlaceholder={confirmDialogProps.reasonPlaceholder}
                />
            )}
            {selectedUserProfile && <UserProfileModal isOpen={isProfileModalOpen} onClose={() => { setIsProfileModalOpen(false); setSelectedUserProfile(null); }} userProfile={selectedUserProfile} currentUser={user} onTriggerLockAccount={handleLockAccountTrigger} isLockingTargetUser={lockingMemberId === selectedUserProfile?.id} />}
        </div>
    );
};

export default MembersTabContent;