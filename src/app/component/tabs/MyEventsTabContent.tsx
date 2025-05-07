"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import Image from "next/image"; // Đảm bảo đã import Image
import { User as MainUserType } from "../homeuser";
import UpdateEventModal from "../modals/UpdateEventModal";
import {
  ArrowLeftIcon,
  CheckIcon,
  Cross2Icon,
  CalendarIcon,
  Component1Icon,
  ListBulletIcon,
  MagnifyingGlassIcon,
  ReloadIcon,
  DownloadIcon,
  InfoCircledIcon,
  Pencil1Icon,
  CheckCircledIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ArchiveIcon,
  PinTopIcon,
  PinBottomIcon,
} from "@radix-ui/react-icons";

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
  organizers?: { userId: string; [key: string]: any }[];
  participants?: {
    userId: string;
    roleId?: string;
    roleName?: string;
    [key: string]: any;
  }[];
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
  avatarUrl?: string | null; // Đã có trường này
  qrCodeUrl?: string | null;
  progressStatus?: string;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger" | "warning";
}

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

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
    let b =
      "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger") {
      b +=
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    } else if (confirmVariant === "warning") {
      b +=
        "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400 cursor-pointer";
    } else {
      b +=
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
    }
    return b;
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
            confirmVariant === "danger"
              ? "text-red-700"
              : confirmVariant === "warning"
              ? "text-yellow-700"
              : "text-gray-800"
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

interface MyEventsProps {
  user: MainUserType | null;
  initialRegisteredEventIds: Set<string>;
  isLoadingRegisteredIds: boolean;
  onRegistrationChange: (eventId: string, registered: boolean) => void;
}

