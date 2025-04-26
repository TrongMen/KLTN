"use client";

import React, { useMemo } from "react";
import { toast } from "react-hot-toast";
import { EventDisplayInfo, User } from "../homeadmin"; // Adjust path if needed

interface AdminHomeTabContentProps {
  events: EventDisplayInfo[];
  isLoading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  sortOption: string;
  setSortOption: (value: string) => void;
  timeFilterOption: string;
  setTimeFilterOption: (value: string) => void;
  startDateFilter: string;
  setStartDateFilter: (value: string) => void;
  endDateFilter: string;
  setEndDateFilter: (value: string) => void;
  selectedEvent: EventDisplayInfo | null;
  onEventClick: (event: EventDisplayInfo) => void;
  onBackToList: () => void;
}

const getWeekRange = (refDate: Date): { startOfWeek: Date; endOfWeek: Date } => {
    const date = new Date(refDate);
    const dayOfWeek = date.getDay();
    const diffToMonday = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(date.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { startOfWeek, endOfWeek };
};

const getMonthRange = (refDate: Date): { startOfMonth: Date; endOfMonth: Date } => {
     const date = new Date(refDate);
     const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
     startOfMonth.setHours(0, 0, 0, 0);
     const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
     endOfMonth.setHours(23, 59, 59, 999);
     return { startOfMonth, endOfMonth };
};

const getStatusBadgeColor = (status?: string) => {
     switch (status?.toUpperCase()) {
         case 'APPROVED': return 'bg-green-100 text-green-800';
         case 'PENDING': return 'bg-yellow-100 text-yellow-800';
         case 'REJECTED': return 'bg-red-100 text-red-800';
         default: return 'bg-gray-100 text-gray-800';
     }
};

const AdminHomeTabContent: React.FC<AdminHomeTabContentProps> = ({
    events, isLoading, error, search, setSearch, sortOption, setSortOption,
    timeFilterOption, setTimeFilterOption, startDateFilter, setStartDateFilter,
    endDateFilter, setEndDateFilter, selectedEvent, onEventClick, onBackToList
}) => {

    const processedEvents = useMemo(() => {
        let eventsToProcess = [...events];
        if (search) {
          const lowerCaseSearch = search.toLowerCase();
          eventsToProcess = eventsToProcess.filter(event =>
            event.title.toLowerCase().includes(lowerCaseSearch) ||
            event.location.toLowerCase().includes(lowerCaseSearch)
          );
        }

        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

        if (timeFilterOption === 'today') {
            eventsToProcess = eventsToProcess.filter(event => {
               const eventDate = new Date(event.date);
               // Check if eventDate is valid before comparing
               return !isNaN(eventDate.getTime()) && eventDate >= todayStart && eventDate <= todayEnd;
            });
        } else if (timeFilterOption === 'thisWeek') {
          const { startOfWeek, endOfWeek } = getWeekRange(new Date());
          eventsToProcess = eventsToProcess.filter(event => {
              const eventDate = new Date(event.date);
              return !isNaN(eventDate.getTime()) && eventDate >= startOfWeek && eventDate <= endOfWeek;
          });
        } else if (timeFilterOption === 'thisMonth') {
          const { startOfMonth, endOfMonth } = getMonthRange(new Date());
          eventsToProcess = eventsToProcess.filter(event => {
              const eventDate = new Date(event.date);
              return !isNaN(eventDate.getTime()) && eventDate >= startOfMonth && eventDate <= endOfMonth;
          });
        } else if (timeFilterOption === 'dateRange' && startDateFilter && endDateFilter) {
            try {
                const start = new Date(startDateFilter); start.setHours(0, 0, 0, 0);
                const end = new Date(endDateFilter); end.setHours(23, 59, 59, 999);
                 if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
                    eventsToProcess = eventsToProcess.filter(event => {
                        const eventDate = new Date(event.date);
                        return !isNaN(eventDate.getTime()) && eventDate >= start && eventDate <= end;
                    });
                 } else if (start > end) {
                     // Handle invalid range where start is after end, maybe show nothing or keep unfiltered
                     // eventsToProcess = []; // Option: show no events for invalid range
                     console.warn("Start date is after end date in date range filter.");
                 }
            } catch(e) { console.error("Error parsing date range:", e); }
        }

        if (sortOption === 'az') eventsToProcess.sort((a, b) => a.title.localeCompare(b.title));
        else if (sortOption === 'za') eventsToProcess.sort((a, b) => b.title.localeCompare(a.title));
        else if (sortOption === 'date-asc') eventsToProcess.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        else eventsToProcess.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return eventsToProcess;
    }, [events, search, timeFilterOption, sortOption, startDateFilter, endDateFilter]);

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStartDate = e.target.value;
        setStartDateFilter(newStartDate);
        // Constraint: If new start date is after current end date, reset end date
        if (endDateFilter && newStartDate > endDateFilter) {
            setEndDateFilter(""); // Or setEndDateFilter(newStartDate);
            toast("Ngày bắt đầu không thể sau ngày kết thúc. Đã xóa ngày kết thúc.", { icon: '⚠️' });
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEndDate = e.target.value;
        // Constraint: Prevent setting end date before start date
        if (startDateFilter && newEndDate < startDateFilter) {
            toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
        } else {
            setEndDateFilter(newEndDate);
        }
    };


    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                 <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600">Trang chủ Sự kiện (Admin)</h1>
                 <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none">
                         <label htmlFor="sortOptionAdminHome" className="sr-only">Sắp xếp</label>
                         <select id="sortOptionAdminHome" value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                             <option value="date-desc">📅 Mới nhất</option>
                             <option value="date-asc">📅 Cũ nhất</option>
                             <option value="az">🔤 A-Z</option>
                             <option value="za">🔤 Z-A</option>
                         </select>
                     </div>
                     <div className="flex-1 sm:flex-none">
                          <label htmlFor="timeFilterOptionAdminHome" className="sr-only">Lọc thời gian</label>
                          <select id="timeFilterOptionAdminHome" value={timeFilterOption} onChange={(e) => setTimeFilterOption(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                              <option value="all">♾️ Tất cả</option>
                              <option value="today">📅 Hôm nay</option>
                              <option value="thisWeek">🗓️ Tuần này</option>
                              <option value="thisMonth">🗓️ Tháng này</option>
                              <option value="dateRange">🔢 Khoảng ngày</option>
                          </select>
                      </div>
                 </div>
            </div>

            {timeFilterOption === 'dateRange' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
                    <div>
                         <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                         <input type="date" id="startDateFilter" value={startDateFilter} onChange={handleStartDateChange}
                                max={endDateFilter || undefined} // Prevent start date > end date
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                         <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                         <input type="date" id="endDateFilter" value={endDateFilter} onChange={handleEndDateChange}
                                min={startDateFilter || undefined} // Prevent end date < start date
                                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                </div>
            )}

            <div className="relative w-full mb-6">
                 <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                 <input id="searchAdminHome" type="text" placeholder="Tìm sự kiện theo tên hoặc địa điểm..." className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={search} onChange={(e) => setSearch(e.target.value)} />
             </div>

             {isLoading ? (<p className="text-center text-gray-500 italic py-6">Đang tải...</p>)
             : error ? (<p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{error}</p>)
             : selectedEvent ? (
                  <div className="p-6 border rounded-lg shadow-lg bg-gray-50">
                       <button onClick={onBackToList} className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                            Quay lại
                       </button>
                       <h2 className="text-xl font-semibold text-gray-800 mb-2">{selectedEvent.title}</h2>
                       <p className="text-sm text-gray-600">📅 Ngày: {new Date(selectedEvent.date).toLocaleDateString('vi-VN')}</p>
                       {selectedEvent.time && <p className="text-sm text-gray-600">🕒 TG: {new Date(selectedEvent.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>}
                       <p className="text-sm text-gray-600">📍 Đ.Điểm: {selectedEvent.location}</p>
                       <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">📜 Mô tả: {selectedEvent.description || 'Không có mô tả.'}</p>
                       {selectedEvent.status && <p className="mt-2 text-sm font-medium">Trạng thái: <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadgeColor(selectedEvent.status)}`}>{selectedEvent.status}</span></p>}
                   </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {processedEvents.length > 0 ? (
                          processedEvents.map((event: EventDisplayInfo) => (
                              <div key={event.id} className="p-4 bg-white shadow rounded-lg cursor-pointer transform transition hover:shadow-md flex flex-col justify-between border border-gray-200 hover:border-blue-300" onClick={() => onEventClick(event)}>
                                  <div>
                                      <div className="flex justify-between items-start mb-1 gap-2">
                                          <h3 className="text-base font-semibold text-gray-800 line-clamp-2 flex-1">{event.title}</h3>
                                           {event.status && <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(event.status)}`}>{event.status || 'N/A'}</span>}
                                       </div>
                                       <p className="text-xs text-gray-500 mb-1">📅 {new Date(event.date).toLocaleDateString('vi-VN')}</p>
                                       <p className="text-xs text-gray-500">📍 {event.location}</p>
                                  </div>
                              </div>
                          ))
                      ) : ( <p className="text-gray-500 text-center col-span-1 md:col-span-2 lg:col-span-3 py-6 italic">Không có sự kiện nào khớp.</p> )}
                  </div>
              )}
        </div>
    );
};

export default AdminHomeTabContent;