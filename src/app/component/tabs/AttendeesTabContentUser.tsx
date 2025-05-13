"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "../types/appTypes"; // Bỏ EventDisplayInfo nếu không dùng trực tiếp
import { toast } from "react-hot-toast";
import {
  FaTrashAlt,
  FaUserCheck,
  FaUserTimes,
  FaFileDownload,
  FaQrcode,
  FaInfoCircle, // Icon cho thông báo
} from "react-icons/fa";
import { MdQrCodeScanner } from "react-icons/md";
import QrCodeModal from "../modals/QrCodeModal";
import QRScanner from "../modals/QRScanner";
import { EventListDisplay, AttendableEvent as AttendableEventType } from "./atten/EventListDisplay"; // Đường dẫn ví dụ

interface Attendee {
  id: string;
  name: string;
  email?: string;
  studentId?: string;
  status: "PRESENT" | "ABSENT" | "UNKNOWN";
  checkedInAt?: string | null;
  [key: string]: any;
}

type AttendableEvent = AttendableEventType;

interface AttendeesTabContentProps {
  user: User;
  refreshToken: () => Promise<string | null>;
  onSessionExpired: () => void;
  showConfirmationDialog?: (
    title: string,
    message: React.ReactNode,
    onConfirm: () => void,
    confirmVariant?: "primary" | "danger",
    confirmText?: string
  ) => void;
}

// Hàm helper để xác định trạng thái tương đối của sự kiện
const getEventRelativeStatus = (
  event: AttendableEvent,
  defaultDurationHours: number
): 'upcoming' | 'ongoing' | 'past' => {
  const now = new Date();
  const startTime = new Date(event.time);
  let endTime;

  if (event.endTime) {
    endTime = new Date(event.endTime);
  } else {
    endTime = new Date(startTime.getTime() + defaultDurationHours * 60 * 60 * 1000);
  }

  if (endTime < now) return 'past'; // Ưu tiên kiểm tra past trước nếu endTime rõ ràng
  if (startTime > now) return 'upcoming';
  if (startTime <= now && endTime >= now) return 'ongoing';
  
  // Trường hợp sự kiện không có endTime và startTime đã qua nhưng (startTime + duration) chưa qua
  // Hoặc trường hợp hiếm hoi khác, mặc định là past nếu không rõ ràng ongoing/upcoming
  return 'past'; 
};