const MyEventsTabContent: React.FC<MyEventsProps> = ({
  user,
  initialRegisteredEventIds,
  isLoadingRegisteredIds: isLoadingRegisteredIdsProp,
  onRegistrationChange,
}) => {
  const [mainTab, setMainTab] = useState<"myEvents" | "registerEvents">(
    "myEvents"
  );
  const [myTab, setMyTab] = useState<
    "approved" | "pending" | "rejected" | "deleted"
  >("approved");
  const [myEvents, setMyEvents] = useState<EventType[]>([]);
  const [myLoading, setMyLoading] = useState<boolean>(true);
  const [myError, setMyError] = useState<string>("");
  const [mySearchTerm, setMySearchTerm] = useState("");
  const [mySortOrder, setMySortOrder] = useState<"az" | "za">("az");
  const [myTimeFilterOption, setMyTimeFilterOption] = useState<
    "all" | "today" | "thisWeek" | "thisMonth" | "dateRange"
  >("all");
  const [myStartDateFilter, setMyStartDateFilter] = useState<string>("");
  const [myEndDateFilter, setMyEndDateFilter] = useState<string>("");
  const [myViewMode, setMyViewMode] = useState<"card" | "list">("card");

  const [deletedEvents, setDeletedEvents] = useState<EventType[]>([]);
  const [deletedLoading, setDeletedLoading] = useState<boolean>(true);
  const [deletedError, setDeletedError] = useState<string>("");
  const [deletedSearchTerm, setDeletedSearchTerm] = useState("");
  const [deletedSortOrder, setDeletedSortOrder] = useState<"az" | "za">("az");
  const [deletedTimeFilterOption, setDeletedTimeFilterOption] = useState<
    "all" | "today" | "thisWeek" | "thisMonth" | "dateRange"
  >("all");
  const [deletedStartDateFilter, setDeletedStartDateFilter] =
    useState<string>("");
  const [deletedEndDateFilter, setDeletedEndDateFilter] = useState<string>("");
  const [deletedViewMode, setDeletedViewMode] = useState<"card" | "list">(
    "card"
  );
  const [restoringEventId, setRestoringEventId] = useState<string | null>(null);
  const [restoreConfirmationState, setRestoreConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger" | "warning";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deleteConfirmationState, setDeleteConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger" | "warning";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [eventToEdit, setEventToEdit] = useState<EventType | null>(null);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [registerTab, setRegisterTab] = useState<"available" | "registered">(
    "available"
  );
  const [registerAvailableEvents, setRegisterAvailableEvents] = useState<
    EventType[]
  >([]);
  const [registerIsLoading, setRegisterIsLoading] = useState<boolean>(true);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isLoadingRegisteredIds, setIsLoadingRegisteredIds] = useState<boolean>(
    isLoadingRegisteredIdsProp
  );
  const [registerIsSubmitting, setRegisterIsSubmitting] = useState<
    string | "batch_unregister" | null
  >(null);
  const [registerSelectedToUnregister, setRegisterSelectedToUnregister] =
    useState<Set<string>>(new Set());
  const [registerConfirmationState, setRegisterConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });
  const [registerSearchTerm, setRegisterSearchTerm] = useState("");
  const [registerSortOrder, setRegisterSortOrder] = useState<"az" | "za">("az");
  const [registerTimeFilter, setRegisterTimeFilter] = useState<
    "all" | "today" | "thisWeek" | "thisMonth" | "dateRange"
  >("all");
  const [registerStartDateFilter, setRegisterStartDateFilter] =
    useState<string>("");
  const [registerEndDateFilter, setRegisterEndDateFilter] =
    useState<string>("");
  const [registerViewMode, setRegisterViewMode] = useState<"list" | "card">(
    "list"
  );
  const [viewingEventDetails, setViewingEventDetails] =
    useState<EventType | null>(null);
  const currentUserId = user?.id ?? null;

  useEffect(() => {
    setIsLoadingRegisteredIds(isLoadingRegisteredIdsProp);
  }, [isLoadingRegisteredIdsProp]);

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
      const eventsRes = await fetch(
        `http://localhost:8080/identity/api/events/creator/${currentUserId}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!eventsRes.ok) {
        const d = await eventsRes.json().catch(() => ({}));
        throw new Error(
          d?.message || `Lỗi tải sự kiện của bạn (${eventsRes.status})`
        );
      }
      const data = await eventsRes.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setMyEvents(data.result);
      } else {
        setMyEvents([]);
        console.warn("API /creator/ không trả về mảng event hợp lệ:", data);
      }
    } catch (err: any) {
      console.error("Lỗi tải sự kiện của bạn:", err);
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
        const deletedRes = await fetch(
          `http://localhost:8080/identity/api/events/deleted?page=${page}&size=${size}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );
        if (!deletedRes.ok) {
          const d = await deletedRes.json().catch(() => ({}));
          throw new Error(
            d?.message || `Lỗi tải sự kiện đã xóa (${deletedRes.status})`
          );
        }
        const data = await deletedRes.json();
        if (
          data.code === 1000 &&
          data.result &&
          Array.isArray(data.result.content)
        ) {
          setDeletedEvents(data.result.content);
        } else {
          setDeletedEvents([]);
          console.warn("API /deleted không trả về dữ liệu hợp lệ:", data);
        }
      } catch (err: any) {
        console.error("Lỗi tải sự kiện đã xóa:", err);
        setDeletedError(err.message || "Lỗi tải sự kiện đã xóa");
        setDeletedEvents([]);
      } finally {
        setDeletedLoading(false);
      }
    },
    [currentUserId]
  );

  const fetchRegisterAvailableEvents = useCallback(async () => {
    setRegisterIsLoading(true);
    setRegisterError(null);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        let m = `Lỗi tải sự kiện có sẵn`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(`${m} (${res.status})`);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setRegisterAvailableEvents(
          data.result.filter((event) => !event.deleted)
        );
      } else {
        setRegisterAvailableEvents([]);
        throw new Error(data.message || "Dữ liệu sự kiện có sẵn không hợp lệ");
      }
    } catch (err: any) {
      setRegisterError(
        err.message || "Lỗi không xác định khi tải sự kiện có sẵn"
      );
      setRegisterAvailableEvents([]);
    } finally {
      setRegisterIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchMyEvents();
      fetchDeletedEvents();
      fetchRegisterAvailableEvents();
    } else {
      setMyLoading(false);
      setDeletedLoading(false);
      setRegisterIsLoading(false);
      setMyEvents([]);
      setDeletedEvents([]);
      setRegisterAvailableEvents([]);
    }
  }, [user, fetchMyEvents, fetchDeletedEvents, fetchRegisterAvailableEvents]);

  const createdEventIds = useMemo(
    () => new Set(myEvents.map((e) => e.id)),
    [myEvents]
  );
  const isRegistered = useCallback(
    (eventId: string): boolean =>
      initialRegisteredEventIds?.has(eventId) ?? false,
    [initialRegisteredEventIds]
  );
  const isCreatedByUser = useCallback(
    (eventId: string): boolean => createdEventIds.has(eventId),
    [createdEventIds]
  );

  const processedMyEvents = useMemo(() => {
    let eventsToProcess = [...myEvents];
    eventsToProcess = eventsToProcess.filter((event) => {
      const s = event.status?.toUpperCase();
      if (myTab === "approved") return s === "APPROVED";
      if (myTab === "pending") return s === "PENDING";
      if (myTab === "rejected") return s === "REJECTED";
      return false;
    });
    if (myTimeFilterOption !== "all") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      eventsToProcess = eventsToProcess.filter((event) => {
        const dateStrToUse = event.time || event.createdAt;
        if (!dateStrToUse) return false;
        try {
          const eventDate = new Date(dateStrToUse);
          if (isNaN(eventDate.getTime())) return false;
          switch (myTimeFilterOption) {
            case "today":
              return eventDate >= todayStart && eventDate <= todayEnd;
            case "thisWeek":
              const { startOfWeek, endOfWeek } = getWeekRange(new Date());
              return eventDate >= startOfWeek && eventDate <= endOfWeek;
            case "thisMonth":
              const { startOfMonth, endOfMonth } = getMonthRange(new Date());
              return eventDate >= startOfMonth && eventDate <= endOfMonth;
            case "dateRange":
              if (!myStartDateFilter || !myEndDateFilter) return false;
              const start = new Date(myStartDateFilter);
              start.setHours(0, 0, 0, 0);
              const end = new Date(myEndDateFilter);
              end.setHours(23, 59, 59, 999);
              return (
                !isNaN(start.getTime()) &&
                !isNaN(end.getTime()) &&
                start <= end &&
                eventDate >= start &&
                eventDate <= end
              );
            default:
              return true;
          }
        } catch (e) {
          console.error("Lỗi parse ngày (My Events):", dateStrToUse, e);
          return false;
        }
      });
    }
    if (mySearchTerm.trim()) {
      const lowerSearchTerm = mySearchTerm.trim().toLowerCase();
      eventsToProcess = eventsToProcess.filter(
        (event) =>
          event.name.toLowerCase().includes(lowerSearchTerm) ||
          (event.location &&
            event.location.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (mySortOrder === "za") {
      eventsToProcess.sort((a, b) =>
        b.name.localeCompare(a.name, "vi", { sensitivity: "base" })
      );
    } else {
      eventsToProcess.sort((a, b) =>
        a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
      );
    }
    return eventsToProcess;
  }, [
    myEvents,
    myTab,
    myTimeFilterOption,
    myStartDateFilter,
    myEndDateFilter,
    mySearchTerm,
    mySortOrder,
  ]);

  const processedDeletedEvents = useMemo(() => {
    if (myTab !== "deleted") return [];
    let eventsToProcess = [...deletedEvents];
    if (deletedTimeFilterOption !== "all") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      eventsToProcess = eventsToProcess.filter((event) => {
        const dateStrToUse = event.deletedAt || event.time || event.createdAt;
        if (!dateStrToUse) return false;
        try {
          const eventDate = new Date(dateStrToUse);
          if (isNaN(eventDate.getTime())) return false;
          switch (deletedTimeFilterOption) {
            case "today":
              return eventDate >= todayStart && eventDate <= todayEnd;
            case "thisWeek":
              const { startOfWeek, endOfWeek } = getWeekRange(new Date());
              return eventDate >= startOfWeek && eventDate <= endOfWeek;
            case "thisMonth":
              const { startOfMonth, endOfMonth } = getMonthRange(new Date());
              return eventDate >= startOfMonth && eventDate <= endOfMonth;
            case "dateRange":
              if (!deletedStartDateFilter || !deletedEndDateFilter)
                return false;
              const start = new Date(deletedStartDateFilter);
              start.setHours(0, 0, 0, 0);
              const end = new Date(deletedEndDateFilter);
              end.setHours(23, 59, 59, 999);
              return (
                !isNaN(start.getTime()) &&
                !isNaN(end.getTime()) &&
                start <= end &&
                eventDate >= start &&
                eventDate <= end
              );
            default:
              return true;
          }
        } catch (e) {
          console.error("Lỗi parse ngày (Deleted Events):", dateStrToUse, e);
          return false;
        }
      });
    }
    if (deletedSearchTerm.trim()) {
      const lowerSearchTerm = deletedSearchTerm.trim().toLowerCase();
      eventsToProcess = eventsToProcess.filter(
        (event) =>
          event.name.toLowerCase().includes(lowerSearchTerm) ||
          (event.location &&
            event.location.toLowerCase().includes(lowerSearchTerm)) ||
          (event.deletedBy?.username &&
            event.deletedBy.username.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (deletedSortOrder === "za") {
      eventsToProcess.sort((a, b) =>
        b.name.localeCompare(a.name, "vi", { sensitivity: "base" })
      );
    } else {
      eventsToProcess.sort((a, b) =>
        a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
      );
    }
    return eventsToProcess;
  }, [
    deletedEvents,
    myTab,
    deletedTimeFilterOption,
    deletedStartDateFilter,
    deletedEndDateFilter,
    deletedSearchTerm,
    deletedSortOrder,
  ]);

  const processedRegisterEvents = useMemo(() => {
    let eventsToProcess = [...registerAvailableEvents];
    if (registerTimeFilter !== "all") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      eventsToProcess = eventsToProcess.filter((event) => {
        const dateStrToUse = event.time;
        if (!dateStrToUse) return false;
        try {
          const eventDate = new Date(dateStrToUse);
          if (isNaN(eventDate.getTime())) return false;
          switch (registerTimeFilter) {
            case "today":
              return eventDate >= todayStart && eventDate <= todayEnd;
            case "thisWeek":
              const { startOfWeek, endOfWeek } = getWeekRange(new Date());
              return eventDate >= startOfWeek && eventDate <= endOfWeek;
            case "thisMonth":
              const { startOfMonth, endOfMonth } = getMonthRange(new Date());
              return eventDate >= startOfMonth && eventDate <= endOfMonth;
            case "dateRange":
              if (!registerStartDateFilter || !registerEndDateFilter)
                return false;
              const start = new Date(registerStartDateFilter);
              start.setHours(0, 0, 0, 0);
              const end = new Date(registerEndDateFilter);
              end.setHours(23, 59, 59, 999);
              return (
                !isNaN(start.getTime()) &&
                !isNaN(end.getTime()) &&
                start <= end &&
                eventDate >= start &&
                eventDate <= end
              );
            default:
              return true;
          }
        } catch {
          return false;
        }
      });
    }
    if (registerSearchTerm.trim()) {
      const lowerSearchTerm = registerSearchTerm.trim().toLowerCase();
      eventsToProcess = eventsToProcess.filter(
        (event) =>
          event.name.toLowerCase().includes(lowerSearchTerm) ||
          (event.location &&
            event.location.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (registerTab === "available") {
      eventsToProcess = eventsToProcess.filter(
        (event) => !isRegistered(event.id) && !isCreatedByUser(event.id)
      );
    } else {
      eventsToProcess = eventsToProcess.filter((event) =>
        isRegistered(event.id)
      );
    }
    if (registerSortOrder === "za") {
      eventsToProcess.sort((a, b) =>
        b.name.localeCompare(a.name, "vi", { sensitivity: "base" })
      );
    } else {
      eventsToProcess.sort((a, b) =>
        a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
      );
    }
    return eventsToProcess;
  }, [
    registerAvailableEvents,
    registerTab,
    initialRegisteredEventIds,
    createdEventIds,
    registerTimeFilter,
    registerStartDateFilter,
    registerEndDateFilter,
    registerSearchTerm,
    registerSortOrder,
    isRegistered,
    isCreatedByUser,
  ]);

  const filteredRegisteredEventIdsForSelection = useMemo(
    () =>
      new Set(
        processedRegisterEvents
          .filter((e) => registerTab === "registered")
          .map((e) => e.id)
      ),
    [processedRegisterEvents, registerTab]
  );

  const handleMyStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setMyStartDateFilter(newStartDate);
    if (myEndDateFilter && newStartDate > myEndDateFilter) {
      setMyEndDateFilter("");
      toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: "⚠️" });
    }
  };
  const handleMyEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (myStartDateFilter && newEndDate < myStartDateFilter) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setMyEndDateFilter(newEndDate);
    }
  };
  const handleDeletedStartDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newStartDate = e.target.value;
    setDeletedStartDateFilter(newStartDate);
    if (deletedEndDateFilter && newStartDate > deletedEndDateFilter) {
      setDeletedEndDateFilter("");
      toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: "⚠️" });
    }
  };
  const handleDeletedEndDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newEndDate = e.target.value;
    if (deletedStartDateFilter && newEndDate < deletedStartDateFilter) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setDeletedEndDateFilter(newEndDate);
    }
  };

  const handleExportClick = async (eventId: string | undefined) => {
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
          try {
            const txt = await response.text();
            errorMsg = `${errorMsg}: ${txt.slice(0, 100)}`;
          } catch (_) {}
        }
        throw new Error(errorMsg);
      }
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = getFilenameFromHeader(contentDisposition);
      const blob = await response.blob();
      const actualMimeType = response.headers
        .get("content-type")
        ?.split(";")[0];
      if (
        actualMimeType !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        console.warn(`API trả về Content-Type không khớp: ${actualMimeType}`);
      }
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
      console.error("Lỗi xuất file Word:", err);
      toast.error(err.message || "Xuất file thất bại.", { id: exportToastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRegisterEventStartDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newStartDate = e.target.value;
    setRegisterStartDateFilter(newStartDate);
    if (registerEndDateFilter && newStartDate > registerEndDateFilter) {
      setRegisterEndDateFilter("");
      toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: "⚠️" });
    }
  };
  const handleRegisterEventEndDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newEndDate = e.target.value;
    if (registerStartDateFilter && newEndDate < registerStartDateFilter) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setRegisterEndDateFilter(newEndDate);
    }
  };

  const executeRegistration = async (eventToRegister: EventType) => {
    if (
      registerIsSubmitting ||
      !currentUserId ||
      isRegistered(eventToRegister.id) ||
      isCreatedByUser(eventToRegister.id)
    ) {
      if (!currentUserId) toast.error("Chưa thể xác định người dùng.");
      return;
    }
    setRegisterIsSubmitting(eventToRegister.id);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setRegisterIsSubmitting(null);
      return;
    }
    try {
      const url = `http://localhost:8080/identity/api/events/${eventToRegister.id}/attendees?userId=${currentUserId}`;
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
        throw new Error(`${m} (${res.status})`);
      }
      await res.json();
      toast.success(`Đăng ký "${eventToRegister.name}" thành công!`);
      onRegistrationChange(eventToRegister.id, true);
    } catch (err: any) {
      toast.error(`Đăng ký thất bại: ${err.message}`);
    } finally {
      setRegisterIsSubmitting(null);
    }
  };

  const handleRegisterClick = (eventToRegister: EventType) => {
    if (
      registerIsSubmitting ||
      !currentUserId ||
      isRegistered(eventToRegister.id) ||
      isCreatedByUser(eventToRegister.id)
    )
      return;
    setRegisterConfirmationState({
      isOpen: true,
      title: "Xác nhận đăng ký",
      message: (
        <>
          Bạn chắc chắn muốn đăng ký <br />{" "}
          <strong className="text-indigo-600">"{eventToRegister.name}"</strong>?
        </>
      ),
      onConfirm: () => {
        setRegisterConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        executeRegistration(eventToRegister);
      },
      onCancel: () =>
        setRegisterConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        }),
      confirmVariant: "primary",
      confirmText: "Đăng ký",
      cancelText: "Hủy",
    });
  };

  const executeUnregistration = async (eventToUnregister: EventType) => {
    if (registerIsSubmitting || !currentUserId) {
      if (!currentUserId) toast.error("Không thể xác định người dùng.");
      return;
    }
    setRegisterIsSubmitting(eventToUnregister.id);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setRegisterIsSubmitting(null);
      return;
    }
    try {
      const url = `http://localhost:8080/identity/api/events/${eventToUnregister.id}/attendees/${currentUserId}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let m = "Hủy đăng ký thất bại";
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(`${m} (${res.status})`);
      }
      toast.success(`Hủy đăng ký "${eventToUnregister.name}" thành công!`);
      onRegistrationChange(eventToUnregister.id, false);
      setRegisterSelectedToUnregister((prev) => {
        const next = new Set(prev);
        next.delete(eventToUnregister.id);
        return next;
      });
    } catch (err: any) {
      toast.error(`Hủy đăng ký thất bại: ${err.message}`);
    } finally {
      setRegisterIsSubmitting(null);
    }
  };

  const handleUnregisterClick = (eventToUnregister: EventType) => {
    if (registerIsSubmitting || !currentUserId) return;
    setRegisterConfirmationState({
      isOpen: true,
      title: "Xác nhận hủy đăng ký",
      message: (
        <>
          Bạn chắc chắn muốn hủy đăng ký <br />{" "}
          <strong className="text-indigo-600">
            "{eventToUnregister.name}"
          </strong>
          ?
        </>
      ),
      onConfirm: () => {
        setRegisterConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        executeUnregistration(eventToUnregister);
      },
      onCancel: () =>
        setRegisterConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        }),
      confirmVariant: "danger",
      confirmText: "Xác nhận hủy",
      cancelText: "Không",
    });
  };

  const handleSelectToUnregister = (eventId: string) => {
    setRegisterSelectedToUnregister((prev) => {
      const n = new Set(prev);
      if (n.has(eventId)) n.delete(eventId);
      else n.add(eventId);
      return n;
    });
  };

  const executeBatchUnregistration = async (ids: string[]) => {
    if (registerIsSubmitting || !currentUserId) return;
    setRegisterIsSubmitting("batch_unregister");
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setRegisterIsSubmitting(null);
      return;
    }
    const loadId = toast.loading(`Đang hủy ${ids.length} sự kiện...`);
    const promises = ids.map((id) => {
      const url = `http://localhost:8080/identity/api/events/${id}/attendees/${currentUserId}`;
      return fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) {
            let m = `Hủy ${id} lỗi`;
            try {
              const d = await res.json();
              m = d.message || m;
            } catch (_) {}
            return { status: "rejected", reason: m, id };
          }
          return { status: "fulfilled", value: id };
        })
        .catch((err) => ({
          status: "rejected",
          reason: err.message || `Lỗi mạng hủy ${id}`,
          id,
        }));
    });
    const results = await Promise.allSettled(promises);
    let okCount = 0;
    const failIds: string[] = [];
    const okIds: string[] = [];
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.status === "fulfilled") {
        okCount++;
        okIds.push(r.value.value);
      } else {
        const failedId =
          r.status === "rejected" ? (r.reason as any)?.id : r.value.id;
        const reason = r.status === "rejected" ? r.reason : r.value.reason;
        console.error(`Fail batch unreg ${failedId || "unknown"}: ${reason}`);
        if (failedId) failIds.push(failedId);
      }
    });
    if (okCount > 0) {
      toast.success(`Hủy ${okCount} sự kiện thành công.`, { id: loadId });
      okIds.forEach((id) => onRegistrationChange(id, false));
      setRegisterSelectedToUnregister(new Set());
    }
    if (failIds.length > 0) {
      setRegisterSelectedToUnregister((prev) => {
        const next = new Set<string>();
        failIds.forEach((id) => {
          if (prev.has(id)) next.add(id);
        });
        return next;
      });
      toast.error(`Lỗi hủy ${failIds.length} sự kiện. Vui lòng thử lại.`, {
        id: okCount === 0 ? loadId : undefined,
      });
    } else if (okCount === 0 && failIds.length === 0) {
      toast.dismiss(loadId);
    }
    setRegisterIsSubmitting(null);
  };

  const handleBatchUnregister = () => {
    const ids = Array.from(registerSelectedToUnregister);
    if (ids.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sự kiện.");
      return;
    }
    if (!currentUserId) {
      toast.error("Không thể xác định người dùng.");
      return;
    }
    setRegisterConfirmationState({
      isOpen: true,
      title: "Xác nhận hủy hàng loạt",
      message: (
        <>
          Hủy đăng ký{" "}
          <strong className="text-indigo-600">{ids.length} sự kiện</strong> đã
          chọn?
        </>
      ),
      onConfirm: () => {
        setRegisterConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        executeBatchUnregistration(ids);
      },
      onCancel: () =>
        setRegisterConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        }),
      confirmVariant: "danger",
      confirmText: `Hủy (${ids.length})`,
      cancelText: "Không",
    });
  };

  const handleSelectAllForUnregister = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = event.target.checked;
    setRegisterSelectedToUnregister(
      isChecked ? filteredRegisteredEventIdsForSelection : new Set()
    );
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
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let m = "Khôi phục thất bại";
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(`${m} (${res.status})`);
      }
      const restoredEventData = await res.json();
      toast.success(`Khôi phục sự kiện "${eventToRestore.name}" thành công!`);
      setDeletedEvents((prev) =>
        prev.filter((event) => event.id !== eventToRestore.id)
      );
      const updatedRestoredEvent = {
        ...eventToRestore,
        ...restoredEventData.result,
        deleted: false,
        deletedAt: null,
        deletedBy: null,
      };
      setMyEvents((prev) => {
        if (prev.some((e) => e.id === updatedRestoredEvent.id)) {
          return prev.map((e) =>
            e.id === updatedRestoredEvent.id ? updatedRestoredEvent : e
          );
        }
        return [...prev, updatedRestoredEvent];
      });
      if (viewingEventDetails?.id === eventToRestore.id) {
        setViewingEventDetails(null);
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
          Bạn chắc chắn muốn khôi phục sự kiện <br />{" "}
          <strong className="text-yellow-600">"{eventToRestore.name}"</strong>?
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
      onCancel: () =>
        setRestoreConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        }),
      confirmVariant: "warning",
      confirmText: "Khôi phục",
      cancelText: "Hủy",
    });
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
      // Giả định thành công có thể là 200 OK (có body) hoặc 204 No Content (không có body)
      let message = `Xóa sự kiện "${eventToDelete.name}" thành công!`;
      if (res.status !== 204) {
        try {
          const deleteResult = await res.json();
          message = deleteResult.message || message;
        } catch (e) {
          console.warn(
            "Could not parse delete response body, using default message."
          );
        }
      }
      toast.success(message);
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
          Bạn chắc chắn muốn xóa sự kiện <br />{" "}
          <strong className="text-red-600">"{eventToDelete.name}"</strong>?{" "}
          <br />{" "}
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
      onCancel: () =>
        setDeleteConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        }),
      confirmVariant: "danger",
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy",
    });
  };

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
      } else {
        console.warn(
          "Updated event not found in existing list, adding it:",
          updatedEvent
        );
        return [...prevEvents, updatedEvent];
      }
    });
    if (viewingEventDetails?.id === updatedEvent.id) {
      setViewingEventDetails(updatedEvent);
    }
  };

  // ******** CẬP NHẬT HÀM NÀY ĐỂ THÊM AVATAR ********
  const renderMyEventsSection = () => {
    const isLoading = myTab === "deleted" ? deletedLoading : myLoading;
    const error = myTab === "deleted" ? deletedError : myError;
    const events =
      myTab === "deleted" ? processedDeletedEvents : processedMyEvents;
    const viewMode = myTab === "deleted" ? deletedViewMode : myViewMode;
    const currentTab = myTab;
    const noResultMessage =
      (myTab !== "deleted" && (mySearchTerm || myTimeFilterOption !== "all")) ||
      (myTab === "deleted" &&
        (deletedSearchTerm || deletedTimeFilterOption !== "all"))
        ? "Không tìm thấy sự kiện nào khớp."
        : currentTab === "approved"
        ? "Không có sự kiện nào đã được duyệt."
        : currentTab === "pending"
        ? "Không có sự kiện nào đang chờ duyệt."
        : currentTab === "rejected"
        ? "Không có sự kiện nào bị từ chối."
        : "Không có sự kiện nào đã bị xóa.";

    if (isLoading)
      return (
        <p className="text-gray-500 italic text-center py-4">Đang tải...</p>
      );
    if (error)
      return (
        <p className="text-red-500 italic text-center py-4 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </p>
      );

    return events.length > 0 ? (
      viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const isRestoringThis = restoringEventId === event.id;
            const isDeletingThis = deletingEventId === event.id;
            const isProcessing = isRestoringThis || isDeletingThis;
            return (
              <div
                key={event.id}
                onClick={() => !isProcessing && setViewingEventDetails(event)}
                className={`bg-white shadow rounded-lg flex flex-col border border-gray-200 transition-shadow duration-150 overflow-hidden ${
                  isProcessing
                    ? "opacity-50 cursor-wait"
                    : "hover:shadow-md cursor-pointer"
                } ${
                  currentTab === "deleted" ? "border-l-4 border-gray-300" : ""
                }`}
              >
                {/* --- Hiển thị Avatar Card --- */}
                {event.avatarUrl ? (
                  <div className="w-full h-36 bg-gray-200 relative">
                    {" "}
                    {/* Fixed height for card image */}
                    <Image
                      src={event.avatarUrl}
                      alt={`Avatar for ${event.name}`}
                      layout="fill"
                      objectFit="cover"
                      className="transition-opacity duration-300 ease-in-out opacity-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0";
                        (
                          e.target as HTMLImageElement
                        ).parentElement?.classList.add("bg-gray-300");
                      }}
                      onLoad={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "1";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                    {event.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
                {/* --- Nội dung Card --- */}
                <div className="p-3 flex flex-col flex-grow justify-between">
                  <div>
                    <h3 className="font-semibold text-sm md:text-base text-gray-800 line-clamp-2 mb-1">
                      {" "}
                      {event.name}{" "}
                    </h3>
                    {(event.time || event.createdAt) && !event.deletedAt && (
                      <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 opacity-70" />{" "}
                        {event.time
                          ? new Date(event.time).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : `(Tạo) ${new Date(event.createdAt!).toLocaleString(
                              "vi-VN",
                              { dateStyle: "short", timeStyle: "short" }
                            )}`}{" "}
                      </p>
                    )}
                    {event.deletedAt && (
                      <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                        <TrashIcon className="w-3 h-3 opacity-70" /> Xóa lúc:{" "}
                        {new Date(event.deletedAt).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}{" "}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="opacity-70">📍</span> {event.location}
                      </p>
                    )}
                  </div>
                  {currentTab === "rejected" && event.rejectionReason && (
                    <p className="text-xs text-red-500 mt-2 pt-1 border-t border-dashed border-red-100 truncate">
                      <span className="font-medium">Lý do:</span>{" "}
                      {event.rejectionReason}
                    </p>
                  )}
                  {currentTab === "deleted" && event.deletedBy && (
                    <div className="text-xs text-gray-500 mt-2 pt-1 border-t border-dashed border-gray-200 flex items-center gap-1.5">
                      <span className="font-medium">Bởi:</span>
                      {event.deletedBy.avatar && (
                        <img
                          src={event.deletedBy.avatar}
                          alt="Avatar"
                          className="w-4 h-4 rounded-full"
                        />
                      )}
                      <span>{event.deletedBy.username}</span>
                    </div>
                  )}
                  <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2 justify-end items-center">
                    {currentTab !== "deleted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUpdateModal(event);
                        }}
                        disabled={isProcessing}
                        title="Chỉnh sửa"
                        className={`p-1.5 rounded text-xs cursor-pointer font-medium flex items-center justify-center gap-1 transition ${
                          isProcessing
                            ? "bg-gray-200 text-gray-400 cursor-wait"
                            : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        }`}
                      >
                        <Pencil1Icon className="w-3 h-3" />
                      </button>
                    )}
                    {currentTab !== "deleted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(event);
                        }}
                        disabled={isProcessing}
                        title="Xóa"
                        className={`p-1.5 rounded text-xs cursor-pointer font-medium flex items-center justify-center gap-1 transition ${
                          isProcessing
                            ? "bg-gray-200 text-gray-400 cursor-wait"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {isDeletingThis ? (
                          <ReloadIcon className="w-3 h-3 animate-spin" />
                        ) : (
                          <TrashIcon className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {currentTab === "deleted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreClick(event);
                        }}
                        disabled={isProcessing}
                        title="Khôi phục"
                        className={`flex-1 px-2 py-1 cursor-pointer rounded text-xs font-medium flex items-center justify-center gap-1 transition ${
                          isProcessing
                            ? "bg-yellow-200 text-yellow-700 cursor-wait"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        }`}
                      >
                        {isRestoringThis ? (
                          <ReloadIcon className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArchiveIcon className="w-3 h-3" />
                        )}
                        <span className="hidden sm:inline">
                          {isRestoringThis ? "..." : "Khôi phục"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {events.map((event) => {
              const isRestoringThis = restoringEventId === event.id;
              const isDeletingThis = deletingEventId === event.id;
              const isProcessing = isRestoringThis || isDeletingThis;
              return (
                <li
                  key={event.id}
                  onClick={() => !isProcessing && setViewingEventDetails(event)}
                  className={`px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors duration-150 ease-in-out ${
                    isProcessing
                      ? "opacity-50 cursor-wait bg-gray-50"
                      : "hover:bg-gray-50 cursor-pointer"
                  } ${
                    currentTab === "deleted"
                      ? "border-l-4 border-gray-300 hover:bg-gray-100"
                      : ""
                  }`}
                >
                  <div className="flex items-center flex-1 min-w-0 mb-2 sm:mb-0 sm:pr-4">
                    {/* --- Hiển thị Avatar List --- */}
                    {event.avatarUrl ? (
                      <Image
                        src={event.avatarUrl}
                        alt={`Avatar`}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-md object-cover mr-3 flex-shrink-0 border bg-gray-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-semibold mr-3 flex-shrink-0 border">
                        {event.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm md:text-base text-gray-800 line-clamp-1">
                        {event.name}
                      </p>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {!event.deletedAt &&
                          (event.time || event.createdAt) && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />{" "}
                              {event.time
                                ? new Date(event.time).toLocaleString("vi-VN", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : `(Tạo) ${new Date(
                                    event.createdAt!
                                  ).toLocaleString("vi-VN", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}`}
                            </span>
                          )}
                        {event.deletedAt && (
                          <span className="inline-flex items-center gap-1 text-gray-500">
                            <TrashIcon className="h-3.5 w-3.5" /> Xóa lúc:{" "}
                            {new Date(event.deletedAt).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                        {event.location && (
                          <span className="inline-flex items-center gap-1">
                            <span className="opacity-70">📍</span>{" "}
                            {event.location}
                          </span>
                        )}
                        {currentTab === "deleted" && event.deletedBy && (
                          <span className="inline-flex items-center gap-1">
                            <span className="font-medium">Bởi:</span>
                            {event.deletedBy.avatar && (
                              <img
                                src={event.deletedBy.avatar}
                                alt="Avatar"
                                className="w-3.5 h-3.5 rounded-full"
                              />
                            )}
                            <span>{event.deletedBy.username}</span>
                          </span>
                        )}
                      </div>
                      {currentTab === "rejected" && event.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1.5">
                          <span className="font-medium">Lý do:</span>{" "}
                          {event.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex gap-2 items-center self-end sm:self-center">
                    {currentTab !== "deleted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUpdateModal(event);
                        }}
                        disabled={isProcessing}
                        title="Chỉnh sửa"
                        className={`p-1.5 rounded text-xs cursor-pointer font-medium flex items-center justify-center gap-1 transition ${
                          isProcessing
                            ? "bg-gray-200 text-gray-400 cursor-wait"
                            : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        }`}
                      >
                        <Pencil1Icon className="w-3 h-3" />
                      </button>
                    )}
                    {currentTab !== "deleted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(event);
                        }}
                        disabled={isProcessing}
                        title="Xóa"
                        className={`p-1.5 rounded text-xs cursor-pointer font-medium flex items-center justify-center gap-1 transition ${
                          isProcessing
                            ? "bg-gray-200 text-gray-400 cursor-wait"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {isDeletingThis ? (
                          <ReloadIcon className="w-3 h-3 animate-spin" />
                        ) : (
                          <TrashIcon className="w-3 h-3" />
                        )}
                      </button>
                    )}
                    {currentTab === "deleted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreClick(event);
                        }}
                        disabled={isProcessing}
                        title="Khôi phục"
                        className={`px-2.5 py-1 rounded text-xs font-medium flex items-center justify-center gap-1 transition ${
                          isProcessing
                            ? "bg-yellow-200 text-yellow-700 cursor-wait"
                            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        }`}
                      >
                        {isRestoringThis ? (
                          <ReloadIcon className="w-3 h-3 animate-spin" />
                        ) : (
                          <ArchiveIcon className="w-3 h-3" />
                        )}
                        {isRestoringThis ? "..." : "Khôi phục"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )
    ) : (
      <p className="text-gray-500 italic text-center py-6">{noResultMessage}</p>
    );
  };
  // ******** KẾT THÚC CẬP NHẬT ********

  const renderEventDetails = (event: EventType) => {
    const isProcessingRegisterAction = registerIsSubmitting === event.id;
    const alreadyRegistered = isRegistered(event.id);
    const isCreated = isCreatedByUser(event.id);
    const canPerformRegisterAction = !!currentUserId;
    const descriptionToShow =
      event.description || event.content || event.purpose;
    const isRestoringThis = restoringEventId === event.id;
    const isDeletingThis = deletingEventId === event.id;
    const isDeletedEvent = event.deleted;
    const isProcessing = isRestoringThis || isDeletingThis;

    return (
      <div className="p-4 flex-grow overflow-y-auto mb-4 pr-2 bg-white rounded-lg shadow border">
        {/* Nút quay lại */}
        <button
          onClick={() => setViewingEventDetails(null)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50"
        >
          {" "}
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Quay lại{" "}
        </button>
        {/* Avatar và Tên */}
        <div className="flex items-start gap-4 mb-4">
          {event.avatarUrl ? (
            <Image
              src={event.avatarUrl}
              alt={`Avatar cho ${event.name}`}
              width={80}
              height={80}
              className="w-20 h-20 rounded-lg object-cover border p-0.5 bg-gray-100 shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-3xl font-semibold border flex-shrink-0">
              {event.name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-gray-800 mb-1">
              {event.name}
            </h3>
            {!isDeletedEvent && event.status && (
              <p className="text-sm">
                <strong className="font-medium text-gray-900">
                  Trạng thái:
                </strong>{" "}
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                    event.status === "APPROVED"
                      ? "bg-green-100 text-green-700"
                      : event.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-700"
                      : event.status === "REJECTED"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {event.status}
                </span>
              </p>
            )}
            {isDeletedEvent && (
              <p className="text-red-600 font-semibold text-sm mt-1">
                <ExclamationTriangleIcon className="inline-block mr-1 h-4 w-4" />{" "}
                Đã bị xóa.
              </p>
            )}
          </div>
        </div>
        {/* Thông tin chi tiết */}
        <div className="space-y-2 text-sm text-gray-700">
          {isDeletedEvent && event.deletedAt && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Thời gian xóa:
              </strong>{" "}
              {new Date(event.deletedAt).toLocaleString("vi-VN", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          )}
          {isDeletedEvent && event.deletedBy && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Người xóa:
              </strong>{" "}
              {event.deletedBy.lastName} {event.deletedBy.firstName} (
              {event.deletedBy.username})
              {event.deletedBy.avatar && (
                <img
                  src={event.deletedBy.avatar}
                  alt="Avatar"
                  className="inline-block ml-2 h-5 w-5 rounded-full"
                />
              )}
            </p>
          )}
          {event.time && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Thời gian:
              </strong>{" "}
              {new Date(event.time).toLocaleString("vi-VN", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          )}
          {event.location && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Địa điểm:
              </strong>{" "}
              {event.location}
            </p>
          )}
          {!isDeletedEvent && event.purpose && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Mục đích:
              </strong>{" "}
              {event.purpose}
            </p>
          )}
          {!isDeletedEvent &&
            (descriptionToShow ||
              (mainTab === "myEvents" && event.content)) && (
              <p>
                <strong className="font-medium text-gray-900 w-28 inline-block align-top">
                  {mainTab === "myEvents" ? "Nội dung:" : "Mô tả:"}
                </strong>{" "}
                <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-7rem)]">
                  {mainTab === "myEvents" ? event.content : descriptionToShow}
                </span>
              </p>
            )}
          {!isDeletedEvent &&
            event.status === "REJECTED" &&
            event.rejectionReason && (
              <p className="text-red-600">
                <strong className="font-medium text-red-800 w-28 inline-block">
                  Lý do từ chối:
                </strong>{" "}
                {event.rejectionReason}
              </p>
            )}
          {event.createdAt && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Ngày tạo:
              </strong>{" "}
              {new Date(event.createdAt).toLocaleString("vi-VN", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        {/* Nút hành động */}
        <div className="mt-6 pt-4 border-t flex flex-wrap justify-end gap-3">
          {!isDeletedEvent && mainTab === "myEvents" && myTab !== "deleted" && (
            <button
              onClick={() => handleOpenUpdateModal(event)}
              disabled={isProcessing}
              className={`bg-indigo-500 hover:bg-indigo-600 cursor-pointer text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                isProcessing ? "opacity-50 cursor-wait" : ""
              }`}
            >
              <Pencil1Icon className="h-4 w-4 mr-2" />
              Chỉnh sửa
            </button>
          )}
          {!isDeletedEvent && mainTab === "myEvents" && myTab !== "deleted" && (
            <button
              onClick={() => handleDeleteClick(event)}
              disabled={isProcessing}
              className={`bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                isProcessing ? "opacity-50 cursor-wait" : ""
              }`}
            >
              {isDeletingThis ? (
                <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrashIcon className="h-4 w-4 mr-2" />
              )}
              {isDeletingThis ? "Đang xóa..." : "Xóa sự kiện"}
            </button>
          )}
          {isDeletedEvent && myTab === "deleted" && (
            <button
              onClick={() => handleRestoreClick(event)}
              disabled={isProcessing}
              className={`bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                isProcessing ? "opacity-50 cursor-wait" : ""
              }`}
            >
              {isRestoringThis ? (
                <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArchiveIcon className="h-4 w-4 mr-2" />
              )}
              {isRestoringThis ? "Đang khôi phục..." : "Khôi phục sự kiện"}
            </button>
          )}
          {!isDeletedEvent &&
            mainTab === "myEvents" &&
            event.status === "APPROVED" && (
              <button
                onClick={() => handleExportClick(event.id)}
                disabled={isExporting || isProcessing}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center shadow-sm transition ${
                  isExporting || isProcessing
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
          {!isDeletedEvent &&
            mainTab === "registerEvents" &&
            (isCreated ? (
              <button
                className={`px-4 py-2 rounded-md text-gray-600 bg-gray-300 text-sm font-medium cursor-not-allowed`}
                disabled
              >
                ✨ Sự kiện của bạn
              </button>
            ) : alreadyRegistered ? (
              <button
                onClick={() => handleUnregisterClick(event)}
                disabled={
                  isProcessingRegisterAction || !canPerformRegisterAction
                }
                className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer flex items-center gap-1.5 ${
                  isProcessingRegisterAction || !canPerformRegisterAction
                    ? "bg-red-300 cursor-wait"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {isProcessingRegisterAction ? (
                  <ReloadIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <Cross2Icon className="h-4 w-4" />
                )}
                {isProcessingRegisterAction ? "..." : " Hủy đăng ký"}
              </button>
            ) : (
              <button
                onClick={() => handleRegisterClick(event)}
                disabled={
                  isProcessingRegisterAction || !canPerformRegisterAction
                }
                className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer flex items-center gap-1.5 ${
                  isProcessingRegisterAction || !canPerformRegisterAction
                    ? "bg-blue-300 cursor-wait"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isProcessingRegisterAction ? (
                  <ReloadIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <Pencil1Icon className="h-4 w-4" />
                )}
                {isProcessingRegisterAction ? "..." : "📝 Đăng ký"}
              </button>
            ))}
          <button
            onClick={() => setViewingEventDetails(null)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer"
          >
            {" "}
            Đóng{" "}
          </button>
        </div>
      </div>
    );
  };

  const renderRegisterEventListOrCard = () => {
    const list = processedRegisterEvents;
    const currentTab = registerTab;
    const viewMode = registerViewMode;
    const isLoading = isLoadingRegisteredIds || registerIsLoading;
    const error = registerError;
    const noResultMessage =
      registerSearchTerm || registerTimeFilter !== "all"
        ? `Không tìm thấy sự kiện nào khớp.`
        : currentTab === "available"
        ? "Không có sự kiện mới nào để đăng ký."
        : "Bạn chưa đăng ký sự kiện nào.";
    const isBatchUnregistering = registerIsSubmitting === "batch_unregister";
    const allFilteredRegisteredSelected =
      currentTab === "registered" &&
      list.length > 0 &&
      filteredRegisteredEventIdsForSelection.size > 0 &&
      list.every((item) => registerSelectedToUnregister.has(item.id)) &&
      registerSelectedToUnregister.size >=
        filteredRegisteredEventIdsForSelection.size;

    if (isLoading)
      return (
        <p className="text-center text-gray-500 italic py-5">Đang tải...</p>
      );
    if (error)
      return (
        <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
          {error}
        </p>
      );

    return (
      <div className="mt-4">
        {currentTab === "registered" && list.length > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-gray-50 py-2 z-10 px-1 -mx-1 rounded-t-md">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="select-all-unregister"
                className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                checked={allFilteredRegisteredSelected}
                onChange={handleSelectAllForUnregister}
                disabled={list.length === 0 || isBatchUnregistering}
                aria-label="Chọn tất cả để hủy"
              />
              <label
                htmlFor="select-all-unregister"
                className="text-sm text-gray-600 cursor-pointer"
              >
                Chọn tất cả ({registerSelectedToUnregister.size})
              </label>
            </div>
            <button
              onClick={handleBatchUnregister}
              disabled={
                isBatchUnregistering ||
                registerSelectedToUnregister.size === 0 ||
                !currentUserId
              }
              className={`px-3 py-1 rounded-md text-white shadow-sm transition text-xs font-medium cursor-pointer flex items-center gap-1 ${
                isBatchUnregistering ||
                registerSelectedToUnregister.size === 0 ||
                !currentUserId
                  ? "bg-red-300 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isBatchUnregistering ? (
                <ReloadIcon className="w-3 h-3 animate-spin" />
              ) : (
                <Cross2Icon className="w-3 h-3" />
              )}
              {isBatchUnregistering
                ? "..."
                : `Hủy (${registerSelectedToUnregister.size})`}
            </button>
          </div>
        )}
        {list.length === 0 && (
          <p className="text-center text-gray-500 italic py-5">
            {noResultMessage}
          </p>
        )}
        {viewMode === "list" ? (
          <ul className="space-y-3">
            {list.map((event) => {
              const isProcessingSingle = registerIsSubmitting === event.id;
              const isSelected = registerSelectedToUnregister.has(event.id);
              const isProcessingBatchSelected =
                isBatchUnregistering && isSelected;
              const processing =
                isProcessingSingle || isProcessingBatchSelected;
              const alreadyRegistered = isRegistered(event.id);
              const isCreated = isCreatedByUser(event.id);
              const canAct = !!currentUserId;
              return (
                <li
                  key={event.id}
                  className={`border p-3 md:p-4 rounded-lg shadow-sm transition-colors duration-150 flex flex-col gap-3 ${
                    currentTab === "registered"
                      ? `cursor-pointer ${
                          isSelected
                            ? "bg-red-50 border-red-200 hover:bg-red-100"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        }`
                      : isCreated
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  } ${processing ? "opacity-70 cursor-wait" : ""}`}
                  onClick={
                    currentTab === "registered" && !processing
                      ? () => handleSelectToUnregister(event.id)
                      : undefined
                  }
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start w-full gap-2">
                    <div className="flex items-center flex-grow min-w-0">
                      {/* Avatar List View */}
                      {event.avatarUrl ? (
                        <Image
                          src={event.avatarUrl}
                          alt={`Avatar`}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-md object-cover mr-3 flex-shrink-0 border bg-gray-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-semibold mr-3 flex-shrink-0 border">
                          {event.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-md md:text-lg font-semibold text-gray-800 mb-1 flex items-center">
                          {currentTab === "registered" && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              disabled={processing}
                              aria-label={`Chọn hủy ${event.name}`}
                              tabIndex={-1}
                              className="mr-2 h-4 w-4 align-middle text-red-600 border-gray-300 rounded focus:ring-red-500 pointer-events-none"
                            />
                          )}
                          {event.name}
                          {isCreated && currentTab === "available" && (
                            <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                              ✨ Của bạn
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600 pl-6 sm:pl-0">
                          {event.time && (
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
                              {new Date(event.time).toLocaleString("vi-VN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center mt-1 sm:mt-0 gap-1.5">
                              <span className="opacity-70">📍</span>
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:self-end border-t border-gray-100 pt-3 mt-2 sm:border-none sm:pt-0 sm:mt-0">
                    {(currentTab === "available" ||
                      (currentTab === "registered" && !isSelected)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingEventDetails(event);
                        }}
                        disabled={processing}
                        className="px-3 py-1.5 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-xs font-medium w-full sm:w-auto disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <InfoCircledIcon /> Xem chi tiết
                      </button>
                    )}
                    {currentTab === "available" &&
                      (isCreated ? (
                        <button
                          className="w-full cursor-not-allowed sm:w-auto px-3 py-1.5 rounded-md text-gray-600 bg-gray-300 text-xs font-medium"
                          disabled
                        >
                          ✨ Sự kiện của bạn
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegisterClick(event);
                          }}
                          disabled={alreadyRegistered || processing || !canAct}
                          className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                            alreadyRegistered
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {alreadyRegistered ? (
                            <CheckCircledIcon />
                          ) : processing ? (
                            <ReloadIcon className="animate-spin" />
                          ) : (
                            <Pencil1Icon />
                          )}
                          {alreadyRegistered
                            ? "Đã đăng ký"
                            : processing
                            ? "..."
                            : "Đăng ký"}
                        </button>
                      ))}
                    {currentTab === "registered" && !isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregisterClick(event);
                        }}
                        disabled={processing || !canAct}
                        className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                          processing || !canAct
                            ? "bg-red-300 cursor-wait"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {processing ? (
                          <ReloadIcon className="animate-spin" />
                        ) : (
                          <Cross2Icon />
                        )}
                        {processing ? "..." : " Hủy"}
                      </button>
                    )}
                  </div>
                  {currentTab === "registered" && isSelected && processing && (
                    <div className="text-xs text-red-500 italic text-right mt-1">
                      Đang xử lý...
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((event) => {
              const isProcessingSingle = registerIsSubmitting === event.id;
              const isSelected = registerSelectedToUnregister.has(event.id);
              const isProcessingBatchSelected =
                isBatchUnregistering && isSelected;
              const processing =
                isProcessingSingle || isProcessingBatchSelected;
              const alreadyRegistered = isRegistered(event.id);
              const isCreated = isCreatedByUser(event.id);
              const canAct = !!currentUserId;
              return (
                <div
                  key={event.id}
                  className={`border p-4 rounded-lg shadow-sm flex flex-col justify-between transition-colors duration-150 ${
                    currentTab === "registered"
                      ? `cursor-pointer ${
                          isSelected
                            ? "bg-red-50 border-red-200 hover:bg-red-100"
                            : "bg-white hover:bg-gray-50 border-gray-200"
                        }`
                      : isCreated
                      ? "bg-gray-50 border-gray-200"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  } ${processing ? "opacity-70 cursor-wait" : ""}`}
                  onClick={
                    currentTab === "registered" && !processing
                      ? () => handleSelectToUnregister(event.id)
                      : undefined
                  }
                >
                  {/* Avatar Card View */}
                  {event.avatarUrl ? (
                    <div className="w-full h-32 bg-gray-200 relative mb-3 rounded-md overflow-hidden">
                      <Image
                        src={event.avatarUrl}
                        alt={`Avatar`}
                        layout="fill"
                        objectFit="cover"
                        className="transition-opacity duration-300 ease-in-out opacity-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0";
                          (
                            e.target as HTMLImageElement
                          ).parentElement?.classList.add("bg-gray-300");
                        }}
                        onLoad={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "1";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold mb-3 rounded-md">
                      {event.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-1 flex items-start">
                      {currentTab === "registered" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          disabled={processing}
                          aria-label={`Chọn hủy ${event.name}`}
                          tabIndex={-1}
                          className="mr-2 mt-1 h-4 w-4 align-middle text-red-600 border-gray-300 rounded focus:ring-red-500 pointer-events-none flex-shrink-0"
                        />
                      )}
                      <span className="line-clamp-2 flex-grow">
                        {event.name}
                      </span>
                      {isCreated && currentTab === "available" && (
                        <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          ✨
                        </span>
                      )}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600 mt-1 mb-3">
                      {event.time && (
                        <p className="flex items-center text-xs">
                          <CalendarIcon className="w-3 h-3 mr-1.5 opacity-70 flex-shrink-0" />
                          {new Date(event.time).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      {event.location && (
                        <p className="flex items-center text-xs">
                          <span className="mr-1.5 opacity-70">📍</span>
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {(currentTab === "available" ||
                      (currentTab === "registered" && !isSelected)) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingEventDetails(event);
                        }}
                        disabled={processing}
                        className="w-full px-3 py-1.5 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-xs font-medium disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1"
                      >
                        <InfoCircledIcon /> Xem chi tiết
                      </button>
                    )}
                    {currentTab === "available" &&
                      (isCreated ? (
                        <button
                          className="w-full cursor-not-allowed px-3 py-1.5 rounded-md text-gray-600 bg-gray-300 text-xs font-medium"
                          disabled
                        >
                          ✨ Sự kiện của bạn
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegisterClick(event);
                          }}
                          disabled={alreadyRegistered || processing || !canAct}
                          className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                            alreadyRegistered
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {alreadyRegistered ? (
                            <CheckCircledIcon />
                          ) : processing ? (
                            <ReloadIcon className="animate-spin" />
                          ) : (
                            <Pencil1Icon />
                          )}
                          {alreadyRegistered
                            ? "Đã đăng ký"
                            : processing
                            ? "..."
                            : "Đăng ký"}
                        </button>
                      ))}
                    {currentTab === "registered" && !isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregisterClick(event);
                        }}
                        disabled={processing || !canAct}
                        className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                          processing || !canAct
                            ? "bg-red-300 cursor-wait"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {processing ? (
                          <ReloadIcon className="animate-spin" />
                        ) : (
                          <Cross2Icon />
                        )}
                        {processing ? "..." : " Hủy"}
                      </button>
                    )}
                    {currentTab === "registered" &&
                      isSelected &&
                      processing && (
                        <div className="text-xs text-red-500 italic text-center mt-1">
                          Đang xử lý...
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
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
          className={`pb-2 font-semibold cursor-pointer text-base md:text-lg ${
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
          className={`pb-2 font-semibold cursor-pointer text-base md:text-lg ${
            mainTab === "registerEvents"
              ? "border-b-2 border-green-500 text-green-600"
              : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
          }`}
        >
          Đăng ký sự kiện
        </button>
      </div>
      <div className="flex flex-col flex-grow min-h-0">
        {viewingEventDetails ? (
          renderEventDetails(viewingEventDetails)
        ) : mainTab === "myEvents" ? (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-blue-600 mb-4 flex-shrink-0">
              Quản lý sự kiện đã tạo
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setMyTab("approved")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base flex items-center gap-1 ${
                  myTab === "approved"
                    ? "border-b-2 border-green-500 text-green-600"
                    : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
                }`}
              >
                {" "}
                <CheckIcon /> Đã duyệt (
                {
                  myEvents.filter((e) => e.status?.toUpperCase() === "APPROVED")
                    .length
                }
                ){" "}
              </button>
              <button
                onClick={() => setMyTab("pending")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base flex items-center gap-1 ${
                  myTab === "pending"
                    ? "border-b-2 border-yellow-500 text-yellow-600"
                    : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
                }`}
              >
                {" "}
                <ReloadIcon /> Chờ duyệt (
                {
                  myEvents.filter((e) => e.status?.toUpperCase() === "PENDING")
                    .length
                }
                ){" "}
              </button>
              <button
                onClick={() => setMyTab("rejected")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base flex items-center gap-1 ${
                  myTab === "rejected"
                    ? "border-b-2 border-red-500 text-red-600"
                    : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
                }`}
              >
                {" "}
                <Cross2Icon /> Từ chối (
                {
                  myEvents.filter((e) => e.status?.toUpperCase() === "REJECTED")
                    .length
                }
                ){" "}
              </button>
              <button
                onClick={() => setMyTab("deleted")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base flex items-center gap-1 ${
                  myTab === "deleted"
                    ? "border-b-2 border-gray-500 text-gray-600"
                    : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
                }`}
              >
                {" "}
                <TrashIcon /> Đã xóa ({deletedEvents.length}){" "}
              </button>
            </div>
            {myTab !== "deleted" && (
              <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                  <div className="relative lg:col-span-1 xl:col-span-1">
                    <label
                      htmlFor="searchMyEvents"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Tìm kiếm
                    </label>
                    <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                      <MagnifyingGlassIcon />
                    </span>
                    <input
                      type="text"
                      id="searchMyEvents"
                      placeholder="Tên hoặc địa điểm..."
                      value={mySearchTerm}
                      onChange={(e) => setMySearchTerm(e.target.value)}
                      className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sortMyEvents"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Sắp xếp
                    </label>
                    <select
                      id="sortMyEvents"
                      value={mySortOrder}
                      onChange={(e) =>
                        setMySortOrder(e.target.value as "az" | "za")
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                    >
                      <option value="az"> A - Z</option>{" "}
                      <option value="za"> Z - A</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="timeFilterMyEvents"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Lọc thời gian
                    </label>
                    <select
                      id="timeFilterMyEvents"
                      value={myTimeFilterOption}
                      onChange={(e) =>
                        setMyTimeFilterOption(e.target.value as any)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                    >
                      <option value="all">Tất cả</option>{" "}
                      <option value="today">Hôm nay</option>{" "}
                      <option value="thisWeek">Tuần này</option>{" "}
                      <option value="thisMonth">Tháng này</option>{" "}
                      <option value="dateRange">Khoảng ngày</option>
                    </select>
                  </div>
                  <div className="flex items-end justify-start md:justify-end gap-2 lg:col-start-auto xl:col-start-4">
                    <div className="flex w-full md:w-auto">
                      <button
                        onClick={() => setMyViewMode("card")}
                        title="Chế độ thẻ"
                        className={`flex-1 md:flex-none cursor-pointer p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${
                          myViewMode === "card"
                            ? "bg-blue-600 border-blue-700 text-white shadow-sm z-10"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                      >
                        {" "}
                        <Component1Icon className="h-5 w-5" />{" "}
                      </button>
                      <button
                        onClick={() => setMyViewMode("list")}
                        title="Chế độ danh sách"
                        className={`flex-1 md:flex-none cursor-pointer p-2 rounded-r-md border transition duration-150 ease-in-out ${
                          myViewMode === "list"
                            ? "bg-blue-600 border-blue-700 text-white shadow-sm z-10"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                      >
                        {" "}
                        <ListBulletIcon className="h-5 w-5" />{" "}
                      </button>
                    </div>
                  </div>
                </div>
                {myTimeFilterOption === "dateRange" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                    <div>
                      <label
                        htmlFor="startDateFilterMyEvents"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        <span className="inline-block mr-1">🗓️</span> Từ ngày
                      </label>
                      <input
                        type="date"
                        id="startDateFilterMyEvents"
                        value={myStartDateFilter}
                        onChange={handleMyStartDateChange}
                        max={myEndDateFilter || undefined}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                        aria-label="Ngày bắt đầu lọc"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="endDateFilterMyEvents"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        <span className="inline-block mr-1">🗓️</span> Đến ngày
                      </label>
                      <input
                        type="date"
                        id="endDateFilterMyEvents"
                        value={myEndDateFilter}
                        onChange={handleMyEndDateChange}
                        min={myStartDateFilter || undefined}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm bg-white"
                        aria-label="Ngày kết thúc lọc"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {myTab === "deleted" && (
              <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                  <div className="relative lg:col-span-1 xl:col-span-1">
                    <label
                      htmlFor="searchDeletedEvents"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Tìm kiếm (Đã xóa)
                    </label>
                    <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                      <MagnifyingGlassIcon />
                    </span>
                    <input
                      type="text"
                      id="searchDeletedEvents"
                      placeholder="Tên, địa điểm, người xóa..."
                      value={deletedSearchTerm}
                      onChange={(e) => setDeletedSearchTerm(e.target.value)}
                      className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 shadow-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="sortDeletedEvents"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Sắp xếp
                    </label>
                    <select
                      id="sortDeletedEvents"
                      value={deletedSortOrder}
                      onChange={(e) =>
                        setDeletedSortOrder(e.target.value as "az" | "za")
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                    >
                      <option value="az"> A - Z</option>{" "}
                      <option value="za"> Z - A</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="timeFilterDeletedEvents"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Lọc thời gian xóa
                    </label>
                    <select
                      id="timeFilterDeletedEvents"
                      value={deletedTimeFilterOption}
                      onChange={(e) =>
                        setDeletedTimeFilterOption(e.target.value as any)
                      }
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                    >
                      <option value="all">Tất cả</option>{" "}
                      <option value="today">Hôm nay</option>{" "}
                      <option value="thisWeek">Tuần này</option>{" "}
                      <option value="thisMonth">Tháng này</option>{" "}
                      <option value="dateRange">Khoảng ngày</option>
                    </select>
                  </div>
                  <div className="flex items-end justify-start md:justify-end gap-2 lg:col-start-auto xl:col-start-4">
                    <div className="flex w-full md:w-auto">
                      <button
                        onClick={() => setDeletedViewMode("card")}
                        title="Chế độ thẻ"
                        className={`flex-1 md:flex-none cursor-pointer p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${
                          deletedViewMode === "card"
                            ? "bg-gray-600 border-gray-700 text-white shadow-sm z-10"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                      >
                        {" "}
                        <Component1Icon className="h-5 w-5" />{" "}
                      </button>
                      <button
                        onClick={() => setDeletedViewMode("list")}
                        title="Chế độ danh sách"
                        className={`flex-1 md:flex-none cursor-pointer p-2 rounded-r-md border transition duration-150 ease-in-out ${
                          deletedViewMode === "list"
                            ? "bg-gray-600 border-gray-700 text-white shadow-sm z-10"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                        }`}
                      >
                        {" "}
                        <ListBulletIcon className="h-5 w-5" />{" "}
                      </button>
                    </div>
                  </div>
                </div>
                {deletedTimeFilterOption === "dateRange" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-gray-100 rounded-lg border border-gray-200 shadow-sm">
                    <div>
                      <label
                        htmlFor="startDateFilterDeleted"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        <span className="inline-block mr-1">🗓️</span> Từ ngày
                        xóa
                      </label>
                      <input
                        type="date"
                        id="startDateFilterDeleted"
                        value={deletedStartDateFilter}
                        onChange={handleDeletedStartDateChange}
                        max={deletedEndDateFilter || undefined}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 shadow-sm bg-white"
                        aria-label="Ngày bắt đầu lọc xóa"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="endDateFilterDeleted"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        <span className="inline-block mr-1">🗓️</span> Đến ngày
                        xóa
                      </label>
                      <input
                        type="date"
                        id="endDateFilterDeleted"
                        value={deletedEndDateFilter}
                        onChange={handleDeletedEndDateChange}
                        min={deletedStartDateFilter || undefined}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 shadow-sm bg-white"
                        aria-label="Ngày kết thúc lọc xóa"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="overflow-y-auto flex-grow mb-1 pr-1 min-h-[300px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {renderMyEventsSection()}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-green-600 mb-4 flex-shrink-0">
              Tìm & Đăng ký sự kiện
            </h2>
            <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="relative lg:col-span-1 xl:col-span-1">
                  <label
                    htmlFor="searchRegEvents"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Tìm sự kiện
                  </label>
                  <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                    <MagnifyingGlassIcon />
                  </span>
                  <input
                    type="text"
                    id="searchRegEvents"
                    placeholder="Tên hoặc địa điểm..."
                    value={registerSearchTerm}
                    onChange={(e) => setRegisterSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sortRegEvents"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Sắp xếp
                  </label>
                  <select
                    id="sortRegEvents"
                    value={registerSortOrder}
                    onChange={(e) =>
                      setRegisterSortOrder(e.target.value as "az" | "za")
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                  >
                    <option value="az"> A - Z</option>{" "}
                    <option value="za"> Z - A</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="timeFilterRegEvents"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Lọc thời gian
                  </label>
                  <select
                    id="timeFilterRegEvents"
                    value={registerTimeFilter}
                    onChange={(e) =>
                      setRegisterTimeFilter(e.target.value as any)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                  >
                    <option value="all">Tất cả</option>{" "}
                    <option value="today">Hôm nay</option>{" "}
                    <option value="thisWeek">Tuần này</option>{" "}
                    <option value="thisMonth">Tháng này</option>{" "}
                    <option value="dateRange">Khoảng ngày</option>
                  </select>
                </div>
                <div className="flex items-end justify-start sm:justify-end gap-2">
                  <div className="flex w-full sm:w-auto">
                    <button
                      onClick={() => setRegisterViewMode("list")}
                      title="Danh sách"
                      className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${
                        registerViewMode === "list"
                          ? "bg-green-600 border-green-700 text-white shadow-sm z-10"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      {" "}
                      <ListBulletIcon className="h-5 w-5" />{" "}
                    </button>
                    <button
                      onClick={() => setRegisterViewMode("card")}
                      title="Thẻ"
                      className={`flex-1 sm:flex-none p-2 rounded-r-md border transition duration-150 ease-in-out ${
                        registerViewMode === "card"
                          ? "bg-green-600 border-green-700 text-white shadow-sm z-10"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      {" "}
                      <Component1Icon className="h-5 w-5" />{" "}
                    </button>
                  </div>
                </div>
              </div>
              {registerTimeFilter === "dateRange" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm">
                  <div>
                    <label
                      htmlFor="startDateFilterReg"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      <span className="inline-block mr-1">🗓️</span> Từ ngày
                    </label>
                    <input
                      type="date"
                      id="startDateFilterReg"
                      value={registerStartDateFilter}
                      onChange={handleRegisterEventStartDateChange}
                      max={registerEndDateFilter || undefined}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="endDateFilterReg"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      <span className="inline-block mr-1">🗓️</span> Đến ngày
                    </label>
                    <input
                      type="date"
                      id="endDateFilterReg"
                      value={registerEndDateFilter}
                      onChange={handleRegisterEventEndDateChange}
                      min={registerStartDateFilter || undefined}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-0 px-1 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setRegisterTab("available")}
                className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 flex items-center gap-1 ${
                  registerTab === "available"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {" "}
                <MagnifyingGlassIcon /> Gợi ý (
                {
                  processedRegisterEvents.filter(
                    (e) => !isRegistered(e.id) && !isCreatedByUser(e.id)
                  ).length
                }
                ){" "}
              </button>
              <button
                onClick={() => setRegisterTab("registered")}
                className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 flex items-center gap-1 ${
                  registerTab === "registered"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {" "}
                <CheckCircledIcon /> Đã đăng ký (
                {initialRegisteredEventIds?.size ?? 0}){" "}
              </button>
            </div>
            <div className="overflow-y-auto flex-grow pt-4 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {renderRegisterEventListOrCard()}
            </div>
          </>
        )}
      </div>
      <ConfirmationDialog
        isOpen={registerConfirmationState.isOpen}
        title={registerConfirmationState.title}
        message={registerConfirmationState.message}
        confirmVariant={registerConfirmationState.confirmVariant}
        confirmText={registerConfirmationState.confirmText}
        cancelText={registerConfirmationState.cancelText}
        onConfirm={registerConfirmationState.onConfirm || (() => {})}
        onCancel={() =>
          setRegisterConfirmationState({
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
