"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { EventDisplayInfo, User, NewsItem } from "../homeuser"; // Giả sử đường dẫn đúng
import CreateNewsModal, { NewsFormData } from "./CreateNewsModal";
import NewsFeedSection from "./NewsFeedSection";
import { useRefreshToken } from "../../../hooks/useRefreshToken";
import {
  PersonIcon,
  IdCardIcon,
  CheckIcon,
  Cross2Icon,
  ReloadIcon,
  Pencil1Icon,
  CheckCircledIcon,
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
  newsItems: NewsItem[];
  isLoadingNews: boolean;
  errorNews: string | null;
  refreshNewsList: () => void;
  refreshToken?: () => Promise<string | null>; // Đảm bảo refreshToken được truyền nếu cần
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
  refreshNewsList,
  refreshToken, // Nhận refreshToken
}) => {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);

  const processedEvents = useMemo(() => {
    let evts = [...allEvents];
    if (search) {
      const l = search.toLowerCase();
      evts = evts.filter(
        (e) =>
          e.title.toLowerCase().includes(l) ||
          (e.location && e.location.toLowerCase().includes(l))
      );
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (timeFilterOption === "today") {
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
    if (sortOption === "za") {
      evts.sort((a, b) =>
        b.title.localeCompare(a.title, "vi", { sensitivity: "base" })
      );
    } else {
      // Default to 'az' or any other value
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
      toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: "⚠️" });
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

  const handleNewsFormSubmit = async (
    formData: NewsFormData,
    newsId?: string
  ) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thực hiện.");
      return;
    }
    setIsSubmittingNews(true);
    const apiFormData = new FormData();
    apiFormData.append("title", formData.title);
    apiFormData.append("content", formData.content); // Luôn gửi content
    if (formData.eventId) {
      apiFormData.append("eventId", formData.eventId);
    }

    let API_URL = "http://localhost:8080/identity/api/news";
    let method = "POST";
    let currentToken = localStorage.getItem("authToken");

    // Logic xử lý khi chỉnh sửa (PUT)
    if (newsId) {
      API_URL = `http://localhost:8080/identity/api/news/${newsId}`; // Chỉ cần ID tin tức
      method = "PUT";
      // Chỉ gửi ảnh nếu người dùng chọn ảnh mới
      if (formData.imageFile) {
        apiFormData.append("coverImage", formData.imageFile);
      }
      // Không gửi createdById khi PUT
    }
    // Logic xử lý khi tạo mới (POST)
    else {
      apiFormData.append("type", "NEWS"); // Mặc định hoặc tùy chỉnh nếu cần
      apiFormData.append("featured", "false");
      apiFormData.append("pinned", "false");
      apiFormData.append("createdById", user.id); // ID người dùng hiện tại
      if (formData.imageFile) {
        apiFormData.append("coverImage", formData.imageFile);
      }
      // eventId đã được thêm ở trên nếu có
    }

    try {
      let headers: HeadersInit = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;

      let response = await fetch(API_URL, {
        method: method,
        headers: headers, // Không set 'Content-Type' khi dùng FormData, browser tự làm
        body: apiFormData,
      });

      // Xử lý Refresh Token nếu cần (401/403)
      if (
        (response.status === 401 || response.status === 403) &&
        currentToken &&
        refreshToken
      ) {
        console.log("Token expired or invalid, attempting refresh...");
        const newToken = await refreshToken();
        if (newToken) {
          currentToken = newToken;
          localStorage.setItem("authToken", newToken); // Cập nhật token mới
          headers["Authorization"] = `Bearer ${currentToken}`;
          console.log("Retrying API call with new token...");
          response = await fetch(API_URL, {
            // Gọi lại API với token mới
            method: method,
            headers: headers,
            body: apiFormData,
          });
        } else {
          throw new Error("Refresh token failed or missing.");
        }
      }

      const result = await response.json();

      if (response.ok && result.code === 1000) {
        toast.success(
          result.message ||
            (newsId ? "Cập nhật thành công!" : "Tạo mới thành công!")
        );
        refreshNewsList(); // Gọi hàm để tải lại danh sách tin tức
        setIsNewsModalOpen(false); // Đóng modal
        setEditingNewsItem(null); // Reset trạng thái chỉnh sửa
      } else {
        toast.error(
          result.message ||
            (newsId ? "Cập nhật thất bại." : "Tạo mới thất bại.")
        );
        console.error("API Error:", result);
      }
    } catch (error: any) {
      console.error("Error submitting news form:", error);
      if (error.message?.includes("Refresh token failed")) {
        toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
        // Có thể thêm logic chuyển hướng đăng nhập ở đây
      } else {
        toast.error("Lỗi khi gửi yêu cầu: " + error.message);
      }
    } finally {
      setIsSubmittingNews(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để tạo tin tức.");
      return;
    }
    setEditingNewsItem(null); // Đảm bảo không ở chế độ edit
    setIsNewsModalOpen(true);
  };
  const handleOpenEditModal = (newsItem: NewsItem) => {
    setEditingNewsItem(newsItem);
    setIsNewsModalOpen(true);
  };
  const handleCloseModal = () => {
    if (!isSubmittingNews) {
      // Chỉ đóng nếu không đang gửi
      setIsNewsModalOpen(false);
      setEditingNewsItem(null); // Reset khi đóng
    }
  };

  if (isLoadingEvents && isLoadingNews) {
    // Chờ cả hai load xong ban đầu
    return (
      <p className="text-center text-gray-500 italic py-6">
        Đang tải dữ liệu trang chủ...
      </p>
    );
  }
  // Hiển thị lỗi nếu có
  if (errorEvents) {
    return (
      <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
        Lỗi tải sự kiện: {errorEvents}
      </p>
    );
  }
  // Không chặn toàn bộ trang nếu chỉ lỗi news, NewsFeedSection sẽ tự xử lý lỗi của nó
  // if (errorNews) {
  //    return <p className="text-center text-red-500">Lỗi tải tin tức: {errorNews}</p>;
  // }

  return (
    <div>
      {/* Thanh Filters và Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600">
          {" "}
          🎉 Trang chủ{" "}
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          {/* Các select box và button xem */}
          <div className="flex-1 sm:flex-none">
            <label htmlFor="sortOptionGuest" className="sr-only">
              {" "}
              Sắp xếp{" "}
            </label>
            <select
              id="sortOptionGuest"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="az">🔤 A - Z</option>{" "}
              <option value="za">🔤 Z - A</option>
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
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="all">♾️ Tất cả</option>{" "}
              <option value="today">📅 Hôm nay</option>{" "}
              <option value="thisWeek">🗓️ Tuần này</option>{" "}
              <option value="thisMonth">🗓️ Tháng này</option>{" "}
              <option value="dateRange">🔢 Khoảng ngày</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setViewMode("card")}
              title="Chế độ thẻ"
              className={`p-2 rounded-md border transition ${
                viewMode === "card"
                  ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                {" "}
                <path
                  d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm0 2h10v10H5V5z"
                  clipRule="evenodd"
                  fillRule="evenodd"
                />{" "}
                <path d="M7 7h6v2H7V7zm0 4h6v2H7v-2z" />{" "}
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Chế độ danh sách"
              className={`p-2 rounded-md border transition ${
                viewMode === "list"
                  ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                {" "}
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />{" "}
              </svg>
            </button>
          </div>
        </div>
      </div>
      {/* Date Range Filter Inputs */}
      {timeFilterOption === "dateRange" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div>
            <label
              htmlFor="startDateFilterHome"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {" "}
              Từ ngày{" "}
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
              {" "}
              Đến ngày{" "}
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
      {/* Search Input */}
      <div className="relative w-full mb-6">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          {" "}
          🔍{" "}
        </span>
        <input
          id="searchGuest"
          type="text"
          placeholder="Tìm sự kiện theo tên hoặc địa điểm..."
          className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Event List/Details */}
      {isLoadingEvents ? (
        <p className="text-center text-gray-500 italic py-6">
          {" "}
          Đang tải sự kiện...{" "}
        </p>
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
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />{" "}
            </svg>
            Quay lại
          </button>
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
            {/* Cột Avatar */}
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
            {/* Cột Thông tin */}
            <div className="flex-grow space-y-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                {" "}
                {selectedEvent.title}{" "}
              </h2>
              <div className="space-y-2 text-sm text-gray-700 border-b pb-4 mb-4">
                <p>
                  {" "}
                  <strong className="font-medium text-gray-900 w-24 inline-block">
                    {" "}
                    📅 Ngày:{" "}
                  </strong>{" "}
                  {new Date(selectedEvent.date).toLocaleDateString(
                    "vi-VN"
                  )}{" "}
                </p>
                {selectedEvent.time && (
                  <p>
                    {" "}
                    <strong className="font-medium text-gray-900 w-24 inline-block">
                      {" "}
                      🕒 Thời gian:{" "}
                    </strong>{" "}
                    {new Date(selectedEvent.time).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                  </p>
                )}
                <p>
                  {" "}
                  <strong className="font-medium text-gray-900 w-24 inline-block">
                    {" "}
                    📍 Địa điểm:{" "}
                  </strong>{" "}
                  {selectedEvent.location}{" "}
                </p>
                <p>
                  {" "}
                  <strong className="font-medium text-gray-900 w-24 inline-block">
                    {" "}
                    👤 Người tạo:{" "}
                  </strong>{" "}
                  {selectedEvent.createdBy
                    ? `ID: ${selectedEvent.createdBy}`
                    : "N/A"}{" "}
                </p>
                {selectedEvent.purpose && (
                  <p>
                    {" "}
                    <strong className="font-medium text-gray-900 w-24 inline-block align-top">
                      {" "}
                      🎯 Mục đích:{" "}
                    </strong>{" "}
                    <span className="inline-block max-w-[calc(100%-6rem)]">
                      {" "}
                      {selectedEvent.purpose}{" "}
                    </span>{" "}
                  </p>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  {" "}
                  <p className="font-medium text-gray-900 mb-1">
                    📜 Nội dung:
                  </p>{" "}
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {" "}
                    {selectedEvent.content ||
                      selectedEvent.description ||
                      "Không có nội dung chi tiết."}{" "}
                  </p>{" "}
                </div>
                {/* Hiển thị Ban Tổ chức */}
                <div>
                  {" "}
                  <strong className="font-medium text-gray-900 mb-1 block">
                    {" "}
                    👥 Ban tổ chức:{" "}
                  </strong>{" "}
                  {selectedEvent.organizers &&
                  selectedEvent.organizers.length > 0 ? (
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1">
                      {" "}
                      {selectedEvent.organizers.map((org, index) => (
                        <li key={`${org.userId}-${index}`}>
                          {" "}
                          {org.roleName || org.positionName
                            ? `${org.roleName || ""}${
                                org.roleName && org.positionName ? " - " : ""
                              }${org.positionName || ""}`
                            : `Thành viên ${index + 1}`}{" "}
                        </li>
                      ))}{" "}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có thông tin.</p>
                  )}{" "}
                </div>
                {/* Hiển thị Người tham gia (Participants) */}
                <div>
                  {" "}
                  <strong className="font-medium text-gray-900 mb-1 block">
                    {" "}
                    👤 Người tham gia (Vai trò/Chức vụ):{" "}
                  </strong>{" "}
                  {selectedEvent.participants &&
                  selectedEvent.participants.length > 0 ? (
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1">
                      {" "}
                      {selectedEvent.participants.map((p, index) => (
                        <li key={`${p.userId}-${index}`}>
                          {" "}
                          {p.roleName || p.positionName
                            ? `${p.roleName || ""}${
                                p.roleName && p.positionName ? " - " : ""
                              }${p.positionName || ""}`
                            : `Người tham gia ${index + 1}`}{" "}
                        </li>
                      ))}{" "}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có thông tin.</p>
                  )}{" "}
                </div>
                {/* Hiển thị Người tham dự (Attendees) */}
                <div>
                  {" "}
                  <strong className="font-medium text-gray-900 mb-1 block">
                    {" "}
                    ✅ Người tham dự (Đã đăng ký):{" "}
                  </strong>{" "}
                  {selectedEvent.attendees &&
                  selectedEvent.attendees.length > 0 ? (
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1">
                      {" "}
                      {selectedEvent.attendees.map((att) => (
                        <li key={att.userId}>
                          {" "}
                          {att.fullName || `ID: ${att.userId}`}{" "}
                          {att.studentCode && ` (${att.studentCode})`}{" "}
                        </li>
                      ))}{" "}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có ai đăng ký.</p>
                  )}{" "}
                </div>
              </div>
              {/* Nút đăng ký trong chi tiết */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                {(() => {
                  const isCreated = createdEventIds.has(selectedEvent.id);
                  const isRegistered = registeredEventIds.has(selectedEvent.id);
                  const processing = isRegistering === selectedEvent.id;
                  const isEventUpcoming =
                    new Date(selectedEvent.date) >=
                    new Date(new Date().setHours(0, 0, 0, 0));
                  const showRegisterBtn = user && !isCreated && isEventUpcoming;
                  const canClick =
                    showRegisterBtn && !isRegistered && !processing;

                  if (isCreated) {
                    return (
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed text-sm font-medium"
                        disabled
                      >
                        {" "}
                        ✨ Sự kiện của bạn{" "}
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
                        className={`px-4 py-2 rounded-lg text-white shadow-sm transition text-sm font-medium flex items-center justify-center ${
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
                        {" "}
                        {isRegistered ? (
                          <>
                            {" "}
                            <CheckCircledIcon className="mr-1.5" /> Đã đăng ký{" "}
                          </>
                        ) : processing ? (
                          <>
                            {" "}
                            <ReloadIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />{" "}
                            ...{" "}
                          </>
                        ) : (
                          <>
                            {" "}
                            <Pencil1Icon className="mr-1.5" /> Đăng ký{" "}
                          </>
                        )}{" "}
                      </button>
                    );
                  } else if (user && !isEventUpcoming && !isCreated) {
                    return (
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                        disabled
                      >
                        {" "}
                        Đã kết thúc{" "}
                      </button>
                    );
                  } else if (!user && isEventUpcoming) {
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
                        {" "}
                        Đăng nhập để đăng ký{" "}
                      </button>
                    );
                  } else if (!user && !isEventUpcoming) {
                    return (
                      <button
                        className="px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                        disabled
                      >
                        {" "}
                        Đã kết thúc{" "}
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
              // Card View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processedEvents.map((event) => {
                  const isRegistered = registeredEventIds.has(event.id);
                  const isCreatedByUser = createdEventIds.has(event.id);
                  const processing = isRegistering === event.id;
                  const isEventUpcoming =
                    new Date(event.date) >=
                    new Date(new Date().setHours(0, 0, 0, 0));
                  const showRegisterButton =
                    user && !isCreatedByUser && isEventUpcoming;
                  const canClickRegister =
                    showRegisterButton && !isRegistered && !processing;
                  return (
                    <div
                      key={event.id}
                      className="bg-white shadow-md rounded-xl overflow-hidden transform transition hover:scale-[1.02] hover:shadow-lg flex flex-col border border-gray-200 hover:border-indigo-300"
                    >
                      {/* Image/Placeholder */}
                      {event.avatarUrl ? (
                        <div
                          className="w-full h-40 bg-gray-200 relative cursor-pointer"
                          onClick={() => onEventClick(event)}
                        >
                          {" "}
                          <Image
                            src={event.avatarUrl}
                            alt={`Avatar for ${event.title}`}
                            layout="fill"
                            objectFit="cover"
                            className="transition-opacity duration-300 ease-in-out opacity-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity =
                                "0";
                              (
                                e.target as HTMLImageElement
                              ).parentElement?.classList.add("bg-gray-300");
                            }}
                            onLoad={(e) => {
                              (e.target as HTMLImageElement).style.opacity =
                                "1";
                            }}
                          />{" "}
                        </div>
                      ) : (
                        <div
                          className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold cursor-pointer"
                          onClick={() => onEventClick(event)}
                        >
                          {" "}
                          {event.title?.charAt(0).toUpperCase() || "?"}{" "}
                        </div>
                      )}
                      {/* Content */}
                      <div className="p-4 flex flex-col flex-grow justify-between">
                        <div
                          onClick={() => onEventClick(event)}
                          className="cursor-pointer flex-grow mb-3"
                        >
                          <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                            {" "}
                            {event.title}{" "}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {" "}
                            📅{" "}
                            {new Date(event.date).toLocaleDateString(
                              "vi-VN"
                            )}{" "}
                          </p>
                          <p className="text-sm text-gray-600 mb-2">
                            {" "}
                            📍 {event.location}{" "}
                          </p>
                          <div className="text-xs text-gray-500 flex items-center gap-x-3 mt-1">
                            {event.organizers && (
                              <span>👥 BTC: {event.organizers.length}</span>
                            )}
                            {event.attendees && (
                              <span>✅ Đã ĐK: {event.attendees.length}</span>
                            )}
                          </div>
                        </div>
                        {/* Button Area */}
                        <div className="mt-auto">
                          {isCreatedByUser ? (
                            <button
                              className="w-full px-4 py-2 rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed text-sm font-medium"
                              disabled
                            >
                              {" "}
                              ✨ Sự kiện của bạn{" "}
                            </button>
                          ) : showRegisterButton ? (
                            <button
                              onClick={() => {
                                if (canClickRegister) {
                                  onRegister(event);
                                }
                              }}
                              className={`w-full px-4 py-2 rounded-lg text-white shadow-sm transition text-sm font-medium flex items-center justify-center ${
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
                              {" "}
                              {isRegistered ? (
                                <span>✅ Đã đăng ký</span>
                              ) : processing ? (
                                <>
                                  {" "}
                                  <svg
                                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    {" "}
                                    <circle
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                      className="opacity-25"
                                    ></circle>{" "}
                                    <path
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      className="opacity-75"
                                    ></path>{" "}
                                  </svg>{" "}
                                  ...{" "}
                                </>
                              ) : (
                                <span>📝 Đăng ký</span>
                              )}{" "}
                            </button>
                          ) : (
                            <>
                              {" "}
                              {user && !isEventUpcoming && !isCreatedByUser && (
                                <button
                                  className="w-full px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                                  disabled
                                >
                                  {" "}
                                  Đã kết thúc{" "}
                                </button>
                              )}{" "}
                              {!user && isEventUpcoming && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast(
                                      "Vui lòng đăng nhập để đăng ký sự kiện.",
                                      { icon: "🔒" }
                                    );
                                  }}
                                  className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium"
                                >
                                  {" "}
                                  Đăng nhập để đăng ký{" "}
                                </button>
                              )}{" "}
                              {!user && !isEventUpcoming && (
                                <button
                                  className="w-full px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                                  disabled
                                >
                                  {" "}
                                  Đã kết thúc{" "}
                                </button>
                              )}{" "}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // List View
              <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {processedEvents.map((event) => {
                    const isRegistered = registeredEventIds.has(event.id);
                    const isCreatedByUser = createdEventIds.has(event.id);
                    const processing = isRegistering === event.id;
                    const isEventUpcoming =
                      new Date(event.date) >=
                      new Date(new Date().setHours(0, 0, 0, 0));
                    const showRegisterButton =
                      user && !isCreatedByUser && isEventUpcoming;
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
                              {" "}
                              {event.title?.charAt(0).toUpperCase() || "?"}{" "}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base text-gray-800 line-clamp-1">
                              {" "}
                              {event.title}{" "}
                            </p>
                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="inline-flex items-center gap-1">
                                {" "}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  {" "}
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />{" "}
                                </svg>{" "}
                                {new Date(event.date).toLocaleDateString(
                                  "vi-VN"
                                )}{" "}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                {" "}
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  {" "}
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />{" "}
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />{" "}
                                </svg>{" "}
                                {event.location}{" "}
                              </span>
                              {event.organizers && (
                                <span className="inline-flex items-center gap-1">
                                  {" "}
                                  👥 {event.organizers.length} BTC{" "}
                                </span>
                              )}
                              {event.attendees && (
                                <span className="inline-flex items-center gap-1">
                                  {" "}
                                  ✅ {event.attendees.length} ĐK{" "}
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
                              {" "}
                              ✨ Sự kiện của bạn{" "}
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
                              {" "}
                              {isRegistered ? (
                                <span>✅ Đã đăng ký</span>
                              ) : processing ? (
                                <>
                                  {" "}
                                  <svg
                                    className="animate-spin -ml-1 mr-1.5 h-3 w-3"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    {" "}
                                    <circle
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                      className="opacity-25"
                                    ></circle>{" "}
                                    <path
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      className="opacity-75"
                                    ></path>{" "}
                                  </svg>{" "}
                                  ...{" "}
                                </>
                              ) : (
                                <span>📝 Đăng ký</span>
                              )}{" "}
                            </button>
                          ) : (
                            <>
                              {" "}
                              {user && !isEventUpcoming && !isCreatedByUser && (
                                <button
                                  className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-300 text-gray-600 cursor-not-allowed text-xs font-medium"
                                  disabled
                                >
                                  {" "}
                                  Đã kết thúc{" "}
                                </button>
                              )}{" "}
                              {!user && isEventUpcoming && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast(
                                      "Vui lòng đăng nhập để đăng ký sự kiện.",
                                      { icon: "🔒" }
                                    );
                                  }}
                                  className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-xs font-medium"
                                >
                                  {" "}
                                  Đăng nhập để đăng ký{" "}
                                </button>
                              )}{" "}
                              {!user && !isEventUpcoming && (
                                <button
                                  className="w-full sm:w-auto px-3 py-1.5 rounded-md bg-gray-300 text-gray-600 cursor-not-allowed text-xs font-medium"
                                  disabled
                                >
                                  {" "}
                                  Đã kết thúc{" "}
                                </button>
                              )}{" "}
                            </>
                          )}
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
        </div>
      )}

      {/* News Feed Section */}
      <NewsFeedSection
        newsItems={newsItems || []}
        isLoading={isLoadingNews}
        error={errorNews}
        user={user}
        onOpenCreateModal={handleOpenCreateModal}
        onOpenEditModal={handleOpenEditModal}
        onNewsDeleted={refreshNewsList} // Truyền hàm refresh vào
        refreshToken={refreshToken} // Truyền hàm refreshToken vào
      />

      {/* Create/Edit News Modal */}
      <CreateNewsModal
        isOpen={isNewsModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleNewsFormSubmit} // Truyền hàm xử lý submit
        isSubmitting={isSubmittingNews}
        editMode={!!editingNewsItem}
        initialData={editingNewsItem}
      />
    </div>
  );
};

export default HomeTabContent;
