"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { User as MainUserType } from "../homeuser"; // Adjust path if needed

// Interfaces
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
}

interface DisplayMember {
    id: string;
    displayName: string;
    roleName: string;
    email: string | null;
    avatar: string | null;
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
    const [tab, setTab] = useState<"all" | "admin" | "core" | "casual">("all");
    const [members, setMembers] = useState<DisplayMember[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState(""); // <--- State cho tìm kiếm
    const [sortOrder, setSortOrder] = useState<'az' | 'za' | 'none'>('none'); // <--- State cho sắp xếp

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("authToken");

        if (!token) {
            setError("Không tìm thấy token xác thực.");
            toast.error("Yêu cầu xác thực. Vui lòng đăng nhập lại.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("http://localhost:8080/identity/users", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    setError("Phiên đăng nhập hết hạn hoặc không có quyền truy cập.");
                    toast.error("Phiên đăng nhập hết hạn hoặc không có quyền truy cập.");
                    localStorage.removeItem("authToken");
                    // Optionally redirect to login
                } else {
                    throw new Error(`Lỗi ${response.status}: Không thể tải danh sách thành viên.`);
                }
                setLoading(false);
                return;
            }

            const data = await response.json();

            if (data.code === 1000 && Array.isArray(data.result)) {
                const transformedMembers = data.result.map((apiUser: ApiUser): DisplayMember => {
                    const roleName = apiUser.roles?.[0]?.name?.toUpperCase() || "UNKNOWN";
                    let displayName = [apiUser.lastName, apiUser.firstName]
                        .filter(Boolean).join(" ").trim();
                    if (!displayName) {
                        displayName = apiUser.username || `User (${apiUser.id.substring(0, 6)})`;
                    }
                    return {
                        id: apiUser.id,
                        displayName: displayName,
                        roleName: roleName,
                        email: apiUser.email,
                        avatar: apiUser.avatar,
                    };
                });
                setMembers(transformedMembers);
            } else {
                console.error("Cấu trúc API response không hợp lệ:", data);
                throw new Error("Dữ liệu trả về từ máy chủ không đúng định dạng.");
            }
        } catch (err: any) {
            console.error("Lỗi khi tải danh sách thành viên:", err);
            const errorMessage = err instanceof Error ? err.message : "Đã xảy ra lỗi không mong muốn.";
            setError(errorMessage);
            toast.error(`Lỗi tải thành viên: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    // Updated useMemo to include filtering and sorting
    const processedMembers = useMemo(() => {
        // Start with filtering by tab
        let membersToProcess = members.filter((member) => {
            if (tab === "all") return true;
            if (tab === "admin") return member.roleName === "ADMIN";
            if (tab === "core") return member.roleName === "USER";
            if (tab === "casual") return member.roleName === "GUEST";
            return false;
        });

        // Apply search filter
        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.trim().toLowerCase();
            membersToProcess = membersToProcess.filter(member =>
                member.displayName.toLowerCase().includes(lowerSearchTerm) ||
                (member.email && member.email.toLowerCase().includes(lowerSearchTerm)) // Optional: Search by email too
            );
        }

        // Apply sorting
        if (sortOrder === 'az') {
            membersToProcess.sort((a, b) => a.displayName.localeCompare(b.displayName, 'vi', { sensitivity: 'base' }));
        } else if (sortOrder === 'za') {
            membersToProcess.sort((a, b) => b.displayName.localeCompare(a.displayName, 'vi', { sensitivity: 'base' }));
        }
        // 'none' sort order keeps the current order (after filtering)

        return membersToProcess;
    }, [members, tab, searchTerm, sortOrder]); // <-- Added dependencies

    const handleRemoveMember = (memberId: string, memberEmail: string | null) => {
        const memberIdentifier = memberEmail || `ID ${memberId.substring(0,6)}...`;
        if (confirm(`Bạn có chắc chắn muốn xóa thành viên ${memberIdentifier}? Hành động này không thể hoàn tác.`)) {
            const deletePromise = new Promise<void>(async (resolve, reject) => {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    reject(new Error("Missing authentication token"));
                    return;
                }
                try {
                    const response = await fetch(`http://localhost:8080/identity/users/${memberId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) {
                        let errorMsg = `Lỗi ${response.status}`;
                        try {
                            const errData = await response.json();
                            errorMsg = errData.message || errorMsg;
                        } catch (_) { /* Ignore if response is not JSON */ }
                        // Handle specific errors if needed (e.g., 404 Not Found)
                        throw new Error(errorMsg);
                    }
                    // No need to parse JSON for successful DELETE usually
                    resolve();
                } catch (error) {
                    console.error("Error deleting member:", error);
                    reject(error);
                }
            });

            toast.promise(deletePromise, {
                loading: `Đang xóa thành viên ${memberIdentifier}...`,
                success: () => {
                    // Update local state optimistically or after refetch
                    setMembers((prev) => prev.filter((m) => m.id !== memberId));
                    return `Xóa thành viên ${memberIdentifier} thành công!`;
                },
                error: (err) => `Xóa thất bại: ${err.message || 'Lỗi không xác định'}`,
            });
        }
    };

    return (
        <div className="flex flex-col h-full p-4 md:p-5 bg-gray-50"> {/* Added padding and bg */}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0 gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-pink-600">Thành viên câu lạc bộ</h2>
                {/* Invite Button for Admin */}
                 {userRole === "ADMIN" && (
                     <button onClick={() => alert("Mở modal mời thành viên")} // TODO: Implement actual invite logic
                             className="bg-purple-500 text-white px-4 py-1.5 rounded-md hover:bg-purple-600 transition-colors duration-200 text-sm font-medium shadow-sm flex-shrink-0 w-full sm:w-auto">
                         ➕ Mời thành viên
                     </button>
                 )}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
                <button onClick={() => setTab("all")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "all" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500 hover:text-gray-700" }`}>
                    👥 Tất cả ({members.length}) {/* Show total members before filtering */}
                </button>
                <button onClick={() => setTab("admin")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "admin" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700" }`}>
                    👑 QTV ({members.filter(m => m.roleName === 'ADMIN').length})
                </button>
                <button onClick={() => setTab("core")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "core" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700" }`}>
                    💪 Nòng cốt ({members.filter(m => m.roleName === 'USER').length})
                </button>
                <button onClick={() => setTab("casual")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "casual" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700" }`}>
                    🧍‍♂️ Vãng lai ({members.filter(m => m.roleName === 'GUEST').length})
                </button>
            </div>

             {/* Search and Sort Controls */}
             <div className="flex flex-col sm:flex-row gap-4 mb-5 flex-shrink-0">
                 {/* Search Input */}
                 <div className="relative flex-grow">
                     <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     </span>
                     <input
                         type="text"
                         placeholder="Tìm theo tên hoặc email..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full p-2 pl-10 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
                         aria-label="Tìm kiếm thành viên"
                     />
                 </div>
                 {/* Sort Select */}
                 <div className="flex-shrink-0">
                     <select
                         value={sortOrder}
                         onChange={(e) => setSortOrder(e.target.value as 'az' | 'za' | 'none')}
                         className="w-full sm:w-auto p-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 h-full shadow-sm bg-white appearance-none pr-8" // Added bg-white and appearance-none
                         aria-label="Sắp xếp thành viên"
                     >
                         <option value="none">Sắp xếp: Mặc định</option>
                         <option value="az">Sắp xếp: Tên A-Z</option>
                         <option value="za">Sắp xếp: Tên Z-A</option>
                     </select>
                 </div>
             </div>


            {/* Member List */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"> {/* Added scrollbar styles */}
                {loading ? (
                    <p className="text-center text-gray-500 py-4">Đang tải danh sách thành viên...</p>
                ) : error ? (
                     <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">⚠️ {error}</p>
                ) : processedMembers.length > 0 ? (
                    processedMembers.map((member) => (
                        <div key={member.id} className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex justify-between items-center hover:bg-gray-50 transition-colors duration-150">
                            <div className="flex items-center gap-3 overflow-hidden mr-2">
                                <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=random&color=fff&size=128`} // Improved ui-avatars URL
                                     alt={`Avatar của ${member.displayName}`}
                                     className="w-10 h-10 rounded-full object-cover border flex-shrink-0 bg-gray-200"/> {/* Added bg-gray-200 as fallback */}
                                <div className="overflow-hidden">
                                    <h3 className="font-semibold text-sm md:text-base text-gray-800 truncate" title={member.displayName}>{member.displayName}</h3>
                                    {member.email && <p className="text-gray-600 text-xs md:text-sm truncate" title={member.email}>📧 {member.email}</p>}
                                    <p className={`text-xs md:text-sm font-medium ${
                                        member.roleName === 'ADMIN' ? 'text-red-600' :
                                        member.roleName === 'USER' ? 'text-green-600' :
                                        member.roleName === 'GUEST' ? 'text-blue-600' : 'text-gray-500'
                                    }`}>
                                        {roleDisplayMap[member.roleName] || member.roleName}
                                    </p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 items-center flex-shrink-0">
                                {userRole === "ADMIN" && member.email !== currentUserEmail && (
                                    <button onClick={() => handleRemoveMember(member.id, member.email)}
                                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100 transition-colors duration-150"
                                            title={`Xóa ${member.displayName}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span className="sr-only">Xóa thành viên</span> {/* Accessibility */}
                                    </button>
                                )}
                                {/* TODO: Add other actions like 'Promote/Demote' or 'View Profile' if needed */}
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-500 italic py-4">
                        {searchTerm ? "Không tìm thấy thành viên nào khớp." : "Không có thành viên nào trong mục này."}
                    </p>
                )}
            </div>

        </div>
    );
};

export default MembersTabContent;