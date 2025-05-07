"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import UserMenu from "./menu";
import ContactModal from "./modals/ContactModal";
import AboutModal from "./modals/AboutModal";
import AdminHomeTabContent from "./tabs/AdminHomeTabContent";
import ApprovalTabContent from "./tabs/ApprovalTabContent";
import AttendeesTabContent from "./tabs/AttendeesTabContent";
import MembersTabContent from "./tabs/MembersTabContent";
import RolesTabContent from "./tabs/RolesTabContent";
import ChatTabContent from "./tabs/ChatTabContent";
import NewsTabContent from "./tabs/NewsTabContent";
import CreateNewsModal, { NewsFormData } from "./modals/CreateNewsModal";
import NotificationDropdown, { NotificationItem } from "./NotificationDropdown";
import { BellIcon } from "@radix-ui/react-icons";
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";

interface Role {
  name: string;
  description?: string;
  permissions?: any[];
}
export interface User {
  id: string;
  roles?: Role[];
  firstName?: string;
  lastName?: string;
  username?: string;
  avatar?: string;
  email?: string;
}
interface Participant {
  id: string | number;
  name: string;
  avatar?: string;
}
export interface Conversation {
  id: number | string;
  name: string;
  isGroup: boolean;
  participants?: Participant[];
  message: string;
  avatar?: string;
}
export interface EventDisplayInfo {
  id: string;
  title: string;
  name?: string;
  date: string;
  location: string;
  description: string;
  content?: string;
  speaker?: string;
  image?: string;
  avatarUrl?: string | null;
  time?: string;
  status?: string;
  purpose?: string;
  createdBy?: string;
  organizers?: { userId: string; roleName?: string; positionName?: string }[];
  participants?: { userId: string; roleName?: string; positionName?: string }[];
  attendees?: {
    userId: string;
    fullName?: string;
    studentCode?: string;
    checkedInAt?: string | null;
    attending?: boolean;
  }[];
}
export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  date?: string;
  createdAt?: string;
  publishedAt?: string | null;
  imageUrl?: string;
  content?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
  };
  event?: { id: string; name?: string } | null;
  coverImageUrl?: string;
  rejectionReason?: string | null;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
}

