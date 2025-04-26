"use client";
import React, { useState, useEffect } from "react";
import { toast, Toaster } from "react-hot-toast"; // Thêm Toaster để báo lỗi

// Interface cho dữ liệu gốc từ API
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

// Interface cho dữ liệu đã được xử lý để hiển thị
interface DisplayMember {
  id: string;
  displayName: string; // Tên hiển thị (kết hợp first/last hoặc username)
  roleName: string; // Tên vai trò gốc từ API (ADMIN, USER, GUEST)
  email: string | null;
  avatar: string | null;
}

interface ModalMemberProps {
  onClose: () => void;
  userRole: "ADMIN" | "USER" | "GUEST" | string; // Nên truyền role gốc từ API
  currentUserEmail: string | null; // Email của người dùng đang xem modal
}

// Ánh xạ tên vai trò từ API sang tên hiển thị tiếng Việt
const roleDisplayMap: Record<string, string> = {
  ADMIN: "Quản trị viên",
  GUEST: "Thành viên vãng lai",
  USER: "Thành viên nòng cốt",
  UNKNOWN: "Chưa xác định", // Xử lý trường hợp không có role
};

export default function ModalMember({
  onClose,
  userRole,
  currentUserEmail,
}: ModalMemberProps) {
  // Cập nhật kiểu cho tab để bao gồm 'admin'
  const [tab, setTab] = useState<"all" | "admin" | "core" | "casual">("all");
  // const [isMember, setIsMember] = useState<boolean>(false); // Tạm ẩn nếu không dùng
  const [members, setMembers] = useState<DisplayMember[]>([]); // Sử dụng interface mới
  const [loading, setLoading] = useState<boolean>(true); // Bắt đầu với trạng thái loading
  const [error, setError] = useState<string | null>(null); // State để lưu lỗi

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError(null); // Reset lỗi
      const token = localStorage.getItem("authToken");

      if (!token) {
        setError("Không tìm thấy token xác thực. Vui lòng đăng nhập lại.");
        toast.error("Yêu cầu xác thực. Vui lòng đăng nhập lại.");
        setLoading(false);
        // Có thể gọi onClose() hoặc chuyển hướng về trang login ở đây
        onClose(); // Ví dụ: đóng modal nếu không có token
        return;
      }

      try {
        const response = await fetch("http://localhost:8080/identity/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                 setError("Phiên đăng nhập hết hạn hoặc không có quyền truy cập.");
                 toast.error("Phiên đăng nhập hết hạn hoặc không có quyền truy cập.");
                 localStorage.removeItem("authToken"); // Xóa token cũ
                 onClose(); // Đóng modal
            } else {
                 throw new Error(`Lỗi ${response.status}: Không thể tải danh sách thành viên.`);
            }
            return; // Dừng thực thi nếu response không OK
        }

        const data = await response.json();

        if (data.code === 1000 && Array.isArray(data.result)) {
          // Xử lý và chuyển đổi dữ liệu
          const transformedMembers = data.result.map((user: ApiUser): DisplayMember => {
            // Lấy role đầu tiên, nếu không có -> UNKNOWN
            const roleName = user.roles?.[0]?.name?.toUpperCase() || "UNKNOWN";

            // Tạo tên hiển thị: LastName FirstName, nếu không có thì dùng Username
            let displayName = [user.lastName, user.firstName]
              .filter(Boolean) // Lọc bỏ giá trị null/undefined/""
              .join(" ")
              .trim(); // Nối và xóa khoảng trắng thừa

            if (!displayName) {
              displayName = user.username || `User (${user.id.substring(0, 6)})`; // Fallback là username hoặc ID rút gọn
            }

            return {
              id: user.id,
              displayName: displayName,
              roleName: roleName, // Lưu role gốc để lọc
              email: user.email,
              avatar: user.avatar,
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
    };

    fetchMembers();
  }, [onClose]); // Thêm onClose vào dependency array nếu nó có thể thay đổi

  // Logic lọc thành viên dựa trên tab đang chọn
  const filteredMembers = members.filter((member) => {
    if (tab === "all") return true;
    if (tab === "admin") return member.roleName === "ADMIN";
    if (tab === "core") return member.roleName === "USER";
    if (tab === "casual") return member.roleName === "GUEST";
    return false;
  });

  // Hàm xử lý xóa thành viên (cần gọi API thực tế)
  const handleRemoveMember = (memberId: string, memberEmail: string | null) => {
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên ${memberEmail || memberId}?`)) {
       console.log("TODO: Gọi API xóa thành viên với ID:", memberId);
       toast.promise(
           // Promise gọi API xóa ở đây
           new Promise(resolve => setTimeout(resolve, 1000)), // Giả lập gọi API
           {
             loading: 'Đang xóa thành viên...',
             success: () => {
               // Cập nhật lại state sau khi xóa thành công từ API
               setMembers((prev) => prev.filter((m) => m.id !== memberId));
               return 'Xóa thành viên thành công!';
             },
             error: (err) => `Xóa thất bại: ${err.toString()}`,
           }
       );
      // TODO: Gọi API backend để xóa member với memberId
      // Sau khi API thành công thì cập nhật state:
      // setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  // --- Tạm ẩn logic Join/Leave nếu không cần ---
  // const handleLeaveGroup = () => { /* ... */ };
  // const handleJoinGroup = () => { /* ... */ };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40 p-4">
      <Toaster position="top-center" /> {/* Để hiển thị toast */}
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-purple-600">Thành viên câu lạc bộ</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-2xl font-bold cursor-pointer leading-none"
            title="Đóng"
          >
            &times; {/* Sử dụng dấu X chuẩn hơn */}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b flex-shrink-0">
          <button
            onClick={() => setTab("all")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "all" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            👥 Tất cả ({members.length}) {/* Hiển thị tổng số */}
          </button>
          {/* Tab Quản trị viên */}
          <button
            onClick={() => setTab("admin")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "admin" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            👑 Quản trị viên ({members.filter(m => m.roleName === 'ADMIN').length})
          </button>
          {/* Tab Thành viên nòng cốt */}
          <button
            onClick={() => setTab("core")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "core" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            💪 Thành viên nòng cốt ({members.filter(m => m.roleName === 'USER').length})
          </button>
          {/* Tab Thành viên vãng lai */}
          <button
            onClick={() => setTab("casual")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "casual" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            🧍‍♂️ Thành viên vãng lai ({members.filter(m => m.roleName === 'GUEST').length})
          </button>
        </div>

        {/* Nút mời thành viên (chỉ admin thấy) */}
        {userRole === "ADMIN" && (
          <div className="mb-4 flex-shrink-0">
            <button
              onClick={() => alert("Mở modal mời thành viên")} // TODO: Implement invite modal logic
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 transition-colors duration-200"
            >
              ➕ Mời thành viên
            </button>
          </div>
        )}

        {/* Danh sách thành viên */}
        <div className="space-y-3 overflow-y-auto flex-1 mb-6 pr-2"> {/* Thêm pr-2 để thanh cuộn không che nội dung */}
          {loading ? (
            <p className="text-center text-gray-500 py-4">Đang tải danh sách thành viên...</p>
          ) : error ? (
             <p className="text-center text-red-500 py-4">⚠️ {error}</p> // Hiển thị lỗi
          ) : filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div
                key={member.id} // Sử dụng ID duy nhất làm key
                className="p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors duration-150"
              >
                <div className="flex items-center gap-3">
                   <img
                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.displayName)}&background=random`} // Fallback avatar
                        alt={`Avatar của ${member.displayName}`}
                        className="w-10 h-10 rounded-full object-cover border"
                    />
                  <div>
                    {/* Sử dụng displayName */}
                    <h3 className="font-semibold text-base text-gray-800">{member.displayName}</h3>
                    {/* Hiển thị email nếu có */}
                    {member.email && <p className="text-gray-600 text-sm">📧 {member.email}</p>}
                    {/* Hiển thị vai trò đã được dịch */}
                    <p className="text-sm text-indigo-600 font-medium">
                      {roleDisplayMap[member.roleName] || member.roleName} {/* Fallback nếu không có trong map */}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 items-center flex-shrink-0">
                  {/* Nút xóa (Admin thấy, không xóa chính mình) */}
                  {userRole === "ADMIN" && member.email !== currentUserEmail && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.email)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium p-1 rounded hover:bg-red-100 transition-colors duration-150"
                      title={`Xóa ${member.displayName}`}
                    >
                      ❌ Xóa
                    </button>
                  )}

                  {/* --- Tạm ẩn nút Join/Leave ---
                  {userRole === "GUEST" && !isMember && ( ... )}
                  {userRole === "GUEST" && isMember && ( ... )}
                  */}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-400 italic py-4">Không có thành viên nào trong mục này.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 px-5 py-2 rounded-md font-medium transition-colors duration-200"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}