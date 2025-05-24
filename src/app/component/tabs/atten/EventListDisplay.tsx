"use client";

import React, { useState, useMemo, useEffect } from "react";
import { FaList, FaThLarge, FaSortAlphaDown, FaSortAlphaUp, FaCalendarTimes, FaImage, FaClock, FaMapMarkerAlt, FaPlay, FaCheck } from "react-icons/fa";

export type AttendableEvent = {
  id: string;
  name: string;
  location: string;
  description: string;
  status: string;
  time: string;
  endTime?: string | null;
  avatarUrl?: string;
  progressStatus?: 'UPCOMING' | 'ONGOING' | 'COMPLETED' | string;
};

export type EventSortKey = "name" | "time";
export type EventSortDirection = "asc" | "desc";
export type EventTimeFilter = "all" | "ongoing" | "upcoming" | "ended" | "customRange";
export type EventViewMode = "card" | "list";
type EventStatus = "upcoming" | "ongoing" | "ended";

interface EventListDisplayProps {
  initialEvents: AttendableEvent[];
  isLoading: boolean;
  error: string | null;
  onSelectEvent: (event: AttendableEvent) => void;
  listHeight?: string;
}

const getEventStatus = (event: AttendableEvent): EventStatus => {
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
  const base = "px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5";
  switch (status) {
    case "ongoing": return `${base} bg-green-100 text-green-800`;
    case "upcoming": return `${base} bg-blue-100 text-blue-800`;
    case "ended": return `${base} bg-gray-100 text-gray-700`;
    default: return `${base} bg-gray-100 text-gray-600`;
  }
};

const getStatusText = (status: EventStatus): string => {
  switch (status) {
    case "ongoing": return "Đang diễn ra";
    case "upcoming": return "Sắp diễn ra";
    case "ended": return "Đã kết thúc";
    default: return "";
  }
};

const getStatusIcon = (status: EventStatus) => {
  switch (status) {
    case "ongoing": return <FaPlay />;
    case "upcoming": return <FaClock />;
    case "ended": return <FaCheck />;
    default: return null;
  }
};


const EventImage: React.FC<{
  src?: string;
  alt: string;
  className: string;
  placeholderType?: 'card' | 'thumbnail';
}> = ({ src, alt, className, placeholderType = 'card' }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  const handleError = () => {
    setImgSrc(undefined);
  };

  if (!imgSrc) {
    const placeholderClass = placeholderType === 'card' 
      ? "w-12 h-12" 
      : "w-5 h-5";
    return (
      <div className={`${className} flex items-center justify-center bg-gray-200`}>
        <FaImage className={`text-gray-400 ${placeholderClass}`} />
      </div>
    );
  }

  return <img src={imgSrc} alt={alt} className={className} onError={handleError} />;
};


