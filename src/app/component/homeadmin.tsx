"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  date: string;
  location: string;
  description: string;
  speaker?: string;
  image?: string;
  time?: string;
  status?: string;
  purpose?: string;
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
  isOpen, title, message, onConfirm, onCancel,
  confirmText = "Xác nhận", cancelText = "Hủy bỏ", confirmVariant = "primary",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;
  const confirmBtnClasses = useMemo(() => {
    let base = "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger") base += "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    else base += "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
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
const getMonthRange = (refDate: Date): { startOfMonth: Date; endOfMonth: Date } => {
     const date = new Date(refDate);
     const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
     startOfMonth.setHours(0, 0, 0, 0);
     const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
     endOfMonth.setHours(23, 59, 59, 999);
     return { startOfMonth, endOfMonth };
};

type ActiveTab = 'home' | 'approval' | 'attendees' | 'members' | 'roles' | 'chatList';

export default function HomeAdmin() {
  const [search, setSearch] = useState("");
  const [allEvents, setAllEvents] = useState<EventDisplayInfo[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventDisplayInfo | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const router = useRouter();
  const [showContactModal, setShowContactModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [sortOption, setSortOption] = useState('date-desc');
  const [timeFilterOption, setTimeFilterOption] = useState('all');
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean; title: string; message: React.ReactNode; onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger"; confirmText?: string; cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  const { refreshToken } = useRefreshToken();

  const fetchAdminHomeEvents = useCallback(async () => {
      setIsLoadingEvents(true);
      setErrorEvents(null);
      try {
          const token = localStorage.getItem("authToken");
          const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
          const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
          const res = await fetch(url, { headers, cache: "no-store" });
          if (!res.ok) {
             let m = `Lỗi tải sự kiện (Admin)`; try { const d = await res.json(); m = d.message || m; } catch (_) {} throw new Error(m);
          }
          const data = await res.json();
          if (data.code === 1000 && Array.isArray(data.result)) {
              const formattedEvents: EventDisplayInfo[] = data.result.map((apiEvent: any) => ({
                 id: apiEvent.id, title: apiEvent.name || "Chưa có tiêu đề", date: apiEvent.time || new Date().toISOString(),
                 location: apiEvent.location || "Chưa xác định", description: apiEvent.content || apiEvent.purpose || "Không có mô tả",
                 time: apiEvent.time, status: apiEvent.status, purpose: apiEvent.purpose,
              }));
              setAllEvents(formattedEvents);
          } else throw new Error(data.message || "Dữ liệu sự kiện không hợp lệ");
      } catch (err: any) {
          console.error("Lỗi fetchAdminHomeEvents:", err);
          setErrorEvents(err.message || "Không thể tải danh sách sự kiện.");
          setAllEvents([]);
      } finally {
          setIsLoadingEvents(false);
      }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingUser(true);
    const loadAdminData = async () => {
      const token = localStorage.getItem("authToken");
      if (token) {
        try {
          const headers: HeadersInit = { Authorization: `Bearer ${token}` };
          const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
          const userRes = await fetch(userInfoUrl, { headers });
          if (!userRes.ok) {
              if (userRes.status === 401 || userRes.status === 403) throw new Error("Unauthorized");
              throw new Error(`Workspace user failed: ${userRes.statusText}`);
          }
          const userData = await userRes.json();
          if (userData.code === 1000 && userData.result?.id) {
            const fetchedUser: User = userData.result;
            if (isMounted) {
               setUser(fetchedUser);
               if (!fetchedUser.roles?.some(r => r.name === 'ADMIN')) {
                   toast.error("Truy cập bị từ chối.");
                   router.push('/login');
               } else {
                   fetchAdminHomeEvents();
               }
            }
          } else throw new Error("Invalid user data structure");
        } catch (error: any) {
          console.error("Lỗi fetch user info:", error.message);
          localStorage.removeItem("authToken");
          if (isMounted) setUser(null);
          router.push('/login');
        } finally {
          if (isMounted) setIsLoadingUser(false);
        }
      } else {
          if (isMounted) { setIsLoadingUser(false); setIsLoadingEvents(false); }
          router.push('/login');
      }
    };
    loadAdminData();
    return () => { isMounted = false; }
  }, [fetchAdminHomeEvents, router]);


  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        await fetch("http://localhost:8080/identity/auth/logout", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: token }),
        });
      }
    } catch (error) { console.error("Lỗi khi đăng xuất:", error); }
    finally {
        localStorage.removeItem("authToken"); localStorage.removeItem("role"); localStorage.removeItem("user");
        setUser(null); setAllEvents([]); setActiveTab("home"); router.push("/login");
    }
  };

  const handleEventClick = (event: EventDisplayInfo) => setSelectedEvent(event);
  const handleBackToList = () => setSelectedEvent(null);

  const isPageLoading = isLoadingUser;

  const getTabButtonClasses = (tabName: ActiveTab): string => {
     const baseClasses = "cursor-pointer px-4 py-2 text-xs sm:text-sm font-semibold rounded-full shadow-sm transition";
     const activeClasses = "text-white";
     const inactiveClasses = "hover:bg-opacity-80";
     let specificBg = ""; let specificText = ""; let specificHoverBg = "";

     switch (tabName) {
         case 'home':
             specificBg = activeTab === tabName ? 'bg-indigo-600' : 'bg-indigo-100';
             specificText = activeTab === tabName ? '' : 'text-indigo-800';
             specificHoverBg = activeTab === tabName ? 'hover:bg-indigo-700' : 'hover:bg-indigo-200';
             break;
         case 'approval':
             specificBg = activeTab === tabName ? 'bg-yellow-500' : 'bg-yellow-100';
             specificText = activeTab === tabName ? '' : 'text-yellow-800';
             specificHoverBg = activeTab === tabName ? 'hover:bg-yellow-600' : 'hover:bg-yellow-200';
             break;
          case 'attendees':
              specificBg = activeTab === tabName ? 'bg-teal-600' : 'bg-teal-100';
              specificText = activeTab === tabName ? '' : 'text-teal-800';
              specificHoverBg = activeTab === tabName ? 'hover:bg-teal-700' : 'hover:bg-teal-200';
              break;
         case 'members':
             specificBg = activeTab === tabName ? 'bg-pink-600' : 'bg-pink-100';
             specificText = activeTab === tabName ? '' : 'text-pink-800';
             specificHoverBg = activeTab === tabName ? 'hover:bg-pink-700' : 'hover:bg-pink-200';
             break;
          case 'roles':
              specificBg = activeTab === tabName ? 'bg-orange-500' : 'bg-orange-100';
              specificText = activeTab === tabName ? '' : 'text-orange-800';
              specificHoverBg = activeTab === tabName ? 'hover:bg-orange-600' : 'hover:bg-orange-200';
              break;
         case 'chatList':
             specificBg = activeTab === tabName ? 'bg-purple-600' : 'bg-purple-100';
             specificText = activeTab === tabName ? '' : 'text-purple-800';
             specificHoverBg = activeTab === tabName ? 'hover:bg-purple-700' : 'hover:bg-purple-200';
             break;
         default:
             specificBg = 'bg-gray-100'; specificText = 'text-gray-800'; specificHoverBg = 'hover:bg-gray-200';
     }
     return `${baseClasses} ${specificBg} ${activeTab === tabName ? activeClasses : specificText} ${activeTab !== tabName ? inactiveClasses : ''} ${specificHoverBg}`;
  };

  const getActiveIndicatorColor = (tabName: ActiveTab): string => {
      switch (tabName) {
          case 'home': return 'border-t-indigo-600';
          case 'approval': return 'border-t-yellow-500';
          case 'attendees': return 'border-t-teal-600';
          case 'members': return 'border-t-pink-600';
          case 'roles': return 'border-t-orange-500';
          case 'chatList': return 'border-t-purple-600';
          default: return 'border-t-gray-400';
      }
  };


   if (isLoadingUser) {
       return <div className="min-h-screen flex justify-center items-center bg-gray-100">Đang xác thực quyền truy cập...</div>;
   }
   if (!user) {
       return <div className="min-h-screen flex justify-center items-center bg-gray-100 text-red-500">Không thể xác thực người dùng hoặc không có quyền truy cập.</div>;
   }


  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-lg sm:text-xl font-bold">Quản lý sự kiện (Admin)</div>
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
              <Link href="/about"><span className="cursor-pointer hover:text-gray-300">Giới thiệu</span></Link>
              <span className="cursor-pointer hover:text-gray-300" onClick={() => setShowContactModal(true)}>Liên hệ</span>
              <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-5 justify-center pb-3">
            {[
                { id: 'home', label: '🏠 Trang chủ Admin' },
                { id: 'approval', label: '📅 Phê duyệt sự kiện' },
                { id: 'attendees', label: '✅ Người tham gia' },
                { id: 'members', label: '👥 Thành viên CLB' },
                { id: 'roles', label: '📌 Quản lý chức vụ' },
                { id: 'chatList', label: '💬 Danh sách chat' },
            ].map((tab) => (
                <div key={tab.id} className="relative flex flex-col items-center">
                    <button
                        onClick={() => setActiveTab(tab.id as ActiveTab)}
                        className={getTabButtonClasses(tab.id as ActiveTab)}
                    >
                        {tab.label}
                    </button>
                    {activeTab === tab.id && (
                        <div className={`absolute top-full mt-1.5 w-0 h-0
                            border-l-[6px] border-l-transparent
                            border-t-[8px] ${getActiveIndicatorColor(tab.id as ActiveTab)}
                            border-r-[6px] border-r-transparent`}
                             style={{ left: '50%', transform: 'translateX(-50%)' }}>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 min-h-[400px]">
          {activeTab === 'home' && (
              <AdminHomeTabContent
                  events={allEvents} isLoading={isLoadingEvents} error={errorEvents}
                  search={search} setSearch={setSearch} sortOption={sortOption} setSortOption={setSortOption}
                  timeFilterOption={timeFilterOption} setTimeFilterOption={setTimeFilterOption}
                  startDateFilter={startDateFilter} setStartDateFilter={setStartDateFilter}
                  endDateFilter={endDateFilter} setEndDateFilter={setEndDateFilter}
                  selectedEvent={selectedEvent} onEventClick={handleEventClick} onBackToList={handleBackToList}
              />
          )}
          {activeTab === 'approval' && <ApprovalTabContent user={user}/>}
          {activeTab === 'attendees' && <AttendeesTabContent user={user} />}
          {activeTab === 'members' && (
              <MembersTabContent user={user} userRole={'ADMIN'} currentUserEmail={user?.email || null} />
          )}
          {activeTab === 'roles' && <RolesTabContent user={user}/>}
          {activeTab === 'chatList' && <ChatTabContent currentUser={user} />}
      </div>

      <ConfirmationDialog
        isOpen={confirmationState.isOpen} title={confirmationState.title} message={confirmationState.message}
        confirmVariant={confirmationState.confirmVariant} confirmText={confirmationState.confirmText} cancelText={confirmationState.cancelText}
        onConfirm={() => { if (confirmationState.onConfirm) confirmationState.onConfirm(); setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null }); }}
        onCancel={() => setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null })}
      />
      {showContactModal && (<ContactModal onClose={() => setShowContactModal(false)} />)}

    </div>
  );
}