"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { EventDisplayInfo } from "../types/appTypes"; 
import {
  ReloadIcon,
  CheckCircledIcon,
  ClockIcon,
  CalendarIcon,
  ArchiveIcon,
  ListBulletIcon,
  GridIcon,
  InfoCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

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
    if (isNaN(eventDate.getTime())) return "upcoming";
    const eventDateStart = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    if (eventDateStart < todayStart) return "ended";
    else if (eventDateStart > todayStart) return "upcoming";
    else return "ongoing";
  } catch (e) {
    console.error("Error parsing event date for getEventStatus:", e);
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

const getApprovalStatusBadgeColor = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "bg-green-100 text-green-800 border border-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};
const getApprovalStatusText = (status?: string) => {
    switch (status?.toUpperCase()) {
      case "APPROVED": return "Đã duyệt";
      case "PENDING": return "Chờ duyệt";
      case "REJECTED": return "Bị từ chối";
      default: return status || "Không rõ";
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

const AdminHomeTabContent: React.FC<AdminHomeTabContentProps> = ({
  events,
  isLoading,
  error,
  search,
  setSearch,
  sortOption,
  setSortOption,
  timeFilterOption,
  setTimeFilterOption,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  selectedEvent,
  onEventClick,
  onBackToList,
  onRefreshEvents,
}) => {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const processedEvents = useMemo(() => {
    let evts = [...events];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (timeFilterOption === "upcoming")
      evts = evts.filter((e) => getEventStatus(e.date) === "upcoming");
    else if (timeFilterOption === "ongoing")
      evts = evts.filter((e) => getEventStatus(e.date) === "ongoing");
    else if (timeFilterOption === "ended")
      evts = evts.filter((e) => getEventStatus(e.date) === "ended");
    else if (timeFilterOption === "today")
      evts = evts.filter((e) => {
        try {
          const d = new Date(e.date);
          return !isNaN(d.getTime()) && d >= todayStart && d <= todayEnd;
        } catch {
          return false;
        }
      });
    else if (timeFilterOption === "thisWeek") {
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
          (e.location && e.location.toLowerCase().includes(l)) ||
          (e.status && getApprovalStatusText(e.status).toLowerCase().includes(l)) ||
          (e.createdBy && e.createdBy.toLowerCase().includes(l))
      );
    }
    evts.sort((a, b) => {
        const isAPending = a.status === "PENDING";
        const isBPending = b.status === "PENDING";
        if (isAPending && !isBPending) return -1;
        if (!isAPending && isBPending) return 1;

        if (sortOption === "za") {
            return b.title.localeCompare(a.title, "vi", { sensitivity: "base" });
        } else if (sortOption === "az") {
            return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });
        } else {
            try {
                const dateA = a.date ? new Date(a.date).getTime() : 0;
                const dateB = b.date ? new Date(b.date).getTime() : 0;
                if (isNaN(dateA) && isNaN(dateB)) return 0;
                if (isNaN(dateA)) return 1;
                if (isNaN(dateB)) return -1;
                return dateB - dateA;
            } catch {
                return 0;
            }
        }
    });
    return evts;
  }, [
    events,
    search,
    timeFilterOption,
    sortOption,
    startDateFilter,
    endDateFilter,
  ]);

  const totalItems = processedEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
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
    setIsRefreshing(true);
    try {
      await onRefreshEvents();
      toast.success("Đã làm mới danh sách sự kiện!");
    } catch (error) {
      console.error("Lỗi khi làm mới sự kiện (AdminHomeTabContent):", error);
      toast.error("Không thể làm mới sự kiện.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600 shrink-0">
          Quản lý Sự kiện
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center flex-wrap">
          <div className="flex-grow sm:flex-grow-0">
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              title="Làm mới danh sách sự kiện"
              className="w-full h-full p-2 border cursor-pointer border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
            >
              {isRefreshing ? (
                <ReloadIcon className="w-5 h-5 animate-spin text-indigo-600" />
              ) : (
                <ReloadIcon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
          </div>
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="sortOptionAdminHome" className="sr-only">
              Sắp xếp
            </label>
            <select
              id="sortOptionAdminHome"
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="default">⭐ Ưu tiên chờ duyệt</option>
              <option value="date-desc">📅 Mới nhất</option>
              <option value="az">🔤 A - Z</option>
              <option value="za">🔤 Z - A</option>
            </select>
          </div>
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="timeFilterOptionAdminHome" className="sr-only">
              Lọc thời gian
            </label>
            <select
              id="timeFilterOptionAdminHome"
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
            <label htmlFor="itemsPerPageSelectAdmin" className="sr-only">
              Sự kiện mỗi trang
            </label>
            <select
              id="itemsPerPageSelectAdmin"
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
          <div className="flex items-center gap-2 flex-shrink-0 self-center ">
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
              htmlFor="startDateFilterAdmin"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Từ ngày
            </label>
            <input
              type="date"
              id="startDateFilterAdmin"
              value={startDateFilter}
              onChange={handleStartDateChange}
              max={endDateFilter || undefined}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="endDateFilterAdmin"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Đến ngày
            </label>
            <input
              type="date"
              id="endDateFilterAdmin"
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
          id="searchAdminHome"
          type="text"
          placeholder="Tìm theo tên, địa điểm, trạng thái duyệt, người tạo..."
          className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {isLoading && !selectedEvent ? (
         <div className="flex justify-center items-center min-h-[200px]">
           <ReloadIcon className="w-8 h-8 animate-spin text-indigo-600" />
           <p className="ml-3 text-gray-500 italic">Đang tải danh sách sự kiện...</p>
         </div>
      ) : error ? (
        <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
          Lỗi tải sự kiện: {error}
        </p>
      ) : selectedEvent ? (
        // --- Chế độ xem chi tiết ---
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
            Quay lại danh sách
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
                <div className="flex flex-col items-end sm:items-center sm:flex-row gap-2 flex-shrink-0 mt-1 sm:mt-0">
                  {(() => {
                    const status = getEventStatus(selectedEvent.date);
                    return (
                      <span
                        className={`${getStatusBadgeClasses(
                          status
                        )} flex-shrink-0`}
                      >
                        {getStatusIcon(status)} {getStatusText(status)}
                      </span>
                    );
                  })()}
                  {selectedEvent.status && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getApprovalStatusBadgeColor(
                        selectedEvent.status
                      )} flex-shrink-0`}
                    >
                      <InfoCircledIcon className="w-3 h-3" />
                      {getApprovalStatusText(selectedEvent.status)}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-700 border-b pb-4 mb-4">
                <p>
                  <strong className="font-medium text-gray-900 w-24 inline-block">
                    📅 Ngày:
                  </strong>
                  {new Date(selectedEvent.date).toLocaleDateString("vi-VN")}
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
                  {selectedEvent.createdBy ? `${selectedEvent.createdBy}` : "N/A"}
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
                        <li
                          key={`${org.userId}-${index}`}
                        >
                          {org.roleName || org.positionName
                            ? `${org.roleName || ""}${org.roleName && org.positionName ? " - " : ""}${
                                org.positionName || ""
                              }`
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
                        <li
                          key={`${p.userId}-${index}`}
                        >
                          {p.roleName || p.positionName
                            ? `${p.roleName || ""}${p.roleName && p.positionName ? " - " : ""}${
                                p.positionName || ""
                              }`
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
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1 max-h-32 overflow-y-auto">
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
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
                {/* Nút Sửa đã bị loại bỏ */}
                <button
                  onClick={() => toast.error("Chức năng xoá sự kiện tạm thời không khả dụng.")}
                  className="px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition text-sm font-medium"
                >
                  Xoá sự kiện
                </button>
                {selectedEvent.status === "PENDING" && (
                  <button
                    onClick={() =>
                      toast("Chức năng duyệt sự kiện đang được phát triển.")
                    }
                    className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition text-sm font-medium"
                  >
                    Duyệt sự kiện
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // --- Chế độ xem danh sách/thẻ ---
        <div className="mt-1 mb-6">
          {processedEvents.length > 0 ? (
            viewMode === "card" ? (
              // --- Chế độ xem thẻ (Card View) ---
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedEvents.map((event) => {
                  const timeStatus = getEventStatus(event.date);
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
                         <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                            <span className={`${getStatusBadgeClasses(timeStatus)} shadow-sm`}>
                                {getStatusIcon(timeStatus)} {getStatusText(timeStatus)}
                            </span>
                            {/* {event.status && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getApprovalStatusBadgeColor(event.status)} shadow-sm`}>
                                    <InfoCircledIcon className="w-3 h-3" /> {getApprovalStatusText(event.status)}
                                </span>
                            )} */}
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <div
                          onClick={() => onEventClick(event)}
                          className="cursor-pointer mb-3 flex-grow"
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
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {event.location}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-x-3 mt-1">
                            {event.organizers && event.organizers.length > 0 &&(
                              <span>👥 BTC: {event.organizers.length}</span>
                            )}
                            {event.attendees && event.attendees.length > 0 && (
                              <span>✅ Đã ĐK: {event.attendees.length}</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-auto pt-3 border-t border-gray-100 flex justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                            className="px-2.5 py-1 rounded text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium"
                          >
                            Chi tiết
                          </button>
                          {/* Nút Sửa đã bị loại bỏ */}
                          {/* {event.status === "PENDING" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toast("Chức năng duyệt đang phát triển"); }}
                              className="px-2.5 py-1 rounded text-xs bg-green-500 text-white hover:bg-green-600"
                            >
                              Duyệt
                            </button>
                          )} */}
                          <button
                                onClick={(e) => { e.stopPropagation(); toast.error("Chức năng xoá sự kiện tạm thời không khả dụng.");}}
                                className="px-2.5 py-1 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100"
                          >
                                Xoá
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
               // CHẾ ĐỘ DANH SÁCH (LIST VIEW) - ADMIN
                <ul className="space-y-4">
                    {paginatedEvents.map((event) => {
                    const timeStatus = getEventStatus(event.date);
                    return (
                        <li
                        key={event.id}
                        className="bg-white shadow-lg rounded-xl overflow-hidden transition transform hover:scale-[1.01] hover:shadow-xl flex flex-col md:flex-row border border-gray-200 hover:border-indigo-300"
                        >
                        <div
                            className="relative w-full md:w-1/3 xl:w-1/4 flex-shrink-0 h-48 md:h-auto cursor-pointer"
                            onClick={() => onEventClick(event)}
                        >
                            {event.avatarUrl ? (
                            <Image
                                src={event.avatarUrl}
                                alt={`Hình ảnh cho ${event.title}`}
                                layout="fill"
                                objectFit="cover"
                                className="bg-gray-100"
                            />
                            ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                                {event.title?.charAt(0).toUpperCase() || "?"}
                            </div>
                            )}
                        </div>

                        <div className="p-4 flex flex-col justify-between flex-grow md:pl-4">
                            <div className="mb-3" onClick={() => onEventClick(event)} >
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                                    <h2 className="text-md sm:text-lg font-semibold text-gray-800 hover:text-indigo-600 cursor-pointer line-clamp-2 flex-1">
                                    {event.title}
                                    </h2>
                                    <div className="flex flex-col items-end sm:items-start sm:flex-row sm:ml-2 gap-1 mt-1 sm:mt-0 shrink-0">
                                        <span className={`${getStatusBadgeClasses(timeStatus)}`}>
                                            {getStatusIcon(timeStatus)} {getStatusText(timeStatus)}
                                        </span>
                                        {/* {event.status && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getApprovalStatusBadgeColor(event.status)}`}>
                                            <InfoCircledIcon className="w-3 h-3" /> {getApprovalStatusText(event.status)}
                                            </span>
                                        )} */}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 space-y-1 mb-2">
                                    <p className="flex items-center gap-1">
                                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                    {new Date(event.date).toLocaleDateString("vi-VN")}
                                    {event.time && ` - ${new Date(event.time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit"})}`}
                                    </p>
                                    <p className="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {event.location}
                                    </p>
                                    {event.createdBy && (
                                       <p className="flex items-center gap-1">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                        Người tạo: {event.createdBy}
                                       </p>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                    {event.description || event.purpose || "Chưa có mô tả chi tiết."}
                                </p>
                                <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                                    {event.organizers && event.organizers.length > 0 && (
                                    <span className="inline-flex items-center gap-1">👥 {event.organizers.length} BTC</span>
                                    )}
                                    {event.attendees && event.attendees.length > 0 && (
                                    <span className="inline-flex items-center gap-1">✅ {event.attendees.length} ĐK</span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-auto flex justify-end gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                    className="px-3 py-1.5 rounded-md text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition font-medium"
                                >
                                    Xem chi tiết
                                </button>
                                {/* Nút Sửa đã bị loại bỏ */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); toast.error("Chức năng xoá sự kiện tạm thời không khả dụng.");}}
                                    className="px-3 py-1.5 rounded-md text-xs bg-red-100 text-red-700 hover:bg-red-200 transition font-medium"
                                >
                                    Xoá
                                </button>
                                 {/* {event.status === "PENDING" && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toast("Chức năng duyệt sự kiện đang được phát triển.");}}
                                        className="px-3 py-1.5 rounded-md text-xs bg-green-500 text-white hover:bg-green-600 transition font-medium"
                                    >
                                        Duyệt
                                    </button>
                                )} */}
                            </div>
                        </div>
                        </li>
                    );
                    })}
                </ul>
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
                <span className="font-semibold">{totalItems}</span> sự kiện)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md border cursor-pointer bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeftIcon className="w-4 h-4" /> Trước
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md border cursor-pointer bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Sau <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminHomeTabContent;