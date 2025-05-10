"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { User as MainUserType } from "../types/appTypes";
import UpdateEventModal from "../modals/UpdateEventModal";
import ConfirmationDialog from "../../../utils/ConfirmationDialog";
import MyCreatedEventsTab from "./event/MyEvent";
import RegisteredEventsTab from "./event/RegisterEvent";
import {
  ReloadIcon,
  DownloadIcon,
  Pencil1Icon,
  TrashIcon,
  ArchiveIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  CalendarIcon as RadixCalendarIcon, // Đổi tên để tránh trùng lặp nếu bạn có CalendarIcon khác
} from "@radix-ui/react-icons";

interface OrganizerInfo {
  userId: string;
  roleName?: string;
  positionName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  id?: string; // Thêm id nếu có, hoặc fetchUserDetailsAPI trả về
  name?: string; // Thêm name nếu có
  username?: string; // Thêm username nếu có
}

interface ParticipantInfo {
  userId: string;
  roleId?: string;
  roleName?: string;
  positionName?: string;
  fullName?: string;
  lastName?: string;
  firstName?: string;
  id?: string;
  name?: string;
  username?: string;
}

interface EventType {
  id: string;
  name: string;
  time?: string;
  location?: string;
  content?: string;
  description?: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  rejectionReason?: string | null;
  purpose?: string;
  createdBy?: string ;
  createdAt?: string;
  organizers?: OrganizerInfo[];
  participants?: ParticipantInfo[];
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
  title?: string;
  date?: string;
  maxAttendees?: number | null;
  currentAttendeesCount?: number;
}

