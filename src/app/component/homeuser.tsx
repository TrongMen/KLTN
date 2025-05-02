"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./menu";
import ContactModal from "./contact";
import HomeTabContent from "./tabs/HomeTabContent";
import MyEventsTabContent from "./tabs/MyEventsTabContent";
import AttendeesTabContent from "./tabs/AttendeesTabContent";
import MembersTabContent from "./tabs/MembersTabContent";
import ChatTabContent from "./tabs/ChatTabContent";
import CreateEventTabContent from "./tabs/CreateEventTabContent";
import NewsTabContent from "./tabs/NewsTabContent";
import MyNewsTabContent from "./tabs/MyNewsTabContent";
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";
import { ConfirmationDialog } from "../../utils/ConfirmationDialog";

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
  date: string;
  location: string;
  description: string;
  speaker?: string;
  image?: string;
  time?: string;
  status?: string;
  purpose?: string;
  name?: string;
  content?: string;
  createdBy?: string;
  attendees?: any[];
  organizers?: any[];
}
export interface Role {
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
  dob?: string;
  avatar?: string;
  email?: string;
  gender?: boolean;
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
  | "myNews"
  | "createEvent"
  | "myEvents"
  | "attendees"
  | "registeredEvents"
  | "members"
  | "chatList";

export default function UserHome() {
  const [search, setSearch] = useState("");
  const [allEvents, setAllEvents] = useState<EventDisplayInfo[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingRegisteredIds, setIsLoadingRegisteredIds] =
    useState<boolean>(true);
  const [createdEventIds, setCreatedEventIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingCreatedEventIds, setIsLoadingCreatedEventIds] =
    useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<EventDisplayInfo | null>(
    null
  );
  const [isRegistering, setIsRegistering] = useState<string | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [errorNews, setErrorNews] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState("date");
  const [timeFilterOption, setTimeFilterOption] = useState("upcoming");
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

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
          headers["Authorization"] = `Bearer ${currentToken}`;
          res = await fetch(url, { headers });
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
      console.error("Lỗi fetchNews:", e);
      setErrorNews(e.message || "Lỗi tải tin tức.");
    } finally {
      setIsLoadingNews(false);
    }
  }, [refreshToken]);
  const fetchAllEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setErrorEvents(null);
    let currentToken = localStorage.getItem("authToken");
    try {
      let headers: HeadersInit = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
      let res = await fetch(url, { headers });
      if (
        (res.status === 401 || res.status === 403) &&
        currentToken &&
        refreshToken
      ) {
        const nt = await refreshToken();
        if (nt) {
          currentToken = nt;
          headers["Authorization"] = `Bearer ${currentToken}`;
          res = await fetch(url, { headers });
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
        const fmt: EventDisplayInfo[] = d.result.map((e: any) => ({
          id: e.id,
          title: e.name || "N/A",
          name: e.name,
          date: e.time || "",
          location: e.location || "N/A",
          description: e.content || e.purpose || "",
          time: e.time,
          status: e.status,
          purpose: e.purpose,
          content: e.content,
          createdBy: e.createdBy,
          attendees: e.attendees,
          organizers: e.organizers,
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
  const fetchRegisteredEventIds = useCallback(
    async (userId: string, token: string | null) => {
      if (!userId || !token) {
        setIsLoadingRegisteredIds(false);
        setRegisteredEventIds(new Set());
        return;
      }
      setIsLoadingRegisteredIds(true);
      try {
        const url = `http://localhost:8080/identity/api/events/attendee/${userId}`;
        let res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt)
            res = await fetch(url, {
              headers: { Authorization: `Bearer ${nt}` },
            });
          else throw new Error("Unauthorized or Refresh Failed");
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
  const fetchUserCreatedEvents = useCallback(
    async (userId: string, token: string | null) => {
      if (!userId || !token) {
        setIsLoadingCreatedEventIds(false);
        setCreatedEventIds(new Set());
        return;
      }
      setIsLoadingCreatedEventIds(true);
      try {
        const url = `http://localhost:8080/identity/api/events/creator/${userId}`;
        let res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt)
            res = await fetch(url, {
              headers: { Authorization: `Bearer ${nt}` },
            });
          else throw new Error("Unauthorized or Refresh Failed");
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
  useEffect(() => {
    if (!isInitialized) return;
    let isMounted = true;
    setIsLoadingUser(true);
    setIsLoadingEvents(true);
    setIsLoadingRegisteredIds(true);
    setIsLoadingCreatedEventIds(true);
    setIsLoadingNews(true);
    const currentAuthToken = localStorage.getItem("authToken");
    let userIdForFetches: string | null = null;
    const loadInitialData = async () => {
      const eventsPromise = fetchAllEvents();
      const newsPromise = fetchNews();
      if (currentAuthToken) {
        try {
          const headers: HeadersInit = {
            Authorization: `Bearer ${currentAuthToken}`,
          };
          const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
          let userRes = await fetch(userInfoUrl, { headers });
          if (userRes.status === 401 || userRes.status === 403) {
            const nt = await refreshToken();
            if (nt && isMounted)
              userRes = await fetch(userInfoUrl, {
                headers: { Authorization: `Bearer ${nt}` },
              });
            else if (isMounted)
              throw new Error("Unauthorized or Refresh Failed");
          }
          if (!userRes.ok)
            throw new Error(`Workspace user info failed: ${userRes.status}`);
          const userData = await userRes.json();
          if (userData.code === 1000 && userData.result?.id) {
            const fetchedUser: User = userData.result;
            userIdForFetches = fetchedUser.id;
            if (isMounted) setUser(fetchedUser);
          } else throw new Error("Invalid user data");
        } catch (error: any) {
          console.error("Lỗi fetch user info (UserHome):", error.message);
          if (isMounted) setUser(null);
          userIdForFetches = null;
        } finally {
          if (isMounted) setIsLoadingUser(false);
        }
      } else {
        if (isMounted) {
          setUser(null);
          setIsLoadingUser(false);
          setIsLoadingRegisteredIds(false);
          setIsLoadingCreatedEventIds(false);
        }
      }
      await Promise.all([eventsPromise, newsPromise]);
      if (userIdForFetches && isMounted) {
        const tokenForSubFetches = localStorage.getItem("authToken");
        await Promise.all([
          fetchRegisteredEventIds(userIdForFetches, tokenForSubFetches),
          fetchUserCreatedEvents(userIdForFetches, tokenForSubFetches),
        ]);
      } else if (isMounted) {
        setIsLoadingRegisteredIds(false);
        setIsLoadingCreatedEventIds(false);
      }
    };
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [
    isInitialized,
    fetchAllEvents,
    fetchRegisteredEventIds,
    fetchUserCreatedEvents,
    fetchNews,
    refreshToken,
  ]);
  const executeRegistration = async (event: EventDisplayInfo) => {
    if (!user?.id || isRegistering) return;
    setIsRegistering(event.id);
    let token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsRegistering(null);
      router.push("/login");
      return;
    }
    try {
      const url = `http://localhost:8080/identity/api/events/${event.id}/attendees?userId=${user.id}`;
      let res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        const nt = await refreshToken();
        if (nt) {
          token = nt;
          res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        } else throw new Error("Không thể làm mới phiên đăng nhập.");
      }
      if (!res.ok) {
        let m = "Đăng ký thất bại";
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        if (res.status === 403) m = "Không có quyền.";
        else if (res.status === 400) m = "Yêu cầu không hợp lệ.";
        else if (res.status === 409) m = "Bạn đã đăng ký sự kiện này rồi.";
        else if (res.status === 401)
          m = "Phiên đăng nhập hết hạn hoặc không hợp lệ.";
        throw new Error(m);
      }
      const data = await res.json();
      if (data.code === 1000) {
        toast.success(`Đã đăng ký "${event.title}"!`);
        setRegisteredEventIds((prev) => new Set(prev).add(event.id));
      } else throw new Error(data.message || "Lỗi đăng ký không xác định.");
    } catch (err: any) {
      console.error("Lỗi đăng ký:", err);
      toast.error(`${err.message || "Đăng ký thất bại."}`);
    } finally {
      setIsRegistering(null);
    }
  };
  const handleRegister = (event: EventDisplayInfo) => {
    if (!user?.id) {
      toast.error("Đăng nhập để đăng ký.");
      router.push("/login");
      return;
    }
    if (
      registeredEventIds.has(event.id) ||
      isRegistering ||
      createdEventIds.has(event.id)
    ) {
      if (registeredEventIds.has(event.id))
        toast.error("Bạn đã đăng ký sự kiện này.");
      if (createdEventIds.has(event.id))
        toast.error("Bạn là người tạo sự kiện này.");
      return;
    }
    const isEventUpcoming =
      new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0));
    if (!isEventUpcoming) {
      toast.error("Sự kiện này đã diễn ra.");
      return;
    }
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận đăng ký",
      message: (
        <>
          Đăng ký sự kiện <br />{" "}
          <strong className="text-indigo-600">"{event.title}"</strong>?
        </>
      ),
      onConfirm: () => {
        setConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        executeRegistration(event);
      },
      onCancel: () =>
        setConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        }),
      confirmVariant: "primary",
      confirmText: "Đăng ký",
      cancelText: "Hủy",
    });
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
  const handleEventClick = (event: EventDisplayInfo) => {
    setSelectedEvent(event);
  };
  const handleBackToList = () => {
    setSelectedEvent(null);
  };
  const handleLogout = async () => {
    try {
      const t = localStorage.getItem("authToken");
      if (t)
        await fetch("http://localhost:8080/identity/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: t }),
        });
    } catch (e) {
      console.error("Lỗi gọi API logout:", e);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authenticated");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      setUser(null);
      setRegisteredEventIds(new Set());
      setCreatedEventIds(new Set());
      setActiveTab("home");
      router.push("/login");
    }
  };
  const refreshNewsList = useCallback(() => {
    fetchNews();
  }, [fetchNews]);

  const isPageLoading = !isInitialized || isLoadingUser;
  const getTabButtonClasses = (tabName: ActiveTab): string => {
    const baseClasses =
      "cursor-pointer px-4 py-2 text-xs sm:text-sm font-semibold rounded-full shadow-sm transition";
    const activeClasses = "text-white";
    const inactiveClasses = "hover:bg-opacity-80";
    let specificBg = "";
    let specificText = "";
    let specificHoverBg = "";
    switch (tabName) {
      case "home":
        specificBg = activeTab === tabName ? "bg-indigo-600" : "bg-indigo-100";
        specificText = activeTab === tabName ? "" : "text-indigo-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-indigo-700" : "hover:bg-indigo-200";
        break;
      case "news":
        specificBg = activeTab === tabName ? "bg-orange-600" : "bg-orange-100";
        specificText = activeTab === tabName ? "" : "text-orange-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-orange-700" : "hover:bg-orange-200";
        break;
      case "myNews":
        specificBg = activeTab === tabName ? "bg-amber-600" : "bg-amber-100";
        specificText = activeTab === tabName ? "" : "text-amber-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-amber-700" : "hover:bg-amber-200";
        break;
      case "createEvent":
        specificBg = activeTab === tabName ? "bg-cyan-600" : "bg-cyan-100";
        specificText = activeTab === tabName ? "" : "text-cyan-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-cyan-700" : "hover:bg-cyan-200";
        break;
      case "myEvents":
        specificBg = activeTab === tabName ? "bg-blue-600" : "bg-blue-100";
        specificText = activeTab === tabName ? "" : "text-blue-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-blue-700" : "hover:bg-blue-200";
        break;
      case "attendees":
        specificBg = activeTab === tabName ? "bg-teal-600" : "bg-teal-100";
        specificText = activeTab === tabName ? "" : "text-teal-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-teal-700" : "hover:bg-teal-200";
        break;
      case "registeredEvents":
        specificBg = activeTab === tabName ? "bg-green-600" : "bg-green-100";
        specificText = activeTab === tabName ? "" : "text-green-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-green-700" : "hover:bg-green-200";
        break;
      case "members":
        specificBg = activeTab === tabName ? "bg-pink-600" : "bg-pink-100";
        specificText = activeTab === tabName ? "" : "text-pink-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-pink-700" : "hover:bg-pink-200";
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
        return "border-t-orange-600";
      case "myNews":
        return "border-t-amber-600";
      case "createEvent":
        return "border-t-cyan-600";
      case "myEvents":
        return "border-t-blue-600";
      case "attendees":
        return "border-t-teal-600";
      case "registeredEvents":
        return "border-t-green-600";
      case "members":
        return "border-t-pink-600";
      case "chatList":
        return "border-t-purple-600";
      default:
        return "border-t-gray-400";
    }
  };
  const tabs = [
    { id: "home", label: "🎉 Trang chủ", requiresAuth: false },
    // { id: "news", label: "📰 Tin tức", requiresAuth: false },

    { id: "createEvent", label: "➕ Tạo sự kiện", requiresAuth: true },
    { id: "myNews", label: "📝 Quản lý Tin tức", requiresAuth: true },
    { id: "myEvents", label: "🛠 Sự kiện & Đăng ký", requiresAuth: true },
    { id: "attendees", label: "✅ Người tham gia", requiresAuth: true },
    { id: "members", label: "👥 Thành viên CLB", requiresAuth: true },
    { id: "chatList", label: "💬 Danh sách chat", requiresAuth: true },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <Toaster toastOptions={{ duration: 3000 }} position="top-center" />
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6">
        {" "}
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {" "}
          <div className="text-lg sm:text-xl font-bold">
            Quản lý sự kiện
          </div>{" "}
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            {" "}
            <Link href="/about">
              <span className="cursor-pointer hover:text-gray-300">
                Giới thiệu
              </span>
            </Link>{" "}
            <span
              className="cursor-pointer hover:text-gray-300"
              onClick={() => setShowContactModal(true)}
            >
              Liên hệ
            </span>{" "}
            {isInitialized && !isLoadingUser && (
              <UserMenu user={user} onLogout={handleLogout} />
            )}{" "}
            {(!isInitialized || isLoadingUser) && (
              <span className="text-gray-400">Đang tải...</span>
            )}{" "}
            {isInitialized && !isLoadingUser && !user && (
              <Link href="/login">
                <span className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded cursor-pointer">
                  Đăng nhập
                </span>
              </Link>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </nav>
      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 border border-gray-200">
        {" "}
        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-5 justify-center pb-3">
          {" "}
          {tabs.map((tab) => {
            const showTab =
              !tab.requiresAuth || (tab.requiresAuth && isInitialized && user);
            if (!showTab) return null;
            return (
              <div key={tab.id} className="relative flex flex-col items-center">
                {" "}
                <button
                  onClick={() => setActiveTab(tab.id as ActiveTab)}
                  className={getTabButtonClasses(tab.id as ActiveTab)}
                >
                  {tab.label}
                </button>{" "}
                {activeTab === tab.id && (
                  <div
                    className={`absolute top-full mt-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] ${getActiveIndicatorColor(
                      tab.id as ActiveTab
                    )} border-r-[6px] border-r-transparent`}
                    style={{ left: "50%", transform: "translateX(-50%)" }}
                  ></div>
                )}{" "}
              </div>
            );
          })}{" "}
          {isInitialized && !user && !isLoadingUser && (
            <span className="text-sm text-gray-500 italic p-2 self-center">
              Đăng nhập để xem các mục khác
            </span>
          )}{" "}
        </div>{" "}
      </div>
      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 min-h-[400px]">
        {isPageLoading ? (
          <p className="text-center text-gray-500 italic py-6">
            Đang tải dữ liệu...
          </p>
        ) : (
          <>
            {activeTab === "home" && (
              <HomeTabContent
                allEvents={allEvents}
                isLoadingEvents={isLoadingEvents}
                errorEvents={errorEvents}
                registeredEventIds={registeredEventIds}
                createdEventIds={createdEventIds}
                user={user}
                isLoadingRegisteredIds={isLoadingRegisteredIds}
                isLoadingCreatedEventIds={isLoadingCreatedEventIds}
                isRegistering={isRegistering}
                onRegister={handleRegister}
                onEventClick={handleEventClick}
                selectedEvent={selectedEvent}
                onBackToList={handleBackToList}
                search={search}
                setSearch={setSearch}
                sortOption={sortOption}
                setSortOption={setSortOption}
                timeFilterOption={timeFilterOption}
                setTimeFilterOption={setTimeFilterOption}
                newsItems={newsItems}
                isLoadingNews={isLoadingNews}
                errorNews={errorNews}
                refreshNewsList={refreshNewsList}
                refreshToken={refreshToken}
              />
            )}
            {activeTab === "news" && (
              <NewsTabContent
                newsItems={newsItems}
                isLoading={isLoadingNews}
                error={errorNews}
                onRefresh={refreshNewsList}
              />
            )}
            {user && activeTab === "myNews" && <MyNewsTabContent user={user} />}
            {user && activeTab === "createEvent" && (
              <CreateEventTabContent
                user={user}
                onEventCreated={() => {
                  fetchAllEvents();
                  const t = localStorage.getItem("authToken");
                  if (user?.id && t) fetchUserCreatedEvents(user.id, t);
                  setActiveTab("myEvents");
                  toast.success("Sự kiện đã được tạo và đang chờ duyệt!");
                }}
              />
            )}
            {user && activeTab === "myEvents" && (
              <MyEventsTabContent
                user={user}
                initialRegisteredEventIds={registeredEventIds}
                isLoadingRegisteredIds={isLoadingRegisteredIds}
                onRegistrationChange={handleRegistrationChange}
              />
            )}
            {user && activeTab === "attendees" && (
              <AttendeesTabContent user={user} />
            )}
            {user && activeTab === "members" && (
              <MembersTabContent
                user={user}
                userRole={user.roles?.[0]?.name?.toUpperCase() || "UNKNOWN"}
                currentUserEmail={user.email || null}
              />
            )}
            {user && activeTab === "chatList" && (
              <ChatTabContent currentUser={user} />
            )}
            {activeTab !== "home" &&
              activeTab !== "news" &&
              !user &&
              isInitialized && (
                <p className="text-center text-red-500 py-6">
                  Vui lòng đăng nhập để truy cập mục này.
                </p>
              )}
          </>
        )}
      </div>
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
      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}
    </div>
  );
}
