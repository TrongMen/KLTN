"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  User as MainUserType,
  NewsItem as MainNewsItemFromAppTypes,
  EventDisplayInfo as MainEventInfoFromAppTypes,
} from "../types/appTypes";
import ApprovalItemDetailModal from "./ApprovalItemDetailModal";
import { ReloadIcon } from "@radix-ui/react-icons";

type EventType = MainEventInfoFromAppTypes & {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdBy?: string;
  content?: string;
  purpose?: string;
  time?: string;
  name?: string;
  title?: string; 
  date?: string;  
  location?: string; 
  avatarUrl?: string | null;
  qrCodeUrl?: string | null;
  maxAttendees?: number;
  currentAttendeesCount?: number;
  progressStatus?: "UPCOMING" | "ONGOING" | "COMPLETED" | "PENDING_APPROVAL";
  createdAt?: string;
};

type NewsItemType = MainNewsItemFromAppTypes & {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    username?: string;
  } | string; // Mở rộng để tương thích với modal nếu cần
  content?: string;
  coverImageUrl?: string;
  createdAt?: string;
  publishedAt?: string | null;
  event?: { id: string; name?: string } | null;
  title?: string; // Đảm bảo có title nếu MainNewsItemFromAppTypes không có
  date?: string; // Thường là createdAt hoặc publishedAt cho news
};

