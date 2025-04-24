"use client";

 import React, { useState, useEffect, useMemo } from "react";
 import { useRouter } from "next/navigation";
 import Link from "next/link";
 import UserMenu from "./menu";
 import ModalMember from "./ModalMember";
 import ModalOrganizer from "./ModalOrganizer";
 import ModalRole from "./ModalRole";
 import ContactModal from "./contact";
 import ModalChat from "./ModalChat";
 import MiniChatBox from "./MiniChat";
 import ModalApproval from "./ModalApproval";
 import { useRefreshToken } from "../../hooks/useRefreshToken";

 interface EventItem {
   id: string | number;
   title: string;
   date: string;
   location: string;
   description: string;
   speaker: string;
   image: string;
   status?: "PENDING" | "APPROVED" | "REJECTED" | string; // Thêm status
 }

 interface User {
    id: string;
    role?: string;
    firstName?: string;
    lastName?: string;
 }

 const sampleEvents: EventItem[] = [
   { id: 1, title: "Hội thảo Công nghệ AI", date: "2025-05-30", location: "Hội trường A", description: "...", speaker: "...", image: "/image/1.png", status: "APPROVED" },
   { id: 2, title: "Giao lưu CLB Lập trình", date: "2025-06-25", location: "Phòng 202", description: "...", speaker: "...", image: "./image/2.jpg", status: "PENDING" },
   { id: 3, title: "Workshop React Native", date: "2025-07-26", location: "Online", description: "...", speaker: "...", image: "/image/3.jpg", status: "REJECTED" },
   { id: 4, title: "Workshop React Native 2", date: "2025-07-26", location: "Online", description: "...", speaker: "...", image: "/image/3.jpg", status: "APPROVED" },
   { id: 5, title: "Workshop React Native 3", date: "2025-07-26", location: "Online", description: "...", speaker: "...", image: "/image/3.jpg", status: "PENDING" },
   { id: 6, title: "Cuộc thi Code Challenge", date: "2025-04-25", location: "Online", description: "...", speaker: "...", image:"" },
   { id: 7, title: "Seminar về Blockchain", date: "2025-04-30", location: "Hội trường B", description: "...", speaker: "...", image:"" },
 ];


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


 export default function HomeAdmin() {
   const [search, setSearch] = useState("");
   const [allEvents, setAllEvents] = useState<EventItem[]>(sampleEvents);
   const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
   const [user, setUser] = useState<User | null>(null);
   const router = useRouter();
   const [showContactModal, setShowContactModal] = useState(false);
   const [showModalMember, setShowModalMember] = useState(false);
   const [showModalChat, setShowModalChat] = useState(false);
   const [showModalRole, setShowModalRole] = useState(false);
   const [selectedConversation, setSelectedConversation] = useState(null);
   const [showModalApproval, setShowModalApproval] = useState(false);

   const [sortOption, setSortOption] = useState('date');
   const [timeFilterOption, setTimeFilterOption] = useState('all');

   const { refreshToken, refreshing } = useRefreshToken();

   useEffect(() => {
     const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try { setUser(JSON.parse(storedUser)); } catch(e) { console.error(e); localStorage.removeItem("user"); }
      }
     refreshToken();
      // TODO: Fetch allEvents từ API cho admin (có thể lấy tất cả status)
   }, []);


   const handleLogout = async () => {
       try {
         const token = localStorage.getItem("authToken");
         const response = await fetch("http://localhost:8080/identity/auth/logout", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ token: token }),
         });
         localStorage.removeItem("authToken");
         localStorage.removeItem("role");
         localStorage.removeItem("user");
         setUser(null);
         router.push("/login");
       } catch (error) {
         console.error("Lỗi khi đăng xuất:", error);
         localStorage.removeItem("authToken");
         localStorage.removeItem("role");
         localStorage.removeItem("user");
         router.push("/login");
       }
     };

   const handleSelectConversation = (conversation: any) => {
      setSelectedConversation(conversation);
      setShowModalChat(false);
    };

   const handleEvent = (event: EventItem) => setSelectedEvent(event);

   const processedEvents = useMemo(() => {
     let eventsToProcess = [...allEvents];
     if (search) {
       const lowerCaseSearch = search.toLowerCase();
       eventsToProcess = eventsToProcess.filter(event =>
         event.title.toLowerCase().includes(lowerCaseSearch) ||
         event.location.toLowerCase().includes(lowerCaseSearch)
       );
     }

     const today = new Date(); today.setHours(0,0,0,0);
     if (timeFilterOption === 'upcoming') {
        eventsToProcess = eventsToProcess.filter(event => new Date(event.date) >= today);
     } else if (timeFilterOption === 'thisWeek') {
        const { startOfWeek, endOfWeek } = getWeekRange(new Date());
        eventsToProcess = eventsToProcess.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= startOfWeek && eventDate <= endOfWeek;
        });
     } else if (timeFilterOption === 'thisMonth') {
         const { startOfMonth, endOfMonth } = getMonthRange(new Date());
          eventsToProcess = eventsToProcess.filter(event => {
             const eventDate = new Date(event.date);
             return eventDate >= startOfMonth && eventDate <= endOfMonth;
          });
     }

     if (sortOption === 'az') {
       eventsToProcess.sort((a, b) => a.title.localeCompare(b.title));
     } else {
       eventsToProcess.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     }

     return eventsToProcess;
   }, [allEvents, search, timeFilterOption, sortOption]);


   // Hàm lấy màu badge theo status
   const getStatusBadgeColor = (status?: string) => {
       switch (status?.toUpperCase()) {
           case 'APPROVED': return 'bg-green-100 text-green-800';
           case 'PENDING': return 'bg-yellow-100 text-yellow-800';
           case 'REJECTED': return 'bg-red-100 text-red-800';
           default: return 'bg-gray-100 text-gray-800';
       }
   };


   return (
     <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
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

       <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 flex justify-center gap-8 border border-gray-200">
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <button onClick={() => setShowModalApproval(true)} className="px-4 cursor-pointer py-2 text-xs sm:text-sm bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-semibold rounded-full shadow-sm transition">📅 Phê duyệt sự kiện</button>
            <button onClick={() => setShowModalMember(true)} className="px-4 cursor-pointer py-2 text-xs sm:text-sm bg-pink-100 text-pink-800 hover:bg-pink-200 font-semibold rounded-full shadow-sm transition">👥 Thành viên CLB</button>
            <button onClick={() => setShowModalRole(true)} className="px-4 cursor-pointer py-2 text-xs sm:text-sm bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-semibold rounded-full shadow-sm transition">📌 Quản lý chức vụ</button>
            <button onClick={() => setShowModalChat(true)} className="cursor-pointer px-4 py-2 text-xs sm:text-sm bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold rounded-full shadow-sm transition">💬 Danh sách chat</button>
          </div>
       </div>

       <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
             <h1 className="text-2xl sm:text-3xl font-bold text-red-600"> Bảng điều khiển Admin</h1>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                 <div className="flex-1 sm:flex-none">
                     <label htmlFor="sortOptionAdmin" className="sr-only">Sắp xếp</label>
                     <select id="sortOptionAdmin" value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                         <option value="date">📅 Sắp xếp: Ngày gần nhất</option>
                         <option value="az">🔤 Sắp xếp: A-Z</option>
                     </select>
                 </div>
                 <div className="flex-1 sm:flex-none">
                     <label htmlFor="timeFilterOptionAdmin" className="sr-only">Lọc theo thời gian</label>
                     <select id="timeFilterOptionAdmin" value={timeFilterOption} onChange={(e) => setTimeFilterOption(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                         <option value="all">♾️ Lọc: Tất cả</option>
                         <option value="upcoming">⏳ Lọc: Sắp diễn ra</option>
                         <option value="thisWeek">🗓️ Lọc: Tuần này</option>
                         <option value="thisMonth">🗓️ Lọc: Tháng này</option>
                     </select>
                 </div>
             </div>
          </div>

          <div className="relative w-full mb-6">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
             <input id="searchAdmin" type="text" placeholder="Tìm kiếm sự kiện theo tên hoặc địa điểm..." className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {selectedEvent ? (
            <div className="p-6 border rounded-lg shadow-lg bg-gray-50">
                 <h2 className="text-xl font-semibold text-gray-800">{selectedEvent.title}</h2>
                 <p className="text-gray-600">📅 Ngày: {selectedEvent.date}</p>
                 <p className="text-gray-600">📍 Địa điểm: {selectedEvent.location}</p>
                 <p className="text-gray-600">🎤 Diễn giả: {selectedEvent.speaker}</p>
                 <p className="text-gray-600">📜 Mô tả: {selectedEvent.description}</p>
                 {selectedEvent.status && <p className="mt-2 text-sm font-medium">Trạng thái: <span className={`px-2 py-0.5 rounded-full text-xs ${ getStatusBadgeColor(selectedEvent.status)}`}>{selectedEvent.status}</span></p>}
                 <button onClick={() => setSelectedEvent(null)} className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg transition text-sm">Đóng</button>
           </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {processedEvents.length > 0 ? (
                processedEvents.map((event) => (
                   <div key={event.id} className="p-5 bg-white shadow-md rounded-xl cursor-pointer transform transition hover:scale-[1.03] hover:shadow-lg" onClick={() => handleEvent(event)}>
                     {event.image && <img src={event.image || '/placeholder-image.png'} alt={event.title} className="w-full h-40 object-cover rounded-lg mb-3 bg-gray-200"/>}
                     <div className="flex justify-between items-start mb-1">
                         <h2 className="text-lg font-semibold text-gray-800 line-clamp-1 flex-1 mr-2">{event.title}</h2>
                         {event.status && <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${ getStatusBadgeColor(event.status) }`}>{event.status || 'N/A'}</span>}
                     </div>
                     <p className="text-sm text-gray-600">📅 {new Date(event.date).toLocaleDateString('vi-VN')}</p>
                     <p className="text-sm text-gray-600">📍 {event.location}</p>
                   </div>
                ))
              ) : (
                <p className="text-gray-500 text-center col-span-1 md:col-span-2 py-6 italic">Không tìm thấy sự kiện nào phù hợp.</p>
              )}
            </div>
         )}
       </div>

       {/* Các Modal */}
       {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} />}
       {showModalMember && <ModalMember onClose={() => setShowModalMember(false)} />}
       {showModalChat && <ModalChat onClose={() => setShowModalChat(false)} onSelectConversation={handleSelectConversation} />}
       {showModalRole && <ModalRole onClose={() => setShowModalRole(false)} />}
       {selectedConversation && <MiniChatBox conversation={selectedConversation} onClose={() => setSelectedConversation(null)} />}
       {showModalApproval && <ModalApproval onClose={() => setShowModalApproval(false)} />}

     </div>
   );
 }