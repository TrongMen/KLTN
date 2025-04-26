"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast"; // Keep Toaster in UserHome
import { User as MainUserType } from "../homeuser"; // Import User type from UserHome

// Interfaces (Copied/Adapted from ModalMember)
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
  roleName: string; // API Role Name (ADMIN, USER, GUEST, UNKNOWN)
  email: string | null;
  avatar: string | null;
}

interface MembersTabContentProps {
  user: MainUserType | null; // User info from UserHome
  userRole: "ADMIN" | "USER" | "GUEST" | string; // Role of the logged-in user
  currentUserEmail: string | null; // Email of the logged-in user
}

// Role display mapping
const roleDisplayMap: Record<string, string> = {
  ADMIN: "Quản trị viên",
  GUEST: "Thành viên vãng lai",
  USER: "Thành viên nòng cốt",
  UNKNOWN: "Chưa xác định",
};

const MembersTabContent: React.FC<MembersTabContentProps> = ({
  user, // Renamed from currentUser in original modal props for clarity
  userRole,
  currentUserEmail,
}) => {
  const [tab, setTab] = useState<"all" | "admin" | "core" | "casual">("all");
  const [members, setMembers] = useState<DisplayMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("authToken");

    if (!token) {
      setError("Không tìm thấy token xác thực.");
      toast.error("Yêu cầu xác thực. Vui lòng đăng nhập lại.");
      setLoading(false);
      // Don't call onClose, just show error state
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
              localStorage.removeItem("authToken"); // Optional: Clear bad token
              // Maybe trigger logout via UserHome? For now, just show error.
          } else {
              throw new Error(`Lỗi ${response.status}: Không thể tải danh sách thành viên.`);
          }
          setLoading(false); // Ensure loading stops on error
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
  }, []); // Empty dependency array, fetches once on mount

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
      return members.filter((member) => {
        if (tab === "all") return true;
        if (tab === "admin") return member.roleName === "ADMIN";
        if (tab === "core") return member.roleName === "USER";
        if (tab === "casual") return member.roleName === "GUEST";
        return false;
      });
  }, [members, tab]);


  const handleRemoveMember = (memberId: string, memberEmail: string | null) => {
     // Placeholder - replace with actual API call and error handling
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên ${memberEmail || memberId}? Hành động này có thể không thể hoàn tác.`)) {
       console.log("TODO: Gọi API xóa thành viên với ID:", memberId);
       const deletePromise = new Promise<void>(async (resolve, reject) => {
           const token = localStorage.getItem('authToken');
           if (!token) {
               reject(new Error("Missing token"));
               return;
           }
           try {
                // Replace with your actual DELETE endpoint and method
               const response = await fetch(`http://localhost:8080/identity/users/${memberId}`, { // Example endpoint
                   method: 'DELETE',
                   headers: { 'Authorization': `Bearer ${token}` }
               });
               if (!response.ok) {
                   let errorMsg = `Error ${response.status}`;
                   try {
                       const errData = await response.json();
                       errorMsg = errData.message || errorMsg;
                   } catch (_) {}
                   throw new Error(errorMsg);
               }
               // Assuming success if response is ok
               resolve();
           } catch (error) {
               reject(error);
           }
       });

       toast.promise(deletePromise, {
         loading: 'Đang xóa thành viên...',
         success: () => {
           setMembers((prev) => prev.filter((m) => m.id !== memberId)); // Update UI on success
           return 'Xóa thành viên thành công!';
         },
         error: (err) => `Xóa thất bại: ${err.toString()}`,
       });
     }
  };

  return (
    <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b flex-shrink-0">
             <h2 className="text-xl md:text-2xl font-bold text-pink-600">Thành viên câu lạc bộ</h2>
             {/* Optional: Refresh button? */}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-4 mb-4 border-b flex-shrink-0">
             <button onClick={() => setTab("all")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "all" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500 hover:text-gray-700" }`}>
                👥 Tất cả ({members.length})
             </button>
             <button onClick={() => setTab("admin")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "admin" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700" }`}>
                👑 Quản trị viên ({members.filter(m => m.roleName === 'ADMIN').length})
             </button>
             <button onClick={() => setTab("core")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "core" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700" }`}>
                 💪 Thành viên nòng cốt ({members.filter(m => m.roleName === 'USER').length})
             </button>
             <button onClick={() => setTab("casual")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "casual" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700" }`}>
                 🧍‍♂️ Thành viên vãng lai ({members.filter(m => m.roleName === 'GUEST').length})
             </button>
        </div>

        {/* Invite Button (Admin Only) */}
        {userRole === "ADMIN" && (
          <div className="mb-4 flex-shrink-0">
            <button onClick={() => alert("Mở modal mời thành viên")} // TODO: Implement actual invite logic
                    className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors duration-200 text-sm font-medium">
                ➕ Mời thành viên
            </button>
          </div>
        )}

        {/* Member List */}
        <div className="space-y-3 overflow-y-auto flex-1 mb-1 pr-2">
            {loading ? (
                <p className="text-center text-gray-500 py-4">Đang tải danh sách thành viên...</p>
            ) : error ? (
                 <p className="text-center text-red-500 py-4">⚠️ {error}</p>
            ) : filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                   <div key={member.id} className="p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors duration-150">
                      <div className="flex items-center gap-3 overflow-hidden mr-2">
                          <img src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=random`}
                               alt={`Avatar của ${member.displayName}`}
                               className="w-10 h-10 rounded-full object-cover border flex-shrink-0"/>
                          <div className="overflow-hidden">
                              <h3 className="font-semibold text-sm md:text-base text-gray-800 truncate" title={member.displayName}>{member.displayName}</h3>
                              {member.email && <p className="text-gray-600 text-xs md:text-sm truncate" title={member.email}>📧 {member.email}</p>}
                              <p className="text-xs md:text-sm text-indigo-600 font-medium">{roleDisplayMap[member.roleName] || member.roleName}</p>
                          </div>
                      </div>
                       {/* Action Buttons */}
                      <div className="flex gap-2 items-center flex-shrink-0">
                          {/* Remove Button (Admin sees, cannot remove self) */}
                          {userRole === "ADMIN" && member.email !== currentUserEmail && (
                             <button onClick={() => handleRemoveMember(member.id, member.email)}
                                     className="text-red-500 hover:text-red-700 text-xs p-1 rounded hover:bg-red-100 transition-colors duration-150"
                                     title={`Xóa ${member.displayName}`}>
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                 </svg>
                             </button>
                          )}
                           {/* TODO: Add other actions like 'Promote', 'Demote' if applicable */}
                      </div>
                   </div>
                ))
            ) : (
                <p className="text-center text-gray-400 italic py-4">Không có thành viên nào trong mục này.</p>
            )}
        </div>
         {/* Footer can be removed as Close is handled by UserHome tabs */}
         {/* <div className="flex justify-end flex-shrink-0 border-t pt-4"> ... </div> */}
    </div>
  );
};

export default MembersTabContent;