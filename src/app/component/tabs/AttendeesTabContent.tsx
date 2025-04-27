"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { User as MainUserType } from '../homeuser'; // Adjust import path if needed
import {
    ArrowLeftIcon, CheckIcon, Cross2Icon, TrashIcon, PersonIcon,
    IdCardIcon, Link2Icon, CalendarIcon // Added CalendarIcon
} from "@radix-ui/react-icons";

// Interfaces
interface ApprovedEvent {
    id: string;
    name: string;
    time?: string;      // Primary event date/time
    location?: string;
    status?: string;
    createdAt?: string; // Fallback creation date
}

interface Attendee {
    id?: string;
    userId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    roleName?: string;
    positionName?: string;
    attending?: boolean;
    studentCode?: string;
    avatar?: string | null; // Thêm avatar nếu có
}

interface AttendeesTabContentProps {
    user: MainUserType | null;
}

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "primary" | "danger";
}

// Confirmation Dialog (Kept as is)
function ConfirmationDialog({
    isOpen, title, message, onConfirm, onCancel,
    confirmText = "Xác nhận", cancelText = "Hủy bỏ", confirmVariant = "primary"
}: ConfirmationDialogProps) {
    if (!isOpen) return null;
    const confirmButtonClasses = useMemo(() => {
        let base = "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
        if (confirmVariant === "danger") {
            base += "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
        } else {
            base += "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
        }
        return base;
    }, [confirmVariant]);
    const cancelButtonClasses = "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300 ease-out" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="dialog-title" >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 ease-out scale-100" onClick={(e) => e.stopPropagation()} >
                <h3 id="dialog-title" className={`text-lg font-bold mb-3 ${confirmVariant === "danger" ? "text-red-700" : "text-gray-800"}`} >{title}</h3>
                <div className="text-sm text-gray-600 mb-5">{message}</div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className={cancelButtonClasses}>{cancelText}</button>
                    <button onClick={onConfirm} className={confirmButtonClasses}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}


// --- Date Helper Functions ---
const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
};

const getWeekRange = (refDate: Date): { startOfWeek: Date; endOfWeek: Date } => {
    const d = new Date(refDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startOfWeek: start, endOfWeek: end };
};

const getMonthRange = (refDate: Date): { startOfMonth: Date; endOfMonth: Date } => {
    const d = new Date(refDate);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { startOfMonth: start, endOfMonth: end };
};

