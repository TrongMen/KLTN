"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast, Toaster } from "react-hot-toast";

// --- Types ---
// Kiểu cho sự kiện (chỉ cần id và name để chọn)
interface ApprovedEvent {
  id: string;
  name: string;
  // Thêm các trường khác nếu muốn hiển thị trong danh sách chọn
  time?: string;
  location?: string;
}

// Kiểu cho người tham dự (giữ nguyên từ trước)
interface Attendee {
  id?: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roleName?: string;
  positionName?: string;
}

// Props (chỉ cần onClose)
interface ModalAttendeesProps {
  onClose: () => void;
}

export default function ModalAttendees({ onClose }: ModalAttendeesProps) {
  // State cho danh sách sự kiện đã duyệt
  const [approvedEvents, setApprovedEvents] = useState<ApprovedEvent[]>([]);
  // State cho ID của sự kiện được chọn để xem attendees
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  // State cho danh sách attendees của sự kiện được chọn
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  // State điểm danh
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  // State loading riêng biệt
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false); // Chỉ true khi đang tải attendees

  // State lỗi riêng biệt
  const [eventError, setEventError] = useState<string | null>(null);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);

  // --- Fetch Danh sách sự kiện ĐÃ DUYỆT ---
  useEffect(() => {
    const fetchApprovedEvents = async () => {
      setIsLoadingEvents(true);
      setEventError(null);
      setApprovedEvents([]); // Reset trước khi fetch

      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Không có token xác thực.");
        const headers = { Authorization: `Bearer ${token}` };
        const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`; // API lấy event đã duyệt
        const res = await fetch(url, { headers });

        if (!res.ok) {
          let errorMsg = `Không thể tải danh sách sự kiện đã duyệt`;
          try { const errData = await res.json(); errorMsg = errData.message || errorMsg; } catch (_) {}
          throw new Error(errorMsg);
        }

        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          setApprovedEvents(data.result);
        } else {
          throw new Error(data.message || "Dữ liệu sự kiện đã duyệt không hợp lệ");
        }
      } catch (err: any) {
        console.error("Lỗi khi tải sự kiện đã duyệt:", err);
        setEventError(err.message || "Đã xảy ra lỗi khi tải sự kiện");
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchApprovedEvents();
  }, []); // Chỉ chạy 1 lần khi modal mở

  // --- Fetch Danh sách ATTENDEES khi chọn sự kiện ---
  useEffect(() => {
    const fetchAttendees = async () => {
      // Chỉ fetch khi có selectedEventId
      if (!selectedEventId) {
        setAttendees([]); // Reset danh sách attendees nếu không có event nào được chọn
        return;
      }

      setIsLoadingAttendees(true);
      setAttendeeError(null);
      setAttendees([]); // Reset trước khi fetch mới
      setAttendance({}); // Reset trạng thái điểm danh
      console.log(`Workspaceing attendees for event: ${selectedEventId}`);

      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Không có token xác thực.");
        const headers = { Authorization: `Bearer ${token}` };
        const url = `http://localhost:8080/identity/api/events/${selectedEventId}/attendees`; // API lấy attendees
        const res = await fetch(url, { headers });

        if (!res.ok) {
          let errorMsg = `Không thể tải danh sách người tham dự`;
          try { const errData = await res.json(); errorMsg = errData.message || errorMsg; } catch (_) {}
          throw new Error(errorMsg);
        }

        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          console.log("Attendees data received:", data.result);
          setAttendees(data.result);
        } else {
          throw new Error(data.message || "Dữ liệu người tham dự không hợp lệ");
        }

      } catch (err: any) {
        console.error("Lỗi khi tải người tham dự:", err);
        setAttendeeError(err.message || "Đã xảy ra lỗi khi tải người tham dự");
      } finally {
        setIsLoadingAttendees(false);
      }
    };

    fetchAttendees();
  }, [selectedEventId]); // Chạy lại khi selectedEventId thay đổi

  // --- Handlers ---
  const toggleAttendance = (attendeeId: string) => { /* ... Giữ nguyên ... */ };
  const getAttendeeName = (attendee: Attendee): string => { /* ... Giữ nguyên ... */ };

  // Hàm quay lại danh sách chọn sự kiện
  const handleBackToEventList = () => {
    setSelectedEventId(null); // Reset ID sự kiện đang chọn
    // Các state khác liên quan đến attendees đã được reset trong useEffect
  };

  // Lấy tên sự kiện đang được chọn (để hiển thị tiêu đề)
  const selectedEventName = approvedEvents.find(event => event.id === selectedEventId)?.name;

  // --- Render ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Toaster position="top-right" />
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-5 md:p-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b flex-shrink-0">
          {/* Tiêu đề thay đổi tùy theo trạng thái */}
          <h2 className="text-xl md:text-2xl font-bold text-blue-700">
            {selectedEventId ? `👥 Người tham gia: ${selectedEventName || '...'}` : '📅 Chọn sự kiện để xem người tham gia'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 text-2xl font-bold cursor-pointer" title="Đóng" aria-label="Đóng">
            &times;
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-grow mb-4 pr-2">
          {/* === GIAI ĐOẠN 1: Chọn sự kiện === */}
          {!selectedEventId && (
            <>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Sự kiện đã duyệt</h3>
              {isLoadingEvents ? (
                <p className="text-center text-gray-500 italic py-5">Đang tải sự kiện đã duyệt...</p>
              ) : eventError ? (
                <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{eventError}</p>
              ) : approvedEvents.length === 0 ? (
                <p className="text-center text-gray-500 italic py-5">Không có sự kiện nào đã được duyệt.</p>
              ) : (
                <div className="space-y-2">
                  {approvedEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEventId(event.id)} // Set ID khi nhấn
                      className="w-full text-left p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <p className="font-medium text-indigo-800">{event.name}</p>
                      {/* Có thể hiển thị thêm time/location ở đây */}
                      {event.time && <p className="text-xs text-gray-500 mt-1">📅 {new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>}
                      {event.location && <p className="text-xs text-gray-500">📍 {event.location}</p>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* === GIAI ĐOẠN 2: Hiển thị Attendees === */}
          {selectedEventId && (
            <>
              {/* Nút quay lại danh sách sự kiện */}
               <button
                   onClick={handleBackToEventList}
                   className="mb-3 text-sm text-blue-600 hover:text-blue-800 flex items-center"
               >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                   </svg>
                   Quay lại chọn sự kiện
               </button>

              {/* Hiển thị danh sách attendees */}
              {isLoadingAttendees ? (
                <p className="text-center text-gray-500 italic py-5">Đang tải danh sách người tham gia...</p>
              ) : attendeeError ? (
                <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{attendeeError}</p>
              ) : attendees.length === 0 ? (
                <p className="text-center text-gray-500 italic py-5">Sự kiện này chưa có người tham gia.</p>
              ) : (
                <div className="space-y-3">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.userId}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-100"
                    >
                      {/* Attendee Info */}
                      <div className="mb-2 sm:mb-0">
                        <p className="font-semibold text-gray-800">{getAttendeeName(attendee)}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                          {attendee.username && <span>@{attendee.username}</span>}
                          {attendee.roleName && <span className="italic">({attendee.roleName})</span>}
                          {attendee.positionName && <span className="font-medium">[{attendee.positionName}]</span>}
                        </div>
                      </div>
                      {/* Attendance Checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-full border hover:border-green-400 transition self-end sm:self-center">
                        <input
                          type="checkbox"
                          checked={attendance[attendee.userId] || false}
                          onChange={() => toggleAttendance(attendee.userId)}
                          className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                        />
                        <span className="text-xs font-medium text-gray-700 select-none">Điểm danh</span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow transition text-sm font-medium">
            Đóng
          </button>
          {/* Nút Lưu điểm danh chỉ hiển thị khi đang xem attendees và có attendees */}
           {selectedEventId && attendees.length > 0 && (
              <button
                 // onClick={handleSaveAttendance} // Cần hàm lưu điểm danh
                 className="px-5 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg shadow transition text-sm font-medium ml-3 disabled:opacity-50"
                 // disabled={isSavingAttendance} // Cần state nếu có lưu
              >
                 Lưu điểm danh
              </button>
           )}
        </div>
      </div>
    </div>
  );
};