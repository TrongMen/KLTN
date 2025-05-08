"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ListBulletIcon,
  Component1Icon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";
import ContactModal from "../component/modals/ContactModal";
import AboutModal from "../component/modals/AboutModal";
import ConfirmationDialog from "../../utils/ConfirmationDialog";
// --- Helper Functions ---
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


// interface ConfirmationDialogProps {




//   isOpen: boolean;
//   title: string;
//   message: React.ReactNode;
//   onConfirm: () => void;
//   onCancel: () => void;
//   confirmText?: string;
//   cancelText?: string;
//   confirmVariant?: "primary" | "danger";
// }

// function ConfirmationDialog({
//   isOpen,
//   title,
//   message,
//   onConfirm,
//   onCancel,
//   confirmText = "Xác nhận",
//   cancelText = "Hủy bỏ",
//   confirmVariant = "primary",
// }: ConfirmationDialogProps) {
//   if (!isOpen) return null;
//   const confirmButtonClasses = useMemo(() => {
//     let base =
//       "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
//     if (confirmVariant === "danger") {
//       base +=
//         "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
//     } else {
//       base +=
//         "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
//     }
//     return base;
//   }, [confirmVariant]);
//   const cancelButtonClasses =
//     "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";

//   return (
//     <div
//       className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300 ease-out"
//       onClick={onCancel}
//       role="dialog"
//       aria-modal="true"
//       aria-labelledby="dialog-title"
//     >
//       <div
//         className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 ease-out scale-100"
//         onClick={(e) => e.stopPropagation()}
//       >
//         <h3
//           id="dialog-title"
//           className={`text-lg font-bold mb-3 ${
//             confirmVariant === "danger" ? "text-red-700" : "text-gray-800"
//           }`}
//         >
//           {title}
//         </h3>
//         <div className="text-sm text-gray-600 mb-5">{message}</div>
//         <div className="flex gap-3">
//           <button onClick={onCancel} className={cancelButtonClasses}>
//             {cancelText}
//           </button>
//           <button onClick={onConfirm} className={confirmButtonClasses}>
//             {confirmText}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }







