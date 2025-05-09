"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { io, Socket } from "socket.io-client";
import UserMenu from "../component/menu";
import ContactModal from "../component/modals/ContactModal";
import AboutModal from "../component/modals/AboutModal";
import AdminHomeTabContent from "../component/tabs/AdminHomeTabContent";
import ApprovalTabContent from "../component/tabs/ApprovalTabContent";
import AttendeesTabContent from "../component/tabs/AttendeesTabContent";
import MembersTabContent from "../component/tabs/MembersTabContent";
import RolesTabContent from "../component/tabs/RolesTabContent";
import ChatTabContent from "../component/tabs/ChatTabContent";
import MyEventsTabContent from "./tabs/MyEventsTabContent";

import NewsTabContent from "../component/tabs/NewsTabContent";
import CreateNewsModal, {
  NewsFormData,
} from "../component/modals/CreateNewsModal";
import NotificationDropdown, {
  NotificationItem,
} from "../component/NotificationDropdown";
import { BellIcon } from "@radix-ui/react-icons";
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";
import { ConfirmationDialog } from "../../utils/ConfirmationDialog";

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




type ActiveTab =
  | "home"
  | "news"
  | "approval"
  | "myEvents"
  | "attendees"
  | "members"
  | "roles"
  | "chatList"
  | "myActivities"; // Thêm tab mới

export default function HomeAdmin() {
  const [search, setSearch] = useState("");
  const [allEvents, setAllEvents] = useState<EventDisplayInfo[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventDisplayInfo | null>(
    null
  );
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(
      new Set()
    );
    const [isLoadingCreatedEventIds, setIsLoadingCreatedEventIds] =
        useState<boolean>(true);
    
      const [isLoadingRegisteredIds, setIsLoadingRegisteredIds] =
        useState<boolean>(true);

        const [createdEventIds, setCreatedEventIds] = useState<Set<string>>(
            new Set()
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
    onCancel?: () => void;
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
  const [sessionStatus, setSessionStatus] = useState<
    "active" | "expired" | "error"
  >("active");
  const router = useRouter();

  const { refreshToken, refreshing } = useRefreshToken();
  const [appIsInitialized, setAppIsInitialized] = useState(false);

  useEffect(() => {
    if (sessionStatus === "expired") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authenticatedUser");
      setUser(null);
      setAllEvents([]);
      setNewsItems([]);
      setNotifications([]);
      setActiveTab("home");
      if (router) {
        router.push("/login?sessionExpired=true&role=admin");
      }
    } else if (sessionStatus === "error") {
      toast.error(
        "Đã có lỗi trong phiên làm việc hoặc xác thực, vui lòng đăng nhập lại."
      );
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authenticatedUser");
      setUser(null);
      if (router) {
        router.push("/login?sessionError=true&role=admin");
      }
    }
  }, [sessionStatus, router]);

  const createAuthFailureHandler = (
    stopLoading?: () => void,
    setErrorState?: (msg: string | null) => void
  ) => {
    return (errorType: "expired" | "error" = "expired") => {
      if (isMountedRef.current) {
        setSessionStatus(errorType);
      }
      if (stopLoading) stopLoading();
      if (setErrorState && isMountedRef.current)
        setErrorState(
          errorType === "expired" ? "Phiên đăng nhập hết hạn." : "Lỗi xác thực."
        );
    };
  };

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchNews = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsLoadingNews(true);
    setErrorNews(null);
    let currentToken = localStorage.getItem("authToken");
    const handleAuthFailure = createAuthFailureHandler(() => {
      if (isMountedRef.current) setIsLoadingNews(false);
    }, setErrorNews);

    if (!currentToken && appIsInitialized) {
      handleAuthFailure();
      return;
    }
    if (!currentToken && !appIsInitialized) {
      if (isMountedRef.current) setIsLoadingNews(false);
      return;
    }

    try {
      let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
      const url = `http://localhost:8080/identity/api/news/status?status=APPROVED`;
      let res = await fetch(url, { headers, cache: "no-store" });

      if (res.status === 401 || res.status === 403) {
        const refreshResult = await refreshToken();
        if (!isMountedRef.current) return;
        if (refreshResult.sessionExpired) {
          handleAuthFailure("expired");
          return;
        }
        if (refreshResult.error) {
          handleAuthFailure("error");
          return;
        }
        if (refreshResult.token) {
          currentToken = refreshResult.token;
          headers["Authorization"] = `Bearer ${currentToken}`;
          res = await fetch(url, { headers, cache: "no-store" });
        } else {
          handleAuthFailure("expired");
          return;
        }
      }

      if (!isMountedRef.current) return;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleAuthFailure("expired");
          return;
        }
        const err = await res
          .json()
          .catch(() => ({ message: `HTTP error ${res.status}` }));
        throw new Error(err.message || `HTTP error ${res.status}`);
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
        if (isMountedRef.current) setNewsItems(fmt);
      } else throw new Error(d.message || "Lỗi định dạng dữ liệu tin tức");
    } catch (e: any) {
      if (
        isMountedRef.current &&
        e.message !== "Phiên đăng nhập hết hạn." &&
        e.message !== "Lỗi xác thực."
      )
        setErrorNews(e.message || "Lỗi tải tin tức.");
    } finally {
      if (isMountedRef.current) setIsLoadingNews(false);
    }
  }, [refreshToken, appIsInitialized, setSessionStatus]);
