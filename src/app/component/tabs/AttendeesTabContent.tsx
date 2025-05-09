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
import QrScannerModal from "../modals/QrScannerModal";
import { Html5QrcodeResult } from "html5-qrcode";
// import MyQrScannerModal from '../modals/MyQrScannerModal';
import QRScanner from '../modals/QRScanner';
import {
  ArrowLeftIcon,
  CheckIcon,
  Cross2Icon,
  TrashIcon,
  PersonIcon,
  IdCardIcon,
  Link2Icon,
  ReloadIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  Component1Icon,
  ListBulletIcon,
  DownloadIcon,
  InfoCircledIcon,
  ExclamationTriangleIcon,
  ArchiveIcon,
  ChevronLeftIcon,
  ClockIcon, // Thêm ClockIcon
  CheckCircledIcon, // Thêm CheckCircledIcon
} from "@radix-ui/react-icons";

interface ApprovedEvent {
  id: string;
  name: string;
  time?: string;
  location?: string;
  status?: string;
  createdAt?: string;
  avatarUrl?: string | null;
  progressStatus?: "UPCOMING" | "ONGOING" | "ENDED" | string;
}

interface Attendee {
  id?: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roleName?: string;
  positionName?: string;
  attending?: boolean;
  studentCode?: string;
  avatar?: string | null;
}

interface AttendeesTabContentProps {
  user: MainUserType | null;
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

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string | null;
  isLoadingQrCode: boolean;
  qrCodeError: string | null;
  eventName?: string;
}

// --- Thêm các hàm helper từ HomeTabContent ---
type EventStatus = "upcoming" | "ongoing" | "ended";

const getEventStatus = (eventDateStr?: string | null): EventStatus => {
  if (!eventDateStr) return "upcoming";
  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) return "upcoming";
    const eventDateStart = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    if (eventDateStart < todayStart) return "ended";
    else if (eventDateStart > todayStart) return "upcoming";
    else return "ongoing";
  } catch (e) {
    console.error("Error parsing event date for status:", e);
    return "upcoming";
  }
};

const getStatusBadgeClasses = (status: EventStatus): string => {
  const base =
    "px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1";
  switch (status) {
    case "ongoing":
      return `${base} bg-green-100 text-green-800`;
    case "upcoming":
      return `${base} bg-blue-100 text-blue-800`;
    case "ended":
      return `${base} bg-gray-100 text-gray-700`;
    default:
      return `${base} bg-gray-100 text-gray-600`;
  }
};

const getStatusText = (status: EventStatus): string => {
  switch (status) {
    case "ongoing":
      return "Đang diễn ra";
    case "upcoming":
      return "Sắp diễn ra";
    case "ended":
      return "Đã kết thúc";
    default:
      return "";
  }
};

const getStatusIcon = (status: EventStatus) => {
  switch (status) {
    case "ongoing":
      return <CheckCircledIcon className="w-3 h-3" />;
    case "upcoming":
      return <ClockIcon className="w-3 h-3" />;
    case "ended":
      return <ArchiveIcon className="w-3 h-3" />;
    default:
      return null;
  }
};
// --- Kết thúc thêm hàm helper ---

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
  const defaultFilename = "attendees_export.xlsx";
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
    if (!filename.toLowerCase().endsWith(".xlsx")) {
      const nameWithoutExt = filename.includes(".")
        ? filename.substring(0, filename.lastIndexOf("."))
        : filename;
      filename = nameWithoutExt + ".xlsx";
    }
    return filename;
  }
  return defaultFilename;
};

const getAttendeeName = (attendee: Attendee): string => {
  const fn = `${attendee.lastName || ""} ${attendee.firstName || ""}`.trim();
  return (
    fn ||
    attendee.username ||
    `ID: ${attendee.userId?.substring(0, 8) ?? "N/A"}`
  );
};