// --- Main Dashboard Component ---
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("events");
  const [events, setEvents] = useState([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [errorEvents, setErrorEvents] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [newsList, setNewsList] = useState([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [errorNews, setErrorNews] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [searchNews, setSearchNews] = useState("");

  const [user, setUser] = useState(null);
  const router = useRouter();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [showContactModal, setShowContactModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  const [searchEvents, setSearchEvents] = useState("");
  const [eventSortOption, setEventSortOption] = useState<"date" | "az" | "za">(
    "date"
  );
  // Thêm 'upcoming' và 'ended' vào type và giá trị mặc định
  const [eventTimeFilterOption, setEventTimeFilterOption] = useState<
    | "all"
    | "upcoming"
    | "ended"
    | "today"
    | "thisWeek"
    | "thisMonth"
    | "dateRange"
  >("upcoming");
  const [eventStartDateFilter, setEventStartDateFilter] = useState<string>("");
  const [eventEndDateFilter, setEventEndDateFilter] = useState<string>("");
  const [eventViewMode, setEventViewMode] = useState<"list" | "card">("card");
  const [eventCurrentPage, setEventCurrentPage] = useState<number>(1);
  const [eventItemsPerPage, setEventItemsPerPage] = useState<number>(6);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setErrorEvents(null);
    try {
      const response = await fetch(
        "http://localhost:8080/identity/api/events/status/notoken?status=APPROVED"
      );
      if (!response.ok) {
        let errorMessage = `Lỗi HTTP: ${response.status} - ${response.statusText}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message || errorMessage;
        } catch (parseError) {}
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (data && data.code === 1000 && Array.isArray(data.result)) {
        const formattedEvents = data.result
          .filter((event) => !event.deleted)
          .map((event, index) => ({
            id: event.id,
            title: event.name || "Chưa có tiêu đề",
            date: event.time,
            location: event.location || "Chưa cập nhật",
            description: event.content || event.purpose || "Chưa có mô tả",
            speaker:
              event.organizers && event.organizers.length > 0
                ? event.organizers
                    .map((o) => `${o.roleName || ""} - ${o.positionName || ""}`)
                    .join(", ")
                : "Chưa có thông tin",
            image: event.avatarUrl || `/image/${(index % 3) + 1}.png`,
            purpose: event.purpose,
            attendees: event.attendees || [],
            organizers: event.organizers || [],
            status: event.status,
            createdAt: event.createdAt,
            createdBy: event.createdBy,
          }));
        setEvents(formattedEvents);
      } else {
        setErrorEvents(
          data.message ||
            "Không thể lấy dữ liệu sự kiện hoặc định dạng dữ liệu không đúng."
        );
        setEvents([]);
      }
    } catch (err) {
      console.error("Lỗi khi gọi API sự kiện:", err);
      setErrorEvents(err instanceof Error ? err.message : String(err));
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const fetchNews = useCallback(async () => {
    setIsLoadingNews(true);
    setErrorNews(null);
    try {
      const response = await fetch(
        "http://localhost:8080/identity/api/news/status/notoken?status=APPROVED"
      );
      if (!response.ok) {
        let errorMessage = `Lỗi HTTP: ${response.status} - ${response.statusText}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.message || errorMessage;
        } catch (parseError) {}
        throw new Error(errorMessage);
      }
      const data = await response.json();
      if (data && data.code === 1000 && Array.isArray(data.result)) {
        setNewsList(data.result);
      } else {
        setErrorNews(
          data.message ||
            "Không thể lấy dữ liệu tin tức hoặc định dạng dữ liệu không đúng."
        );
        setNewsList([]);
      }
    } catch (err) {
      console.error("Lỗi khi gọi API tin tức:", err);
      setErrorNews(err instanceof Error ? err.message : String(err));
      setNewsList([]);
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchNews();
  }, [fetchEvents, fetchNews]);

  const processedEvents = useMemo(() => {
    let filtered = [...events];
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // 1. Filter by Time
    if (eventTimeFilterOption !== "all") {
      filtered = filtered.filter((event) => {
        if (!event.date) return eventTimeFilterOption === "upcoming"; // Assume upcoming if no date
        try {
          const eventDate = new Date(event.date);
          if (isNaN(eventDate.getTime()))
            return eventTimeFilterOption === "upcoming"; // Assume upcoming if invalid date

          switch (eventTimeFilterOption) {
            case "upcoming":
              return eventDate >= todayStart;
            case "ended":
              return eventDate < todayStart;
            case "today":
              const todayEnd = new Date(todayStart);
              todayEnd.setDate(todayEnd.getDate() + 1);
              return eventDate >= todayStart && eventDate < todayEnd;
            case "thisWeek":
              const { startOfWeek, endOfWeek } = getWeekRange(now);
              return eventDate >= startOfWeek && eventDate <= endOfWeek;
            case "thisMonth":
              const { startOfMonth, endOfMonth } = getMonthRange(now);
              return eventDate >= startOfMonth && eventDate <= endOfMonth;
            case "dateRange":
              if (!eventStartDateFilter || !eventEndDateFilter) return true;
              const start = new Date(eventStartDateFilter);
              start.setHours(0, 0, 0, 0);
              const end = new Date(eventEndDateFilter);
              end.setHours(23, 59, 59, 999);
              return (
                !isNaN(start.getTime()) &&
                !isNaN(end.getTime()) &&
                start <= end &&
                eventDate >= start &&
                eventDate <= end
              );
            default:
              return true;
          }
        } catch {
          return false;
        }
      });
    }

    if (searchEvents.trim()) {
      const lowerSearchTerm = searchEvents.trim().toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(lowerSearchTerm) ||
          (event.location &&
            event.location.toLowerCase().includes(lowerSearchTerm))
      );
    }

    filtered.sort((a, b) => {
      if (eventSortOption === "date") {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1; // Put events without dates last
        if (isNaN(dateB)) return -1;
        return dateA - dateB;
      } else if (eventSortOption === "az") {
        return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });
      } else if (eventSortOption === "za") {
        return b.title.localeCompare(a.title, "vi", { sensitivity: "base" });
      }
      return 0;
    });

    return filtered;
  }, [
    events,
    searchEvents,
    eventSortOption,
    eventTimeFilterOption,
    eventStartDateFilter,
    eventEndDateFilter,
  ]);

  const totalEventPages = Math.ceil(processedEvents.length / eventItemsPerPage);
  const paginatedEvents = useMemo(() => {
    const startIndex = (eventCurrentPage - 1) * eventItemsPerPage;
    const endIndex = startIndex + eventItemsPerPage;
    return processedEvents.slice(startIndex, endIndex);
  }, [processedEvents, eventCurrentPage, eventItemsPerPage]);

  const handleEventPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalEventPages) {
      setEventCurrentPage(newPage);
    }
  };

  const handleAttemptRegister = (event) => {
    event.stopPropagation();
    const eventId = event.target.dataset.eventId;
    if (!eventId) return;

    if (user) {
      if (!registeredEvents.includes(eventId)) {
        setRegisteredEvents([...registeredEvents, eventId]);
        alert("Đăng ký thành công!");
      } else {
        alert("Bạn đã đăng ký sự kiện này rồi.");
      }
    } else {
      setConfirmationState({
        isOpen: true,
        title: "Yêu cầu đăng nhập",
        message: "Vui lòng đăng nhập để đăng ký sự kiện.",
        onConfirm: () => {
          router.push("/login");
        },
        confirmVariant: "primary",
        confirmText: "Đăng nhập",
        cancelText: "Hủy bỏ",
      });
    }
  };

  const handleEventClick = (event) => setSelectedEvent(event);
  const handleNewsClick = (newsItem) => setSelectedNews(newsItem);

  const filteredNews = newsList.filter((news) =>
    news.title.toLowerCase().includes(searchNews.toLowerCase())
  );

  const renderEventContent = () => {
    if (isLoadingEvents) {
      return (
        <p className="text-center text-gray-500 col-span-full">
          Đang tải dữ liệu sự kiện...
        </p>
      );
    }

    if (errorEvents) {
      return (
        <p className="text-center text-red-500 col-span-full">
          Lỗi: {errorEvents}
        </p>
      );
    }

    if (selectedEvent) {
      return (
        <div className="p-6 border rounded-lg shadow-lg bg-white col-span-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            {selectedEvent.title}
          </h2>
          {selectedEvent.image && (
            <img
              src={selectedEvent.image}
              alt={selectedEvent.title}
              className="w-full h-64 object-cover rounded-lg mb-4 bg-gray-100"
            />
          )}
          <p className="text-gray-700 mb-2">
            <strong>📅 Ngày diễn ra:</strong>{" "}
            {selectedEvent.date
              ? new Date(selectedEvent.date).toLocaleDateString("vi-VN")
              : "N/A"}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>📍 Địa điểm:</strong> {selectedEvent.location}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>🎤 Tổ chức/Diễn giả:</strong> {selectedEvent.speaker}
          </p>
          <p className="text-gray-700 mb-2">
            <strong>📜 Mục đích:</strong> {selectedEvent.purpose || "Không có"}
          </p>
          <div className="mt-3 pt-3 border-t">
            <h4 className="font-semibold text-gray-800 mb-1">
              📝 Nội dung chi tiết:
            </h4>
            <p className="text-gray-700 whitespace-pre-wrap">
              {selectedEvent.description}
            </p>
          </div>
          {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="font-semibold text-gray-700">
                👥 Người tham dự đã đăng ký ({selectedEvent.attendees.length}):
              </p>
              <ul className="list-disc list-inside text-gray-600 text-sm max-h-40 overflow-y-auto">
                {selectedEvent.attendees.map((attendee) => (
                  <li key={attendee.userId}>
                    {attendee.fullName || "N/A"} (
                    {attendee.studentCode || "N/A"}) -{" "}
                    {attendee.attending ? "Đã điểm danh" : "Chưa điểm danh"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={() => setSelectedEvent(null)}
            className="mt-6 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer"
          >
            Đóng chi tiết
          </button>
        </div>
      );
    }

    return (
      <>
        <div
          className={`grid gap-6 ${
            eventViewMode === "card"
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : "grid-cols-1"
          }`}
        >
          {paginatedEvents.length > 0 ? (
            paginatedEvents.map((event) => {
              const isRegistered = registeredEvents.includes(event.id);
              const eventDate = event.date ? new Date(event.date) : null;
              const isPastEvent = eventDate ? eventDate < today : false;

              return (
                <div
                  key={event.id}
                  className={`bg-white shadow-lg rounded-xl overflow-hidden transition transform hover:scale-[1.02] hover:shadow-xl ${
                    eventViewMode === "list"
                      ? "flex flex-col md:flex-row"
                      : "flex flex-col"
                  }`}
                  onClick={() => handleEventClick(event)}
                >
                  <div
                    className={`relative ${
                      eventViewMode === "list"
                        ? "w-full md:w-1/3 flex-shrink-0 h-48 md:h-full"
                        : "w-full h-48"
                    }`}
                  >
                    {event.image && (
                      <Image
                        src={event.image}
                        alt={event.title}
                        layout="fill"
                        objectFit="cover"
                        className="bg-gray-100"
                      />
                    )}
                    {!event.image && (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                        {event.title?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div
                    className={`p-4 flex flex-col justify-between flex-grow ${
                      eventViewMode === "list" ? "md:pl-4" : ""
                    }`}
                  >
                    <div>
                      <h2
                        className={`font-semibold text-gray-800 mb-1 ${
                          eventViewMode === "card" ? "text-lg" : "text-md"
                        }`}
                      >
                        {event.title}
                      </h2>
                      <p className="text-xs text-gray-500 mb-2">
                        <span className="inline-flex items-center mr-3">
                          <CalendarIcon className="w-3.5 h-3.5 mr-1" />{" "}
                          {event.date
                            ? new Date(event.date).toLocaleDateString("vi-VN")
                            : "N/A"}
                        </span>
                        <span className="inline-flex items-center">
                          📍 {event.location}
                        </span>
                      </p>
                      {eventViewMode === "list" && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <button
                      data-event-id={event.id}
                      onClick={handleAttemptRegister}
                      disabled={isRegistered || isPastEvent}
                      className={`mt-3 w-full px-3 py-1.5 text-xs rounded-md transition font-medium ${
                        isRegistered
                          ? "bg-green-100 text-green-700 cursor-default"
                          : isPastEvent
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                      }`}
                    >
                      {isRegistered
                        ? "✔ Đã đăng ký"
                        : isPastEvent
                        ? "Đã diễn ra"
                        : "Đăng ký tham gia"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 text-center col-span-full">
              🚀 Không có sự kiện nào phù hợp.
            </p>
          )}
        </div>

        {totalEventPages > 1 && (
          <div className="mt-8 flex justify-center items-center space-x-3">
            <button
              onClick={() => handleEventPageChange(eventCurrentPage - 1)}
              disabled={eventCurrentPage === 1}
              className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Trang trước"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Trang {eventCurrentPage} / {totalEventPages}
            </span>
            <button
              onClick={() => handleEventPageChange(eventCurrentPage + 1)}
              disabled={eventCurrentPage >= totalEventPages}
              className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Trang sau"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        )}
      </>
    );
  };

  const renderNewsContent = () => {
    if (isLoadingNews) {
      return (
        <p className="text-center text-gray-500 col-span-full">
          Đang tải dữ liệu tin tức...
        </p>
      );
    }

    if (errorNews) {
      return (
        <p className="text-center text-red-500 col-span-full">
          Lỗi: {errorNews}
        </p>
      );
    }

    if (selectedNews) {
      return (
        <div className="p-6 border rounded-lg shadow-lg bg-white col-span-full">
          <h2 className="text-xl font-semibold text-gray-800">
            {selectedNews.title}
          </h2>
          {selectedNews.publishedAt && (
            <p className="text-gray-600">
              📅 Ngày xuất bản:{" "}
              {new Date(selectedNews.publishedAt).toLocaleDateString("vi-VN")}
            </p>
          )}
          {selectedNews.createdBy && (
            <p className="text-gray-600">
              ✍️ Người tạo: {selectedNews.createdBy.firstName}{" "}
              {selectedNews.createdBy.lastName}
            </p>
          )}
          <div
            className="mt-2 text-gray-700 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedNews.content }}
          />
          <button
            onClick={() => setSelectedNews(null)}
            className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer"
          >
            {" "}
            Đóng{" "}
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNews.length > 0 ? (
          filteredNews.map((newsItem) => (
            <div
              key={newsItem.id}
              className="p-4 bg-white shadow rounded-lg flex flex-col justify-between border border-gray-200 hover:shadow-md transition-shadow duration-150 cursor-pointer"
              onClick={() => handleNewsClick(newsItem)}
            >
              <div>
                {newsItem.coverImageUrl && (
                  <Image
                    src={newsItem.coverImageUrl}
                    alt={newsItem.title}
                    width={500}
                    height={300}
                    className="w-full h-40 object-cover rounded-lg mb-3 bg-gray-100"
                  />
                )}
                <h2 className="text-md font-semibold text-gray-800 line-clamp-2 mb-1">
                  {newsItem.title}
                </h2>
                {newsItem.publishedAt && (
                  <p className="text-xs text-gray-500 mb-2">
                    📅{" "}
                    {new Date(newsItem.publishedAt).toLocaleDateString("vi-VN")}
                  </p>
                )}
                {newsItem.createdBy && (
                  <p className="text-xs text-gray-500">
                    ✍️ {newsItem.createdBy.firstName}{" "}
                    {newsItem.createdBy.lastName}
                  </p>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewsClick(newsItem);
                }}
                className="mt-3 w-full text-center px-3 py-1.5 text-xs rounded-md transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium"
              >
                {" "}
                Xem chi tiết{" "}
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center col-span-full">
            {" "}
            Không có tin tức nào phù hợp.{" "}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold">Quản lý sự kiện</div>
          <div className="flex items-center gap-6">
           
              <span className="cursor-pointer hover:text-gray-300"
                onClick={() => setShowAboutModal(true)}
              >
              
                Giới thiệu
              </span>
           
            <span
              className="cursor-pointer hover:text-gray-300"
              onClick={() => setShowContactModal(true)}
            >
              {" "}
              Liên hệ{" "}
            </span>
            {user ? (
              <div className="flex items-center gap-2">
                {" "}
                <span className="text-sm">
                  Chào, {user.firstName || user.username}!
                </span>{" "}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link href="/login">
                  {" "}
                  <button className="cursor-pointer px-3 py-1 bg-blue-500 hover:bg-blue-700 text-white rounded-md text-sm">
                    {" "}
                    Đăng nhập{" "}
                  </button>{" "}
                </Link>
                <Link href="/register">
                  {" "}
                  <button className="px-3 cursor-pointer py-1 bg-green-500 hover:bg-green-700 text-white rounded-md text-sm">
                    {" "}
                    Đăng ký{" "}
                  </button>{" "}
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6">
        <div className="mb-4 border-b border-gray-200">
          <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
            <li className="mr-2">
              {" "}
              <button
                onClick={() => setActiveTab("events")}
                className={`inline-flex p-4 rounded-t-lg cursor-pointer ${
                  activeTab === "events"
                    ? "text-blue-600 border-b-2 border-blue-600 active font-semibold"
                    : "text-gray-500 hover:text-gray-600 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 border-b-2 border-transparent"
                }`}
              >
                {" "}
                Sự kiện{" "}
              </button>{" "}
            </li>
            <li className="mr-2">
              {" "}
              <button
                onClick={() => setActiveTab("news")}
                className={`inline-flex p-4 rounded-t-lg cursor-pointer ${
                  activeTab === "news"
                    ? "text-blue-600 border-b-2 border-blue-600 active font-semibold"
                    : "text-gray-500 hover:text-gray-600 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 border-b-2 border-transparent"
                }`}
              >
                {" "}
                Bảng tin{" "}
              </button>{" "}
            </li>
          </ul>
        </div>

        {activeTab === "events" && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-4">
              🎉 Sự kiện{" "}
            </h1>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="relative">
                  <label
                    htmlFor="searchMyEvents"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    {" "}
                    Tìm kiếm sự kiện{" "}
                  </label>
                  <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                    {" "}
                    <MagnifyingGlassIcon className="w-4 h-4" />{" "}
                  </span>
                  <input
                    type="text"
                    id="searchMyEvents"
                    placeholder="Tên hoặc địa điểm..."
                    value={searchEvents}
                    onChange={(e) => setSearchEvents(e.target.value)}
                    className="w-full p-2 pl-9 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sortMyEvents"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    {" "}
                    Sắp xếp theo{" "}
                  </label>
                  <select
                    id="sortMyEvents"
                    value={eventSortOption}
                    onChange={(e) => setEventSortOption(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.5rem center",
                      backgroundSize: "1.5em 1.5em",
                    }}
                  >
                    <option value="date">Ngày diễn ra</option>
                    <option value="az">Tên A-Z</option>
                    <option value="za">Tên Z-A</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="timeFilterMyEvents"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    {" "}
                    Thời gian{" "}
                  </label>
                  <select
                    id="timeFilterMyEvents"
                    value={eventTimeFilterOption}
                    onChange={(e) =>
                      setEventTimeFilterOption(e.target.value as any)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.5rem center",
                      backgroundSize: "1.5em 1.5em",
                    }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="upcoming">☀️ Sắp diễn ra</option>
                    <option value="ended">🏁 Đã diễn ra</option>
                    <option value="today">📅 Hôm nay</option>
                    <option value="thisWeek">🗓️ Tuần này</option>
                    <option value="thisMonth">🗓️ Tháng này</option>
                    <option value="dateRange">🔢 Khoảng ngày</option>
                  </select>
                </div>
                <div className="flex items-end justify-start md:justify-end gap-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1 invisible">
                    Xem
                  </label>
                  <div className="flex w-full sm:w-auto">
                    <button
                      onClick={() => setEventViewMode("list")}
                      title="Danh sách"
                      className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out cursor-pointer ${
                        eventViewMode === "list"
                          ? "bg-blue-600 border-blue-700 text-white shadow-sm z-10"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      {" "}
                      <ListBulletIcon className="h-5 w-5" />{" "}
                    </button>
                    <button
                      onClick={() => setEventViewMode("card")}
                      title="Thẻ"
                      className={`flex-1 sm:flex-none p-2 rounded-r-md border transition duration-150 ease-in-out cursor-pointer ${
                        eventViewMode === "card"
                          ? "bg-blue-600 border-blue-700 text-white shadow-sm z-10"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      {" "}
                      <Component1Icon className="h-5 w-5" />{" "}
                    </button>
                  </div>
                </div>
              </div>
              {eventTimeFilterOption === "dateRange" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    {" "}
                    <label
                      htmlFor="startDateFilterEvents"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      {" "}
                      <span className="inline-block mr-1">🗓️</span> Từ ngày{" "}
                    </label>{" "}
                    <input
                      type="date"
                      id="startDateFilterEvents"
                      value={eventStartDateFilter}
                      onChange={(e) => setEventStartDateFilter(e.target.value)}
                      max={eventEndDateFilter || undefined}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                    />{" "}
                  </div>
                  <div>
                    {" "}
                    <label
                      htmlFor="endDateFilterEvents"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      {" "}
                      <span className="inline-block mr-1">🗓️</span> Đến ngày{" "}
                    </label>{" "}
                    <input
                      type="date"
                      id="endDateFilterEvents"
                      value={eventEndDateFilter}
                      onChange={(e) => setEventEndDateFilter(e.target.value)}
                      min={eventStartDateFilter || undefined}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                    />{" "}
                  </div>
                </div>
              )}
            </div>
            {renderEventContent()}
          </div>
        )}

        {activeTab === "news" && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-4">
              📰 Bảng tin
            </h1>
            <div className="relative w-full max-w-7xl mb-6">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                {" "}
                <MagnifyingGlassIcon className="w-4 h-4" />{" "}
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm tin tức theo tiêu đề..."
                className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                value={searchNews}
                onChange={(e) => setSearchNews(e.target.value)}
              />
            </div>
            {renderNewsContent()}
          </div>
        )}
      </div>

      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}
      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}

      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmVariant={confirmationState.confirmVariant}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={() => {
          if (confirmationState.onConfirm) confirmationState.onConfirm();
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          });
        }}
        onCancel={() =>
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          })
        }
      />
    </div>
  );
}
