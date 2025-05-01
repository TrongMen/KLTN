"use client";

import React, { useMemo, useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { EventDisplayInfo, User } from "../homeuser";
import CreateNewsModal, { NewsFormData } from "./CreateNewsModal";
import NewsFeedSection, { NewsItem } from "./NewsFeedSection";

interface HomeTabContentProps {
  allEvents: EventDisplayInfo[];
  isLoadingEvents: boolean;
  errorEvents: string | null;
  registeredEventIds: Set<string>;
  createdEventIds: Set<string>;
  user: User | null;
  isLoadingRegisteredIds: boolean;
  isLoadingCreatedEventIds: boolean;
  isRegistering: string | null;
  onRegister: (event: EventDisplayInfo) => void;
  onEventClick: (event: EventDisplayInfo) => void;
  selectedEvent: EventDisplayInfo | null;
  onBackToList: () => void;
  search: string;
  setSearch: (value: string) => void;
  sortOption: string;
  setSortOption: (value: string) => void;
  timeFilterOption: string;
  setTimeFilterOption: (value: string) => void;
  newsItems: NewsItem[];
  isLoadingNews: boolean;
  errorNews: string | null;
  onNewsCreated: () => void;
}

const getWeekRange = (
  refDate: Date
): { startOfWeek: Date; endOfWeek: Date } => {
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

const getMonthRange = (
  refDate: Date
): { startOfMonth: Date; endOfMonth: Date } => {
  const d = new Date(refDate);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { startOfMonth: start, endOfMonth: end };
};

const HomeTabContent: React.FC<HomeTabContentProps> = ({
  allEvents,
  isLoadingEvents,
  errorEvents,
  registeredEventIds,
  createdEventIds,
  user,
  isLoadingRegisteredIds,
  isLoadingCreatedEventIds,
  isRegistering,
  onRegister,
  onEventClick,
  selectedEvent,
  onBackToList,
  search,
  setSearch,
  sortOption,
  setSortOption,
  timeFilterOption,
  setTimeFilterOption,
  newsItems,
  isLoadingNews,
  errorNews,
  onNewsCreated,
}) => {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [isCreateNewsModalOpen, setCreateNewsModalOpen] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);


  const processedEvents = useMemo(() => {
    let evts = [...allEvents];
    if (search) {
      const l = search.toLowerCase();
      evts = evts.filter(
        (e) =>
          e.title.toLowerCase().includes(l) ||
          e.location.toLowerCase().includes(l)
      );
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (timeFilterOption === "today") {
      evts = evts.filter((e) => {
        try {
          const eventDate = new Date(e.date);
          return (
            !isNaN(eventDate.getTime()) &&
            eventDate >= todayStart &&
            eventDate <= todayEnd
          );
        } catch {
          return false;
        }
      });
    } else if (timeFilterOption === "thisWeek") {
      const { startOfWeek, endOfWeek } = getWeekRange(new Date());
      evts = evts.filter((e) => {
        try {
          const d = new Date(e.date);
          return !isNaN(d.getTime()) && d >= startOfWeek && d <= endOfWeek;
        } catch {
          return false;
        }
      });
    } else if (timeFilterOption === "thisMonth") {
      const { startOfMonth, endOfMonth } = getMonthRange(new Date());
      evts = evts.filter((e) => {
        try {
          const d = new Date(e.date);
          return !isNaN(d.getTime()) && d >= startOfMonth && d <= endOfMonth;
        } catch {
          return false;
        }
      });
    } else if (
      timeFilterOption === "dateRange" &&
      startDateFilter &&
      endDateFilter
    ) {
      try {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          evts = evts.filter((e) => {
            try {
              const eventDate = new Date(e.date);
              return (
                !isNaN(eventDate.getTime()) &&
                eventDate >= start &&
                eventDate <= end
              );
            } catch {
              return false;
            }
          });
        } else if (start > end) {
          console.warn("Start date is after end date in date range filter.");
        }
      } catch (e) {
        console.error("Error parsing date range:", e);
      }
    }
    if (sortOption === "za") {
      evts.sort((a, b) =>
        b.title.localeCompare(a.title, "vi", { sensitivity: "base" })
      );
    } else {
      evts.sort((a, b) =>
        a.title.localeCompare(b.title, "vi", { sensitivity: "base" })
      );
    }
    return evts;
  }, [
    allEvents,
    search,
    timeFilterOption,
    sortOption,
    startDateFilter,
    endDateFilter,
  ]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDateFilter(newStartDate);
    if (endDateFilter && newStartDate > endDateFilter) {
      setEndDateFilter("");
      toast(
        "Ngày bắt đầu không thể sau ngày kết thúc. Đã đặt lại ngày kết thúc.",
        { icon: "⚠️" }
      );
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

  const handleModalSubmit = async (formData: NewsFormData) => {
      if (!user) {
        toast.error("Vui lòng đăng nhập để tạo bảng tin.");
        return;
      }

      setIsSubmittingNews(true);

      const apiFormData = new FormData();
      apiFormData.append("title", formData.title);
      apiFormData.append("content", formData.content);
      apiFormData.append("type", "NEWS");
      apiFormData.append("featured", "false");
      apiFormData.append("pinned", "false");
      apiFormData.append("createdById", user.id);

      if (formData.imageFile) {
        apiFormData.append("coverImage", formData.imageFile);
      }

      if (selectedEvent) {
           apiFormData.append("eventId", selectedEvent.id);
      } else {
          console.warn("No selected event, eventId will not be sent. Adjust logic if needed.");
      }

      const API_URL = "http://localhost:8080/identity/api/news"; // API tạo tin tức
      const token = localStorage.getItem('authToken');

      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: apiFormData,
        });

        const result = await response.json();

        if (response.ok && result.code === 1000) {
          toast.success(result.message || "Tạo bảng tin thành công!");
          onNewsCreated();
          setCreateNewsModalOpen(false);
        } else {
          toast.error(result.message || "Tạo bảng tin thất bại. Vui lòng thử lại.");
          console.error("API Error:", result);
        }
      } catch (error) {
        console.error("Error submitting news:", error);
        toast.error("Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng kiểm tra kết nối mạng.");
      } finally {
         setIsSubmittingNews(false);
      }
  };


  if (isLoadingEvents) {
    return (
      <p className="text-center text-gray-500 italic py-6">
        {" "}
        Đang tải sự kiện...{" "}
      </p>
    );
  }

  if (errorEvents) {
    return (
      <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
        {" "}
        {errorEvents}{" "}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">
          {" "}
          🎉 Trang chủ Sự kiện{" "}
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <div className="flex-1 sm:flex-none">
            <label htmlFor="sortOptionGuest" className="sr-only">
              {" "}
              Sắp xếp{" "}
            </label>
            <select
              id="sortOptionGuest"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="az">🔤  A - Z</option>{" "}
              <option value="za">🔤  Z - A</option>
            </select>
          </div>
          <div className="flex-1 sm:flex-none">
            <label htmlFor="timeFilterOptionGuest" className="sr-only">
              {" "}
              Lọc thời gian{" "}
            </label>
            <select
              id="timeFilterOptionGuest"
              value={timeFilterOption}
              onChange={(e) => setTimeFilterOption(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="all">♾️ Tất cả</option>{" "}
              <option value="today">📅 Hôm nay</option>{" "}
              <option value="thisWeek">🗓️ Tuần này</option>
              <option value="thisMonth">🗓️ Tháng này</option>{" "}
              <option value="dateRange">🔢 Khoảng ngày</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setViewMode("card")}
              title="Chế độ thẻ"
              className={`p-2 rounded-md border transition duration-150 ease-in-out ${
                viewMode === "card"
                  ? "bg-blue-600 border-blue-700 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z"
                  clipRule="evenodd"
                  fillRule="evenodd"
                />
                <path d="M7 7h6v2H7V7zm0 4h6v2H7v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Chế độ danh sách"
              className={`p-2 rounded-md border transition duration-150 ease-in-out ${
                viewMode === "list"
                  ? "bg-blue-600 border-blue-700 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {timeFilterOption === "dateRange" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div>
            <label
              htmlFor="startDateFilterHome"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Từ ngày
            </label>
            <input
              type="date"
              id="startDateFilterHome"
              value={startDateFilter}
              onChange={handleStartDateChange}
              max={endDateFilter || undefined}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="endDateFilterHome"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Đến ngày
            </label>
            <input
              type="date"
              id="endDateFilterHome"
              value={endDateFilter}
              onChange={handleEndDateChange}
              min={startDateFilter || undefined}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="relative w-full mb-6">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          🔍
        </span>
        <input
          id="searchGuest"
          type="text"
          placeholder="Tìm sự kiện theo tên hoặc địa điểm..."
          className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {selectedEvent ? (
        <div className="p-6 border rounded-lg shadow-lg bg-gray-50">
          <button
            onClick={onBackToList}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Quay lại danh sách
          </button>
          <h2 className="text-xl font-bold mb-3 text-gray-800">
            {selectedEvent.title}
          </h2>
          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <strong className="font-medium text-gray-900">📅 Ngày:</strong>{" "}
              {new Date(selectedEvent.date).toLocaleDateString("vi-VN")}
            </p>
            <p>
              <strong className="font-medium text-gray-900">
                📍 Địa điểm:
              </strong>{" "}
              {selectedEvent.location}
            </p>
            {selectedEvent.time && (
              <p>
                <strong className="font-medium text-gray-900">
                  🕒 Thời gian:
                </strong>{" "}
                {new Date(selectedEvent.time).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {selectedEvent.purpose && (
              <p>
                <strong className="font-medium text-gray-900">
                  🎯 Mục đích:
                </strong>{" "}
                {selectedEvent.purpose}
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-900 mb-1">📜 Mô tả:</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedEvent.description || "Không có mô tả chi tiết."}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-1">
          {processedEvents.length > 0 ? (
            viewMode === "card" ? (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {processedEvents.map((event) => {
                    const isRegistered = registeredEventIds.has(event.id);
                    const isCreatedByUser = createdEventIds.has(event.id);
                    const processing = isRegistering === event.id;
                    const isEventUpcoming = new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0));
                    const showRegisterButton = user && !isCreatedByUser && isEventUpcoming;
                    const canClickRegister = showRegisterButton && !isRegistered && !processing;
                    return (
                      <div key={event.id} className="p-5 bg-white shadow-md rounded-xl transform transition hover:scale-[1.02] hover:shadow-lg flex flex-col justify-between border border-gray-200 hover:border-blue-300">
                        <div onClick={() => onEventClick(event)} className="cursor-pointer flex-grow mb-3">
                          <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">{event.title}</h2>
                          <p className="text-sm text-gray-600">📅 {new Date(event.date).toLocaleDateString("vi-VN")}</p>
                          <p className="text-sm text-gray-600 mb-2">📍 {event.location}</p>
                        </div>
                        <div className="mt-auto">
                          {isCreatedByUser ? (<button className="w-full px-4 py-2 rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed text-sm font-medium" disabled>✨ Sự kiện của bạn</button>) :
                           showRegisterButton ? (<button onClick={() => { if (canClickRegister) { onRegister(event); } }} className={`w-full px-4 py-2 rounded-lg text-white shadow-sm transition text-sm font-medium flex items-center justify-center ${isRegistered ? "bg-green-500 cursor-not-allowed" : processing ? "bg-blue-300 cursor-wait" : "bg-blue-500 hover:bg-blue-600"}`} disabled={!canClickRegister || isLoadingRegisteredIds || isLoadingCreatedEventIds}>
                               {isRegistered ? (<span>✅ Đã đăng ký</span>) : processing ? (<><svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg> ... </>) : (<span>📝 Đăng ký</span>)}</button>) :
                           (<>
                              {user && !isEventUpcoming && !isCreatedByUser && (<button className="w-full px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium" disabled>Đã kết thúc</button>)}
                              {!user && isEventUpcoming && (<button onClick={(e) => { e.stopPropagation(); toast("Vui lòng đăng nhập để đăng ký sự kiện.", { icon: "🔒" }); }} className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium">Đăng nhập để đăng ký</button>)}
                              {!user && !isEventUpcoming && (<button className="w-full px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium" disabled>Đã kết thúc</button>)}
                           </>)}
                        </div>
                      </div>
                    );
                 })}
              </div>
            ) : (
               <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                      {processedEvents.map((event) => {
                        const isRegistered = registeredEventIds.has(event.id);
                        const isCreatedByUser = createdEventIds.has(event.id);
                        const processing = isRegistering === event.id;
                        const isEventUpcoming = new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0));
                        const showRegisterButton = user && !isCreatedByUser && isEventUpcoming;
                        const canClickRegister = showRegisterButton && !isRegistered && !processing;
                        return (
                          <li key={event.id} className="px-4 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors duration-150 ease-in-out">
                            <div className="flex-1 mb-2 sm:mb-0 sm:pr-4 cursor-pointer" onClick={() => onEventClick(event)}>
                              <p className="font-semibold text-sm md:text-base text-gray-800 line-clamp-1">{event.title}</p>
                              <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> </svg>{new Date(event.date).toLocaleDateString("vi-VN")}</span>
                                <span className="inline-flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /> </svg>{event.location}</span>
                              </div>
                            </div>
                            <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                                {isCreatedByUser ? (<button className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed text-xs font-medium" disabled>✨ Sự kiện của bạn</button>) :
                                 showRegisterButton ? (<button onClick={() => { if (canClickRegister) { onRegister(event); } }} className={`w-full sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center ${isRegistered ? "bg-green-500 cursor-not-allowed" : processing ? "bg-blue-300 cursor-wait" : "bg-blue-500 hover:bg-blue-600"}`} disabled={!canClickRegister || isLoadingRegisteredIds || isLoadingCreatedEventIds}>
                                     {isRegistered ? (<span>✅ Đã đăng ký</span>) : processing ? (<><svg className="animate-spin -ml-1 mr-1.5 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg> ... </> ) : (<span>📝 Đăng ký</span>)}</button>) :
                                 (<>
                                    {user && !isEventUpcoming && !isCreatedByUser && (<button className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-300 text-gray-600 cursor-not-allowed text-xs font-medium" disabled>Đã kết thúc</button>)}
                                    {!user && isEventUpcoming && (<button onClick={(e) => { e.stopPropagation(); toast("Vui lòng đăng nhập để đăng ký sự kiện.", { icon: "🔒" }); }} className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-xs font-medium">Đăng nhập để đăng ký</button>)}
                                    {!user && !isEventUpcoming && (<button className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-300 text-gray-600 cursor-not-allowed text-xs font-medium" disabled>Đã kết thúc</button>)}
                                 </>)}
                              </div>
                          </li>
                        );
                     })}
                  </ul>
               </div>
            )
          ) : (
            <p className="text-gray-500 text-center col-span-1 md:col-span-2 py-6 italic">
              Không tìm thấy sự kiện nào khớp.
            </p>
          )}
        </div>
      )}

      <NewsFeedSection
        newsItems={newsItems || []}
        isLoading={isLoadingNews}
        error={errorNews}
        onOpenCreateModal={() => {
            if (!user) {
                toast.error("Vui lòng đăng nhập để tạo bảng tin.");
                return;
            }
          setCreateNewsModalOpen(true);
        }}
      />

      <CreateNewsModal
          isOpen={isCreateNewsModalOpen}
          onClose={() => {
              if (!isSubmittingNews) {
                  setCreateNewsModalOpen(false);
              }
          }}
          onSubmit={handleModalSubmit}
          isSubmitting={isSubmittingNews}
      />

    </div>
  );
};

export default HomeTabContent;