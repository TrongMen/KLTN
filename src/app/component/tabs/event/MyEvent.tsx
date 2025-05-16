"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import Image from "next/image";
import { User as MainUserType } from "../../types/appTypes"; // Điều chỉnh đường dẫn nếu cần
import {
  CheckIcon,
  Cross2Icon,
  CalendarIcon,
  Component1Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  ReloadIcon,
  Pencil1Icon,
  TrashIcon,
  ArchiveIcon,
} from "@radix-ui/react-icons";
import { toast } from "react-hot-toast";

// Định nghĩa các kiểu dữ liệu cần thiết ngay trong file hoặc import từ một file chung
interface RoleInfo { // Có thể dùng ApiRole từ typCreateEvent nếu giống hệt
  id: string;
  name: string;
}
interface OrganizerInfo {
  userId: string;
  roleName?: string; // Tên vai trò trong sự kiện
  roleId?: string;   // ID vai trò trong sự kiện
  positionName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string; // Sẽ được enrich
  // Thêm các trường khác từ API nếu cần
}

// Kiểu EventType này nên đồng bộ với những gì API trả về và những gì ModalUpdateEvent cần (sau khi mapping)
export interface EventType { // Đảm bảo kiểu này nhất quán
  id: string;
  name: string;
  time?: string;
  location?: string;
  content?: string;
  description?: string; // Giữ lại nếu có
  status: "APPROVED" | "PENDING" | "REJECTED" | string | undefined;
  rejectionReason?: string | null;
  purpose?: string;
  createdBy?: string; // Hoặc một object chi tiết hơn nếu API trả về
  createdAt?: string;
  organizers?: OrganizerInfo[]; // Quan trọng: Sẽ được enrich với tên
  participants?: OrganizerInfo[]; // Tương tự, nếu có participants ở đây và cần enrich
  attendees?: any[];
  permissions?: string[];
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null;
  avatarUrl?: string | null;
  qrCodeUrl?: string | null;
  progressStatus?: string;
  title?: string; // Có thể gộp với name
  date?: string;  // Có thể gộp với time
  maxAttendees?: number | null;
  currentAttendeesCount?: number;
}

// Các hàm tiện ích cho việc lọc thời gian
const getWeekRange = (refDate: Date): { startOfWeek: Date; endOfWeek: Date } => {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is the first day of the week
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
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0); // Day 0 of next month is last day of current month
  end.setHours(23, 59, 59, 999);
  return { startOfMonth: start, endOfMonth: end };
};


interface MyCreatedEventsTabProps {
  user: MainUserType | null;
  currentUserId: string | null; // Thường là user.id
  myEvents: EventType[]; // Danh sách sự kiện chưa được enrich từ component cha
  deletedEvents: EventType[]; // Danh sách sự kiện đã xóa chưa được enrich
  myLoading: boolean;
  deletedLoading: boolean;
  myError: string;
  deletedError: string;
  // fetchMyEvents: () => Promise<void>; // Không cần fetch ở đây nếu cha đã fetch
  // fetchDeletedEvents: () => Promise<void>; // Tương tự
  viewingEventDetails: EventType | null; // Thường sẽ được quản lý ở component cha (MyEventsTabContent)
  setViewingEventDetails: (event: EventType | null) => void;
  onOpenUpdateModal: (event: EventType) => void; // EventType này cần được enrich trước khi gọi
  onDeleteClick: (event: EventType) => void;
  onRestoreClick: (event: EventType) => void;
  onExportClick: (eventId: string) => void; // Thêm prop này nếu cần
  isRefreshing: boolean;
  restoringEventId: string | null;
  deletingEventId: string | null;
  isExporting: boolean; // Thêm prop này nếu cần
  handleRefresh: () => Promise<void>; // Hàm refresh từ cha
  fetchOrganizerDetailsById: (userId: string) => Promise<Partial<OrganizerInfo> | null>; // Hàm lấy chi tiết BTC
}

