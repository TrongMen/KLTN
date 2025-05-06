"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef, // Added
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./menu";
import ContactModal from "./contact";
import AdminHomeTabContent from "./tabs/AdminHomeTabContent";
import ApprovalTabContent from "./tabs/ApprovalTabContent";
import AttendeesTabContent from "./tabs/AttendeesTabContent";
import MembersTabContent from "./tabs/MembersTabContent";
import RolesTabContent from "./tabs/RolesTabContent";
import ChatTabContent from "./tabs/ChatTabContent";
import NewsFeedSection from "./tabs/NewsFeedSection"; // Added
import CreateNewsModal, { NewsFormData } from "./tabs/CreateNewsModal"; // Added
import NotificationDropdown, { NotificationItem } from "./NotificationDropdown"; // Added
import { BellIcon } from "@radix-ui/react-icons"; // Added
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";

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
  name?: string; // Added for consistency if needed
  date: string;
  location: string;
  description: string;
  content?: string; // Added for consistency if needed
  speaker?: string;
  image?: string;
  avatarUrl?: string | null; // Added for consistency if needed
  time?: string;
  status?: string;
  purpose?: string;
  createdBy?: string; // Added for consistency if needed
  organizers?: { userId: string; roleName?: string; positionName?: string }[]; // Added
  participants?: { userId: string; roleName?: string; positionName?: string }[]; // Added
  attendees?: { // Added
    userId: string;
    fullName?: string;
    studentCode?: string;
    checkedInAt?: string | null;
    attending?: boolean;
  }[];
}

// Added NewsItem interface (copied from UserHome)
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

// --- Confirmation Dialog Component ---
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

// --- Date Range Helpers (Unchanged) ---
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

// --- Active Tab Type ---
type ActiveTab =
  | "home"
  | "news" // Added
  | "approval"
  | "attendees"
  | "members"
  | "roles"
  | "chatList";

