"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { User } from '../homeuser'; // Adjust import path if needed

interface EventType {
    id: string;
    name: string;
    time?: string; // Main event date/time
    location?: string;
    content?: string;
    status: "APPROVED" | "PENDING" | "REJECTED" | string;
    rejectionReason?: string;
    purpose?: string;
    createdBy?: string;
    createdAt?: string; // Fallback date/time
    organizers?: any[];
    participants?: any[];
    attendees?: any[];
    permissions?: string[];
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

// --- Export Helper ---
const getFilenameFromHeader = (header: string | null): string => {
    const defaultFilename = "event_export.docx";
    if (!header) return defaultFilename;
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(header);
    if (matches?.[1]) {
        let filename = matches[1].replace(/['"]/g, "");
        try {
            if (filename.toLowerCase().startsWith("utf-8''")) {
                filename = decodeURIComponent(filename.substring(7));
            } else {
                filename = decodeURIComponent(filename);
            }
        } catch (e) {
            console.error("Error decoding filename:", e);
        }
        if (!filename.toLowerCase().endsWith(".docx")) {
            const nameWithoutExt = filename.includes(".")
                ? filename.substring(0, filename.lastIndexOf("."))
                : filename;
            filename = nameWithoutExt + ".docx";
        }
        return filename;
    }
    return defaultFilename;
};

interface MyEventsTabContentProps {
    user: User | null;
}

const MyEventsTabContent: React.FC<MyEventsTabContentProps> = ({ user }) => {
    const [tab, setTab] = useState<'approved' | 'pending' | 'rejected'>('approved');
    const [events, setEvents] = useState<EventType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [viewingEventDetails, setViewingEventDetails] = useState<EventType | null>(null);
    const [isExporting, setIsExporting] = useState<boolean>(false);

    // State for new features
    const [searchTerm, setSearchTerm] = useState("");
    const [sortOrder, setSortOrder] = useState<'az' | 'za'>('az'); // Default sort A-Z
    const [timeFilterOption, setTimeFilterOption] = useState<'all' | 'today' | 'thisWeek' | 'thisMonth' | 'dateRange'>('all');
    const [startDateFilter, setStartDateFilter] = useState<string>("");
    const [endDateFilter, setEndDateFilter] = useState<string>("");
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');


    const fetchEvents = useCallback(async () => {
         if (!user?.id) {
            setError("Không tìm thấy thông tin người dùng.");
            setLoading(false);
            setEvents([]);
            return;
         }
         setLoading(true);
         setError("");
         try {
             const token = localStorage.getItem("authToken");
             if (!token) throw new Error("Chưa đăng nhập.");
             const userId = user.id;
              const eventsRes = await fetch(
                   `http://localhost:8080/identity/api/events/creator/${userId}`,
                   { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
             );
             if (!eventsRes.ok) {
                  const d = await eventsRes.json().catch(() => ({}));
                  throw new Error(d?.message || `Lỗi tải sự kiện (${eventsRes.status})`);
              }
             const data = await eventsRes.json();
             if (data.code === 1000 && Array.isArray(data.result)) {
                  setEvents(data.result);
              } else {
                  setEvents([]);
                  console.warn("API /creator/ không trả về mảng event:", data);
              }
         } catch (err: any) {
              console.error("Lỗi tải sự kiện:", err);
              setError(err.message || "Lỗi tải sự kiện");
              setEvents([]);
         } finally {
              setLoading(false);
         }
    }, [user]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Updated processing logic
    const processedEvents = useMemo(() => {
        let eventsToProcess = [...events];

        // 1. Filter by Status Tab
        eventsToProcess = eventsToProcess.filter((event) => {
            const s = event.status?.toUpperCase();
            if (tab === "approved") return s === "APPROVED";
            if (tab === "pending") return s === "PENDING";
            if (tab === "rejected") return s === "REJECTED";
            return false;
        });

        // 2. Filter by Time
        if (timeFilterOption !== 'all') {
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

            eventsToProcess = eventsToProcess.filter(event => {
                const dateStrToUse = event.time || event.createdAt;
                if (!dateStrToUse) return false; // Cannot filter if no date

                try {
                    const eventDate = new Date(dateStrToUse);
                    if (isNaN(eventDate.getTime())) return false; // Invalid date

                    switch (timeFilterOption) {
                        case 'today':
                             return eventDate >= todayStart && eventDate <= todayEnd;
                        case 'thisWeek':
                            const { startOfWeek, endOfWeek } = getWeekRange(new Date());
                            return eventDate >= startOfWeek && eventDate <= endOfWeek;
                        case 'thisMonth':
                            const { startOfMonth, endOfMonth } = getMonthRange(new Date());
                            return eventDate >= startOfMonth && eventDate <= endOfMonth;
                        case 'dateRange':
                            if (!startDateFilter || !endDateFilter) return false;
                            const start = new Date(startDateFilter); start.setHours(0, 0, 0, 0);
                            const end = new Date(endDateFilter); end.setHours(23, 59, 59, 999);
                            return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end && eventDate >= start && eventDate <= end;
                        default: return true;
                    }
                } catch (e) {
                    console.error("Error parsing event date for filtering:", dateStrToUse, e);
                    return false;
                }
            });
        }

        // 3. Filter by Search Term
        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.trim().toLowerCase();
            eventsToProcess = eventsToProcess.filter(event =>
                event.name.toLowerCase().includes(lowerSearchTerm) ||
                (event.location && event.location.toLowerCase().includes(lowerSearchTerm))
            );
        }

        // 4. Sort (Default A-Z)
        if (sortOrder === 'za') {
            eventsToProcess.sort((a, b) => b.name.localeCompare(a.name, 'vi', { sensitivity: 'base' }));
        } else { // Default: 'az'
            eventsToProcess.sort((a, b) => a.name.localeCompare(a.name, 'vi', { sensitivity: 'base' }));
        }

        return eventsToProcess;

    }, [events, tab, timeFilterOption, startDateFilter, endDateFilter, searchTerm, sortOrder]);


    const handleExportClick = async (eventId: string | undefined) => {
         if (!eventId) {
             toast.error("Không tìm thấy ID sự kiện.");
             return;
         }
         setIsExporting(true);
         const exportToastId = toast.loading("Đang chuẩn bị file Word...");
         try {
              const token = localStorage.getItem("authToken");
              if (!token) throw new Error("Token không hợp lệ.");
              const url = `http://localhost:8080/identity/api/events/${eventId}/export`;

              const response = await fetch(url, {
                  method: "GET",
                  headers: {
                      Authorization: `Bearer ${token}`,
                      Accept: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  },
              });

              if (!response.ok) {
                   let errorMsg = `Lỗi export (${response.status})`;
                   try {
                       const errData = await response.json();
                       errorMsg = errData.message || errorMsg;
                   } catch (e) {
                       try {
                           const txt = await response.text();
                           errorMsg = `${errorMsg}: ${txt.slice(0, 100)}`;
                       } catch (_) { }
                   }
                   throw new Error(errorMsg);
              }

              const contentDisposition = response.headers.get("Content-Disposition");
              const filename = getFilenameFromHeader(contentDisposition);

              const blob = await response.blob();
              const actualMimeType = response.headers.get("content-type")?.split(";")[0];
              if (actualMimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                   console.warn(`API trả về Content-Type không khớp: ${actualMimeType} (mong đợi DOCX)`);
              }

              const downloadUrl = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = downloadUrl;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(downloadUrl);
              toast.success("Đã bắt đầu tải file Word!", { id: exportToastId });
         } catch (err: any) {
              console.error("Lỗi xuất file Word:", err);
              toast.error(err.message || "Xuất file thất bại.", { id: exportToastId });
         } finally {
              setIsExporting(false);
         }
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartDate = e.target.value;
        setStartDateFilter(newStartDate);
        if (endDateFilter && newStartDate > endDateFilter) {
            setEndDateFilter("");
            toast("Ngày bắt đầu không thể sau ngày kết thúc. Đã đặt lại ngày kết thúc.", { icon: '⚠️' });
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEndDate = e.target.value;
        if (startDateFilter && newEndDate < startDateFilter) {
            toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
        } else {
            setEndDateFilter(newEndDate);
        }
    };


    const renderEventDetails = (event: EventType) => {
         return (
              <div className="p-1 flex-grow overflow-y-auto mb-4 pr-2 bg-white p-4 rounded-lg shadow border">
                  <button
                       onClick={() => setViewingEventDetails(null)}
                       className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50"
                   >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} >
                           <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                       </svg>
                       Quay lại danh sách
                   </button>
                   <h3 className="text-xl font-bold text-gray-800 mb-4">{event.name}</h3>
                   <div className="space-y-2 text-sm text-gray-700">

                       {event.status && (
                            <p>
                                <strong className="font-medium text-gray-900 w-28 inline-block">Trạng thái:</strong>
                                <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                                      event.status === "APPROVED" ? "bg-green-100 text-green-700" :
                                      event.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                                      event.status === "REJECTED" ? "bg-red-100 text-red-700" :
                                      "bg-gray-100 text-gray-700" }`} >
                                    {event.status}
                                </span>
                            </p>
                       )}
                       {event.time && (
                            <p>
                                <strong className="font-medium text-gray-900 w-28 inline-block">Thời gian:</strong>{" "}
                                {new Date(event.time).toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short", })}
                            </p>
                       )}
                        {event.location && (
                            <p><strong className="font-medium text-gray-900 w-28 inline-block">Địa điểm:</strong> {event.location}</p>
                        )}
                        {event.purpose && (
                            <p><strong className="font-medium text-gray-900 w-28 inline-block">Mục đích:</strong> {event.purpose}</p>
                        )}
                        {event.content && (
                            <p>
                                <strong className="font-medium text-gray-900 w-28 inline-block align-top">Nội dung:</strong>{" "}
                                <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-7rem)]">{event.content}</span>
                            </p>
                        )}
                        {event.status === "REJECTED" && event.rejectionReason && (
                            <p className="text-red-600">
                                <strong className="font-medium text-red-800 w-28 inline-block">Lý do từ chối:</strong> {event.rejectionReason}
                            </p>
                        )}
                        {event.createdAt && (
                            <p>
                                <strong className="font-medium text-gray-900 w-28 inline-block">Ngày tạo:</strong>{" "}
                                {new Date(event.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", })}
                            </p>
                        )}
                   </div>

                   {event.status === "APPROVED" && (
                        <div className="mt-6 pt-4 border-t flex justify-end">
                            <button
                                onClick={() => handleExportClick(event.id)}
                                disabled={isExporting}
                                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                                    isExporting ? "opacity-50 cursor-not-allowed" : "" }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${isExporting ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} >
                                     {isExporting ? (
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                     ) : (
                                         <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                     )}
                                </svg>
                                {isExporting ? "Đang xuất..." : "Xuất file Word"}
                            </button>
                        </div>
                   )}
              </div>
         );
    };


    return (
        <div className="flex flex-col h-full p-3 md:p-5 bg-gray-50">
            <h2 className="text-xl md:text-2xl font-bold text-blue-600 mb-4 flex-shrink-0">
                 {viewingEventDetails ? "Chi tiết sự kiện" : "Sự kiện của tôi"}
            </h2>

            {viewingEventDetails ? (
                renderEventDetails(viewingEventDetails)
            ) : (
                <>
                    {/* Status Tabs */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
                        <button
                            onClick={() => setTab("approved")}
                            className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "approved" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700" }`}
                        >✅ Đã duyệt ({events.filter(e => e.status?.toUpperCase() === 'APPROVED').length})</button>
                        <button
                            onClick={() => setTab("pending")}
                            className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "pending" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700" }`}
                        >⏳ Chờ duyệt ({events.filter(e => e.status?.toUpperCase() === 'PENDING').length})</button>
                        <button
                            onClick={() => setTab("rejected")}
                            className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${ tab === "rejected" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700" }`}
                        >❌ Từ chối ({events.filter(e => e.status?.toUpperCase() === 'REJECTED').length})</button>
                    </div>

                    {/* --- Controls Container --- */}
                    <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                             {/* Search Input */}
                             <div className="relative lg:col-span-1 xl:col-span-1">
                                 <label htmlFor="searchMyEvents" className="block text-xs font-medium text-gray-600 mb-1">Tìm kiếm</label>
                                 <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">🔍</span>
                                 <input
                                     type="text"
                                     id="searchMyEvents"
                                     placeholder="Tên hoặc địa điểm..."
                                     value={searchTerm}
                                     onChange={(e) => setSearchTerm(e.target.value)}
                                     className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                 />
                             </div>
                             {/* Sort Select */}
                             <div>
                                <label htmlFor="sortMyEvents" className="block text-xs font-medium text-gray-600 mb-1">Sắp xếp</label>
                                <select
                                    id="sortMyEvents"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as 'az' | 'za')} // Updated type assertion
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-full shadow-sm bg-white appearance-none pr-8"
                                >
                                    {/* <option value="date">Ngày tạo mới nhất</option> <-- Removed */}
                                    <option value="az"> A - Z</option>
                                    <option value="za"> Z - A</option>
                                </select>
                             </div>
                             {/* Time Filter */}
                             <div>
                                <label htmlFor="timeFilterMyEvents" className="block text-xs font-medium text-gray-600 mb-1">Lọc thời gian</label>
                                <select
                                    id="timeFilterMyEvents"
                                    value={timeFilterOption}
                                    onChange={(e) => setTimeFilterOption(e.target.value as 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'dateRange')}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-full shadow-sm bg-white appearance-none pr-8"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="today">Hôm nay</option>
                                    <option value="thisWeek">Tuần này</option>
                                    <option value="thisMonth">Tháng này</option>
                                    <option value="dateRange">Khoảng ngày</option>
                                </select>
                             </div>
                             {/* View Toggle (Moved inside the grid for alignment) */}
                             <div className="flex items-end justify-start md:justify-end gap-2 lg:col-start-auto xl:col-start-4">
                                 <button onClick={() => setViewMode('card')} title="Chế độ thẻ"
                                         className={`p-2 rounded-md border transition duration-150 ease-in-out ${ viewMode === 'card' ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400' }`}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" clipRule="evenodd" fillRule="evenodd" /><path d="M7 7h6v2H7V7zm0 4h6v2H7v-2z" /></svg>
                                 </button>
                                 <button onClick={() => setViewMode('list')} title="Chế độ danh sách"
                                         className={`p-2 rounded-md border transition duration-150 ease-in-out ${ viewMode === 'list' ? 'bg-blue-600 border-blue-700 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400' }`}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                 </button>
                             </div>
                        </div>
                    </div>
                    {/* --- End Controls Container --- */}


                    {/* Date Range Picker (Moved Below Controls Container) */}
                    {timeFilterOption === 'dateRange' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                            <div>
                                <label htmlFor="startDateFilterMyEvents" className="block text-sm font-medium text-gray-700 mb-1">
                                    <span className="inline-block mr-1">🗓️</span> Từ ngày
                                </label>
                                <input
                                    type="date"
                                    id="startDateFilterMyEvents"
                                    value={startDateFilter}
                                    onChange={handleStartDateChange}
                                    max={endDateFilter || undefined}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                                    aria-label="Ngày bắt đầu lọc"
                                />
                            </div>
                            <div>
                                <label htmlFor="endDateFilterMyEvents" className="block text-sm font-medium text-gray-700 mb-1">
                                    <span className="inline-block mr-1">🗓️</span> Đến ngày
                                </label>
                                <input
                                    type="date"
                                    id="endDateFilterMyEvents"
                                    value={endDateFilter}
                                    onChange={handleEndDateChange}
                                    min={startDateFilter || undefined}
                                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                                    aria-label="Ngày kết thúc lọc"
                                />
                            </div>
                        </div>
                    )}


                    {/* Event List Area */}
                    <div className="overflow-y-auto flex-grow mb-1 pr-1 min-h-[300px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {loading ? (
                            <p className="text-gray-500 italic text-center py-4">Đang tải...</p>
                        ) : error ? (
                            <p className="text-red-500 italic text-center py-4 bg-red-50 border border-red-200 rounded p-3">{error}</p>
                        ) : processedEvents.length > 0 ? (
                            viewMode === 'card' ? (
                                // --- Card View ---
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                     {processedEvents.map((event) => (
                                        <div key={event.id} className="p-4 bg-white shadow rounded-lg flex flex-col justify-between border border-gray-200 hover:shadow-md transition-shadow duration-150 cursor-pointer" onClick={() => setViewingEventDetails(event)} >
                                            <div>
                                                <h3 className="font-semibold text-base text-gray-800 line-clamp-2 mb-1">{event.name}</h3>
                                                 {event.time && (
                                                     <p className="text-xs text-gray-500 mb-0.5">📅 {new Date(event.time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</p>
                                                 )}
                                                  {!event.time && event.createdAt && ( // Fallback to createdAt if time is missing
                                                     <p className="text-xs text-gray-500 mb-0.5">📅 (Tạo) {new Date(event.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</p>
                                                 )}
                                                 {event.location && <p className="text-xs text-gray-500">📍 {event.location}</p>}
                                             </div>
                                             {tab === "rejected" && event.rejectionReason && (
                                                 <p className="text-xs text-red-500 mt-2 pt-1 border-t border-dashed border-red-100 truncate">
                                                     <span className="font-medium">Lý do:</span> {event.rejectionReason}
                                                 </p>
                                             )}
                                         </div>
                                     ))}
                                </div>
                            ) : (
                                // --- List View ---
                                <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                                    <ul className="divide-y divide-gray-200">
                                        {processedEvents.map((event) => (
                                            <li key={event.id} className="px-3 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors duration-150 ease-in-out cursor-pointer" onClick={() => setViewingEventDetails(event)}>
                                                <div className="flex-1 mb-2 sm:mb-0 sm:pr-4">
                                                      <p className="font-semibold text-sm md:text-base text-gray-800 line-clamp-1">{event.name}</p>
                                                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                          {(event.time || event.createdAt) && <span className="inline-flex items-center gap-1">
                                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> </svg>
                                                              {event.time ? new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : `(Tạo) ${new Date(event.createdAt!).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}`}
                                                          </span>}
                                                          {event.location && <span className="inline-flex items-center gap-1">
                                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /> </svg>
                                                              {event.location}
                                                          </span>}
                                                      </div>
                                                      {tab === "rejected" && event.rejectionReason && (
                                                          <p className="text-xs text-red-500 mt-1.5"><span className="font-medium">Lý do:</span> {event.rejectionReason}</p>
                                                      )}
                                                 </div>
                                             </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        ) : (
                            <p className="text-gray-500 italic text-center py-6">
                                {searchTerm || timeFilterOption !== 'all' ? "Không tìm thấy sự kiện nào khớp." : "Không có sự kiện nào trong mục này."}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default MyEventsTabContent;