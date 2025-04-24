"use client";

import React, { useState, useEffect, useCallback,useMemo } from "react";
import { toast, Toaster } from "react-hot-toast";

interface ApprovedEvent {
  id: string;
  name: string;
  time?: string;
  location?: string;
}

interface Attendee {
  id?: string; // Có thể không cần nếu dùng userId làm key
  userId: string; // Bắt buộc phải có userId
  firstName?: string;
  lastName?: string;
  username?: string; // Thường là mã sinh viên/định danh duy nhất
  roleName?: string;
  positionName?: string;
  attending?: boolean; // Thêm trường này nếu API trả về trạng thái điểm danh
  // Thêm các trường khác nếu API trả về (ví dụ: avatar, email...)
}


interface ModalAttendeesProps {
  onClose: () => void;
}

export default function ModalAttendees({ onClose }: ModalAttendeesProps) {
  const [approvedEvents, setApprovedEvents] = useState<ApprovedEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({}); // userId -> isAttending
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState<string | null>(null); // Lưu userId đang cập nhật

  useEffect(() => {
    const fetchApprovedEvents = async () => {
      setIsLoadingEvents(true);
      setEventError(null);
      setApprovedEvents([]);

      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Không có token xác thực.");
        const headers = { Authorization: `Bearer ${token}` };
        const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
        const res = await fetch(url, { headers });

        if (!res.ok) {
          let errorMsg = `Không thể tải danh sách sự kiện đã duyệt`;
          try { const errData = await res.json(); errorMsg = errData.message || errorMsg;} catch (_) {}
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
  }, []);

  useEffect(() => {
    const fetchAttendees = async () => {
      if (!selectedEventId) {
        setAttendees([]);
        setAttendance({}); // Reset attendance khi không có event nào được chọn
        return;
      }

      setIsLoadingAttendees(true);
      setAttendeeError(null);
      setAttendees([]);
      setAttendance({});

      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Không có token xác thực.");
        const headers = { Authorization: `Bearer ${token}` };
        const url = `http://localhost:8080/identity/api/events/${selectedEventId}/attendees`;
        const res = await fetch(url, { headers });

        if (!res.ok) {
          let errorMsg = `Không thể tải danh sách người tham dự`;
          try { const errData = await res.json(); errorMsg = errData.message || errorMsg;} catch (_) {}
          throw new Error(errorMsg);
        }

        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const fetchedAttendees: Attendee[] = data.result;
          setAttendees(fetchedAttendees);
          // Khởi tạo trạng thái điểm danh ban đầu từ dữ liệu fetch được (nếu có)
          const initialAttendance: Record<string, boolean> = {};
          fetchedAttendees.forEach(att => {
              // Giả sử API trả về trường 'attending' boolean
              if (att.userId) { // Đảm bảo có userId
                  initialAttendance[att.userId] = att.attending ?? false; // Mặc định là false nếu không có
              }
          });
          setAttendance(initialAttendance);

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

  // Hàm xử lý khi toggle checkbox điểm danh
  const handleToggleAttendance = useCallback(async (attendeeUserId: string) => {
    if (!selectedEventId || isUpdatingAttendance) return; // Không làm gì nếu chưa chọn event hoặc đang cập nhật

    const currentStatus = attendance[attendeeUserId] ?? false;
    const newStatus = !currentStatus;

    setIsUpdatingAttendance(attendeeUserId); // Bắt đầu loading cho user này
    const loadingToastId = toast.loading(`Đang cập nhật điểm danh cho ${attendeeUserId.substring(0, 8)}...`);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Vui lòng đăng nhập lại.");

      const url = `http://localhost:8080/identity/api/events/${selectedEventId}/attendees/${attendeeUserId}?isAttending=${newStatus}`;
      const res = await fetch(url, {
        method: "PUT", // Sử dụng phương thức PUT
        headers: { Authorization: `Bearer ${token}` },
        // Không cần body nếu dùng query param
      });

      if (!res.ok) {
        let errorMsg = "Cập nhật điểm danh thất bại";
        try { const errData = await res.json(); errorMsg = errData.message || errorMsg; } catch (_) {}
        throw new Error(errorMsg);
      }

      // Cập nhật thành công state local
      setAttendance((prev) => ({ ...prev, [attendeeUserId]: newStatus }));
      toast.success(`Đã cập nhật điểm danh thành ${newStatus ? '"Có mặt"' : '"Vắng mặt"'}`, { id: loadingToastId });

    } catch (err: any) {
      console.error("Lỗi khi cập nhật điểm danh:", err);
      toast.error(`Lỗi: ${err.message || "Không thể cập nhật điểm danh"}`, { id: loadingToastId });
      // Không thay đổi state local nếu API lỗi
    } finally {
      setIsUpdatingAttendance(null); // Kết thúc loading
    }
  }, [selectedEventId, attendance, isUpdatingAttendance]); // Phụ thuộc vào các giá trị này

  const getAttendeeName = (attendee: Attendee): string => {
    const fullName = `${attendee.lastName || ""} ${attendee.firstName || ""}`.trim();
    return ( fullName || attendee.username || `User ID: ${attendee.userId.substring(0, 8)}`);
  };

  const handleBackToEventList = () => {
    setSelectedEventId(null);
    // Reset lỗi và danh sách attendees khi quay lại
    setAttendees([]);
    setAttendance({});
    setAttendeeError(null);
  };

  const selectedEventName = useMemo(() => {
      return approvedEvents.find((event) => event.id === selectedEventId)?.name;
  }, [approvedEvents, selectedEventId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Toaster  />
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-5 md:p-6 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 pb-3 border-b flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-blue-700 truncate pr-2">
            {selectedEventId
              ? `👥 Người tham gia: ${selectedEventName || "Đang tải..."}`
              : "📅 Chọn sự kiện"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold cursor-pointer flex-shrink-0 cursor-pointer"
            title="Đóng"
            aria-label="Đóng"
          >
            &times;
          </button>
        </div>

        <div className="overflow-y-auto flex-grow mb-4 pr-2">
          {!selectedEventId && (
            <>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Sự kiện đã duyệt
              </h3>
              {isLoadingEvents ? (
                <p className="text-center text-gray-500 italic py-5">
                  Đang tải sự kiện...
                </p>
              ) : eventError ? (
                <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  {eventError}
                </p>
              ) : approvedEvents.length === 0 ? (
                <p className="text-center text-gray-500 italic py-5">
                  Không có sự kiện nào đã được duyệt.
                </p>
              ) : (
                <div className="space-y-2">
                  {approvedEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEventId(event.id)}
                      className="w-full text-left p-3 bg-gray-50 cursor-pointer rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <p className="font-medium text-indigo-800">
                        {event.name}
                      </p>
                      {event.time && (
                        <p className="text-xs text-gray-500 mt-1">
                          📅{" "}
                          {new Date(event.time).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-xs text-gray-500">
                          📍 {event.location}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {selectedEventId && (
            <>
              <button
                onClick={handleBackToEventList}
                className="mb-3 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer "
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Quay lại chọn sự kiện
              </button>

              {isLoadingAttendees ? (
                <p className="text-center text-gray-500 italic py-5">
                  Đang tải danh sách người tham gia...
                </p>
              ) : attendeeError ? (
                <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  {attendeeError}
                </p>
              ) : attendees.length === 0 ? (
                <p className="text-center text-gray-500 italic py-5">
                  Sự kiện này chưa có người đăng ký tham gia.
                </p>
              ) : (
                <div className="space-y-3">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.userId}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-100 "
                    >
                      <div className="mb-2 sm:mb-0">
                        <p className="font-semibold text-gray-800">
                          {getAttendeeName(attendee)}
                        </p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-1">
                           {attendee.username && (
                             <span>@{attendee.username}</span>
                           )}
                           {attendee.roleName && (
                             <span className="italic">({attendee.roleName})</span>
                           )}
                           {attendee.positionName && (
                             <span className="font-medium">[{attendee.positionName}]</span>
                           )}
                        </div>
                      </div>

                      <label className={`flex items-center gap-2 cursor-pointer bg-white px-3 py-1 rounded-full border hover:border-green-400 transition self-end sm:self-center ${isUpdatingAttendance === attendee.userId ? 'opacity-50 cursor-wait' : ''}`}>
                        <input
                          type="checkbox"
                          checked={attendance[attendee.userId] || false}
                          onChange={() => handleToggleAttendance(attendee.userId)}
                          disabled={isUpdatingAttendance === attendee.userId} // Disable khi đang cập nhật user này
                          className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-70"
                        />
                        <span className="text-xs font-medium text-gray-700 select-none">
                            {isUpdatingAttendance === attendee.userId ? 'Đang lưu...' : 'Điểm danh'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow transition text-sm font-medium cursor-pointer"
          >
            Đóng
          </button>
          {/* Nút Lưu điểm danh đã bị loại bỏ */}
        </div>
      </div>
    </div>
  );
}