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
import { User as MainUserType } from "../homeuser";
import UpdateEventModal from "../modals/UpdateEventModal";
import ConfirmationDialog from "../../../utils/ConfirmationDialog";
import MyCreatedEventsTab from "./MyEvent";
import RegisteredEventsTab from "./RegisterEvent";
import {
  ReloadIcon,
  DownloadIcon,
  Pencil1Icon,
  TrashIcon,
  ArchiveIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  CalendarIcon,
} from "@radix-ui/react-icons";

interface OrganizerInfo {
  userId: string;
  roleName?: string;
  positionName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

interface ParticipantInfo {
  userId: string;
  roleId?: string;
  roleName?: string;
  positionName?: string;
  fullName?: string;
  lastName?: string;
  firstName?: string;
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
  createdBy?: string;
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
      console.error("Error decoding filename:", e);
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
      console.error(
        `Lỗi fetch chi tiết người dùng ${userId}: ${response.status}`
      );
      return null;
    }
    const data = await response.json();
    if (data.code === 1000 && data.result) {
      const { firstName, lastName } = data.result;
      return {
        userId,
        firstName,
        lastName,
        fullName: `${lastName || ""} ${firstName || ""}`.trim(),
      };
    }
    console.error(
      `Cấu trúc dữ liệu không hợp lệ cho người dùng ${userId}:`,
      data
    );
    return null;
  } catch (error) {
    console.error(`Lỗi fetch chi tiết người dùng ${userId}:`, error);
    return null;
  }
}