//
  const fetchAdminHomeEvents = useCallback(async () => {
    if (!isMountedRef.current) return;
    setIsLoadingEvents(true);
    setErrorEvents(null);
    let currentToken = localStorage.getItem("authToken");
    const handleAuthFailure = createAuthFailureHandler(() => {
      if (isMountedRef.current) setIsLoadingEvents(false);
    }, setErrorEvents);

    if (!currentToken && appIsInitialized) {
      handleAuthFailure();
      return;
    }
    if (!currentToken && !appIsInitialized) {
      if (isMountedRef.current) setIsLoadingEvents(false);
      return;
    }

    try {
      let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
      const url = `http://localhost:8080/identity/api/events`;
      let res = await fetch(url, { headers, cache: "no-store" });

      if (res.status === 401 || res.status === 403) {
        const refreshResult = await refreshToken();
        if (!isMountedRef.current) return;
        if (refreshResult.sessionExpired) {
          handleAuthFailure("expired");
          return;
        }
        if (refreshResult.error) {
          handleAuthFailure("error");
          return;
        }
        if (refreshResult.token) {
          currentToken = refreshResult.token;
          headers["Authorization"] = `Bearer ${currentToken}`;
          res = await fetch(url, { headers, cache: "no-store" });
        } else {
          handleAuthFailure("expired");
          return;
        }
      }
      if (!isMountedRef.current) return;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleAuthFailure("expired");
          return;
        }
        const err = await res
          .json()
          .catch(() => ({ message: `HTTP error ${res.status}` }));
        throw new Error(err.message || `HTTP error ${res.status}`);
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
        if (isMountedRef.current) setAllEvents(formattedEvents);
      } else throw new Error(data.message || "Dữ liệu sự kiện không hợp lệ");
    } catch (err: any) {
      if (
        isMountedRef.current &&
        err.message !== "Phiên đăng nhập hết hạn." &&
        err.message !== "Lỗi xác thực."
      )
        setErrorEvents(err.message || "Không thể tải danh sách sự kiện.");
    } finally {
      if (isMountedRef.current) setIsLoadingEvents(false);
    }
  }, [refreshToken, appIsInitialized, setSessionStatus]);

  //  fetchUserCreatedEvents
   const fetchUserCreatedEvents = useCallback(
      async (userId: string, token: string | null) => {
        if (!userId || !token) {
          setIsLoadingCreatedEventIds(false);
          setCreatedEventIds(new Set());
          return;
        }
        setIsLoadingCreatedEventIds(true);
        let currentToken = token;
        try {
          const url = `http://localhost:8080/identity/api/events/creator/${userId}`;
          let res = await fetch(url, {
            headers: { Authorization: `Bearer ${currentToken}` },
            cache: "no-store",
          });
          if (res.status === 401 || res.status === 403) {
            const nt = await refreshToken();
            if (nt) {
              currentToken = nt;
              localStorage.setItem("authToken", nt);
              res = await fetch(url, {
                headers: { Authorization: `Bearer ${currentToken}` },
                cache: "no-store",
              });
            } else throw new Error("Unauthorized or Refresh Failed");
          }
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          if (data.code === 1000 && Array.isArray(data.result))
            setCreatedEventIds(
              new Set(data.result.map((event: any) => event.id))
            );
          else setCreatedEventIds(new Set());
        } catch (err: any) {
          console.error("Lỗi tải ID sự kiện đã tạo:", err);
          setCreatedEventIds(new Set());
          if (err.message?.includes("Unauthorized"))
            router.push("/login?sessionExpired=true");
        } finally {
          setIsLoadingCreatedEventIds(false);
        }
      },
      [refreshToken, router]
    );