export const EventListDisplay: React.FC<EventListDisplayProps> = ({
  initialEvents,
  isLoading,
  error,
  onSelectEvent,
  listHeight = "h-[calc(120vh-200px)]",
}) => {
  const [eventViewMode, setEventViewMode] = useState<EventViewMode>("card");
  const [eventSortConfig, setEventSortConfig] = useState<{ key: EventSortKey; direction: EventSortDirection }>({ key: "time", direction: "asc" });
  const [eventTimeFilter, setEventTimeFilter] = useState<EventTimeFilter>("all");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  useEffect(() => {
    if (eventTimeFilter !== "customRange") {
      setFilterStartDate("");
      setFilterEndDate("");
    }
  }, [eventTimeFilter]);

  const handleSortChange = (key: EventSortKey) => {
    setEventSortConfig(prevConfig => {
      if (prevConfig.key === key) {
        return { key, direction: prevConfig.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterStartDate(e.target.value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterEndDate(e.target.value);
  };

  const clearDateFilters = () => {
    setFilterStartDate("");
    setFilterEndDate("");
  };

  const displayedEvents = useMemo(() => {
    let events = [...initialEvents];

    if (eventTimeFilter === "customRange") {
      if (filterStartDate) {
        const startDate = new Date(filterStartDate);
        startDate.setHours(0, 0, 0, 0);
        events = events.filter(event => new Date(event.time) >= startDate);
      }
      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        events = events.filter(event => new Date(event.time) <= endDate);
      }
    } else if (eventTimeFilter !== "all") {
        events = events.filter(event => getEventStatus(event) === eventTimeFilter);
    }

    events.sort((a, b) => {
      let valA, valB;
      const statusA = getEventStatus(a);
      const statusB = getEventStatus(b);
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();

      if (eventSortConfig.key === "name") {
        valA = a.name.toLowerCase(); valB = b.name.toLowerCase();
        if (valA < valB) return eventSortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return eventSortConfig.direction === "asc" ? 1 : -1;
        return 0;
      } else { 
        if (statusA === "ongoing" && statusB !== "ongoing") return -1;
        if (statusB === "ongoing" && statusA !== "ongoing") return 1;
        if (statusA === "upcoming" && statusB === "ended") return -1;
        if (statusB === "upcoming" && statusA === "ended") return 1;

        const timeSortDirection = eventSortConfig.direction === "asc" ? 1 : -1;

        if (statusA === "upcoming" && statusB === "upcoming") return (timeA - timeB) * timeSortDirection;
        if (statusA === "ended" && statusB === "ended") return (timeB - timeA) * timeSortDirection;
        if (statusA === "ongoing" && statusB === "ongoing") return (timeA - timeB) * timeSortDirection;
        
        return (timeB - timeA) * (eventSortConfig.direction === 'desc' ? 1 : -1);
      }
    });
    return events;
  }, [initialEvents, eventTimeFilter, filterStartDate, filterEndDate, eventSortConfig]);
  
  if (isLoading) return <p className="text-center text-gray-500 py-4">Đang tải danh sách sự kiện...</p>;
  if (error) return <p className="text-center text-red-500 py-4">Lỗi tải sự kiện: {error}</p>;
  if (initialEvents.length === 0 && !isLoading) return <p className="text-gray-600 py-4 text-center">Bạn không có sự kiện nào đã duyệt để điểm danh.</p>;

  return (
    <div className="space-y-4">
      {initialEvents.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="eventTimeFilter" className="block text-sm font-medium text-gray-700 mb-1">Lọc theo trạng thái</label>
              <select id="eventTimeFilter" name="eventTimeFilter" className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm" value={eventTimeFilter} onChange={(e) => setEventTimeFilter(e.target.value as EventTimeFilter)}>
                <option value="all">Tất cả</option>
                <option value="upcoming">Sắp diễn ra</option>
                <option value="ongoing">Đang diễn ra</option>
                <option value="ended">Đã kết thúc</option>
                <option value="customRange">Khoảng ngày...</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sắp xếp theo</label>
              <div className="flex space-x-2">
                <button onClick={() => handleSortChange("name")} className={`flex-1 px-3 py-2 border cursor-pointer rounded-md text-sm flex items-center justify-center gap-1 ${eventSortConfig.key === "name" ? "bg-indigo-100 text-indigo-700 border-indigo-300" : "bg-white hover:bg-gray-100 border-gray-300"}`}>Tên {eventSortConfig.key === "name" && (eventSortConfig.direction === "asc" ? <FaSortAlphaUp /> : <FaSortAlphaDown />)}</button>
                <button onClick={() => handleSortChange("time")} className={`flex-1 px-3 py-2 border cursor-pointer rounded-md text-sm flex items-center justify-center gap-1 ${eventSortConfig.key === "time" ? "bg-indigo-100 text-indigo-700 border-indigo-300" : "bg-white hover:bg-gray-100 border-gray-300"}`}>Thời gian {eventSortConfig.key === "time" && (eventSortConfig.direction === "asc" ? "▲" : "▼")}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chế độ xem</label>
              <div className="flex rounded-md shadow-sm">
                <button onClick={() => setEventViewMode("card")} className={`px-3 py-2 rounded-l-md border cursor-pointer text-sm focus:outline-none flex items-center justify-center gap-1.5 w-1/2 ${eventViewMode === "card" ? "bg-indigo-600 text-white border-indigo-600 z-10" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"}`}><FaThLarge /> Thẻ</button>
                <button onClick={() => setEventViewMode("list")} className={`px-3 py-2 rounded-r-md border cursor-pointer text-sm focus:outline-none flex items-center justify-center gap-1.5 w-1/2 -ml-px ${eventViewMode === "list" ? "bg-indigo-600 text-white border-indigo-600 z-10" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"}`}><FaList /> DSách</button>
              </div>
            </div>
          </div>
          {eventTimeFilter === "customRange" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-4 border-t border-gray-200">
              <div>
                <label htmlFor="filterStartDate" className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                <input type="date" id="filterStartDate" name="filterStartDate" value={filterStartDate} onChange={handleStartDateChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
              </div>
              <div>
                <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                <input type="date" id="filterEndDate" name="filterEndDate" value={filterEndDate} onChange={handleEndDateChange} min={filterStartDate || undefined} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm" disabled={!filterStartDate} />
              </div>
              <div>
                {(filterStartDate || filterEndDate) && (<button onClick={clearDateFilters} className="w-full px-3 py-2 border border-red-300 text-red-700 rounded-md text-sm hover:bg-red-50 flex items-center justify-center gap-1.5" title="Xóa bộ lọc ngày"><FaCalendarTimes /> Xóa ngày</button>)}
              </div>
            </div>
          )}
        </div>
      )}

      {displayedEvents.length === 0 && initialEvents.length > 0 && (<p className="text-gray-600 py-4 text-center">Không tìm thấy sự kiện nào khớp với bộ lọc.</p>)}

      <div className={`${listHeight} overflow-y-auto pr-1`}>
        {displayedEvents.length > 0 && (
          <>
            {eventViewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
                {displayedEvents.map((event) => {
                  const status = getEventStatus(event);
                  return (
                    <div key={event.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-300 overflow-hidden cursor-pointer flex flex-col border" onClick={() => onSelectEvent(event)}>
                        <div className="relative">
                          <EventImage src={event.avatarUrl} alt={`Ảnh ${event.name}`} className="w-full h-40 object-cover" placeholderType="card" />
                          <span className={`absolute top-2 right-2 ${getStatusBadgeClasses(status)} shadow-sm`}>
                            {getStatusIcon(status)}
                            {getStatusText(status)}
                          </span>
                        </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <h4 className="text-md font-semibold text-gray-800 truncate mb-2" title={event.name}>{event.name}</h4>
                        <div className="space-y-1 text-sm text-gray-600 mt-auto">
                            <p className="flex items-center gap-2"><FaClock className="text-gray-400"/> {new Date(event.time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</p>
                            <p className="flex items-center gap-2 truncate"><FaMapMarkerAlt className="text-gray-400 flex-shrink-0"/> <span className="truncate" title={event.location}>{event.location || "Chưa có"}</span></p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {eventViewMode === 'list' && (
              <div className="bg-white shadow border border-gray-200 rounded-lg overflow-hidden">
                <ul role="list" className="divide-y divide-gray-200">
                  {displayedEvents.map((event) => {
                      const status = getEventStatus(event);
                      return (
                        <li key={event.id} className="px-4 py-3 hover:bg-gray-50 cursor-pointer sm:px-6" onClick={() => onSelectEvent(event)}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center truncate">
                              <EventImage src={event.avatarUrl} alt="" className="h-10 w-10 rounded-full mr-4 object-cover flex-shrink-0" placeholderType="thumbnail"/>
                              <div className="truncate">
                                <p className="text-md font-medium text-indigo-600 truncate" title={event.name}>{event.name}</p>
                                <p className="text-sm text-gray-500 truncate" title={event.location}>{event.location || "Chưa có địa điểm"}</p>
                              </div>
                            </div>
                            <div className="ml-2 flex-shrink-0 text-right space-y-1">
                                <p className={`text-xs font-medium ${getStatusBadgeClasses(status)}`}>{getStatusText(status)}</p>
                                <p className="text-sm text-gray-700">{new Date(event.time).toLocaleDateString("vi-VN")}</p>
                            </div>
                          </div>
                        </li>
                      )}
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventListDisplay;