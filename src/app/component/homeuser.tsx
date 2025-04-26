"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./menu";
import ContactModal from "./contact";
import HomeTabContent from "./tabs/HomeTabContent";
import MyEventsTabContent from "./tabs/MyEventsTabContent";
import AttendeesTabContent from "./tabs/AttendeesTabContent";
import RegisteredEventsTabContent from "./tabs/RegisteredEventsTabContent";
import MembersTabContent from "./tabs/MembersTabContent";
import ChatTabContent from "./tabs/ChatTabContent";
import CreateEventTabContent from "./tabs/CreateEventTabContent";
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";

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
    if (confirmVariant === "danger") {
      base +=
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    } else {
      base +=
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
    }
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

type ActiveTab =
  | "home"
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const router = useRouter();
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

  const { refreshToken } = useRefreshToken();

  const fetchAllEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setErrorEvents(null);
    try {
      const token = localStorage.getItem("authToken");
      const h: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `http://localhost:8080/identity/api/events/status?status=APPROVED`,
        { headers: h }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.code === 1000 && Array.isArray(d.result)) {
        const fmt: EventDisplayInfo[] = d.result.map((e: any) => ({
          id: e.id,
          title: e.name || "N/A",
          date: e.time || "",
          location: e.location || "N/A",
          description: e.content || e.purpose || "",
          time: e.time,
          status: e.status,
          purpose: e.purpose,
        }));
        setAllEvents(fmt);
      } else {
        throw new Error(d.message || "Lỗi data");
      }
    } catch (e: any) {
      console.error("Lỗi fetchAllEvents:", e);
      setErrorEvents(e.message || "Lỗi tải sự kiện.");
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const fetchRegisteredEventIds = useCallback(async (userId: string) => {
    if (!userId) {
      setIsLoadingRegisteredIds(false);
      return;
    }
    setIsLoadingRegisteredIds(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setIsLoadingRegisteredIds(false);
        return;
      }
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const url = `http://localhost:8080/identity/api/events/attendee/${userId}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const ids = new Set(data.result.map((event: any) => event.id));
        setRegisteredEventIds(ids);
      } else {
        setRegisteredEventIds(new Set());
      }
    } catch (err: any) {
      console.error("Lỗi tải ID sự kiện đã đăng ký:", err);
      setRegisteredEventIds(new Set());
    } finally {
      setIsLoadingRegisteredIds(false);
    }
  }, []);

  const fetchUserCreatedEvents = useCallback(async (userId: string) => {
    if (!userId) {
      setIsLoadingCreatedEventIds(false);
      return;
    }
    setIsLoadingCreatedEventIds(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setIsLoadingCreatedEventIds(false);
        return;
      }
      const headers: HeadersInit = { Authorization: `Bearer ${token}` };
      const url = `http://localhost:8080/identity/api/events/creator/${userId}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const ids = new Set(data.result.map((event: any) => event.id));
        setCreatedEventIds(ids);
      } else {
        setCreatedEventIds(new Set());
      }
    } catch (err: any) {
      console.error("Lỗi tải ID sự kiện đã tạo:", err);
      setCreatedEventIds(new Set());
    } finally {
      setIsLoadingCreatedEventIds(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingUser(true);
    setIsLoadingEvents(true);
    setIsLoadingRegisteredIds(true);
    setIsLoadingCreatedEventIds(true);
    const token = localStorage.getItem("authToken");
    let userIdForFetches: string | null = null;

    const loadInitialData = async () => {
      const eventsPromise = fetchAllEvents();

      if (token) {
        try {
          const headers: HeadersInit = { Authorization: `Bearer ${token}` };
          const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
          const userRes = await fetch(userInfoUrl, { headers });

          if (!userRes.ok) throw new Error("InvalidTokenCheck");

          const userData = await userRes.json();
          if (userData.code === 1000 && userData.result?.id) {
            const fetchedUser: User = userData.result;
            userIdForFetches = fetchedUser.id;
            if (isMounted) {
              setUser(fetchedUser);
            }
          } else {
            throw new Error("Invalid user data");
          }
        } catch (error: any) {
          console.error("Lỗi fetch user info:", error.message);
          localStorage.removeItem("authToken");
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

      await eventsPromise;

      if (userIdForFetches && isMounted) {
        await Promise.all([
          fetchRegisteredEventIds(userIdForFetches),
          fetchUserCreatedEvents(userIdForFetches),
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
  }, [fetchAllEvents, fetchRegisteredEventIds, fetchUserCreatedEvents]);

  const handleLogout = async () => {
    try {
      const t = localStorage.getItem("authToken");
      if (t) {
        await fetch("http://localhost:8080/identity/auth/logout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: t }),
        });
      }
    } catch (e) {
      console.error("Lỗi logout:", e);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      setUser(null);
      setRegisteredEventIds(new Set());
      setCreatedEventIds(new Set());
      setActiveTab("home");
      router.push("/login");
    }
  };

  const executeRegistration = async (event: EventDisplayInfo) => {
    if (!user?.id || isRegistering) return;

    setIsRegistering(event.id);
    const token = localStorage.getItem("authToken");

    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsRegistering(null);
      return;
    }

    try {
      const url = `http://localhost:8080/identity/api/events/${event.id}/attendees?userId=${user.id}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let m = "Đăng ký thất bại";
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        if (res.status === 403) m = "Không có quyền.";
        else if (res.status === 400) m = "Yêu cầu không hợp lệ.";
        else if (res.status === 409) m = "Bạn đã đăng ký sự kiện này rồi.";
        throw new Error(m);
      }

      const data = await res.json();
      if (data.code === 1000) {
        toast.success(`Đã đăng ký "${event.title}"!`);
        setRegisteredEventIds((prev) => new Set(prev).add(event.id));
      } else {
        throw new Error(data.message || "Lỗi đăng ký không xác định.");
      }
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
    )
     {
         if (registeredEventIds.has(event.id)) toast.error("Bạn đã đăng ký sự kiện này.");
         if (createdEventIds.has(event.id)) toast.error("Bạn là người tạo sự kiện này.");
         return;
     }
     const isEventUpcoming = new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0));
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
          setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null });
          executeRegistration(event);
      },
      onCancel: () => setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null }),
      confirmVariant: "primary",
      confirmText: "Đăng ký",
      cancelText: "Hủy",
    });
  };

  const handleRegistrationChange = useCallback(
    (eventId: string, registered: boolean) => {
      setRegisteredEventIds((prevIds) => {
        const newIds = new Set(prevIds);
        if (registered) {
          newIds.add(eventId);
        } else {
          newIds.delete(eventId);
        }
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
  }

  const isPageLoading = isLoadingUser || (activeTab === 'home' && (isLoadingEvents || isLoadingRegisteredIds || isLoadingCreatedEventIds));

  const getTabButtonClasses = (tabName: ActiveTab): string => {
    const baseClasses = "cursor-pointer px-4 py-2 text-xs sm:text-sm font-semibold rounded-full shadow-sm transition";
    const activeClasses = "text-white";
    const inactiveClasses = "hover:bg-opacity-80";

    let specificBg = "";
    let specificText = "";
    let specificHoverBg = "";

    switch (tabName) {
        case 'home':
            specificBg = activeTab === tabName ? 'bg-indigo-600' : 'bg-indigo-100';
            specificText = activeTab === tabName ? '' : 'text-indigo-800';
            specificHoverBg = activeTab === tabName ? 'hover:bg-indigo-700' : 'hover:bg-indigo-200';
            break;
        case 'createEvent':
             specificBg = activeTab === tabName ? 'bg-cyan-600' : 'bg-cyan-100';
             specificText = activeTab === tabName ? '' : 'text-cyan-800';
             specificHoverBg = activeTab === tabName ? 'hover:bg-cyan-700' : 'hover:bg-cyan-200';
             break;
        case 'myEvents':
            specificBg = activeTab === tabName ? 'bg-blue-600' : 'bg-blue-100';
            specificText = activeTab === tabName ? '' : 'text-blue-800';
            specificHoverBg = activeTab === tabName ? 'hover:bg-blue-700' : 'hover:bg-blue-200';
            break;
        case 'attendees':
            specificBg = activeTab === tabName ? 'bg-teal-600' : 'bg-teal-100';
            specificText = activeTab === tabName ? '' : 'text-teal-800';
            specificHoverBg = activeTab === tabName ? 'hover:bg-teal-700' : 'hover:bg-teal-200';
            break;
        case 'registeredEvents':
            specificBg = activeTab === tabName ? 'bg-green-600' : 'bg-green-100';
            specificText = activeTab === tabName ? '' : 'text-green-800';
            specificHoverBg = activeTab === tabName ? 'hover:bg-green-700' : 'hover:bg-green-200';
            break;
        case 'members':
            specificBg = activeTab === tabName ? 'bg-pink-600' : 'bg-pink-100';
            specificText = activeTab === tabName ? '' : 'text-pink-800';
            specificHoverBg = activeTab === tabName ? 'hover:bg-pink-700' : 'hover:bg-pink-200';
            break;
        case 'chatList':
            specificBg = activeTab === tabName ? 'bg-purple-600' : 'bg-purple-100';
            specificText = activeTab === tabName ? '' : 'text-purple-800';
            specificHoverBg = activeTab === tabName ? 'hover:bg-purple-700' : 'hover:bg-purple-200';
            break;
        default:
            specificBg = 'bg-gray-100';
            specificText = 'text-gray-800';
            specificHoverBg = 'hover:bg-gray-200';
    }

    return `${baseClasses} ${specificBg} ${activeTab === tabName ? activeClasses : specificText} ${activeTab !== tabName ? inactiveClasses : ''} ${specificHoverBg}`;
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <Toaster toastOptions={{ duration: 3000 }} position="top-center"/>
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg sm:text-xl font-bold">Quản lý sự kiện</div>
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
             <Link href="/about">
               <span className="cursor-pointer hover:text-gray-300">Giới thiệu</span>
            </Link>
             <span
                className="cursor-pointer hover:text-gray-300"
                onClick={() => setShowContactModal(true)}
            >
                Liên hệ
            </span>
             {!isLoadingUser && <UserMenu user={user} onLogout={handleLogout} />}
             {isLoadingUser && <span className="text-gray-400">Đang tải...</span>}
             {!isLoadingUser && !user && (
                 <Link href="/login">
                      <span className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded cursor-pointer">
                          Đăng nhập
                      </span>
                 </Link>
             )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => setActiveTab("home")}
              className={getTabButtonClasses("home")}
            >
              🎉 Trang chủ
            </button>

            {user && (
                <button
                onClick={() => setActiveTab("createEvent")}
                className={getTabButtonClasses("createEvent")}
                >
                ➕ Tạo sự kiện
                </button>
            )}

          {user && (
              <>
                 <button
                    onClick={() => setActiveTab("myEvents")}
                    className={getTabButtonClasses("myEvents")}
                >
                    🛠 Sự kiện của tôi
                </button>
                 <button
                    onClick={() => setActiveTab("attendees")}
                    className={getTabButtonClasses("attendees")}
                 >
                    ✅ Người tham gia
                </button>
                 <button
                    onClick={() => setActiveTab("registeredEvents")}
                    className={getTabButtonClasses("registeredEvents")}
                >
                    📋 Sự kiện đã đăng ký
                </button>
                <button
                    onClick={() => setActiveTab("members")}
                    className={getTabButtonClasses("members")}
                >
                    👥 Thành viên CLB
                </button>
                <button
                    onClick={() => setActiveTab("chatList")}
                    className={getTabButtonClasses("chatList")}
                 >
                    💬 Danh sách chat
                </button>
              </>
          )}
           {!user && !isLoadingUser && (
               <span className="text-sm text-gray-500 italic p-2">Đăng nhập để xem các mục khác</span>
           )}

        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6">
        {isPageLoading ? (
          <p className="text-center text-gray-500 italic py-6">Đang tải dữ liệu...</p>
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
              />
            )}
            {activeTab === "createEvent" && user && (
              <CreateEventTabContent
                 user={user}
                 onEventCreated={() => {
                     fetchAllEvents();
                     if(user?.id) fetchUserCreatedEvents(user.id);
                     setActiveTab('myEvents');
                     toast.success("Sự kiện đã được tạo thành công và đang chờ duyệt!");
                 }}
               />
            )}
            {activeTab === "myEvents" && user && (
              <MyEventsTabContent
                user={user}
              />
            )}
            {activeTab === "attendees" && user && (
                <AttendeesTabContent
                    user={user}
                />
            )}
            {activeTab === "registeredEvents" && user && (
              <RegisteredEventsTabContent
                currentUserId={user.id}
                isLoadingUserId={isLoadingUser}
                registeredEventIds={registeredEventIds}
                createdEventIds={createdEventIds}
                onRegistrationChange={handleRegistrationChange}
              />
            )}
            {activeTab === "members" && user && (
                <MembersTabContent
                    user={user}
                    userRole={user.roles?.[0]?.name?.toUpperCase() || 'UNKNOWN'}
                    currentUserEmail={user.email || null}
                 />
            )}
            {activeTab === "chatList" && user && (
                <ChatTabContent
                    currentUser={user}
                />
            )}

             {activeTab !== 'home' && !user && !isLoadingUser && (
                 <p className="text-center text-red-500 py-6">Vui lòng đăng nhập để truy cập mục này.</p>
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
          setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null });
        }}
        onCancel={() => setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null })}
      />

      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}

    </div>
  );
}