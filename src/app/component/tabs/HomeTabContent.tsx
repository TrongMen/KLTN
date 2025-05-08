"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { EventDisplayInfo, User } from "../homeuser";
import { useRefreshToken } from "../../../hooks/useRefreshToken";
import {
  PersonIcon,
  IdCardIcon,
  CheckIcon,
  Cross2Icon,
  ReloadIcon,
  Pencil1Icon,
  CheckCircledIcon,
  ClockIcon,
  CalendarIcon,
  PinTopIcon,
  CheckBadgeIcon,
  ArchiveIcon,
  ListBulletIcon,
  GridIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

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
  refreshToken?: () => Promise<string | null>;
  onRefreshEvents: () => Promise<void>;
}

type EventStatus = "upcoming" | "ongoing" | "ended";

const getEventStatus = (eventDateStr: string): EventStatus => {
  if (!eventDateStr) return "upcoming";
  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) {
      return "upcoming";
    }
    const eventDateStart = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    if (eventDateStart < todayStart) {
      return "ended";
    } else if (eventDateStart > todayStart) {
      return "upcoming";
    } else {
      return "ongoing";
    }
  } catch (e) {
    console.error("Error parsing event date for status:", e);
    return "upcoming";
  }
};

const getStatusBadgeClasses = (status: EventStatus): string => {
  const base =
    "px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1";
  switch (status) {
    case "ongoing":
      return `${base} bg-green-100 text-green-800`;
    case "upcoming":
      return `${base} bg-blue-100 text-blue-800`;
    case "ended":
      return `${base} bg-gray-100 text-gray-700`;
    default:
      return `${base} bg-gray-100 text-gray-600`;
  }
};

const getStatusText = (status: EventStatus): string => {
  switch (status) {
    case "ongoing":
      return "Đang diễn ra";
    case "upcoming":
      return "Sắp diễn ra";
    case "ended":
      return "Đã kết thúc";
    default:
      return "";
  }
};

const getStatusIcon = (status: EventStatus) => {
  switch (status) {
    case "ongoing":
      return <CheckCircledIcon className="w-3 h-3" />;
    case "upcoming":
      return <ClockIcon className="w-3 h-3" />;
    case "ended":
      return <ArchiveIcon className="w-3 h-3" />;
    default:
      return null;
  }
};

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