interface ApprovalTabContentProps {
  user: MainUserType | null;
  refreshToken?: () => Promise<string | null>;
}

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
  const diff =
    firstDayOfWeek.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
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
    if (
      Object.prototype.toString.call(date) === "[object Date]" &&
      !isNaN(date.getTime())
    ) {
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
const stripHtml = (html: string): string => {
  if (typeof document === "undefined") return html;
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

const ApprovalTabContent: React.FC<ApprovalTabContentProps> = ({
  user,
  refreshToken,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"events" | "news">("events");
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [pendingEvents, setPendingEvents] = useState<EventType[]>([]);
  const [approvedEvents, setApprovedEvents] = useState<EventType[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<EventType[]>([]);
  const [pendingNews, setPendingNews] = useState<NewsItemType[]>([]);
  const [approvedNews, setApprovedNews] = useState<NewsItemType[]>([]);
  const [rejectedNews, setRejectedNews] = useState<NewsItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectReason] = useState("");
  const [currentItemToReject, setCurrentItemToReject] = useState<
    EventType | NewsItemType | null
  >(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<
    EventType | NewsItemType | null
  >(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"az" | "za">("az");
  const [dateFilter, setDateFilter] = useState<
    "all" | "today" | "thisWeek" | "thisMonth" | "range"
  >("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  const fetchApiData = useCallback(
    async <T extends { id: string }>(endpoint: string): Promise<T[]> => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.");
        return [];
      }
      const headers = { Authorization: `Bearer ${token}` };
      try {
        let res = await fetch(endpoint, { headers, cache: "no-store" });
        if ((res.status === 401 || res.status === 403) && refreshToken) {
          const newToken = await refreshToken();
          if (newToken) {
            headers["Authorization"] = `Bearer ${newToken}`;
            res = await fetch(endpoint, { headers, cache: "no-store" });
          } else {
            throw new Error("Không thể làm mới phiên đăng nhập.");
          }
        }
        if (!res.ok) {
          let msg = `Lỗi ${res.status}`;
          try {
            const err = await res.json();
            msg = err.message || msg;
          } catch (_) {}
          throw new Error(msg);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          return data.result;
        } else {
          throw new Error(data.message || `Dữ liệu không hợp lệ`);
        }
      } catch (error: any) {
        console.error(`Error fetching ${endpoint}:`, error);
        toast.error(
          `Lỗi tải dữ liệu từ ${endpoint.split("/").pop()}: ${error.message}`
        );
        return [];
      }
    },
    [refreshToken]
  );

  const fetchDataAndUpdateLists = useCallback(
    async (isManualRefresh: boolean = false) => {
      setIsLoading(true);
      try {
        const [
          pendingEv,
          approvedEv,
          rejectedEv,
          pendingN,
          approvedN,
          rejectedN,
        ] = await Promise.all([
          fetchApiData<EventType>(
            `http://localhost:8080/identity/api/events/status?status=PENDING`
          ),
          fetchApiData<EventType>(
            `http://localhost:8080/identity/api/events/status?status=APPROVED`
          ),
          fetchApiData<EventType>(
            `http://localhost:8080/identity/api/events/status?status=REJECTED`
          ),
          fetchApiData<NewsItemType>(
            `http://localhost:8080/identity/api/news/status?status=PENDING`
          ),
          fetchApiData<NewsItemType>(
            `http://localhost:8080/identity/api/news/status?status=APPROVED`
          ),
          fetchApiData<NewsItemType>(
            `http://localhost:8080/identity/api/news/status?status=REJECTED`
          ),
        ]);
        setPendingEvents(pendingEv);
        setApprovedEvents(approvedEv);
        setRejectedEvents(rejectedEv);
        setPendingNews(pendingN);
        setApprovedNews(approvedN);
        setRejectedNews(rejectedN);

        if (isManualRefresh) {
          toast.success("Đã làm mới danh sách phê duyệt!");
        }
      } catch (error: any) {
        console.error("Error fetching all data:", error);
        toast.error(
          `Lỗi tải toàn bộ dữ liệu: ${
            error.message || "Không thể lấy chi tiết lỗi"
          }`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [fetchApiData]
  );

  useEffect(() => {
    fetchDataAndUpdateLists(false);
  }, [fetchDataAndUpdateLists]);

  const handleApprove = async (
    item: EventType | NewsItemType,
    itemType: "event" | "news"
  ) => {
    const endpoint =
      itemType === "event"
        ? `http://localhost:8080/identity/api/events/${item.id}/approve`
        : `http://localhost:8080/identity/api/news/${item.id}/approve`;
    const typeText = itemType === "event" ? "sự kiện" : "tin tức";
    const loadingToastId = toast.loading(`Đang phê duyệt ${typeText}...`);
    try {
      let token = localStorage.getItem("authToken");
      if (!token) throw new Error("Token không tồn tại.");
      let res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if ((res.status === 401 || res.status === 403) && refreshToken) {
        const nt = await refreshToken();
        if (nt) {
          token = nt;
          res = await fetch(endpoint, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
        } else throw new Error("Không thể làm mới phiên đăng nhập.");
      }
      if (!res.ok) {
        let msg = `Phê duyệt ${typeText} thất bại`;
        try {
          const err = await res.json();
          msg = err.message || `Lỗi ${res.status}`;
        } catch (_) {}
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.code === 1000) {
        toast.success(`Đã phê duyệt ${typeText}!`, { id: loadingToastId });
        await fetchDataAndUpdateLists(false);
      } else {
        throw new Error(
          data.message || `Phê duyệt ${typeText} thành công nhưng có lỗi.`
        );
      }
    } catch (error: any) {
      toast.error(error.message || `Lỗi khi phê duyệt ${typeText}`, {
        id: loadingToastId,
      });
      console.error(`Approve ${itemType} error:`, error);
    }
  };

  const openRejectModal = (item: EventType | NewsItemType) => {
    setCurrentItemToReject(item);
    setShowRejectModal(true);
    setRejectReason("");
  };

  const handleReject = async () => {
    if (!currentItemToReject) return;
    const itemType = "name" in currentItemToReject && "time" in currentItemToReject ? "event" : "news";
    const typeText = itemType === "event" ? "sự kiện" : "tin tức";
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      toast.error("Vui lòng nhập lý do từ chối!");
      return;
    }
    const endpoint =
      itemType === "event"
        ? `http://localhost:8080/identity/api/events/${
            currentItemToReject.id
          }/reject?reason=${encodeURIComponent(trimmedReason)}`
        : `http://localhost:8080/identity/api/news/${
            currentItemToReject.id
          }/reject?reason=${encodeURIComponent(trimmedReason)}`;
    const loadingToastId = toast.loading(`Đang từ chối ${typeText}...`);
    try {
      let token = localStorage.getItem("authToken");
      if (!token) throw new Error("Token không tồn tại.");
      let res = await fetch(endpoint, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if ((res.status === 401 || res.status === 403) && refreshToken) {
        const nt = await refreshToken();
        if (nt) {
          token = nt;
          res = await fetch(endpoint, {
            method: "PUT",
            headers: { Authorization: `Bearer ${token}` },
          });
        } else throw new Error("Không thể làm mới phiên đăng nhập.");
      }
      if (!res.ok) {
        let msg = `Từ chối ${typeText} thất bại`;
        try {
          const err = await res.json();
          msg = err.message || `Lỗi ${res.status}`;
        } catch (_) {}
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.code === 1000) {
        toast.success(`Đã từ chối ${typeText}.`, { id: loadingToastId });
        setShowRejectModal(false);
        setCurrentItemToReject(null);
        setRejectReason("");
        await fetchDataAndUpdateLists(false);
      } else {
        throw new Error(
          data.message || `Từ chối ${typeText} thành công nhưng có lỗi.`
        );
      }
    } catch (error: any) {
      toast.error(error.message || `Lỗi khi từ chối ${typeText}`, {
        id: loadingToastId,
      });
      console.error(`Reject ${itemType} error:`, error);
    }
  };

  const displayedItems = useMemo(() => {
    let currentList: Array<EventType | NewsItemType> = [];
    const sourceList =
      activeSubTab === "events"
        ? tab === "pending"
          ? pendingEvents
          : tab === "approved"
          ? approvedEvents
          : rejectedEvents
        : tab === "pending"
        ? pendingNews
        : tab === "approved"
        ? approvedNews
        : rejectedNews;
    currentList = [...sourceList];
    let filteredByDate = currentList.filter((item) => {
      if (dateFilter === "all") return true;
      const itemDateStr =
        activeSubTab === "events"
          ? (item as EventType).time
          : (item as NewsItemType).createdAt ?? (item as NewsItemType).publishedAt;
      if (!itemDateStr) return false;
      try {
        const itemDate = new Date(itemDateStr);
        if (isNaN(itemDate.getTime())) return false;
        switch (dateFilter) {
          case "today":
            return isToday(itemDate);
          case "thisWeek":
            return isThisWeek(itemDate);
          case "thisMonth":
            return isThisMonth(itemDate);
          case "range":
            if (
              !startDate ||
              !endDate ||
              isNaN(startDate.getTime()) ||
              isNaN(endDate.getTime())
            )
              return false;
            const startOfDay = new Date(startDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            return itemDate >= startOfDay && itemDate <= endOfDay;
          default:
            return true;
        }
      } catch (e) {
        console.error("Error parsing date for filtering:", itemDateStr, e);
        return false;
      }
    });
    let filteredByName = filteredByDate;
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.trim().toLowerCase();
      filteredByName = filteredByDate.filter((item) => {
         const nameOrTitle = activeSubTab === "events"
            ? (item as EventType).name
            : (item as NewsItemType).title;
         return nameOrTitle ? nameOrTitle.toLowerCase().includes(lowerSearchTerm) : false;
        }
      );
    }
    let sortedList = [...filteredByName];
    const compareFn = (
      a: EventType | NewsItemType,
      b: EventType | NewsItemType
    ) => {
      const nameA =
        (activeSubTab === "events"
          ? (a as EventType).name
          : (a as NewsItemType).title) || "";
      const nameB =
        (activeSubTab === "events"
          ? (b as EventType).name
          : (b as NewsItemType).title) || "";
      return nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
    };
    if (sortOrder === "za") {
      sortedList.sort((a, b) => compareFn(b, a));
    } else {
      sortedList.sort(compareFn);
    }
    return sortedList;
  }, [
    activeSubTab,
    tab,
    pendingEvents,
    approvedEvents,
    rejectedEvents,
    pendingNews,
    approvedNews,
    rejectedNews,
    searchTerm,
    sortOrder,
    dateFilter,
    startDate,
    endDate,
  ]);

  const handleItemClick = (item: EventType | NewsItemType) => {
    setSelectedItemForDetail(item);
  };

  const handleCloseDetailView = () => {
    setSelectedItemForDetail(null);
  };

  const renderList = (
    items: Array<EventType | NewsItemType>,
    itemType: "event" | "news",
    showActions = false
  ) => {
    const listHeightClass = "max-h-[calc(100vh-280px)]";
    const currentItems = items as any[];

    if (isLoading && items.length === 0)
      return (
        <p className="text-center text-gray-500 py-6 italic">Đang tải...</p>
      );
    if (!currentItems || currentItems.length === 0)
      return (
        <p className="text-center text-gray-500 py-6 italic">
          Không có mục nào phù hợp.
        </p>
      );

    if (viewMode === "card") {
      return (
        <div
          className={`${listHeightClass} overflow-y-auto p-3 md:p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-5">
            {currentItems.map((item) => {
              const title = itemType === "event" ? item.name : item.title;
              const displayDateStr = itemType === "event" ? item.time : (item.createdAt ?? item.publishedAt);
              const location = itemType === "event" ? item.location : null;
              const imageUrl = itemType === "news" ? item.coverImageUrl : (itemType === "event" ? item.avatarUrl : null);
              
              return (
                <div
                  key={item.id}
                  className="border border-gray-200 rounded-lg shadow-md bg-white flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200 ease-in-out cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={title || "Hình ảnh"}
                      className="h-24 md:h-28 w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`h-24 md:h-28 flex items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200`}
                    >
                      <svg
                        className="w-10 h-10 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        ></path>
                      </svg>
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-base text-gray-800 mb-2 line-clamp-2 flex-grow-0">
                      {title || "Không có tiêu đề"}
                    </h3>
                    <div className="text-xs text-gray-500 mt-1 mb-3 space-y-1 flex-grow-0">
                      {displayDateStr && (
                        <p className="flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 text-gray-400 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {new Date(displayDateStr).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      {location && (
                        <p className="flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5 text-gray-400 flex-shrink-0"
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
                          {location}
                        </p>
                      )}
                      {itemType === "news" && item.content && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {stripHtml(item.content)}
                        </p>
                      )}
                       {itemType === "event" && item.purpose && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {stripHtml(item.purpose)}
                        </p>
                      )}
                    </div>
                    <div className="flex-grow"></div>
                    {tab === "rejected" && item.rejectionReason && (
                      <div className="mt-2 pt-2 border-t border-dashed border-red-200 flex-grow-0">
                        <p className="text-xs text-red-600">
                          <span className="font-medium">Lý do:</span>{" "}
                          {item.rejectionReason}
                        </p>
                      </div>
                    )}
                    {tab === "approved" && (
                      <div className="mt-2 pt-2 border-t border-dashed border-green-200 flex-grow-0">
                        <p className="text-xs text-green-600 font-medium">
                          Đã phê duyệt
                        </p>
                      </div>
                    )}
                    {showActions && (
                      <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100 flex-grow-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRejectModal(item);
                          }}
                          className="px-3 cursor-pointer py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(item, itemType);
                          }}
                          className="px-3 cursor-pointer py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                        >
                          Phê duyệt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (viewMode === "list") {
      return (
        <div
          className={`${listHeightClass} overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 border-t border-gray-200`}
        >
          <ul className="divide-y divide-gray-200">
            {currentItems.map((item) => {
              const title = itemType === "event" ? item.name : item.title;
              const displayDateStr = itemType === "event" ? item.time : (item.createdAt ?? item.publishedAt);
              const location = itemType === "event" ? item.location : null;
              return (
                <li
                  key={item.id}
                  className="px-3 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors cursor-pointer"
                  onClick={() => handleItemClick(item)}
                >
                  <div className="flex-1 mb-2 sm:mb-0 sm:pr-4">
                    <p className="font-semibold text-sm md:text-base text-gray-800">
                      {title || "Không có tiêu đề"}
                    </p>
                    <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {displayDateStr && (
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
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {new Date(displayDateStr).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                      {location && (
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
                          {location}
                        </span>
                      )}
                    </div>
                    {tab === "rejected" && item.rejectionReason && (
                      <p className="text-xs text-red-500 mt-1.5">
                        <span className="font-medium">Lý do:</span>{" "}
                        {item.rejectionReason}
                      </p>
                    )}
                    {tab === "approved" && (
                      <p className="text-xs text-green-600 mt-1.5 font-medium">
                        Đã phê duyệt
                      </p>
                    )}
                  </div>
                  {showActions && (
                    <div className="flex justify-end gap-2 flex-shrink-0 mt-2 sm:mt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openRejectModal(item);
                        }}
                        className="px-2.5 cursor-pointer py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(item, itemType);
                        }}
                        className="px-2.5 cursor-pointer py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                      >
                        Duyệt
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full p-3 md:p-5 bg-gray-50 rounded-lg shadow-inner">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0 gap-2">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          Phê duyệt
        </h2>
        <button
          onClick={() => fetchDataAndUpdateLists(true)}
          disabled={isLoading}
          className="p-2 border border-gray-300 cursor-pointer rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center ml-auto sm:ml-4"
          title="Làm mới danh sách phê duyệt"
        >
          {isLoading ? (
            <ReloadIcon className="w-5 h-5 animate-spin text-yellow-600" />
          ) : (
            <ReloadIcon className="w-5 h-5 text-yellow-600" />
          )}
        </button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-2 flex-shrink-0">
        <button
          onClick={() => setActiveSubTab("events")}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors duration-150 ${
            activeSubTab === "events"
              ? "border-b-2 border-yellow-500 text-yellow-600 bg-yellow-50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 inline-block mr-1.5 mb-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Sự kiện
        </button>
        <button
          onClick={() => setActiveSubTab("news")}
          className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors duration-150 cursor-pointer ${
            activeSubTab === "news"
              ? "border-b-2 border-yellow-500 text-yellow-600 bg-yellow-50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 inline-block mr-1.5 mb-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          Bảng tin
        </button>
      </div>
      <div className="mb-4 p-3 md:p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 items-end">
          <div className="lg:col-span-1">
            <label
              htmlFor="searchApproval"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Tìm kiếm
            </label>
            <input
              type="text"
              id="searchApproval"
              placeholder={
                activeSubTab === "events"
                  ? "Tên sự kiện..."
                  : "Tiêu đề tin tức..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>
          <div>
            <label
              htmlFor="sortApproval"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Sắp xếp
            </label>
            <select
              id="sortApproval"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "az" | "za")}
              className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 appearance-none"
            >
              <option value="az">A - Z</option>
              <option value="za">Z - A</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="dateFilterApproval"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Lọc thời gian
            </label>
            <select
              id="dateFilterApproval"
              value={dateFilter}
              onChange={(e) =>
                setDateFilter(
                  e.target.value as
                    | "all"
                    | "today"
                    | "thisWeek"
                    | "thisMonth"
                    | "range"
                )
              }
              className="w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm text-sm bg-white focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 appearance-none"
            >
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="thisWeek">Tuần này</option>
              <option value="thisMonth">Tháng này</option>
              <option value="range">Khoảng ngày</option>
            </select>
          </div>
          <div className="flex items-end justify-start md:justify-end gap-2">
            <button
              onClick={() => setViewMode("card")}
              title="Chế độ thẻ"
              className={`p-2 rounded-md border transition cursor-pointer ${
                viewMode === "card"
                  ? "bg-yellow-500 border-yellow-600 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
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
              className={`p-2 rounded-md border transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-yellow-500 border-yellow-600 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
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

      {dateFilter === "range" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 shadow-sm flex-shrink-0">
          <div>
            <label
              htmlFor="startDateApproval"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <span className="inline-block mr-1">🗓️</span> Từ ngày
            </label>
            <input
              type="date"
              id="startDateApproval"
              value={formatDateForInput(startDate)}
              onChange={(e) => {
                const dateVal = e.target.value
                  ? new Date(e.target.value)
                  : null;
                setStartDate(dateVal);
              }}
              max={endDate ? formatDateForInput(endDate) : undefined}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="endDateApproval"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <span className="inline-block mr-1">🗓️</span> Đến ngày
            </label>
            <input
              type="date"
              id="endDateApproval"
              value={formatDateForInput(endDate)}
              onChange={(e) => {
                const dateVal = e.target.value
                  ? new Date(e.target.value)
                  : null;
                setEndDate(dateVal);
              }}
              min={startDate ? formatDateForInput(startDate) : undefined}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm bg-white"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center mb-4 gap-2 md:gap-3 flex-shrink-0">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-1.5 rounded-full font-medium cursor-pointer text-sm md:text-base ${
            tab === "pending"
              ? "bg-yellow-500 text-white shadow-md ring-2 ring-yellow-300 ring-offset-1"
              : "bg-white text-gray-700 hover:bg-yellow-50 border"
          }`}
        >
          Đang chờ (
          {activeSubTab === "events"
            ? pendingEvents.length
            : pendingNews.length}
          )
        </button>
        <button
          onClick={() => setTab("approved")}
          className={`px-4 py-1.5 rounded-full font-medium cursor-pointer text-sm md:text-base ${
            tab === "approved"
              ? "bg-green-600 text-white shadow-md ring-2 ring-green-300 ring-offset-1"
              : "bg-white text-gray-700 hover:bg-green-50 border"
          }`}
        >
          Đã duyệt (
          {activeSubTab === "events"
            ? approvedEvents.length
            : approvedNews.length}
          )
        </button>
        <button
          onClick={() => setTab("rejected")}
          className={`px-4 py-1.5 rounded-full font-medium cursor-pointer text-sm md:text-base ${
            tab === "rejected"
              ? "bg-red-600 text-white shadow-md ring-2 ring-red-300 ring-offset-1"
              : "bg-white text-gray-700 hover:bg-red-50 border"
          }`}
        >
          Đã từ chối (
          {activeSubTab === "events"
            ? rejectedEvents.length
            : rejectedNews.length}
          )
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg bg-gray-50 shadow-sm flex-1 overflow-hidden flex flex-col ">
        {activeSubTab === "events" &&
          renderList(displayedItems as EventType[], "event", tab === "pending")}
        {activeSubTab === "news" &&
          renderList(
            displayedItems as NewsItemType[],
            "news",
            tab === "pending"
          )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl relative transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-scale-in">
            <h3 className="text-lg md:text-xl font-semibold mb-4 text-red-700">
              Nhập lý do từ chối
            </h3>
            <button
              onClick={() => setShowRejectModal(false)}
              className="absolute cursor-pointer top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors text-2xl"
              aria-label="Đóng"
            >
              &times;
            </button>
            <div className="mb-4">
              <label
                htmlFor="rejectionReason"
                className="block text-gray-700 mb-1 text-sm font-medium"
              >
                Lý do từ chối <span className="text-red-500">*</span>:
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-500 focus:outline-none transition duration-150 ease-in-out text-sm"
                rows={4}
                placeholder="Nhập lý do..."
              />
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors duration-150 ease-in-out"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Xác nhận
              </button>
            </div>
          </div>
          <style jsx global>{`
            @keyframes modal-scale-in {
              from {
                transform: scale(0.95);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
            .animate-modal-scale-in {
              animation: modal-scale-in 0.2s ease-out forwards;
            }
          `}</style>
        </div>
      )}

      <ApprovalItemDetailModal
        isOpen={selectedItemForDetail !== null}
        onClose={handleCloseDetailView}
        item={selectedItemForDetail}
      />
    </div>
  );
};

export default ApprovalTabContent;