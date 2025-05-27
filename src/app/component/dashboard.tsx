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
  ClockIcon,
  CheckCircledIcon,
  ArchiveIcon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import ContactModal from "../component/modals/ContactModal";
import AboutModal from "../component/modals/AboutModal";
import ConfirmationDialog from "../../utils/ConfirmationDialog";
import NewsDetailModal from "../component/modals/NewsDetailModal";
import { toast } from "react-hot-toast";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["vietnamese", "latin"],
  weight: ["700"],
});

type EventProgressDisplayStatus = "Sắp diễn ra" | "Đang diễn ra" | "Đã kết thúc" | "Đã hủy" | "Bị hoãn" | "Chưa duyệt";


interface UserInfoFromApi {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}
interface ApiResponse {
  code: number;
  result: UserInfoFromApi;
}

interface DetailedMember {
  userId: string;
  roleName?: string;
  positionName?: string;
  fetchedFullName?: string;
}

const fetchUserFullNameById = async (userId: string): Promise<string> => {
  if (!userId || userId.trim() === "") {
    return "Không xác định";
  }
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/notoken/${userId}`
    );
    if (!response.ok) {
      return `ID: ${userId.substring(0, 8)}... (Lỗi ${response.status})`;
    }
    const apiResponseData: ApiResponse = await response.json();
    if (apiResponseData && apiResponseData.result) {
      const userData = apiResponseData.result;
      const fullName = [userData.lastName, userData.firstName]
        .filter(Boolean)
        .join(" ")
        .trim();
      return (
        fullName || userData.username || `ID: ${userId.substring(0, 8)}...`
      );
    } else {
      return `ID: ${userId.substring(0, 8)}... (Dữ liệu không hợp lệ)`;
    }
  } catch (error) {
    console.error("Error fetching user name for ID:", userId, error);
    return `ID: ${userId.substring(0, 8)}... (Lỗi xử lý)`;
  }
};

const mapProgressStatusToDisplayStatus = (progressStatus?: string | null, eventDateStr?: string | null): EventProgressDisplayStatus => {
  if (!progressStatus) return "Sắp diễn ra";

  const now = new Date();
  const eventDate = eventDateStr ? new Date(eventDateStr) : null;

  switch (progressStatus.toUpperCase()) {
    case "PENDING":
    case "APPROVED":
      if (eventDate && eventDate < now && !(now.toDateString() === eventDate.toDateString())) return "Đã kết thúc";
      return "Sắp diễn ra";
    case "IN_PROGRESS":
      return "Đang diễn ra";
    case "COMPLETED":
      return "Đã kết thúc";
    case "CANCELLED":
      return "Đã hủy";
    case "POSTPONED":
      return "Bị hoãn";
    case "DRAFT":
         return "Chưa duyệt";
    default:
      return "Sắp diễn ra";
  }
};

const getProgressStatusBadgeClasses = (displayStatus: EventProgressDisplayStatus): string => {
  const base = "px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1";
  switch (displayStatus) {
    case "Đang diễn ra":
      return `${base} bg-green-100 text-green-800`;
    case "Sắp diễn ra":
      return `${base} bg-blue-100 text-blue-800`;
    case "Đã kết thúc":
      return `${base} bg-gray-200 text-gray-700`;
    case "Đã hủy":
      return `${base} bg-red-100 text-red-800`;
    case "Bị hoãn":
      return `${base} bg-yellow-100 text-yellow-800`;
    case "Chưa duyệt":
            return `${base} bg-orange-100 text-orange-800`;
    default:
      return `${base} bg-gray-100 text-gray-600`;
  }
};

const getProgressStatusIcon = (displayStatus: EventProgressDisplayStatus) => {
  switch (displayStatus) {
    case "Đang diễn ra":
      return <CheckCircledIcon className="w-3 h-3" />;
    case "Sắp diễn ra":
      return <ClockIcon className="w-3 h-3" />;
    case "Đã kết thúc":
      return <ArchiveIcon className="w-3 h-3" />;
    case "Đã hủy":
      return <CrossCircledIcon className="w-3 h-3" />;
    case "Bị hoãn":
      return <ExclamationTriangleIcon className="w-3 h-3" />;
     case "Chưa duyệt":
            return <ExclamationTriangleIcon className="w-3 h-3" />;
    default:
      return null;
  }
};


export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("events");
  const [events, setEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [registeredEvents, setRegisteredEvents] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [newsList, setNewsList] = useState<any[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [errorNews, setErrorNews] = useState<string | null>(null);
  const [searchNews, setSearchNews] = useState("");
  const [user, setUser] = useState<any | null>(null);
  const router = useRouter();
  
  const [showContactModal, setShowContactModal] = useState(false);
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
  const [eventStatusFilterOption, setEventStatusFilterOption] = useState<
    "all" | EventProgressDisplayStatus | "dateRange"
  >("all");
  const [eventStartDateFilter, setEventStartDateFilter] = useState<string>("");
  const [eventEndDateFilter, setEventEndDateFilter] = useState<string>("");
  const [eventViewMode, setEventViewMode] = useState<"list" | "card">("card");
  const [eventCurrentPage, setEventCurrentPage] = useState<number>(1);
  const [eventItemsPerPage, setEventItemsPerPage] = useState<number>(6);
  const [isNewsDetailModalOpen, setIsNewsDetailModalOpen] =
    useState<boolean>(false);
  const [selectedNewsItemForDetail, setSelectedNewsItemForDetail] = useState<
    any | null
  >(null);

  const [detailedCreatedByName, setDetailedCreatedByName] = useState<
    string | null
  >(null);
  const [detailedOrganizers, setDetailedOrganizers] = useState<
    DetailedMember[]
  >([]);
  const [detailedParticipants, setDetailedParticipants] = useState<
    DetailedMember[]
  >([]);
  const [isLoadingEventDetails, setIsLoadingEventDetails] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setErrorEvents(null);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/status/notoken?status=APPROVED`
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
          .map((event: any, index: number) => ({
            id: event.id,
            title: event.name || "Chưa có tiêu đề",
            name: event.name,
            date: event.time,
            time: event.time,
            location: event.location || "Chưa cập nhật",
            content: event.content,
            description: event.content || event.purpose || "Chưa có mô tả",
            purpose: event.purpose,
            image: event.avatarUrl || `/image/${(index % 3) + 1}.png`,
            avatarUrl: event.avatarUrl,
            attendees: event.attendees || [],
            organizers: event.organizers || [],
            status: event.status,
            progressStatus: event.progressStatus, 
            createdAt: event.createdAt,
            createdBy: event.createdBy,
            participants: event.participants || [],
            maxAttendees: event.maxAttendees
          }));
        setEvents(formattedEvents);
      } else {
        setErrorEvents(data.message || "Không thể lấy dữ liệu sự kiện.");
        setEvents([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi gọi API sự kiện:", err);
      setErrorEvents(err.message);
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/status/notoken?status=APPROVED`
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
        const formattedNews = data.result.map((item: any) => ({
          id: item.id,
          title: item.title || "N/A",
          content: item.content,
          summary:
            item.summary ||
            item.content?.substring(0, 100) +
              (item.content?.length > 100 ? "..." : "") ||
            "",
          date: item.createdAt || item.publishedAt || "",
          imageUrl: item.coverImageUrl,
          status: item.status,
          createdBy: item.createdBy,
          publishedAt: item.publishedAt,
          event: item.event, 
          createdAt: item.createdAt,
          coverImageUrl: item.coverImageUrl,
          rejectionReason: item.rejectionReason,
        }));
        setNewsList(formattedNews);
      } else {
        setErrorNews(data.message || "Không thể lấy dữ liệu tin tức.");
        setNewsList([]);
      }
    } catch (err: any) {
      console.error("Lỗi khi gọi API tin tức:", err);
      setErrorNews(err.message);
      setNewsList([]);
    } finally {
      setIsLoadingNews(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchNews();
  }, [fetchEvents, fetchNews]);

  useEffect(() => {
    if (selectedEvent) {
      setIsLoadingEventDetails(true);
      const fetches: Promise<any>[] = [];

      if (selectedEvent.createdBy) {
        fetches.push(
          fetchUserFullNameById(selectedEvent.createdBy)
            .then((name) => ({ type: "creator", name }))
            .catch(() => ({
              type: "creator",
              name: `ID: ${selectedEvent.createdBy}`,
            }))
        );
      } else {
        setDetailedCreatedByName("N/A");
      }

      const organizersArray = selectedEvent.organizers;
      if (organizersArray && organizersArray.length > 0) {
        fetches.push(
          ...organizersArray.map((org: any) =>
            fetchUserFullNameById(org.userId)
              .then((name) => ({
                ...org,
                fetchedFullName: name,
                type: "organizer",
              }))
              .catch(() => ({
                ...org,
                fetchedFullName: `ID: ${org.userId}`,
                type: "organizer",
              }))
          )
        );
      } else {
        setDetailedOrganizers([]);
      }

      const participantsArray = selectedEvent.participants;
      if (participantsArray && participantsArray.length > 0) {
        fetches.push(
          ...participantsArray.map((p: any) =>
            fetchUserFullNameById(p.userId)
              .then((name) => ({
                ...p,
                fetchedFullName: name,
                type: "participant",
              }))
              .catch(() => ({
                ...p,
                fetchedFullName: `ID: ${p.userId}`,
                type: "participant",
              }))
          )
        );
      } else {
        setDetailedParticipants([]);
      }

      if (fetches.length > 0) {
        Promise.all(fetches)
          .then((results) => {
            const newOrganizers: DetailedMember[] = [];
            const newParticipants: DetailedMember[] = [];
            results.forEach((result) => {
              if (result.type === "creator")
                setDetailedCreatedByName(result.name);
              else if (result.type === "organizer")
                newOrganizers.push(result as DetailedMember);
              else if (result.type === "participant")
                newParticipants.push(result as DetailedMember);
            });
            setDetailedOrganizers(newOrganizers);
            setDetailedParticipants(newParticipants);
            setIsLoadingEventDetails(false);
          })
          .catch(() => {
            setIsLoadingEventDetails(false);
          });
      } else {
        setIsLoadingEventDetails(false);
      }
    } else {
      setDetailedCreatedByName(null);
      setDetailedOrganizers([]);
      setDetailedParticipants([]);
      setIsLoadingEventDetails(false);
    }
  }, [selectedEvent]);

  const processedEvents = useMemo(() => {
    if (!Array.isArray(events)) return [];
    let filtered = [...events];
    
    if (eventStatusFilterOption !== "all" && eventStatusFilterOption !== "dateRange") {
        filtered = filtered.filter(event => mapProgressStatusToDisplayStatus(event.progressStatus, event.date) === eventStatusFilterOption);
    } else if (eventStatusFilterOption === "dateRange" && eventStartDateFilter && eventEndDateFilter) {
        try {
            const start = new Date(eventStartDateFilter);
            start.setHours(0,0,0,0);
            const end = new Date(eventEndDateFilter);
            end.setHours(23,59,59,999);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
                filtered = filtered.filter(event => {
                    const eventDate = event.date ? new Date(event.date) : null;
                    return eventDate && !isNaN(eventDate.getTime()) && eventDate >= start && eventDate <= end;
                });
            }
        } catch {}
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
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
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
    eventStatusFilterOption,
    eventStartDateFilter,
    eventEndDateFilter,
  ]);

  const totalEventPages = Math.ceil(processedEvents.length / eventItemsPerPage);
  const paginatedEvents = useMemo(() => {
    const startIndex = (eventCurrentPage - 1) * eventItemsPerPage;
    const endIndex = startIndex + eventItemsPerPage;
    return processedEvents.slice(startIndex, endIndex);
  }, [processedEvents, eventCurrentPage, eventItemsPerPage]);

  useEffect(() => {
    if (eventCurrentPage > totalEventPages) {
      setEventCurrentPage(totalEventPages > 0 ? totalEventPages : 1);
    }
  }, [totalEventPages, eventCurrentPage]);

  const handleEventPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalEventPages) {
      setEventCurrentPage(newPage);
    }
  };

const handleAttemptRegister = (eventToRegister: any, clickEvent?: React.MouseEvent) => {
    if (clickEvent) clickEvent.stopPropagation();

    if (!user || !user.id) {
      setConfirmationState({
        isOpen: true,
        title: "Yêu cầu đăng nhập",
        message: "Bạn cần đăng nhập để có thể đăng ký sự kiện.",
        onConfirm: () => {
          router.push("/login"); 
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
        },
        confirmVariant: "primary",
        confirmText: "Đăng nhập",
        cancelText: "Hủy bỏ",
        onCancel: () => setConfirmationState(prev => ({...prev, isOpen: false}))
      });
    } else {
      if (registeredEvents.includes(eventToRegister.id)) {
        toast.error("Bạn đã đăng ký sự kiện này rồi.");
        return;
      }
      const displayStatus = mapProgressStatusToDisplayStatus(eventToRegister.progressStatus, eventToRegister.date);
      if (displayStatus === "Đã kết thúc" || displayStatus === "Đã hủy" || displayStatus === "Chưa duyệt") {
        toast.error(`Sự kiện "${eventToRegister.title}" ${displayStatus.toLowerCase()}. Không thể đăng ký.`);
        return;
      }
      
      if (typeof eventToRegister.maxAttendees === 'number' && 
          eventToRegister.maxAttendees > 0 && // Chỉ kiểm tra khi có giới hạn và giới hạn > 0
          (eventToRegister.attendees?.length || 0) >= eventToRegister.maxAttendees) {
        toast.error(`Sự kiện "${eventToRegister.title}" đã đủ số lượng người đăng ký tối đa.`);
        return;
      }

      setConfirmationState({
        isOpen: true,
        title: "Xác nhận đăng ký",
        message: <>Bạn có chắc chắn muốn đăng ký sự kiện <br/> <strong className="text-indigo-600">"{eventToRegister.title}"</strong>?</>,
        onConfirm: () => {
          toast.success(`Đã gửi yêu cầu đăng ký sự kiện "${eventToRegister.title}". Chức năng đang hoàn thiện.`);
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
        },
        confirmVariant: "primary",
        confirmText: "Đăng ký",
        cancelText: "Hủy bỏ",
        onCancel: () => setConfirmationState(prev => ({...prev, isOpen: false}))
      });
    }
  };

  const handleEventClick = (eventData: any) => setSelectedEvent(eventData);
  const handleNewsClick = (newsItem: any) => {
    setSelectedNewsItemForDetail(newsItem);
    setIsNewsDetailModalOpen(true);
  };
  const handleCloseNewsDetailModal = () => {
    setIsNewsDetailModalOpen(false);
    setSelectedNewsItemForDetail(null);
  };

  const filteredNews = newsList.filter((news) =>
    news.title.toLowerCase().includes(searchNews.toLowerCase())
  );

  const renderEventContent = () => {
    if (isLoadingEvents && !selectedEvent) {
      return (
        <p className="text-center text-gray-500 col-span-full">Đang tải...</p>
      );
    }
    if (errorEvents && !selectedEvent) {
      return (
        <p className="text-center text-red-500 col-span-full">
          Lỗi: {errorEvents}
        </p>
      );
    }

    if (selectedEvent) {
      const displayStatus = mapProgressStatusToDisplayStatus(selectedEvent.progressStatus, selectedEvent.date);
      const isRegistered = registeredEvents.includes(selectedEvent.id);
      const isActionable = displayStatus !== "Đã kết thúc" && displayStatus !== "Đã hủy" && displayStatus !== "Chưa duyệt";
      const isFull = typeof selectedEvent.maxAttendees === 'number' && 
                     selectedEvent.maxAttendees > 0 && 
                     (selectedEvent.attendees?.length || 0) >= selectedEvent.maxAttendees;

      return (
        <div className="p-6 border rounded-lg shadow-lg bg-gray-50 col-span-full">
          <button
            onClick={() => setSelectedEvent(null)}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50"
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" /> Quay lại
          </button>
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8">
            <div className="flex-shrink-0 w-full md:w-1/3 lg:w-1/4">
              {selectedEvent.image ? (
                <Image
                  src={selectedEvent.image}
                  alt={selectedEvent.title}
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
                <span
                  className={`${getProgressStatusBadgeClasses(
                    displayStatus
                  )} mt-1 sm:mt-0 flex-shrink-0`}
                >
                  {getProgressStatusIcon(displayStatus)} {displayStatus}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-700 border-b pb-4 mb-4">
                <p>
                  <strong className="font-medium text-gray-900 w-24 inline-block">
                    📅 Ngày:
                  </strong>
                  {selectedEvent.date
                    ? new Date(selectedEvent.date).toLocaleDateString("vi-VN")
                    : "N/A"}
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
                  {isLoadingEventDetails && selectedEvent.createdBy
                    ? "Đang tải..."
                    : detailedCreatedByName || "N/A"}
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
                  <p className="font-medium text-gray-900 mb-1">📜 Nội dung:</p>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedEvent.description || "Không có nội dung chi tiết."}
                  </p>
                </div>
                <div>
                  <strong className="font-medium text-gray-900 mb-1 block">
                    👥 Ban tổ chức:
                  </strong>
                  {isLoadingEventDetails &&
                  selectedEvent.organizers?.length > 0 ? (
                    <p className="italic text-gray-500">Đang tải...</p>
                  ) : detailedOrganizers && detailedOrganizers.length > 0 ? (
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1">
                      {detailedOrganizers.map((org, index) => (
                        <li
                          key={`${org.userId}-${index}`}
                        >
                          {[org.fetchedFullName, org.positionName, org.roleName]
                            .filter(Boolean)
                            .join(" - ") || `Thành viên ${index + 1}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có thông tin.</p>
                  )}
                </div>
                <div>
                  <strong className="font-medium text-gray-900 mb-1 block">
                    👤 Người tham gia (chỉ định):
                  </strong>
                  {isLoadingEventDetails &&
                  selectedEvent.participants?.length > 0 ? (
                    <p className="italic text-gray-500">Đang tải...</p>
                  ) : detailedParticipants &&
                    detailedParticipants.length > 0 ? (
                    <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1">
                      {detailedParticipants.map((p, index) => (
                        <li
                          key={`${p.userId}-${index}`}  
                        >
                          {[p.fetchedFullName, p.positionName, p.roleName]
                            .filter(Boolean)
                            .join(" - ") || `Tham gia ${index + 1}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">Chưa có thông tin.</p>
                  )}
                </div>
                 <div className="text-sm text-gray-700">
                    <strong className="font-medium text-gray-900 w-24 inline-block">👥 Số lượng:</strong>
                    {`${selectedEvent.attendees?.length || 0}${typeof selectedEvent.maxAttendees === 'number' && selectedEvent.maxAttendees > 0 ? ` / ${selectedEvent.maxAttendees}` : ' (Không giới hạn)'}`}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={(e) => handleAttemptRegister(selectedEvent, e)}
                  disabled={isRegistered || !isActionable || isFull}
                  className={`w-full sm:w-auto px-6 py-2.5 text-sm font-medium rounded-md shadow-sm transition-colors flex items-center justify-center gap-2 ${
                    isRegistered
                      ? "bg-green-100 text-green-700 cursor-default"
                      : isFull && isActionable
                      ? "bg-yellow-100 text-yellow-700 cursor-not-allowed"
                      : !isActionable
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  }`}
                >
                  {isRegistered
                    ? "✔ Đã đăng ký"
                    : isFull && isActionable
                    ? "Đã đủ số lượng"
                    : !isActionable
                    ? displayStatus
                    : "Đăng ký tham gia"}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div
          className={`grid gap-6 ${
            eventViewMode === "card"
              ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              : ""
          }`}
        >
          {paginatedEvents.length > 0 ? (
            paginatedEvents.map((event) => {
              const isRegistered = registeredEvents.includes(event.id);
              const displayStatus = mapProgressStatusToDisplayStatus(event.progressStatus, event.date);
              const isActionable = displayStatus !== "Đã kết thúc" && displayStatus !== "Đã hủy" && displayStatus !== "Chưa duyệt";
              const isFull = typeof event.maxAttendees === 'number' && 
                             event.maxAttendees > 0 && 
                             (event.attendees?.length || 0) >= event.maxAttendees;

              return eventViewMode === "card" ? (
                <div
                  key={event.id}
                  className="bg-white shadow-lg rounded-xl overflow-hidden transition transform hover:scale-[1.02] hover:shadow-xl flex flex-col border border-gray-200 hover:border-blue-300"
                >
                  <div
                    className="w-full h-48 bg-gray-200 relative cursor-pointer"
                    onClick={() => handleEventClick(event)}
                  >
                    {event.image ? (
                      <Image
                        src={event.image}
                        alt={event.title}
                        layout="fill"
                        objectFit="cover"
                        className="transition-opacity duration-300 ease-in-out"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0";
                          (
                            e.target as HTMLImageElement
                          ).parentElement?.classList.add("bg-gray-300");
                        }}
                        onLoad={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "1";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                        {event.title?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <span
                      className={`absolute top-2 right-2 ${getProgressStatusBadgeClasses(
                        displayStatus
                      )} shadow-sm`}
                    >
                      {getProgressStatusIcon(displayStatus)} {displayStatus}
                    </span>
                  </div>
                  <div className="p-4 flex flex-col flex-grow">
                    <div
                      onClick={() => handleEventClick(event)}
                      className="cursor-pointer mb-3 flex-grow"
                    >
                      <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                        {event.title}
                      </h2>
                      <div className="space-y-0.5 mb-2">
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                          {event.date
                            ? new Date(event.date).toLocaleDateString("vi-VN")
                            : "N/A"}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <span className="opacity-70">📍</span>
                          {event.location}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <CheckCircledIcon className="w-3.5 h-3.5 text-green-500"/>
                        <span>
                            {`Đăng ký: ${event.attendees?.length || 0}${typeof event.maxAttendees === 'number' && event.maxAttendees > 0 ? ` / ${event.maxAttendees}` : ' (Không giới hạn)'}`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto pt-3 border-t border-gray-100">
                      <button
                        onClick={(e) => handleAttemptRegister(event, e)}
                        disabled={isRegistered || !isActionable || isFull}
                        className={`mt-3 w-full px-3 py-1.5 text-xs rounded-md transition font-medium ${
                          isRegistered
                            ? "bg-green-100 text-green-700 cursor-default"
                            : isFull && isActionable
                            ? "bg-yellow-100 text-yellow-700 cursor-not-allowed"
                            : !isActionable
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                        }`}
                      >
                        {isRegistered
                          ? "✔ Đã đăng ký"
                          : isFull && isActionable
                          ? "Đã đủ SL"
                          : !isActionable
                          ? displayStatus 
                          : "Đăng ký"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={event.id}
                  className="bg-white shadow-lg rounded-xl overflow-hidden transition transform hover:scale-[1.01] hover:shadow-xl flex flex-col md:flex-row border border-gray-200 hover:border-blue-300"
                >
                  <div
                    className="relative w-full md:w-1/3 xl:w-1/4 flex-shrink-0 h-48 md:h-auto cursor-pointer"
                    onClick={() => handleEventClick(event)}
                  >
                    {event.image ? (
                      <Image
                        src={event.image}
                        alt={event.title}
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
                    <div
                      className="mb-3"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                        <h2 className="text-md sm:text-lg font-semibold text-gray-800 hover:text-blue-600 cursor-pointer line-clamp-2 flex-1">
                          {event.title}
                        </h2>
                        <span
                          className={`mt-1 sm:mt-0 ml-0 sm:ml-2 shrink-0 ${getProgressStatusBadgeClasses(
                           displayStatus
                          )}`}
                        >
                          {getProgressStatusIcon(displayStatus)} {displayStatus}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 space-y-1 mb-2">
                        <p className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                          {event.date
                            ? new Date(event.date).toLocaleDateString("vi-VN")
                            : "N/A"}
                        </p>
                        <p className="flex items-center gap-1">
                          <span className="opacity-70">📍</span>
                          {event.location}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {event.description || event.purpose || "..."}
                      </p>
                      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {event.organizers?.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            👥 {event.organizers.length} BTC
                          </span>
                        )}
                         <span className="inline-flex items-center gap-1">
                            <CheckCircledIcon className="w-3.5 h-3.5 text-green-500"/>
                            {`Đăng ký: ${event.attendees?.length || 0}${typeof event.maxAttendees === 'number' && event.maxAttendees > 0 ? ` / ${event.maxAttendees}` : ' (Không giới hạn)'}`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto">
                      <button
                        onClick={(e) => handleAttemptRegister(event, e)}
                        disabled={isRegistered || !isActionable || isFull}
                        className={`w-full px-3 py-1.5 text-xs rounded-md transition font-medium ${
                          isRegistered
                            ? "bg-green-100 text-green-700 cursor-default"
                            : isFull && isActionable
                            ? "bg-yellow-100 text-yellow-700 cursor-not-allowed"
                            : !isActionable
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                        }`}
                      >
                        {isRegistered
                          ? "✔ Đã đăng ký"
                          : isFull && isActionable
                          ? "Đã đủ SL"
                          : !isActionable
                          ? displayStatus
                          : "Đăng ký"}
                      </button>
                    </div>
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
              className="p-2 cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="p-2 cursor-pointer rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <p className="text-center text-gray-500 col-span-full">Đang tải...</p>
      );
    }
    if (errorNews) {
      return (
        <p className="text-center text-red-500 col-span-full">
          Lỗi: {errorNews}
        </p>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNews.length > 0 ? (
          filteredNews.map((newsItem) => {
            const relatedEvent = newsItem.event?.id ? events.find(e => e.id === newsItem.event.id) : null;
            const isEventRegistered = relatedEvent ? registeredEvents.includes(relatedEvent.id) : false;
            const eventDisplayStatus = relatedEvent ? mapProgressStatusToDisplayStatus(relatedEvent.progressStatus, relatedEvent.date) : null;
            const isEventActionableForRegistration = relatedEvent && eventDisplayStatus !== "Đã kết thúc" && eventDisplayStatus !== "Đã hủy" && eventDisplayStatus !== "Chưa duyệt";
            const isEventFull = relatedEvent && typeof relatedEvent.maxAttendees === 'number' && 
                                relatedEvent.maxAttendees > 0 && 
                                (relatedEvent.attendees?.length || 0) >= relatedEvent.maxAttendees;


            return (
            <div
              key={newsItem.id}
              className="p-4 bg-white shadow rounded-lg flex flex-col justify-between border border-gray-200 hover:shadow-md transition-shadow duration-150"
            >
              <div>
                {newsItem.coverImageUrl && (
                  <Image
                    src={newsItem.coverImageUrl}
                    alt={newsItem.title}
                    width={500}
                    height={300}
                    className="w-full h-40 object-cover rounded-lg mb-3 bg-gray-100 cursor-pointer"
                    onClick={() => handleNewsClick(newsItem)}
                  />
                )}
                <h2 className="text-md font-semibold text-gray-800 line-clamp-2 mb-1 cursor-pointer hover:text-blue-600"  onClick={() => handleNewsClick(newsItem)}>
                  {newsItem.title}
                </h2>
                {newsItem.publishedAt && (
                  <p className="text-xs text-gray-500 mb-2">
                    📅
                    {new Date(newsItem.publishedAt).toLocaleDateString("vi-VN")}
                  </p>
                )}
                {newsItem.createdBy && (
                  <p className="text-xs text-gray-500">
                    ✍️ {newsItem.createdBy.lastName}
                    {newsItem.createdBy.firstName}
                  </p>
                )}
                 {relatedEvent && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Sự kiện liên quan: <Link href="#" onClick={(e) => {e.preventDefault(); handleEventClick(relatedEvent); setActiveTab("events");}} className="text-blue-600 hover:underline">{relatedEvent.title}</Link></p>
                        {eventDisplayStatus && (
                             <span className={`text-xs ${getProgressStatusBadgeClasses(eventDisplayStatus)}`}>
                                {getProgressStatusIcon(eventDisplayStatus)} {eventDisplayStatus}
                            </span>
                        )}
                    </div>
                )}
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <button
                    onClick={(e) => {
                    e.stopPropagation();
                    handleNewsClick(newsItem);
                    }}
                    className="w-full text-center px-3 py-1.5 text-xs rounded-md transition bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium"
                >
                    Xem chi tiết
                </button>
                {relatedEvent && (
                    <button
                        onClick={(e) => handleAttemptRegister(relatedEvent, e)}
                        disabled={isEventRegistered || !isEventActionableForRegistration || isEventFull}
                        className={`w-full px-3 py-1.5 text-xs rounded-md transition font-medium ${
                        isEventRegistered
                            ? "bg-green-100 text-green-700 cursor-default"
                            : isEventFull && isEventActionableForRegistration
                            ? "bg-yellow-100 text-yellow-700 cursor-not-allowed"
                            : !isEventActionableForRegistration
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer"
                        }`}
                    >
                        {isEventRegistered
                        ? "✔ Đã đăng ký sự kiện"
                        : isEventFull && isEventActionableForRegistration
                        ? "Đã đủ SL"
                        : !isEventActionableForRegistration
                        ? (eventDisplayStatus || "Không thể đăng ký")
                        : "Đăng ký sự kiện"}
                    </button>
                )}
              </div>
            </div>
          )})
        ) : (
          <p className="text-gray-500 text-center col-span-full">
            Không có tin tức nào phù hợp.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <nav className="bg-white text-gray-800 px-4 py-4 shadow-md mb-6 sticky top-0 z-40 ">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="https://icc.iuh.edu.vn/web/wp-content/uploads/2024/09/iuh_logo-rut-gon-1024x577.png"
              alt="Logo IUH"
              width={70}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <span className={`font-bold text-xl ml-3 ${playfair.className}`}>
              IUH TSE
            </span>
          </div>
          <div className="flex items-center gap-6">
            <span
              className="cursor-pointer hover:text-indigo-600 transition-colors"
              onClick={() => setShowAboutModal(true)}
            >
              Giới thiệu
            </span>
            <span
              className="cursor-pointer hover:text-indigo-600"
              onClick={() => setShowContactModal(true)}
            >
              Liên hệ
            </span>

            <div className="flex gap-2">
              <Link href="/login">
                <button className="cursor-pointer px-3 py-1 bg-blue-500 hover:bg-blue-700 text-white rounded-md text-sm">
                  Đăng nhập
                </button>
              </Link>
              <Link href="/register">
                <button className="px-3 cursor-pointer py-1 bg-green-500 hover:bg-green-700 text-white rounded-md text-sm">
                  Đăng ký
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6">
        <div className="mb-4 border-b border-gray-200">
          <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab("events")}
                className={`inline-flex p-4 rounded-t-lg cursor-pointer ${
                  activeTab === "events"
                    ? "text-blue-600 border-b-2 border-blue-600 active font-semibold"
                    : "text-gray-500 hover:text-gray-600 border-b-2 border-transparent"
                }`}
              >
                Sự kiện
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab("news")}
                className={`inline-flex p-4 rounded-t-lg cursor-pointer ${
                  activeTab === "news"
                    ? "text-blue-600 border-b-2 border-blue-600 active font-semibold"
                    : "text-gray-500 hover:text-gray-600 border-b-2 border-transparent"
                }`}
              >
                Bảng tin
              </button>
            </li>
          </ul>
        </div>
        {activeTab === "events" && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-4">
              🎉 Sự kiện
            </h1>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="relative">
                  <label
                    htmlFor="searchMyEvents"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Tìm kiếm sự kiện
                  </label>
                  <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                    <MagnifyingGlassIcon className="w-4 h-4" />
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
                    Sắp xếp theo
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
                    <option value="date">📅 Mới nhất</option>
                    <option value="az">🇦 Alphabet (A-Z)</option>
                    <option value="za">🇿 Alphabet (Z-A)</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="statusFilterMyEvents"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Trạng thái (Progress)
                  </label>
                  <select
                    id="statusFilterMyEvents"
                    value={eventStatusFilterOption}
                    onChange={(e) =>
                      setEventStatusFilterOption(e.target.value as any)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                     style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.5rem center",
                      backgroundSize: "1.5em 1.5em",
                    }}
                  >
                    <option value="all">♾️ Tất cả</option>
                    <option value="Sắp diễn ra">☀️ Sắp diễn ra</option>
                    <option value="Đang diễn ra">🟢 Đang diễn ra</option>
                    <option value="Đã kết thúc">🏁 Đã kết thúc</option>
                    <option value="Đã hủy">❌ Đã hủy</option>
                    <option value="Bị hoãn">⚠️ Bị hoãn</option>
                    <option value="Chưa duyệt">📝 Chưa duyệt</option>
                    <option value="dateRange">🔢 Khoảng ngày</option>
                  </select>
                </div>
                <div className="flex items-end justify-start md:justify-end gap-2">
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
                      <ListBulletIcon className="h-5 w-5" />
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
                      <Component1Icon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              {eventStatusFilterOption === "dateRange" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                  <div>
                    <label
                      htmlFor="startDateFilterEvents"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      <span className="inline-block mr-1">🗓️</span> Từ ngày
                    </label>
                    <input
                      type="date"
                      id="startDateFilterEvents"
                      value={eventStartDateFilter}
                      onChange={(e) => setEventStartDateFilter(e.target.value)}
                      max={eventEndDateFilter || undefined}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="endDateFilterEvents"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      <span className="inline-block mr-1">🗓️</span> Đến ngày
                    </label>
                    <input
                      type="date"
                      id="endDateFilterEvents"
                      value={eventEndDateFilter}
                      onChange={(e) => setEventEndDateFilter(e.target.value)}
                      min={eventStartDateFilter || undefined}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                    />
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
                <MagnifyingGlassIcon className="w-4 h-4" />
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
      <NewsDetailModal
        isOpen={isNewsDetailModalOpen}
        onClose={handleCloseNewsDetailModal}
        item={selectedNewsItemForDetail}
        user={user}
        onTriggerEdit={() => {}}
        onTriggerDelete={() => {}}
      />
    </div>
  );
}