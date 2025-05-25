"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "../types/appTypes";
import { toast } from "react-hot-toast";
import {
  FaTrashAlt,
  FaUserCheck,
  FaUserTimes,
  FaFileDownload,
  FaQrcode,
  FaInfoCircle,
  FaSyncAlt,
  FaSort,
  FaSortUp,
  FaSortDown,
} from "react-icons/fa";
import { MdQrCodeScanner } from "react-icons/md";
import QrCodeModal from "../modals/QrCodeModal";
import QRScanner from "../modals/QRScanner";
import { EventListDisplay, AttendableEvent } from "./atten/EventListDisplay";

type EventStatus = "upcoming" | "ongoing" | "ended";

interface Attendee {
  id: string;
  name: string;
  email?: string;
  studentId?: string;
  status: "PRESENT" | "ABSENT" | "UNKNOWN";
  checkedInAt?: string | null;
  [key: string]: any;
}

type AttendeeSortKey = 'name' | 'studentId' | 'status';
type AttendeeSortDirection = 'asc' | 'desc';

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

const getEventStatusForTab = (event: AttendableEvent | null): EventStatus => {
    if (!event) return "upcoming";

    const progressStatusUpper = event.progressStatus?.toUpperCase();

    if (progressStatusUpper === "ONGOING") return "ongoing";
    if (progressStatusUpper === "UPCOMING") return "upcoming";
    if (progressStatusUpper === "COMPLETED") return "ended";
    
    if (!event.time) return "upcoming";
    try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDate = new Date(event.time);
        if (isNaN(eventDate.getTime())) return "upcoming";
        
        const eventDateStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        if (eventDateStart < todayStart) return "ended";
        else if (eventDateStart > todayStart) return "upcoming";
        else return "ongoing";
    } catch (e) {
        return "upcoming";
    }
};