const getFilenameFromHeader = (header: string | null): string => {
  const defaultFilename = "event_export.docx";
  if (!header) return defaultFilename;
  const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
  const matches = filenameRegex.exec(header);
  if (matches?.[1]) {
    let filename = matches[1].replace(/['"]/g, "");
    try {
      if (filename.toLowerCase().startsWith("utf-8''")) {
        filename = decodeURIComponent(filename.substring(7));
      } else {
        filename = decodeURIComponent(filename);
      }
    } catch (e) {
      // console.error("Error decoding filename:", e);
    }
    if (!filename.toLowerCase().endsWith(".docx")) {
      const nameWithoutExt = filename.includes(".")
        ? filename.substring(0, filename.lastIndexOf("."))
        : filename;
      filename = nameWithoutExt + ".docx";
    }
    return filename;
  }
  return defaultFilename;
};

async function fetchUserDetailsAPI(
  userId: string
): Promise<OrganizerInfo | null> {
  try {
    const response = await fetch(
      `http://localhost:8080/identity/users/notoken/${userId}`
    );
    if (!response.ok) {
      return { userId, fullName: `ID: ${userId}` };
    }
    const data = await response.json();
    if (data.code === 1000 && data.result) {
      const { firstName, lastName, username, id, position, roles } = data.result;
      return {
        userId: userId, // Giữ userId gốc nếu id từ API khác
        id: id, // id từ API user
        firstName,
        lastName,
        username,
        fullName: `${lastName || ""} ${firstName || ""}`.trim() || username || `ID: ${id}`,
        positionName: position?.name,
        roleName: roles && roles.length > 0 ? roles[0].name : undefined,
      };
    }
    return { userId, fullName: `ID: ${userId}` };
  } catch (error) {
    return { userId, fullName: `ID: ${userId}` };
  }
}

const getVietnameseEventStatus = (status?: string): string => {
  if(!status) return "Không xác định";
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case "APPROVED":
      return "Đã duyệt";
    case "PENDING":
      return "Chờ duyệt";
    case "REJECTED":
      return "Đã từ chối";
    case "CANCELLED":
        return "Đã hủy";
    default:
      return status;
  }
};

interface MyEventsTabContentProps {
  user: MainUserType | null;
  initialRegisteredEventIds: Set<string>;
  isLoadingRegisteredIds: boolean;
  createdEventIdsFromParent: Set<string>;
  onRegistrationChange: (eventId: string, registered: boolean) => void;
  onEventNeedsRefresh: () => void;
}

const MyEventsTabContent: React.FC<MyEventsTabContentProps> = ({
  user,
  initialRegisteredEventIds,
  isLoadingRegisteredIds,
  createdEventIdsFromParent,
  onRegistrationChange,
  onEventNeedsRefresh,
}) => {
  const [mainTab, setMainTab] = useState<"myEvents" | "registerEvents">(
    "myEvents"
  );
  const [myEvents, setMyEvents] = useState<EventType[]>([]);
  const [deletedEvents, setDeletedEvents] = useState<EventType[]>([]);
  const [myLoading, setMyLoading] = useState<boolean>(true);
  const [deletedLoading, setDeletedLoading] = useState<boolean>(true);
  const [myError, setMyError] = useState<string>("");
  const [deletedError, setDeletedError] = useState<string>("");
  const [restoringEventId, setRestoringEventId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [viewingEventDetails, setViewingEventDetails] =
    useState<EventType | null>(null);
  const [
    isLoadingEventDetailsEnhancement,
    setIsLoadingEventDetailsEnhancement,
  ] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [eventToEdit, setEventToEdit] = useState<EventType | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [deleteConfirmationState, setDeleteConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger" | "warning";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  const [restoreConfirmationState, setRestoreConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger" | "warning";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  const currentUserId = user?.id ?? null;
  const personDetailsCacheRef = useRef<Record<string, OrganizerInfo | ParticipantInfo>>({});


  const callOnEventNeedsRefresh = useCallback(() => {
    if (typeof onEventNeedsRefresh === 'function') {
      onEventNeedsRefresh();
    }
  }, [onEventNeedsRefresh]);

  const fetchMyEvents = useCallback(async () => {
    if (!currentUserId) {
      setMyError("Không tìm thấy thông tin người dùng.");
      setMyLoading(false);
      setMyEvents([]);
      return;
    }
    setMyLoading(true);
    setMyError("");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Chưa đăng nhập.");
      const res = await fetch(
        `http://localhost:8080/identity/api/events/creator/${currentUserId}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(
          d?.message || `Lỗi tải sự kiện của bạn (${res.status})`
        );
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setMyEvents(data.result);
      } else {
        setMyEvents([]);
      }
    } catch (err: any) {
      setMyError(err.message || "Lỗi tải sự kiện của bạn");
      setMyEvents([]);
    } finally {
      setMyLoading(false);
    }
  }, [currentUserId]);

  const fetchDeletedEvents = useCallback(
    async (page = 0, size = 10) => {
      if (!currentUserId) {
        setDeletedError("Không tìm thấy thông tin người dùng.");
        setDeletedLoading(false);
        setDeletedEvents([]);
        return;
      }
      setDeletedLoading(true);
      setDeletedError("");
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Chưa đăng nhập.");
        const res = await fetch(
          `http://localhost:8080/identity/api/events/deleted?page=${page}&size=${size}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(
            d?.message || `Lỗi tải sự kiện đã xóa (${res.status})`
          );
        }
        const data = await res.json();
        if (
          data.code === 1000 &&
          data.result &&
          Array.isArray(data.result.content)
        ) {
          setDeletedEvents(data.result.content);
        } else {
          setDeletedEvents([]);
        }
      } catch (err: any) {
        setDeletedError(err.message || "Lỗi tải sự kiện đã xóa");
        setDeletedEvents([]);
      } finally {
        setDeletedLoading(false);
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    if (user?.id) {
      fetchMyEvents();
      fetchDeletedEvents();
    } else {
      setMyLoading(false);
      setDeletedLoading(false);
      setMyEvents([]);
      setDeletedEvents([]);
    }
  }, [user, fetchMyEvents, fetchDeletedEvents]);

  const handleRefreshLocal = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const toastId = toast.loading("Đang làm mới dữ liệu...");
    try {
      if (!currentUserId)
        throw new Error("Không tìm thấy thông tin người dùng.");
      await Promise.all([fetchMyEvents(), fetchDeletedEvents()]);
      toast.success("Dữ liệu cục bộ đã được làm mới!", { id: toastId });
      callOnEventNeedsRefresh();
    } catch (error: any) {
      toast.error(
        `Làm mới thất bại: ${error.message || "Lỗi không xác định"}`,
        { id: toastId }
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isRefreshing,
    currentUserId,
    fetchMyEvents,
    fetchDeletedEvents,
    callOnEventNeedsRefresh,
  ]);

  const isCreatedByUserCallback = useCallback(
    (eventId: string): boolean => createdEventIdsFromParent.has(eventId),
    [createdEventIdsFromParent]
  );

  const isRegisteredCallback = useCallback(
    (eventId: string): boolean => initialRegisteredEventIds.has(eventId),
    [initialRegisteredEventIds]
  );

  const handleOpenUpdateModal = (event: EventType) => {
    if (deletingEventId || restoringEventId) return;
    setEventToEdit(event);
    setIsUpdateModalOpen(true);
  };
  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setEventToEdit(null);
  };

  const handleEventUpdated = (updatedEvent: EventType) => {
    setMyEvents((prevEvents) => {
      const eventExists = prevEvents.some(
        (event) => event.id === updatedEvent.id
      );
      if (eventExists) {
        return prevEvents.map((event) =>
          event.id === updatedEvent.id ? updatedEvent : event
        );
      }
      return [...prevEvents, updatedEvent];
    });
    if (viewingEventDetails?.id === updatedEvent.id) {
      setViewingEventDetails(updatedEvent);
    }
    callOnEventNeedsRefresh();
  };

  const executeDeleteEvent = async (eventToDelete: EventType) => {
    if (deletingEventId || !currentUserId) {
      if (!currentUserId) toast.error("Không thể xác định người dùng.");
      return;
    }
    setDeletingEventId(eventToDelete.id);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setDeletingEventId(null);
      return;
    }

    try {
      const url = `http://localhost:8080/identity/api/events/${eventToDelete.id}?deletedById=${currentUserId}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) {
        let m = "Xóa sự kiện thất bại";
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(`${m} (${res.status})`);
      }
      let messageAPI = `Xóa sự kiện "${
        eventToDelete.name || eventToDelete.title
      }" thành công!`;
      if (res.status !== 204) {
        try {
          const dr = await res.json();
          messageAPI = dr.message || messageAPI;
        } catch (e) {
          //
        }
      }
      toast.success(messageAPI);
      const deletedEventData = {
        ...eventToDelete,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: {
          id: currentUserId,
          username: user?.username || "N/A",
          firstName: user?.firstName || "N/A",
          lastName: user?.lastName || "",
          avatar: user?.avatar,
        },
      };
      setMyEvents((prev) =>
        prev.filter((event) => event.id !== eventToDelete.id)
      );
      setDeletedEvents((prev) => [deletedEventData, ...prev]);
      if (viewingEventDetails?.id === eventToDelete.id) {
        setViewingEventDetails(null);
      }
      callOnEventNeedsRefresh();
    } catch (err: any) {
      toast.error(`Xóa thất bại: ${err.message}`);
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleDeleteClick = (eventToDelete: EventType) => {
    if (deletingEventId || restoringEventId) return;
    setDeleteConfirmationState({
      isOpen: true,
      title: "Xác nhận xóa sự kiện",
      message: (
        <>
          Bạn chắc chắn muốn xóa sự kiện <br />
          <strong className="text-red-600">
            "{eventToDelete.name || eventToDelete.title}"
          </strong>
          ?
          <br />
          <span className="text-xs text-gray-500">
            (Hành động này có thể khôi phục trong tab Đã xóa)
          </span>
        </>
      ),
      onConfirm: () => {
        setDeleteConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null });
        executeDeleteEvent(eventToDelete);
      },
      confirmVariant: "danger",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy",
    });
  };

  const executeRestoreEvent = async (eventToRestore: EventType) => {
    if (restoringEventId) return;
    setRestoringEventId(eventToRestore.id);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setRestoringEventId(null);
      return;
    }
    try {
      const url = `http://localhost:8080/identity/api/events/${eventToRestore.id}/restore`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const apiResponse = await res.json(); 

      if (!res.ok) {
        const errorMessage = apiResponse?.message || "Khôi phục thất bại";
        throw new Error(`${errorMessage} (${res.status})`);
      }
      
      if (apiResponse.code === 1000 && apiResponse.result) {
        toast.success(apiResponse.message || `Khôi phục sự kiện "${apiResponse.result.name || eventToRestore.name}" thành công!`);
        
        setDeletedEvents((prev) =>
          prev.filter((event) => event.id !== eventToRestore.id)
        );

        const restoredEventFromApi: EventType = {
            ...eventToRestore, 
            ...apiResponse.result, 
            deleted: false,       
            deletedAt: null,
            deletedBy: null,
        };
        
        setMyEvents((prevMyEvents) => {
            const existingEventIndex = prevMyEvents.findIndex(e => e.id === restoredEventFromApi.id);
            if (existingEventIndex > -1) {
                const updatedEvents = [...prevMyEvents];
                updatedEvents[existingEventIndex] = restoredEventFromApi;
                return updatedEvents;
            }
            return [restoredEventFromApi, ...prevMyEvents]; 
        });

        if (viewingEventDetails?.id === eventToRestore.id) {
          setViewingEventDetails(null); 
        }
        callOnEventNeedsRefresh();
      } else {
        throw new Error(apiResponse.message || "Dữ liệu trả về từ API không hợp lệ sau khi khôi phục.");
      }
    } catch (err: any) {
      toast.error(`Khôi phục thất bại: ${err.message}`);
    } finally {
      setRestoringEventId(null);
    }
  };

  const handleRestoreClick = (eventToRestore: EventType) => {
    if (restoringEventId) return;
    setRestoreConfirmationState({
      isOpen: true,
      title: "Xác nhận khôi phục",
      message: (
        <>
          Bạn chắc chắn muốn khôi phục sự kiện <br />
          <strong className="text-yellow-600">
            "{eventToRestore.name || eventToRestore.title}"
          </strong>
          ?
        </>
      ),
      onConfirm: () => {
        setRestoreConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        executeRestoreEvent(eventToRestore);
      },
      confirmVariant: "warning",
      confirmText: "Khôi phục",
      cancelText: "Hủy",
    });
  };

  const handleExportClick = async (eventId: string) => {
    if (!eventId) {
      toast.error("Không tìm thấy ID sự kiện.");
      return;
    }
    setIsExporting(true);
    const exportToastId = toast.loading("Đang chuẩn bị file Word...");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Token không hợp lệ.");
      const url = `http://localhost:8080/identity/api/events/${eventId}/export`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      });
      if (!response.ok) {
        let errorMsg = `Lỗi export (${response.status})`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {
          //
        }
        throw new Error(errorMsg);
      }
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = getFilenameFromHeader(contentDisposition);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Đã bắt đầu tải file Word!", { id: exportToastId });
    } catch (err: any) {
      toast.error(err.message || "Xuất file thất bại.", { id: exportToastId });
    } finally {
      setIsExporting(false);
    }
  };

 const enhanceEventDetailsWithNames = useCallback(
    async (event: EventType): Promise<EventType> => {
      if (!event) return event;
      
      const enhanceList = async (list: (OrganizerInfo | ParticipantInfo)[] | undefined): Promise<(OrganizerInfo | ParticipantInfo)[]> => {
        if (!list || list.length === 0) return [];
        const enhancedList = await Promise.all(
          list.map(async (person) => {
            // Đảm bảo person.userId tồn tại và là string trước khi fetch
            if (person && typeof person.userId === 'string' && (!person.fullName && !person.firstName && !person.lastName)) { 
              if (personDetailsCacheRef.current[person.userId]) {
                return { ...person, ...personDetailsCacheRef.current[person.userId] };
              }
              const details = await fetchUserDetailsAPI(person.userId);
              if (details) {
                personDetailsCacheRef.current[person.userId] = details;
                return { ...person, ...details };
              }
            }
            return person;
          })
        );
        return enhancedList as (OrganizerInfo | ParticipantInfo)[];
      };

      const newOrganizers = await enhanceList(event.organizers);
      const newParticipants = await enhanceList(event.participants);
      
      let newCreatedById: string | undefined = undefined;

      if (typeof event.createdBy === 'string' && event.createdBy) {
          const creatorId = event.createdBy;
          const cachedCreatorDetails = personDetailsCacheRef.current[creatorId];

          if (cachedCreatorDetails) {
              newCreatedById = cachedCreatorDetails.userId; // Lấy userId từ cache
          } else {
              const details = await fetchUserDetailsAPI(creatorId); // details là OrganizerInfo | null
              if (details) {
                  personDetailsCacheRef.current[creatorId] = details; // Cache toàn bộ object details
                  newCreatedById = details.userId; // Gán userId (string) cho newCreatedById
              } else {
                  // Nếu fetchUserDetailsAPI trả về null (ví dụ: lỗi mạng), newCreatedById sẽ là undefined
                  newCreatedById = undefined; 
              }
          }
      } else if (event.createdBy && typeof event.createdBy === 'object') {
          // Nếu event.createdBy ban đầu là một object, cố gắng lấy userId hoặc id từ nó
          const creatorObject = event.createdBy as any; // Ép kiểu để truy cập thuộc tính
          if (typeof creatorObject.userId === 'string') {
              newCreatedById = creatorObject.userId;
          } else if (typeof creatorObject.id === 'string') { // Một số object User có thể dùng 'id'
              newCreatedById = creatorObject.id;
          }
      }
      // Nếu event.createdBy là null hoặc undefined, newCreatedById sẽ giữ giá trị undefined đã khởi tạo.


      // Kiểm tra xem có thực sự cần tạo object mới không
      // So sánh newCreatedById với event.createdBy ban đầu (nếu nó là string) hoặc với ID trích xuất từ object
      let originalCreatedById: string | undefined | null = null;
      if(typeof event.createdBy === 'string') {
        originalCreatedById = event.createdBy;
      } else if (event.createdBy && typeof event.createdBy === 'object') {
        originalCreatedById = (event.createdBy as any).userId || (event.createdBy as any).id || null;
      }


      if (newOrganizers !== event.organizers || newParticipants !== event.participants || newCreatedById !== originalCreatedById) {
        return {
          ...event,
          organizers: newOrganizers as OrganizerInfo[],
          participants: newParticipants as ParticipantInfo[],
          createdBy: newCreatedById, // createdBy bây giờ là string | undefined
        };
      }
      
      return {
        ...event,
        organizers: newOrganizers as OrganizerInfo[],
        participants: newParticipants as ParticipantInfo[],
        createdBy: newCreatedById,
      };
    },
    []
  );

  const handleSetViewingEventDetails = useCallback(
    async (event: EventType | null) => {
      if (event) {
        setIsLoadingEventDetailsEnhancement(true);
        const enhancedEvent = await enhanceEventDetailsWithNames(event);
        setViewingEventDetails(enhancedEvent);
        setIsLoadingEventDetailsEnhancement(false);
      } else {
        setViewingEventDetails(null);
      }
    },
    [enhanceEventDetailsWithNames]
  );

  const triggerParentRefreshAsync = useCallback(async (): Promise<void> => {
    callOnEventNeedsRefresh();
  }, [callOnEventNeedsRefresh]);

  const formatPersonForDisplay = (person: OrganizerInfo | ParticipantInfo | string): string => {
    if (typeof person === 'string') return `ID: ${person}`;

    const p = person as OrganizerInfo; // Cast to OrganizerInfo or a combined type

    let displayName = p.fullName || ""; // fullName from enrichment
    if (!displayName && (p.firstName || p.lastName)) {
        displayName = `${p.lastName || ""} ${p.firstName || ""}`.trim();
    }
    if (!displayName && (p as any).username) { // Check for username if available
        displayName = (p as any).username;
    }
    if (!displayName) {
        displayName = `ID: ${p.userId}`;
    }
    
    const parts: string[] = [displayName];

    if (p.positionName) {
        parts.push(p.positionName);
    }
    if (p.roleName && p.roleName.toUpperCase() !== "GUEST" && p.roleName.toUpperCase() !== "USER") {
        parts.push(p.roleName);
    }
    
    const finalParts = parts.filter(part => part && part.trim() !== "" && part.toLowerCase() !== "không rõ");
    if (finalParts.length === 0) return `ID: ${p.userId}`;
    
    return Array.from(new Set(finalParts)).join(" - ");
};


  const renderEventDetails = (event: EventType) => {
    const isDeletedEvent = event.deleted;
    const eventName = event.name || event.title || "Sự kiện không tên";
    const descriptionContent = event.description || event.content || event.purpose;
    const vietnameseStatus = getVietnameseEventStatus(event.status);

    let statusColorClass = "text-gray-600 bg-gray-200 border-gray-300";
    if (event.status) {
        const upperStatus = event.status.toUpperCase();
        if (upperStatus === "APPROVED") statusColorClass = "text-green-700 bg-green-100 border-green-300";
        else if (upperStatus === "PENDING") statusColorClass = "text-yellow-700 bg-yellow-100 border-yellow-300";
        else if (upperStatus === "REJECTED" || upperStatus === "CANCELLED") statusColorClass = "text-red-700 bg-red-100 border-red-300";
    }

    let creatorDisplay = "Không rõ";
    const creatorData = event.createdBy;
    if (creatorData) {
        if (typeof creatorData === 'object' && creatorData !== null) {
            creatorDisplay = formatPersonForDisplay(creatorData as OrganizerInfo);
        } else if (typeof creatorData === 'string') {
            const cachedCreator = personDetailsCacheRef.current[creatorData];
            if (cachedCreator) {
                creatorDisplay = formatPersonForDisplay(cachedCreator);
            } else {
                creatorDisplay = `ID: ${creatorData}`;
            }
        }
    }
    if (creatorDisplay.trim().toLowerCase() === "id:" || creatorDisplay.trim() === "" || creatorDisplay.toLowerCase() === "không rõ id:" || creatorDisplay.toLowerCase() === "id: null" || creatorDisplay.toLowerCase() === "id: undefined") {
        creatorDisplay = "Không rõ";
    }

    return (
      <div className="p-4 bg-white rounded-lg shadow border">
        <button
          onClick={() => setViewingEventDetails(null)}
          className="mb-6 text-sm text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer group font-medium"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1.5 group-hover:-translate-x-1 transition-transform duration-150" />
          Quay lại danh sách
        </button>

        {isLoadingEventDetailsEnhancement && !viewingEventDetails?.organizers?.some(o => o.fullName) && (
            <div className="p-4 md:p-6 bg-white rounded-lg shadow-xl border border-gray-200 text-center min-h-[400px] flex flex-col justify-center items-center">
                <ReloadIcon className="w-10 h-10 animate-spin text-indigo-500 mx-auto my-4" />
                <p className="text-gray-600 text-lg">Đang tải chi tiết sự kiện...</p>
            </div>
        )}

        {!isLoadingEventDetailsEnhancement && event && (
          <>
            <div className="flex flex-col lg:flex-row gap-6 xl:gap-8">
              <div className="flex-shrink-0 lg:w-2/5 xl:w-1/3">
                {event.avatarUrl ? (
                  <div className="aspect-[4/3] relative w-full">
                    <Image
                        src={event.avatarUrl}
                        alt={`Ảnh bìa cho ${eventName}`}
                        layout="fill"
                        objectFit="cover"
                        className="rounded-lg shadow-lg border border-gray-200"
                    />
                  </div>
                ) : (
                 <div className="w-full h-52 lg:h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-gray-400 shadow-lg aspect-[4/3] border">
                    <RadixCalendarIcon className="w-16 h-16 lg:w-20 lg:h-20 opacity-50" />
                  </div>
                )}
              </div>

              <div className="flex-grow">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">{eventName}</h1>
                {!isDeletedEvent && event.status && (
                  <div className="mb-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColorClass} border`}>
                      {vietnameseStatus}
                    </span>
                  </div>
                )}
                 {isDeletedEvent && (
                    <p className="text-red-600 font-semibold text-sm mt-1 mb-3">
                        <ExclamationTriangleIcon className="inline-block mr-1 h-4 w-4" />
                        Sự kiện này đã bị xóa.
                    </p>
                )}
                
                <div className="space-y-4 text-base text-gray-700">
                  {(event.time || event.date) && (
                    <div className="flex items-start">
                      <RadixCalendarIcon className="w-5 h-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-semibold text-gray-800">Thời gian diễn ra:</p>
                        <p className="text-gray-600">{new Date(event.time || event.date!).toLocaleString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <div>
                        <p className="font-semibold text-gray-800">Địa điểm:</p>
                        <p className="text-gray-600">{event.location}</p>
                      </div>
                    </div>
                  )}
                  {event.maxAttendees !== null && event.maxAttendees !== undefined && (
                      <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.268-.25-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.268.25-1.857m0 0A5.002 5.002 0 0112 15a5.002 5.002 0 014.745 3.143M12 13a3 3 0 100-6 3 3 0 000 6z" />
                          </svg>
                          <div>
                              <p className="font-semibold text-gray-800">Số lượng dự kiến:</p>
                              <p className="text-gray-600">
                                {event.currentAttendeesCount !== null && event.currentAttendeesCount !== undefined ? event.currentAttendeesCount : (event.attendees?.length || 0)} / {event.maxAttendees}
                              </p>
                          </div>
                      </div>
                  )}
                </div>
              </div>
            </div>

            {(descriptionContent || event.purpose || event.content) && !isDeletedEvent && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Chi tiết sự kiện</h4>
                    {event.purpose && (
                        <div className="mb-4">
                            <strong className="block font-medium text-gray-900 mb-1">Mục đích:</strong>
                            <p className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words p-3 bg-gray-50 rounded-md border">{event.purpose}</p>
                        </div>
                    )}
                    {(event.description || event.content) && (
                        <div className="mb-4">
                            <strong className="block font-medium text-gray-900 mb-1">{event.content ? "Nội dung:" : "Mô tả:"}</strong>
                            <p className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words p-3 bg-gray-50 rounded-md border">{event.content || event.description}</p>
                        </div>
                    )}
                </div>
            )}
            
             {!isDeletedEvent && event.organizers && event.organizers.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Ban tổ chức</h4>
                    <ul className="space-y-2 text-sm">
                        {event.organizers.map((org, index) => (
                            <li key={org.userId || index} className="p-3 bg-gray-50 rounded-md border text-gray-700">
                                {formatPersonForDisplay(org)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!isDeletedEvent && event.participants && event.participants.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Người tham dự</h4>
                <ul className="space-y-2 text-sm">
                    {event.participants.map((par, index) => (
                      <li key={par.userId || index} className="p-3 bg-gray-50 rounded-md border text-gray-700">
                        {formatPersonForDisplay(par)}
                      </li>
                    ))}
                </ul>
              </div>
            )}
             {isDeletedEvent && event.deletedAt && (
                 <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Thông tin xóa</h4>
                     <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Thời gian xóa:</strong> {new Date(event.deletedAt).toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" })}</p>
                     {event.deletedBy && (
                        <p className="text-sm text-gray-600 mt-1">
                            <strong className="font-medium text-gray-900">Người xóa:</strong> {event.deletedBy.lastName} {event.deletedBy.firstName} ({event.deletedBy.username})
                            {event.deletedBy.avatar && <img src={event.deletedBy.avatar} alt="Avatar người xóa" className="inline-block ml-2 h-5 w-5 rounded-full" />}
                        </p>
                     )}
                 </div>
             )}


            {(creatorDisplay && creatorDisplay !== "Không rõ") || event.createdAt ? (
                 <div className="mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-xl font-semibold text-gray-800 mb-3">Thông tin khác</h4>
                    {creatorDisplay && creatorDisplay !== "Không rõ" && (
                        <p className="text-sm text-gray-700 mb-1"><strong className="font-medium text-gray-900">Tạo bởi:</strong> {creatorDisplay}</p>
                    )}
                    {event.createdAt && (
                        <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Ngày tạo sự kiện:</strong> {new Date(event.createdAt).toLocaleString("vi-VN", { dateStyle: 'long', timeStyle: 'short' })}</p>
                    )}
                </div>
            ) : null}

            <div className="mt-10 pt-6 border-t-2 border-gray-300 flex flex-col sm:flex-row justify-end gap-3">
              {mainTab === "myEvents" && !isDeletedEvent && (
                <>
                  <button
                    onClick={() => handleOpenUpdateModal(event)}
                    disabled={deletingEventId === event.id || restoringEventId === event.id}
                    className={`w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors ${
                      deletingEventId === event.id || restoringEventId === event.id
                        ? "opacity-50 cursor-wait"
                        : ""
                    }`}
                  >
                    <Pencil1Icon className="h-4 w-4 mr-2" /> Chỉnh sửa
                  </button>
                  <button
                    onClick={() => handleDeleteClick(event)}
                    disabled={deletingEventId === event.id || restoringEventId === event.id}
                    className={`w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors ${
                      deletingEventId === event.id || restoringEventId === event.id
                        ? "opacity-50 cursor-wait"
                        : ""
                    }`}
                  >
                    {deletingEventId === event.id ? (
                      <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TrashIcon className="h-4 w-4 mr-2" />
                    )}
                    {deletingEventId === event.id
                      ? "Đang xóa..."
                      : "Xóa sự kiện"}
                  </button>
                </>
              )}
              {mainTab === "myEvents" && isDeletedEvent && (
                <button
                  onClick={() => handleRestoreClick(event)}
                  disabled={restoringEventId === event.id}
                  className={`w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors ${
                    restoringEventId === event.id
                      ? "opacity-50 cursor-wait"
                      : ""
                  }`}
                >
                  {restoringEventId === event.id ? (
                    <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArchiveIcon className="h-4 w-4 mr-2" />
                  )}
                  {restoringEventId === event.id
                    ? "Đang khôi phục..."
                    : "Khôi phục sự kiện"}
                </button>
              )}
              {mainTab === "myEvents" &&
                !isDeletedEvent &&
                event.status === "APPROVED" && (
                  <button
                    onClick={() => handleExportClick(event.id)}
                    disabled={isExporting || deletingEventId === event.id || restoringEventId === event.id}
                    className={`w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors ${
                      isExporting || deletingEventId === event.id || restoringEventId === event.id
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isExporting ? (
                      <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <DownloadIcon className="h-4 w-4 mr-2" />
                    )}
                    {isExporting ? "Đang xuất..." : "Xuất file Word"}
                  </button>
                )}
              <button
                onClick={() => setViewingEventDetails(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
              >
                Đóng
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-3 md:p-5 bg-gray-50">
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => {
            setMainTab("myEvents");
            setViewingEventDetails(null);
          }}
          className={`pb-2 font-semibold cursor-pointer text-base md:text-lg transition-colors duration-150 ${
            mainTab === "myEvents"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
          }`}
        >
          Sự kiện của tôi
        </button>
        <button
          onClick={() => {
            setMainTab("registerEvents");
            setViewingEventDetails(null);
          }}
          className={`pb-2 font-semibold cursor-pointer text-base md:text-lg transition-colors duration-150 ${
            mainTab === "registerEvents"
              ? "border-b-2 border-green-500 text-green-600"
              : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
          }`}
        >
          Sự kiện đã đăng ký
        </button>
      </div>
      <div className="flex flex-col flex-grow min-h-0">
        {viewingEventDetails ? (
          renderEventDetails(viewingEventDetails)
        ) : mainTab === "myEvents" ? (
          <MyCreatedEventsTab
            user={user}
            currentUserId={currentUserId}
            myEvents={myEvents}
            deletedEvents={deletedEvents}
            myLoading={myLoading}
            deletedLoading={deletedLoading}
            myError={myError}
            deletedError={deletedError}
            fetchMyEvents={fetchMyEvents}
            fetchDeletedEvents={fetchDeletedEvents}
            viewingEventDetails={null} 
            setViewingEventDetails={handleSetViewingEventDetails}
            onOpenUpdateModal={handleOpenUpdateModal}
            onDeleteClick={handleDeleteClick}
            onRestoreClick={handleRestoreClick}
            onExportClick={handleExportClick}
            isRefreshing={isRefreshing}
            restoringEventId={restoringEventId}
            deletingEventId={deletingEventId}
            isExporting={isExporting}
            handleRefresh={handleRefreshLocal}
            fetchOrganizerDetailsById={fetchUserDetailsAPI} 
          />
        ) : (
          <RegisteredEventsTab
            user={user}
            initialRegisteredEventIds={initialRegisteredEventIds}
            isLoadingRegisteredIdsProp={isLoadingRegisteredIds}
            onRegistrationChange={onRegistrationChange}
            isCreatedByUser={isCreatedByUserCallback}
            isRegistered={isRegisteredCallback}
            setViewingEventDetails={handleSetViewingEventDetails} 
            onMainRefreshTrigger={triggerParentRefreshAsync}
            isParentRefreshing={isRefreshing}
            
          />
        )}
      </div>
      
      <ConfirmationDialog
        isOpen={deleteConfirmationState.isOpen}
        title={deleteConfirmationState.title}
        message={deleteConfirmationState.message}
        confirmVariant={deleteConfirmationState.confirmVariant}
        confirmText={deleteConfirmationState.confirmText}
        cancelText={deleteConfirmationState.cancelText}
        onConfirm={deleteConfirmationState.onConfirm || (() => {})}
        onCancel={() =>
          setDeleteConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          })
        }
      />

      <ConfirmationDialog
        isOpen={restoreConfirmationState.isOpen}
        title={restoreConfirmationState.title}
        message={restoreConfirmationState.message}
        confirmVariant={restoreConfirmationState.confirmVariant}
        confirmText={restoreConfirmationState.confirmText}
        cancelText={restoreConfirmationState.cancelText}
        onConfirm={restoreConfirmationState.onConfirm || (() => {})}
        onCancel={() =>
          setRestoreConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          })
        }
      />
      <UpdateEventModal
        isOpen={isUpdateModalOpen}
        onClose={handleCloseUpdateModal}
        eventToUpdate={eventToEdit}
        onEventUpdated={handleEventUpdated}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default MyEventsTabContent;