//Sự kiện đã đăng ký
     const fetchRegisteredEventIds = useCallback(
        async (userId: string, token: string | null) => {
          if (!userId || !token) {
            setIsLoadingRegisteredIds(false);
            setRegisteredEventIds(new Set());
            return;
          }
          setIsLoadingRegisteredIds(true);
          let currentToken = token;
          try {
            const url = `http://localhost:8080/identity/api/events/attendee/${userId}`;
            let res = await fetch(url, {
              headers: { Authorization: `Bearer ${currentToken}` },
              cache: "no-store",
            });
            if (res.status === 401 || res.status === 403) {
              const nt = await refreshToken();
              if (nt) {
                currentToken = nt;
                localStorage.setItem("authToken", nt);
                res = await fetch(url, {
                  headers: { Authorization: `Bearer ${currentToken}` },
                  cache: "no-store",
                });
              } else throw new Error("Unauthorized or Refresh Failed");
            }
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            if (data.code === 1000 && Array.isArray(data.result))
              setRegisteredEventIds(
                new Set(data.result.map((event: any) => event.id))
              );
            else {
              setRegisteredEventIds(new Set());
              console.warn(
                "API /events/attendee/ không trả về cấu trúc mong đợi:",
                data
              );
            }
          } catch (err: any) {
            console.error("Lỗi tải ID sự kiện đã đăng ký:", err);
            setRegisteredEventIds(new Set());
            if (err.message?.includes("Unauthorized"))
              router.push("/login?sessionExpired=true");
          } finally {
            setIsLoadingRegisteredIds(false);
          }
        },
        [refreshToken, router]
      );

      //
       const fetchAllEvents = useCallback(async () => {
          setIsLoadingEvents(true);
          setErrorEvents(null);
          let currentToken = localStorage.getItem("authToken");
          try {
            let headers: HeadersInit = {};
            if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
            const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
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
              const fmt: EventDisplayInfo[] = d.result
                .filter((e: any) => !e.deleted)
                .map((e: any) => ({
                  id: e.id,
                  title: e.name || "N/A",
                  name: e.name,
                  date: e.time || e.createdAt || "",
                  time: e.time,
                  location: e.location || "N/A",
                  description: e.content || e.purpose || "",
                  content: e.content,
                  purpose: e.purpose,
                  avatarUrl: e.avatarUrl || null,
                  status: e.status,
                  createdBy: e.createdBy,
                  organizers: e.organizers || [],
                  participants: e.participants || [],
                  attendees: e.attendees || [],
                }));
              setAllEvents(fmt);
            } else throw new Error(d.message || "Lỗi định dạng dữ liệu sự kiện");
          } catch (e: any) {
            console.error("Lỗi fetchAllEvents:", e);
            setErrorEvents(e.message || "Lỗi tải sự kiện.");
            if (e.message?.includes("Unauthorized"))
              router.push("/login?sessionExpired=true");
          } finally {
            setIsLoadingEvents(false);
          }
        }, [refreshToken, router]);

  const fetchNotifications = useCallback(
    async (userId: string) => {
      if (!isMountedRef.current) return;
      setIsLoadingNotifications(true);
      setErrorNotifications(null);
      let currentToken = localStorage.getItem("authToken");
      const handleAuthFailure = createAuthFailureHandler(() => {
        if (isMountedRef.current) setIsLoadingNotifications(false);
      }, setErrorNotifications);

      if (!currentToken || !userId) {
        if (isMountedRef.current) {
          setIsLoadingNotifications(false);
          setNotifications([]);
        }
        return;
      }

      try {
        const limit = 10;
        const url = `http://localhost:8080/identity/api/notifications?userId=${userId}&limit=${limit}`;
        let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
        let res = await fetch(url, { headers, cache: "no-store" });
        if (res.status === 401 || res.status === 403) {
          const refreshResult = await refreshToken();
          if (!isMountedRef.current) return;
          if (refreshResult.sessionExpired) {
            handleAuthFailure("expired");
            return;
          }
          if (refreshResult.error) {
            handleAuthFailure("error");
            return;
          }
          if (refreshResult.token) {
            currentToken = refreshResult.token;
            headers["Authorization"] = `Bearer ${currentToken}`;
            res = await fetch(url, { headers, cache: "no-store" });
          } else {
            handleAuthFailure("expired");
            return;
          }
        }
        if (!isMountedRef.current) return;
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            handleAuthFailure("expired");
            return;
          }
          const errorData = await res
            .json()
            .catch(() => ({ message: `HTTP error ${res.status}` }));
          throw new Error(errorData.message || `HTTP error ${res.status}`);
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
          if (isMountedRef.current) setNotifications(formattedNotifications);
        } else
          throw new Error(data.message || "Lỗi định dạng dữ liệu thông báo");
      } catch (error: any) {
        if (
          isMountedRef.current &&
          error.message !== "Phiên đăng nhập hết hạn." &&
          error.message !== "Lỗi xác thực."
        )
          setErrorNotifications(error.message || "Lỗi tải thông báo.");
        if (isMountedRef.current) setNotifications([]);
      } finally {
        if (isMountedRef.current) setIsLoadingNotifications(false);
      }
    },
    [refreshToken, setSessionStatus]
  );

  useEffect(() => {
    if (sessionStatus === "expired" || appIsInitialized) {
      return;
    }

    const loadAdminData = async () => {
      if (!isMountedRef.current) return;
      setIsLoadingUser(true);
      let currentAuthToken = localStorage.getItem("authToken");
      let userIdForFetches: string | null = null;
      let tokenForSubFetches: string | null = currentAuthToken;

      if (currentAuthToken) {
        try {
          const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
          let userRes = await fetch(userInfoUrl, {
            headers: { Authorization: `Bearer ${currentAuthToken}` },
            cache: "no-store",
          });

          if (userRes.status === 401 || userRes.status === 403) {
            const refreshResult = await refreshToken();
            if (!isMountedRef.current) return;
            if (refreshResult.sessionExpired || refreshResult.error) {
              setSessionStatus(
                refreshResult.sessionExpired ? "expired" : "error"
              );
              return;
            }
            if (refreshResult.token) {
              tokenForSubFetches = refreshResult.token;
              userRes = await fetch(userInfoUrl, {
                headers: { Authorization: `Bearer ${tokenForSubFetches}` },
                cache: "no-store",
              });
            } else {
              setSessionStatus("expired");
              return;
            }
          }

          if (!isMountedRef.current) return;
          if (!userRes.ok) {
            if (userRes.status === 401 || userRes.status === 403) {
              setSessionStatus("expired");
              return;
            }
            const errorText = await userRes.text();
            throw new Error(
              `Admin user info failed: ${userRes.status} - ${errorText}`
            );
          }

          const userData = await userRes.json();
          if (!isMountedRef.current) return;
          if (userData.code === 1000 && userData.result?.id) {
            const fetchedUser: User = userData.result;
            if (!fetchedUser.roles?.some((r) => r.name === "ADMIN")) {
              toast.error("Truy cập bị từ chối. Bạn không phải Admin.");
              setSessionStatus("expired");
              return;
            } else {
              setUser(fetchedUser);
              userIdForFetches = fetchedUser.id;
            }
          } else {
            throw new Error("Invalid user data structure received");
          }
        } catch (error: any) {
          if (isMountedRef.current) {
            setUser(null);
            if (
              error.message !== "Invalid user data structure received" &&
              error.message !== "Phiên đăng nhập hết hạn." &&
              error.message !== "Lỗi xác thực."
            ) {
              setSessionStatus("expired");
            } else if (
              error.message === "Phiên đăng nhập hết hạn." ||
              error.message === "Lỗi xác thực."
            ) {
              setSessionStatus("expired");
            }
            console.error("Error in loadAdminData (fetch user):", error);
          }
        } finally {
          if (isMountedRef.current) setIsLoadingUser(false);
        }
      } else {
        if (isMountedRef.current) {
          setIsLoadingUser(false);
          setSessionStatus("expired");
        }
        return;
      }

      if (
        userIdForFetches &&
        tokenForSubFetches &&
        isMountedRef.current &&
        sessionStatus === "active"
      ) {
        await Promise.all([
          fetchAdminHomeEvents(),
          fetchNews(),
          fetchNotifications(userIdForFetches),
        ]);
      } else if (isMountedRef.current && !userIdForFetches && !isLoadingUser) {
        setIsLoadingEvents(false);
        setIsLoadingNews(false);
        setNotifications([]);
        setAllEvents([]);
        setNewsItems([]);
      }

      if (isMountedRef.current) {
        setAppIsInitialized(true);
      }
    };

    loadAdminData();
  }, [
    appIsInitialized,
    sessionStatus,
    refreshToken,
    fetchAdminHomeEvents,
    fetchNews,
    fetchNotifications,
  ]);

  useEffect(() => {
    if (
      user?.id &&
      user.roles?.some((r) => r.name === "ADMIN") &&
      sessionStatus === "active"
    ) {
      if (socketRef.current) socketRef.current.disconnect();
      const socket = io("ws://localhost:9099", {
        path: "/socket.io",
        query: { userId: user.id },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });
      socketRef.current = socket;
      socket.on("connect", () =>
        console.log("SOCKET (Admin): Đã kết nối - ID:", socket.id)
      );
      socket.on("disconnect", (reason) =>
        console.log("SOCKET (Admin): Đã ngắt kết nối - Lý do:", reason)
      );
      socket.on("connect_error", (error) =>
        console.error("SOCKET (Admin): Lỗi kết nối:", error)
      );
      socket.on("notification", (data: any) => {
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
          if (isMountedRef.current) {
            setNotifications((prevNotifications) =>
              [newNotification, ...prevNotifications].slice(0, 15)
            );
          }
        } else {
          console.warn("SOCKET (Admin): Dữ liệu thông báo không hợp lệ:", data);
        }
      });
      return () => {
        if (socketRef.current) {
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
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    }
  }, [user, sessionStatus]);

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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    if (socketRef.current) socketRef.current.disconnect();
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
      if (isMountedRef.current) setSessionStatus("expired");
    }
  };

  const handleEventClick = (event: EventDisplayInfo) => setSelectedEvent(event);
  const handleBackToList = () => setSelectedEvent(null);
  const handleNotificationClick = () =>
    setShowNotificationDropdown((prev) => !prev);

  const handleMarkAsRead = async (notificationId: string) => {
    let token = localStorage.getItem("authToken");
    const handleAuthFailure = createAuthFailureHandler(undefined, (msg) =>
      toast.error(msg || "Lỗi.")
    );
    if (!token || !user?.id) {
      handleAuthFailure();
      return;
    }

    try {
      const url = `http://localhost:8080/identity/api/notifications/${notificationId}/read`;
      let headers: HeadersInit = { Authorization: `Bearer ${token}` };
      let res = await fetch(url, { method: "PUT", headers: headers });
      if (res.status === 401 || res.status === 403) {
        const refreshResult = await refreshToken();
        if (!isMountedRef.current) return;
        if (refreshResult.sessionExpired) {
          handleAuthFailure("expired");
          return;
        }
        if (refreshResult.error) {
          handleAuthFailure("error");
          return;
        }
        if (refreshResult.token) {
          token = refreshResult.token;
          headers["Authorization"] = `Bearer ${token}`;
          res = await fetch(url, { method: "PUT", headers: headers });
        } else {
          handleAuthFailure("expired");
          return;
        }
      }
      if (!isMountedRef.current) return;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handleAuthFailure("expired");
          return;
        }
        const errorData = await res
          .json()
          .catch(() => ({ message: `Lỗi ${res.status}` }));
        throw new Error(errorData.message || `Lỗi ${res.status}`);
      }
      if (isMountedRef.current) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
      }
    } catch (error: any) {
      if (
        isMountedRef.current &&
        error.message !== "Phiên đăng nhập hết hạn." &&
        error.message !== "Lỗi xác thực."
      )
        toast.error(`Lỗi: ${error.message || "Không thể đánh dấu đã đọc."}`);
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
    if (formData.eventId) apiFormData.append("eventId", formData.eventId);

    let API_URL = "http://localhost:8080/identity/api/news";
    let method = "POST";
    let currentToken = localStorage.getItem("authToken");
    const handleAuthFailure = createAuthFailureHandler(
      () => setIsSubmittingNews(false),
      (msg) => toast.error(msg || "Lỗi.")
    );

    if (!currentToken) {
      handleAuthFailure();
      return;
    }

    if (newsId) {
      API_URL = `http://localhost:8080/identity/api/news/${newsId}`;
      method = "PUT";
      if (formData.imageFile)
        apiFormData.append("coverImage", formData.imageFile);
    } else {
      apiFormData.append("type", "NEWS");
      apiFormData.append("featured", "false");
      apiFormData.append("pinned", "false");
      apiFormData.append("createdById", user.id);
      if (formData.imageFile)
        apiFormData.append("coverImage", formData.imageFile);
    }

    try {
      let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
      let response = await fetch(API_URL, {
        method: method,
        headers: headers,
        body: apiFormData,
      });
      if (response.status === 401 || response.status === 403) {
        const refreshResult = await refreshToken();
        if (!isMountedRef.current) return;
        if (refreshResult.sessionExpired) {
          handleAuthFailure("expired");
          return;
        }
        if (refreshResult.error) {
          handleAuthFailure("error");
          return;
        }
        if (refreshResult.token) {
          currentToken = refreshResult.token;
          headers["Authorization"] = `Bearer ${currentToken}`;
          response = await fetch(API_URL, {
            method: method,
            headers: headers,
            body: apiFormData,
          });
        } else {
          handleAuthFailure("expired");
          return;
        }
      }
      if (!isMountedRef.current) return;
      const result = await response.json();
      if (response.ok && result.code === 1000) {
        toast.success(
          result.message ||
            (newsId
              ? "Cập nhật tin tức thành công!"
              : "Tạo tin tức thành công!")
        );
        if (isMountedRef.current) {
          refreshNewsList();
          setIsNewsModalOpen(false);
          setEditingNewsItem(null);
        }
      } else {
        if (response.status === 401 || response.status === 403) {
          handleAuthFailure("expired");
          return;
        }
        toast.error(
          result.message ||
            (newsId ? "Cập nhật tin tức thất bại." : "Tạo tin tức thất bại.")
        );
      }
    } catch (error: any) {
      if (
        isMountedRef.current &&
        error.message !== "Phiên đăng nhập hết hạn." &&
        error.message !== "Lỗi xác thực."
      )
        toast.error("Lỗi khi gửi yêu cầu: " + error.message);
    } finally {
      if (isMountedRef.current) setIsSubmittingNews(false);
    }
  };

  const handleRegistrationChange = useCallback(
      (eventId: string, registered: boolean) => {
        setRegisteredEventIds((prevIds) => {
          const newIds = new Set(prevIds);
          if (registered) newIds.add(eventId);
          else newIds.delete(eventId);
          return newIds;
        });
      },
      []
    );

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

  const handleSessionExpired = useCallback(() => {
    if (isMountedRef.current) setSessionStatus("expired");
  }, []);

  const isPageReallyLoading = !appIsInitialized || isLoadingUser;
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
      case "myEvents":
        specificBg = activeTab === tabName ? "bg-green-600" : "bg-green-100";
        specificText = activeTab === tabName ? "" : "text-green-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-green-700" : "hover:bg-green-200";
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
        case "myEvents":
        return "border-t-sky-600";
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

  if (!appIsInitialized && (isLoadingUser || !user)) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-100 text-lg font-medium text-gray-600">
        Đang tải ứng dụng và xác thực...
      </div>
    );
  }

  if (
    appIsInitialized &&
    (!user || !user.roles?.some((r) => r.name === "ADMIN"))
  ) {
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
    { id: "createEvent", label: "➕ Tạo sự kiện", requiresAuth: true },
    { id: "approval", label: "📅 Phê duyệt" },
    { id: "myEvents", label: "🛠 Sự kiện / Đăng ký", requiresAuth: true },
    { id: "attendees", label: "✅ Điểm danh" },
    { id: "members", label: "👥 Quản lý thành viên" },
    { id: "roles", label: "📌 Quản lý Vai trò/Chức vụ" },
    { id: "chatList", label: "💬 Trò chuyện", requiresAuth: true },

 
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 relative">
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6 sticky top-0 z-[55]">
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

      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 border border-gray-200 sticky top-20 z-50">
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
        {activeTab === "home" && user && (
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
            onRefreshEvents={fetchAdminHomeEvents}
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
            onRefreshNews={fetchNews}
          />
        )}
        {activeTab === "approval" && user && (
          <ApprovalTabContent
            user={user}
            refreshTokenProp={async () => {
              const result = await refreshToken();
              if (!isMountedRef.current) return null;
              if (result.sessionExpired || result.error) {
                setSessionStatus(result.sessionExpired ? "expired" : "error");
                return null;
              }
              return result.token || null;
            }}
          />
        )}
       { activeTab === "myEvents"&& user  && (
                      <MyEventsTabContent
                        user={user}
                        initialRegisteredEventIds={registeredEventIds}
                        isLoadingRegisteredIds={isLoadingRegisteredIds}
                        onRegistrationChange={handleRegistrationChange}
                        onEventUpdatedOrDeleted={() => {
                          fetchAllEvents();
                          const t = localStorage.getItem("authToken");
                          if (user?.id && t) {
                            fetchUserCreatedEvents(user.id, t);
                            fetchRegisteredEventIds(user.id, t);
                          }
                        }}
                      />
                    )} 
        {activeTab === "attendees" && user && (
          <AttendeesTabContent user={user} />
        )}
        {activeTab === "members" && user && (
          <MembersTabContent
            user={user}
            userRole={
              user.roles?.find((r) => r.name.toUpperCase() === "ADMIN")?.name ||
              user.roles?.[0]?.name?.toUpperCase() ||
              "ADMIN"
            }
            currentUserEmail={user.email || null}
            refreshToken={refreshToken}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {activeTab === "roles" && user && <RolesTabContent user={user} />}
        {activeTab === "chatList" && user && (
          <ChatTabContent currentUser={user} />
        )}
       
      </div>

      {appIsInitialized && !isLoadingUser && user && (
        <div
          className="fixed bottom-6 right-6 z-[65] group"
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
            <div className="absolute bottom-full right-0 mb-2 w-80 sm:w-96 z-[70]">
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
        onCancel={() => {
          if (confirmationState.onCancel) {
            confirmationState.onCancel();
          } else {
            setConfirmationState((prev) => ({ ...prev, isOpen: false }));
          }
        }}
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