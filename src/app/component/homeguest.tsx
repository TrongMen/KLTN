"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./menu";
import ContactModal from "./contact";
import ModalMember from "./ModalMember";
import ModalEventRegister from "./ModalEventRegister";
import ModalChat from "./ModalChat";
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";

// --- ConfirmationDialog Component Definition ---
interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'danger';
}

function ConfirmationDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Xác nhận",
    cancelText = "Hủy bỏ",
    confirmVariant = 'primary'
}: ConfirmationDialogProps) {
    if (!isOpen) return null;

    const confirmButtonClasses = useMemo(() => {
        let base = "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
        if (confirmVariant === 'danger') {
            base += "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
        } else {
            base += "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
        }
        return base;
    }, [confirmVariant]);

    const cancelButtonClasses = "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300 ease-out" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 ease-out scale-100" onClick={(e) => e.stopPropagation()}>
                <h3 id="dialog-title" className={`text-lg font-bold mb-3 ${confirmVariant === 'danger' ? 'text-red-700' : 'text-gray-800'}`}>{title}</h3>
                <div className="text-sm text-gray-600 mb-5">{message}</div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className={cancelButtonClasses}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={confirmButtonClasses}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
// --- End ConfirmationDialog ---


// --- Interfaces ---
interface EventDisplayInfo {
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

interface Role {
    name: string;
    description?: string;
    permissions?: any[];
}

interface User {
   id: string;
   roles?: Role[];
   firstName?: string;
   lastName?: string;
   username?: string;
   dob?: string;
   avatar?: string;
   email?: string;
   gender?: boolean;
   role?: string;
}

// --- Helper Functions ---
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


// --- Main Component ---
export default function HomeGuest() {
  const [search, setSearch] = useState("");
  const [allEvents, setAllEvents] = useState<EventDisplayInfo[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingRegisteredIds, setIsLoadingRegisteredIds] =
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
  const [showModalMember, setShowModalMember] = useState(false);
  const [showModalEventRegister, setShowModalEventRegister] = useState(false);
  const [showModalChat, setShowModalChat] = useState(false);
  const [isRegistering, setIsRegistering] = useState<string | null>(null);

  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: 'primary' | 'danger';
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: null });

  const { refreshToken, refreshing } = useRefreshToken(); // Giả sử hook này trả về refreshToken ổn định

  // --- Fetch Functions ---
  const fetchAllEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setErrorEvents(null);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let msg = `Không thể tải danh sách sự kiện`;
        try { const d = await res.json(); msg = d.message || msg; } catch (_) {}
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const formattedEvents: EventDisplayInfo[] = data.result.map((event: any) => ({
            id: event.id,
            title: event.name || "Không có tiêu đề",
            date: event.time || new Date().toISOString(),
            location: event.location || "N/A",
            description: event.content || "",
            image: undefined,
            speaker: undefined,
            time: event.time,
            status: event.status,
            purpose: event.purpose,
        }));
        setAllEvents(formattedEvents);
      } else {
        throw new Error(data.message || "Dữ liệu sự kiện không hợp lệ");
      }
    } catch (err: any) {
      console.error("Lỗi khi tải sự kiện:", err);
      setErrorEvents(err.message || "Đã xảy ra lỗi khi tải sự kiện.");
      // toast.error(`Lỗi tải sự kiện: ${err.message}`); // Có thể bật lại nếu cần
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
      // ====[CẦN THAY THẾ ENDPOINT NÀY]====
      const url = `http://localhost:8080/identity/api/events/creator/${userId}`;
      // ==================================
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let msg = `Không thể tải ID sự kiện đã đăng ký`;
        try { const d = await res.json(); msg = d.message || msg; } catch (_) {}
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const ids = new Set(data.result.map((event: any) => event.id));
        setRegisteredEventIds(ids);
      } else {
        console.warn("API lấy registered events trả về dữ liệu không phải mảng:", data);
        setRegisteredEventIds(new Set());
      }
    } catch (err: any) {
      console.error("Lỗi khi tải ID sự kiện đã đăng ký:", err);
      setRegisteredEventIds(new Set());
      // toast.error("Lỗi tải danh sách sự kiện đã đăng ký."); // Có thể bật lại nếu cần
    } finally {
      setIsLoadingRegisteredIds(false);
    }
  }, []);

  // --- useEffect Chính ---
  useEffect(() => {
    let isMounted = true;
    setIsLoadingUser(true); // Luôn bắt đầu loading user

    const token = localStorage.getItem("authToken");

    const loadInitialData = async () => {
        if (isMounted) setIsLoadingEvents(true); // Bắt đầu loading events

        // Chạy fetch events song song với fetch user
        const eventsPromise = fetchAllEvents();

        let userIdToFetchRegistered: string | null = null;

        if (token) {
            try {
                const headers: HeadersInit = { Authorization: `Bearer ${token}` };
                const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
                const userRes = await fetch(userInfoUrl, { headers });

                if (!userRes.ok) {
                    if (userRes.status === 401 || userRes.status === 403) {
                        throw new Error("InvalidToken");
                    }
                    let msg = `Không thể tải thông tin người dùng`;
                    try { const d = await userRes.json(); msg = d.message || msg; } catch (_) {}
                    throw new Error(msg);
                }

                const userData = await userRes.json();
                if (userData.code === 1000 && userData.result?.id) {
                    const fetchedUser: User = userData.result;
                    userIdToFetchRegistered = fetchedUser.id; // Lấy ID để dùng sau
                    if (isMounted) {
                        setUser(fetchedUser);
                        localStorage.setItem("user", JSON.stringify(fetchedUser));
                    }
                } else {
                     throw new Error(userData.message || "Dữ liệu người dùng không hợp lệ");
                }
            } catch (error: any) {
                 console.error("Lỗi fetch user info:", error);
                 if (error.message !== "InvalidToken") {
                   toast.error(`Phiên đăng nhập lỗi: ${error.message}`);
                 }
                 localStorage.removeItem("authToken");
                 localStorage.removeItem("role");
                 localStorage.removeItem("user");
                 if (isMounted) setUser(null);
            } finally {
                if (isMounted) setIsLoadingUser(false); // Kết thúc loading user
            }
            refreshToken(); // Gọi refresh nếu có token
        } else {
             // Không có token
             if (isMounted) {
                 setUser(null);
                 setIsLoadingUser(false); // Không có user, kết thúc loading user
                 setIsLoadingRegisteredIds(false); // Không cần load ds đăng ký
             }
        }

        // Chờ fetch events hoàn tất
        await eventsPromise;

        // Nếu đã lấy được userId, fetch ds đăng ký
        if (userIdToFetchRegistered && isMounted) {
            await fetchRegisteredEventIds(userIdToFetchRegistered);
        } else if (isMounted) {
             // Nếu không có userId (do lỗi hoặc ko có token), đảm bảo loading registered là false
             setIsLoadingRegisteredIds(false);
        }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  // Phụ thuộc vào các hàm fetch và refresh (giả sử chúng ổn định)
  }, []);


  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
         const response = await fetch(
           "http://localhost:8080/identity/auth/logout",
           {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ token: token }),
           }
         );
         if (!response.ok) {
             console.warn("API Logout có thể đã thất bại.");
         }
      }
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    } finally {
      localStorage.removeItem("authToken");
      localStorage.removeItem("role");
      localStorage.removeItem("user");
      setUser(null);
      setRegisteredEventIds(new Set());
      router.push("/login");
    }
  };

  const executeRegistration = async (event: EventDisplayInfo) => {
      if (!user || !user.id || isRegistering) return;

      setIsRegistering(event.id);
      const token = localStorage.getItem("authToken");
      if (!token) {
          toast.error("Vui lòng đăng nhập lại để đăng ký.");
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
              let errorMsg = "Đăng ký thất bại";
              try {
                  const errData = await res.json();
                  errorMsg = errData.message || errorMsg;
              } catch (_) {}
              if (res.status === 403) {
                  errorMsg = "Bạn không có quyền đăng ký sự kiện này.";
              } else if (res.status === 400) {
                  errorMsg = "Yêu cầu đăng ký không hợp lệ.";
              }
              throw new Error(errorMsg);
          }

          const data = await res.json();
          if (data.code === 1000) {
              toast.success(`Đã đăng ký thành công sự kiện "${event.title}"!`);
              setRegisteredEventIds((prev) => new Set(prev).add(event.id));
          } else {
              throw new Error(
                  data.message || "Đăng ký thất bại với mã lỗi từ server."
              );
          }
      } catch (err: any) {
          console.error("Lỗi đăng ký sự kiện:", err);
          toast.error(`${err.message || "Đăng ký thất bại."}`);
      } finally {
          setIsRegistering(null);
      }
  };

  const handleRegister = (event: EventDisplayInfo) => {
    if (!user || !user.id) {
      toast.error("Vui lòng đăng nhập để đăng ký.");
      router.push("/login");
      return;
    }
    if (registeredEventIds.has(event.id) || isRegistering) {
      return;
    }

    setConfirmationState({
      isOpen: true,
      title: "Xác nhận đăng ký",
      message: <>Bạn có chắc chắn muốn đăng ký sự kiện <br/> <strong className="text-indigo-600">"{event.title}"</strong> không?</>,
      onConfirm: () => executeRegistration(event),
      confirmVariant: 'primary',
      confirmText: "Đăng ký",
      cancelText: "Hủy bỏ"
    });
  };

  const handleEvent = (event: EventDisplayInfo) => setSelectedEvent(event);

  const processedEvents = useMemo(() => {
    let eventsToProcess = [...allEvents];

    if (search) {
      const lowerCaseSearch = search.toLowerCase();
      eventsToProcess = eventsToProcess.filter(
        (event) =>
          event.title.toLowerCase().includes(lowerCaseSearch) ||
          event.location.toLowerCase().includes(lowerCaseSearch)
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (timeFilterOption === "upcoming") {
      eventsToProcess = eventsToProcess.filter(
        (event) => new Date(event.date) >= today
      );
    } else if (timeFilterOption === "thisWeek") {
      const { startOfWeek, endOfWeek } = getWeekRange(new Date());
      eventsToProcess = eventsToProcess.filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= startOfWeek && eventDate <= endOfWeek;
      });
    } else if (timeFilterOption === "thisMonth") {
      const { startOfMonth, endOfMonth } = getMonthRange(new Date());
      eventsToProcess = eventsToProcess.filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= startOfMonth && eventDate <= endOfMonth;
      });
    }

    if (sortOption === "az") {
      eventsToProcess.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      eventsToProcess.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    }

    return eventsToProcess;
  }, [allEvents, search, timeFilterOption, sortOption]);

  const handleModalDataChange = useCallback(() => {
    if (user?.id) {
      fetchRegisteredEventIds(user.id);
    }
  }, [user?.id, fetchRegisteredEventIds]);

  // Điều kiện loading chính: Chỉ dựa vào isLoadingEvents
  const isPageLoading = isLoadingEvents;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <Toaster toastOptions={{ duration: 3000 }} />

      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg sm:text-xl font-bold">Quản lý sự kiện</div>
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            <Link href="/about">
              <span className="cursor-pointer hover:text-gray-300">
                Giới thiệu
              </span>
            </Link>
            <span
              className="cursor-pointer hover:text-gray-300"
              onClick={() => setShowContactModal(true)}
            >
              Liên hệ
            </span>
            <UserMenu user={isLoadingUser ? undefined : user} onLogout={handleLogout} />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 flex justify-center gap-8 border border-gray-200">
        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
          <button
            onClick={() => setShowModalEventRegister(true)}
            className="px-4 cursor-pointer py-2 text-xs sm:text-sm bg-green-100 text-green-800 hover:bg-green-200 font-semibold rounded-full shadow-sm transition"
          >
            📋 Danh sách sự kiện
          </button>
          <button
            onClick={() => setShowModalMember(true)}
            className="px-4 cursor-pointer py-2 text-xs sm:text-sm bg-pink-100 text-pink-800 hover:bg-pink-200 font-semibold rounded-full shadow-sm transition"
          >
            👥 Thành viên CLB
          </button>
          <button
            onClick={() => setShowModalChat(true)}
            className="cursor-pointer px-4 py-2 text-xs sm:text-sm bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold rounded-full shadow-sm transition"
          >
            💬 Danh sách chat
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">
            🎉 Trang chủ Sự kiện
          </h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <label htmlFor="sortOptionGuest" className="sr-only">
                Sắp xếp
              </label>
              <select
                id="sortOptionGuest"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">📅 Sắp xếp: Ngày gần nhất</option>
                <option value="az">🔤 Sắp xếp: A-Z</option>
              </select>
            </div>
            <div className="flex-1 sm:flex-none">
              <label htmlFor="timeFilterOptionGuest" className="sr-only">
                Lọc theo thời gian
              </label>
              <select
                id="timeFilterOptionGuest"
                value={timeFilterOption}
                onChange={(e) => setTimeFilterOption(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="upcoming">⏳ Lọc: Sắp diễn ra</option>
                <option value="thisWeek">🗓️ Lọc: Tuần này</option>
                <option value="thisMonth">🗓️ Lọc: Tháng này</option>
                <option value="all">♾️ Lọc: Tất cả</option>
              </select>
            </div>
          </div>
        </div>

        <div className="relative w-full mb-6">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            id="searchGuest"
            type="text"
            placeholder="Tìm kiếm sự kiện theo tên hoặc địa điểm..."
            className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

         {/* Chỉ hiển thị loading nếu isLoadingEvents là true */}
        {isPageLoading ? (
          <p className="text-center text-gray-500 italic py-6">
            Đang tải dữ liệu sự kiện...
          </p>
        ) : errorEvents ? (
          <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
            {errorEvents}
          </p>
        ) : selectedEvent ? (
          <div className="p-6 border rounded-lg shadow-lg bg-gray-50">
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedEvent.title}
            </h2>
            <p className="text-gray-600">
              📅 Ngày:{" "}
              {new Date(selectedEvent.date).toLocaleDateString("vi-VN")}
            </p>
            {selectedEvent.time && (
              <p className="text-gray-600">
                🕒 Thời gian:{" "}
                {new Date(selectedEvent.time).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            <p className="text-gray-600">
              📍 Địa điểm: {selectedEvent.location}
            </p>
            {selectedEvent.speaker && (
              <p className="text-gray-600">
                🎤 Diễn giả: {selectedEvent.speaker}
              </p>
            )}
            <p className="text-gray-600">
              📜 Mô tả: {selectedEvent.description}
            </p>
            <button
              onClick={() => setSelectedEvent(null)}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg transition text-sm"
            >
              Đóng
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {processedEvents.length > 0 ? (
              processedEvents.map((event) => {
                const isRegistered = registeredEventIds.has(event.id);
                const processing = isRegistering === event.id;
                const canRegister =
                  !!user?.id &&
                  new Date(event.date) >=
                    new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={event.id}
                    className="p-5 bg-white shadow-md rounded-xl cursor-pointer transform transition hover:scale-[1.03] hover:shadow-lg flex flex-col justify-between"
                    onClick={() => handleEvent(event)}
                  >
                    <div>
                      {event.image && (
                        <img
                          src={event.image || "/placeholder-image.png"}
                          alt={event.title}
                          className="w-full h-40 object-cover rounded-lg mb-3 bg-gray-200"
                        />
                      )}
                      <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                        {event.title}
                      </h2>
                      <p className="text-sm text-gray-600">
                        📅 {new Date(event.date).toLocaleDateString("vi-VN")}
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        📍 {event.location}
                      </p>
                    </div>

                    {canRegister && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegister(event);
                        }}
                        className={`w-full mt-3 px-4 py-2 rounded-lg text-white shadow-sm transition text-sm font-medium flex items-center justify-center ${
                          isRegistered
                            ? "bg-gray-400 cursor-not-allowed"
                            : processing
                            ? "bg-blue-300 cursor-wait"
                            : "bg-blue-500 hover:bg-blue-600"
                        }`}
                        disabled={
                          isRegistered || processing || isLoadingRegisteredIds
                        }
                      >
                        {isRegistered ? (
                          <span>✅ Đã đăng ký</span>
                        ) : processing ? (
                          <>
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Đang xử lý...
                          </>
                        ) : (
                          <span className="cursor-pointer">📝 Đăng ký</span>
                        )}
                      </button>
                    )}

                    {user?.id &&
                      new Date(event.date) <
                        new Date(new Date().setHours(0, 0, 0, 0)) && (
                        <button
                          className="w-full mt-3 px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                          disabled
                        >
                          Đã kết thúc
                        </button>
                      )}

                    {!user?.id &&
                      new Date(event.date) >=
                        new Date(new Date().setHours(0, 0, 0, 0)) && (
                        <button
                          onClick={() => router.push("/login")}
                          className="w-full mt-3 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium"
                        >
                          Đăng nhập để đăng ký
                        </button>
                      )}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-center col-span-1 md:col-span-2 py-6 italic">
                Không tìm thấy sự kiện nào phù hợp.
              </p>
            )}
          </div>
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
              if (confirmationState.onConfirm) {
                  confirmationState.onConfirm();
              }
              setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: null });
          }}
          onCancel={() => {
              setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: null });
          }}
      />

      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}
      {showModalMember && (
        <ModalMember onClose={() => setShowModalMember(false)} />
      )}
      {showModalEventRegister && (
        <ModalEventRegister
          onClose={() => setShowModalEventRegister(false)}
          onDataChanged={handleModalDataChange}
        />
      )}
      {showModalChat && <ModalChat onClose={() => setShowModalChat(false)} />}
    </div>
  );
}