const MyCreatedEventsTab: React.FC<MyCreatedEventsTabProps> = ({
  user,
  // currentUserId, // Không dùng trực tiếp, user.id đã đủ
  myEvents: initialMyEvents,
  deletedEvents: initialDeletedEvents,
  myLoading,
  deletedLoading,
  myError,
  deletedError,
  setViewingEventDetails,
  onOpenUpdateModal,
  onDeleteClick,
  onRestoreClick,
  isRefreshing,
  restoringEventId,
  deletingEventId,
  isExporting, // Nhận prop
  handleRefresh, // Nhận prop
  fetchOrganizerDetailsById, // Nhận prop
}) => {
  const [myTab, setMyTab] = useState<"approved" | "pending" | "rejected" | "deleted">("approved");
  const [mySearchTerm, setMySearchTerm] = useState("");
  const [mySortOrder, setMySortOrder] = useState<"az" | "za">("az"); // 'az' for A-Z, 'za' for Z-A
  const [myTimeFilterOption, setMyTimeFilterOption] = useState<"all" | "today" | "thisWeek" | "thisMonth" | "dateRange">("all");
  const [myStartDateFilter, setMyStartDateFilter] = useState<string>("");
  const [myEndDateFilter, setMyEndDateFilter] = useState<string>("");
  const [myViewMode, setMyViewMode] = useState<"list" | "card">("list");

  const [deletedSearchTerm, setDeletedSearchTerm] = useState("");
  const [deletedSortOrder, setDeletedSortOrder] = useState<"az" | "za">("az");
  const [deletedTimeFilterOption, setDeletedTimeFilterOption] = useState<"all" | "today" | "thisWeek" | "thisMonth" | "dateRange">("all");
  const [deletedStartDateFilter, setDeletedStartDateFilter] = useState<string>("");
  const [deletedEndDateFilter, setDeletedEndDateFilter] = useState<string>("");
  const [deletedViewMode, setDeletedViewMode] = useState<"list" | "card">("list");

  const [enrichedMyEvents, setEnrichedMyEvents] = useState<EventType[]>([]);
  const [enrichedDeletedEvents, setEnrichedDeletedEvents] = useState<EventType[]>([]);
  const organizerDetailsCacheRef = useRef<Record<string, Partial<OrganizerInfo>>>({});
  const [isEnrichingEvents, setIsEnrichingEvents] = useState(false);

  const enrichEventsWithFullNames = useCallback(
    async (events: EventType[]): Promise<EventType[]> => {
      if (!events || events.length === 0) return [];
      setIsEnrichingEvents(true);

      const enriched = await Promise.all(
        events.map(async (event) => {
          let needsUpdate = false;
          const newOrganizers = event.organizers ? [...event.organizers] : [];

          if (event.organizers && event.organizers.length > 0) {
            for (let i = 0; i < newOrganizers.length; i++) {
              let org = { ...newOrganizers[i] }; // Tạo bản sao để không thay đổi trực tiếp state
              if (org.userId && (!org.fullName && (!org.firstName || !org.lastName))) {
                let details: Partial<OrganizerInfo> | null = null;
                if (organizerDetailsCacheRef.current[org.userId]) {
                  details = organizerDetailsCacheRef.current[org.userId];
                } else {
                  details = await fetchOrganizerDetailsById(org.userId);
                  if (details) {
                    organizerDetailsCacheRef.current[org.userId] = details;
                  }
                }

                if (details) {
                  org.firstName = details.firstName || org.firstName;
                  org.lastName = details.lastName || org.lastName;
                  org.fullName = details.fullName || `${details.lastName || ""} ${details.firstName || ""}`.trim() || org.fullName;
                  org.positionName = details.positionName || org.positionName;
                  // Giữ lại roleName và roleId nếu đã có từ API sự kiện
                  org.roleName = org.roleName || details.roleName; 
                  // org.roleId = org.roleId; // không cần gán lại nếu đã có
                  newOrganizers[i] = org;
                  needsUpdate = true;
                }
              }
            }
          }
          return needsUpdate ? { ...event, organizers: newOrganizers } : event;
        })
      );
      setIsEnrichingEvents(false);
      return enriched;
    },
    [fetchOrganizerDetailsById]
  );

  useEffect(() => {
    if (initialMyEvents.length > 0) {
      enrichEventsWithFullNames(initialMyEvents)
        .then(setEnrichedMyEvents)
        .catch(error => console.error("Error enriching my events:", error));
    } else {
      setEnrichedMyEvents([]);
    }
  }, [initialMyEvents, enrichEventsWithFullNames]);

  useEffect(() => {
    // Chỉ enrich deletedEvents khi tab 'deleted' được chọn và có dữ liệu
    if (myTab === "deleted" && initialDeletedEvents.length > 0) {
       enrichEventsWithFullNames(initialDeletedEvents)
        .then(setEnrichedDeletedEvents)
        .catch(error => console.error("Error enriching deleted events:", error));
    } else if (myTab !== "deleted" && enrichedDeletedEvents.length > 0) {
      // Nếu chuyển khỏi tab deleted, có thể cân nhắc xóa enrichedDeletedEvents để tiết kiệm bộ nhớ
      // setEnrichedDeletedEvents([]);
    }
  }, [initialDeletedEvents, myTab, enrichEventsWithFullNames]);


  const processedMyEvents = useMemo(() => {
    let eventsToProcess = [...enrichedMyEvents]; // Luôn làm việc trên bản sao đã enrich
    
    eventsToProcess = eventsToProcess.filter((event) => {
      const s = event.status?.toUpperCase();
      if (myTab === "approved") return s === "APPROVED";
      if (myTab === "pending") return s === "PENDING";
      if (myTab === "rejected") return s === "REJECTED";
      // Tab "deleted" sẽ dùng processedDeletedEvents
      return false; 
    });

    if (myTimeFilterOption !== "all") {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

      eventsToProcess = eventsToProcess.filter(event => {
        const dateStrToUse = event.time || event.createdAt || event.date;
        if (!dateStrToUse) return false;
        try {
          const eventDate = new Date(dateStrToUse);
          if(isNaN(eventDate.getTime())) return false;

          switch(myTimeFilterOption) {
            case "today":
              return eventDate >= todayStart && eventDate <= todayEnd;
            case "thisWeek":
              const { startOfWeek, endOfWeek } = getWeekRange(new Date());
              return eventDate >= startOfWeek && eventDate <= endOfWeek;
            case "thisMonth":
              const { startOfMonth, endOfMonth } = getMonthRange(new Date());
              return eventDate >= startOfMonth && eventDate <= endOfMonth;
            case "dateRange":
              if (!myStartDateFilter || !myEndDateFilter) return true; // Hoặc false nếu muốn bắt buộc chọn khoảng
              const start = new Date(myStartDateFilter); start.setHours(0,0,0,0);
              const end = new Date(myEndDateFilter); end.setHours(23,59,59,999);
              return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end && eventDate >= start && eventDate <= end;
            default: return true;
          }
        } catch (e) {
          console.error("Error parsing date (My Events):", dateStrToUse, e);
          return false;
        }
      });
    }

    if (mySearchTerm.trim()) {
      const lowerSearchTerm = mySearchTerm.trim().toLowerCase();
      eventsToProcess = eventsToProcess.filter(event => 
        (event.name || event.title || "").toLowerCase().includes(lowerSearchTerm) ||
        (event.location && event.location.toLowerCase().includes(lowerSearchTerm))
      );
    }

    eventsToProcess.sort((a, b) => {
      const nameA = a.name || a.title || "";
      const nameB = b.name || b.title || "";
      return mySortOrder === "za" 
        ? nameB.localeCompare(nameA, "vi", { sensitivity: "base" }) 
        : nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
    });
    return eventsToProcess;
  }, [enrichedMyEvents, myTab, myTimeFilterOption, myStartDateFilter, myEndDateFilter, mySearchTerm, mySortOrder]);


  const processedDeletedEvents = useMemo(() => {
    if (myTab !== "deleted") return [];
    let eventsToProcess = [...enrichedDeletedEvents]; // Làm việc trên bản sao đã enrich

    if (deletedTimeFilterOption !== "all") {
        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  
        eventsToProcess = eventsToProcess.filter(event => {
          const dateStrToUse = event.deletedAt || event.time || event.createdAt || event.date; // Ưu tiên deletedAt
          if (!dateStrToUse) return false;
          try {
            const eventDate = new Date(dateStrToUse);
            if(isNaN(eventDate.getTime())) return false;
  
            switch(deletedTimeFilterOption) {
              case "today":
                return eventDate >= todayStart && eventDate <= todayEnd;
              case "thisWeek":
                const { startOfWeek, endOfWeek } = getWeekRange(new Date());
                return eventDate >= startOfWeek && eventDate <= endOfWeek;
              case "thisMonth":
                const { startOfMonth, endOfMonth } = getMonthRange(new Date());
                return eventDate >= startOfMonth && eventDate <= endOfMonth;
              case "dateRange":
                if (!deletedStartDateFilter || !deletedEndDateFilter) return true;
                const start = new Date(deletedStartDateFilter); start.setHours(0,0,0,0);
                const end = new Date(deletedEndDateFilter); end.setHours(23,59,59,999);
                return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end && eventDate >= start && eventDate <= end;
              default: return true;
            }
          } catch (e) {
            console.error("Error parsing date (Deleted Events):", dateStrToUse, e);
            return false;
          }
        });
      }

    if (deletedSearchTerm.trim()) {
      const lowerSearchTerm = deletedSearchTerm.trim().toLowerCase();
      eventsToProcess = eventsToProcess.filter(event => 
        (event.name || event.title || "").toLowerCase().includes(lowerSearchTerm) ||
        (event.location && event.location.toLowerCase().includes(lowerSearchTerm)) ||
        (event.deletedBy?.username && event.deletedBy.username.toLowerCase().includes(lowerSearchTerm))
      );
    }

    eventsToProcess.sort((a, b) => {
      const nameA = a.name || a.title || "";
      const nameB = b.name || b.title || "";
      return deletedSortOrder === "za" 
        ? nameB.localeCompare(nameA, "vi", { sensitivity: "base" }) 
        : nameA.localeCompare(nameB, "vi", { sensitivity: "base" });
    });
    return eventsToProcess;
  }, [enrichedDeletedEvents, myTab, deletedTimeFilterOption, deletedStartDateFilter, deletedEndDateFilter, deletedSearchTerm, deletedSortOrder]);


  const handleMyStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMyStartDateFilter(e.target.value);
    if (myEndDateFilter && new Date(e.target.value) > new Date(myEndDateFilter)) {
      setMyEndDateFilter(""); // Reset end date if start date is after it
    }
  };
  const handleMyEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (myStartDateFilter && new Date(newEndDate) < new Date(myStartDateFilter)) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setMyEndDateFilter(newEndDate);
    }
  };
  const handleDeletedStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeletedStartDateFilter(e.target.value);
    if (deletedEndDateFilter && new Date(e.target.value) > new Date(deletedEndDateFilter)) {
      setDeletedEndDateFilter("");
    }
  };
  const handleDeletedEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (deletedStartDateFilter && new Date(newEndDate) < new Date(deletedStartDateFilter)) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setDeletedEndDateFilter(newEndDate);
    }
  };
  
  const handleEditClick = (event: EventType) => {
    if (deletingEventId || restoringEventId) return; // Không cho sửa nếu đang xóa/khôi phục
    // Event đã được enrich, gọi onOpenUpdateModal
    onOpenUpdateModal(event);
  };


  const renderMyEventsSection = () => {
    const isLoadingPrimary = myTab === "deleted" ? deletedLoading : myLoading;
    const isCurrentlyLoading = isLoadingPrimary || isEnrichingEvents || isRefreshing;
    const currentError = myTab === "deleted" ? deletedError : myError;
    const eventsToDisplay = myTab === "deleted" ? processedDeletedEvents : processedMyEvents;
    const currentViewMode = myTab === "deleted" ? deletedViewMode : myViewMode;
    const currentTabType = myTab;

    const noResultMessage =
      (myTab !== "deleted" && (mySearchTerm || myTimeFilterOption !== "all")) ||
      (myTab === "deleted" && (deletedSearchTerm || deletedTimeFilterOption !== "all"))
        ? "Không tìm thấy sự kiện nào khớp với bộ lọc."
        : currentTabType === "approved"
        ? "Không có sự kiện nào đã được duyệt."
        : currentTabType === "pending"
        ? "Không có sự kiện nào đang chờ duyệt."
        : currentTabType === "rejected"
        ? "Không có sự kiện nào bị từ chối."
        : "Không có sự kiện nào đã bị xóa.";

    if (isCurrentlyLoading) return (
      <p className="text-gray-500 italic text-center py-4">Đang tải và xử lý danh sách sự kiện...</p>
    );
    if (currentError) return (
      <p className="text-red-500 italic text-center py-4 bg-red-50 border border-red-200 rounded p-3">
        {currentError}
      </p>
    );

    return eventsToDisplay.length > 0 ? (
      currentViewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventsToDisplay.map((event) => {
            const isRestoringThis = restoringEventId === event.id;
            const isDeletingThis = deletingEventId === event.id;
            const isProcessing = isRestoringThis || isDeletingThis;
            const eventName = event.name || event.title || "Sự kiện không tên";
            return (
              <div key={event.id}
                className={`bg-white shadow rounded-lg flex flex-col border border-gray-200 transition-shadow duration-150 overflow-hidden ${
                  isProcessing ? "opacity-50 cursor-wait" : "hover:shadow-md cursor-pointer"
                } ${currentTabType === "deleted" ? "border-l-4 border-gray-300" : ""}`}
                onClick={() => !isProcessing && setViewingEventDetails(event)} // Xem chi tiết
              >
                {event.avatarUrl ? (
                  <div className="w-full h-36 bg-gray-200 relative">
                    <Image src={event.avatarUrl} alt={`Avatar for ${eventName}`} layout="fill" objectFit="cover"
                      className="transition-opacity duration-300 ease-in-out opacity-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; (e.target as HTMLImageElement).parentElement?.classList.add("bg-gray-300");}}
                      onLoad={(e) => { (e.target as HTMLImageElement).style.opacity = "1"; }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                    {eventName?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                <div className="p-3 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 className="font-semibold text-sm md:text-base text-gray-800 line-clamp-2 mb-1">{eventName}</h3>
                    {(event.time || event.createdAt || event.date) && !event.deletedAt && (
                      <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 opacity-70" />
                        {event.time ? new Date(event.time).toLocaleString('vi-VN', {dateStyle: 'short', timeStyle: 'short'})
                                    : `(Tạo) ${new Date(event.createdAt || event.date!).toLocaleString('vi-VN', {dateStyle: 'short', timeStyle: 'short'})}`}
                      </p>
                    )}
                    {event.deletedAt && (
                      <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                        <TrashIcon className="w-3 h-3 opacity-70" /> Xóa lúc: {new Date(event.deletedAt).toLocaleString('vi-VN', {dateStyle: 'short', timeStyle: 'short'})}
                      </p>
                    )}
                    {event.location && (<p className="text-xs text-gray-500 flex items-center gap-1"><span className="opacity-70">📍</span> {event.location}</p>)}
                  </div>
                  {currentTabType === "rejected" && event.rejectionReason && (
                    <p className="text-xs text-red-500 mt-2 pt-1 border-t border-dashed border-red-100 truncate" title={event.rejectionReason}>
                      <span className="font-medium">Lý do:</span> {event.rejectionReason}
                    </p>
                  )}
                   {currentTabType === "deleted" && event.deletedBy && (
                    <div className="text-xs text-gray-500 mt-2 pt-1 border-t border-dashed border-gray-200 flex items-center gap-1.5">
                        <span className="font-medium">Bởi:</span>
                        {event.deletedBy.avatar && <img src={event.deletedBy.avatar} alt="Avatar" className="w-4 h-4 rounded-full"/>}
                        <span>{event.deletedBy.username}</span>
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2 justify-end items-center">
                    {currentTabType !== "deleted" && (
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(event); }} disabled={isProcessing} title="Chỉnh sửa"
                        className={`p-1.5 rounded text-xs cursor-pointer font-medium flex items-center justify-center gap-1 transition ${isProcessing ? "bg-gray-200 text-gray-400 cursor-wait" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}>
                        <Pencil1Icon className="w-3 h-3" />
                      </button>
                    )}
                    {currentTabType !== "deleted" && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteClick(event); }} disabled={isProcessing} title="Xóa"
                        className={`p-1.5 rounded text-xs cursor-pointer font-medium flex items-center justify-center gap-1 transition ${isProcessing ? "bg-gray-200 text-gray-400 cursor-wait" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                        {isDeletingThis ? <ReloadIcon className="w-3 h-3 animate-spin"/> : <TrashIcon className="w-3 h-3"/>}
                      </button>
                    )}
                    {currentTabType === "deleted" && (
                      <button onClick={(e) => { e.stopPropagation(); onRestoreClick(event); }} disabled={isProcessing} title="Khôi phục"
                        className={`flex-1 px-2 py-1 cursor-pointer rounded text-xs font-medium flex items-center justify-center gap-1 transition ${isProcessing ? "bg-yellow-200 text-yellow-700 cursor-wait" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"}`}>
                        {isRestoringThis ? <ReloadIcon className="w-3 h-3 animate-spin"/> : <ArchiveIcon className="w-3 h-3"/>}
                        <span className="hidden sm:inline">{isRestoringThis ? "..." : "Khôi phục"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : ( // List view
        <ul className="space-y-3">
          {eventsToDisplay.map((event) => {
             const isRestoringThis = restoringEventId === event.id;
             const isDeletingThis = deletingEventId === event.id;
             const isProcessing = isRestoringThis || isDeletingThis;
             const eventName = event.name || event.title || "Sự kiện không tên";
            return (
              <li key={event.id}
                className={`bg-white shadow-lg rounded-xl overflow-hidden transition transform hover:scale-[1.01] hover:shadow-xl flex flex-col md:flex-row border border-gray-200 ${
                  isProcessing ? "opacity-50 cursor-wait" : "hover:border-blue-400 cursor-pointer"
                } ${currentTabType === "deleted" ? "border-l-[5px] border-gray-400" : ""}`}
                onClick={() => !isProcessing && setViewingEventDetails(event)}
              >
                <div className="relative w-full md:w-48 xl:w-56 flex-shrink-0 h-48 md:h-auto">
                  {event.avatarUrl ? (
                    <Image src={event.avatarUrl} alt={`${eventName}`} layout="fill" objectFit="cover" className="bg-gray-100"/>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-3xl font-semibold">
                      {eventName?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col justify-between flex-grow md:pl-4">
                    <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); !isProcessing && setViewingEventDetails(event)}}>
                        <h3 className="font-semibold text-base text-gray-800 mb-1 line-clamp-1 hover:text-blue-600">{eventName}</h3>
                        <div className="text-xs text-gray-500 space-y-0.5">
                            {(event.time || event.createdAt || event.date) && !event.deletedAt && (
                                <p className="flex items-center gap-1"><CalendarIcon className="w-3 h-3 opacity-70" />
                                {event.time ? new Date(event.time).toLocaleString('vi-VN', {dateStyle: 'short', timeStyle: 'short'})
                                            : `(Tạo) ${new Date(event.createdAt || event.date!).toLocaleString('vi-VN', {dateStyle: 'short', timeStyle: 'short'})}`}
                                </p>
                            )}
                            {event.deletedAt && (
                                <p className="flex items-center gap-1"><TrashIcon className="w-3 h-3 opacity-70" /> Xóa lúc: {new Date(event.deletedAt).toLocaleString('vi-VN', {dateStyle: 'short', timeStyle: 'short'})}</p>
                            )}
                            {event.location && (<p className="flex items-center gap-1"><span className="opacity-70">📍</span>{event.location}</p>)}
                            {currentTabType === "rejected" && event.rejectionReason && (
                                <p className="text-red-500 truncate" title={event.rejectionReason}><span className="font-medium">Lý do từ chối:</span> {event.rejectionReason}</p>
                            )}
                            {currentTabType === "deleted" && event.deletedBy && (
                                <p className="flex items-center gap-1.5">
                                    <span className="font-medium">Bởi:</span>
                                    {event.deletedBy.avatar && <Image src={event.deletedBy.avatar} alt={event.deletedBy.username} width={16} height={16} className="w-4 h-4 rounded-full"/>}
                                    <span>{event.deletedBy.username}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-2">
                        {currentTabType !== "deleted" && (
                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(event); }} disabled={isProcessing} title="Chỉnh sửa"
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer ${isProcessing ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}>
                                <Pencil1Icon className="w-3 h-3" /> <span className="hidden sm:inline">Sửa</span>
                            </button>
                        )}
                        {currentTabType !== "deleted" && (
                            <button onClick={(e) => { e.stopPropagation(); onDeleteClick(event); }} disabled={isProcessing} title="Xóa"
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer ${isProcessing ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
                                {isDeletingThis ? <ReloadIcon className="w-3 h-3 animate-spin"/> : <TrashIcon className="w-3 h-3"/>}
                                <span className="hidden sm:inline">{isDeletingThis ? "Đang xóa..." : "Xóa"}</span>
                            </button>
                        )}
                        {currentTabType === "deleted" && (
                            <button onClick={(e) => { e.stopPropagation(); onRestoreClick(event); }} disabled={isProcessing} title="Khôi phục"
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1 cursor-pointer ${isProcessing ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"}`}>
                                {isRestoringThis ? <ReloadIcon className="w-3 h-3 animate-spin"/> : <ArchiveIcon className="w-3 h-3"/>}
                                <span className="hidden sm:inline">{isRestoringThis ? "Đang..." : "Khôi phục"}</span>
                            </button>
                        )}
                    </div>
                </div>
              </li>
            );
          })}
        </ul>
      )
    ) : (
      <p className="text-gray-500 italic text-center py-6">{noResultMessage}</p>
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-blue-600">Quản lý sự kiện đã tạo</h2>
        <button onClick={handleRefresh}
          disabled={isRefreshing || myLoading || deletedLoading || !!restoringEventId || !!deletingEventId || isExporting || isEnrichingEvents}
          className="p-1.5 sm:p-2 cursor-pointer border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
          title="Làm mới danh sách"
        >
          {(isRefreshing || isEnrichingEvents) ? <ReloadIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-600" /> : <ReloadIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
        </button>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
        {/* Tabs */}
        <button onClick={() => setMyTab("approved")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base flex items-center gap-1 ${myTab === "approved" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"}`}>
            <CheckIcon /> Đã duyệt ({initialMyEvents.filter(e => e.status?.toUpperCase() === "APPROVED").length})
        </button>
        <button onClick={() => setMyTab("pending")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base flex items-center gap-1 ${myTab === "pending" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"}`}>
            <ReloadIcon /> Chờ duyệt ({initialMyEvents.filter(e => e.status?.toUpperCase() === "PENDING").length})
        </button>
        <button onClick={() => setMyTab("rejected")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base flex items-center gap-1 ${myTab === "rejected" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"}`}>
            <Cross2Icon /> Từ chối ({initialMyEvents.filter(e => e.status?.toUpperCase() === "REJECTED").length})
        </button>
        <button onClick={() => setMyTab("deleted")} className={`pb-2 font-semibold cursor-pointer text-sm md:text-base flex items-center gap-1 ${myTab === "deleted" ? "border-b-2 border-gray-500 text-gray-600" : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"}`}>
            <TrashIcon /> Đã xóa ({initialDeletedEvents.length})
        </button>
      </div>

      {/* Filters for My Events (non-deleted) */}
      {myTab !== "deleted" && (
        <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                <div className="relative lg:col-span-1 xl:col-span-1">
                    <label htmlFor="searchMyEvents" className="block text-xs font-medium text-gray-600 mb-1">Tìm kiếm</label>
                    <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400"><MagnifyingGlassIcon /></span>
                    <input type="text" id="searchMyEvents" placeholder="Tên hoặc địa điểm..." value={mySearchTerm} onChange={(e) => setMySearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="sortMyEvents" className="block text-xs font-medium text-gray-600 mb-1">Sắp xếp</label>
                    <select id="sortMyEvents" value={mySortOrder} onChange={(e) => setMySortOrder(e.target.value as "az" | "za")}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em" }}>
                        <option value="az">A - Z</option>
                        <option value="za">Z - A</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="timeFilterMyEvents" className="block text-xs font-medium text-gray-600 mb-1">Lọc thời gian</label>
                    <select id="timeFilterMyEvents" value={myTimeFilterOption} onChange={(e) => setMyTimeFilterOption(e.target.value as any)}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                         style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em" }}>
                        <option value="all">Tất cả</option>
                        <option value="today">Hôm nay</option>
                        <option value="thisWeek">Tuần này</option>
                        <option value="thisMonth">Tháng này</option>
                        <option value="dateRange">Khoảng ngày</option>
                    </select>
                </div>
                <div className="flex items-end justify-start md:justify-end gap-2 lg:col-start-auto xl:col-start-4">
                    <div className="flex w-full md:w-auto">
                        <button onClick={() => setMyViewMode("card")} title="Chế độ thẻ"
                            className={`flex-1 md:flex-none cursor-pointer p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${myViewMode === "card" ? "bg-blue-600 border-blue-700 text-white shadow-sm z-10" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
                            <Component1Icon className="h-5 w-5"/>
                        </button>
                        <button onClick={() => setMyViewMode("list")} title="Chế độ danh sách"
                            className={`flex-1 md:flex-none cursor-pointer p-2 rounded-r-md border transition duration-150 ease-in-out ${myViewMode === "list" ? "bg-blue-600 border-blue-700 text-white shadow-sm z-10" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
                            <ListBulletIcon className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            </div>
            {myTimeFilterOption === "dateRange" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                    <div>
                        <label htmlFor="startDateFilterMyEvents" className="block text-sm font-medium text-gray-700 mb-1"><span className="inline-block mr-1">🗓️</span> Từ ngày</label>
                        <input type="date" id="startDateFilterMyEvents" value={myStartDateFilter} onChange={handleMyStartDateChange} max={myEndDateFilter || undefined}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white" aria-label="Ngày bắt đầu lọc"/>
                    </div>
                    <div>
                        <label htmlFor="endDateFilterMyEvents" className="block text-sm font-medium text-gray-700 mb-1"><span className="inline-block mr-1">🗓️</span> Đến ngày</label>
                        <input type="date" id="endDateFilterMyEvents" value={myEndDateFilter} onChange={handleMyEndDateChange} min={myStartDateFilter || undefined}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white" aria-label="Ngày kết thúc lọc"/>
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Filters for Deleted Events */}
      {myTab === "deleted" && (
         <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                <div className="relative lg:col-span-1 xl:col-span-1">
                    <label htmlFor="searchDeletedEvents" className="block text-xs font-medium text-gray-600 mb-1">Tìm kiếm (Đã xóa)</label>
                    <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400"><MagnifyingGlassIcon /></span>
                    <input type="text" id="searchDeletedEvents" placeholder="Tên, địa điểm, người xóa..." value={deletedSearchTerm} onChange={(e) => setDeletedSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 shadow-sm"/>
                </div>
                <div>
                    <label htmlFor="sortDeletedEvents" className="block text-xs font-medium text-gray-600 mb-1">Sắp xếp</label>
                    <select id="sortDeletedEvents" value={deletedSortOrder} onChange={(e) => setDeletedSortOrder(e.target.value as "az" | "za")}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em" }}>
                        <option value="az">A - Z</option>
                        <option value="za">Z - A</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="timeFilterDeletedEvents" className="block text-xs font-medium text-gray-600 mb-1">Lọc thời gian xóa</label>
                    <select id="timeFilterDeletedEvents" value={deletedTimeFilterOption} onChange={(e) => setDeletedTimeFilterOption(e.target.value as any)}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                         style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em" }}>
                        <option value="all">Tất cả</option>
                        <option value="today">Hôm nay</option>
                        <option value="thisWeek">Tuần này</option>
                        <option value="thisMonth">Tháng này</option>
                        <option value="dateRange">Khoảng ngày</option>
                    </select>
                </div>
                <div className="flex items-end justify-start md:justify-end gap-2 lg:col-start-auto xl:col-start-4">
                     <div className="flex w-full md:w-auto">
                        <button onClick={() => setDeletedViewMode("card")} title="Chế độ thẻ"
                            className={`flex-1 md:flex-none cursor-pointer p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${deletedViewMode === "card" ? "bg-gray-600 border-gray-700 text-white shadow-sm z-10" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
                            <Component1Icon className="h-5 w-5"/>
                        </button>
                        <button onClick={() => setDeletedViewMode("list")} title="Chế độ danh sách"
                            className={`flex-1 md:flex-none cursor-pointer p-2 rounded-r-md border transition duration-150 ease-in-out ${deletedViewMode === "list" ? "bg-gray-600 border-gray-700 text-white shadow-sm z-10" : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"}`}>
                            <ListBulletIcon className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            </div>
            {deletedTimeFilterOption === "dateRange" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-gray-100 rounded-lg border border-gray-200 shadow-sm">
                    <div>
                        <label htmlFor="startDateFilterDeleted" className="block text-sm font-medium text-gray-700 mb-1"><span className="inline-block mr-1">🗓️</span> Từ ngày xóa</label>
                        <input type="date" id="startDateFilterDeleted" value={deletedStartDateFilter} onChange={handleDeletedStartDateChange} max={deletedEndDateFilter || undefined}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 shadow-sm bg-white" aria-label="Ngày bắt đầu lọc xóa"/>
                    </div>
                    <div>
                        <label htmlFor="endDateFilterDeleted" className="block text-sm font-medium text-gray-700 mb-1"><span className="inline-block mr-1">🗓️</span> Đến ngày xóa</label>
                        <input type="date" id="endDateFilterDeleted" value={deletedEndDateFilter} onChange={handleDeletedEndDateChange} min={deletedStartDateFilter || undefined}
                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 shadow-sm bg-white" aria-label="Ngày kết thúc lọc xóa"/>
                    </div>
                </div>
            )}
        </div>
      )}

      <div className="overflow-y-auto flex-grow mb-1 pr-1 min-h-[300px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {renderMyEventsSection()}
      </div>
    </>
  );
};

export default MyCreatedEventsTab;