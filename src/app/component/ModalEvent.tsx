"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react"; // Thêm useCallback, useMemo nếu cần
import Link from "next/link";
// Bỏ useRouter nếu không dùng trong file này

interface EventType {
  id: string | number;
  name: string;
  time?: string;
  location?: string;
  content?: string; // Thêm content để hiển thị mô tả chi tiết
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  rejectionReason?: string;
  purpose?: string; // Thêm các trường có trong API response nếu cần
  createdBy?: string;
  createdAt?: string;
  // Thêm attendees, organizers nếu muốn hiển thị
}

export default function ModalEvent({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"approved" | "pending" | "rejected">("approved");
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [viewingEventDetails, setViewingEventDetails] = useState<EventType | null>(null); // State mới

  const fetchEvents = useCallback(async () => { // Bọc fetch trong useCallback
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Không có token xác thực. Vui lòng đăng nhập lại.");

      const userInfoRes = await fetch("http://localhost:8080/identity/users/myInfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userInfoRes.ok) {
          const errData = await userInfoRes.json().catch(() => ({}));
          throw new Error(errData.message || "Không thể lấy thông tin người dùng");
      }
      const userInfo = await userInfoRes.json();
      const userId = userInfo?.result?.id;
      if (!userId) throw new Error("Không tìm thấy ID người dùng");

      // Luôn dùng endpoint này để lấy sự kiện do user tạo/quản lý
      const eventsRes = await fetch(
        `http://localhost:8080/identity/api/events/creator/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!eventsRes.ok) {
          const errData = await eventsRes.json().catch(() => ({}));
          throw new Error(errData.message || "Không thể tải sự kiện");
      }
      const data = await eventsRes.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
          // Map lại để đảm bảo có đủ các trường, ví dụ content
          const formattedEvents = data.result.map((evt: any) => ({
              ...evt,
              description: evt.content // Gán content vào description nếu cần
          }));
          setEvents(formattedEvents);
      } else {
          // Nếu API /creator/{userId} trả về object user thay vì array event
          if (data.code === 1000 && !Array.isArray(data.result)) {
               console.warn("API /events/creator/ trả về object user, không phải danh sách event.");
               setEvents([]); // Không có sự kiện nào để hiển thị
          } else {
              throw new Error(data.message || "Cấu trúc dữ liệu sự kiện không hợp lệ");
          }
      }

    } catch (err: any) {
      console.error("Lỗi khi tải sự kiện của tôi:", err);
      setError(err.message || "Đã xảy ra lỗi khi tải sự kiện");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []); // Dependency rỗng vì không phụ thuộc state/props bên ngoài

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]); // Chạy khi fetchEvents thay đổi (chỉ 1 lần vì dùng useCallback)

  const filteredEvents = useMemo(() => events.filter((event) => { // Dùng useMemo để tối ưu
    const eventStatus = event.status?.toUpperCase();
    if (tab === "approved") return eventStatus === "APPROVED";
    if (tab === "pending") return eventStatus === "PENDING";
    if (tab === "rejected") return eventStatus === "REJECTED";
    return false;
  }), [events, tab]); // Tính toán lại khi events hoặc tab thay đổi

  // --- Hàm render chi tiết sự kiện ---
  const renderEventDetails = (event: EventType) => {
    return (
      <div className="p-1 flex-grow overflow-y-auto mb-4 pr-2"> {/* Thêm mb-4 */}
        <button
          onClick={() => setViewingEventDetails(null)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Quay lại danh sách
        </button>
        <h3 className="text-xl font-bold text-gray-800 mb-4">{event.name}</h3>
        <div className="space-y-2 text-sm text-gray-700">
            {event.status && (
                <p><strong className="font-medium text-gray-900 w-28 inline-block">Trạng thái:</strong>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                        event.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                        event.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        event.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                        {event.status}
                    </span>
                </p>
            )}
            {event.time && <p><strong className="font-medium text-gray-900 w-28 inline-block">Thời gian:</strong> {new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' })}</p>}
            {event.location && <p><strong className="font-medium text-gray-900 w-28 inline-block">Địa điểm:</strong> {event.location}</p>}
            {event.purpose && <p><strong className="font-medium text-gray-900 w-28 inline-block">Mục đích:</strong> {event.purpose}</p>}
            {event.content && <p><strong className="font-medium text-gray-900 w-28 inline-block align-top">Nội dung:</strong> <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-7rem)]">{event.content}</span></p>}
            {event.status === 'REJECTED' && event.rejectionReason && (
                <p className="text-red-600"><strong className="font-medium text-red-800 w-28 inline-block">Lý do từ chối:</strong> {event.rejectionReason}</p>
            )}
             {event.createdAt && <p><strong className="font-medium text-gray-900 w-28 inline-block">Ngày tạo:</strong> {new Date(event.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>}
             {/* Thêm hiển thị attendees/organizers nếu cần */}
        </div>
        {/* Thêm nút hành động (Edit/Delete) nếu cần */}
        {/* <div className="mt-4 pt-4 border-t flex justify-end gap-2">
            <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 text-xs rounded">Chỉnh sửa</button>
            <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-xs rounded">Xóa</button>
        </div> */}
      </div>
    );
  };
  // --- Kết thúc hàm render chi tiết ---

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-5 md:p-6 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-blue-600">
              {viewingEventDetails ? 'Chi tiết sự kiện' : 'Sự kiện của tôi'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold cursor-pointer"
            title="Đóng"
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        {viewingEventDetails ? (
             renderEventDetails(viewingEventDetails)
        ) : (
            <>
                <div className="flex flex-wrap gap-4 mb-4 border-b flex-shrink-0">
                  <button onClick={() => setTab("approved")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "approved" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700" }`}> ✅ Đã duyệt </button>
                  <button onClick={() => setTab("pending")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "pending" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700" }`}> ⏳ Chờ duyệt </button>
                  <button onClick={() => setTab("rejected")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "rejected" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700" }`}> ❌ Từ chối </button>
                </div>

                <div className="space-y-3 overflow-y-auto flex-grow mb-6 pr-2">
                  {loading ? (
                    <p className="text-gray-500 italic text-center py-4">Đang tải...</p>
                  ) : error ? (
                    <p className="text-red-500 italic text-center py-4">{error}</p>
                  ) : filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => (
                      <div
                        key={event.id}
                        className="p-3 md:p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 space-y-1 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setViewingEventDetails(event)} 
                      >
                        <h3 className="font-semibold text-md md:text-lg text-gray-800">{event.name}</h3>
                        {event.time && <p className="text-gray-600 text-sm">📅 {new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>}
                        {event.location && <p className="text-gray-600 text-sm">📍 {event.location}</p>}
                        {tab === "rejected" && event.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1 pt-1 border-t border-red-100">
                            <span className="font-medium">Lý do từ chối:</span> {event.rejectionReason}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 italic text-center py-4">Không có sự kiện nào trong mục này.</p>
                  )}
                </div>
            </>
        )}

         
        {!viewingEventDetails && (
            <div className="flex justify-between items-center border-t pt-4 flex-shrink-0">
              <button
                onClick={onClose}
                className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm"
              >
                Đóng
              </button>
              <Link href="/event">
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md cursor-pointer text-sm">
                  + Tạo sự kiện mới
                </button>
              </Link>
            </div>
        )}
       
      </div>
    </div>
  );
}