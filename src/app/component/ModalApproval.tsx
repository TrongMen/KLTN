"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast, Toaster } from "react-hot-toast";


type EventType = {
  id: string;
  name: string;
  time?: string; 
  location?: string; 
  speaker?: string; 
  content?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string; 
  
};

// Props của component
interface ModalApprovalProps {
  onClose: () => void;
}

export default function ModalApproval({ onClose }: ModalApprovalProps) {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [pendingEvents, setPendingEvents] = useState<EventType[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<EventType[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<EventType[]>([]);
  const [isLoading, setIsLoading] = useState(true); // State quản lý loading
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<EventType | null>(null);
  const [rejectionReason, setRejectReason] = useState("");

  // --- Hàm Fetch Dữ Liệu ---
  const fetchEventsByStatus = useCallback(async (status: "PENDING" | "APPROVED" | "REJECTED") => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      throw new Error("Token không tồn tại."); // Ném lỗi để Promise.all bắt
    }
    const headers = { Authorization: `Bearer ${token}` };
    const url = `http://localhost:8080/identity/api/events/status?status=${status}`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      let errorMsg = `Failed to fetch ${status} events`;
      try { const errorData = await res.json(); errorMsg = errorData.message || errorMsg; } catch (_) {}
      throw new Error(errorMsg); // Ném lỗi
    }

    const data = await res.json();
    if (data.code === 1000 && Array.isArray(data.result)) {
      return data.result; // Trả về danh sách sự kiện
    } else {
      throw new Error(data.message || `Invalid data structure for ${status} events`);
    }
  }, []); // useCallback vì hàm này không thay đổi

  // Hàm fetch tất cả các trạng thái
  const fetchAllEventData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Gọi API song song cho cả 3 trạng thái
      const [pending, approved, rejected] = await Promise.all([
        fetchEventsByStatus("PENDING"),
        fetchEventsByStatus("APPROVED"),
        fetchEventsByStatus("REJECTED"),
      ]);

      // Cập nhật state sau khi tất cả thành công
      setPendingEvents(pending);
      setApprovedEvents(approved);
      setRejectedEvents(rejected);

    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast.error(`Lỗi tải danh sách sự kiện: ${error.message}`);
      // Đặt lại danh sách nếu lỗi?
      setPendingEvents([]);
      setApprovedEvents([]);
      setRejectedEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchEventsByStatus]); // Phụ thuộc vào fetchEventsByStatus

  // Gọi fetchAllEventData khi component mount
  useEffect(() => {
    fetchAllEventData();
  }, [fetchAllEventData]);

  // --- Hàm Xử Lý Approve/Reject ---

  // Hàm xử lý Phê duyệt (ĐÃ CẬP NHẬT API)
  const handleApprove = async (event: EventType) => {
    const loadingToastId = toast.loading("Đang phê duyệt...");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Token không tồn tại.");

      // **Sử dụng URL mới cho approve**
      const url = `http://localhost:8080/identity/api/events/${event.id}/approve`;

      const res = await fetch(url, {
        method: "PUT", // Method là PUT
        headers: {
          Authorization: `Bearer ${token}`,
          // Không cần 'Content-Type' vì không có body
        },
        // **Không có body cho approve**
      });

      if (!res.ok) {
        let errorMsg = "Phê duyệt thất bại";
         try {
            const errorData = await res.json();
            errorMsg = errorData.message || `Phê duyệt thất bại (Status: ${res.status})`;
         } catch (_) { errorMsg = `Phê duyệt thất bại (Status: ${res.status})`; }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      if (data.code === 1000) {
        toast.success("Đã phê duyệt sự kiện!", { id: loadingToastId });
        await fetchAllEventData(); // Tải lại dữ liệu
      } else {
        // Nếu API trả về code khác 1000 dù status là 2xx
        throw new Error(data.message || "Phê duyệt thành công nhưng có phản hồi không mong đợi.");
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi phê duyệt sự kiện", { id: loadingToastId });
      console.error("Approve status error:", error);
    }
  };

  // Hàm mở modal reject (giữ nguyên)
  const openRejectModal = (event: EventType) => {
    setCurrentEvent(event);
    setShowRejectModal(true);
    setRejectReason(""); // Reset lý do khi mở modal
  };

  // Hàm xử lý Từ chối (ĐÃ CẬP NHẬT API)
  const handleReject = async () => {
    if (!currentEvent) return;
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      toast.error("Vui lòng nhập lý do từ chối!");
      return;
    }

    const loadingToastId = toast.loading("Đang từ chối...");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Token không tồn tại.");

      // **Sử dụng URL mới cho reject với reason trong query param**
      const url = `http://localhost:8080/identity/api/events/${currentEvent.id}/reject?reason=${encodeURIComponent(trimmedReason)}`;

      const res = await fetch(url, {
        method: "PUT", // Method là PUT
        headers: {
          Authorization: `Bearer ${token}`,
           // Không cần 'Content-Type' vì không có body
        },
         // **Không có body cho reject**
      });

       if (!res.ok) {
        let errorMsg = "Từ chối thất bại";
         try {
            const errorData = await res.json();
            errorMsg = errorData.message || `Từ chối thất bại (Status: ${res.status})`;
         } catch (_) { errorMsg = `Từ chối thất bại (Status: ${res.status})`; }
        throw new Error(errorMsg);
      }

      const data = await res.json();

      if (data.code === 1000) {
        toast.success(`Đã từ chối sự kiện. Lý do: ${trimmedReason}`, { id: loadingToastId });
        setShowRejectModal(false);
        setCurrentEvent(null);
        setRejectReason("");
        await fetchAllEventData(); // Tải lại dữ liệu
      } else {
         // Nếu API trả về code khác 1000 dù status là 2xx
        throw new Error(data.message || "Từ chối thành công nhưng có phản hồi không mong đợi.");
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi từ chối sự kiện", { id: loadingToastId });
      console.error("Reject status error:", error);
    }
  };

 
  const renderEventList = (events: EventType[], showActions = false) => {
    if (isLoading) {
       return <p className="text-center text-gray-600 py-4">Đang tải sự kiện...</p>;
    }
    if (!events || events.length === 0) {
      return <p className="text-center text-gray-600 py-4">Không có sự kiện nào.</p>;
    }

    return (
      <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
        
        {events.map((event) => (
          
          <div
            key={event.id}
            className="border p-4 rounded-lg shadow-sm bg-gray-50 hover:bg-gray-100 transition"
          >
            <h3 className="font-semibold text-lg mb-1">{event.name}</h3>
            {event.time && <p className="text-sm text-gray-600">📅 {new Date(event.time).toLocaleString('vi-VN')}</p>}
            {event.location && <p className="text-sm text-gray-600">📍 {event.location}</p>}
            {event.content && <p className="text-sm text-gray-600 mt-1 line-clamp-2">📜 {event.content}</p>}
            {tab === "rejected" && event.rejectionReason && (
              <p className="text-sm text-red-600 mt-2">
                <span className="font-medium">Lý do từ chối:</span> {event.rejectionReason}
              </p>
            )}
            {showActions && ( // Chỉ hiển thị nút approve/reject cho tab pending
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => openRejectModal(event)} className="px-3 cursor-pointer py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"> Từ chối </button>
                <button onClick={() => handleApprove(event)} className="px-3 cursor-pointer py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"> Phê duyệt </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
     
      <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <Toaster toastOptions={{ duration: 3500 }}  />
          <div className="bg-white w-full max-w-3xl p-5 md:p-6 rounded-xl shadow-xl relative">
             <h2 className="text-xl md:text-2xl font-bold mb-4 text-blue-700">Phê duyệt sự kiện</h2>
             <button onClick={onClose} className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-red-600 text-2xl" aria-label="Đóng"> &times; </button>
            
             <div className="flex flex-wrap justify-center mb-4 gap-2 md:gap-3">
                 <button onClick={() => setTab("pending")} className={`px-4 py-2 rounded-lg font-medium cursor-pointer text-sm md:text-base ${tab === "pending" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}> Đang chờ duyệt ({pendingEvents.length}) </button>
                 <button onClick={() => setTab("approved")} className={`px-4 py-2 rounded-lg font-medium cursor-pointer text-sm md:text-base ${tab === "approved" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}> Đã phê duyệt ({approvedEvents.length}) </button>
                 <button onClick={() => setTab("rejected")} className={`px-4 py-2 rounded-lg font-medium cursor-pointer text-sm md:text-base ${tab === "rejected" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}> Đã từ chối ({rejectedEvents.length}) </button>
             </div>
             <div className="border rounded-lg bg-white">
                 {tab === "pending" && renderEventList(pendingEvents, true)}
                 {tab === "approved" && renderEventList(approvedEvents)}
                 {tab === "rejected" && renderEventList(rejectedEvents)}
             </div>
          </div>
      </div>

      
      {showRejectModal && (
         <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[60] p-4">
              <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl relative">
                  <h3 className="text-lg md:text-xl font-bold mb-4 text-red-600">Nhập lý do từ chối</h3>
                  <button onClick={() => setShowRejectModal(false)} className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl" aria-label="Đóng"> &times; </button>
                  <div className="mb-4">
                      <label htmlFor="rejectionReason" className="block text-gray-700 mb-1 text-sm font-medium">Lý do từ chối <span className="text-red-500">*</span>:</label>
                      <textarea id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500" rows={4} placeholder="Nhập lý do..." />
                  </div>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"> Hủy </button>
                      <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"> Xác nhận từ chối </button>
                  </div>
              </div>
         </div>
      )}
       {/* Modal chi tiết có thể thêm lại ở đây nếu cần */}
       {/* {showDetailsModal && viewingEvent && ( ... )} */}
    </>
  );
}