"use client";

import { toast } from "react-hot-toast"; // Sử dụng react-hot-toast

// --- Types --- (Giữ nguyên hoặc điều chỉnh cho phù hợp API của bạn)
type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
};

type EventMember = {
  userId: string;
  roleId: string;
  positionId: string;
  
};

type Event = {
  id: string;
  name: string;
  time: string;
  location: string;
  createdBy: string; // Có thể là ID hoặc object chứa thông tin người tạo
  purpose: string;
  content: string;
  image?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED"; // Giả sử có các trạng thái này
  organizers: EventMember[];
  participants: EventMember[];
  permissions: string[];
};


type Props = {
  events: Event[];
  setEvents: (events: Event[]) => void;
  users: ApiUser[]; 
  currentUser?: ApiUser; 
  setEditingEvent: (event: Event | null) => void;
  // setImagePreview: (url: string | undefined) => void; // Bỏ nếu không dùng image preview khi edit
};


const getUserFullName = (userId: string, allUsers: ApiUser[]): string => {
  const userFound = allUsers.find((u) => u.id === userId);
  if (!userFound) return `(ID: ${userId.substring(0, 8)}...)`; 
  const fullName = `${userFound.lastName || ""} ${userFound.firstName || ""}`.trim();
  return fullName || userFound.username || `(ID: ${userId.substring(0, 8)}...)`;
};

const getMemberNames = (members: EventMember[], allUsers: ApiUser[]): string => {
  if (!members || members.length === 0) {
    return "Chưa có"; 
  }
  const names = members
    .map((member) => getUserFullName(member.userId, allUsers))
    .filter(Boolean);

  const MAX_NAMES = 3;
  if (names.length > MAX_NAMES) {
    return `${names.slice(0, MAX_NAMES).join(", ")} và ${names.length - MAX_NAMES} người khác`;
  }
  return names.join(", ") || "Chưa có";
};