// --- Export Helper (Kept as is) ---
const getFilenameFromHeader = (header: string | null): string => {
    const defaultFilename = "event_export.docx";
    if (!header) return defaultFilename;
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(header);
    if (matches?.[1]) {
        let filename = matches[1].replace(/['"]/g, "");
        try {
            if (filename.toLowerCase().startsWith("utf-8''")) { filename = decodeURIComponent(filename.substring(7)); } else { filename = decodeURIComponent(filename); }
        } catch (e) { console.error("Error decoding filename:", e); }
        if (!filename.toLowerCase().endsWith(".docx")) { const nameWithoutExt = filename.includes(".") ? filename.substring(0, filename.lastIndexOf(".")) : filename; filename = nameWithoutExt + ".docx"; }
        return filename;
    } return defaultFilename;
};

// --- Attendee Helper ---
const getAttendeeName = (attendee: Attendee): string => {
    const fn = `${attendee.lastName || ""} ${attendee.firstName || ""}`.trim();
    return fn || attendee.username || `ID: ${attendee.userId?.substring(0, 8) ?? 'N/A'}`;
};

// --- Main Tab Component ---
const AttendeesTabContent: React.FC<AttendeesTabContentProps> = ({ user }) => {
    // Event List State
    const [userApprovedEvents, setUserApprovedEvents] = useState<ApprovedEvent[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
    const [eventError, setEventError] = useState<string | null>(null);
    const [eventSearchTerm, setEventSearchTerm] = useState("");
    const [eventSortOrder, setEventSortOrder] = useState<'az' | 'za'>('az'); // Default A-Z
    const [eventTimeFilter, setEventTimeFilter] = useState<'all' | 'today' | 'thisWeek' | 'thisMonth' | 'dateRange'>('all');
    const [eventStartDateFilter, setEventStartDateFilter] = useState<string>("");
    const [eventEndDateFilter, setEventEndDateFilter] = useState<string>("");
    const [eventViewMode, setEventViewMode] = useState<'list' | 'card'>('list');

    // Attendee List State
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false);
    const [attendeeError, setAttendeeError] = useState<string | null>(null);
    const [attendeeSearchTerm, setAttendeeSearchTerm] = useState("");
    const [attendeeSortOrder, setAttendeeSortOrder] = useState<'az' | 'za' | 'status'>('az');
    const [attendeeViewMode, setAttendeeViewMode] = useState<'list' | 'card'>('list');

    // Attendee Management State
    const [originalAttendance, setOriginalAttendance] = useState<Record<string, boolean>>({});
    const [attendanceChanges, setAttendanceChanges] = useState<Record<string, boolean>>({});
    const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
    const [mode, setMode] = useState<"view" | "attendance" | "delete">("view");
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [confirmationState, setConfirmationState] = useState<{ isOpen: boolean; title: string; message: React.ReactNode; onConfirm: (() => void) | null; confirmVariant?: "primary" | "danger"; confirmText?: string; cancelText?: string; }>({ isOpen: false, title: "", message: "", onConfirm: null });
    const [isExporting, setIsExporting] = useState<boolean>(false);


    // --- Fetch Functions ---
    const fetchUserApprovedEvents = useCallback(async () => {
        if (!user?.id) { setEventError("Không tìm thấy thông tin người dùng."); setIsLoadingEvents(false); setUserApprovedEvents([]); return; }
        setIsLoadingEvents(true); setEventError(null); setUserApprovedEvents([]);
        try {
            const tk = localStorage.getItem("authToken"); if (!tk) throw new Error("Chưa đăng nhập."); const h = { Authorization: `Bearer ${tk}` }; const cId = user.id;
            const url = `http://localhost:8080/identity/api/events/creator/${cId}`;
            const evRes = await fetch(url, { headers: h, cache: "no-store" });
            if (!evRes.ok) { const d = await evRes.json().catch(() => ({})); throw new Error(d?.message || `Lỗi tải sự kiện (${evRes.status})`); }
            const data = await evRes.json();
            if (data.code === 1000 && Array.isArray(data.result)) {
                const approved = data.result.filter((e: any) => e.status === "APPROVED").map((e:any) => ({ id: e.id, name: e.name, time: e.time, location: e.location, status: e.status, createdAt: e.createdAt }));
                setUserApprovedEvents(approved);
            } else { setUserApprovedEvents([]); console.warn("API creator events returned unexpected data:", data); }
        } catch (e: any) { console.error("Lỗi fetch UserApprovedEvents:", e); setEventError(e.message || "Lỗi không xác định khi tải sự kiện"); } finally { setIsLoadingEvents(false); }
    }, [user]);

    const fetchAttendees = useCallback(async () => {
        if (!selectedEventId) return;
        setIsLoadingAttendees(true); setAttendeeError(null); setAttendees([]); setOriginalAttendance({}); setAttendanceChanges({}); setSelectedForDelete(new Set());
        try {
            const token = localStorage.getItem("authToken"); if (!token) throw new Error("Chưa đăng nhập."); const h = { Authorization: `Bearer ${token}` };
            const res = await fetch(`http://localhost:8080/identity/api/events/${selectedEventId}/attendees`, { headers: h });
            if (!res.ok) { let m = `Lỗi tải danh sách người tham gia`; try { const d = await res.json(); m = d.message || m; } catch (_) {} throw new Error(`${m} (${res.status})`); }
            const data = await res.json();
            if (data.code === 1000 && Array.isArray(data.result)) {
                const fetched: Attendee[] = data.result; const userMap = new Map<string, Attendee>(); fetched.forEach((a) => { if (a.userId && !userMap.has(a.userId)) { userMap.set(a.userId, a); } });
                const uniqueAttendees = Array.from(userMap.values()); setAttendees(uniqueAttendees); const initialAttendance: Record<string, boolean> = {}; uniqueAttendees.forEach((a) => { if (a.userId) initialAttendance[a.userId] = a.attending ?? false; }); setOriginalAttendance(initialAttendance); setAttendanceChanges(initialAttendance);
            } else { throw new Error(data.message || "Lỗi định dạng dữ liệu người tham gia"); }
        } catch (err: any) { console.error("Lỗi fetchAttendees:", err); setAttendeeError(err.message || "Lỗi không xác định khi tải người tham gia"); setAttendees([]); } finally { setIsLoadingAttendees(false); }
    }, [selectedEventId]);

    // --- useEffects ---
    useEffect(() => { fetchUserApprovedEvents(); }, [fetchUserApprovedEvents]);
    useEffect(() => { if (selectedEventId) { fetchAttendees(); } else { setAttendees([]); setOriginalAttendance({}); setAttendanceChanges({}); setSelectedForDelete(new Set()); setMode("view"); } }, [selectedEventId, fetchAttendees]);

    // --- Handlers ---
    const handleSelectEvent = (eventId: string) => { setSelectedEventId(eventId); setMode("view"); setAttendeeSearchTerm(""); setAttendeeSortOrder("az"); setAttendeeViewMode("list");}; // Reset attendee state on new event select
    const handleBackToEventList = () => { setSelectedEventId(null); /* Attendee state reset by useEffect */};
    const handleSetMode = (newMode: "view" | "attendance" | "delete") => { setMode(newMode); setSelectedForDelete(new Set()); setAttendanceChanges({ ...originalAttendance }); };
    const handleCancelMode = () => { handleSetMode("view"); };
    const handleAttendanceCheckboxChange = (userId: string, isChecked: boolean) => { setAttendanceChanges((prev) => ({ ...prev, [userId]: isChecked })); };
    const handleDeleteCheckboxChange = (userId: string, isChecked: boolean) => { setSelectedForDelete((prev) => { const next = new Set(prev); if (isChecked) { next.add(userId); } else { next.delete(userId); } return next; }); };
    const handleSelectAllForDelete = (event: React.ChangeEvent<HTMLInputElement>) => { const isChecked = event.target.checked; if (isChecked) { setSelectedForDelete(new Set(processedAttendees.map((att) => att.userId))); } else { setSelectedForDelete(new Set()); } }; // Use processedAttendees
    const handleSaveChanges = async () => { /* Kept as is */ if (!selectedEventId || isProcessing) return; const changes: { userId: string; status: boolean }[] = []; Object.keys(attendanceChanges).forEach((id) => { if (attendanceChanges[id] !== originalAttendance[id]) { changes.push({ userId: id, status: attendanceChanges[id] }); } }); if (changes.length === 0) { toast("Không có thay đổi để lưu.", { icon: "ℹ️" }); setMode("view"); return; } setIsProcessing(true); const loadId = toast.loading(`Đang lưu ${changes.length} thay đổi...`); const token = localStorage.getItem("authToken"); if (!token) { toast.error("Token không hợp lệ.", { id: loadId }); setIsProcessing(false); return; } const promises = changes.map(({ userId, status }) => { const url = `http://localhost:8080/identity/api/events/${selectedEventId}/attendees/${userId}?isAttending=${status}`; return fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${token}` } }).then(async (res) => { if (!res.ok) { let m = `Lỗi lưu ${userId}`; try { const d = await res.json(); m = d.message || m; } catch (_) {} return { status: "rejected", reason: m, userId }; } return { status: "fulfilled", value: { userId, status } }; }).catch((err) => ({ status: "rejected", reason: err.message, userId })); }); const results = await Promise.allSettled(promises); let ok = 0, fail = 0; const successUpdates: Record<string, boolean> = {}; results.forEach((r) => { if (r.status === 'fulfilled' && r.value.status === 'fulfilled') { ok++; successUpdates[r.value.value.userId] = r.value.value.status; } else { fail++; const reason = r.status === 'rejected' ? r.reason : r.value.reason; const failedUserId = r.status === 'rejected' ? (r.reason as any)?.userId : r.value.userId; console.error(`Lỗi lưu UserID ${failedUserId || 'unknown'}:`, reason); } }); if (ok > 0) { setOriginalAttendance((prev) => ({ ...prev, ...successUpdates })); setAttendanceChanges((prev) => ({ ...prev, ...successUpdates })); toast.success(`Đã lưu ${ok} thay đổi.`, { id: loadId }); } if (fail > 0) { toast.error(`Lưu thất bại ${fail} thay đổi.`, { id: ok === 0 ? loadId : undefined }); } else if (ok === 0 && fail === 0) { toast.dismiss(loadId); } setIsProcessing(false); setMode("view"); };
    const executeBatchDelete = async () => { /* Kept as is */ const idsToDelete = Array.from(selectedForDelete); if (!selectedEventId || idsToDelete.length === 0 || isProcessing) return; setIsProcessing(true); const loadId = toast.loading(`Đang xóa ${idsToDelete.length} người...`); const token = localStorage.getItem("authToken"); if (!token) { toast.error("Token không hợp lệ.", { id: loadId }); setIsProcessing(false); return; } const promises = idsToDelete.map((userId) => { const url = `http://localhost:8080/identity/api/events/${selectedEventId}/attendees/${userId}`; return fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).then(async (res) => { if (!res.ok) { let m = `Lỗi xóa ${userId}`; try { const d = await res.json(); m = d.message || m; } catch (_) {} return { status: "rejected", reason: m, userId }; } return { status: "fulfilled", value: userId }; }).catch((err) => ({ status: "rejected", reason: err.message, userId })); }); const results = await Promise.allSettled(promises); let ok = 0, fail = 0; const successfullyDeletedIds = new Set<string>(); results.forEach((r) => { if (r.status === "fulfilled" && r.value.status === 'fulfilled') { ok++; successfullyDeletedIds.add(r.value.value); } else { fail++; const reason = r.status === 'rejected' ? r.reason : r.value.reason; const failedUserId = r.status === 'rejected' ? (r.reason as any)?.userId : r.value.userId; console.error(`Lỗi xóa UserID ${failedUserId || 'unknown'}:`, reason); } }); if (ok > 0) { setAttendees((prev) => prev.filter((att) => !successfullyDeletedIds.has(att.userId))); const newAttendance = { ...originalAttendance }; successfullyDeletedIds.forEach((id) => delete newAttendance[id]); setOriginalAttendance(newAttendance); setAttendanceChanges(newAttendance); setSelectedForDelete(new Set()); toast.success(`Đã xóa ${ok} người.`, { id: loadId }); } if (fail > 0) { toast.error(`Xóa thất bại ${fail} người.`, { id: ok === 0 ? loadId : undefined }); } else if (ok === 0 && fail === 0) { toast.dismiss(loadId); } setIsProcessing(false); setMode("view"); };
    const handleConfirmBatchDelete = () => { /* Kept as is */ const ids = Array.from(selectedForDelete); if (ids.length === 0) { toast.error("Vui lòng chọn ít nhất một người để xóa."); return; } setConfirmationState({ isOpen: true, title: "Xác nhận xóa", message: (<>Bạn chắc chắn muốn xóa <strong className="text-red-600">{ids.length} người</strong> đã chọn?</>), onConfirm: () => { setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null }); executeBatchDelete(); }, onCancel: () => setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null }), confirmVariant: "danger", confirmText: `Xóa (${ids.length})`, cancelText: "Hủy", }); };
    const handleEventStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { const newStartDate = e.target.value; setEventStartDateFilter(newStartDate); if (eventEndDateFilter && newStartDate > eventEndDateFilter) { setEventEndDateFilter(""); toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: '⚠️' }); }};
    const handleEventEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { const newEndDate = e.target.value; if (eventStartDateFilter && newEndDate < eventStartDateFilter) { toast.error("Ngày kết thúc không thể trước ngày bắt đầu."); } else { setEventEndDateFilter(newEndDate); }};
    const handleExportClick = async (eventId: string | undefined) => { /* Kept as is */ if (!eventId) { toast.error("Không tìm thấy ID sự kiện."); return; } setIsExporting(true); const exportToastId = toast.loading("Đang chuẩn bị file..."); try { const token = localStorage.getItem("authToken"); if (!token) throw new Error("Token không hợp lệ."); const url = `http://localhost:8080/identity/api/events/${eventId}/export`; const response = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", }, }); if (!response.ok) { let errorMsg = `Lỗi export (${response.status})`; try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch (e) { try { const txt = await response.text(); errorMsg = `${errorMsg}: ${txt.slice(0, 100)}`; } catch (_) {} } throw new Error(errorMsg); } const contentDisposition = response.headers.get("Content-Disposition"); const filename = getFilenameFromHeader(contentDisposition); const blob = await response.blob(); const downloadUrl = window.URL.createObjectURL(blob); const a = document.createElement("a"); a.href = downloadUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(downloadUrl); toast.success("Đã bắt đầu tải file!", { id: exportToastId }); } catch (err: any) { console.error("Lỗi xuất file:", err); toast.error(err.message || "Xuất file thất bại.", { id: exportToastId }); } finally { setIsExporting(false); } };

    // --- useMemo for Events (filter and sort) ---
    const processedEvents = useMemo(() => {
        let eventsToProcess = [...userApprovedEvents];

        // Filter by Time
         if (eventTimeFilter !== 'all') {
             const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
             const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
             eventsToProcess = eventsToProcess.filter(event => {
                 const dateStrToUse = event.time || event.createdAt;
                 if (!dateStrToUse) return false;
                 try {
                     const eventDate = new Date(dateStrToUse);
                     if (isNaN(eventDate.getTime())) return false;
                     switch (eventTimeFilter) {
                         case 'today': return eventDate >= todayStart && eventDate <= todayEnd;
                         case 'thisWeek': const { startOfWeek, endOfWeek } = getWeekRange(new Date()); return eventDate >= startOfWeek && eventDate <= endOfWeek;
                         case 'thisMonth': const { startOfMonth, endOfMonth } = getMonthRange(new Date()); return eventDate >= startOfMonth && eventDate <= endOfMonth;
                         case 'dateRange': if (!eventStartDateFilter || !eventEndDateFilter) return false; const start = new Date(eventStartDateFilter); start.setHours(0, 0, 0, 0); const end = new Date(eventEndDateFilter); end.setHours(23, 59, 59, 999); return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end && eventDate >= start && eventDate <= end;
                         default: return true;
                     }
                 } catch { return false; }
             });
         }

         // Filter by Search Term
         if (eventSearchTerm.trim()) {
             const lowerSearchTerm = eventSearchTerm.trim().toLowerCase();
             eventsToProcess = eventsToProcess.filter(event =>
                 event.name.toLowerCase().includes(lowerSearchTerm) ||
                 (event.location && event.location.toLowerCase().includes(lowerSearchTerm))
             );
         }

         // Sort (Default A-Z)
         if (eventSortOrder === 'za') { eventsToProcess.sort((a, b) => b.name.localeCompare(a.name, 'vi', { sensitivity: 'base' })); }
         else { eventsToProcess.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' })); }

         return eventsToProcess;
     }, [userApprovedEvents, eventTimeFilter, eventStartDateFilter, eventEndDateFilter, eventSearchTerm, eventSortOrder]);


    // --- useMemo for Attendees (filter and sort) ---
    const processedAttendees = useMemo(() => {
        let attendeesToProcess = [...attendees];
        if (attendeeSearchTerm.trim()) { const lowerSearchTerm = attendeeSearchTerm.trim().toLowerCase(); attendeesToProcess = attendeesToProcess.filter(att => getAttendeeName(att).toLowerCase().includes(lowerSearchTerm) || (att.username && att.username.toLowerCase().includes(lowerSearchTerm)) || (att.studentCode && att.studentCode.toLowerCase().includes(lowerSearchTerm)) ); }
        if (attendeeSortOrder === 'az') { attendeesToProcess.sort((a, b) => getAttendeeName(a).localeCompare(getAttendeeName(b), 'vi', { sensitivity: 'base' })); }
        else if (attendeeSortOrder === 'za') { attendeesToProcess.sort((a, b) => getAttendeeName(b).localeCompare(getAttendeeName(a), 'vi', { sensitivity: 'base' })); }
        else if (attendeeSortOrder === 'status') { attendeesToProcess.sort((a, b) => { const statusA = originalAttendance[a.userId] ?? false; const statusB = originalAttendance[b.userId] ?? false; if (statusA !== statusB) { return statusA ? -1 : 1; } return getAttendeeName(a).localeCompare(getAttendeeName(b), 'vi', { sensitivity: 'base' }); }); }
        return attendeesToProcess;
    }, [attendees, attendeeSearchTerm, attendeeSortOrder, originalAttendance]);

    // Memoized event name
    const selectedEventName = useMemo(() => userApprovedEvents.find((event) => event.id === selectedEventId)?.name, [userApprovedEvents, selectedEventId]);

    // --- Render Logic ---
    return (
        <div className="flex flex-col h-full p-3 md:p-5 bg-gray-50">
            <h2 className="text-xl md:text-2xl font-bold text-teal-600 mb-4 pb-3 border-b border-gray-200 flex-shrink-0">
                {selectedEventId ? `Quản lý tham gia: ${selectedEventName || '...'}` : "Chọn sự kiện để quản lý"}
            </h2>

            {/* === EVENT SELECTION VIEW === */}
            {!selectedEventId && (
                <>
                    {/* Event Controls Area */}
                    <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                             <div className="relative lg:col-span-1 xl:col-span-1">
                                 <label htmlFor="searchEvents" className="block text-xs font-medium text-gray-600 mb-1">Tìm sự kiện</label>
                                 <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">🔍</span>
                                 <input type="text" id="searchEvents" placeholder="Tên hoặc địa điểm..." value={eventSearchTerm} onChange={(e) => setEventSearchTerm(e.target.value)} className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 shadow-sm" />
                             </div>
                             <div>
                                <label htmlFor="sortEvents" className="block text-xs font-medium text-gray-600 mb-1">Sắp xếp sự kiện</label>
                                <select id="sortEvents" value={eventSortOrder} onChange={(e) => setEventSortOrder(e.target.value as 'az' | 'za')} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 h-full shadow-sm bg-white appearance-none pr-8" >
                                    <option value="az">Tên A-Z</option>
                                    <option value="za">Tên Z-A</option>
                                </select>
                             </div>
                             <div>
                                <label htmlFor="timeFilterEvents" className="block text-xs font-medium text-gray-600 mb-1">Lọc thời gian sự kiện</label>
                                <select id="timeFilterEvents" value={eventTimeFilter} onChange={(e) => setEventTimeFilter(e.target.value as 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'dateRange')} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 h-full shadow-sm bg-white appearance-none pr-8" >
                                    <option value="all">Tất cả</option>
                                    <option value="today">Hôm nay</option>
                                    <option value="thisWeek">Tuần này</option>
                                    <option value="thisMonth">Tháng này</option>
                                    <option value="dateRange">Khoảng ngày</option>
                                </select>
                             </div>
                             <div className="flex items-end justify-start md:justify-end gap-2 lg:col-start-auto xl:col-start-4">
                                  <label className="block text-xs font-medium text-gray-600 mb-1 invisible">Chế độ xem</label>
                                  <div className="flex w-full sm:w-auto">
                                     <button onClick={() => setEventViewMode('list')} title="Danh sách sự kiện" className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${ eventViewMode === 'list' ? 'bg-teal-600 border-teal-700 text-white shadow-sm z-10' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700' }`}>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                     </button>
                                     <button onClick={() => setEventViewMode('card')} title="Thẻ sự kiện" className={`flex-1 sm:flex-none p-2 rounded-r-md border transition duration-150 ease-in-out ${ eventViewMode === 'card' ? 'bg-teal-600 border-teal-700 text-white shadow-sm z-10' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700' }`}>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" clipRule="evenodd" fillRule="evenodd" /><path d="M7 7h6v2H7V7zm0 4h6v2H7v-2z" /></svg>
                                     </button>
                                 </div>
                             </div>
                        </div>
                    </div>
                    {eventTimeFilter === 'dateRange' && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3 bg-teal-50 rounded-lg border border-teal-200 shadow-sm">
                             <div>
                                 <label htmlFor="startDateFilterEvents" className="block text-sm font-medium text-gray-700 mb-1"><span className="inline-block mr-1">🗓️</span> Từ ngày</label>
                                 <input type="date" id="startDateFilterEvents" value={eventStartDateFilter} onChange={handleEventStartDateChange} max={eventEndDateFilter || undefined} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 shadow-sm bg-white" aria-label="Ngày bắt đầu lọc sự kiện" />
                             </div>
                             <div>
                                 <label htmlFor="endDateFilterEvents" className="block text-sm font-medium text-gray-700 mb-1"><span className="inline-block mr-1">🗓️</span> Đến ngày</label>
                                 <input type="date" id="endDateFilterEvents" value={eventEndDateFilter} onChange={handleEventEndDateChange} min={eventStartDateFilter || undefined} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 shadow-sm bg-white" aria-label="Ngày kết thúc lọc sự kiện" />
                             </div>
                         </div>
                     )}
                    <div className="overflow-y-auto flex-grow mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {isLoadingEvents ? ( <p className="text-center text-gray-500 italic py-5"> Đang tải sự kiện...</p> ) :
                         eventError ? ( <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{eventError}</p> ) :
                         processedEvents.length === 0 ? ( <p className="text-center text-gray-500 italic py-5">{eventSearchTerm || eventTimeFilter !== 'all' ? "Không tìm thấy sự kiện nào khớp bộ lọc." : "Bạn không có sự kiện nào đã được duyệt."}</p> ) :
                         (
                             eventViewMode === 'list' ? (
                                <div className="space-y-2"> {processedEvents.map((event) => ( <button key={event.id} onClick={() => handleSelectEvent(event.id)} className="w-full text-left p-3 bg-white cursor-pointer rounded-lg border border-gray-200 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-teal-300 shadow-sm" > <p className="font-semibold text-gray-800">{event.name}</p> {(event.time || event.createdAt) && ( <p className="text-sm text-gray-500 mt-1">📅 {event.time ? new Date(event.time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : `(Tạo) ${new Date(event.createdAt!).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}`}</p> )} {event.location && ( <p className="text-sm text-gray-500">📍 {event.location}</p> )} </button> ))} </div>
                             ) : (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {processedEvents.map((event) => ( <button key={event.id} onClick={() => handleSelectEvent(event.id)} className="p-4 bg-white shadow rounded-lg flex flex-col justify-between border border-gray-200 hover:shadow-md transition-shadow duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-300 text-left" > <div> <h3 className="font-semibold text-base text-gray-800 line-clamp-2 mb-1">{event.name}</h3> {(event.time || event.createdAt) && ( <p className="text-xs text-gray-500 mb-0.5">📅 {event.time ? new Date(event.time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : `(Tạo) ${new Date(event.createdAt!).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}`}</p> )} {event.location && <p className="text-xs text-gray-500">📍 {event.location}</p>} </div> </button> ))} </div>
                             )
                         )}
                    </div>
                </>
            )}

            {/* === ATTENDEE MANAGEMENT VIEW === */}
            {selectedEventId && (
                <>
                    <div className="mb-4 flex-shrink-0">
                         <button onClick={handleBackToEventList} className="text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50">
                             <ArrowLeftIcon className="h-4 w-4 mr-1" /> Quay lại chọn sự kiện
                         </button>
                    </div>
                    <div className="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
                              <div className="relative sm:col-span-1">
                                  <label htmlFor="searchAttendees" className="block text-xs font-medium text-gray-600 mb-1">Tìm người tham gia</label>
                                  <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">🔍</span>
                                  <input type="text" id="searchAttendees" placeholder="Tên, username, MSSV..." value={attendeeSearchTerm} onChange={(e) => setAttendeeSearchTerm(e.target.value)} className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 shadow-sm" />
                              </div>
                              <div className="sm:col-span-1">
                                 <label htmlFor="sortAttendees" className="block text-xs font-medium text-gray-600 mb-1">Sắp xếp người tham gia</label>
                                 <select id="sortAttendees" value={attendeeSortOrder} onChange={(e) => setAttendeeSortOrder(e.target.value as 'az' | 'za' | 'status')} className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-teal-500 focus:border-teal-500 h-full shadow-sm bg-white appearance-none pr-8" >
                                     <option value="az">Tên A-Z</option>
                                     <option value="za">Tên Z-A</option>
                                     <option value="status">Trạng thái điểm danh</option>
                                 </select>
                              </div>
                              <div className="flex items-end justify-start sm:justify-end gap-2 sm:col-span-1">
                                   <label className="block text-xs font-medium text-gray-600 mb-1 invisible">Chế độ xem</label>
                                   <div className="flex w-full sm:w-auto">
                                     <button onClick={() => setAttendeeViewMode('list')} title="Danh sách" className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${ attendeeViewMode === 'list' ? 'bg-teal-600 border-teal-700 text-white shadow-sm z-10' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700' }`}>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                     </button>
                                     <button onClick={() => setAttendeeViewMode('card')} title="Thẻ" className={`flex-1 sm:flex-none p-2 rounded-r-md border transition duration-150 ease-in-out ${ attendeeViewMode === 'card' ? 'bg-teal-600 border-teal-700 text-white shadow-sm z-10' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700' }`}>
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" clipRule="evenodd" fillRule="evenodd" /><path d="M7 7h6v2H7V7zm0 4h6v2H7v-2z" /></svg>
                                     </button>
                                 </div>
                              </div>
                         </div>
                     </div>
                    <div className="overflow-y-auto flex-grow mb-4 pr-1 min-h-[300px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                         {isLoadingAttendees ? ( <p className="text-center text-gray-500 italic py-5"> Đang tải...</p> ) :
                          attendeeError ? ( <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{attendeeError}</p> ) :
                          processedAttendees.length === 0 ? ( <p className="text-center text-gray-500 italic py-5">{attendeeSearchTerm ? "Không tìm thấy người nào khớp." : "Chưa có người tham gia."}</p> ) :
                          (
                            <div className="space-y-0">
                                {mode === "delete" && ( <div className="flex items-center justify-between border-b pb-2 mb-2 sticky top-0 bg-gray-50 py-2 z-10 px-1 -mx-1 rounded-t-md"> <div className="flex items-center"> <input type="checkbox" id={`select-all-delete`} className="mr-2 cursor-pointer h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded" checked={attendees.length > 0 && selectedForDelete.size === processedAttendees.length} onChange={handleSelectAllForDelete} disabled={processedAttendees.length === 0 || isProcessing} /> <label htmlFor={`select-all-delete`} className="text-sm text-gray-600 cursor-pointer">Chọn tất cả ({selectedForDelete.size})</label> </div> </div> )}
                                {mode === "attendance" && ( <div className="text-right border-b pb-2 mb-2 sticky top-0 bg-gray-50 py-2 z-10 px-1 -mx-1 rounded-t-md"> <p className="text-sm text-gray-500 italic">Đánh dấu vào ô để xác nhận có mặt.</p> </div> )}
                                {attendeeViewMode === 'list' ? (
                                    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                                        {processedAttendees.map((attendee) => { const isSelectedForDelete = selectedForDelete.has(attendee.userId); const isCheckedForAttendance = attendanceChanges[attendee.userId] ?? false; const isRowProcessing = isProcessing; return ( <li key={attendee.userId} className={`flex items-center justify-between p-3 transition-colors ${ mode === "delete" && isSelectedForDelete ? "bg-red-50" : "hover:bg-gray-50"} ${isRowProcessing ? 'opacity-70' : ''}`} > <div className="flex items-center gap-3 flex-grow mr-2 overflow-hidden"> {mode === "delete" && ( <input type="checkbox" checked={isSelectedForDelete} onChange={(e) => handleDeleteCheckboxChange( attendee.userId, e.target.checked )} disabled={isRowProcessing} aria-labelledby={`attendee-name-list-${attendee.userId}`} className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer flex-shrink-0 disabled:opacity-50"/> )} {mode === "attendance" && ( <input type="checkbox" checked={isCheckedForAttendance} onChange={(e) => handleAttendanceCheckboxChange( attendee.userId, e.target.checked )} disabled={isRowProcessing} aria-labelledby={`attendee-name-list-${attendee.userId}`} className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer flex-shrink-0 disabled:opacity-50"/> )} <img src={attendee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(getAttendeeName(attendee))}&background=random&color=fff&size=96`} alt={`Avatar of ${getAttendeeName(attendee)}`} className="w-8 h-8 rounded-full object-cover flex-shrink-0 bg-gray-200"/> <div className="flex-grow overflow-hidden"> <p id={`attendee-name-list-${attendee.userId}`} className={`font-semibold text-sm truncate ${mode === "delete" && isSelectedForDelete ? "text-red-800" : "text-gray-800"}`} > {getAttendeeName(attendee)} </p> <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5"> {attendee.studentCode && (<span className="text-blue-600">MSSV: {attendee.studentCode}</span>)} {attendee.username && (<span>@{attendee.username}</span>)} {attendee.roleName && (<span className="italic">({attendee.roleName})</span>)} {attendee.positionName && (<span className="font-medium">[{attendee.positionName}]</span>)} </div> </div> </div> {mode === "view" && ( <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${ originalAttendance[attendee.userId] ?? false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600" }`} > {originalAttendance[attendee.userId] ?? false ? "Có mặt" : "Vắng"} </span> )} {mode === "attendance" && ( <span className={`flex-shrink-0 p-1 rounded-full ${ isCheckedForAttendance ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600" }`} > {isCheckedForAttendance ? <CheckIcon className="w-4 h-4" /> : <Cross2Icon className="w-4 h-4" />} </span> )} </li> ); })}
                                     </ul>
                                 ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {processedAttendees.map((attendee) => { const isSelectedForDelete = selectedForDelete.has(attendee.userId); const isCheckedForAttendance = attendanceChanges[attendee.userId] ?? false; const isRowProcessing = isProcessing; return ( <div key={attendee.userId} className={`p-3 bg-white shadow rounded-lg flex flex-col border transition-colors ${ mode === "delete" && isSelectedForDelete ? "border-red-300 bg-red-50" : "border-gray-200" } ${isRowProcessing ? 'opacity-70' : ''}`}> <div className="flex items-start gap-3 mb-2"> {mode === "delete" && ( <input type="checkbox" checked={isSelectedForDelete} onChange={(e) => handleDeleteCheckboxChange( attendee.userId, e.target.checked )} disabled={isRowProcessing} aria-labelledby={`attendee-name-card-${attendee.userId}`} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer flex-shrink-0 disabled:opacity-50"/> )} {mode === "attendance" && ( <input type="checkbox" checked={isCheckedForAttendance} onChange={(e) => handleAttendanceCheckboxChange( attendee.userId, e.target.checked )} disabled={isRowProcessing} aria-labelledby={`attendee-name-card-${attendee.userId}`} className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer flex-shrink-0 disabled:opacity-50"/> )} <img src={attendee.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(getAttendeeName(attendee))}&background=random&color=fff&size=96`} alt={`Avatar of ${getAttendeeName(attendee)}`} className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-200"/> <div className="flex-grow overflow-hidden"> <p id={`attendee-name-card-${attendee.userId}`} className={`font-semibold text-sm truncate ${mode === "delete" && isSelectedForDelete ? "text-red-800" : "text-gray-800"}`} > {getAttendeeName(attendee)} </p> {attendee.username && (<p className="text-xs text-gray-500 truncate">@{attendee.username}</p>)} </div> {mode === "view" && ( <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${ originalAttendance[attendee.userId] ?? false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600" }`} > {originalAttendance[attendee.userId] ?? false ? "Có mặt" : "Vắng"} </span> )} {mode === "attendance" && ( <span className={`flex-shrink-0 p-1 rounded-full ${ isCheckedForAttendance ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600" }`} > {isCheckedForAttendance ? <CheckIcon className="w-3 h-3" /> : <Cross2Icon className="w-3 h-3" />} </span> )} </div> <div className={`space-y-1 text-xs text-gray-600 pl-3 border-l ml-5 border-gray-200 ${mode !== 'view' ? 'pl-[27px] ml-0 border-l-0' : ''}`}> {attendee.studentCode && (<p className="flex items-center gap-1"><IdCardIcon className="w-3 h-3 text-blue-500 flex-shrink-0"/> <span className="truncate">MSSV: {attendee.studentCode}</span></p>)} {attendee.roleName && (<p className="flex items-center gap-1"><PersonIcon className="w-3 h-3 text-purple-500 flex-shrink-0"/> <span className="truncate italic">({attendee.roleName})</span></p>)} {attendee.positionName && (<p className="flex items-center gap-1"><Link2Icon className="w-3 h-3 text-orange-500 flex-shrink-0"/> <span className="truncate font-medium">[{attendee.positionName}]</span></p>)} </div> </div> ); })}
                                    </div>
                                 )}
                            </div>
                         )}
                     </div>
                     {selectedEventId && !isLoadingAttendees && attendees.length > 0 && ( <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-auto flex-shrink-0 gap-3 flex-wrap"> <div> {mode === "view" && ( <div className="flex gap-2 flex-wrap"> <button onClick={() => handleSetMode("attendance")} disabled={isProcessing} className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 shadow-sm border border-green-200"> <CheckIcon /> Điểm danh </button> <button onClick={() => handleSetMode("delete")} disabled={isProcessing} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 shadow-sm border border-red-200"> <TrashIcon /> Xóa người </button> </div> )} {mode === "attendance" && ( <div className="flex gap-2"> <button onClick={handleCancelMode} disabled={isProcessing} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 shadow-sm border border-gray-300"> Hủy </button> <button onClick={handleSaveChanges} disabled={isProcessing || Object.keys(attendanceChanges).every(k => attendanceChanges[k] === originalAttendance[k])} className={`px-4 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium cursor-pointer ${ isProcessing || Object.keys(attendanceChanges).every(k => attendanceChanges[k] === originalAttendance[k]) ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700" }`}> {isProcessing ? "Đang lưu..." : "Lưu điểm danh"} </button> </div> )} {mode === "delete" && ( <div className="flex gap-2"> <button onClick={handleCancelMode} disabled={isProcessing} className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 shadow-sm border border-gray-300"> Hủy </button> <button onClick={handleConfirmBatchDelete} disabled={isProcessing || selectedForDelete.size === 0} className={`px-4 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium cursor-pointer inline-flex items-center gap-1 ${ isProcessing || selectedForDelete.size === 0 ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700" }`}> <TrashIcon /> Xóa ({selectedForDelete.size}) </button> </div> )} </div> </div> )}
                </>
            )}

            {/* Confirmation Dialog Render */}
            <ConfirmationDialog isOpen={confirmationState.isOpen} title={confirmationState.title} message={confirmationState.message} confirmVariant={confirmationState.confirmVariant} confirmText={confirmationState.confirmText} cancelText={confirmationState.cancelText} onConfirm={confirmationState.onConfirm || (() => {})} onCancel={() => setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null })} />
        </div>
    );
};

export default AttendeesTabContent;