// --- Main Component ---
export default function HomeAdmin() {
  // --- State Variables ---
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

  // Added News State
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [errorNews, setErrorNews] = useState<string | null>(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);

  // Added Notification State
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

  // --- Hooks ---
  const router = useRouter();
  const { authToken, refreshToken, isInitialized } = useRefreshToken(); // authToken is not directly used, relies on localStorage + refresh

  // --- Fetch Functions ---

  // Fetch News (Copied and adapted from UserHome)
  const fetchNews = useCallback(async () => {
    setIsLoadingNews(true);
    setErrorNews(null);
    let currentToken = localStorage.getItem("authToken");
    try {
      let headers: HeadersInit = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
      // Admin likely sees APPROVED news on the general feed too
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
      // Avoid logging out just for news fetch failure
      // if (e.message?.includes("Unauthorized")) router.push('/login?sessionExpired=true');
    } finally {
      setIsLoadingNews(false);
    }
  }, [refreshToken]); // Removed router dependency here

  const fetchAdminHomeEvents = useCallback(
    async (token: string | null) => {
      setIsLoadingEvents(true);
      setErrorEvents(null);
      if (!token) {
        setErrorEvents("Yêu cầu xác thực.");
        setIsLoadingEvents(false);
        setAllEvents([]);
        // No automatic redirect here, handled by main useEffect
        return;
      }
      let currentToken = token;
      try {
        const headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
        // Fetch APPROVED events for the main admin home view
        const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
        let res = await fetch(url, { headers, cache: "no-store" });

        if ((res.status === 401 || res.status === 403) && refreshToken) {
          const newToken = await refreshToken();
          if (newToken) {
            currentToken = newToken; // Update token for potential future use in this scope
            localStorage.setItem("authToken", newToken); // Ensure storage is updated
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
            .filter((e: any) => !e.deleted) // Ensure deleted events aren't shown
            .map((apiEvent: any) => ({
              id: apiEvent.id,
              title: apiEvent.name || "Chưa có tiêu đề",
              name: apiEvent.name,
              date: apiEvent.time || apiEvent.createdAt || "",
              location: apiEvent.location || "Chưa xác định",
              description: apiEvent.content || apiEvent.purpose || "Không có mô tả",
              content: apiEvent.content,
              speaker: apiEvent.speaker, // Assuming API provides speaker
              image: apiEvent.avatarUrl, // Map avatarUrl to image if used like that
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
        // Let the main useEffect handle logout on critical auth errors
        if (err.message?.includes("Unauthorized") || err.message?.includes("Không thể làm mới")) {
           // The hook or main effect will handle redirection
        }
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [refreshToken] // Removed router dependency
  );

  // Fetch Notifications (Copied and adapted from UserHome)
  const fetchNotifications = useCallback(
    async (userId: string, token: string | null) => {
      if (!userId || !token) {
        setNotifications([]);
        return;
      }
      setIsLoadingNotifications(true);
      setErrorNotifications(null);
      const limit = 10; // Or another appropriate limit for admins
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
        // Avoid logging out just for notification fetch failure
        // if (error.message?.includes("Unauthorized")) router.push('/login?sessionExpired=true');
      } finally {
        setIsLoadingNotifications(false);
      }
    },
    [refreshToken] // Removed router dependency
  );

  // --- Effects ---

  // Main data loading effect
  useEffect(() => {
    if (!isInitialized) {
      return; // Wait for refresh token hook initialization
    }

    let isMounted = true;
    setIsLoadingUser(true);
    // Reset loading states for fetches inside
    setIsLoadingEvents(true);
    setIsLoadingNews(true);
    setIsLoadingNotifications(false); // Only set true inside fetchNotifications

    const loadAdminData = async () => {
      let currentAuthToken = localStorage.getItem("authToken"); // Get token potentially updated by refresh hook
      let userIdForFetches: string | null = null;
      let tokenForSubFetches: string | null = currentAuthToken;

      if (currentAuthToken) {
        try {
          const headers: HeadersInit = {
            Authorization: `Bearer ${currentAuthToken}`,
          };
          const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
          let userRes = await fetch(userInfoUrl, { headers, cache: 'no-store' });

          if ((userRes.status === 401 || userRes.status === 403) && refreshToken) {
            console.log("Admin token expired/invalid, attempting refresh for user info...");
            const newToken = await refreshToken(); // Let the hook handle storage update
            if (newToken && isMounted) {
              tokenForSubFetches = newToken; // Use the new token for subsequent fetches
              console.log("Retrying admin user info fetch with new token...");
              userRes = await fetch(userInfoUrl, {
                headers: { Authorization: `Bearer ${newToken}` },
                 cache: 'no-store'
              });
            } else if (isMounted) {
              // Refresh failed or component unmounted
               throw new Error("Unauthorized or Refresh Failed during admin user fetch");
            }
          }

          if (!userRes.ok && isMounted) {
             // Handle non-401/403 errors after potential refresh attempt
             const errorText = await userRes.text();
             throw new Error(`Admin user info failed: ${userRes.status} - ${errorText}`);
          }

          if(isMounted) {
            const userData = await userRes.json();
            if (userData.code === 1000 && userData.result?.id) {
              const fetchedUser: User = userData.result;
              if (!fetchedUser.roles?.some((r) => r.name === "ADMIN")) {
                toast.error("Truy cập bị từ chối. Bạn không phải Admin.");
                handleLogout(); // Logout if not admin
                return; // Stop further execution in this effect
              } else {
                setUser(fetchedUser);
                userIdForFetches = fetchedUser.id; // Set user ID for subsequent fetches
                // Token already set in tokenForSubFetches
              }
            } else {
              // API returned success code but data structure is wrong
              throw new Error("Invalid user data structure received");
            }
          }

        } catch (error: any) {
          console.error("Lỗi fetch user info (Admin):", error.message);
          if (isMounted) setUser(null);
           userIdForFetches = null;
           tokenForSubFetches = null;
          // Logout only on critical errors like auth failure, not invalid data structure if already logged out
          if (error.message?.includes("Unauthorized") || error.message?.includes("Refresh Failed") || error.message?.includes("Admin user info failed")) {
              handleLogout(); // Force logout/redirect on auth failure
          }
        } finally {
          if (isMounted) setIsLoadingUser(false);
        }
      } else {
        // No initial token found
        if (isMounted) {
          setIsLoadingUser(false);
          setIsLoadingEvents(false);
          setIsLoadingNews(false);
          setNotifications([]);
        }
        console.log("No auth token found, redirecting to login.");
        router.push("/login"); // Redirect if no token
        return; // Stop further execution
      }

      // --- Fetch other data only if user is successfully identified as Admin ---
      if (userIdForFetches && tokenForSubFetches && isMounted) {
           await Promise.all([
                fetchAdminHomeEvents(tokenForSubFetches),
                fetchNews(), // fetchNews uses localStorage token + refresh logic internally
                fetchNotifications(userIdForFetches, tokenForSubFetches)
           ]);
      } else if (isMounted && !userIdForFetches && !isLoadingUser) {
           // Handle cases where user fetch finished but failed (e.g., not Admin, invalid data)
           // Reset states if not already handled by handleLogout
           setIsLoadingEvents(false);
           setIsLoadingNews(false);
           setNotifications([]);
           setAllEvents([]);
           setNewsItems([]);
           // Logout should have been called already if necessary
      }
    };

    loadAdminData();

    return () => {
      isMounted = false; // Cleanup function to prevent state updates on unmounted component
    };
  }, [isInitialized, refreshToken, router, fetchAdminHomeEvents, fetchNews, fetchNotifications]); // Added fetch functions to dependencies

  // Effect for handling clicks outside notification dropdown (Copied from UserHome)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationContainerRef.current &&
        !notificationContainerRef.current.contains(event.target as Node) &&
        notificationButtonRef.current && // Also check if the click wasn't on the button itself
        !notificationButtonRef.current.contains(event.target as Node)
      ) {
        setShowNotificationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- Event Handlers ---

  const handleLogout = async () => {
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
      // Still proceed with local cleanup
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      // Optionally clear other specific admin-related items if any
      // localStorage.removeItem("authenticated"); // Example if used
      // localStorage.removeItem("role"); // Example if used
      // localStorage.removeItem("user"); // Example if used
      localStorage.clear(); // Or clear all for simplicity
      setUser(null);
      setAllEvents([]);
      setNewsItems([]); // Clear news
      setNotifications([]); // Clear notifications
      setActiveTab("home");
      router.push("/login");
    }
  };

  const handleEventClick = (event: EventDisplayInfo) => setSelectedEvent(event);
  const handleBackToList = () => setSelectedEvent(null);

  // --- Notification Handlers (Copied from UserHome) ---
  const handleNotificationClick = () => {
    setShowNotificationDropdown((prev) => !prev);
    // Optionally fetch notifications again if dropdown is opened?
    // Or rely on periodic fetching / initial load.
  };

  const handleMarkAsRead = async (notificationId: string) => {
    let token = localStorage.getItem("authToken");
    if (!token || !user?.id) {
      toast.error("Vui lòng đăng nhập lại.");
      // Potentially trigger logout if user context is lost unexpectedly
      // handleLogout();
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
      // Update local state optimistically or after confirmation
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      // No success toast needed usually for marking as read
    } catch (error: any) {
      console.error("Lỗi đánh dấu thông báo đã đọc (Admin):", error);
      toast.error(`Lỗi: ${error.message || "Không thể đánh dấu đã đọc."}`);
       if (error.message?.includes("Unauthorized") || error.message?.includes("Không thể làm mới")) {
           router.push("/login?sessionExpired=true");
       }
    }
  };

  // --- News Handlers (Copied and adapted from UserHome) ---
  const refreshNewsList = useCallback(() => {
    // Admins might want to fetch *all* news statuses or just approved
    // Sticking with approved for the main feed for now
    fetchNews();
    // If there's an Approval tab, that might fetch PENDING news separately
  }, [fetchNews]);

  const handleNewsFormSubmit = async (
    formData: NewsFormData,
    newsId?: string // Added for edit mode
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
    // Removed summary - API likely generates it or it's part of content

    let API_URL = "http://localhost:8080/identity/api/news";
    let method = "POST";
    let currentToken = localStorage.getItem("authToken");

    if (newsId) {
        // Editing existing news
        API_URL = `http://localhost:8080/identity/api/news/${newsId}`;
        method = "PUT";
        // Only append image if a *new* one was selected during edit
        if (formData.imageFile) {
           apiFormData.append("coverImage", formData.imageFile);
        }
         // Add other fields that might be editable by admin (status? pinned?)
        // apiFormData.append("status", formData.status); // Example if status is editable
    } else {
        // Creating new news
        apiFormData.append("type", "NEWS"); // Default type
        apiFormData.append("featured", "false"); // Default
        apiFormData.append("pinned", "false"); // Default
        apiFormData.append("createdById", user.id); // Set creator
        if (formData.imageFile) {
            apiFormData.append("coverImage", formData.imageFile);
        }
         // Admin might be able to set status directly? Default to PENDING or APPROVED?
         // Let's assume default backend behavior (likely PENDING unless specified)
         // Or maybe admin creation directly approves? Depends on API design.
         // If admin creation should be auto-approved:
         // apiFormData.append("status", "APPROVED");
    }


    try {
      let headers: HeadersInit = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
      // Don't set Content-Type for FormData, browser does it with boundary

      let response = await fetch(API_URL, {
        method: method,
        headers: headers, // No Content-Type here
        body: apiFormData,
      });

      if (
        (response.status === 401 || response.status === 403) &&
        currentToken &&
        refreshToken
      ) {
        console.log("Token expired/invalid during news submit, attempting refresh...");
        const newToken = await refreshToken();
        if (newToken) {
          currentToken = newToken;
          localStorage.setItem("authToken", newToken);
          headers["Authorization"] = `Bearer ${currentToken}`; // Update header for retry
          console.log("Retrying news API call with new token...");
          response = await fetch(API_URL, {
            method: method,
            headers: headers, // Updated header
            body: apiFormData,
          });
        } else {
          throw new Error("Refresh token failed or missing.");
        }
      }

      const result = await response.json(); // Try to parse JSON regardless of status for error message

      if (response.ok && result.code === 1000) {
        toast.success(
          result.message ||
            (newsId ? "Cập nhật tin tức thành công!" : "Tạo tin tức thành công!")
        );
        refreshNewsList(); // Refresh the news list
        setIsNewsModalOpen(false); // Close modal on success
        setEditingNewsItem(null); // Clear editing state
      } else {
         // Handle API errors (e.g., validation, server errors)
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
    setEditingNewsItem(null); // Ensure not in edit mode
    setIsNewsModalOpen(true);
  };

  const handleOpenEditModal = (newsItem: NewsItem) => {
    setEditingNewsItem(newsItem);
    setIsNewsModalOpen(true);
  };

  const handleCloseModal = () => {
    // Prevent closing if submitting
    if (!isSubmittingNews) {
      setIsNewsModalOpen(false);
      setEditingNewsItem(null); // Clear editing state on close
    }
  };


  // --- Computed Values ---
  const isPageLoading = !isInitialized || isLoadingUser; // Loading if hook not ready OR user fetch in progress

  // Unread notification count (Copied from UserHome)
  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );


  // --- Styling Functions ---
  const getTabButtonClasses = (tabName: ActiveTab): string => {
    const baseClasses =
      "cursor-pointer px-4 py-2 text-xs sm:text-sm font-semibold rounded-full shadow-sm transition";
    const activeClasses = "text-white";
    const inactiveClasses = "hover:bg-opacity-80";
    let specificBg = "";
    let specificText = "";
    let specificHoverBg = "";

    // Define colors for each tab
    switch (tabName) {
      case "home":
        specificBg = activeTab === tabName ? "bg-indigo-600" : "bg-indigo-100";
        specificText = activeTab === tabName ? "" : "text-indigo-800";
        specificHoverBg =
          activeTab === tabName ? "hover:bg-indigo-700" : "hover:bg-indigo-200";
        break;
      case "news": // Added News Tab Style
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
      case "home": return "border-t-indigo-600";
      case "news": return "border-t-green-600"; // Added
      case "approval": return "border-t-yellow-500";
      case "attendees": return "border-t-teal-600";
      case "members": return "border-t-pink-600";
      case "roles": return "border-t-orange-500";
      case "chatList": return "border-t-purple-600";
      default: return "border-t-gray-400";
    }
  };

  // --- Render Logic ---

  // Loading state for initial auth check
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
        <p className="text-red-600 text-xl font-semibold mb-4">Truy cập bị từ chối</p>
        <p className="text-gray-700 mb-6">Bạn không có quyền truy cập trang quản trị hoặc phiên đăng nhập không hợp lệ.</p>
         <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
         >
           Đi đến trang Đăng nhập
         </button>
      </div>
    );
  }

  // --- Main Render for Authenticated Admin ---
  const tabs = [
     { id: "home", label: "🏠 Trang chủ" },
     { id: "news", label: "📰 Bảng tin" }, // Added News Tab
     { id: "approval", label: "📅 Phê duyệt" }, // Clarified label
     { id: "attendees", label: "✅ Điểm danh / Tham gia" },
     { id: "members", label: "👥 Quản lý thành viên" },
     { id: "roles", label: "📌 Quản lý Vai trò/Chức vụ" },
    //  { id: "chatList", label: "💬 Chat" },
   ];


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 relative"> {/* Added relative positioning */}
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6 sticky top-0 z-40"> {/* Added sticky nav */}
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg sm:text-xl font-bold">
            Quản lý Sự kiện & CLB (Admin)
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            <Link href="/about">
              <span className="cursor-pointer hover:text-gray-300 transition-colors">
                Giới thiệu
              </span>
            </Link>
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
        {/* Render Tab Content based on activeTab */}
        {activeTab === "home" && (
          <AdminHomeTabContent
            events={allEvents} // Pass fetched events
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
        {activeTab === "news" && ( // Added News Feed Content
           <NewsFeedSection
                newsItems={newsItems}
                isLoading={isLoadingNews}
                error={errorNews}
                user={user} // Pass admin user object
                onOpenCreateModal={handleOpenCreateModal} // Allow admin to create
                onOpenEditModal={handleOpenEditModal} // Allow admin to edit
                onNewsDeleted={refreshNewsList} // Callback after deletion
                refreshToken={refreshToken} // Pass refreshToken for potential internal use
                // Admins might have different actions (e.g., delete any news)
                // This might require modifications within NewsFeedSection or its children
                // For now, using the same component as UserHome
            />
        )}
        {activeTab === "approval" && <ApprovalTabContent user={user} />}
        {activeTab === "attendees" && <AttendeesTabContent user={user} />}
        {activeTab === "members" && (
          <MembersTabContent
            user={user} // Pass admin user
            userRole={"ADMIN"} // Explicitly set role
            currentUserEmail={user?.email || null}
          />
        )}
        {activeTab === "roles" && <RolesTabContent user={user} />}
        {activeTab === "chatList" && <ChatTabContent currentUser={user} />}
      </div>

       {/* Notification Bell (Copied from UserHome) */}
       {isInitialized && !isLoadingUser && user && ( // Show only when user is loaded and exists
        <div
          className="fixed bottom-6 right-6 z-50 group"
          ref={notificationContainerRef} // Ref for click outside detection
        >
          <button
            ref={notificationButtonRef} // Ref for click outside detection
            onClick={handleNotificationClick}
            className="relative flex items-center justify-center h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition ease-in-out duration-150"
            aria-label="Thông báo"
            aria-haspopup="true" // Indicate it opens a dropdown/menu
            aria-expanded={showNotificationDropdown} // State of the dropdown
          >
            <span className="sr-only">Xem thông báo</span> {/* Accessibility */}
            <BellIcon className="h-6 w-6" aria-hidden="true" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white transform translate-x-1/4 -translate-y-1/4 ring-2 ring-white pointer-events-none">
                 {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotificationDropdown && (
             <div className="absolute bottom-full right-0 mb-2 w-80 sm:w-96"> {/* Position above the button */}
                <NotificationDropdown
                    notifications={notifications}
                    isLoading={isLoadingNotifications}
                    error={errorNotifications}
                    onMarkAsRead={handleMarkAsRead}
                    onClose={() => setShowNotificationDropdown(false)} // Allow closing from within dropdown
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
        
          setConfirmationState(prev => ({...prev, isOpen: false}));
        }}
        onCancel={() =>
           setConfirmationState(prev => ({...prev, isOpen: false }))
        }
      />

 
      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
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