function QrCodeModal({
  isOpen,
  onClose,
  qrCodeUrl,
  isLoadingQrCode,
  qrCodeError,
  eventName = "Sự kiện",
}: QrCodeModalProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 transition-opacity duration-300 ease-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-5 transform transition-all duration-300 ease-out scale-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 cursor-pointer right-2 text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400"
          aria-label="Đóng modal"
        >
          <Cross2Icon className="w-5 h-5" />
        </button>
        <h3
          id="qr-modal-title"
          className="text-lg font-semibold text-center text-gray-800 mb-4"
        >
          Mã QR Điểm Danh
        </h3>
        <p className="text-sm text-center text-gray-600 mb-5 line-clamp-2">
          {eventName}
        </p>
        <div className="flex justify-center items-center min-h-[250px]">
          {isLoadingQrCode && (
            <p className="text-sm text-gray-500 italic">Đang tải mã QR...</p>
          )}{" "}
          {qrCodeError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200 text-center">
              {qrCodeError}
            </p>
          )}{" "}
          {qrCodeUrl && !isLoadingQrCode && !qrCodeError && (
            <img
              src={qrCodeUrl}
              alt={`Mã QR điểm danh cho ${eventName}`}
              className="w-full max-w-[300px] h-auto border border-gray-300 rounded bg-white p-1 shadow-sm"
            />
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          Đóng
        </button>
      </div>
    </div>
  );
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
  const confirmButtonClasses = useMemo(() => {
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
  const cancelButtonClasses =
    "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300 ease-out"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 ease-out scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="dialog-title"
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
          {" "}
          <button onClick={onCancel} className={cancelButtonClasses}>
            {cancelText}
          </button>{" "}
          <button onClick={onConfirm} className={confirmButtonClasses}>
            {confirmText}
          </button>{" "}
        </div>
      </div>
    </div>
  );
}

const AttendeesTabContent: React.FC<AttendeesTabContentProps> = ({ user }) => {
  const [userApprovedEvents, setUserApprovedEvents] = useState<ApprovedEvent[]>(
    []
  );
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [eventError, setEventError] = useState<string | null>(null);
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [eventSortOrder, setEventSortOrder] = useState<"az" | "za">("az");
  // Đổi tên và cập nhật kiểu cho state bộ lọc sự kiện
  const [eventStatusFilterOption, setEventStatusFilterOption] = useState<
    "all" | "upcoming" | "ongoing" | "ended" | "dateRange"
  >("all");
  const [eventStartDateFilter, setEventStartDateFilter] = useState<string>("");
  const [eventEndDateFilter, setEventEndDateFilter] = useState<string>("");
  const [eventViewMode, setEventViewMode] = useState<"list" | "card">("list");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [attendeeSearchTerm, setAttendeeSearchTerm] = useState("");
  const [attendeeSortOrder, setAttendeeSortOrder] = useState<
    "az" | "za" | "status"
  >("az");
  const [attendeeViewMode, setAttendeeViewMode] = useState<"list" | "card">(
    "list"
  );
  const [originalAttendance, setOriginalAttendance] = useState<
    Record<string, boolean>
  >({});
  const [attendanceChanges, setAttendanceChanges] = useState<
    Record<string, boolean>
  >({});
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(
    new Set()
  );
  const [mode, setMode] = useState<"view" | "attendance" | "delete">("view");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoadingQrCode, setIsLoadingQrCode] = useState<boolean>(false);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  // const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const currentUserId = user?.id ?? null;
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);  
  const fetchUserApprovedEvents = useCallback(
    async (showToast = false) => {
      if (!user?.id) {
        setEventError("Không tìm thấy thông tin người dùng.");
        setIsLoadingEvents(false);
        setUserApprovedEvents([]);
        return;
      }
      setIsLoadingEvents(true);
      setEventError(null);
      setUserApprovedEvents([]);
      try {
        const tk = localStorage.getItem("authToken");
        if (!tk) throw new Error("Chưa đăng nhập.");
        const h = { Authorization: `Bearer ${tk}` };
        const cId = user.id;
        const url = `http://localhost:8080/identity/api/events/creator/${cId}`;
        const evRes = await fetch(url, { headers: h, cache: "no-store" });
        if (!evRes.ok) {
          const d = await evRes.json().catch(() => ({}));
          throw new Error(d?.message || `Lỗi tải sự kiện (${evRes.status})`);
        }
        const data = await evRes.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const approved = data.result
            .filter((e: any) => e.status === "APPROVED")
            .map((e: any) => ({
              id: e.id,
              name: e.name,
              time: e.time,
              location: e.location,
              status: e.status,
              createdAt: e.createdAt,
              avatarUrl: e.avatarUrl,
              progressStatus: e.progressStatus,
            }));
          setUserApprovedEvents(approved);
          if (showToast) {
            toast.success("Đã làm mới danh sách sự kiện!");
          }
        } else {
          setUserApprovedEvents([]);
          console.warn("API creator events returned unexpected data:", data);
          if (showToast) {
            toast.error("Làm mới thất bại: Dữ liệu không hợp lệ.");
          }
        }
      } catch (e: any) {
        console.error("Lỗi fetch UserApprovedEvents:", e);
        setEventError(e.message || "Lỗi không xác định khi tải sự kiện");
        if (showToast) {
          toast.error(`Làm mới thất bại: ${e.message || "Lỗi không xác định"}`);
        }
      } finally {
        setIsLoadingEvents(false);
      }
    },
    [user]
  );
  const fetchAttendees = useCallback(
    async (eventId: string, showToast = false) => {
      setIsLoadingAttendees(true);
      setAttendeeError(null);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Chưa đăng nhập.");
        const h = { Authorization: `Bearer ${token}` };
        const res = await fetch(
          `http://localhost:8080/identity/api/events/${eventId}/attendees`,
          { headers: h, cache: "no-store" }
        );
        if (!res.ok) {
          let m = `Lỗi tải danh sách người tham gia`;
          try {
            const d = await res.json();
            m = d.message || m;
          } catch (_) {}
          throw new Error(`${m} (${res.status})`);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const fetched: Attendee[] = data.result;
          const uniqueAttendees = fetched;
          setAttendees(uniqueAttendees);
          const initialAttendance: Record<string, boolean> = {};
          uniqueAttendees.forEach((a) => {
            if (a.userId) initialAttendance[a.userId] = a.attending ?? false;
          });
          setOriginalAttendance(initialAttendance);
          setAttendanceChanges(initialAttendance);
          setSelectedForDelete(new Set());
          if (showToast) {
            toast.success("Đã làm mới danh sách người tham gia!");
          }
        } else {
          setAttendees([]);
          setOriginalAttendance({});
          setAttendanceChanges({});
          throw new Error(
            data.message || "Lỗi định dạng dữ liệu người tham gia"
          );
        }
      } catch (err: any) {
        console.error("Lỗi fetchAttendees:", err);
        setAttendeeError(
          err.message || "Lỗi không xác định khi tải người tham gia"
        );
        setAttendees([]);
        setOriginalAttendance({});
        setAttendanceChanges({});
        if (showToast) {
          toast.error(
            `Làm mới thất bại: ${err.message || "Lỗi không xác định"}`
          );
        }
      } finally {
        setIsLoadingAttendees(false);
      }
    },
    []
  );
  const fetchQrCodeImage = useCallback(async (eventId: string) => {
    setIsLoadingQrCode(true);
    setQrCodeError(null);
    setQrCodeUrl(null);
    let tempUrl: string | null = null;
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Chưa đăng nhập để lấy mã QR.");
      const h = { Authorization: `Bearer ${token}` };
      const url = `http://localhost:8080/identity/api/events/${eventId}/qr-code-image`;
      const res = await fetch(url, { headers: h });
      if (!res.ok) {
        let m = `Lỗi tải mã QR`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {
          try {
            const txt = await res.text();
            m = `${m}: ${txt.slice(0, 100)}`;
          } catch (_) {}
        }
        throw new Error(`${m} (${res.status})`);
      }
      const blob = await res.blob();
      if (blob.type.startsWith("image/")) {
        tempUrl = window.URL.createObjectURL(blob);
        setQrCodeUrl(tempUrl);
      } else {
        try {
          const textError = await blob.text();
          console.error(
            "QR API did not return image, response text:",
            textError.slice(0, 200)
          );
          throw new Error("API không trả về ảnh QR hợp lệ.");
        } catch (readError) {
          console.error(
            "QR API did not return image and failed to read as text:",
            readError
          );
          throw new Error("API không trả về ảnh QR hợp lệ.");
        }
      }
    } catch (err: any) {
      console.error("Lỗi fetchQrCodeImage:", err);
      setQrCodeError(err.message || "Lỗi không xác định khi tải mã QR");
      setQrCodeUrl(null);
    } finally {
      setIsLoadingQrCode(false);
    }
    return tempUrl;
  }, []);

  useEffect(() => {
    fetchUserApprovedEvents();
  }, [fetchUserApprovedEvents]);
  useEffect(() => {
    let qrUrlToRevoke: string | null = null;
    if (selectedEventId) {
      setAttendees([]);
      setOriginalAttendance({});
      setAttendanceChanges({});
      setSelectedForDelete(new Set());
      setAttendeeError(null);
      setMode("view");
      setIsLoadingAttendees(true);
      setQrCodeUrl(null);
      setQrCodeError(null);
      setIsLoadingQrCode(true);
      setIsQrModalOpen(false);
      setIsScannerOpen(false);
      fetchAttendees(selectedEventId);
      fetchQrCodeImage(selectedEventId)
        .then((newUrl) => {
          qrUrlToRevoke = newUrl;
        })
        .catch(() => {});
    } else {
      setAttendees([]);
      setOriginalAttendance({});
      setAttendanceChanges({});
      setSelectedForDelete(new Set());
      setAttendeeError(null);
      setMode("view");
      setIsLoadingAttendees(false);
      setQrCodeUrl(null);
      setQrCodeError(null);
      setIsLoadingQrCode(false);
      setIsQrModalOpen(false);
      setIsScannerOpen(false);
    }
    return () => {
      if (qrUrlToRevoke) {
        window.URL.revokeObjectURL(qrUrlToRevoke);
      }
    };
  }, [selectedEventId, fetchAttendees, fetchQrCodeImage]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const toastId = toast.loading("Đang làm mới...");
    try {
      if (selectedEventId) {
        await fetchAttendees(selectedEventId, true);
      } else {
        await fetchUserApprovedEvents(true);
      }
      toast.dismiss(toastId);
    } catch (error: any) {
      console.error("Refresh failed:", error);
      toast.error("Làm mới thất bại.", { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedEventId, fetchAttendees, fetchUserApprovedEvents]);
  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setMode("view");
    setAttendeeSearchTerm("");
    setAttendeeSortOrder("az");
    setAttendeeViewMode("list");
    setIsQrModalOpen(false);
    setIsScannerOpen(false);
  };
  const handleBackToEventList = () => {
    setSelectedEventId(null);
  };

  const selectedEventFullData = useMemo(() => {
    if (!selectedEventId || !Array.isArray(userApprovedEvents)) return null;
    return (
      userApprovedEvents.find(
        (event) =>
          event &&
          typeof event.id !== "undefined" &&
          event.id === selectedEventId
      ) || null
    );
  }, [userApprovedEvents, selectedEventId]);

  const isEventOngoing = selectedEventFullData?.progressStatus === "ONGOING";

  const handleSetMode = (newMode: "view" | "attendance" | "delete") => {
    if (newMode === "attendance" && !isEventOngoing) {
      toast.error("Điểm danh chỉ khả dụng khi sự kiện đang diễn ra.");
      return;
    }
    setMode(newMode);
    if (newMode === "view") {
      setSelectedForDelete(new Set());
      setAttendanceChanges({ ...originalAttendance });
    } else if (newMode === "attendance") {
      setAttendanceChanges({ ...originalAttendance });
      setSelectedForDelete(new Set());
    } else if (newMode === "delete") {
      setAttendanceChanges({ ...originalAttendance });
      setSelectedForDelete(new Set());
    }
  };
  const handleCancelMode = () => {
    handleSetMode("view");
  };
  const handleAttendanceCheckboxChange = (
    userId: string,
    isChecked: boolean
  ) => {
    setAttendanceChanges((prev) => ({ ...prev, [userId]: isChecked }));
  };
  const handleDeleteCheckboxChange = (userId: string, isChecked: boolean) => {
    setSelectedForDelete((prev) => {
      const next = new Set(prev);
      if (isChecked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };
  const handleSelectAllForDelete = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = event.target.checked;
    const currentVisibleUserIds = processedAttendees.map((att) => att.userId);
    if (isChecked) {
      setSelectedForDelete(new Set(currentVisibleUserIds));
    } else {
      setSelectedForDelete(new Set());
    }
  };
  const handleSaveChanges = async () => {
    if (!selectedEventId || isProcessing) return;
    const changes: { userId: string; status: boolean }[] = [];
    Object.keys(attendanceChanges).forEach((id) => {
      if (
        id in originalAttendance &&
        attendanceChanges[id] !== originalAttendance[id]
      ) {
        changes.push({ userId: id, status: attendanceChanges[id] });
      } else if (
        !(id in originalAttendance) &&
        attendanceChanges[id] === true
      ) {
        console.warn(
          `User ID ${id} found in changes but not in original attendance.`
        );
      }
    });
    if (changes.length === 0) {
      toast("Không có thay đổi để lưu.", { icon: "ℹ️" });
      setMode("view");
      return;
    }
    setIsProcessing(true);
    const loadId = toast.loading(`Đang lưu ${changes.length} thay đổi...`);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Token không hợp lệ.", { id: loadId });
      setIsProcessing(false);
      return;
    }
    const promises = changes.map(({ userId, status }) => {
      const url = `http://localhost:8080/identity/api/events/${selectedEventId}/attendees/${userId}?isAttending=${status}`;
      return fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) {
            let m = `Lỗi lưu ${userId}`;
            try {
              const d = await res.json();
              m = d.message || m;
            } catch (_) {}
            return { status: "rejected", reason: m, userId };
          }
          try {
            const updateResult = await res.json();
            if (updateResult.code !== 1000 && updateResult.message) {
              return {
                status: "rejected",
                reason: updateResult.message,
                userId,
              };
            }
          } catch (e) {}
          return { status: "fulfilled", value: { userId, status } };
        })
        .catch((err) => ({ status: "rejected", reason: err.message, userId }));
    });
    const results = await Promise.allSettled(promises);
    let ok = 0,
      fail = 0;
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.status === "fulfilled") {
        ok++;
      } else {
        fail++;
        const reason =
          r.status === "rejected" ? r.reason : (r.value as any).reason;
        const failedUserId =
          r.status === "rejected"
            ? (r.reason as any)?.userId
            : (r.value as any).userId;
        console.error(`Lỗi lưu UserID ${failedUserId || "unknown"}:`, reason);
      }
    });
    if (ok > 0) {
      toast.success(`Đã lưu ${ok} thay đổi.`, { id: loadId });
    }
    if (fail > 0) {
      toast.error(`Lưu thất bại ${fail} thay đổi.`, {
        id: ok === 0 ? loadId : undefined,
      });
    } else if (ok === 0 && fail === 0) {
      toast.dismiss(loadId);
    }
    if (selectedEventId) {
      await fetchAttendees(selectedEventId);
    }
    setIsProcessing(false);
    setMode("view");
  };
  const executeBatchDelete = async () => {
    const idsToDelete = Array.from(selectedForDelete);
    if (!selectedEventId || idsToDelete.length === 0 || isProcessing) return;
    setIsProcessing(true);
    const loadId = toast.loading(`Đang xóa ${idsToDelete.length} người...`);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Token không hợp lệ.", { id: loadId });
      setIsProcessing(false);
      return;
    }
    const promises = idsToDelete.map((userId) => {
      const url = `http://localhost:8080/identity/api/events/${selectedEventId}/attendees/${userId}`;
      return fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) {
            let m = `Lỗi xóa ${userId}`;
            try {
              const d = await res.json();
              m = d.message || m;
            } catch (_) {}
            return { status: "rejected", reason: m, userId };
          }
          try {
            const deleteResult = await res.json();
            if (deleteResult.code !== 1000 && deleteResult.message) {
              return {
                status: "rejected",
                reason: deleteResult.message,
                userId,
              };
            }
          } catch (e) {}
          return { status: "fulfilled", value: userId };
        })
        .catch((err) => ({ status: "rejected", reason: err.message, userId }));
    });
    const results = await Promise.allSettled(promises);
    let ok = 0,
      fail = 0;
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.status === "fulfilled") {
        ok++;
      } else {
        fail++;
        const reason =
          r.status === "rejected" ? r.reason : (r.value as any).reason;
        const failedUserId =
          r.status === "rejected"
            ? (r.reason as any)?.userId
            : (r.value as any).userId;
        console.error(`Lỗi xóa UserID ${failedUserId || "unknown"}:`, reason);
      }
    });
    if (ok > 0) {
      toast.success(`Đã xóa ${ok} người.`, { id: loadId });
    }
    if (fail > 0) {
      toast.error(`Xóa thất bại ${fail} người.`, {
        id: ok === 0 ? loadId : undefined,
      });
    } else if (ok === 0 && fail === 0) {
      toast.dismiss(loadId);
    }
    if (selectedEventId) {
      await fetchAttendees(selectedEventId);
    }
    setSelectedForDelete(new Set());
    setIsProcessing(false);
    setMode("view");
  };
  const handleConfirmBatchDelete = () => {
    const ids = Array.from(selectedForDelete);
    if (ids.length === 0) {
      toast.error("Vui lòng chọn ít nhất một người để xóa.");
      return;
    }
    if (!currentUserId) {
      toast.error("Không thể xác định người dùng.");
      return;
    }
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận xóa",
      message: (
        <>
          Bạn chắc chắn muốn xóa{" "}
          <strong className="text-red-600">{ids.length} người</strong> đã chọn?
        </>
      ),
      onConfirm: () => {
        setConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        executeBatchDelete();
      },
      onCancel: () =>
        setConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        }),
      confirmVariant: "danger",
      confirmText: `Xóa (${ids.length})`,
      cancelText: "Hủy",
    });
  };
  const handleEventStartDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newStartDate = e.target.value;
    setEventStartDateFilter(newStartDate);
    if (eventEndDateFilter && newStartDate > eventEndDateFilter) {
      setEventEndDateFilter("");
    }
  };
  const handleEventEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (eventStartDateFilter && newEndDate < eventStartDateFilter) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setEventEndDateFilter(newEndDate);
    }
  };
  const handleExportClick = async (eventId: string | null) => {
    if (!eventId) {
      toast.error("Không tìm thấy ID sự kiện.");
      return;
    }
    setIsExporting(true);
    const exportToastId = toast.loading("Đang chuẩn bị file Excel...");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Token không hợp lệ.");
      const url = `http://localhost:8080/identity/api/events/${eventId}/attendees/export`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Type": "application/json",
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
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Đã bắt đầu tải file Excel!", { id: exportToastId });
    } catch (err: any) {
      console.error("Lỗi xuất file danh sách tham gia:", err);
      toast.error(err.message || "Xuất file danh sách tham gia thất bại.", {
        id: exportToastId,
      });
    } finally {
      setIsExporting(false);
    }
  };
  // const handleScanSuccess = useCallback(
  //   async (decodedResult: Html5QrcodeResult) => {
  //     const scannedUserId = decodedResult.decodedText;
  //     if (!selectedEventId || !scannedUserId) {
  //       toast.error("Dữ liệu quét không hợp lệ hoặc chưa chọn sự kiện.");
  //       return;
  //     }
  //     const alreadyAttending = attendees.find(
  //       (a) => a.userId === scannedUserId
  //     )?.attending;
  //     if (alreadyAttending) {
  //       toast.success(
  //         `${getAttendeeName(
  //           attendees.find((a) => a.userId === scannedUserId) || {
  //             userId: scannedUserId,
  //           }
  //         )} đã điểm danh trước đó.`,
  //         { icon: "✅" }
  //       );
  //       return;
  //     }
  //     const token = localStorage.getItem("authToken");
  //     if (!token) {
  //       toast.error("Vui lòng đăng nhập lại.");
  //       return;
  //     }
  //     const loadId = toast.loading(
  //       `Đang điểm danh cho user ${scannedUserId.substring(0, 8)}...`
  //     );
  //     setIsProcessing(true);
  //     try {
  //       const url = `http://localhost:8080/identity/api/events/${selectedEventId}/attendees/${scannedUserId}?isAttending=true`;
  //       const res = await fetch(url, {
  //         method: "PUT",
  //         headers: { Authorization: `Bearer ${token}` },
  //       });
  //       if (!res.ok) {
  //         let m = "Điểm danh thất bại";
  //         try {
  //           const d = await res.json();
  //           m = d.message || m;
  //         } catch (_) {}
  //         throw new Error(`${m} (${res.status})`);
  //       }
  //       await res.json();
  //       toast.success(
  //         `Điểm danh thành công cho ${getAttendeeName(
  //           attendees.find((a) => a.userId === scannedUserId) || {
  //             userId: scannedUserId,
  //           }
  //         )}!`,
  //         { id: loadId }
  //       );
  //       setAttendees((prev) =>
  //         prev.map((att) =>
  //           att.userId === scannedUserId ? { ...att, attending: true } : att
  //         )
  //       );
  //       setOriginalAttendance((prev) => ({ ...prev, [scannedUserId]: true }));
  //       setAttendanceChanges((prev) => ({ ...prev, [scannedUserId]: true }));
  //     } catch (err: any) {
  //       toast.error(`Điểm danh thất bại: ${err.message}`, { id: loadId });
  //     } finally {
  //       setIsProcessing(false);
  //     }
  //   },
  //   [selectedEventId, attendees]
  // );
  const handleCancelConfirmation = () => {
    setConfirmationState({
      ...confirmationState,
      isOpen: false,
      onConfirm: null,
    });
  };

  const processedEvents = useMemo(() => {
    if (!Array.isArray(userApprovedEvents)) return [];
    let eventsToProcess = [...userApprovedEvents];

    // Lọc theo trạng thái tiến trình (thay thế cho timeFilter cũ)
    if (
      eventStatusFilterOption !== "all" &&
      eventStatusFilterOption !== "dateRange"
    ) {
      eventsToProcess = eventsToProcess.filter(
        (event) => getEventStatus(event.time) === eventStatusFilterOption
      );
    }
    // Lọc theo khoảng ngày nếu chọn "dateRange"
    else if (
      eventStatusFilterOption === "dateRange" &&
      eventStartDateFilter &&
      eventEndDateFilter
    ) {
      try {
        const start = new Date(eventStartDateFilter);
        start.setHours(0, 0, 0, 0);
        const end = new Date(eventEndDateFilter);
        end.setHours(23, 59, 59, 999);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          eventsToProcess = eventsToProcess.filter((event) => {
            const dateStrToUse = event.time || event.createdAt;
            if (!dateStrToUse) return false;
            try {
              const eventDate = new Date(dateStrToUse);
              return (
                !isNaN(eventDate.getTime()) &&
                eventDate >= start &&
                eventDate <= end
              );
            } catch {
              return false;
            }
          });
        }
      } catch (e) {
        console.error("Error parsing date range for filtering:", e);
      }
    }

    if (eventSearchTerm.trim()) {
      const lowerSearchTerm = eventSearchTerm.trim().toLowerCase();
      eventsToProcess = eventsToProcess.filter(
        (event) =>
          event.name.toLowerCase().includes(lowerSearchTerm) ||
          (event.location &&
            event.location.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (eventSortOrder === "za") {
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
    userApprovedEvents,
    eventStatusFilterOption,
    eventStartDateFilter,
    eventEndDateFilter,
    eventSearchTerm,
    eventSortOrder,
  ]);

  const processedAttendees = useMemo(() => {
    if (!Array.isArray(attendees)) return [];
    let attendeesToProcess = [...attendees];
    if (attendeeSearchTerm.trim()) {
      const lowerSearchTerm = attendeeSearchTerm.trim().toLowerCase();
      attendeesToProcess = attendeesToProcess.filter(
        (att) =>
          getAttendeeName(att).toLowerCase().includes(lowerSearchTerm) ||
          (att.username &&
            att.username.toLowerCase().includes(lowerSearchTerm)) ||
          (att.studentCode &&
            att.studentCode.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (attendeeSortOrder === "az") {
      attendeesToProcess.sort((a, b) =>
        getAttendeeName(a).localeCompare(getAttendeeName(b), "vi", {
          sensitivity: "base",
        })
      );
    } else if (attendeeSortOrder === "za") {
      attendeesToProcess.sort((a, b) =>
        getAttendeeName(b).localeCompare(getAttendeeName(a), "vi", {
          sensitivity: "base",
        })
      );
    } else if (attendeeSortOrder === "status") {
      attendeesToProcess.sort((a, b) => {
        const changesToUse =
          mode === "attendance" ? attendanceChanges : originalAttendance;
        const statusA = changesToUse[a.userId] ?? false;
        const statusB = changesToUse[b.userId] ?? false;
        if (statusA !== statusB) {
          return statusA ? -1 : 1;
        }
        return getAttendeeName(a).localeCompare(getAttendeeName(b), "vi", {
          sensitivity: "base",
        });
      });
    }
    return attendeesToProcess;
  }, [
    attendees,
    attendeeSearchTerm,
    attendeeSortOrder,
    originalAttendance,
    attendanceChanges,
    mode,
  ]);




  // Hàm này sẽ được gọi khi QRScanner trong modal quét thành công
  const handleSuccessfulScan = async (decodedText: string) => {
    if (isProcessingCheckIn) return; // Đã có xử lý, không làm gì thêm

    setIsProcessingCheckIn(true);
    const loadingToastId = toast.loading("Đang xử lý điểm danh...");
    console.log(`Attempting check-in for event ${event.id} with QR data: ${decodedText}`);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Chưa đăng nhập hoặc token không hợp lệ.");
      }

      const apiUrl = `http://localhost:8080/identity/api/events/${event.id}/check-in`;
      const formData = new FormData();
      formData.append('qrCodeData', decodedText);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.code === 1000) {
        toast.success(result.message || "Điểm danh thành công!", { id: loadingToastId });
        // TODO: Gọi hàm cập nhật danh sách người tham dự hoặc UI nếu cần
        // Ví dụ: fetchAttendeesForEvent(event.id);
      } else {
        throw new Error(result.message || `Lỗi điểm danh từ API (${response.status})`);
      }
    } catch (error: any) {
      console.error("Lỗi khi điểm danh:", error);
      toast.error(error.message || "Điểm danh thất bại.", { id: loadingToastId });
    } finally {
      setIsProcessingCheckIn(false);
      setIsScannerOpen(false); // Đóng modal sau khi xử lý
    }
  };

  const selectedEventName = selectedEventFullData?.name;

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanSuccess = (decodedText: string) => {
    setScanResult(decodedText);
    setError(null);
    setIsScannerOpen(false); // Đóng modal khi quét thành công
    // Xử lý kết quả quét ở đây
  };

  const handleScanError = (errorMessage: string) => {
    if (!errorMessage.includes('NotFoundException') && 
        !errorMessage.includes('NotAllowedError')) {
      setError(errorMessage);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-full p-3 md:p-5 bg-gray-50">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0 flex-wrap gap-2">
        <h2 className="text-xl md:text-2xl font-bold text-teal-600">
          {selectedEventId ? (
            <>
              {" "}
              <button
                onClick={handleBackToEventList}
                className="mr-1 p-1 rounded hover:bg-gray-200 align-middle cursor-pointer"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>{" "}
              {`Quản lý điểm danh: ${selectedEventName || "..."}`}{" "}
            </>
          ) : (
            "Chọn sự kiện để điểm danh"
          )}
        </h2>
        <button
          onClick={handleRefresh}
          disabled={
            isLoadingEvents ||
            isLoadingAttendees ||
            isProcessing ||
            isRefreshing ||
            isExporting
          }
          className="p-2 border cursor-pointer border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 bg-white hover:bg-gray-50 disabled:opacity-50 flex items-center ml-auto"
          title={selectedEventId ? "Làm mới DS tham gia" : "Làm mới DS sự kiện"}
        >
          {" "}
          {isRefreshing ? (
            <ReloadIcon className="w-5 h-5 animate-spin text-teal-600" />
          ) : (
            <ReloadIcon className="w-5 h-5 text-teal-600" />
          )}{" "}
        </button>
      </div>

      {!selectedEventId ? (
        <>
          <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
              <div className="relative lg:col-span-1 xl:col-span-1">
                <label
                  htmlFor="searchEvents"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Tìm sự kiện
                </label>
                <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                  <MagnifyingGlassIcon />
                </span>
                <input
                  type="text"
                  id="searchEvents"
                  placeholder="Tên hoặc địa điểm..."
                  value={eventSearchTerm}
                  onChange={(e) => setEventSearchTerm(e.target.value)}
                  className="w-full p-2 pl-10 border rounded-md text-sm focus:ring-teal-500"
                />
              </div>
              <div>
                <label
                  htmlFor="sortEvents"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Sắp xếp
                </label>
                <select
                  id="sortEvents"
                  value={eventSortOrder}
                  onChange={(e) =>
                    setEventSortOrder(e.target.value as "az" | "za")
                  }
                  className="w-full p-2 border rounded-md text-sm h-[40px] appearance-none pr-8 bg-white"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.5rem center",
                    backgroundSize: "1.5em 1.5em",
                  }}
                >
                  <option value="az">A - Z</option>{" "}
                  <option value="za">Z - A</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="eventStatusFilter"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Lọc trạng thái
                </label>
                <select
                  id="eventStatusFilter"
                  value={eventStatusFilterOption}
                  onChange={(e) =>
                    setEventStatusFilterOption(e.target.value as any)
                  }
                  className="w-full p-2 border rounded-md text-sm h-[40px] appearance-none pr-8 bg-white"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.5rem center",
                    backgroundSize: "1.5em 1.5em",
                  }}
                >
                  <option value="all">♾️ Tất cả</option>
                  <option value="upcoming">☀️ Sắp diễn ra</option>
                  <option value="ongoing">🟢 Đang diễn ra</option>
                  <option value="ended">🏁 Đã kết thúc</option>
                  <option value="dateRange">🔢 Khoảng ngày</option>
                </select>
              </div>
              <div className="flex items-end justify-start md:justify-end gap-2">
                <div className="flex w-full sm:w-auto">
                  <button
                    onClick={() => setEventViewMode("list")}
                    title="Danh sách"
                    className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition ${
                      eventViewMode === "list"
                        ? "bg-teal-600 text-white z-10"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <ListBulletIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setEventViewMode("card")}
                    title="Thẻ"
                    className={`flex-1 sm:flex-none p-2 rounded-r-md border transition ${
                      eventViewMode === "card"
                        ? "bg-teal-600 text-white z-10"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Component1Icon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            {eventStatusFilterOption === "dateRange" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                <div>
                  <label
                    htmlFor="startDateFilterEvents"
                    className="block text-xs font-medium mb-1"
                  >
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    id="startDateFilterEvents"
                    value={eventStartDateFilter}
                    onChange={handleEventStartDateChange}
                    max={eventEndDateFilter || undefined}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="endDateFilterEvents"
                    className="block text-xs font-medium mb-1"
                  >
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    id="endDateFilterEvents"
                    value={eventEndDateFilter}
                    onChange={handleEventEndDateChange}
                    min={eventStartDateFilter || undefined}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="overflow-y-auto flex-grow mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-300">
            {isLoadingEvents ? (
              <p className="text-center text-gray-500 italic py-5">
                Đang tải...
              </p>
            ) : eventError ? (
              <p className="text-center text-red-600 p-3">{eventError}</p>
            ) : processedEvents.length === 0 ? (
              <p className="text-center text-gray-500 italic py-5">
                {eventSearchTerm ||
                eventStatusFilterOption !== "all" ||
                eventStartDateFilter ||
                eventEndDateFilter
                  ? "Không tìm thấy sự kiện."
                  : "Bạn không có sự kiện đã duyệt."}
              </p>
            ) : eventViewMode === "list" ? (
              <ul className="space-y-3">
                {processedEvents.map((event) => (
                  <li
                    key={event.id}
                    className="bg-white shadow-lg rounded-xl overflow-hidden transition transform hover:scale-[1.01] hover:shadow-xl flex flex-col md:flex-row border border-gray-200 hover:border-teal-300"
                  >
                    <div
                      className="relative w-full md:w-48 xl:w-56 flex-shrink-0 h-48 md:h-auto cursor-pointer"
                      onClick={() => handleSelectEvent(event.id)}
                    >
                      {event.avatarUrl ? (
                        <Image
                          src={event.avatarUrl}
                          alt={event.name}
                          layout="fill"
                          objectFit="cover"
                          className="bg-gray-100"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-3xl font-semibold">
                          {event.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col justify-between flex-grow md:pl-4">
                      <div
                        onClick={() => handleSelectEvent(event.id)}
                        className="cursor-pointer"
                      >
                        <h3 className="font-semibold text-base text-gray-800 mb-1 line-clamp-1 hover:text-teal-600">
                          {event.name}
                        </h3>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          {(event.time || event.createdAt) && (
                            <p className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 opacity-70" />
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
                            </p>
                          )}
                          {event.location && (
                            <p className="flex items-center gap-1">
                              <span className="opacity-70">📍</span>{" "}
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => handleSelectEvent(event.id)}
                          className="px-3 py-1.5 rounded-md bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium transition"
                        >
                          Quản lý điểm danh
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {processedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white shadow-lg rounded-xl overflow-hidden flex flex-col border border-gray-200 transition transform hover:scale-[1.02] hover:shadow-xl"
                  >
                    <div
                      className="w-full h-36 bg-gray-200 relative cursor-pointer"
                      onClick={() => handleSelectEvent(event.id)}
                    >
                      {event.avatarUrl ? (
                        <Image
                          src={event.avatarUrl}
                          alt={event.name}
                          layout="fill"
                          objectFit="cover"
                          className="bg-gray-100"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                          {event.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-grow justify-between">
                      <div
                        onClick={() => handleSelectEvent(event.id)}
                        className="cursor-pointer"
                      >
                        <h3 className="font-semibold text-base text-gray-800 line-clamp-2 mb-1 hover:text-teal-600">
                          {event.name}
                        </h3>
                        {(event.time || event.createdAt) && (
                          <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 opacity-70" />
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
                          </p>
                        )}
                        {event.location && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="opacity-70">📍</span>{" "}
                            {event.location}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => handleSelectEvent(event.id)}
                          className="px-3 py-1.5 rounded-md bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium transition"
                        >
                          Quản lý điểm danh
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 p-3 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
              <div className="relative sm:col-span-1">
                <label
                  htmlFor="searchAttendees"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Tìm kiếm
                </label>
                <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                  <MagnifyingGlassIcon />
                </span>
                <input
                  type="text"
                  id="searchAttendees"
                  placeholder="Tên, MSSV..."
                  value={attendeeSearchTerm}
                  onChange={(e) => setAttendeeSearchTerm(e.target.value)}
                  className="w-full p-2 pl-10 border rounded-md text-sm focus:ring-teal-500"
                />
              </div>
              <div className="sm:col-span-1">
                <label
                  htmlFor="sortAttendees"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  Sắp xếp
                </label>
                <select
                  id="sortAttendees"
                  value={attendeeSortOrder}
                  onChange={(e) => setAttendeeSortOrder(e.target.value as any)}
                  className="w-full p-2 border rounded-md text-sm h-[40px] appearance-none pr-8 bg-white"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 0.5rem center",
                    backgroundSize: "1.5em 1.5em",
                  }}
                >
                  <option value="az">A - Z</option>{" "}
                  <option value="za">Z - A</option>{" "}
                  <option value="status">Trạng thái</option>
                </select>
              </div>
              <div className="flex items-end justify-start sm:justify-end gap-2">
                <div className="flex w-full sm:w-auto">
                  <button
                    onClick={() => setAttendeeViewMode("list")}
                    title="Danh sách"
                    className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition ${
                      attendeeViewMode === "list"
                        ? "bg-teal-600 text-white z-10"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <ListBulletIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setAttendeeViewMode("card")}
                    title="Thẻ"
                    className={`flex-1 sm:flex-none p-2 rounded-r-md border transition ${
                      attendeeViewMode === "card"
                        ? "bg-teal-600 text-white z-10"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Component1Icon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-y-auto flex-grow mb-4 pr-1 scrollbar-thin scrollbar-thumb-gray-300">
            {isLoadingAttendees ? (
              <p className="text-center text-gray-500 italic py-5">
                Đang tải danh sách...
              </p>
            ) : attendeeError ? (
              <p className="text-center text-red-600 p-3">{attendeeError}</p>
            ) : !selectedEventId ? (
              <p className="text-center text-gray-400 italic py-5">
                Vui lòng chọn sự kiện.
              </p>
            ) : processedAttendees.length === 0 ? (
              <p className="text-center text-gray-500 italic py-5">
                {attendeeSearchTerm
                  ? "Không tìm thấy."
                  : "Chưa có người tham gia."}
              </p>
            ) : (
              <div className="space-y-0">
                {mode === "delete" && processedAttendees.length > 0 && (
                  <div className="flex items-center justify-between border-b pb-2 mb-2 sticky top-0 bg-gray-50 py-2 z-10 px-3 -mx-1 rounded-t-md">
                    {" "}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`select-all-delete`}
                        className="mr-2 cursor-pointer h-4 w-4"
                        checked={
                          processedAttendees.length > 0 &&
                          selectedForDelete.size ===
                            processedAttendees.length &&
                          processedAttendees.every((att) =>
                            selectedForDelete.has(att.userId)
                          )
                        }
                        onChange={handleSelectAllForDelete}
                        disabled={isProcessing}
                      />
                      <label htmlFor={`select-all-delete`} className="text-sm">
                        Chọn tất cả ({selectedForDelete.size})
                      </label>
                    </div>{" "}
                  </div>
                )}
                {mode === "attendance" &&
                  isEventOngoing &&
                  processedAttendees.length > 0 && (
                    <div className="text-right border-b pb-2 mb-2 sticky top-0 bg-gray-50 py-2 z-10 px-3 -mx-1 rounded-t-md">
                      {" "}
                      <p className="text-sm text-gray-500 italic">
                        Đánh dấu vào ô để xác nhận có mặt.
                      </p>{" "}
                    </div>
                  )}
                {attendeeViewMode === "list" ? (
                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                    {processedAttendees.map((attendee) => {
                      const isSelectedForDelete = selectedForDelete.has(
                        attendee.userId
                      );
                      const isCheckedForAttendance =
                        attendanceChanges[attendee.userId] ?? false;
                      const isAttending =
                        originalAttendance[attendee.userId] ?? false;
                      const hasChanged =
                        mode === "attendance" &&
                        isEventOngoing &&
                        isCheckedForAttendance !== isAttending;
                      const isRowProcessing = isProcessing;
                      return (
                        <li
                          key={attendee.userId}
                          className={`flex items-center justify-between p-3 transition-colors ${
                            mode === "delete" && isSelectedForDelete
                              ? "bg-red-50"
                              : hasChanged
                              ? isCheckedForAttendance
                                ? "bg-green-50"
                                : "bg-gray-100"
                              : "hover:bg-gray-50"
                          } ${isRowProcessing ? "opacity-70" : ""}`}
                        >
                          {" "}
                          <div className="flex items-center gap-3 flex-grow mr-2 overflow-hidden">
                            {" "}
                            {mode === "delete" && (
                              <input
                                type="checkbox"
                                checked={isSelectedForDelete}
                                onChange={(e) =>
                                  handleDeleteCheckboxChange(
                                    attendee.userId,
                                    e.target.checked
                                  )
                                }
                                disabled={isRowProcessing}
                                className="w-4 h-4 text-red-600 rounded cursor-pointer"
                              />
                            )}{" "}
                            {mode === "attendance" && isEventOngoing && (
                              <input
                                type="checkbox"
                                checked={isCheckedForAttendance}
                                onChange={(e) =>
                                  handleAttendanceCheckboxChange(
                                    attendee.userId,
                                    e.target.checked
                                  )
                                }
                                disabled={isRowProcessing}
                                className="w-4 h-4 text-green-600 rounded cursor-pointer"
                              />
                            )}{" "}
                            <img
                              src={
                                attendee.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  getAttendeeName(attendee)
                                )}&background=random&color=fff`
                              }
                              alt={`Avatar`}
                              className="w-8 h-8 rounded-full object-cover"
                            />{" "}
                            <div className="flex-grow overflow-hidden">
                              {" "}
                              <p
                                id={`attendee-name-list-${attendee.userId}`}
                                className={`font-semibold text-sm truncate ${
                                  mode === "delete" && isSelectedForDelete
                                    ? "text-red-800"
                                    : "text-gray-800"
                                }`}
                              >
                                {getAttendeeName(attendee)}
                              </p>{" "}
                              <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                                {" "}
                                {attendee.studentCode && (
                                  <span className="text-blue-600">
                                    MSSV: {attendee.studentCode}
                                  </span>
                                )}{" "}
                                {attendee.username && (
                                  <span>@{attendee.username}</span>
                                )}{" "}
                                {attendee.roleName && (
                                  <span className="italic">
                                    ({attendee.roleName})
                                  </span>
                                )}{" "}
                                {attendee.positionName && (
                                  <span className="font-medium">
                                    [{attendee.positionName}]
                                  </span>
                                )}{" "}
                              </div>{" "}
                            </div>{" "}
                          </div>{" "}
                          {(mode === "view" ||
                            (mode === "attendance" && !isEventOngoing)) &&
                            !isRowProcessing && (
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                                  isAttending
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-200 text-gray-600"
                                }`}
                              >
                                {isAttending ? "Có mặt" : "Vắng"}
                              </span>
                            )}{" "}
                          {mode === "attendance" &&
                            isEventOngoing &&
                            hasChanged && (
                              <span
                                className={`shrink-0 p-1 rounded-full ml-2 ${
                                  isCheckedForAttendance
                                    ? "bg-green-200 text-green-700"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {isCheckedForAttendance ? (
                                  <CheckIcon className="w-3 h-3" />
                                ) : (
                                  <Cross2Icon className="w-3 h-3" />
                                )}
                              </span>
                            )}{" "}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {processedAttendees.map((attendee) => {
                      const isSelectedForDelete = selectedForDelete.has(
                        attendee.userId
                      );
                      const isCheckedForAttendance =
                        attendanceChanges[attendee.userId] ?? false;
                      const isAttending =
                        originalAttendance[attendee.userId] ?? false;
                      const hasChanged =
                        mode === "attendance" &&
                        isEventOngoing &&
                        isCheckedForAttendance !== isAttending;
                      const isRowProcessing = isProcessing;
                      return (
                        <div
                          key={attendee.userId}
                          className={`p-3 bg-white shadow rounded-lg flex flex-col border transition-colors ${
                            mode === "delete" && isSelectedForDelete
                              ? "border-red-300 bg-red-50"
                              : hasChanged
                              ? isCheckedForAttendance
                                ? "border-green-300 bg-green-50"
                                : "border-gray-300 bg-gray-100"
                              : "border-gray-200 hover:bg-gray-50"
                          } ${isRowProcessing ? "opacity-70" : ""}`}
                        >
                          {" "}
                          <div className="flex items-start gap-3 mb-2 flex-grow">
                            {" "}
                            {mode === "delete" && (
                              <input
                                type="checkbox"
                                checked={isSelectedForDelete}
                                onChange={(e) =>
                                  handleDeleteCheckboxChange(
                                    attendee.userId,
                                    e.target.checked
                                  )
                                }
                                disabled={isRowProcessing}
                                className="mt-1 w-4 h-4 text-red-600 rounded cursor-pointer"
                              />
                            )}{" "}
                            {mode === "attendance" && isEventOngoing && (
                              <input
                                type="checkbox"
                                checked={isCheckedForAttendance}
                                onChange={(e) =>
                                  handleAttendanceCheckboxChange(
                                    attendee.userId,
                                    e.target.checked
                                  )
                                }
                                disabled={isRowProcessing}
                                className="mt-1 w-4 h-4 text-green-600 rounded cursor-pointer"
                              />
                            )}{" "}
                            <img
                              src={
                                attendee.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  getAttendeeName(attendee)
                                )}&background=random&color=fff`
                              }
                              alt={`Avatar`}
                              className="w-10 h-10 rounded-full object-cover"
                            />{" "}
                            <div className="flex-grow overflow-hidden">
                              {" "}
                              <p
                                id={`attendee-name-card-${attendee.userId}`}
                                className={`font-semibold text-sm truncate ${
                                  mode === "delete" && isSelectedForDelete
                                    ? "text-red-800"
                                    : "text-gray-800"
                                }`}
                              >
                                {getAttendeeName(attendee)}
                              </p>{" "}
                              {attendee.username && (
                                <p className="text-xs text-gray-500 truncate">
                                  @{attendee.username}
                                </p>
                              )}{" "}
                            </div>{" "}
                            {(mode === "view" ||
                              (mode === "attendance" && !isEventOngoing)) &&
                              !isRowProcessing && (
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full self-start shrink-0 ${
                                    isAttending
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-200 text-gray-600"
                                  }`}
                                >
                                  {isAttending ? "Có mặt" : "Vắng"}
                                </span>
                              )}{" "}
                            {mode === "attendance" &&
                              isEventOngoing &&
                              hasChanged && (
                                <span
                                  className={`self-start shrink-0 p-1 rounded-full ml-1 ${
                                    isCheckedForAttendance
                                      ? "bg-green-200 text-green-700"
                                      : "bg-red-100 text-red-600"
                                  }`}
                                >
                                  {isCheckedForAttendance ? (
                                    <CheckIcon className="w-3 h-3" />
                                  ) : (
                                    <Cross2Icon className="w-3 h-3" />
                                  )}
                                </span>
                              )}{" "}
                          </div>{" "}
                          <div
                            className={`space-y-1 text-xs text-gray-600 ${
                              mode === "view" ||
                              (mode === "attendance" && !isEventOngoing)
                                ? "pl-[52px]"
                                : "pl-3"
                            }`}
                          >
                            {" "}
                            {attendee.studentCode && (
                              <p className="flex items-center gap-1">
                                <IdCardIcon className="w-3 h-3 text-blue-500" />{" "}
                                <span className="truncate">
                                  MSSV: {attendee.studentCode}
                                </span>
                              </p>
                            )}{" "}
                            {attendee.roleName && (
                              <p className="flex items-center gap-1">
                                <PersonIcon className="w-3 h-3 text-purple-500" />{" "}
                                <span className="truncate italic">
                                  ({attendee.roleName})
                                </span>
                              </p>
                            )}{" "}
                            {attendee.positionName && (
                              <p className="flex items-center gap-1">
                                <Link2Icon className="w-3 h-3 text-orange-500" />{" "}
                                <span className="truncate font-medium">
                                  [{attendee.positionName}]
                                </span>
                              </p>
                            )}{" "}
                          </div>{" "}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedEventId &&
            !isLoadingAttendees &&
            processedAttendees.length > 0 && (
              <div className="flex justify-between items-center border-t border-gray-200 pt-4 mt-auto flex-shrink-0 gap-3 flex-wrap">
                <div>
                  {mode === "view" && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleSetMode("attendance")}
                        disabled={
                          !isEventOngoing ||
                          isProcessing ||
                          attendees.length === 0
                        }
                        className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer inline-flex items-center gap-1 shadow-sm border ${
                          !isEventOngoing || attendees.length === 0
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-green-100 hover:bg-green-200 text-green-800 border-green-200"
                        }`}
                        title={
                          !isEventOngoing
                            ? "Chỉ điểm danh khi sự kiện đang diễn ra"
                            : attendees.length === 0
                            ? "Chưa có người tham gia"
                            : "Chuyển sang chế độ điểm danh"
                        }
                      >
                        <CheckIcon /> Điểm danh
                      </button>
                      <button
                        onClick={() => setIsQrModalOpen(true)}
                        disabled={
                          !isEventOngoing ||
                          isProcessing ||
                          isLoadingQrCode ||
                          !!qrCodeError ||
                          !qrCodeUrl
                        }
                        className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer inline-flex items-center gap-1 shadow-sm border ${
                          !isEventOngoing
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-200"
                        }`}
                        title={
                          !isEventOngoing
                            ? "Chỉ xem QR khi sự kiện đang diễn ra"
                            : ""
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m0 4v1m0 4v1m0 4v1m-4-8h1m4 0h1m4 0h1M4 12h1m4 0h1m4 0h1m4 0h1m-4 4h1m-4-4h1m-4 4h1m4-4h1m0 4h1m-4 0h1m-4-4h1"
                          />
                        </svg>{" "}
                        QR điểm danh
                      </button>
<button
        onClick={() => setIsScannerOpen(true)}
        disabled={!isEventOngoing || isProcessing}
        className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer inline-flex items-center gap-1 shadow-sm border ${
          !isEventOngoing
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : "bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-indigo-200"
        }`}
        title={
          !isEventOngoing
            ? "Chỉ quét QR khi sự kiện đang diễn ra"
            : ""
        }
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m-4 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2m14 0H3"
          />
        </svg>
        Quét QR
      </button>

      {/* Modal quét QR */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/30 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Quét mã QR</h3>
              <button 
                onClick={() => setIsScannerOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <QRScanner 
              onScanSuccess={handleScanSuccess} 
              onScanError={handleScanError} 
            />
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 rounded text-red-700">
                <p>{error}</p>
              </div>
            )}
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setIsScannerOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hiển thị kết quả quét (nếu cần) */}
      {scanResult && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <p>Kết quả quét: {scanResult}</p>
        </div>
      )}
                      {/* <button
                        onClick={() => {
                          setIsScannerOpen(true);
                        }}
                        disabled={!isEventOngoing || isProcessing}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer inline-flex items-center gap-1 shadow-sm border ${
                          !isEventOngoing
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                            : "bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border-indigo-200"
                        }`}
                        title={
                          !isEventOngoing
                            ? "Chỉ quét QR khi sự kiện đang diễn ra"
                            : ""
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7m-4 0V5a2 2 0 00-2-2H7a2 2 0 00-2 2v2m14 0H3"
                          />
                        </svg>{" "}
                        Quét QR
                      </button> */}
                      <button
                        onClick={() => handleSetMode("delete")}
                        disabled={isProcessing || attendees.length === 0}
                        className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 border border-red-200"
                      >
                        <TrashIcon /> Xóa người
                      </button>
                    </div>
                  )}
                  {mode === "attendance" && (
                    <div className="flex gap-2">
                      {" "}
                      <button
                        onClick={handleCancelMode}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 border"
                      >
                        Hủy
                      </button>{" "}
                      <button
                        onClick={handleSaveChanges}
                        disabled={
                          isProcessing ||
                          Object.keys(attendanceChanges).every(
                            (k) =>
                              k in originalAttendance &&
                              attendanceChanges[k] === originalAttendance[k]
                          )
                        }
                        className={`px-4 py-1.5 rounded-md text-white text-xs font-medium ${
                          isProcessing ||
                          Object.keys(attendanceChanges).every(
                            (k) =>
                              k in originalAttendance &&
                              attendanceChanges[k] === originalAttendance[k]
                          )
                            ? "bg-blue-300 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {isProcessing ? "Đang lưu..." : "Lưu điểm danh"}
                      </button>{" "}
                    </div>
                  )}
                  {mode === "delete" && (
                    <div className="flex gap-2">
                      {" "}
                      <button
                        onClick={handleCancelMode}
                        disabled={isProcessing}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 border"
                      >
                        Hủy
                      </button>{" "}
                      <button
                        onClick={handleConfirmBatchDelete}
                        disabled={isProcessing || selectedForDelete.size === 0}
                        className={`px-4 py-1.5 rounded-md text-white text-xs font-medium inline-flex items-center gap-1 ${
                          isProcessing || selectedForDelete.size === 0
                            ? "bg-red-300 cursor-not-allowed"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        <TrashIcon /> Xóa ({selectedForDelete.size})
                      </button>{" "}
                    </div>
                  )}
                </div>
                <div>
                  {" "}
                  <button
                    onClick={() => handleExportClick(selectedEventId)}
                    disabled={
                      isExporting ||
                      isLoadingAttendees ||
                      attendees.length === 0 ||
                      isProcessing
                    }
                    className={`px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1 border border-blue-200 ${
                      isExporting ? "animate-pulse" : ""
                    }`}
                  >
                    {" "}
                    <DownloadIcon className="w-3 h-3" />{" "}
                    {isExporting ? "Đang xuất..." : "Xuất Excel"}{" "}
                  </button>{" "}
                </div>
              </div>
            )}
        </>
      )}

      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmVariant={confirmationState.confirmVariant}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={confirmationState.onConfirm || (() => {})}
        onCancel={() =>
          setConfirmationState({
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

export default AttendeesTabContent;
