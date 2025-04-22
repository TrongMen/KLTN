"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";


interface EventType {
  id: string | number; 
  name: string;
  time?: string;     
  location?: string;
  content?: string;   
  status: "APPROVED" | "PENDING" | "REJECTED" | string; 
  rejectionReason?: string; 
}

export default function ModalEvent({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"approved" | "pending" | "rejected">("approved");
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true); // Bắt đầu loading
      setError("");     // Reset lỗi
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Không có token xác thực. Vui lòng đăng nhập lại.");

        // Lấy thông tin user để lấy ID
        const userInfoRes = await fetch("http://localhost:8080/identity/users/myInfo", {
          headers: { Authorization: `Bearer ${token}` }, // Không cần Content-Type cho GET
        });
        if (!userInfoRes.ok) {
            const errData = await userInfoRes.json().catch(() => ({}));
            throw new Error(errData.message || "Không thể lấy thông tin người dùng");
        }
        const userInfo = await userInfoRes.json();
        const userId = userInfo?.result?.id;
        if (!userId) throw new Error("Không tìm thấy ID người dùng");

        // Lấy sự kiện theo creator ID
        const eventsRes = await fetch(
          `http://localhost:8080/identity/api/events/creator/${userId}`,
          { headers: { Authorization: `Bearer ${token}` } } // Không cần Content-Type cho GET
        );
        if (!eventsRes.ok) {
             const errData = await eventsRes.json().catch(() => ({}));
            throw new Error(errData.message || "Không thể tải sự kiện");
        }
        const data = await eventsRes.json();
         // Kiểm tra cấu trúc data trả về từ API get by creator
        if (data.code === 1000 && Array.isArray(data.result)) {
             setEvents(data.result); // Set events nếu thành công
        } else {
             throw new Error(data.message || "Cấu trúc dữ liệu sự kiện không hợp lệ");
        }

      } catch (err: any) {
        console.error("Lỗi khi tải sự kiện của tôi:", err);
        setError(err.message || "Đã xảy ra lỗi khi tải sự kiện");
        setEvents([]); // Đặt lại events nếu có lỗi
      } finally {
        setLoading(false); // Kết thúc loading
      }
    };

    fetchEvents();
  }, []); // Chỉ chạy 1 lần khi mount

  // Lọc sự kiện dựa trên tab đang chọn
  const filteredEvents = events.filter((event) => {
    // Chuyển status từ API về chữ hoa để so sánh an toàn hơn
    const eventStatus = event.status?.toUpperCase();
    if (tab === "approved") return eventStatus === "APPROVED";
    if (tab === "pending") return eventStatus === "PENDING";
    if (tab === "rejected") return eventStatus === "REJECTED";
    return false;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-5 md:p-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-blue-600">Sự kiện của tôi</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold cursor-pointer"
            title="Đóng"
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-4 mb-4 border-b flex-shrink-0">
           <button onClick={() => setTab("approved")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "approved" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700" }`}> ✅ Đã duyệt </button>
           <button onClick={() => setTab("pending")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "pending" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700" }`}> ⏳ Chờ duyệt </button>
           <button onClick={() => setTab("rejected")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "rejected" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700" }`}> ❌ Từ chối </button>
        </div>

        {/* Events List */}
        <div className="space-y-3 overflow-y-auto flex-grow mb-6 pr-2"> {/* Thêm pr-2 để thanh scroll không đè nội dung */}
          {loading ? (
            <p className="text-gray-500 italic text-center py-4">Đang tải...</p>
          ) : error ? (
            <p className="text-red-500 italic text-center py-4">{error}</p>
          ) : filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div
                key={event.id} // Sử dụng ID sự kiện làm key
                className="p-3 md:p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 space-y-1 hover:bg-gray-100"
              >
                <h3 className="font-semibold text-md md:text-lg text-gray-800">{event.name}</h3>
                 {/* Hiển thị thêm thông tin nếu có */}
                {event.time && <p className="text-gray-600 text-sm">📅 {new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>}
                {event.location && <p className="text-gray-600 text-sm">📍 {event.location}</p>}

                {/* --- HIỂN THỊ LÝ DO TỪ CHỐI --- */}
                {/* Chỉ hiển thị khi tab là "rejected" và event có rejectReason */}
                {tab === "rejected" && event.rejectionReason && (
                  <p className="text-sm text-red-600 mt-1 pt-1 border-t border-red-100">
                    <span className="font-medium">Lý do từ chối:</span> {event.rejectionReason}
                  </p>
                )}
                {/* ----------------------------- */}

              </div>
            ))
          ) : (
            <p className="text-gray-500 italic text-center py-4">Không có sự kiện nào trong mục này.</p>
          )}
        </div>

        {/* Bottom buttons */}
        <div className="flex justify-between items-center border-t pt-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm"
          >
            Đóng
          </button>
          <Link href="/event"> {/* Đảm bảo route /event tồn tại */}
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md cursor-pointer text-sm">
              + Tạo sự kiện mới
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}