const getVietnameseEventStatus = (status: string): string => {
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case "APPROVED":
      return "Đã duyệt";
    case "PENDING":
      return "Chờ duyệt";
    case "REJECTED":
      return "Đã từ chối";
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
  const organizerDetailsCacheRef = useRef<Record<string, OrganizerInfo>>({});

  const callOnEventNeedsRefresh = useCallback(() => {
    if (typeof onEventNeedsRefresh === 'function') {
      onEventNeedsRefresh();
    } else {
      console.warn("MyEventsTabContent: prop 'onEventNeedsRefresh' is not a function or was not provided by the parent component.");
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
          console.warn("Could not parse delete response body");
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
      let needsUpdate = false;
      const newOrganizers = event.organizers ? [...event.organizers] : [];
      const newParticipants = event.participants ? [...event.participants] : [];

      if (event.organizers) {
        for (let i = 0; i < newOrganizers.length; i++) {
          let org = newOrganizers[i];
          if (!org.fullName && org.userId) {
            if (organizerDetailsCacheRef.current[org.userId]) {
              org = { ...org, ...organizerDetailsCacheRef.current[org.userId] };
            } else {
              const details = await fetchUserDetailsAPI(org.userId);
              if (details) {
                organizerDetailsCacheRef.current[org.userId] = details;
                org = { ...org, ...details };
              }
            }
            newOrganizers[i] = org;
            needsUpdate = true;
          }
        }
      }
      if (event.participants) {
        for (let i = 0; i < newParticipants.length; i++) {
          let participant = newParticipants[i];
          if (!participant.fullName && participant.userId) {
            if (organizerDetailsCacheRef.current[participant.userId]) {
              participant = {
                ...participant,
                ...organizerDetailsCacheRef.current[participant.userId],
              };
            } else {
              const details = await fetchUserDetailsAPI(participant.userId);
              if (details) {
                organizerDetailsCacheRef.current[participant.userId] = details;
                participant = { ...participant, ...details };
              }
            }
            newParticipants[i] = participant;
            needsUpdate = true;
          }
        }
      }

      if (needsUpdate) {
        return {
          ...event,
          organizers: newOrganizers,
          participants: newParticipants,
        };
      }
      return event;
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

  const renderEventDetails = (event: EventType) => {
    const isDeletedEvent = event.deleted;
    const descriptionToShow =
      event.description || event.content || event.purpose;
    const eventName = event.name || event.title;
    const vietnameseStatus = event.status
      ? getVietnameseEventStatus(event.status)
      : "";

    const formatPersonDetails = (person: OrganizerInfo | ParticipantInfo) => {
        const name = person.fullName || `${person.lastName || ""} ${person.firstName || ""}`.trim() || `ID: ${person.userId}`;
        const parts = [name];
        if (person.positionName) {
            parts.push(person.positionName);
        }
        if (person.roleName) {
            parts.push(person.roleName);
        }
        return parts.join(" - ");
    };

    return (
      <div className="p-4 flex-grow overflow-y-auto mb-4 pr-2 bg-white rounded-lg shadow border">
        <button
          onClick={() => setViewingEventDetails(null)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" /> Quay lại
        </button>
        {isLoadingEventDetailsEnhancement && (
          <p className="text-center text-gray-500 py-4">
            Đang tải chi tiết...
          </p>
        )}
        {!isLoadingEventDetailsEnhancement && viewingEventDetails && (
          <>
            <div className="flex items-start gap-4 mb-4">
              {viewingEventDetails.avatarUrl ? (
                <Image
                  src={viewingEventDetails.avatarUrl}
                  alt={`Avatar cho ${eventName}`}
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-lg object-cover border p-0.5 bg-gray-100 shadow-sm flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-3xl font-semibold border flex-shrink-0">
                  {eventName?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-800 mb-1">
                  {eventName}
                </h3>
                {!isDeletedEvent && viewingEventDetails.status && (
                  <p className="text-sm">
                    <strong className="font-medium text-gray-900">
                      Trạng thái:{" "}
                    </strong>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                        viewingEventDetails.status.toUpperCase() === "APPROVED"
                          ? "bg-green-100 text-green-700"
                          : viewingEventDetails.status.toUpperCase() ===
                            "PENDING"
                          ? "bg-yellow-100 text-yellow-700"
                          : viewingEventDetails.status.toUpperCase() ===
                            "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {vietnameseStatus}
                    </span>
                  </p>
                )}
                {isDeletedEvent && (
                  <p className="text-red-600 font-semibold text-sm mt-1">
                    <ExclamationTriangleIcon className="inline-block mr-1 h-4 w-4" />
                    Đã bị xóa.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              {isDeletedEvent && viewingEventDetails.deletedAt && (
                <p>
                  <strong className="font-medium text-gray-900 w-28 inline-block">
                    Thời gian xóa:{" "}
                  </strong>
                  {new Date(viewingEventDetails.deletedAt).toLocaleString(
                    "vi-VN",
                    { dateStyle: "full", timeStyle: "short" }
                  )}
                </p>
              )}
              {isDeletedEvent && viewingEventDetails.deletedBy && (
                <p>
                  <strong className="font-medium text-gray-900 w-28 inline-block">
                    Người xóa:{" "}
                  </strong>
                  {viewingEventDetails.deletedBy.lastName}{" "}
                  {viewingEventDetails.deletedBy.firstName} (
                  {viewingEventDetails.deletedBy.username}){" "}
                  {viewingEventDetails.deletedBy.avatar && (
                    <img
                      src={viewingEventDetails.deletedBy.avatar}
                      alt="Avatar"
                      className="inline-block ml-2 h-5 w-5 rounded-full"
                    />
                  )}
                </p>
              )}
              {(viewingEventDetails.time || viewingEventDetails.date) && (
                <p>
                  <strong className="font-medium text-gray-900 w-28 inline-block">
                    Thời gian:{" "}
                  </strong>
                  {new Date(
                    viewingEventDetails.time || viewingEventDetails.date!
                  ).toLocaleString("vi-VN", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}
                </p>
              )}
              {viewingEventDetails.location && (
                <p>
                  <strong className="font-medium text-gray-900 w-28 inline-block">
                    Địa điểm:{" "}
                  </strong>
                  {viewingEventDetails.location}
                </p>
              )}
              {!isDeletedEvent && viewingEventDetails.purpose && (
                <p>
                  <strong className="font-medium text-gray-900 w-28 inline-block">
                    Mục đích:{" "}
                  </strong>
                  {viewingEventDetails.purpose}
                </p>
              )}
              {!isDeletedEvent &&
                (descriptionToShow ||
                  (mainTab === "myEvents" && viewingEventDetails.content)) && (
                  <p>
                    <strong className="font-medium text-gray-900 w-28 inline-block align-top">
                      {mainTab === "myEvents" || viewingEventDetails.content
                        ? "Nội dung:"
                        : "Mô tả:"}
                    </strong>
                    <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-7rem)]">
                      {mainTab === "myEvents"
                        ? viewingEventDetails.content
                        : descriptionToShow}
                    </span>
                  </p>
                )}
                
              {!isDeletedEvent && viewingEventDetails.organizers && viewingEventDetails.organizers.length > 0 && (
                <div className="pt-2">
                  <strong className="font-medium text-gray-900 w-28 inline-block align-top">Ban tổ chức:</strong>
                  <ul className="inline-block list-none pl-0 ml-1 max-w-[calc(100%-7.5rem)]">
                    {viewingEventDetails.organizers.map((organizer, index) => (
                      <li key={organizer.userId || index} className="mb-1 text-sm text-gray-600">
                        {formatPersonDetails(organizer)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isDeletedEvent && viewingEventDetails.participants && viewingEventDetails.participants.length > 0 && (
                 <div className="pt-2">
                    <strong className="font-medium text-gray-900 w-28 inline-block align-top">Người tham dự:</strong>
                    <ul className="inline-block list-none pl-0 ml-1 max-w-[calc(100%-7.5rem)]">
                        {viewingEventDetails.participants.map((participant, index) => (
                            <li key={participant.userId || index} className="mb-1 text-sm text-gray-600">
                                {formatPersonDetails(participant)}
                            </li>
                        ))}
                    </ul>
                 </div>
              )}

             
              
              
            
              


            
              {viewingEventDetails.createdAt && (
                <p>
                  <strong className="font-medium text-gray-900 w-28 inline-block">
                    Ngày tạo:{" "}
                  </strong>
                  {new Date(viewingEventDetails.createdAt).toLocaleString(
                    "vi-VN",
                    { dateStyle: "short", timeStyle: "short" }
                  )}
                </p>
              )}
            </div>
            <div className="mt-6 pt-4 border-t flex flex-wrap justify-end gap-3">
              {mainTab === "myEvents" && !isDeletedEvent && (
                <>
                  <button
                    onClick={() => handleOpenUpdateModal(viewingEventDetails)}
                    disabled={
                      deletingEventId === viewingEventDetails.id ||
                      restoringEventId === viewingEventDetails.id
                    }
                    className={`bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                      deletingEventId === viewingEventDetails.id ||
                      restoringEventId === viewingEventDetails.id
                        ? "opacity-50 cursor-wait"
                        : ""
                    }`}
                  >
                    <Pencil1Icon className="h-4 w-4 mr-2" /> Chỉnh sửa
                  </button>
                  <button
                    onClick={() => handleDeleteClick(viewingEventDetails)}
                    disabled={
                      deletingEventId === viewingEventDetails.id ||
                      restoringEventId === viewingEventDetails.id
                    }
                    className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                      deletingEventId === viewingEventDetails.id ||
                      restoringEventId === viewingEventDetails.id
                        ? "opacity-50 cursor-wait"
                        : ""
                    }`}
                  >
                    {deletingEventId === viewingEventDetails.id ? (
                      <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <TrashIcon className="h-4 w-4 mr-2" />
                    )}
                    {deletingEventId === viewingEventDetails.id
                      ? "Đang xóa..."
                      : "Xóa sự kiện"}
                  </button>
                </>
              )}
              {mainTab === "myEvents" && isDeletedEvent && (
                <button
                  onClick={() => handleRestoreClick(viewingEventDetails)}
                  disabled={restoringEventId === viewingEventDetails.id}
                  className={`bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                    restoringEventId === viewingEventDetails.id
                      ? "opacity-50 cursor-wait"
                      : ""
                  }`}
                >
                  {restoringEventId === viewingEventDetails.id ? (
                    <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArchiveIcon className="h-4 w-4 mr-2" />
                  )}
                  {restoringEventId === viewingEventDetails.id
                    ? "Đang khôi phục..."
                    : "Khôi phục sự kiện"}
                </button>
              )}
              {mainTab === "myEvents" &&
                !isDeletedEvent &&
                viewingEventDetails.status === "APPROVED" && (
                  <button
                    onClick={() => handleExportClick(viewingEventDetails.id)}
                    disabled={
                      isExporting ||
                      deletingEventId === viewingEventDetails.id ||
                      restoringEventId === viewingEventDetails.id
                    }
                    className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                      isExporting ||
                      deletingEventId === viewingEventDetails.id ||
                      restoringEventId === viewingEventDetails.id
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer"
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