function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  confirmVariant = "primary",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;
  const confirmBtnClasses = useMemo(() => {
    let base =
      "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger")
      base +=
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    else
      base +=
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
    return base;
  }, [confirmVariant]);
  const cancelBtnClasses =
    "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className={`text-lg font-bold mb-3 ${
            confirmVariant === "danger" ? "text-red-700" : "text-gray-800"
          }`}
        >
          {title}
        </h3>
        <div className="text-sm text-gray-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel} className={cancelBtnClasses}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={confirmBtnClasses}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const getWeekRange = (
  refDate: Date
): { startOfWeek: Date; endOfWeek: Date } => {
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
const getMonthRange = (
  refDate: Date
): { startOfMonth: Date; endOfMonth: Date } => {
  const date = new Date(refDate);
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  return { startOfMonth, endOfMonth };
};

type ActiveTab =
  | "home"
  | "news"
  | "approval"
  | "attendees"
  | "members"
  | "roles"
  | "chatList";

export default function HomeAdmin() {
  const [search, setSearch] = useState("");
  const [allEvents, setAllEvents] = useState<EventDisplayInfo[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventDisplayInfo | null>(
    null
  );
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [sortOption, setSortOption] = useState("date-desc");
  const [timeFilterOption, setTimeFilterOption] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [errorNews, setErrorNews] = useState<string | null>(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] =
    useState<boolean>(false);
  const [errorNotifications, setErrorNotifications] = useState<string | null>(
    null
  );
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState<boolean>(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const router = useRouter();
  const { refreshToken, isInitialized } = useRefreshToken();

  const fetchNews = useCallback(async () => {
    setIsLoadingNews(true);
    setErrorNews(null);
    let currentToken = localStorage.getItem("authToken");
    try {
      let headers: HeadersInit = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
      const url = `http://localhost:8080/identity/api/news/status?status=APPROVED`;
      let res = await fetch(url, { headers, cache: "no-store" });
      if (
        (res.status === 401 || res.status === 403) &&
        currentToken &&
        refreshToken
      ) {
        const nt = await refreshToken();
        if (nt) {
          currentToken = nt;
          localStorage.setItem("authToken", nt);
          headers["Authorization"] = `Bearer ${currentToken}`;
          res = await fetch(url, { headers, cache: "no-store" });
        } else throw new Error("Unauthorized or Refresh Failed");
      }
      if (!res.ok) {
        const status = res.status;
        let msg = `HTTP ${status}`;
        try {
          const err = await res.json();
          msg = err.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }
      const d = await res.json();
      if (d.code === 1000 && Array.isArray(d.result)) {
        const fmt: NewsItem[] = d.result.map((item: any) => ({
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
        setNewsItems(fmt);
      } else throw new Error(d.message || "Lỗi định dạng dữ liệu tin tức");
    } catch (e: any) {
      console.error("Lỗi fetchNews (Admin):", e);
      setErrorNews(e.message || "Lỗi tải tin tức.");
    } finally {
      setIsLoadingNews(false);
    }
  }, [refreshToken]);

  const fetchAdminHomeEvents = useCallback(
    async (token: string | null) => {
      setIsLoadingEvents(true);
      setErrorEvents(null);
      if (!token) {
        setErrorEvents("Yêu cầu xác thực.");
        setIsLoadingEvents(false);
        setAllEvents([]);
        return;
      }
      let currentToken = token;
      try {
        const headers: HeadersInit = {
          Authorization: `Bearer ${currentToken}`,
        };
        const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
        let res = await fetch(url, { headers, cache: "no-store" });
        if ((res.status === 401 || res.status === 403) && refreshToken) {
          const newToken = await refreshToken();
          if (newToken) {
            currentToken = newToken;
            localStorage.setItem("authToken", newToken);
            res = await fetch(url, {
              headers: { Authorization: `Bearer ${newToken}` },
              cache: "no-store",
            });
          } else {
            throw new Error("Không thể làm mới phiên đăng nhập.");
          }
        }
        if (!res.ok) {
          let m = `Lỗi tải sự kiện (Admin) - Status: ${res.status}`;
          try {
            const d = await res.json();
            m = d.message || m;
          } catch (_) {}
          throw new Error(m);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const formattedEvents: EventDisplayInfo[] = data.result
            .filter((e: any) => !e.deleted)
            .map((apiEvent: any) => ({
              id: apiEvent.id,
              title: apiEvent.name || "Chưa có tiêu đề",
              name: apiEvent.name,
              date: apiEvent.time || apiEvent.createdAt || "",
              location: apiEvent.location || "Chưa xác định",
              description:
                apiEvent.content || apiEvent.purpose || "Không có mô tả",
              content: apiEvent.content,
              speaker: apiEvent.speaker,
              image: apiEvent.avatarUrl,
              avatarUrl: apiEvent.avatarUrl || null,
              time: apiEvent.time,
              status: apiEvent.status,
              purpose: apiEvent.purpose,
              createdBy: apiEvent.createdBy,
              organizers: apiEvent.organizers || [],
              participants: apiEvent.participants || [],
              attendees: apiEvent.attendees || [],
            }));
          setAllEvents(formattedEvents);
        } else throw new Error(data.message || "Dữ liệu sự kiện không hợp lệ");
      } catch (err: any) {
        console.error("Lỗi fetchAdminHomeEvents:", err);
        setErrorEvents(err.message || "Không thể tải danh sách sự kiện.");
        setAllEvents([]);
        if (
          err.message?.includes("Unauthorized") ||
          err.message?.includes("Không thể làm mới")
        ) {
        }
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [refreshToken]
  );

  const fetchNotifications = useCallback(
    async (userId: string, token: string | null) => {
      if (!userId || !token) {
        setNotifications([]);
        return;
      }
      setIsLoadingNotifications(true);
      setErrorNotifications(null);
      const limit = 10;
      let currentToken = token;
      try {
        const url = `http://localhost:8080/identity/api/notifications?userId=${userId}&limit=${limit}`;
        let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
        let res = await fetch(url, { headers, cache: "no-store" });
        if (res.status === 401 || res.status === 403) {
          const newToken = await refreshToken();
          if (newToken) {
            currentToken = newToken;
            localStorage.setItem("authToken", newToken);
            headers["Authorization"] = `Bearer ${newToken}`;
            res = await fetch(url, { headers, cache: "no-store" });
          } else throw new Error("Unauthorized or Refresh Failed");
        }
        if (!res.ok) {
          const status = res.status;
          let msg = `HTTP error ${status}`;
          try {
            const errorData = await res.json();
            msg = errorData.message || msg;
          } catch (_) {}
          throw new Error(msg);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const formattedNotifications: NotificationItem[] = data.result.map(
            (item: any) => ({
              id: item.id,
              title: item.title,
              content: item.content,
              type: item.type,
              read: item.read,
              createdAt: item.createdAt,
              relatedId: item.relatedId,
              userId: item.userId,
            })
          );
          setNotifications(formattedNotifications);
        } else
          throw new Error(data.message || "Lỗi định dạng dữ liệu thông báo");
      } catch (error: any) {
        console.error("Lỗi fetchNotifications (Admin):", error);
        setErrorNotifications(error.message || "Lỗi tải thông báo.");
        setNotifications([]);
      } finally {
        setIsLoadingNotifications(false);
      }
    },
    [refreshToken]
  );

  useEffect(() => {
    if (!isInitialized) return;
    let isMounted = true;
    setIsLoadingUser(true);
    setIsLoadingEvents(true);
    setIsLoadingNews(true);
    setIsLoadingNotifications(false);

    const loadAdminData = async () => {
      let currentAuthToken = localStorage.getItem("authToken");
      let userIdForFetches: string | null = null;
      let tokenForSubFetches: string | null = currentAuthToken;

      if (currentAuthToken) {
        try {
          const headers: HeadersInit = {
            Authorization: `Bearer ${currentAuthToken}`,
          };
          const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
          let userRes = await fetch(userInfoUrl, {
            headers,
            cache: "no-store",
          });

          if (
            (userRes.status === 401 || userRes.status === 403) &&
            refreshToken
          ) {
            console.log("Admin token expired/invalid, attempting refresh...");
            const newToken = await refreshToken();
            if (newToken && isMounted) {
              tokenForSubFetches = newToken;
              console.log("Retrying admin user info fetch with new token...");
              userRes = await fetch(userInfoUrl, {
                headers: { Authorization: `Bearer ${newToken}` },
                cache: "no-store",
              });
            } else if (isMounted) {
              throw new Error(
                "Unauthorized or Refresh Failed during admin user fetch"
              );
            }
          }

          if (!userRes.ok && isMounted) {
            const errorText = await userRes.text();
            throw new Error(
              `Admin user info failed: ${userRes.status} - ${errorText}`
            );
          }

          if (isMounted) {
            const userData = await userRes.json();
            if (userData.code === 1000 && userData.result?.id) {
              const fetchedUser: User = userData.result;
              if (!fetchedUser.roles?.some((r) => r.name === "ADMIN")) {
                toast.error("Truy cập bị từ chối. Bạn không phải Admin.");
                handleLogout();
                return;
              } else {
                setUser(fetchedUser);
                userIdForFetches = fetchedUser.id;
              }
            } else {
              throw new Error("Invalid user data structure received");
            }
          }
        } catch (error: any) {
          console.error("Lỗi fetch user info (Admin):", error.message);
          if (isMounted) setUser(null);
          userIdForFetches = null;
          tokenForSubFetches = null;
          if (
            error.message?.includes("Unauthorized") ||
            error.message?.includes("Refresh Failed") ||
            error.message?.includes("Admin user info failed")
          ) {
            handleLogout();
          }
        } finally {
          if (isMounted) setIsLoadingUser(false);
        }
      } else {
        if (isMounted) {
          setIsLoadingUser(false);
          setIsLoadingEvents(false);
          setIsLoadingNews(false);
          setNotifications([]);
        }
        console.log("No auth token found, redirecting to login.");
        router.push("/login");
        return;
      }

      if (userIdForFetches && tokenForSubFetches && isMounted) {
        await Promise.all([
          fetchAdminHomeEvents(tokenForSubFetches),
          fetchNews(),
          fetchNotifications(userIdForFetches, tokenForSubFetches),
        ]);
      } else if (isMounted && !userIdForFetches && !isLoadingUser) {
        setIsLoadingEvents(false);
        setIsLoadingNews(false);
        setNotifications([]);
        setAllEvents([]);
        setNewsItems([]);
      }
    };

    loadAdminData();
    return () => {
      isMounted = false;
    };
  }, [
    isInitialized,
    refreshToken,
    router,
    fetchAdminHomeEvents,
    fetchNews,
    fetchNotifications,
  ]);

  useEffect(() => {
    if (user?.id && user.roles?.some((r) => r.name === "ADMIN")) {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      console.log(`SOCKET (Admin): Đang kết nối cho user: ${user.id}`);
      const socket = io("ws://localhost:9099", {
        path: "/socket.io",
        query: { userId: user.id },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("SOCKET (Admin): Đã kết nối - ID:", socket.id);
      });

      socket.on("disconnect", (reason) => {
        console.log("SOCKET (Admin): Đã ngắt kết nối - Lý do:", reason);
      });

      socket.on("connect_error", (error) => {
        console.error("SOCKET (Admin): Lỗi kết nối:", error);
      });

      socket.on("notification", (data: any) => {
        console.log("SOCKET (Admin): Nhận được thông báo:", data);
        if (data && typeof data === "object") {
          const newNotification: NotificationItem = {
            id: data.id || `socket-admin-${Date.now()}`,
            title: data.title || "Thông báo",
            content: data.content || "",
            type: data.type || "SYSTEM",
            read: data.read !== undefined ? data.read : false,
            createdAt: data.createdAt || new Date().toISOString(),
            relatedId: data.relatedId,
            userId: data.userId || user.id,
          };
          setNotifications((prevNotifications) =>
            [newNotification, ...prevNotifications].slice(0, 15)
          );
        } else {
          console.warn("SOCKET (Admin): Dữ liệu thông báo không hợp lệ:", data);
        }
      });

      return () => {
        if (socketRef.current) {
          console.log("SOCKET (Admin): Ngắt kết nối...");
          socketRef.current.off("connect");
          socketRef.current.off("disconnect");
          socketRef.current.off("connect_error");
          socketRef.current.off("notification");
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    } else {
      if (socketRef.current) {
        console.log(
          "SOCKET (Admin): Ngắt kết nối do user null hoặc không phải Admin."
        );
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [user, setNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationContainerRef.current &&
        !notificationContainerRef.current.contains(event.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    if (socketRef.current) {
      console.log("SOCKET (Admin): Ngắt kết nối khi logout...");
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        await fetch("http://localhost:8080/identity/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token }),
        });
      }
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    } finally {
      localStorage.clear();
      setUser(null);
      setAllEvents([]);
      setNewsItems([]);
      setNotifications([]);
      setActiveTab("home");
      router.push("/login");
    }
  };

  const handleEventClick = (event: EventDisplayInfo) => setSelectedEvent(event);
  const handleBackToList = () => setSelectedEvent(null);

  const handleNotificationClick = () => {
    setShowNotificationDropdown((prev) => !prev);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    let token = localStorage.getItem("authToken");
    if (!token || !user?.id) {
      toast.error("Vui lòng đăng nhập lại.");
      return;
    }
    let currentToken = token;
    try {
      const url = `http://localhost:8080/identity/api/notifications/${notificationId}/read`;
      let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
      let res = await fetch(url, { method: "PUT", headers: headers });
      if ((res.status === 401 || res.status === 403) && refreshToken) {
        const newToken = await refreshToken();
        if (newToken) {
          currentToken = newToken;
          localStorage.setItem("authToken", newToken);
          headers["Authorization"] = `Bearer ${newToken}`;
          res = await fetch(url, { method: "PUT", headers: headers });
        } else {
          throw new Error("Không thể làm mới phiên đăng nhập.");
        }
      }
      if (!res.ok) {
        let errorMsg = `Lỗi ${res.status}`;
        try {
          const errorData = await res.json();
          errorMsg = errorData.message || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error: any) {
      console.error("Lỗi đánh dấu thông báo đã đọc (Admin):", error);
      toast.error(`Lỗi: ${error.message || "Không thể đánh dấu đã đọc."}`);
      if (
        error.message?.includes("Unauthorized") ||
        error.message?.includes("Không thể làm mới")
      ) {
        router.push("/login?sessionExpired=true");
      }
    }
  };

  const refreshNewsList = useCallback(() => {
    fetchNews();
  }, [fetchNews]);

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
    apiFormData.append("content", formData.content);
    if (formData.eventId) {
      apiFormData.append("eventId", formData.eventId);
    }

    let API_URL = "http://localhost:8080/identity/api/news";
    let method = "POST";
    let currentToken = localStorage.getItem("authToken");

    if (newsId) {
      API_URL = `http://localhost:8080/identity/api/news/${newsId}`;
      method = "PUT";
      if (formData.imageFile) {
        apiFormData.append("coverImage", formData.imageFile);
      }
    } else {
      apiFormData.append("type", "NEWS");
      apiFormData.append("featured", "false");
      apiFormData.append("pinned", "false");
      apiFormData.append("createdById", user.id);
      if (formData.imageFile) {
        apiFormData.append("coverImage", formData.imageFile);
      }
    }

    try {
      let headers: HeadersInit = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
      let response = await fetch(API_URL, {
        method: method,
        headers: headers,
        body: apiFormData,
      });
      if (
        (response.status === 401 || response.status === 403) &&
        currentToken &&
        refreshToken
      ) {
        console.log(
          "Token expired/invalid during news submit, attempting refresh..."
        );
        const newToken = await refreshToken();
        if (newToken) {
          currentToken = newToken;
          localStorage.setItem("authToken", newToken);
          headers["Authorization"] = `Bearer ${currentToken}`;
          console.log("Retrying news API call with new token...");
          response = await fetch(API_URL, {
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
            (newsId
              ? "Cập nhật tin tức thành công!"
              : "Tạo tin tức thành công!")
        );
        refreshNewsList();
        setIsNewsModalOpen(false);
        setEditingNewsItem(null);
      } else {
        toast.error(
          result.message ||
            (newsId ? "Cập nhật tin tức thất bại." : "Tạo tin tức thất bại.")
        );
        console.error("News Submit API Error:", result);
      }
    } catch (error: any) {
      console.error("Error submitting news form (Admin):", error);
      if (error.message?.includes("Refresh token failed")) {
        toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
        router.push("/login?sessionExpired=true");
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
    setEditingNewsItem(null);
    setIsNewsModalOpen(true);
  };

  const handleOpenEditModal = (newsItem: NewsItem) => {
    setEditingNewsItem(newsItem);
    setIsNewsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSubmittingNews) {
      setIsNewsModalOpen(false);
      setEditingNewsItem(null);
    }
  };

  const isPageLoading = !isInitialized || isLoadingUser;

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const getTabButtonClasses = (tabName: ActiveTab): string => {
    const baseClasses =
      "cursor-pointer px-4 py-2 text-xs sm:text-sm font-semibold rounded-full shadow-sm transition";
    const activeClasses = "text-white";
    const inactiveClasses = "hover:bg-opacity-80";
    let specificBg = "",
      specificText = "",
      specificHoverBg = "";
    switch (tabName) {
      case "home":
        specificBg = activeTab === tabName ? "bg-indigo-600" : "bg-indigo-100";
        specificText = activeTab === tabName ? "" : "text-indigo-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-indigo-700" : "hover:bg-indigo-200";
        break;
      case "news":
        specificBg = activeTab === tabName ? "bg-green-600" : "bg-green-100";
        specificText = activeTab === tabName ? "" : "text-green-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-green-700" : "hover:bg-green-200";
        break;
      case "approval":
        specificBg = activeTab === tabName ? "bg-yellow-500" : "bg-yellow-100";
        specificText = activeTab === tabName ? "" : "text-yellow-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-yellow-600" : "hover:bg-yellow-200";
        break;
      case "attendees":
        specificBg = activeTab === tabName ? "bg-teal-600" : "bg-teal-100";
        specificText = activeTab === tabName ? "" : "text-teal-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-teal-700" : "hover:bg-teal-200";
        break;
      case "members":
        specificBg = activeTab === tabName ? "bg-pink-600" : "bg-pink-100";
        specificText = activeTab === tabName ? "" : "text-pink-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-pink-700" : "hover:bg-pink-200";
        break;
      case "roles":
        specificBg = activeTab === tabName ? "bg-orange-500" : "bg-orange-100";
        specificText = activeTab === tabName ? "" : "text-orange-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-orange-600" : "hover:bg-orange-200";
        break;
      case "chatList":
        specificBg = activeTab === tabName ? "bg-purple-600" : "bg-purple-100";
        specificText = activeTab === tabName ? "" : "text-purple-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-purple-700" : "hover:bg-purple-200";
        break;
      default:
        specificBg = "bg-gray-100";
        specificText = "text-gray-800";
        specificHoverBg = "hover:bg-gray-200";
    }
    return `${baseClasses} ${specificBg} ${
      activeTab === tabName ? activeClasses : specificText
    } ${activeTab !== tabName ? inactiveClasses : ""} ${specificHoverBg}`;
  };

  const getActiveIndicatorColor = (tabName: ActiveTab): string => {
    switch (tabName) {
      case "home":
        return "border-t-indigo-600";
      case "news":
        return "border-t-green-600";
      case "approval":
        return "border-t-yellow-500";
      case "attendees":
        return "border-t-teal-600";
      case "members":
        return "border-t-pink-600";
      case "roles":
        return "border-t-orange-500";
      case "chatList":
        return "border-t-purple-600";
      default:
        return "border-t-gray-400";
    }
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100 text-lg font-medium text-gray-600">
        Đang xác thực quyền truy cập Admin...
      </div>
    );
  }

  if (!user || !user.roles?.some((r) => r.name === "ADMIN")) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-4 text-center">
        <p className="text-red-600 text-xl font-semibold mb-4">
          Truy cập bị từ chối
        </p>
        <p className="text-gray-700 mb-6">
          Bạn không có quyền truy cập trang quản trị hoặc phiên đăng nhập không
          hợp lệ.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Đi đến trang Đăng nhập
        </button>
      </div>
    );
  }

  const tabs = [
    { id: "home", label: "🏠 Trang chủ" },
    { id: "news", label: "📰 Bảng tin" },
    { id: "approval", label: "📅 Phê duyệt" },
    { id: "attendees", label: "✅ Điểm danh / Tham gia" },
    { id: "members", label: "👥 Quản lý thành viên" },
    { id: "roles", label: "📌 Quản lý Vai trò/Chức vụ" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 relative">
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg sm:text-xl font-bold">
            Quản lý Sự kiện & CLB (Admin)
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            
          <span
              className="cursor-pointer hover:text-gray-300 transition-colors"
              onClick={() => setShowAboutModal(true)}
            >
                Giới thiệu
              </span>
            
            <span
              className="cursor-pointer hover:text-gray-300 transition-colors"
              onClick={() => setShowContactModal(true)}
            >
              Liên hệ
            </span>
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-5 justify-center pb-3">
          {tabs.map((tab) => (
            <div key={tab.id} className="relative flex flex-col items-center">
              <button
                onClick={() => setActiveTab(tab.id as ActiveTab)}
                className={getTabButtonClasses(tab.id as ActiveTab)}
              >
                {tab.label}
              </button>
              {activeTab === tab.id && (
                <div
                  className={`absolute top-full mt-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] ${getActiveIndicatorColor(
                    tab.id as ActiveTab
                  )} border-r-[6px] border-r-transparent`}
                  style={{ left: "50%", transform: "translateX(-50%)" }}
                ></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 min-h-[400px]">
        {activeTab === "home" && (
          <AdminHomeTabContent
            events={allEvents}
            isLoading={isLoadingEvents}
            error={errorEvents}
            search={search}
            setSearch={setSearch}
            sortOption={sortOption}
            setSortOption={setSortOption}
            timeFilterOption={timeFilterOption}
            setTimeFilterOption={setTimeFilterOption}
            startDateFilter={startDateFilter}
            setStartDateFilter={setStartDateFilter}
            endDateFilter={endDateFilter}
            setEndDateFilter={setEndDateFilter}
            selectedEvent={selectedEvent}
            onEventClick={handleEventClick}
            onBackToList={handleBackToList}
          />
        )}
        {activeTab === "news" && (
          <NewsTabContent
            newsItems={newsItems}
            isLoading={isLoadingNews}
            error={errorNews}
            user={user}
            onOpenCreateModal={handleOpenCreateModal}
            onOpenEditModal={handleOpenEditModal}
            onNewsDeleted={refreshNewsList}
            // refreshToken={refreshToken}
          />
        )}
        {activeTab === "approval" && <ApprovalTabContent user={user} />}
        {activeTab === "attendees" && <AttendeesTabContent user={user} />}
        {activeTab === "members" && (
          <MembersTabContent
            user={user}
            userRole={"ADMIN"}
            currentUserEmail={user?.email || null}
          />
        )}
        {activeTab === "roles" && <RolesTabContent user={user} />}
        {activeTab === "chatList" && <ChatTabContent currentUser={user} />}
      </div>

      {isInitialized && !isLoadingUser && user && (
        <div
          className="fixed bottom-6 right-6 z-50 group"
          ref={notificationContainerRef}
        >
          <button
            ref={notificationButtonRef}
            onClick={handleNotificationClick}
            className="relative flex items-center cursor-pointer justify-center h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition ease-in-out duration-150"
            aria-label="Thông báo"
            aria-haspopup="true"
            aria-expanded={showNotificationDropdown}
          >
            <span className="sr-only">Xem thông báo</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white transform translate-x-1/4 -translate-y-1/4 ring-2 ring-white pointer-events-none">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            )}
          </button>
          {showNotificationDropdown && (
            <div className="absolute bottom-full right-0 mb-2 w-80 sm:w-96">
              <NotificationDropdown
                notifications={notifications}
                isLoading={isLoadingNotifications}
                error={errorNotifications}
                onMarkAsRead={handleMarkAsRead}
                onClose={() => setShowNotificationDropdown(false)}
              />
            </div>
          )}
        </div>
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
          setConfirmationState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() =>
          setConfirmationState((prev) => ({ ...prev, isOpen: false }))
        }
      />
      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}
      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}
      <CreateNewsModal
        isOpen={isNewsModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleNewsFormSubmit}
        isSubmitting={isSubmittingNews}
        editMode={!!editingNewsItem}
        initialData={editingNewsItem}
      />
    </div>
  );
}