const AttendeesTabContent: React.FC<AttendeesTabContentProps> = ({
  user,
  refreshToken,
  onSessionExpired,
  showConfirmationDialog,
}) => {
  const [attendableEvents, setAttendableEvents] = useState<AttendableEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AttendableEvent | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<Set<string>>(new Set());
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [errorAttendees, setErrorAttendees] = useState<string | null>(null);
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [eventQrCodeUrl, setEventQrCodeUrl] = useState<string | null>(null);
  const [isEventQrModalOpen, setIsEventQrModalOpen] = useState(false);
  const [isLoadingEventQr, setIsLoadingEventQr] = useState(false);
  const [eventQrError, setEventQrError] = useState<string | null>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);

  const API_BASE_URL = 'http://localhost:8080';
  const DEFAULT_EVENT_DURATION_HOURS = 2;

  // Xác định trạng thái của sự kiện đang được chọn
  const selectedEventStatus = useMemo(() => {
    if (!selectedEvent) return null;
    return getEventRelativeStatus(selectedEvent, DEFAULT_EVENT_DURATION_HOURS);
  }, [selectedEvent]);

  // Biến boolean để dễ dàng kiểm soát việc cho phép hành động điểm danh
  const canPerformAttendanceActions = selectedEventStatus === 'ongoing';

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}, isFormData: boolean = false) => {
      let token = localStorage.getItem("authToken");
      if (!token) {
        onSessionExpired();
        throw new Error("Yêu cầu đăng nhập.");
      }
      const makeRequest = async (currentToken: string | null) => {
        const headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
        if (!isFormData && options.body && (options.method === "POST" || options.method === "PUT" || options.method === "PATCH")) {
          headers["Content-Type"] = "application/json";
        }
        const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
        if (res.status === 401 || res.status === 403) {
          const newToken = await refreshToken();
          if (newToken) {
            localStorage.setItem("authToken", newToken);
            return makeRequest(newToken);
          } else {
            onSessionExpired();
            throw new Error("Phiên đăng nhập hết hạn hoặc không hợp lệ.");
          }
        }
        return res;
      };
      return makeRequest(token);
    },
    [refreshToken, onSessionExpired]
  );

 const fetchAttendableEvents = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingEvents(true);
    setErrorEvents(null);
    try {
      const response = await authenticatedFetch(
        `http://localhost:8080/identity/api/events/creator/${user.id}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi ${response.status} khi tải sự kiện.`);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const events = data.result
          .filter((event: any) => event.status === "APPROVED" && !event.deleted)
          .map(
            (event: any): AttendableEvent => ({
              id: event.id,
              name: event.name || "Sự kiện không tên",
              time: event.startTime || event.time || new Date().toISOString(),
              endTime: event.endTime,
              location: event.location || "Không có địa điểm",
              description: event.content || event.purpose || "",
              status: event.status,
              avatarUrl: event.avatarUrl, // << THÊM DÒNG NÀY ĐỂ MAP avatarUrl
            })
          );
        setAttendableEvents(events);
      } else {
        throw new Error(data.message || "Dữ liệu sự kiện không hợp lệ.");
      }
    } catch (err: any) {
      setErrorEvents(err.message);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [user?.id, authenticatedFetch]); // API_BASE_URL is constant, not needed in deps if defined outside component scope

  const fetchAttendeesForEvent = useCallback(
    async (eventId: string) => {
      setIsLoadingAttendees(true);
      setErrorAttendees(null);
      setSelectedAttendeeIds(new Set());
      try {
        const response = await authenticatedFetch(`http://localhost:8080/identity/api/events/${eventId}/attendees`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Lỗi ${response.status} khi tải người tham dự.`);
        }
        const data = await response.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const fetchedAttendees: Attendee[] = data.result.map((att: any) => {
            let currentStatus: "PRESENT" | "ABSENT" | "UNKNOWN";
            if (att.isAttending === true) currentStatus = "PRESENT";
            else if (att.isAttending === false) currentStatus = "ABSENT";
            else currentStatus = "UNKNOWN";
            return {
              id: att.userId,
              name: att.fullName || `${att.lastName || ""} ${att.firstName || ""}`.trim() || "Người dùng ẩn danh",
              studentId: att.studentCode,
              status: currentStatus,
              email: att.email,
              checkedInAt: att.checkedInAt,
            };
          });
          setAttendees(fetchedAttendees);
        } else {
          throw new Error(data.message || "Dữ liệu người tham dự không hợp lệ.");
        }
      } catch (err: any) {
        setErrorAttendees(err.message);
        setAttendees([]);
      } finally {
        setIsLoadingAttendees(false);
      }
    },
    [authenticatedFetch]
  );

  const fetchEventQrCodeImage = useCallback(async (eventId: string) => {
    // Kiểm tra nếu sự kiện không đang diễn ra
    if (!canPerformAttendanceActions && selectedEventStatus) { 
        // Không fetch QR nếu không phải sự kiện đang diễn ra, selectedEventStatus đảm bảo selectedEvent tồn tại
        toast.error("Chỉ hiển thị mã QR cho sự kiện đang diễn ra.");
        setIsLoadingEventQr(false); // Đảm bảo reset loading state
        return null;
    }
    setIsLoadingEventQr(true);
    setEventQrError(null);
    setEventQrCodeUrl(null); // Reset trước khi fetch
    let tempUrlToRevoke: string | null = null;
    try {
      const response = await authenticatedFetch(`http://localhost:8080/identity/api/events/${eventId}/qr-code-image`, { method: "GET" }, true);
      if (!response.ok) {
        let errorMsg = `Lỗi ${response.status} khi tải mã QR.`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { /* giữ nguyên */ }
        throw new Error(errorMsg);
      }
      const imageBlob = await response.blob();
      if (!imageBlob.type.startsWith('image/')) {
        throw new Error("API không trả về ảnh QR hợp lệ.");
      }
      tempUrlToRevoke = window.URL.createObjectURL(imageBlob);
      setEventQrCodeUrl(tempUrlToRevoke);
    } catch (err: any) {
      setEventQrError(err.message || "Lỗi không xác định khi tải mã QR.");
      setEventQrCodeUrl(null);
      toast.error(`Lỗi tải mã QR: ${err.message}`);
    } finally {
      setIsLoadingEventQr(false);
    }
    return tempUrlToRevoke;
  }, [authenticatedFetch, canPerformAttendanceActions, selectedEventStatus]); // Thêm canPerformAttendanceActions và selectedEventStatus

  useEffect(() => {
    fetchAttendableEvents();
  }, [fetchAttendableEvents]);

  useEffect(() => {
    let currentEventQrUrlToRevoke: string | null = null;
    if (selectedEvent?.id) {
      fetchAttendeesForEvent(selectedEvent.id);
      // Chỉ fetch QR nếu sự kiện đang diễn ra (logic đã thêm trong fetchEventQrCodeImage)
      // Tuy nhiên, gọi nó ở đây và để hàm đó tự quyết định có fetch hay không
      if (getEventRelativeStatus(selectedEvent, DEFAULT_EVENT_DURATION_HOURS) === 'ongoing') {
          fetchEventQrCodeImage(selectedEvent.id).then(url => {
            currentEventQrUrlToRevoke = url;
          });
      } else {
        setEventQrCodeUrl(null); // Đảm bảo QR không hiển thị nếu sự kiện không ongoing
        setIsLoadingEventQr(false);
        setEventQrError(null);
      }
      setIsQrScannerOpen(false);
      setIsEventQrModalOpen(false);
    } else {
      setAttendees([]);
      setSelectedAttendeeIds(new Set());
      setEventQrCodeUrl(url => {
        if (url) window.URL.revokeObjectURL(url);
        return null;
      });
      setIsLoadingEventQr(false);
      setEventQrError(null);
    }
    return () => {
      if (currentEventQrUrlToRevoke) {
        window.URL.revokeObjectURL(currentEventQrUrlToRevoke);
      }
    }
  }, [selectedEvent, fetchAttendeesForEvent, fetchEventQrCodeImage]);

  const toggleSelectAttendee = (attendeeId: string) => {
    setSelectedAttendeeIds((prev) => {
      const newSelectedIds = new Set(prev);
      if (newSelectedIds.has(attendeeId)) newSelectedIds.delete(attendeeId);
      else newSelectedIds.add(attendeeId);
      return newSelectedIds;
    });
  };

  const currentFilteredAttendees = attendees.filter(
    (attendee) =>
      attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attendee.email && attendee.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (attendee.studentId && attendee.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSelectAll = () => {
    if (selectedAttendeeIds.size === currentFilteredAttendees.length && currentFilteredAttendees.length > 0) {
      setSelectedAttendeeIds(new Set());
    } else {
      setSelectedAttendeeIds(new Set(currentFilteredAttendees.map((att) => att.id)));
    }
  };

  const handleBulkSetAttendanceStatus = useCallback(async (newStatus: "PRESENT" | "ABSENT") => {
    if (!canPerformAttendanceActions) {
      toast.error("Chỉ có thể điểm danh cho sự kiện đang diễn ra.");
      return;
    }
    if (selectedAttendeeIds.size === 0 || !selectedEvent) {
      toast.error("Vui lòng chọn ít nhất một người tham dự.");
      return;
    }
    setIsPerformingBulkAction(true);
    const isAttendingBoolean = newStatus === "PRESENT";
    const SucceededUpdates: string[] = [];
    const FailedUpdates: { id: string; error: string; name?: string }[] = [];
    for (const userId of selectedAttendeeIds) {
      const attendeeToUpdate = attendees.find((a) => a.id === userId);
      try {
        const response = await authenticatedFetch(`http://localhost:8080/identity/api/events/${selectedEvent.id}/attendees/${userId}?isAttending=${isAttendingBoolean}`, { method: "PUT" });
        let responseData = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) responseData = await response.json();
        if (!response.ok) throw new Error(responseData?.message || `Lỗi ${response.status}`);
        if (responseData && responseData.code !== 1000 && response.ok) throw new Error(responseData.message || 'Lỗi server');
        SucceededUpdates.push(userId);
      } catch (err: any) {
        FailedUpdates.push({ id: userId, name: attendeeToUpdate?.name, error: err.message });
      }
    }
    if (SucceededUpdates.length > 0) {
      setAttendees((prev) => prev.map((att) => SucceededUpdates.includes(att.id) ? { ...att, status: newStatus, checkedInAt: newStatus === "PRESENT" ? new Date().toISOString() : att.checkedInAt } : att));
      toast.success(`Đã cập nhật ${SucceededUpdates.length} người.`);
    }
    if (FailedUpdates.length > 0) FailedUpdates.forEach((f) => toast.error(`Lỗi điểm danh ${f.name || f.id}: ${f.error}`));
    setSelectedAttendeeIds(new Set());
    setIsPerformingBulkAction(false);
  }, [selectedAttendeeIds, selectedEvent, attendees, authenticatedFetch, canPerformAttendanceActions]);

  const handleBulkDeleteAttendees = useCallback(async () => {
    // Quyết định: Cho phép xóa người tham dự bất kể trạng thái sự kiện
    if (selectedAttendeeIds.size === 0 || !selectedEvent) {
      toast.error("Vui lòng chọn người để xóa.");
      return;
    }
    const confirmFn = async () => {
      setIsPerformingBulkAction(true);
      const SucceededDeletes: string[] = [];
      const FailedDeletes: { id: string; error: string; name?: string }[] = [];
      for (const userId of selectedAttendeeIds) {
        const attendeeToDelete = attendees.find(a => a.id === userId);
        try {
          const response = await authenticatedFetch(`http://localhost:8080/identity/api/events/${selectedEvent.id}/attendees/${userId}`, { method: "DELETE" });
          if (response.status === 204 || response.ok) {
            let success = response.status === 204;
            if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
              const data = await response.json();
              if (data.code === 1000) success = true; else throw new Error(data.message || `Lỗi code ${data.code}`);
            }
            if (success) SucceededDeletes.push(userId);
            else if (!success) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.message || `Lỗi ${response.status}`); }
          } else { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.message || `Lỗi ${response.status}`); }
        } catch (err: any) { FailedDeletes.push({ id: userId, name: attendeeToDelete?.name, error: err.message }); }
      }
      if (SucceededDeletes.length > 0) {
        toast.success(`Đã xóa ${SucceededDeletes.length} người.`);
        setAttendees(prev => prev.filter(att => !SucceededDeletes.includes(att.id)));
      }
      if (FailedDeletes.length > 0) FailedDeletes.forEach(f => toast.error(`Lỗi xóa ${f.name || f.id}: ${f.error}`));
      setSelectedAttendeeIds(new Set());
      setIsPerformingBulkAction(false);
    };
    if (showConfirmationDialog) {
      showConfirmationDialog("Xác nhận xóa", `Xóa ${selectedAttendeeIds.size} người?`, confirmFn, "danger", "Xóa");
    } else if (window.confirm(`Bạn có chắc muốn xóa ${selectedAttendeeIds.size} người đã chọn?`)) { confirmFn(); }
  }, [selectedAttendeeIds, selectedEvent, attendees, authenticatedFetch, showConfirmationDialog]);

  const handleExportAttendees = useCallback(async () => {
    // Quyết định: Cho phép xuất danh sách bất kể trạng thái sự kiện
    if (!selectedEvent) return;
    setIsExporting(true);
    const toastId = toast.loading("Đang xuất file...");
    try {
      const response = await authenticatedFetch(`http://localhost:8080/identity/api/events/${selectedEvent.id}/attendees/export`, { method: "GET" }, true);
      if (!response.ok) { let errorMsg = `Lỗi ${response.status}`; try { const d = await response.json(); errorMsg = d.message || errorMsg; } catch (e) { } throw new Error(errorMsg); }
      const disposition = response.headers.get('content-disposition');
      let filename = `attendees_${selectedEvent.id}.xlsx`;
      if (disposition) { const m = disposition.match(/filename\*?=['"]?([^'";]+)['"]?/i); if (m?.[1]) { let f = m[1].replace(/['"]/g, ''); if (f.toLowerCase().startsWith("utf-8''")) f = decodeURIComponent(f.substring(7)); filename = f; } }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      toast.success("Xuất file thành công!", { id: toastId });
    } catch (err: any) { toast.error(`Lỗi: ${err.message}`, { id: toastId }); }
    finally { setIsExporting(false); }
  }, [selectedEvent, authenticatedFetch]);

  const handleShowEventQrCode = useCallback(() => {
    if (!selectedEvent || isLoadingEventQr) return;
    if (!canPerformAttendanceActions) {
      toast.error("Chỉ hiển thị mã QR cho sự kiện đang diễn ra.");
      return;
    }
    if (eventQrCodeUrl) {
      setIsEventQrModalOpen(true);
    } else {
      setIsEventQrModalOpen(true);
      if (selectedEvent?.id) {
        fetchEventQrCodeImage(selectedEvent.id);
      }
    }
  }, [selectedEvent, eventQrCodeUrl, isLoadingEventQr, canPerformAttendanceActions, fetchEventQrCodeImage]);

  const handleCheckInScanSuccess = useCallback(async (qrData: string) => {
    setIsQrScannerOpen(false); // Luôn đóng scanner sau khi có kết quả
    if (!canPerformAttendanceActions) {
      toast.error("Sự kiện không đang diễn ra. Không thể điểm danh.");
      setIsProcessingCheckIn(false); // Reset state nếu có
      return;
    }
    if (!selectedEvent) {
      toast.error("Chưa chọn sự kiện.");
      setIsProcessingCheckIn(false);
      return;
    }
    setIsProcessingCheckIn(true);
    const toastId = toast.loading(`Đang điểm danh...`);
    const formData = new FormData();
    formData.append('qrCodeData', qrData);
    try {
      const response = await authenticatedFetch(`http://localhost:8080/identity/api/events/${selectedEvent.id}/check-in`, { method: "POST", body: formData }, true);
      const responseData = await response.json();
      if (!response.ok || responseData.code !== 1000) {
        let attendeeInfo = "người tham dự";
        const nameM = qrData.match(/NAME:([^|]+)/); if (nameM?.[1]) attendeeInfo = nameM[1].trim();
        else { const userM = qrData.match(/USER:([^|]+)/); if (userM?.[1]) attendeeInfo = `ID ${userM[1].trim()}`; }
        throw new Error(responseData.message || `Điểm danh ${attendeeInfo} thất bại (Lỗi ${response.status})`);
      }
      const { attendeeId, checkedInAt } = responseData.result;
      let scannedName = attendees.find(a => a.id === attendeeId)?.name || `ID ${attendeeId}`;
      const nameMatchQr = qrData.match(/NAME:([^|]+)/); if (nameMatchQr?.[1]) scannedName = nameMatchQr[1].trim();
      toast.success(`Điểm danh thành công: ${scannedName}!`, { id: toastId });
      setAttendees(prev => prev.map(att => att.id === attendeeId ? { ...att, status: 'PRESENT', checkedInAt } : att));
    } catch (err: any) {
      toast.error(`${err.message}`, { id: toastId });
    } finally {
      setIsProcessingCheckIn(false);
    }
  }, [selectedEvent, attendees, authenticatedFetch, canPerformAttendanceActions]);

  const handleCheckInScanError = useCallback((errorMsg: string) => {
    if (!errorMsg.toLowerCase().includes("notfoundexception") && !errorMsg.toLowerCase().includes("no qr code found")) {
      toast.error(`Lỗi quét QR: ${errorMsg}`);
    }
  }, []);

  const getStatusColor = (status: "PRESENT" | "ABSENT" | "UNKNOWN") => {
    if (status === "PRESENT") return "bg-green-100 text-green-700";
    if (status === "ABSENT") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-teal-600">
        Điểm danh người tham dự
      </h2>
      {!selectedEvent ? (
        <div className="space-y-4">
          <h3 className="text-xl font-medium text-gray-700">
            Chọn sự kiện để điểm danh:
          </h3>
          <EventListDisplay
            initialEvents={attendableEvents}
            isLoading={isLoadingEvents}
            error={errorEvents}
            onSelectEvent={(event) => setSelectedEvent(event)}
            defaultEventDurationHours={DEFAULT_EVENT_DURATION_HOURS}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <h3 className="text-xl font-medium text-gray-700">
              Sự kiện:{" "}
              <span className="text-indigo-700">{selectedEvent.name}</span>
              {selectedEventStatus && (
                <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  selectedEventStatus === 'ongoing' ? 'bg-green-100 text-green-700' :
                  selectedEventStatus === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {selectedEventStatus === 'ongoing' && 'Đang diễn ra'}
                  {selectedEventStatus === 'upcoming' && 'Sắp diễn ra'}
                  {selectedEventStatus === 'past' && 'Đã kết thúc'}
                </span>
              )}
            </h3>
            <button
              onClick={() => { setSelectedEvent(null); setSearchTerm(""); }}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
            >
              Chọn sự kiện khác
            </button>
          </div>

          {/* Thông báo nếu sự kiện không cho phép điểm danh */}
          {selectedEventStatus && !canPerformAttendanceActions && (
            <div className="p-3 mb-4 text-sm text-yellow-700 bg-yellow-100 rounded-lg flex items-center gap-2" role="alert">
              <FaInfoCircle className="w-5 h-5"/>
              <span className="font-medium">Thông báo:</span> Chỉ có thể thực hiện các thao tác điểm danh (đánh dấu, quét QR) cho các sự kiện đang diễn ra.
            </div>
          )}

          {isLoadingAttendees ? ( <p className="text-center text-gray-500 py-4"> Đang tải người tham dự... </p>
          ) : errorAttendees ? ( <p className="text-center text-red-500 py-4"> Lỗi tải người tham dự: {errorAttendees} </p>
          ) : attendees.length === 0 ? ( <p className="text-gray-600 py-4"> Sự kiện này chưa có ai đăng ký. </p>
          ) : (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
              <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center">
                <input type="text" placeholder="Tìm kiếm người tham dự..."
                  className="w-full sm:flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="mb-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-700 mr-2"> Đã chọn: {selectedAttendeeIds.size} </span>
                <button
                  onClick={() => handleBulkSetAttendanceStatus("PRESENT")}
                  disabled={!canPerformAttendanceActions || isPerformingBulkAction || selectedAttendeeIds.size === 0 || isExporting || isLoadingEventQr || isProcessingCheckIn}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                > <FaUserCheck /> Có mặt </button>
                <button
                  onClick={() => handleBulkSetAttendanceStatus("ABSENT")}
                  disabled={!canPerformAttendanceActions || isPerformingBulkAction || selectedAttendeeIds.size === 0 || isExporting || isLoadingEventQr || isProcessingCheckIn}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                > <FaUserTimes /> Vắng mặt </button>
                <button // Xóa vẫn cho phép
                  onClick={handleBulkDeleteAttendees}
                  disabled={isPerformingBulkAction || selectedAttendeeIds.size === 0 || isExporting || isLoadingEventQr || isProcessingCheckIn}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                > <FaTrashAlt /> Xóa đã chọn </button>
                <button // Xuất DS vẫn cho phép
                  onClick={handleExportAttendees}
                  disabled={isPerformingBulkAction || isExporting || isLoadingEventQr || isProcessingCheckIn}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                > <FaFileDownload /> {isExporting ? "Đang xuất..." : "Xuất DS"} </button>
                <button
                  onClick={handleShowEventQrCode}
                  disabled={!canPerformAttendanceActions || isPerformingBulkAction || isExporting || isLoadingEventQr || isProcessingCheckIn}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                > <FaQrcode /> {isLoadingEventQr ? "Tải QR..." : "Mã QR Sự kiện"} </button>
                <button
                  onClick={() => {
                    if (!selectedEvent) { toast.error("Vui lòng chọn sự kiện."); return; }
                    if (!canPerformAttendanceActions) { toast.error("Chỉ điểm danh QR cho sự kiện đang diễn ra."); return;}
                    setIsQrScannerOpen(true);
                  }}
                  disabled={!canPerformAttendanceActions || isPerformingBulkAction || isExporting || isLoadingEventQr || isProcessingCheckIn || !selectedEvent}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                > <MdQrCodeScanner /> {isProcessingCheckIn ? "Xử lý..." : "Điểm danh QR"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-600"
                          checked={currentFilteredAttendees.length > 0 && selectedAttendeeIds.size === currentFilteredAttendees.length}
                          onChange={toggleSelectAll}
                          disabled={currentFilteredAttendees.length === 0 || isPerformingBulkAction || isExporting || isLoadingEventQr || isProcessingCheckIn || !canPerformAttendanceActions} // Vô hiệu hóa cả checkbox nếu không điểm danh được
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Họ Tên </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell"> MSSV </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"> Trạng thái </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentFilteredAttendees.map((attendee, index) => (
                      <tr key={attendee.id} className={`${selectedAttendeeIds.has(attendee.id) ? 'bg-indigo-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50')}`} >
                        <td className="px-2 py-3 whitespace-nowrap">
                          <input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-600"
                            checked={selectedAttendeeIds.has(attendee.id)}
                            onChange={() => toggleSelectAttendee(attendee.id)}
                            disabled={isPerformingBulkAction || isExporting || isLoadingEventQr || isProcessingCheckIn || !canPerformAttendanceActions} // Vô hiệu hóa cả checkbox nếu không điểm danh được
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900"> {attendee.name} </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell"> {attendee.studentId || "N/A"} </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(attendee.status)}`} >
                            {attendee.status === "PRESENT" && "Có mặt"}
                            {attendee.status === "ABSENT" && "Vắng mặt"}
                            {attendee.status === "UNKNOWN" && "Chưa điểm danh"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {currentFilteredAttendees.length === 0 && searchTerm && (<p className="text-center text-gray-500 py-4"> Không tìm thấy người tham dự nào khớp. </p>)}
              {currentFilteredAttendees.length === 0 && !searchTerm && attendees.length > 0 && (<p className="text-center text-gray-500 py-4"> Không có người tham dự nào (đã lọc hết). </p>)}
            </div>
          )}
        </div>
      )}

      <QrCodeModal
        isOpen={isEventQrModalOpen && canPerformAttendanceActions} // Chỉ mở modal nếu được phép
        onClose={() => {
          setIsEventQrModalOpen(false);
          if (eventQrCodeUrl) { window.URL.revokeObjectURL(eventQrCodeUrl); setEventQrCodeUrl(null); }
        }}
        imageUrl={eventQrCodeUrl}
        isLoading={isLoadingEventQr}
        eventName={selectedEvent?.name}
      />

      {isQrScannerOpen && selectedEvent && canPerformAttendanceActions && ( // Chỉ mở scanner nếu được phép
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Quét mã QR điểm danh</h3>
              <button onClick={() => setIsQrScannerOpen(false)} className="text-gray-400 hover:text-gray-600" disabled={isProcessingCheckIn}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-4">
              {isProcessingCheckIn ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  <p>Đang xử lý điểm danh...</p>
                </div>
              ) : ( <QRScanner onScanSuccess={handleCheckInScanSuccess} onScanError={handleCheckInScanError} /> )}
            </div>
            {!isProcessingCheckIn && (<div className="p-4 border-t flex justify-end">
              <button onClick={() => setIsQrScannerOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm">Hủy</button>
            </div>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendeesTabContent;