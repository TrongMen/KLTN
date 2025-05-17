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
import {
  ApiRole,
  EventDataForForm as ModalEventType,
} from "../types/typCreateEvent";

import ConfirmationDialog from "../../../utils/ConfirmationDialog";
import MyCreatedEventsTab, {
  EventType as MyCreatedEventType,
} from "./event/MyEvent";
import RegisteredEventsTab from "./event/RegisterEvent";
import {
  ReloadIcon,
  DownloadIcon,
  Pencil1Icon,
  TrashIcon,
  ArchiveIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  CalendarIcon as RadixCalendarIcon,
} from "@radix-ui/react-icons";


interface Role {
  id: string;
  name?: string;
}

export interface PersonDetail {
  userId: string;
  id?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: string;
  positionId?: string;
  positionName?: string;
  roles?: Role[];
  generalRoleName?: string;
}

export interface EventType {
  id: string;
  name: string;
  time?: string;
  location?: string;
  content?: string;
  description?: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string ;
  rejectionReason?: string | null;
  purpose?: string;
  createdBy?: string | PersonDetail;
  createdAt?: string;
  organizers?: PersonDetail[];
  participants?: PersonDetail[];
  attendees?: any[];
  permissions?: string[];
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: PersonDetail | null;
  avatarUrl?: string | null;
  qrCodeUrl?: string | null;
  progressStatus?: string;
  title?: string;
  date?: string;
  maxAttendees?: number |null;
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
        filename = decodeURIComponent(escape(filename));
      }
    } catch (e) {
      try {
        filename = decodeURIComponent(filename);
      } catch (e2) {
        console.warn("Could not decode filename:", filename, e, e2);
      }
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
): Promise<Partial<PersonDetail> | null> {
  if (!userId) return null;
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/notoken/${userId}`
    );
    if (!response.ok) {
      console.warn(
        `Failed to fetch user details for ${userId}: ${response.status}`
      );
      return { userId, fullName: `ID: ${userId}` };
    }
    const data = await response.json();
    if (data.code === 1000 && data.result) {
      const {
        firstName,
        lastName,
        username,
        id,
        position,
        roles: generalRoles,
      } = data.result;
      const fullName =
        `${lastName || ""} ${firstName || ""}`.trim() ||
        username ||
        `ID: ${id}`;
      return {
        userId: userId,
        id: id,
        firstName,
        lastName,
        username,
        fullName,
        positionName: position?.name,
        avatar: data.result.avatar,
        generalRoleName:
          generalRoles && generalRoles.length > 0
            ? generalRoles[0].description || generalRoles[0].name
            : undefined,
      };
    }
    console.warn(
      `User details API for ${userId} did not return expected data:`,
      data.message
    );
    return { userId, fullName: `ID: ${userId}` };
  } catch (error) {
    console.error(`Error fetching user details for ${userId}:`, error);
    return { userId, fullName: `ID: ${userId}` };
  }
}

const getVietnameseEventStatus = (status?: string): string => {
  if (!status) return "Không xác định";
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
  onOpenUpdateModal: (eventForModal: ModalEventType) => void;
  refreshToken: () => Promise<string | null>;
}

const MyEventsTabContent: React.FC<MyEventsTabContentProps> = ({
  user,
  initialRegisteredEventIds,
  isLoadingRegisteredIds,
  createdEventIdsFromParent,
  onRegistrationChange,
  onEventNeedsRefresh,
  onOpenUpdateModal: openModalCallback,
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
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [allSystemRoles, setAllSystemRoles] = useState<ApiRole[]>([]);
  const [isLoadingSystemRoles, setIsLoadingSystemRoles] =
    useState<boolean>(true);

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
  const personDetailsCacheRef = useRef<Record<string, Partial<PersonDetail>>>(
    {}
  );
  const [enhancementController, setEnhancementController] =
    useState<AbortController | null>(null);
  const [isEnhancementPending, setIsEnhancementPending] = useState(false);
  const [lastActiveMyCreatedSubTabKey, setLastActiveMyCreatedSubTabKey] = useState<string | null>(null);


  const transformApiEventMemberToLocal = useCallback(
    (apiMember: any): PersonDetail => {
      const rolesArray: Role[] = [];
      if (apiMember.roleId && allSystemRoles.length > 0) {
        const foundRole = allSystemRoles.find((r) => r.id === apiMember.roleId);
        if (foundRole)
          rolesArray.push({ id: foundRole.id, name: foundRole.name });
      } else if (apiMember.roleName) {
        rolesArray.push({
          id:
            apiMember.roleId ||
            apiMember.roleName.toLowerCase().replace(/\s+/g, "-"),
          name: apiMember.roleName,
        });
      }

      return {
        userId: apiMember.userId,
        firstName: apiMember.firstName,
        lastName: apiMember.lastName,
        fullName:
          apiMember.fullName ||
          `${apiMember.lastName || ""} ${apiMember.firstName || ""}`.trim() ||
          apiMember.username,
        username: apiMember.username,
        positionId: apiMember.positionId,
        positionName: apiMember.positionName,
        roles: rolesArray,
      };
    },
    [allSystemRoles]
  );

  useEffect(() => {
    const fetchRoles = async () => {
      setIsLoadingSystemRoles(true);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Chưa xác thực để tải vai trò.");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/organizerrole`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Lỗi tải vai trò (${response.status})`
          );
        }
        const data = await response.json();
        if (data.code === 1000 && Array.isArray(data.result))
          setAllSystemRoles(data.result);
        else
          throw new Error(data.message || "Không thể tải danh sách vai trò.");
      } catch (error: any) {
        toast.error(`Lỗi tải vai trò hệ thống: ${error.message}`);
        setAllSystemRoles([]);
      } finally {
        setIsLoadingSystemRoles(false);
      }
    };
    fetchRoles();
  }, []);

  const callOnEventNeedsRefresh = useCallback(() => {
    if (typeof onEventNeedsRefresh === "function") onEventNeedsRefresh();
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/creator/${currentUserId}`,
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
        const transformedEvents = data.result.map((event: any) => ({
          ...event,
          organizers:
            event.organizers?.map(transformApiEventMemberToLocal) || [],
          participants:
            event.participants?.map(transformApiEventMemberToLocal) || [],
        }));
        setMyEvents(transformedEvents);
      } else {
        setMyEvents([]);
        if (data.message) setMyError(data.message);
      }
    } catch (err: any) {
      setMyError(err.message || "Lỗi tải sự kiện của bạn");
      setMyEvents([]);
    } finally {
      setMyLoading(false);
    }
  }, [currentUserId, transformApiEventMemberToLocal, allSystemRoles]);

  const fetchDeletedEvents = useCallback(
    async (page = 0, size = 20) => {
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
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/deleted?page=${page}&size=${size}&sort=deletedAt,desc`,
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
          const transformedEvents = data.result.content.map((event: any) => ({
            ...event,
            organizers:
              event.organizers?.map(transformApiEventMemberToLocal) || [],
            participants:
              event.participants?.map(transformApiEventMemberToLocal) || [],
          }));
          setDeletedEvents(transformedEvents);
        } else {
          setDeletedEvents([]);
          if (data.message) setDeletedError(data.message);
        }
      } catch (err: any) {
        setDeletedError(err.message || "Lỗi tải sự kiện đã xóa");
        setDeletedEvents([]);
      } finally {
        setDeletedLoading(false);
      }
    },
    [currentUserId, transformApiEventMemberToLocal, allSystemRoles]
  );

  useEffect(() => {
    if (user?.id && !isLoadingSystemRoles) {
      fetchMyEvents();
      fetchDeletedEvents();
    } else if (!user?.id) {
      setMyLoading(false);
      setDeletedLoading(false);
      setMyEvents([]);
      setDeletedEvents([]);
    }
  }, [user, fetchMyEvents, fetchDeletedEvents, isLoadingSystemRoles]);

  const handleRefreshLocal = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const toastId = toast.loading("Đang làm mới dữ liệu...");
    try {
      if (!currentUserId)
        throw new Error("Không tìm thấy thông tin người dùng.");
      if (isLoadingSystemRoles) {
      }
      await Promise.all([fetchMyEvents(), fetchDeletedEvents()]);
      toast.success("Dữ liệu đã được làm mới!", { id: toastId });
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
    isLoadingSystemRoles,
  ]);

  const handleOpenUpdateModal = (eventFromMyCreatedTab: MyCreatedEventType) => {
    if (deletingEventId || restoringEventId) return;
    const organizersForModal: ModalEventType["organizers"] =
      eventFromMyCreatedTab.organizers?.map((org) => ({
        userId: org.userId,
        roleId: org.roles?.[0]?.id || "",
        roleName: org.roles?.[0]?.name || "",
        positionId: org.positionId || "",
        name:
          org.fullName ||
          `${org.lastName || ""} ${org.firstName || ""}`.trim() ||
          org.username,
      })) || [];

    const participantsForModal: ModalEventType["participants"] =
      eventFromMyCreatedTab.participants?.map((par) => ({
        userId: par.userId,
        roleId: par.roles?.[0]?.id || "",
        roleName: par.roles?.[0]?.name || "",
        positionId: par.positionId || "",
        name:
          par.fullName ||
          `${par.lastName || ""} ${par.firstName || ""}`.trim() ||
          par.username,
      })) || [];

    const eventForModal: ModalEventType = {
      id: eventFromMyCreatedTab.id,
      name: eventFromMyCreatedTab.name,
      purpose: eventFromMyCreatedTab.purpose || "",
      time: eventFromMyCreatedTab.time || "",
      location: eventFromMyCreatedTab.location || "",
      content: eventFromMyCreatedTab.content || "",
      maxAttendees: eventFromMyCreatedTab.maxAttendees ?? null,
      status: eventFromMyCreatedTab.status as ModalEventType["status"],
      avatarUrl: eventFromMyCreatedTab.avatarUrl,
      organizers: organizersForModal,
      participants: participantsForModal,
    };
    openModalCallback(eventForModal);
  };

  const executeDeleteEvent = async (eventToDelete: EventType) => {
    if (deletingEventId || !currentUserId) {
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
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventToDelete.id}?deletedById=${currentUserId}`;
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
        } catch (e) {}
      }
      toast.success(messageAPI);

      const deletedEventData: EventType = {
        ...eventToDelete,
        deleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: {
          userId: currentUserId,
          id: user?.id,
          username: user?.username,
          firstName: user?.firstName,
          lastName: user?.lastName,
          avatar: user?.avatar,
          fullName: user
            ? `${user.lastName || ""} ${user.firstName || ""}`.trim() ||
              user.username
            : "N/A",
        },
      };
      setMyEvents((prev) =>
        prev.filter((event) => event.id !== eventToDelete.id)
      );
      setDeletedEvents((prev) =>
        [deletedEventData, ...prev].sort(
          (a, b) =>
            new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime()
        )
      );
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
          ?<br />
          <span className="text-xs text-gray-500">
            (Hành động này có thể khôi phục trong tab Đã xóa)
          </span>
        </>
      ),
      onConfirm: () => {
        setDeleteConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
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
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventToRestore.id}/restore`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const apiResponse = await res.json();
      if (!res.ok) {
        const errorMessage = apiResponse?.message || "Khôi phục thất bại";
        throw new Error(`${errorMessage} (${res.status})`);
      }
      if (apiResponse.code === 1000 && apiResponse.result) {
        toast.success(
          apiResponse.message ||
            `Khôi phục sự kiện "${
              apiResponse.result.name || eventToRestore.name
            }" thành công!`
        );
        setDeletedEvents((prev) =>
          prev.filter((event) => event.id !== eventToRestore.id)
        );

        const restoredEventFromApi: EventType = {
          ...apiResponse.result,
          deleted: false,
          deletedAt: null,
          deletedBy: null,
          organizers:
            apiResponse.result.organizers?.map(
              transformApiEventMemberToLocal
            ) || [],
          participants:
            apiResponse.result.participants?.map(
              transformApiEventMemberToLocal
            ) || [],
        };
        setMyEvents((prevMyEvents) =>
          [restoredEventFromApi, ...prevMyEvents].sort(
            (a, b) =>
              new Date(b.createdAt!).getTime() -
              new Date(a.createdAt!).getTime()
          )
        );
        if (viewingEventDetails?.id === eventToRestore.id) {
          setViewingEventDetails(null);
        }
        callOnEventNeedsRefresh();
      } else {
        throw new Error(
          apiResponse.message ||
            "Dữ liệu trả về từ API không hợp lệ sau khi khôi phục."
        );
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
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventId}/export`;
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
        } catch (e) {}
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

  const formatPersonForDisplay = useCallback(
    (person?: string | PersonDetail): string => {
      if (!person) return "Không rõ";
      if (typeof person === "string") return `ID: ${person}`;

      let displayName =
        person.fullName ||
        `${person.lastName || ""} ${person.firstName || ""}`.trim() ||
        person.username;
      if (!displayName && person.userId) displayName = `ID: ${person.userId}`;
      else if (!displayName) displayName = "Thông tin không rõ";

      const parts: string[] = [displayName];
      if (person.positionName) parts.push(person.positionName);

      if (person.roles && person.roles.length > 0) {
        const roleNamesString = person.roles
          .map((role) => role.name)
          .filter(
            (name) =>
              name &&
              name.toUpperCase() !== "GUEST" &&
              name.toUpperCase() !== "USER"
          )
          .join(", ");
        if (roleNamesString) parts.push(roleNamesString);
      } else if (person.generalRoleName) {
        parts.push(person.generalRoleName);
      }

      const finalParts = parts.filter(
        (part) =>
          part &&
          part.trim() !== "" &&
          part.toLowerCase() !== "không rõ" &&
          part.toLowerCase() !== "n/a"
      );
      if (finalParts.length === 0 && person.userId)
        return `ID: ${person.userId}`;
      if (finalParts.length === 0 && !person.userId)
        return "Thông tin không đầy đủ";

      return Array.from(new Set(finalParts)).join(" - ");
    },
    []
  );

  const enhanceEventDetailsWithNames = useCallback(
    async (event: EventType): Promise<EventType> => {
      if (!event) return event;
      let isModified = false;

      const enhanceList = async (
        list: PersonDetail[] | undefined
      ): Promise<PersonDetail[]> => {
        if (!list || list.length === 0) return [];
        const enhancedList = await Promise.all(
          list.map(async (person) => {
            let enrichedPerson = { ...person };
            if (
              person.userId &&
              !person.fullName &&
              (!person.firstName || !person.lastName)
            ) {
              let details: Partial<PersonDetail> | null = null;
              if (personDetailsCacheRef.current[person.userId]) {
                details = personDetailsCacheRef.current[person.userId];
              } else {
                details = await fetchUserDetailsAPI(person.userId);
                if (details)
                  personDetailsCacheRef.current[person.userId] = details;
              }
              if (details) {
                enrichedPerson = { ...enrichedPerson, ...details };
                isModified = true;
              }
            }
            if (enrichedPerson.roles && enrichedPerson.roles.length > 0) {
              enrichedPerson.roles = enrichedPerson.roles.map((role) => {
                if (role.id && !role.name && allSystemRoles.length > 0) {
                  const systemRole = allSystemRoles.find(
                    (sr) => sr.id === role.id
                  );
                  if (systemRole) {
                    isModified = true;
                    return { ...role, name: systemRole.name };
                  }
                }
                return role;
              });
            }
            return enrichedPerson;
          })
        );
        return enhancedList;
      };

      const newOrganizers = await enhanceList(event.organizers);
      const newParticipants = await enhanceList(event.participants);

      let newCreatedByDetail: string | PersonDetail | undefined =
        event.createdBy;
      if (typeof event.createdBy === "string" && event.createdBy) {
        if (personDetailsCacheRef.current[event.createdBy]) {
          newCreatedByDetail = personDetailsCacheRef.current[event.createdBy]!;
        } else {
          const details = await fetchUserDetailsAPI(event.createdBy);
          if (details) {
            personDetailsCacheRef.current[event.createdBy] = details;
            newCreatedByDetail = details;
            isModified = true;
          }
        }
      }

      if (isModified) {
        return {
          ...event,
          organizers: newOrganizers,
          participants: newParticipants,
          createdBy: newCreatedByDetail,
        };
      }
      return event;
    },
    [allSystemRoles]
  );

  const handleSetViewingEventDetails = useCallback(
    (event: EventType | null, activeSubTabKeyFromChild?: string) => {
      if (enhancementController) {
        enhancementController.abort();
        setEnhancementController(null);
      }
      setIsLoadingEventDetailsEnhancement(false);
      setIsEnhancementPending(false);

      if (event) {
        if (activeSubTabKeyFromChild) {
          setLastActiveMyCreatedSubTabKey(activeSubTabKeyFromChild);
        }

        setViewingEventDetails(event);
        setIsLoadingEventDetailsEnhancement(true);
        setIsEnhancementPending(true);

        const newController = new AbortController();
        setEnhancementController(newController);

        if (!isLoadingSystemRoles) {
          (async () => {
            try {
              const enhancedEvent = await enhanceEventDetailsWithNames(event);
              if (!newController.signal.aborted) {
                setViewingEventDetails(enhancedEvent);
                setIsEnhancementPending(false);
              }
            } catch (error: any) {
              if (error.name !== "AbortError" && !newController.signal.aborted) {
                console.error("Lỗi khi làm giàu chi tiết sự kiện:", error);
              }
            } finally {
              if (!newController.signal.aborted) {
                setIsLoadingEventDetailsEnhancement(false);
                if (enhancementController === newController) {
                    setEnhancementController(null);
                }
              }
            }
          })();
        }
      } else {
        setViewingEventDetails(null);
        // lastActiveMyCreatedSubTabKey is not reset here
      }
    },
    [enhanceEventDetailsWithNames, isLoadingSystemRoles, enhancementController]
  );

  useEffect(() => {
    if (viewingEventDetails && isEnhancementPending && !isLoadingSystemRoles) {
      setIsLoadingEventDetailsEnhancement(true);
      const controller = new AbortController();
      setEnhancementController(controller);
      (async () => {
        try {
          const reEnhancedEvent = await enhanceEventDetailsWithNames(
            viewingEventDetails
          );
          if (
            !controller.signal.aborted &&
            viewingEventDetails &&
            viewingEventDetails.id === reEnhancedEvent.id
          ) {
            setViewingEventDetails(reEnhancedEvent);
          }
        } catch (error: any) {
          if (error.name !== "AbortError" && !controller.signal.aborted) {
            console.error("Lỗi khi làm giàu lại chi tiết sự kiện:", error);
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoadingEventDetailsEnhancement(false);
            setIsEnhancementPending(false);
            if (enhancementController === controller) {
                setEnhancementController(null);
            }
          }
        }
      })();
    } else if (isEnhancementPending && !isLoadingSystemRoles) {
      setIsLoadingEventDetailsEnhancement(false);
      setIsEnhancementPending(false);
    }
  }, [
    allSystemRoles,
    isLoadingSystemRoles,
    viewingEventDetails,
    isEnhancementPending,
    enhanceEventDetailsWithNames,
  ]);


  const renderEventDetails = (event: EventType) => {
    if (
      isLoadingEventDetailsEnhancement &&
      (!event.organizers?.every((o) => o.fullName) ||
      (typeof event.createdBy === 'string' && !personDetailsCacheRef.current[event.createdBy]?.fullName)
      )
    ) {
      return (
        <div className="p-4 bg-white rounded-lg shadow border text-center min-h-[400px] flex flex-col justify-center items-center">
          <button
            onClick={() => handleSetViewingEventDetails(null)}
            className="self-start mb-6 text-sm text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer group font-medium"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1.5 group-hover:-translate-x-1 transition-transform duration-150" />
            Quay lại
          </button>
          <ReloadIcon className="w-10 h-10 animate-spin text-indigo-500 mx-auto my-4" />
          <p>Đang tải chi tiết...</p>
        </div>
      );
    }
    if (!event) return null;

    const isDeletedEvent = event.deleted;
    const eventName = event.name || event.title || "Sự kiện không tên";
    const vietnameseStatus = getVietnameseEventStatus(event.status);
    let statusColorClass = "text-gray-600 bg-gray-200 border-gray-300";
    if (event.status) {
        const upperStatus = event.status.toUpperCase();
        if (upperStatus === "APPROVED") statusColorClass = "text-green-700 bg-green-100 border-green-300";
        else if (upperStatus === "PENDING") statusColorClass = "text-yellow-700 bg-yellow-100 border-yellow-300";
        else if (upperStatus === "REJECTED") statusColorClass = "text-red-700 bg-red-100 border-red-300";
        else if (upperStatus === "CANCELLED") statusColorClass = "text-neutral-700 bg-neutral-200 border-neutral-300";
    }

    let creatorDisplay = "Không rõ";
    if (event.createdBy) {
      if (typeof event.createdBy === "string") {
        const details = personDetailsCacheRef.current[event.createdBy];
        creatorDisplay = details?.fullName || `ID: ${event.createdBy}`;
      } else {
        creatorDisplay = formatPersonForDisplay(event.createdBy);
      }
    }
    if (creatorDisplay.startsWith("ID:") && creatorDisplay.length < 10)
      creatorDisplay = "Không rõ";

    return (
      <div className="p-4 bg-white rounded-lg shadow border">
        <button
          onClick={() => handleSetViewingEventDetails(null)}
          className="mb-6 text-sm text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer group font-medium"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1.5 group-hover:-translate-x-1 transition-transform duration-150" />
          Quay lại danh sách
        </button>
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
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
                {eventName}
              </h1>
              {!isDeletedEvent && event.status && (
                <div className="mb-5">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColorClass} border`}
                  >
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
                      <p className="font-semibold text-gray-800">
                        Thời gian diễn ra:
                      </p>
                      <p className="text-gray-600">
                        {new Date(event.time || event.date!).toLocaleString(
                          "vi-VN",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-800">Địa điểm:</p>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </div>
                )}
                {event.maxAttendees != null && (
                  <div className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.268-.25-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.268.25-1.857m0 0A5.002 5.002 0 0112 15a5.002 5.002 0 014.745 3.143M12 13a3 3 0 100-6 3 3 0 000 6z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Số lượng dự kiến:
                      </p>
                      <p className="text-gray-600">
                        {event.currentAttendeesCount ??
                          (event.attendees?.length || 0)}
                        / {event.maxAttendees}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(event.purpose || event.content) && !isDeletedEvent && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-xl font-semibold text-gray-800 mb-3">
                Chi tiết sự kiện
              </h4>
              {event.purpose && (
                <div className="mb-4">
                  <strong className="block font-medium text-gray-900 mb-1">
                    Mục đích:
                  </strong>
                  <p className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words p-3 bg-gray-50 rounded-md border">
                    {event.purpose}
                  </p>
                </div>
              )}
              {event.content && (
                <div className="mb-4">
                  <strong className="block font-medium text-gray-900 mb-1">
                    Nội dung:
                  </strong>
                  <p className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words p-3 bg-gray-50 rounded-md border">
                    {event.content}
                  </p>
                </div>
              )}
            </div>
          )}
          {!isDeletedEvent &&
            event.organizers &&
            event.organizers.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">
                  Ban tổ chức
                </h4>
                <ul className="space-y-2 text-sm">
                  {event.organizers.map((org, index) => (
                    <li
                      key={org.userId || `org-${index}`}
                      className="p-3 bg-gray-50 rounded-md border text-gray-700"
                    >
                      {formatPersonForDisplay(org)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {!isDeletedEvent &&
            event.participants &&
            event.participants.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">
                  Người tham dự (dự kiến)
                </h4>
                <ul className="space-y-2 text-sm">
                  {event.participants.map((par, index) => (
                    <li
                      key={par.userId || `par-${index}`}
                      className="p-3 bg-gray-50 rounded-md border text-gray-700"
                    >
                      {formatPersonForDisplay(par)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          {isDeletedEvent && event.deletedAt && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-xl font-semibold text-gray-800 mb-3">
                Thông tin xóa
              </h4>
              <p className="text-sm text-gray-600">
                <strong className="font-medium text-gray-900">
                  Thời gian xóa:
                </strong>
                {new Date(event.deletedAt).toLocaleString("vi-VN", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
              {event.deletedBy && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong className="font-medium text-gray-900">
                    Người xóa:
                  </strong>
                  {formatPersonForDisplay(event.deletedBy)}
                  {event.deletedBy.avatar && (
                    <img
                      src={event.deletedBy.avatar}
                      alt="Avatar người xóa"
                      className="inline-block ml-2 h-5 w-5 rounded-full"
                    />
                  )}
                </p>
              )}
            </div>
          )}
          {(creatorDisplay !== "Không rõ" || event.createdAt) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-xl font-semibold text-gray-800 mb-3">
                Thông tin khác
              </h4>
              {creatorDisplay !== "Không rõ" && (
                <p className="text-sm text-gray-700 mb-1">
                  <strong className="font-medium text-gray-900">
                    Tạo bởi:
                  </strong>
                  {creatorDisplay}
                </p>
              )}
              {event.createdAt && (
                <p className="text-sm text-gray-600">
                  <strong className="font-medium text-gray-900">
                    Ngày tạo:
                  </strong>
                  {new Date(event.createdAt).toLocaleString("vi-VN", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
          )}
          <div className="mt-10 pt-6 border-t-2 border-gray-300 flex flex-col sm:flex-row justify-end gap-3">
            {mainTab === "myEvents" &&
              !isDeletedEvent &&
              user?.id ===
                (typeof event.createdBy === "string"
                  ? event.createdBy
                  : event.createdBy?.userId) && (
                <>
                  <button
                    onClick={() =>
                      handleOpenUpdateModal(event as MyCreatedEventType)
                    }
                    disabled={
                      deletingEventId === event.id ||
                      restoringEventId === event.id
                    }
                    className={`w-full sm:w-auto bg-indigo-600 cursor-pointer hover:bg-indigo-700 text-white px-4 py-2.5 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors ${
                      deletingEventId === event.id ||
                      restoringEventId === event.id
                        ? "opacity-50 cursor-wait"
                        : ""
                    }`}
                  >
                    <Pencil1Icon className="h-4 w-4 mr-2" /> Chỉnh sửa
                  </button>
                  <button
                    onClick={() => handleDeleteClick(event)}
                    disabled={
                      deletingEventId === event.id ||
                      restoringEventId === event.id
                    }
                    className={`w-full cursor-pointer sm:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors ${
                      deletingEventId === event.id ||
                      restoringEventId === event.id
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
            {mainTab === "myEvents" &&
              isDeletedEvent &&
              user?.id ===
                (typeof event.createdBy === "string"
                  ? event.createdBy
                  : event.createdBy?.userId) && (
                <button
                  onClick={() => handleRestoreClick(event)}
                  disabled={restoringEventId === event.id}
                  className={`w-full sm:w-auto cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2.5 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors ${
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
                  disabled={
                    isExporting ||
                    deletingEventId === event.id ||
                    restoringEventId === event.id
                  }
                  className={`w-full cursor-pointer sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-md text-sm font-medium flex items-center shadow-sm transition-colors ${
                    isExporting ||
                    deletingEventId === event.id ||
                    restoringEventId === event.id
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
              onClick={() => handleSetViewingEventDetails(null)}
              className="w-full cursor-pointer sm:w-auto px-6 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
            >
              Đóng
            </button>
          </div>
        </>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-3 md:p-5 bg-gray-50">
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => {
            setMainTab("myEvents");
            handleSetViewingEventDetails(null);
            // setLastActiveMyCreatedSubTabKey(null); // Uncomment if you want MyCreatedEventsTab to always default when "My Events" is clicked
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
            handleSetViewingEventDetails(null);
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
            viewingEventDetails={null}
            initialActiveSubTabKey={lastActiveMyCreatedSubTabKey}
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
            isCreatedByUser={(eventId) =>
              createdEventIdsFromParent.has(eventId)
            }
            isRegistered={(eventId) => initialRegisteredEventIds.has(eventId)}
            setViewingEventDetails={handleSetViewingEventDetails}
            onMainRefreshTrigger={callOnEventNeedsRefresh}
            isParentRefreshing={isRefreshing || myLoading || deletedLoading}
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
    </div>
  );
};

export default MyEventsTabContent;