const getStatusBadgeClasses = (status: EventStatus): string => {
  const base = "ml-2 text-xs font-semibold px-2 py-0.5 rounded-full";
  switch (status) {
    case "ongoing": return `${base} bg-green-100 text-green-700`;
    case "upcoming": return `${base} bg-blue-100 text-blue-700`;
    case "ended": return `${base} bg-gray-100 text-gray-700`;
    default: return `${base} bg-gray-100 text-gray-600`;
  }
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
  const [attendeeSortConfig, setAttendeeSortConfig] = useState<{ key: AttendeeSortKey; direction: AttendeeSortDirection }>({ key: 'name', direction: 'asc' });
  const [isRequestingCameraPermission, setIsRequestingCameraPermission] = useState(false);

  const selectedEventStatus = useMemo(() => {
    return getEventStatusForTab(selectedEvent);
  }, [selectedEvent]);

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

  const fetchAttendableEvents = useCallback(async (showToast = false) => {
    if (!user?.id) return;
    if(showToast) toast.loading("Đang làm mới danh sách sự kiện...", { id: "refresh-events-toast" });
    setIsLoadingEvents(true);
    setErrorEvents(null);
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/creator/${user.id}`);
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
              id: event.id, name: event.name || "Sự kiện không tên", time: event.startTime || event.time || new Date().toISOString(),
              endTime: event.endTime, location: event.location || "Không có địa điểm", description: event.content || event.purpose || "",
              status: event.status, avatarUrl: event.avatarUrl,
              progressStatus: event.progressStatus,
            })
          );
        setAttendableEvents(events);
        if(showToast) toast.success("Làm mới danh sách sự kiện thành công!", { id: "refresh-events-toast" });
      } else { throw new Error(data.message || "Dữ liệu sự kiện không hợp lệ."); }
    } catch (err: any) {
      setErrorEvents(err.message);
      if(showToast) toast.error(`Làm mới thất bại: ${err.message}`, { id: "refresh-events-toast" });
    } finally { setIsLoadingEvents(false); }
  }, [user?.id, authenticatedFetch]);

  const fetchAttendeesForEvent = useCallback(
    async (eventId: string, showToast = false) => {
      if(showToast) toast.loading("Đang làm mới danh sách người tham dự...", { id: "refresh-attendees-toast" });
      setIsLoadingAttendees(true);
      setErrorAttendees(null);
      setSelectedAttendeeIds(new Set());
      try {
        const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventId}/attendees`);
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
              id: att.userId, name: att.fullName || `${att.lastName || ""} ${att.firstName || ""}`.trim() || "Người dùng ẩn danh",
              studentId: att.studentCode, status: currentStatus, email: att.email, checkedInAt: att.checkedInAt,
            };
          });
          setAttendees(fetchedAttendees);
          if(showToast) toast.success("Làm mới danh sách tham dự thành công!", { id: "refresh-attendees-toast" });
        } else { throw new Error(data.message || "Dữ liệu người tham dự không hợp lệ."); }
      } catch (err: any) {
        setErrorAttendees(err.message);
        if(showToast) toast.error(`Làm mới thất bại: ${err.message}`, { id: "refresh-attendees-toast" });
        setAttendees([]);
      } finally { setIsLoadingAttendees(false); }
    },
    [authenticatedFetch]
  );

  const fetchEventQrCodeImage = useCallback(async (eventId: string) => {
    if (!canPerformAttendanceActions && selectedEventStatus) {
      toast.error("Chỉ hiển thị mã QR cho sự kiện đang diễn ra."); setIsLoadingEventQr(false); return null;
    }
    setIsLoadingEventQr(true); setEventQrError(null); setEventQrCodeUrl(null);
    let tempUrlToRevoke: string | null = null;
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventId}/qr-code-image`, { method: "GET" }, true);
      if (!response.ok) {
        let errorMsg = `Lỗi ${response.status} khi tải mã QR.`;
        try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch (e) { }
        throw new Error(errorMsg);
      }
      const imageBlob = await response.blob();
      if (!imageBlob.type.startsWith('image/')) { throw new Error("API không trả về ảnh QR hợp lệ."); }
      tempUrlToRevoke = window.URL.createObjectURL(imageBlob); setEventQrCodeUrl(tempUrlToRevoke);
    } catch (err: any) {
      setEventQrError(err.message || "Lỗi không xác định khi tải mã QR."); setEventQrCodeUrl(null);
      toast.error(`Lỗi tải mã QR: ${err.message}`);
    } finally { setIsLoadingEventQr(false); }
    return tempUrlToRevoke;
  }, [authenticatedFetch, canPerformAttendanceActions, selectedEventStatus]);

  useEffect(() => { fetchAttendableEvents(); }, [fetchAttendableEvents]);

  useEffect(() => {
    let currentEventQrUrlToRevoke: string | null = null;
    if (selectedEvent?.id) {
      fetchAttendeesForEvent(selectedEvent.id);
      if (selectedEventStatus === 'ongoing') {
        fetchEventQrCodeImage(selectedEvent.id).then(url => { currentEventQrUrlToRevoke = url; });
      } else { setEventQrCodeUrl(null); setIsLoadingEventQr(false); setEventQrError(null); }
    } else {
      setAttendees([]); setSelectedAttendeeIds(new Set());
      setEventQrCodeUrl(url => { if (url) window.URL.revokeObjectURL(url); return null; });
      setIsLoadingEventQr(false); setEventQrError(null);
    }
    return () => { if (currentEventQrUrlToRevoke) window.URL.revokeObjectURL(currentEventQrUrlToRevoke); }
  }, [selectedEvent, fetchAttendeesForEvent, fetchEventQrCodeImage, selectedEventStatus]);

  const toggleSelectAttendee = (attendeeId: string) => {
    setSelectedAttendeeIds((prev) => {
      const newSelectedIds = new Set(prev);
      if (newSelectedIds.has(attendeeId)) newSelectedIds.delete(attendeeId);
      else newSelectedIds.add(attendeeId);
      return newSelectedIds;
    });
  };

  const handleAttendeeSortChange = (key: AttendeeSortKey) => {
    setAttendeeSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return { key, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };
  
  const sortedAndFilteredAttendees = useMemo(() => {
    let filtered = attendees.filter(
      (attendee) =>
        attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (attendee.email && attendee.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (attendee.studentId && attendee.studentId.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    filtered.sort((a, b) => {
      let valA: string | number, valB: string | number;
      const { key, direction } = attendeeSortConfig;
      switch (key) {
        case 'name': valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break;
        case 'studentId':
          valA = a.studentId || ''; valB = b.studentId || '';
          if (!isNaN(Number(valA)) && !isNaN(Number(valB)) && valA !== '' && valB !== '') {
            valA = Number(valA); valB = Number(valB);
          }
          break;
        case 'status': const statusOrder = { 'PRESENT': 1, 'UNKNOWN': 2, 'ABSENT': 3 }; valA = statusOrder[a.status]; valB = statusOrder[b.status]; break;
        default: return 0;
      }
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [attendees, searchTerm, attendeeSortConfig]);

  const toggleSelectAll = () => {
    if (selectedAttendeeIds.size === sortedAndFilteredAttendees.length && sortedAndFilteredAttendees.length > 0) {
      setSelectedAttendeeIds(new Set());
    } else {
      setSelectedAttendeeIds(new Set(sortedAndFilteredAttendees.map((att) => att.id)));
    }
  };

  const handleBulkSetAttendanceStatus = useCallback(async (newStatus: "PRESENT" | "ABSENT") => {
    if (!canPerformAttendanceActions) { toast.error("Chỉ có thể điểm danh cho sự kiện đang diễn ra."); return; }
    if (selectedAttendeeIds.size === 0 || !selectedEvent) { toast.error("Vui lòng chọn ít nhất một người tham dự."); return; }
    setIsPerformingBulkAction(true);
    const isAttendingBoolean = newStatus === "PRESENT";
    const SucceededUpdates: string[] = [];
    const FailedUpdates: { id: string; error: string; name?: string }[] = [];
    for (const userId of selectedAttendeeIds) {
      const attendeeToUpdate = attendees.find((a) => a.id === userId);
      try {
        const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${selectedEvent.id}/attendees/${userId}?isAttending=${isAttendingBoolean}`, { method: "PUT" });
        let responseData = null;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) responseData = await response.json();
        if (!response.ok) throw new Error(responseData?.message || `Lỗi ${response.status}`);
        if (responseData && responseData.code !== 1000 && response.ok) throw new Error(responseData.message || 'Lỗi server');
        SucceededUpdates.push(userId);
      } catch (err: any) { FailedUpdates.push({ id: userId, name: attendeeToUpdate?.name, error: err.message }); }
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
    if (selectedAttendeeIds.size === 0 || !selectedEvent) { toast.error("Vui lòng chọn người để xóa."); return; }
    const confirmFn = async () => {
      setIsPerformingBulkAction(true);
      const SucceededDeletes: string[] = [];
      const FailedDeletes: { id: string; error: string; name?: string }[] = [];
      for (const userId of selectedAttendeeIds) {
        const attendeeToDelete = attendees.find(a => a.id === userId);
        try {
          const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${selectedEvent.id}/attendees/${userId}`, { method: "DELETE" });
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
    if (!selectedEvent) return;
    setIsExporting(true);
    const toastId = toast.loading("Đang xuất file...");
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${selectedEvent.id}/attendees/export`, { method: "GET" }, true);
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
    if (!canPerformAttendanceActions) { toast.error("Chỉ hiển thị mã QR cho sự kiện đang diễn ra."); return; }
    if (eventQrCodeUrl) { setIsEventQrModalOpen(true); }
    else { setIsEventQrModalOpen(true); if (selectedEvent?.id) fetchEventQrCodeImage(selectedEvent.id); }
  }, [selectedEvent, eventQrCodeUrl, isLoadingEventQr, canPerformAttendanceActions, fetchEventQrCodeImage]);

  const handleOpenQrScanner = useCallback(async () => {
    if (!selectedEvent) { toast.error("Vui lòng chọn sự kiện."); return; }
    if (!canPerformAttendanceActions) { toast.error("Chỉ điểm danh QR cho sự kiện đang diễn ra."); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Trình duyệt của bạn không hỗ trợ truy cập camera.");
      setIsQrScannerOpen(false);
      return;
    }
    setIsRequestingCameraPermission(true);
    const permissionToastId = "camera-permission-toast";
    toast.loading("Đang yêu cầu quyền truy cập camera...", { id: permissionToastId });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      toast.success("Sẵn sàng quét. Đang mở trình quét QR...", { id: permissionToastId });
      setIsQrScannerOpen(true);
    } catch (err: any) {
      let errorMessage = "Lỗi khi yêu cầu quyền camera.";
      if (err instanceof DOMException) {
          if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") { errorMessage = "Không tìm thấy camera trên thiết bị."; }
          else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") { errorMessage = "Bạn đã từ chối quyền truy cập camera. Vui lòng kiểm tra cài đặt trình duyệt."; }
          else if (err.name === "NotReadableError" || err.name === "TrackStartError") { errorMessage = "Không thể đọc dữ liệu từ camera. Camera có thể đang được sử dụng bởi ứng dụng khác."; }
          else { errorMessage = `Lỗi camera: ${err.message || err.name}`; }
      } else if (err instanceof Error) { errorMessage = err.message; }
      toast.error(errorMessage, { id: permissionToastId });
      setIsQrScannerOpen(false);
    } finally {
      setIsRequestingCameraPermission(false);
    }
  }, [selectedEvent, canPerformAttendanceActions]);

  const handleCheckInScanSuccess = useCallback(async (qrData: string) => {
    setIsQrScannerOpen(false);
    if (!canPerformAttendanceActions) { toast.error("Sự kiện không đang diễn ra. Không thể điểm danh."); setIsProcessingCheckIn(false); return; }
    if (!selectedEvent) { toast.error("Chưa chọn sự kiện."); setIsProcessingCheckIn(false); return; }
    setIsProcessingCheckIn(true);
    const toastId = toast.loading(`Đang điểm danh...`);
    const formData = new FormData(); formData.append('qrCodeData', qrData);
    try {
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${selectedEvent.id}/check-in`, { method: "POST", body: formData }, true);
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
    } catch (err: any) { toast.error(`${err.message}`, { id: toastId }); }
    finally { setIsProcessingCheckIn(false); }
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
  
  const SortIndicator = ({ sortKey }: { sortKey: AttendeeSortKey }) => {
    if (attendeeSortConfig.key !== sortKey) {
      return <FaSort className="ml-1 text-gray-400" />;
    }
    return attendeeSortConfig.direction === 'asc' ? <FaSortUp className="ml-1 text-blue-500" /> : <FaSortDown className="ml-1 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-teal-700"> Điểm danh người tham dự </h2>
      {!selectedEvent ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-medium text-gray-700 "> Chọn một sự kiện: </h3>
            <button
              onClick={() => fetchAttendableEvents(true)}
              disabled={isLoadingEvents}
              className="px-3 py-1.5 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
              title="Làm mới danh sách sự kiện"
            >
              <FaSyncAlt className={isLoadingEvents ? "animate-spin" : ""} />
              
            </button>
          </div>
          <EventListDisplay
            initialEvents={attendableEvents}
            isLoading={isLoadingEvents}
            error={errorEvents}
            onSelectEvent={(event) => setSelectedEvent(event)}
          />
        </div>
      ) : (
        <div className="space-y-4 ">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
            <h3 className="text-xl font-medium text-gray-700">
              Sự kiện: <span className="text-indigo-700">{selectedEvent.name}</span>
              {selectedEventStatus && (
                <span className={getStatusBadgeClasses(selectedEventStatus)}>
                  {selectedEventStatus === 'ongoing' && 'Đang diễn ra'}
                  {selectedEventStatus === 'upcoming' && 'Sắp diễn ra'}
                  {selectedEventStatus === 'ended' && 'Đã kết thúc'}
                </span>
              )}
            </h3>
            <button onClick={() => { setSelectedEvent(null); setSearchTerm(""); }}
              className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors cursor-pointer"
            > Chọn sự kiện khác </button>
          </div>

          {selectedEventStatus === 'ended' && (
            <div className="p-3 mb-4 text-sm text-gray-700 bg-gray-100 rounded-lg flex items-center gap-2" role="alert">
              <FaInfoCircle className="w-5 h-5"/>
              <span className="font-medium">Thông báo:</span> Sự kiện đã kết thúc. Không thể thực hiện thao tác điểm danh.
            </div>
          )}
          
          {selectedEventStatus === 'upcoming' && (
            <div className="p-3 mb-4 text-sm text-blue-700 bg-blue-100 rounded-lg flex items-center gap-2" role="alert">
              <FaInfoCircle className="w-5 h-5"/>
              <span className="font-medium">Thông báo:</span> Sự kiện này chưa diễn ra.
            </div>
          )}

          {isLoadingAttendees ? ( <p className="text-center text-gray-500 py-4"> Đang tải người tham dự... </p>
          ) : errorAttendees ? ( <p className="text-center text-red-500 py-4"> Lỗi tải người tham dự: {errorAttendees} </p>
          ) : attendees.length === 0 ? ( <p className="text-gray-600 py-4 text-center"> Sự kiện này chưa có ai đăng ký. </p>
          ) : (
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-200">
              <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center">
                <input type="text" placeholder="Tìm kiếm người tham dự (Tên, Email, MSSV)..."
                  className="w-full sm:flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="mb-4 flex flex-wrap gap-2 items-center">
                <span className="text-sm text-gray-700 mr-2"> Đã chọn: {selectedAttendeeIds.size} </span>
                <button onClick={() => handleBulkSetAttendanceStatus("PRESENT")} disabled={!canPerformAttendanceActions || isPerformingBulkAction || selectedAttendeeIds.size === 0} className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"> <FaUserCheck /> Có mặt </button>
                <button onClick={() => handleBulkSetAttendanceStatus("ABSENT")} disabled={!canPerformAttendanceActions || isPerformingBulkAction || selectedAttendeeIds.size === 0} className="px-3 py-1.5 text-xs font-medium text-white bg-orange-500 rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"> <FaUserTimes /> Vắng mặt </button>
                <button onClick={handleBulkDeleteAttendees} disabled={isPerformingBulkAction || selectedAttendeeIds.size === 0} className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"> <FaTrashAlt /> Xóa </button>
                <button onClick={handleExportAttendees} disabled={isExporting} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"> <FaFileDownload /> {isExporting ? "Đang xuất..." : "Xuất DS"} </button>
                <button onClick={handleShowEventQrCode} disabled={!canPerformAttendanceActions || isLoadingEventQr} className="px-3 py-1.5 text-xs font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"> <FaQrcode /> {isLoadingEventQr ? "Tải QR..." : "QR Sự kiện"} </button>
                <button onClick={handleOpenQrScanner} disabled={!canPerformAttendanceActions || isRequestingCameraPermission || isProcessingCheckIn} className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"> <MdQrCodeScanner /> {isRequestingCameraPermission ? "Xin quyền..." : (isProcessingCheckIn ? "Xử lý..." : "Quét QR")} </button>
                <button onClick={() => { if (selectedEvent) fetchAttendeesForEvent(selectedEvent.id, true);}} disabled={isLoadingAttendees} className="px-3 py-1.5 text-xs font-medium text-white bg-sky-600 rounded-md hover:bg-sky-700 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer" title="Làm mới danh sách người tham dự" > <FaSyncAlt className={isLoadingAttendees ? "animate-spin" : ""} />  </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-600"
                          checked={sortedAndFilteredAttendees.length > 0 && selectedAttendeeIds.size === sortedAndFilteredAttendees.length}
                          onChange={toggleSelectAll}
                          disabled={sortedAndFilteredAttendees.length === 0 || !canPerformAttendanceActions}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleAttendeeSortChange('name')}>
                        Họ Tên <SortIndicator sortKey="name" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-100" onClick={() => handleAttendeeSortChange('studentId')}>
                        MSSV <SortIndicator sortKey="studentId" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleAttendeeSortChange('status')}>
                        Trạng thái <SortIndicator sortKey="status" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedAndFilteredAttendees.map((attendee, index) => (
                      <tr key={attendee.id} className={`${selectedAttendeeIds.has(attendee.id) ? 'bg-indigo-50' : ''}`} >
                        <td className="px-2 py-3 whitespace-nowrap">
                          <input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-600"
                            checked={selectedAttendeeIds.has(attendee.id)}
                            onChange={() => toggleSelectAttendee(attendee.id)}
                            disabled={!canPerformAttendanceActions}
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
              {sortedAndFilteredAttendees.length === 0 && (<p className="text-center text-gray-500 py-4"> Không tìm thấy người tham dự nào khớp. </p>)}
            </div>
          )}
        </div>
      )}

      <QrCodeModal isOpen={isEventQrModalOpen && canPerformAttendanceActions}
        onClose={() => { setIsEventQrModalOpen(false); if (eventQrCodeUrl) { window.URL.revokeObjectURL(eventQrCodeUrl); setEventQrCodeUrl(null); }}}
        imageUrl={eventQrCodeUrl} isLoading={isLoadingEventQr} eventName={selectedEvent?.name}
      />

      {isQrScannerOpen && selectedEvent && canPerformAttendanceActions && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">Quét mã QR điểm danh</h3>
              <button onClick={() => setIsQrScannerOpen(false)} className="text-gray-400 hover:text-gray-600" disabled={isProcessingCheckIn || isRequestingCameraPermission}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-4">
              {isProcessingCheckIn ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Đang xử lý điểm danh...</p>
                </div>
              ) : ( 
                <QRScanner onScanSuccess={handleCheckInScanSuccess} onScanError={handleCheckInScanError} /> 
              )}
            </div>
            {!isProcessingCheckIn && (<div className="p-4 border-t flex justify-end">
              <button onClick={() => setIsQrScannerOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm" disabled={isRequestingCameraPermission}>Hủy</button>
            </div>)}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendeesTabContent;