"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef, // Added for notifications
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./menu";
import ContactModal from "./contact";
import HomeTabContent from "./tabs/HomeTabContent";
import RegisteredEventsTabContent from "./tabs/RegisteredEventsTabContent";
import MembersTabContent from "./tabs/MembersTabContent";
import ChatTabContent from "./tabs/ChatTabContent";
import NewsFeedSection from "./tabs/NewsFeedSection";
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";
import NotificationDropdown, { NotificationItem } from "./NotificationDropdown"; // Added
import { BellIcon } from "@radix-ui/react-icons"; // Added

// --- Interfaces ---
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
  dob?: string;
  avatar?: string;
  email?: string;
  gender?: boolean;
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
  time?: string;
  location: string;
  description: string;
  content?: string;
  purpose?: string;
  speaker?: string;
  image?: string;
  avatarUrl?: string | null;
  status?: string;
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

// Added NotificationItem interface (if not imported from NotificationDropdown)
// export interface NotificationItem {
//   id: string;
//   title: string;
//   content: string;
//   type: string; // e.g., 'EVENT_REGISTRATION', 'NEWS_APPROVAL', 'SYSTEM'
//   read: boolean;
//   createdAt: string;
//   relatedId?: string; // e.g., eventId, newsId
//   userId: string;
// }


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
    let base = "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger") {
      base += "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    } else {
      base += "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
    }
    return base;
  }, [confirmVariant]);

  const cancelBtnClasses = "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className={`text-lg font-bold mb-3 ${confirmVariant === "danger" ? "text-red-700" : "text-gray-800"}`}>{title}</h3>
        <div className="text-sm text-gray-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel} className={cancelBtnClasses}>{cancelText}</button>
          <button onClick={onConfirm} className={confirmBtnClasses}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

const getWeekRange = (refDate: Date): { startOfWeek: Date; endOfWeek: Date } => {
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
const getMonthRange = (refDate: Date): { startOfMonth: Date; endOfMonth: Date } => {
    const d = new Date(refDate);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { startOfMonth: start, endOfMonth: end };
};

type ActiveTab = 'home' | 'news' | 'registeredEvents' | 'members' | 'chatList';

export default function HomeGuest() {
  // --- State Variables ---
  const [search, setSearch] = useState("");
  const [allEvents, setAllEvents] = useState<EventDisplayInfo[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [isLoadingRegisteredIds, setIsLoadingRegisteredIds] = useState<boolean>(true);
  const [createdEventIds, setCreatedEventIds] = useState<Set<string>>(new Set());
  const [isLoadingCreatedEventIds, setIsLoadingCreatedEventIds] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<EventDisplayInfo | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState("date");
  const [timeFilterOption, setTimeFilterOption] = useState("upcoming");
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [isRegistering, setIsRegistering] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  // News State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [errorNews, setErrorNews] = useState<string | null>(null);

  // Notification State (Added)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false); // Default false
  const [errorNotifications, setErrorNotifications] = useState<string | null>(null);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState<boolean>(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationContainerRef = useRef<HTMLDivElement>(null);

  // --- Hooks ---
  const router = useRouter();
  const { refreshToken, isInitialized } = useRefreshToken();

  // --- Fetch Functions ---

  // Fetch News
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
        } else { console.warn("Token refresh failed while fetching news (HomeGuest)"); }
      }
      if (!res.ok) {
        const status = res.status;
        let msg = `HTTP ${status} news fetch`;
        try { const err = await res.json(); msg = err.message || msg; } catch (_) {}
        console.error("Failed to fetch news (HomeGuest):", msg);
        setErrorNews(msg); setNewsItems([]); return;
      }
      const d = await res.json();
      if (d.code === 1000 && Array.isArray(d.result)) {
        const fmt: NewsItem[] = d.result.map((item: any) => ({
          id: item.id, title: item.title || "N/A", content: item.content,
          summary: item.summary || item.content?.substring(0, 100) + (item.content?.length > 100 ? "..." : "") || "",
          date: item.createdAt || item.publishedAt || "", imageUrl: item.coverImageUrl, status: item.status,
          createdBy: item.createdBy, publishedAt: item.publishedAt, event: item.event,
          createdAt: item.createdAt, coverImageUrl: item.coverImageUrl, rejectionReason: item.rejectionReason,
        }));
        setNewsItems(fmt);
      } else {
          console.error("Invalid news data format (HomeGuest):", d.message);
          setErrorNews(d.message || "Lỗi định dạng dữ liệu tin tức"); setNewsItems([]);
      }
    } catch (e: any) {
      console.error("Lỗi fetchNews (HomeGuest):", e);
      setErrorNews(e.message || "Lỗi tải tin tức."); setNewsItems([]);
    } finally { setIsLoadingNews(false); }
  }, [refreshToken]);

  // Fetch All Events
  const fetchAllEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setErrorEvents(null);
    let currentToken = localStorage.getItem("authToken");
    try {
      let headers: HeadersInit = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
      let res = await fetch(url, { headers: headers, cache: "no-store" });
      if ( (res.status === 401 || res.status === 403) && currentToken && refreshToken ) {
        const nt = await refreshToken();
        if (nt) {
          currentToken = nt; localStorage.setItem("authToken", nt); headers["Authorization"] = `Bearer ${currentToken}`;
          res = await fetch(url, { headers: headers, cache: "no-store" });
        } else { console.warn("Token refresh failed during event fetch (HomeGuest)"); }
      }
      if (!res.ok) {
         const status = res.status; let msg = `HTTP ${status}`;
         try { const err = await res.json(); msg = err.message || msg; } catch (_) {}
         throw new Error(msg);
      }
      const d = await res.json();
      if (d.code === 1000 && Array.isArray(d.result)) {
        const fmt: EventDisplayInfo[] = d.result.filter((e: any) => !e.deleted).map((e: any) => ({
            id: e.id, title: e.name || "N/A", name: e.name, date: e.time || e.createdAt || "",
            time: e.time, location: e.location || "N/A", description: e.content || e.purpose || "",
            content: e.content, purpose: e.purpose, avatarUrl: e.avatarUrl || null, status: e.status,
            createdBy: e.createdBy, organizers: e.organizers || [], participants: e.participants || [], attendees: e.attendees || [],
          }));
        setAllEvents(fmt);
      } else { throw new Error(d.message || "Lỗi định dạng dữ liệu sự kiện"); }
    } catch (e: any) {
      console.error("Lỗi fetchAllEvents (HomeGuest):", e); setErrorEvents(e.message || "Lỗi tải sự kiện.");
    } finally { setIsLoadingEvents(false); }
  }, [refreshToken]);

  // Fetch Registered Event IDs
  const fetchRegisteredEventIds = useCallback(async (userId: string) => {
    if (!userId) { setIsLoadingRegisteredIds(false); return; }
    setIsLoadingRegisteredIds(true);
    let currentToken = localStorage.getItem("authToken");
    if (!currentToken) { setIsLoadingRegisteredIds(false); setRegisteredEventIds(new Set()); return; }
    try {
      const url = `http://localhost:8080/identity/api/events/attendee/${userId}`;
      let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
      let res = await fetch(url, { headers: headers, cache: "no-store" });
      if ((res.status === 401 || res.status === 403) && refreshToken) {
          const nt = await refreshToken();
          if (nt) { currentToken = nt; localStorage.setItem("authToken", nt); headers['Authorization'] = `Bearer ${currentToken}`;
              res = await fetch(url, { headers: headers, cache: "no-store" });
          } else { throw new Error("Unauthorized or Refresh Failed"); }
      }
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setRegisteredEventIds(new Set(data.result.map((event: any) => event.id)));
      } else { console.warn("API /events/attendee/ structure:", data); setRegisteredEventIds(new Set()); }
    } catch (err: any) {
      console.error("Lỗi tải ID sự kiện đã đăng ký (HomeGuest):", err); setRegisteredEventIds(new Set());
      if (err.message?.includes("Unauthorized") || err.message?.includes("Refresh Failed")) { /* Optional: Handle auth error */ }
    } finally { setIsLoadingRegisteredIds(false); }
  }, [refreshToken]);

  // Fetch User Created Events
  const fetchUserCreatedEvents = useCallback(async (userId: string) => {
      if (!userId) { setIsLoadingCreatedEventIds(false); return; }
      setIsLoadingCreatedEventIds(true);
      let currentToken = localStorage.getItem("authToken");
      if (!currentToken) { setIsLoadingCreatedEventIds(false); setCreatedEventIds(new Set()); return; }
      try {
          const url = `http://localhost:8080/identity/api/events/creator/${userId}`;
          let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
          let res = await fetch(url, { headers: headers, cache: "no-store" });
           if ((res.status === 401 || res.status === 403) && refreshToken) {
               const nt = await refreshToken();
               if (nt) { currentToken = nt; localStorage.setItem("authToken", nt); headers['Authorization'] = `Bearer ${currentToken}`;
                   res = await fetch(url, { headers: headers, cache: "no-store" });
               } else { throw new Error("Unauthorized or Refresh Failed"); }
           }
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const data = await res.json();
          if (data.code === 1000 && Array.isArray(data.result)) {
              setCreatedEventIds(new Set(data.result.map((event: any) => event.id)));
          } else { setCreatedEventIds(new Set()); }
      } catch (err: any) {
          console.error("Lỗi tải ID sự kiện đã tạo (HomeGuest):", err); setCreatedEventIds(new Set());
           if (err.message?.includes("Unauthorized") || err.message?.includes("Refresh Failed")) { /* Optional: Handle auth error */ }
      } finally { setIsLoadingCreatedEventIds(false); }
  }, [refreshToken]);

  // Fetch Notifications (Added - Requires userId and token)
  const fetchNotifications = useCallback(
    async (userId: string, token: string | null) => {
      if (!userId || !token) {
        setNotifications([]); // Clear notifications if no user/token
        return;
      }
      setIsLoadingNotifications(true);
      setErrorNotifications(null);
      const limit = 10; // Limit number of notifications fetched
      let currentToken = token;
      try {
        const url = `http://localhost:8080/identity/api/notifications?userId=${userId}&limit=${limit}`;
        let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
        let res = await fetch(url, { headers, cache: "no-store" });
        if ((res.status === 401 || res.status === 403) && refreshToken) {
          const newToken = await refreshToken();
          if (newToken) {
            currentToken = newToken;
            localStorage.setItem("authToken", newToken);
            headers["Authorization"] = `Bearer ${newToken}`;
            res = await fetch(url, { headers, cache: "no-store" });
          } else {
              throw new Error("Unauthorized or Refresh Failed");
          }
        }
        if (!res.ok) {
          const status = res.status;
          let msg = `HTTP error ${status}`;
          try { const errorData = await res.json(); msg = errorData.message || msg; } catch (_) {}
          throw new Error(msg);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const formattedNotifications: NotificationItem[] = data.result.map(
            (item: any) => ({
              id: item.id, title: item.title, content: item.content, type: item.type,
              read: item.read, createdAt: item.createdAt, relatedId: item.relatedId, userId: item.userId,
            })
          );
          setNotifications(formattedNotifications);
        } else {
            throw new Error(data.message || "Lỗi định dạng dữ liệu thông báo");
        }
      } catch (error: any) {
        console.error("Lỗi fetchNotifications (HomeGuest):", error);
        setErrorNotifications(error.message || "Lỗi tải thông báo.");
        setNotifications([]); // Clear notifications on error
         if (error.message?.includes("Unauthorized") || error.message?.includes("Refresh Failed")) {
            // Might redirect or just clear user state if critical auth error
             router.push("/login?sessionExpired=true");
         }
      } finally {
        setIsLoadingNotifications(false);
      }
    },
    [refreshToken, router] // Added router dependency for redirect
  );

  // --- Effects ---

  // Main data loading effect
  useEffect(() => {
    if (!isInitialized) return;
    let isMounted = true;
    setIsLoadingUser(true); setIsLoadingEvents(true); setIsLoadingRegisteredIds(true);
    setIsLoadingCreatedEventIds(true); setIsLoadingNews(true);
    // Notifications loading state handled within its fetch function

    const currentAuthToken = localStorage.getItem("authToken");
    let userIdForFetches: string | null = null;
    let tokenForSubFetches: string | null = currentAuthToken;

    const loadInitialData = async () => {
      const eventsPromise = fetchAllEvents();
      const newsPromise = fetchNews();
      let notificationsPromise: Promise<void> = Promise.resolve(); // Placeholder

      if (currentAuthToken) {
        try {
          const headers: HeadersInit = { Authorization: `Bearer ${currentAuthToken}` };
          const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
          let userRes = await fetch(userInfoUrl, { headers, cache: 'no-store' });
          if (userRes.status === 401 || userRes.status === 403) {
            const nt = await refreshToken();
            if (nt && isMounted) {
               tokenForSubFetches = nt;
               userRes = await fetch(userInfoUrl, { headers: { Authorization: `Bearer ${nt}` }, cache: 'no-store' });
            } else if (isMounted) {
               console.warn("Refresh failed, clearing token."); localStorage.removeItem("authToken");
               if(isMounted) setUser(null); tokenForSubFetches = null;
            }
          }
          if (userRes.ok && isMounted) {
             const userData = await userRes.json();
             if (userData.code === 1000 && userData.result?.id) {
               const fetchedUser: User = userData.result;
               userIdForFetches = fetchedUser.id; setUser(fetchedUser);
               // Initiate notification fetch *only if user is found*
               if (tokenForSubFetches) {
                    notificationsPromise = fetchNotifications(userIdForFetches, tokenForSubFetches);
               }
             } else {
                 console.warn("Invalid user data structure, clearing token."); localStorage.removeItem("authToken");
                 setUser(null); userIdForFetches = null; tokenForSubFetches = null;
                 setNotifications([]); // Clear notifications if user data invalid
             }
          } else if (isMounted && userRes.status !== 401 && userRes.status !== 403) {
               console.error(`User info fetch failed with status ${userRes.status}`); setUser(null);
               userIdForFetches = null; tokenForSubFetches = null;
               setNotifications([]); // Clear notifications on other errors
          } else if (isMounted && !tokenForSubFetches) {
               // Case where refresh failed and token was cleared
                setNotifications([]);
          }
        } catch (error: any) {
          console.error("Lỗi fetch user info (HomeGuest):", error.message);
          localStorage.removeItem("authToken");
          if (isMounted) setUser(null); userIdForFetches = null; tokenForSubFetches = null;
          setNotifications([]); // Clear notifications on error
        } finally {
          if (isMounted) setIsLoadingUser(false);
        }
      } else {
        // No initial token
        if (isMounted) {
          setUser(null); setIsLoadingUser(false); setIsLoadingRegisteredIds(false);
          setIsLoadingCreatedEventIds(false); setNotifications([]); // Clear notifications for guests
        }
      }

      // Wait for public fetches and potentially notifications
      await Promise.all([eventsPromise, newsPromise, notificationsPromise]);

      // Fetch user-specific event lists *after* ensuring user ID is valid
      if (userIdForFetches && isMounted) { // No need to check tokenForSubFetches here as inner functions handle it
        await Promise.all([
          fetchRegisteredEventIds(userIdForFetches),
          fetchUserCreatedEvents(userIdForFetches)
        ]);
      } else if (isMounted) {
        setIsLoadingRegisteredIds(false); setIsLoadingCreatedEventIds(false);
      }
    };

    loadInitialData();
    return () => { isMounted = false; };
  }, [isInitialized, fetchAllEvents, fetchRegisteredEventIds, fetchUserCreatedEvents, fetchNews, fetchNotifications, refreshToken]);

  // Effect for handling clicks outside notification dropdown (Added)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationContainerRef.current &&
        !notificationContainerRef.current.contains(event.target as Node) &&
        notificationButtonRef.current && // Also check button itself
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setShowNotificationDropdown(false);
      }
    };
    // Only add listener if the dropdown might be visible (i.e., if user could be logged in)
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Runs once

  // --- Event Handlers ---

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        await fetch("http://localhost:8080/identity/auth/logout", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token }),
        });
      }
    } catch (error) { console.error("Lỗi logout:", error); }
    finally {
      localStorage.clear(); setUser(null); setRegisteredEventIds(new Set());
      setCreatedEventIds(new Set()); setNewsItems([]);
      setNotifications([]); // Clear notifications on logout
      setShowNotificationDropdown(false); // Hide dropdown on logout
      setActiveTab("home"); window.location.reload();
    }
  };

  const executeRegistration = async (event: EventDisplayInfo) => {
     if (!user || !user.id || isRegistering) return;
     setIsRegistering(event.id); let token = localStorage.getItem("authToken");
     if (!token) { toast.error("Vui lòng đăng nhập lại."); setIsRegistering(null); router.push('/login'); return; }
     let currentToken = token;
     try {
         const url = `http://localhost:8080/identity/api/events/${event.id}/attendees?userId=${user.id}`;
         let res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${currentToken}` } });
          if ((res.status === 401 || res.status === 403) && refreshToken) {
               const nt = await refreshToken();
               if (nt) { currentToken = nt; localStorage.setItem("authToken", nt);
                   res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${currentToken}` } });
               } else { throw new Error("Không thể làm mới phiên đăng nhập."); }
           }
         if (!res.ok) {
             let m = "Đăng ký thất bại"; try { const d = await res.json(); m = d.message || m; } catch (_) {}
             if (res.status === 403) m = "Bạn không có quyền đăng ký.";
             else if (res.status === 409) m = "Bạn đã đăng ký sự kiện này rồi.";
             else if (res.status === 401) m = "Phiên đăng nhập hết hạn hoặc không hợp lệ.";
             throw new Error(m);
         }
         const data = await res.json();
         if (data.code === 1000) {
             toast.success(`Đã đăng ký "${event.title}"!`); setRegisteredEventIds((prev) => new Set(prev).add(event.id));
         } else { throw new Error(data.message || "Lỗi đăng ký từ server."); }
     } catch (err: any) {
         console.error("Lỗi đăng ký:", err); toast.error(`${err.message || "Đăng ký thất bại."}`);
          if (err.message?.includes("Unauthorized") || err.message?.includes("Không thể làm mới")) { router.push("/login?sessionExpired=true"); }
     } finally { setIsRegistering(null); }
  };

  const handleRegister = (event: EventDisplayInfo) => {
    if (!user || !user.id) {
        toast((t) => (
           <div className="flex flex-col items-center gap-3">
             <span className="text-center">🔒 Vui lòng đăng nhập để đăng ký sự kiện <strong>"{event.title}"</strong>.</span>
             <div className="flex gap-2 w-full"> <button onClick={() => { toast.dismiss(t.id); router.push('/login'); }} className="flex-1 px-3 py-1.5 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700" > Đăng nhập </button> <button onClick={() => toast.dismiss(t.id)} className="flex-1 px-3 py-1.5 rounded bg-gray-200 text-gray-700 text-sm hover:bg-gray-300" > Để sau </button> </div>
           </div>
         ), { duration: 8000 }); return;
    }
    if (registeredEventIds.has(event.id) || isRegistering || createdEventIds.has(event.id)) {
         if(registeredEventIds.has(event.id)) toast.error("Bạn đã đăng ký sự kiện này.");
         if(createdEventIds.has(event.id)) toast.error("Bạn là người tạo sự kiện này."); return;
    }
    const isEventUpcomingOrOngoing = new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0));
    if (!isEventUpcomingOrOngoing) { toast.error("Sự kiện này đã diễn ra."); return; }
    setConfirmationState({
      isOpen: true, title: "Xác nhận đăng ký",
      message: (<>Đăng ký sự kiện <br /> <strong className="text-indigo-600">"{event.title}"</strong>?</>),
      onConfirm: () => { executeRegistration(event); }, // ConfirmationDialog closes itself now
      onCancel: () => setConfirmationState(prev => ({...prev, isOpen: false })),
      confirmVariant: "primary", confirmText: "Đăng ký", cancelText: "Hủy",
    });
  };

  const handleRegistrationChange = useCallback((eventId: string, registered: boolean) => {
      setRegisteredEventIds((prevIds) => { const newIds = new Set(prevIds); if (registered) newIds.add(eventId); else newIds.delete(eventId); return newIds; });
  }, []);

  const handleEventClick = (event: EventDisplayInfo) => setSelectedEvent(event);
  const handleBackToList = () => setSelectedEvent(null);
  const refreshNewsList = useCallback(() => { fetchNews(); }, [fetchNews]);

  // Notification Handlers (Added)
  const handleNotificationClick = () => {
    setShowNotificationDropdown((prev) => !prev);
    // Optionally refetch notifications when opened?
    // if (!showNotificationDropdown && user?.id) {
    //     const token = localStorage.getItem("authToken");
    //     fetchNotifications(user.id, token);
    // }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    let token = localStorage.getItem("authToken");
    if (!token || !user?.id) { toast.error("Vui lòng đăng nhập lại."); return; }
    let currentToken = token;
    try {
      const url = `http://localhost:8080/identity/api/notifications/${notificationId}/read`;
      let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
      let res = await fetch(url, { method: "PUT", headers: headers });
      if ((res.status === 401 || res.status === 403) && refreshToken) {
        const newToken = await refreshToken();
        if (newToken) {
          currentToken = newToken; localStorage.setItem("authToken", newToken); headers["Authorization"] = `Bearer ${newToken}`;
          res = await fetch(url, { method: "PUT", headers: headers });
        } else { throw new Error("Không thể làm mới phiên đăng nhập."); }
      }
      if (!res.ok) {
        let errorMsg = `Lỗi ${res.status}`; try { const errorData = await res.json(); errorMsg = errorData.message || errorMsg; } catch (_) {}
        throw new Error(errorMsg);
      }
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)) );
    } catch (error: any) {
      console.error("Lỗi đánh dấu thông báo đã đọc:", error); toast.error(`Lỗi: ${error.message || "Không thể đánh dấu đã đọc."}`);
       if (error.message?.includes("Unauthorized") || error.message?.includes("Không thể làm mới")) { router.push("/login?sessionExpired=true"); }
    }
  };

  // --- Computed Values ---
  const isPageLoading = isLoadingUser || isLoadingEvents || isLoadingRegisteredIds || isLoadingCreatedEventIds;
  const unreadNotificationCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications] );

  // --- Styling Functions ---
  const getTabButtonClasses = (tabName: ActiveTab): string => {
      const baseClasses = "cursor-pointer px-4 py-2 text-xs sm:text-sm font-semibold rounded-full shadow-sm transition";
      const activeClasses = "text-white"; const inactiveClasses = "hover:bg-opacity-80";
      let specificBg = ""; let specificText = ""; let specificHoverBg = "";
      switch (tabName) {
          case 'home': specificBg = activeTab === tabName ? 'bg-indigo-600' : 'bg-indigo-100'; specificText = activeTab === tabName ? '' : 'text-indigo-800'; specificHoverBg = activeTab === tabName ? 'hover:bg-indigo-700' : 'hover:bg-indigo-200'; break;
          case 'news': specificBg = activeTab === tabName ? 'bg-green-600' : 'bg-green-100'; specificText = activeTab === tabName ? '' : 'text-green-800'; specificHoverBg = activeTab === tabName ? 'hover:bg-green-700' : 'hover:bg-green-200'; break;
          case 'registeredEvents': specificBg = activeTab === tabName ? 'bg-blue-600' : 'bg-blue-100'; specificText = activeTab === tabName ? '' : 'text-blue-800'; specificHoverBg = activeTab === tabName ? 'hover:bg-blue-700' : 'hover:bg-blue-200'; break;
          case 'members': specificBg = activeTab === tabName ? 'bg-pink-600' : 'bg-pink-100'; specificText = activeTab === tabName ? '' : 'text-pink-800'; specificHoverBg = activeTab === tabName ? 'hover:bg-pink-700' : 'hover:bg-pink-200'; break;
          case 'chatList': specificBg = activeTab === tabName ? 'bg-purple-600' : 'bg-purple-100'; specificText = activeTab === tabName ? '' : 'text-purple-800'; specificHoverBg = activeTab === tabName ? 'hover:bg-purple-700' : 'hover:bg-purple-200'; break;
          default: specificBg = 'bg-gray-100'; specificText = 'text-gray-800'; specificHoverBg = 'hover:bg-gray-200';
      }
      return `${baseClasses} ${specificBg} ${activeTab === tabName ? activeClasses : specificText} ${activeTab !== tabName ? inactiveClasses : ''} ${specificHoverBg}`;
  };
  const getActiveIndicatorColor = (tabName: ActiveTab): string => {
      switch (tabName) {
          case 'home': return 'border-t-indigo-600'; case 'news': return 'border-t-green-600';
          case 'registeredEvents': return 'border-t-blue-600'; case 'members': return 'border-t-pink-600';
          case 'chatList': return 'border-t-purple-600'; default: return 'border-t-gray-400';
      }
  };

  const tabs = [
      { id: 'home', label: '🎉 Trang chủ', requiresAuth: false }, { id: 'news', label: '📰 Bảng tin CLB', requiresAuth: false },
      { id: 'registeredEvents', label: '📋 Sự kiện tham gia', requiresAuth: true }, { id: 'members', label: '👥 Thành viên CLB', requiresAuth: true },
      { id: 'chatList', label: '💬 Danh sách chat', requiresAuth: true },
  ];

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 relative"> {/* Added relative */}
      <Toaster toastOptions={{ duration: 4000 }} position="top-center"/>
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg sm:text-xl font-bold">Quản lý sự kiện</div>
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
              <Link href="/about"><span className="cursor-pointer hover:text-gray-300 transition-colors">Giới thiệu</span></Link>
              <span className="cursor-pointer hover:text-gray-300 transition-colors" onClick={() => setShowContactModal(true)}>Liên hệ</span>
              {isInitialized && !isLoadingUser && ( user ? <UserMenu user={user} onLogout={handleLogout} /> : <Link href="/login"><span className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded cursor-pointer transition-colors">Đăng nhập</span></Link> )}
              {(!isInitialized || isLoadingUser) && <span className="text-gray-400">Đang tải...</span>}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-5 justify-center pb-3">
             {tabs.map((tab) => {
                 const showTab = !tab.requiresAuth || (tab.requiresAuth && isInitialized && !isLoadingUser && user);
                 if (!showTab) return null;
                 return ( <div key={tab.id} className="relative flex flex-col items-center"> <button onClick={() => { if (tab.requiresAuth && !user) { toast.error("Vui lòng đăng nhập để xem mục này."); router.push('/login'); } else { setActiveTab(tab.id as ActiveTab); } }} className={getTabButtonClasses(tab.id as ActiveTab)} > {tab.label} </button> {activeTab === tab.id && ( <div className={`absolute top-full mt-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] ${getActiveIndicatorColor(tab.id as ActiveTab)} border-r-[6px] border-r-transparent`} style={{ left: '50%', transform: 'translateX(-50%)' }}> </div> )} </div> );
             })}
             {isInitialized && !user && !isLoadingUser && tabs.some(t => t.requiresAuth) && (<span className="text-sm text-gray-500 italic p-2 self-center">(Đăng nhập để xem các mục khác)</span>)}
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 min-h-[400px]">
        {(isPageLoading && activeTab !== 'news' && activeTab !== 'home') ? (
          <p className="text-center text-gray-500 italic py-6">Đang tải dữ liệu...</p>
        ) : (
          <>
            {activeTab === "home" && ( <HomeTabContent allEvents={allEvents} isLoadingEvents={isLoadingEvents} errorEvents={errorEvents} registeredEventIds={registeredEventIds} createdEventIds={createdEventIds} user={user} isLoadingRegisteredIds={isLoadingRegisteredIds} isLoadingCreatedEventIds={isLoadingCreatedEventIds} isRegistering={isRegistering} onRegister={handleRegister} onEventClick={handleEventClick} selectedEvent={selectedEvent} onBackToList={handleBackToList} search={search} setSearch={setSearch} sortOption={sortOption} setSortOption={setSortOption} timeFilterOption={timeFilterOption} setTimeFilterOption={setTimeFilterOption} refreshToken={refreshToken} /> )}
            {activeTab === "news" && ( <NewsFeedSection newsItems={newsItems} isLoading={isLoadingNews} error={errorNews} user={user} onNewsDeleted={refreshNewsList} refreshToken={refreshToken} /> )}
            {activeTab === "registeredEvents" && user && !isLoadingUser && ( <RegisteredEventsTabContent currentUserId={user.id} isLoadingUserId={isLoadingUser} registeredEventIds={registeredEventIds} createdEventIds={createdEventIds} onRegistrationChange={handleRegistrationChange} /> )}
            {activeTab === "members" && user && !isLoadingUser && ( <MembersTabContent user={user} userRole={user.roles?.[0]?.name?.toUpperCase() || 'GUEST'} currentUserEmail={user.email || null} /> )}
            {activeTab === "chatList" && user && !isLoadingUser && ( <ChatTabContent currentUser={user} /> )}
            {tabs.find(t => t.id === activeTab)?.requiresAuth && !user && !isLoadingUser && ( <p className="text-center text-red-500 py-6">Vui lòng đăng nhập để truy cập mục này.</p> )}
          </>
        )}
      </div>

      {/* Notification Bell - Conditionally Rendered */}
      {isInitialized && !isLoadingUser && user && (
        <div className="fixed bottom-6 right-6 z-50 group" ref={notificationContainerRef} >
          <button ref={notificationButtonRef} onClick={handleNotificationClick} className="relative flex items-center justify-center h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition ease-in-out duration-150" aria-label="Thông báo" aria-haspopup="true" aria-expanded={showNotificationDropdown} >
            <span className="sr-only">Xem thông báo</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            {unreadNotificationCount > 0 && ( <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white transform translate-x-1/4 -translate-y-1/4 ring-2 ring-white pointer-events-none"> {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount} </span> )}
          </button>
          {showNotificationDropdown && ( <div className="absolute bottom-full right-0 mb-2 w-80 sm:w-96"> <NotificationDropdown notifications={notifications} isLoading={isLoadingNotifications} error={errorNotifications} onMarkAsRead={handleMarkAsRead} onClose={() => setShowNotificationDropdown(false)} /> </div> )}
        </div>
      )}

      <ConfirmationDialog isOpen={confirmationState.isOpen} title={confirmationState.title} message={confirmationState.message} confirmVariant={confirmationState.confirmVariant} confirmText={confirmationState.confirmText} cancelText={confirmationState.cancelText} onConfirm={() => { if (confirmationState.onConfirm) confirmationState.onConfirm(); setConfirmationState(prev => ({...prev, isOpen: false })); }} onCancel={() => setConfirmationState(prev => ({...prev, isOpen: false }))} />
      {showContactModal && (<ContactModal onClose={() => setShowContactModal(false)} />)}

    </div>
  );
}