export default function EventList({
  events,
  setEvents,
  users, 
  currentUser,
  setEditingEvent,
}: Props) {

 
  const handleDeleteEvent = async (eventId: string) => {
    const eventToDelete = events.find((event) => event.id === eventId);
    if (!eventToDelete) return;

    toast(
      (t) => (
        <div className="flex flex-col space-y-2">
          <div className="font-medium">Xác nhận xóa sự kiện</div>
          <p>
            Bạn có chắc chắn muốn xóa sự kiện{" "}
            <span className="font-semibold">"{eventToDelete.name}"</span>?
          </p>
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id); 
                const loadingToastId = toast.loading("Đang xóa sự kiện...");
                try {
                  const token = localStorage.getItem("authToken");
                  const response = await fetch(
                    `http://localhost:8080/identity/api/events/${eventId}`,
                    {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    }
                  );

                  if (!response.ok) {
                     // Thử đọc lỗi từ server nếu có
                     let errorMsg = "Xóa sự kiện thất bại";
                     try {
                       const errorData = await response.json();
                       errorMsg = errorData.message || errorMsg;
                     } catch (_) {}
                    throw new Error(errorMsg);
                  }

                  // Cập nhật state sau khi xóa thành công
                  const updatedEvents = events.filter((event) => event.id !== eventId);
                  setEvents(updatedEvents);
                  toast.success(`Đã xóa sự kiện "${eventToDelete.name}".`, { id: loadingToastId });

                } catch (error: any) {
                  toast.error(error.message || "Lỗi khi xóa sự kiện", { id: loadingToastId });
                  console.error("Delete event error:", error);
                }
              }}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Xóa
            </button>
          </div>
        </div>
      ),
      { duration: Infinity } // Giữ toast xác nhận mở vô hạn cho đến khi người dùng tương tác
    );
  };

  // Hàm xử lý duyệt/từ chối sự kiện
  const handleApproveEvent = async (eventId: string, approved: boolean) => {
    const status = approved ? "APPROVED" : "REJECTED";
    const actionText = approved ? "duyệt" : "từ chối";
    const loadingToastId = toast.loading(`Đang ${actionText} sự kiện...`);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:8080/identity/api/events/${eventId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }), // Gửi trạng thái mới
        }
      );

      if (!response.ok) {
        let errorMsg = `Cập nhật trạng thái thất bại`;
         try {
           const errorData = await response.json();
           errorMsg = errorData.message || errorMsg;
         } catch (_) {}
        throw new Error(errorMsg);
      }

      // Cập nhật trạng thái trong state
      const updatedEvents = events.map((event) =>
        event.id === eventId ? { ...event, status } : event
      );
      setEvents(updatedEvents);
      toast.success(`Sự kiện đã được ${actionText} thành công!`, { id: loadingToastId });

    } catch (error: any) {
      toast.error(error.message || `Lỗi khi ${actionText} sự kiện`, { id: loadingToastId });
      console.error("Approve event error:", error);
    }
  };

  
  const handleEditEvent = (eventToEdit: Event) => {
    setEditingEvent(eventToEdit); // Gửi toàn bộ event object lên cha
    window.scrollTo({ top: 0, behavior: "smooth" }); // Cuộn lên đầu trang để thấy form edit
  };

  
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        📅 Danh sách Sự kiện ({events.length})
      </h2>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-2">Chưa có sự kiện nào được tạo.</p>
          <p className="text-gray-400 text-sm">
            Hãy thêm sự kiện đầu tiên của bạn bằng form ở trên!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <article
              key={event.id}
              className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col" // Thêm flex flex-col
            >
              

              <div className="p-4 flex-grow flex flex-col justify-between"> {/* Thêm flex-grow và flex */}
                <div> {/* Phần nội dung chính */}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 flex-1 mr-2">
                      {event.name}
                    </h3>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${
                        event.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : event.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {event.status === "APPROVED" ? "Đã duyệt"
                       : event.status === "REJECTED" ? "Đã từ chối"
                       : "Chờ duyệt"}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p className="flex items-center">
                      <span className="mr-2 w-4 text-center">🗓</span>
                      {event.time
                        ? new Date(event.time).toLocaleString("vi-VN", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })
                        : "Chưa có thời gian"}
                    </p>
                    <p className="flex items-center">
                      <span className="mr-2 w-4 text-center">📍</span>
                      {event.location || "Chưa có địa điểm"}
                    </p>
                     <p className="flex items-center" title={getMemberNames(event.organizers, users)}>
                       <span className="mr-2 w-4 text-center">👥</span>
                       <span className="truncate">BTC: {getMemberNames(event.organizers, users)}</span>
                    </p>
                    <p className="flex items-center" title={getMemberNames(event.participants, users)}>
                       <span className="mr-2 w-4 text-center">👤</span>
                       <span className="truncate">Tham dự: {getMemberNames(event.participants, users)}</span>
                     </p>
                    <p className="flex items-center">
                      <span className="mr-2 w-4 text-center">🔒</span>
                      Quyền: {event.permissions?.join(", ") || "Không giới hạn"}
                    </p>
                  </div>

                  <p className="text-gray-700 text-sm mb-2 line-clamp-2" title={event.purpose}>
                    <span className="font-medium">Mục đích:</span> {event.purpose}
                  </p>
                  <p className="text-gray-700 text-sm mb-4 line-clamp-3" title={event.content}>
                    <span className="font-medium">Nội dung:</span> {event.content}
                  </p>
                </div>

                 {/* Phần nút hành động */}
                <div className="flex justify-between gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="flex-1 py-1 bg-blue-50 text-blue-600 text-sm rounded hover:bg-blue-100 transition-colors cursor-pointer text-center"
                  >
                    Sửa
                  </button>

                  {/* Chỉ admin mới thấy nút Duyệt/Từ chối và chỉ khi trạng thái là PENDING */}
                  {currentUser?.role === "ADMIN" && event.status === "PENDING" && ( // Giả sử user có trường 'role'
                    <>
                      <button
                        onClick={() => handleApproveEvent(event.id, true)}
                        className="flex-1 py-1 bg-green-50 text-green-600 text-sm rounded hover:bg-green-100 transition-colors cursor-pointer text-center"
                      >
                        Duyệt
                      </button>
                       <button
                        onClick={() => handleApproveEvent(event.id, false)}
                         className="flex-1 py-1 bg-orange-50 text-orange-600 text-sm rounded hover:bg-orange-100 transition-colors cursor-pointer text-center"
                      >
                         Từ chối
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="flex-1 py-1 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors cursor-pointer text-center"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}