const ITEMS_PER_PAGE_OPTIONS = [6, 12, 36];

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
  refreshToken,
  onRefreshEvents,
}) => {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  );

  const processedEvents = useMemo(() => {
    let evts = [...allEvents];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (timeFilterOption === "upcoming") {
      evts = evts.filter((e) => getEventStatus(e.date) === "upcoming");
    } else if (timeFilterOption === "ongoing") {
      evts = evts.filter((e) => getEventStatus(e.date) === "ongoing");
    } else if (timeFilterOption === "ended") {
      evts = evts.filter((e) => getEventStatus(e.date) === "ended");
    } else if (timeFilterOption === "today") {
      evts = evts.filter((e) => {
        try {
          const d = new Date(e.date);
          return !isNaN(d.getTime()) && d >= todayStart && d <= todayEnd;
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
              const d = new Date(e.date);
              return !isNaN(d.getTime()) && d >= start && d <= end;
            } catch {
              return false;
            }
          });
        } else if (start > end) {
          console.warn("Start date is after end date.");
        }
      } catch (e) {
        console.error("Error parsing date range:", e);
      }
    }
    if (search) {
      const l = search.toLowerCase();
      evts = evts.filter(
        (e) =>
          e.title.toLowerCase().includes(l) ||
          (e.location && e.location.toLowerCase().includes(l))
      );
    }
    if (sortOption === "za") {
      evts.sort((a, b) =>
        b.title.localeCompare(a.title, "vi", { sensitivity: "base" })
      );
    } else if (sortOption === "az") {
      evts.sort((a, b) =>
        a.title.localeCompare(b.title, "vi", { sensitivity: "base" })
      );
    } else {
      evts.sort((a, b) => {
        try {
          const statusA = getEventStatus(a.date);
          const statusB = getEventStatus(b.date);
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (isNaN(dateA) || isNaN(dateB)) return 0;
          if (dateB !== dateA) return dateB - dateA;
          if (statusB === "ongoing" && statusA !== "ongoing") return 1;
          if (statusA === "ongoing" && statusB !== "ongoing") return -1;
          if (statusB === "upcoming" && statusA === "ended") return 1;
          if (statusA === "upcoming" && statusB === "ended") return -1;
          return 0;
        } catch {
          return 0;
        }
      });
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

  const totalItems = processedEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = processedEvents.slice(startIndex, endIndex);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDateFilter(newStartDate);
    setCurrentPage(1);
    if (endDateFilter && newStartDate > endDateFilter) {
      setEndDateFilter("");
      toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: "⚠️" });
    }
  };
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (startDateFilter && newEndDate < startDateFilter) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setEndDateFilter(newEndDate);
      setCurrentPage(1);
    }
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleRefresh = async () => {
    try {
      await onRefreshEvents();
      toast.success("Đã làm mới danh sách sự kiện!");
    } catch (error) {
      console.error("Lỗi khi làm mới sự kiện thủ công:", error);
      toast.error("Không thể làm mới sự kiện.");
    }
  };

  if (errorEvents) {
    return (
      <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
        Lỗi tải sự kiện: {errorEvents}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600 shrink-0">
          🎉 Trang chủ
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center flex-wrap">
          <div className="flex-grow sm:flex-grow-0">
            <button
              onClick={handleRefresh}
              disabled={isLoadingEvents}
              title="Làm mới danh sách sự kiện"
              className="w-full h-full p-2 border cursor-pointer border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
            >
              {isLoadingEvents ? (
                <ReloadIcon className="w-5 h-5 animate-spin text-indigo-600" />
              ) : (
                <ReloadIcon className="w-5 h-5 text-indigo-600" />
              )}
              <span className="ml-2 hidden sm:inline">Làm mới</span>
            </button>
          </div>
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="sortOptionGuest" className="sr-only">
              Sắp xếp
            </label>
            <select
              id="sortOptionGuest"
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="az">🔤 A - Z</option>
              <option value="za">🔤 Z - A</option>
            </select>
          </div>
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="timeFilterOptionGuest" className="sr-only">
              Lọc thời gian
            </label>
            <select
              id="timeFilterOptionGuest"
              value={timeFilterOption}
              onChange={(e) => {
                setTimeFilterOption(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="all">♾️ Tất cả</option>
              <option value="upcoming">☀️ Sắp diễn ra</option>
              <option value="ongoing">🟢 Đang diễn ra</option>
              <option value="ended">🏁 Đã kết thúc</option>
              <option value="today">📅 Hôm nay</option>
              <option value="thisWeek">🗓️ Tuần này</option>
              <option value="thisMonth">🗓️ Tháng này</option>
              <option value="dateRange">🔢 Khoảng ngày</option>
            </select>
          </div>
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="itemsPerPageSelect" className="sr-only">
              Sự kiện mỗi trang
            </label>
            <select
              id="itemsPerPageSelect"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="w-full h-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / trang
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-center">
            <button
              onClick={() => setViewMode("card")}
              title="Chế độ thẻ"
              className={`p-2 rounded-md border transition cursor-pointer ${
                viewMode === "card"
                  ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              <GridIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Chế độ danh sách"
              className={`p-2 rounded-md border transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              <ListBulletIcon className="h-5 w-5" />
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
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
          className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {isLoadingEvents && !selectedEvent ? (
         <div className="flex justify-center items-center min-h-[200px]">
            <ReloadIcon className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="ml-3 text-gray-500 italic">Đang cập nhật danh sách sự kiện...</p>
         </div>
      ) : selectedEvent ? (
        <div className="p-6 border rounded-lg shadow-lg bg-gray-50 mb-6">
          <button
            onClick={onBackToList}
            className="mb-4 text-sm text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer p-1 rounded hover:bg-indigo-50"
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
            Quay lại
          </button>
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
            <div className="flex-shrink-0 w-full md:w-1/3 lg:w-1/4">
              {selectedEvent.avatarUrl ? (
                <Image
                  src={selectedEvent.avatarUrl}
                  alt={`Avatar for ${selectedEvent.title}`}
                  width={300}
                  height={300}
                  className="w-full h-auto max-h-80 rounded-lg object-cover border p-1 bg-white shadow-md"
                />
              ) : (
                <div className="w-full h-48 md:h-64 lg:h-80 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-5xl font-semibold border">
                  {selectedEvent.title?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>
            <div className="flex-grow space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex-1">
                  {selectedEvent.title}
                </h2>
                {(() => {
                  const status = getEventStatus(selectedEvent.date);
                  return (
                    <span
                      className={`${getStatusBadgeClasses(
                        status
                      )} mt-1 sm:mt-0 flex-shrink-0`}
                    >
                      {getStatusIcon(status)} {getStatusText(status)}
                    </span>
                  );
                })()}
              </div>
              <div className="space-y-2 text-sm text-gray-700 border-b pb-4 mb-4">
                <p>
                  <strong className="font-medium text-gray-900 w-24 inline-block">
                    📅 Ngày:
                  </strong>
                  {new Date(selectedEvent.date).toLocaleDateString(
                    "vi-VN"
                  )}
                </p>
                {selectedEvent.time && (
                  <p>
                    <strong className="font-medium text-gray-900 w-24 inline-block">
                      🕒 Thời gian:
                    </strong>
                    {new Date(selectedEvent.time).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                <p>
                  <strong className="font-medium text-gray-900 w-24 inline-block">
                    📍 Địa điểm:
                  </strong>
                  {selectedEvent.location}
                </p>
                <p>
                  <strong className="font-medium text-gray-900 w-24 inline-block">
                    👤 Người tạo:
                  </strong>
                  {selectedEvent.createdBy
                    ? `ID: ${selectedEvent.createdBy}`
                    : "N/A"}
                </p>
                {selectedEvent.purpose && (
                  <p>
                    <strong className="font-medium text-gray-900 w-24 inline-block align-top">
                      🎯 Mục đích:
                    </strong>
                    <span className="inline-block max-w-[calc(100%-6rem)]">
                      {selectedEvent.purpose}
                    </span>
                  </p>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900 mb-1">
                    📜 Nội dung:
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedEvent.content ||
                      selectedEvent.description ||
                      "Không có nội dung chi tiết."}
                  </p>
                </div>
                <div>
                  <strong className="font-medium text-gray-900 mb-1 block">
                    👥 Ban tổ chức:
                  </strong>
                  {selectedEvent.organizers &&
                  selectedEvent.organizers.length > 0 ? (
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1">
                      {selectedEvent.organizers.map((org, index) => (
                        <li key={`${org.userId}-${index}`}>
                          {org.roleName || org.positionName
                            ? `${org.roleName || ""}${
                                org.roleName && org.positionName ? " - " : ""
                              }${org.positionName || ""}`
                            : `Thành viên ${index + 1}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có thông tin.</p>
                  )}
                </div>
                <div>
                  <strong className="font-medium text-gray-900 mb-1 block">
                    👤 Người tham gia (Vai trò/Chức vụ):
                  </strong>
                  {selectedEvent.participants &&
                  selectedEvent.participants.length > 0 ? (
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1">
                      {selectedEvent.participants.map((p, index) => (
                        <li key={`${p.userId}-${index}`}>
                          {p.roleName || p.positionName
                            ? `${p.roleName || ""}${
                                p.roleName && p.positionName ? " - " : ""
                              }${p.positionName || ""}`
                            : `Người tham gia ${index + 1}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có thông tin.</p>
                  )}
                </div>
                <div>
                  <strong className="font-medium text-gray-900 mb-1 block">
                    ✅ Người tham dự (Đã đăng ký):
                  </strong>
                  {selectedEvent.attendees &&
                  selectedEvent.attendees.length > 0 ? (
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1">
                      {selectedEvent.attendees.map((att) => (
                        <li key={att.userId}>
                          {att.fullName || `ID: ${att.userId}`}
                          {att.studentCode && ` (${att.studentCode})`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có ai đăng ký.</p>
                  )}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                {(() => {
                  const isCreated = createdEventIds.has(selectedEvent.id);
                  const isRegistered = registeredEventIds.has(selectedEvent.id);
                  const processing = isRegistering === selectedEvent.id;
                  const status = getEventStatus(selectedEvent.date);
                  const showRegisterBtn =
                    user && !isCreated && status !== "ended";
                  const canClick =
                    showRegisterBtn && !isRegistered && !processing;
                  if (isCreated) {
                    return (
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed text-sm font-medium"
                        disabled
                      >
                        ✨ Sự kiện của bạn
                      </button>
                    );
                  } else if (showRegisterBtn) {
                    return (
                      <button
                        onClick={() => {
                          if (canClick) {
                            onRegister(selectedEvent);
                          }
                        }}
                        className={`px-4 py-2 cursor-pointer rounded-lg text-white shadow-sm transition text-sm font-medium flex items-center justify-center ${
                          isRegistered
                            ? "bg-green-500 cursor-not-allowed"
                            : processing
                            ? "bg-indigo-300 cursor-wait"
                            : "bg-indigo-500 hover:bg-indigo-600"
                        }`}
                        disabled={
                          !canClick ||
                          isLoadingRegisteredIds ||
                          isLoadingCreatedEventIds
                        }
                      >
                        {isRegistered ? (
                          <>
                            <CheckCircledIcon className="mr-1.5" /> Đã đăng ký
                          </>
                        ) : processing ? (
                          <>
                            <ReloadIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            ...
                          </>
                        ) : (
                          <>
                            <Pencil1Icon className="mr-1.5" /> Đăng ký
                          </>
                        )}
                      </button>
                    );
                  } else if (status === "ended") {
                    return (
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                        disabled
                      >
                        Đã kết thúc
                      </button>
                    );
                  } else if (!user && status !== "ended") {
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toast("Vui lòng đăng nhập để đăng ký sự kiện.", {
                            icon: "🔒",
                          });
                        }}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium"
                      >
                        Đăng nhập để đăng ký
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-1 mb-6">
          {processedEvents.length > 0 ? (
            viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedEvents.map((event) => {
                  const isRegistered = registeredEventIds.has(event.id);
                  const isCreatedByUser = createdEventIds.has(event.id);
                  const processing = isRegistering === event.id;
                  const status = getEventStatus(event.date);
                  const showRegisterButton =
                    user && !isCreatedByUser && status !== "ended";
                  const canClickRegister =
                    showRegisterButton && !isRegistered && !processing;
                  return (
                    <div
                      key={event.id}
                      className="bg-white shadow-md rounded-xl overflow-hidden transform transition hover:scale-[1.02] hover:shadow-lg flex flex-col border border-gray-200 hover:border-indigo-300"
                    >
                      <div
                        className="w-full h-40 bg-gray-200 relative cursor-pointer"
                        onClick={() => onEventClick(event)}
                      >
                        {event.avatarUrl ? (
                          <Image
                            src={event.avatarUrl}
                            alt={`Avatar for ${event.title}`}
                            layout="fill"
                            objectFit="cover"
                            className="transition-opacity duration-300 ease-in-out"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.opacity = "0";
                              if (target.parentElement)
                                target.parentElement.classList.add(
                                  "bg-gray-300"
                                );
                            }}
                            onLoad={(e) => {
                              (e.target as HTMLImageElement).style.opacity =
                                "1";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                            {event.title?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        <span
                          className={`absolute top-2 right-2 ${getStatusBadgeClasses(
                            status
                          )} shadow-sm`}
                        >
                          {getStatusIcon(status)} {getStatusText(status)}
                        </span>
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <div
                          onClick={() => onEventClick(event)}
                          className="cursor-pointer mb-3"
                        >
                          <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                            {event.title}
                          </h2>
                          <div className="space-y-0.5 mb-2">
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                              {new Date(event.date).toLocaleDateString("vi-VN")}
                            </p>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5 text-gray-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              {event.location}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-x-3 mt-1">
                            {event.organizers && (
                              <span>👥 BTC: {event.organizers.length}</span>
                            )}
                            {event.attendees && (
                              <span>✅ Đã ĐK: {event.attendees.length}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-grow"></div>
                        <div className="mt-auto pt-3 border-t border-gray-100">
                          {isCreatedByUser ? (
                            <button
                              className="w-full px-4 py-2 rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed text-sm font-medium"
                              disabled
                            >
                              ✨ Sự kiện của bạn
                            </button>
                          ) : showRegisterButton ? (
                            <button
                              onClick={() => {
                                if (canClickRegister) {
                                  onRegister(event);
                                }
                              }}
                              className={`w-full px-4 py-2 cursor-pointer rounded-lg text-white shadow-sm transition text-sm font-medium flex items-center justify-center ${
                                isRegistered
                                  ? "bg-green-500 cursor-not-allowed"
                                  : processing
                                  ? "bg-indigo-300 cursor-wait"
                                  : "bg-indigo-500 hover:bg-indigo-600"
                              }`}
                              disabled={
                                !canClickRegister ||
                                isLoadingRegisteredIds ||
                                isLoadingCreatedEventIds
                              }
                            >
                              {isRegistered ? (
                                <span>✅ Đã đăng ký</span>
                              ) : processing ? (
                                <>
                                  <ReloadIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                  ...
                                </>
                              ) : (
                                <span>📝 Đăng ký</span>
                              )}
                            </button>
                          ) : status === "ended" ? (
                            <button
                              className="w-full px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                              disabled
                            >
                              Đã kết thúc
                            </button>
                          ) : !user && status !== "ended" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toast("Vui lòng đăng nhập để đăng ký.", {
                                  icon: "🔒",
                                });
                              }}
                              className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium"
                            >
                              Đăng nhập để đăng ký
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {paginatedEvents.map((event) => {
                    const isRegistered = registeredEventIds.has(event.id);
                    const isCreatedByUser = createdEventIds.has(event.id);
                    const processing = isRegistering === event.id;
                    const status = getEventStatus(event.date);
                    const showRegisterButton =
                      user && !isCreatedByUser && status !== "ended";
                    const canClickRegister =
                      showRegisterButton && !isRegistered && !processing;
                    return (
                      <li
                        key={event.id}
                        className="px-4 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors"
                      >
                        <div
                          className="flex items-center flex-1 min-w-0 mb-2 sm:mb-0 sm:pr-4 cursor-pointer"
                          onClick={() => onEventClick(event)}
                        >
                          {event.avatarUrl ? (
                            <Image
                              src={event.avatarUrl}
                              alt={`Avatar`}
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-md object-cover mr-3 flex-shrink-0 border bg-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-semibold mr-3 flex-shrink-0 border">
                              {event.title?.charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base text-gray-800 line-clamp-1">
                              {event.title}
                            </p>
                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className={getStatusBadgeClasses(status)}>
                                {getStatusIcon(status)} {getStatusText(status)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                {new Date(event.date).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                {event.location}
                              </span>
                              {event.organizers && (
                                <span className="inline-flex items-center gap-1">
                                  👥 {event.organizers.length} BTC
                                </span>
                              )}
                              {event.attendees && (
                                <span className="inline-flex items-center gap-1">
                                  ✅ {event.attendees.length} ĐK
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                          {isCreatedByUser ? (
                            <button
                              className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed text-xs font-medium"
                              disabled
                            >
                              ✨ Sự kiện của bạn
                            </button>
                          ) : showRegisterButton ? (
                            <button
                              onClick={() => {
                                if (canClickRegister) {
                                  onRegister(event);
                                }
                              }}
                              className={`w-full sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center ${
                                isRegistered
                                  ? "bg-green-500 cursor-not-allowed"
                                  : processing
                                  ? "bg-indigo-300 cursor-wait"
                                  : "bg-indigo-500 hover:bg-indigo-600"
                              }`}
                              disabled={
                                !canClickRegister ||
                                isLoadingRegisteredIds ||
                                isLoadingCreatedEventIds
                              }
                            >
                              {isRegistered ? (
                                <span>✅ Đã đăng ký</span>
                              ) : processing ? (
                                <>
                                  <ReloadIcon className="animate-spin -ml-1 mr-1.5 h-3 w-3" />
                                  ...
                                </>
                              ) : (
                                <span>📝 Đăng ký</span>
                              )}
                            </button>
                          ) : status === "ended" ? (
                            <button
                              className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-300 text-gray-600 cursor-not-allowed text-xs font-medium"
                              disabled
                            >
                              Đã kết thúc
                            </button>
                          ) : !user && status !== "ended" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toast("Vui lòng đăng nhập để đăng ký.", {
                                  icon: "🔒",
                                });
                              }}
                              className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-xs font-medium"
                            >
                              Đăng nhập để đăng ký
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          ) : (
            <p className="text-gray-500 text-center col-span-1 md:col-span-2 lg:col-span-3 py-6 italic">
              Không tìm thấy sự kiện nào khớp với bộ lọc.
            </p>
          )}
          {processedEvents.length > 0 && totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-4">
              <span className="text-sm text-gray-600">
                Trang <span className="font-semibold">{currentPage}</span> /{" "}
                <span className="font-semibold">{totalPages}</span> (Tổng:{" "}
                {totalItems} sự kiện)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 cursor-pointer rounded-md border bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Trước
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 cursor-pointer rounded-md border bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Sau
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HomeTabContent;