"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { User as MainUserType } from "../homeadmin"; // Adjust path if needed

// Interfaces
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

interface ApprovalTabContentProps {
    user: MainUserType | null;
}

// --- Helper Functions for Date Comparison ---

const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
};

const isThisWeek = (date: Date): boolean => {
    const today = new Date();
    const currentDay = today.getDay();
    const firstDayOfWeek = new Date(today);
    // Adjust to Monday (day 1, Sunday is 0)
    const diff = firstDayOfWeek.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    firstDayOfWeek.setDate(diff);
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
    lastDayOfWeek.setHours(23, 59, 59, 999);

    return date >= firstDayOfWeek && date <= lastDayOfWeek;
};

const isThisMonth = (date: Date): boolean => {
    const today = new Date();
    return (
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
    );
};

const formatDateForInput = (date: Date | null | undefined): string => {
    if (!date) return "";
    try {
        if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDate().toString().padStart(2, "0");
            return `${year}-${month}-${day}`;
        }
    } catch (e) {
        console.error("Error formatting date:", date, e);
    }
    return "";
};


// --- Main Tab Component ---
const ApprovalTabContent: React.FC<ApprovalTabContentProps> = ({ user }) => {
    const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
    const [pendingEvents, setPendingEvents] = useState<EventType[]>([]);
    const [approvedEvents, setApprovedEvents] = useState<EventType[]>([]);
    const [rejectedEvents, setRejectedEvents] = useState<EventType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [currentEvent, setCurrentEvent] = useState<EventType | null>(null);
    const [rejectionReason, setRejectReason] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    // Default sort order changed to 'az'
    const [sortOrder, setSortOrder] = useState<"az" | "za">("az");
    const [dateFilter, setDateFilter] = useState<"all" | "today" | "thisWeek" | "thisMonth" | "range">("all");
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [viewMode, setViewMode] = useState<"card" | "list">("card");


    const fetchEventsByStatus = useCallback(async (status: "PENDING" | "APPROVED" | "REJECTED"): Promise<EventType[]> => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            toast.error("Token không tồn tại. Vui lòng đăng nhập lại.");
            return [];
        }
        const headers = { Authorization: `Bearer ${token}` };
        const url = `http://localhost:8080/identity/api/events/status?status=${status}`;
        try {
            const res = await fetch(url, { headers, cache: 'no-store' });

            if (!res.ok) {
                let errorMsg = `Failed to fetch ${status} events`;
                try {
                    const errorData = await res.json();
                    errorMsg = errorData.message || `Lỗi ${res.status}`;
                } catch (_) {
                    errorMsg = `Lỗi ${res.status}`;
                }
                throw new Error(errorMsg);
            }
            const data = await res.json();
            if (data.code === 1000 && Array.isArray(data.result)) {
                return data.result;
            } else {
                throw new Error(data.message || `Dữ liệu không hợp lệ cho ${status} events`);
            }
        } catch (error: any) {
            console.error(`Error fetching ${status} events:`, error);
            toast.error(`Lỗi tải sự kiện ${status.toLowerCase()}: ${error.message}`);
            return [];
        }
    }, []);


    const fetchAllEventData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [pending, approved, rejected] = await Promise.all([
                fetchEventsByStatus("PENDING"),
                fetchEventsByStatus("APPROVED"),
                fetchEventsByStatus("REJECTED"),
            ]);
            setPendingEvents(pending);
            setApprovedEvents(approved);
            setRejectedEvents(rejected);
        } catch (error: any) {
            console.error("Error fetching all event data:", error);
            setPendingEvents([]);
            setApprovedEvents([]);
            setRejectedEvents([]);
        } finally {
            setIsLoading(false);
        }
    }, [fetchEventsByStatus]);


    useEffect(() => {
        fetchAllEventData();
    }, [fetchAllEventData]);

    const handleApprove = async (event: EventType) => {
        const loadingToastId = toast.loading("Đang phê duyệt...");
        try {
            const token = localStorage.getItem("authToken");
            if (!token) throw new Error("Token không tồn tại.");
            const url = `http://localhost:8080/identity/api/events/${event.id}/approve`;
            const res = await fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });

            if (!res.ok) {
                let errorMsg = "Phê duyệt thất bại";
                try { const errorData = await res.json(); errorMsg = errorData.message || `Phê duyệt thất bại (Status: ${res.status})`; }
                catch (_) { errorMsg = `Phê duyệt thất bại (Status: ${res.status})`; }
                throw new Error(errorMsg);
            }
            const data = await res.json();
            if (data.code === 1000) {
                toast.success("Đã phê duyệt sự kiện!", { id: loadingToastId });
                await fetchAllEventData(); // Refresh data
            } else {
                throw new Error(data.message || "Phê duyệt thành công nhưng có phản hồi không mong đợi.");
            }
        } catch (error: any) {
            toast.error(error.message || "Lỗi khi phê duyệt sự kiện", { id: loadingToastId });
            console.error("Approve status error:", error);
        }
    };

    const openRejectModal = (event: EventType) => {
        setCurrentEvent(event);
        setShowRejectModal(true);
        setRejectReason("");
    };

    const handleReject = async () => {
        if (!currentEvent) return;
        const trimmedReason = rejectionReason.trim();
        if (!trimmedReason) { toast.error("Vui lòng nhập lý do từ chối!"); return; }

        const loadingToastId = toast.loading("Đang từ chối...");
        try {
            const token = localStorage.getItem("authToken");
            if (!token) throw new Error("Token không tồn tại.");
            const url = `http://localhost:8080/identity/api/events/${currentEvent.id}/reject?reason=${encodeURIComponent(trimmedReason)}`;
            const res = await fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });

            if (!res.ok) {
                let errorMsg = "Từ chối thất bại";
                try { const errorData = await res.json(); errorMsg = errorData.message || `Từ chối thất bại (Status: ${res.status})`; }
                catch (_) { errorMsg = `Từ chối thất bại (Status: ${res.status})`; }
                throw new Error(errorMsg);
            }
            const data = await res.json();
            if (data.code === 1000) {
                toast.success(`Đã từ chối sự kiện.`, { id: loadingToastId });
                setShowRejectModal(false);
                setCurrentEvent(null);
                setRejectReason("");
                await fetchAllEventData(); // Refresh data
            } else {
                throw new Error(data.message || "Từ chối thành công nhưng có phản hồi không mong đợi.");
            }
        } catch (error: any) {
            toast.error(error.message || "Lỗi khi từ chối sự kiện", { id: loadingToastId });
            console.error("Reject status error:", error);
        }
    };

    const displayedEvents = useMemo(() => {
        let currentList: EventType[] = [];
        if (tab === "pending") currentList = pendingEvents;
        else if (tab === "approved") currentList = approvedEvents;
        else if (tab === "rejected") currentList = rejectedEvents;

        let filteredByDate = currentList.filter(event => {
            if (dateFilter === 'all') return true;
            if (!event.time) return false;

            try {
                const eventDate = new Date(event.time);
                if (isNaN(eventDate.getTime())) return false;

                switch (dateFilter) {
                    case 'today': return isToday(eventDate);
                    case 'thisWeek': return isThisWeek(eventDate);
                    case 'thisMonth': return isThisMonth(eventDate);
                    case 'range':
                        if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
                        const startOfDay = new Date(startDate); startOfDay.setHours(0, 0, 0, 0);
                        const endOfDay = new Date(endDate); endOfDay.setHours(23, 59, 59, 999);
                        return eventDate >= startOfDay && eventDate <= endOfDay;
                    default: return true;
                }
            } catch (e) {
                console.error("Error parsing event date for filtering:", event.time, e);
                return false;
            }
        });

        let filteredByName = filteredByDate;
        if (searchTerm.trim()) {
            const lowerSearchTerm = searchTerm.trim().toLowerCase();
            filteredByName = filteredByDate.filter(event =>
                event.name.toLowerCase().includes(lowerSearchTerm)
            );
        }

        let sortedList = [...filteredByName];
        // Sorting logic handles only 'az' and 'za' now
        if (sortOrder === "za") {
            sortedList.sort((a, b) => b.name.localeCompare(a.name, 'vi', { sensitivity: 'base' }));
        } else { // Default to 'az'
             sortedList.sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
        }
        return sortedList;
    }, [tab, pendingEvents, approvedEvents, rejectedEvents, searchTerm, sortOrder, dateFilter, startDate, endDate]);


    const renderEventList = (events: EventType[], showActions = false) => {
        const listHeightClass = "max-h-[calc(100vh-450px)]"; // Adjusted height slightly

        if (isLoading) {
             return <p className="text-center text-gray-500 py-6 italic">Đang tải sự kiện...</p>;
        }
        if (!events || events.length === 0) {
             return <p className="text-center text-gray-500 py-6 italic">Không có sự kiện nào phù hợp.</p>;
        }

        if (viewMode === 'card') {
            return (
                <div className={`${listHeightClass} overflow-y-auto p-3 md:p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-5">
                        {events.map((event, index) => (
                            <div key={event.id} className="border border-gray-200 rounded-lg shadow-md bg-white flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200 ease-in-out">
                                <div className={`h-24 md:h-28 flex items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200`}>
                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                </div>
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="font-semibold text-base text-gray-800 mb-2 line-clamp-2 flex-grow-0">
                                        {event.name}
                                    </h3>
                                    <div className="text-xs text-gray-500 mt-1 mb-3 space-y-1 flex-grow-0">
                                        {event.time && <p className="flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> </svg>
                                            {new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>}
                                        {event.location && <p className="flex items-center gap-1.5">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /> </svg>
                                            {event.location}
                                        </p>}
                                    </div>
                                    <div className="flex-grow"></div>
                                    {tab === "rejected" && event.rejectionReason && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-red-200 flex-grow-0">
                                            <p className="text-xs text-red-600">
                                                <span className="font-medium">Lý do từ chối:</span> {event.rejectionReason}
                                            </p>
                                        </div>
                                    )}
                                     {tab === "approved" && (
                                          <div className="mt-2 pt-2 border-t border-dashed border-green-200 flex-grow-0">
                                             <p className="text-xs text-green-600 font-medium">Đã phê duyệt</p>
                                         </div>
                                     )}
                                    {showActions && (
                                        <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100 flex-grow-0">
                                            <button onClick={() => openRejectModal(event)} className="px-3 cursor-pointer py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-150 ease-in-out"> Từ chối </button>
                                            <button onClick={() => handleApprove(event)} className="px-3 cursor-pointer py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-150 ease-in-out"> Phê duyệt </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (viewMode === 'list') {
           return (
               <div className={`${listHeightClass} overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 border-t border-gray-200`}>
                   <ul className="divide-y divide-gray-200">
                        {events.map((event) => (
                            <li key={event.id} className="px-3 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors duration-150 ease-in-out">
                                <div className="flex-1 mb-2 sm:mb-0 sm:pr-4">
                                    <p className="font-semibold text-sm md:text-base text-gray-800">{event.name}</p>
                                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                        {event.time && <span className="inline-flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> </svg>
                                            {new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
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
                                {showActions && (
                                    <div className="flex justify-end gap-2 flex-shrink-0 mt-2 sm:mt-0">
                                        <button onClick={() => openRejectModal(event)} className="px-2.5 cursor-pointer py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-150 ease-in-out"> Từ chối </button>
                                        <button onClick={() => handleApprove(event)} className="px-2.5 cursor-pointer py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors duration-150 ease-in-out"> Duyệt </button>
                                    </div>
                                )}
                            </li>
                        ))}
                   </ul>
               </div>
           );
       }

        return null;
    };

    return (
        <div className="flex flex-col h-full p-3 md:p-5 bg-gray-100">
             <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 flex-shrink-0">
                 Phê duyệt sự kiện
             </h2>

            {/* Main Controls Section */}
            <div className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* Search */}
                    <div className="lg:col-span-1">
                        <label htmlFor="searchApproval" className="block text-xs font-medium text-gray-600 mb-1">Tìm kiếm</label>
                        <input type="text" id="searchApproval" placeholder="Tên sự kiện..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 ease-in-out" />
                    </div>
                    {/* Sort */}
                    <div>
                        <label htmlFor="sortApproval" className="block text-xs font-medium text-gray-600 mb-1">Sắp xếp</label>
                        <select id="sortApproval" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "az" | "za")}
                                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 ease-in-out appearance-none" >
                           {/* Removed "Mới nhất" option */}
                           <option value="az">A - Z</option>
                           <option value="za">Z - A</option>
                        </select>
                    </div>
                    {/* Date Filter */}
                    <div>
                        <label htmlFor="dateFilterApproval" className="block text-xs font-medium text-gray-600 mb-1">Lọc thời gian</label>
                        <select id="dateFilterApproval" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as "all" | "today" | "thisWeek" | "thisMonth" | "range")}
                                className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 ease-in-out appearance-none" >
                           <option value="all">Tất cả</option>
                           <option value="today">Hôm nay</option>
                           <option value="thisWeek">Tuần này</option>
                           <option value="thisMonth">Tháng này</option>
                           <option value="range">Khoảng ngày</option>
                        </select>
                    </div>
                    {/* View Toggle */}
                     <div className="flex items-end justify-start md:justify-end gap-2">
                         <button onClick={() => setViewMode('card')} title="Chế độ thẻ"
                                 className={`p-2 rounded-md border transition duration-150 ease-in-out ${ viewMode === 'card' ? 'bg-yellow-500 border-yellow-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400' }`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z" clipRule="evenodd" fillRule="evenodd" /><path d="M7 7h6v2H7V7zm0 4h6v2H7v-2z" /></svg>
                         </button>
                         <button onClick={() => setViewMode('list')} title="Chế độ danh sách"
                                 className={`p-2 rounded-md border transition duration-150 ease-in-out ${ viewMode === 'list' ? 'bg-yellow-500 border-yellow-600 text-white shadow-sm' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400' }`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                         </button>
                     </div>
                 </div>
             </div>

            {/* Date Range Picker (Conditional - Outside main controls) */}
            {dateFilter === 'range' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-yellow-50 rounded-lg  border-yellow-200 shadow-sm flex-shrink-0">
                    <div>
                        <label htmlFor="startDateApproval" className="block text-sm font-medium text-gray-700 mb-1">
                             <span className="inline-block mr-1">🗓️</span> Từ ngày
                        </label>
                        <input type="date" id="startDateApproval" value={formatDateForInput(startDate)} onChange={(e) => { const dateVal = e.target.value ? new Date(e.target.value) : null; setStartDate(dateVal); }} max={endDate ? formatDateForInput(endDate) : undefined}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm bg-white"/>
                    </div>
                    <div>
                        <label htmlFor="endDateApproval" className="block text-sm font-medium text-gray-700 mb-1">
                            <span className="inline-block mr-1">🗓️</span> Đến ngày
                        </label>
                        <input type="date" id="endDateApproval" value={formatDateForInput(endDate)} onChange={(e) => { const dateVal = e.target.value ? new Date(e.target.value) : null; setEndDate(dateVal); }} min={startDate ? formatDateForInput(startDate) : undefined}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm bg-white"/>
                    </div>
                </div>
             )}

             {/* Tabs Section */}
            <div className="flex flex-wrap justify-center mb-4 gap-2 md:gap-3 flex-shrink-0">
                  <button onClick={() => setTab("pending")} className={`px-4 py-1.5 rounded-full font-medium cursor-pointer text-sm md:text-base transition-colors duration-150 ease-in-out ${tab === "pending" ? "bg-yellow-500 text-white shadow-md ring-2 ring-yellow-300 ring-offset-1" : "bg-white text-gray-700 hover:bg-yellow-50 border border-gray-200"}`}> Đang chờ ({pendingEvents.length}) </button>
                  <button onClick={() => setTab("approved")} className={`px-4 py-1.5 rounded-full font-medium cursor-pointer text-sm md:text-base transition-colors duration-150 ease-in-out ${tab === "approved" ? "bg-green-600 text-white shadow-md ring-2 ring-green-300 ring-offset-1" : "bg-white text-gray-700 hover:bg-green-50 border border-gray-200"}`}> Đã duyệt ({approvedEvents.length}) </button>
                  <button onClick={() => setTab("rejected")} className={`px-4 py-1.5 rounded-full font-medium cursor-pointer text-sm md:text-base transition-colors duration-150 ease-in-out ${tab === "rejected" ? "bg-red-600 text-white shadow-md ring-2 ring-red-300 ring-offset-1" : "bg-white text-gray-700 hover:bg-red-50 border border-gray-200"}`}> Đã từ chối ({rejectedEvents.length}) </button>
            </div>

             {/* Event List Area */}
            <div className="border border-gray-200 rounded-lg bg-gray-50 shadow-sm flex-1 overflow-hidden flex flex-col">
                {tab === "pending" && renderEventList(displayedEvents, true)}
                {tab === "approved" && renderEventList(displayedEvents)}
                {tab === "rejected" && renderEventList(displayedEvents)}
            </div>

             {/* Reject Reason Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
                     <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl relative transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-scale-in">
                         <h3 className="text-lg md:text-xl font-semibold mb-4 text-red-700">Nhập lý do từ chối</h3>
                         <button onClick={() => setShowRejectModal(false)} className="absolute cursor-pointer top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors text-2xl" aria-label="Đóng"> &times; </button>
                         <div className="mb-4">
                             <label htmlFor="rejectionReason" className="block text-gray-700 mb-1 text-sm font-medium">Lý do từ chối <span className="text-red-500">*</span>:</label>
                             <textarea id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectReason(e.target.value)}
                                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-500 focus:outline-none transition duration-150 ease-in-out text-sm"
                                      rows={4} placeholder="Nhập lý do..." />
                         </div>
                         <div className="flex justify-end gap-3 mt-5">
                             <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors duration-150 ease-in-out"> Hủy </button>
                             <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"> Xác nhận </button>
                         </div>
                     </div>
                     <style jsx global>{`
                         @keyframes modal-scale-in {
                             from { transform: scale(0.95); opacity: 0; }
                             to { transform: scale(1); opacity: 1; }
                         }
                         .animate-modal-scale-in {
                             animation: modal-scale-in 0.2s ease-out forwards;
                         }
                     `}</style>
                 </div>
             )}
        </div>
    );
};

export default ApprovalTabContent;