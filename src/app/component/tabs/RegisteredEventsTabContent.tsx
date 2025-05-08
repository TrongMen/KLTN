"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  Cross2Icon,
  CalendarIcon,
  Component1Icon,
  ListBulletIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import AttendeeQrScannerModal from "../../../modals/AttendeeQrScannerModal";

interface EventInfo {
  id: string;
  name: string;
  time?: string;
  location?: string;
  description?: string;
  content?: string;
  status?: string;
  purpose?: string;
  createdBy?: string;
  createdAt?: string;
  attendees?: any[];
  organizers?: any[];
  participants?: any[];
  permissions?: string[];
  rejectionReason?: string | null;
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

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string | null;
  isLoading: boolean;
  error: string | null;
  userId: string | null;
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
    let b =
      "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger") {
      b +=
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
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
            confirmVariant === "danger" ? "text-red-700" : "text-gray-800"
          }`}
        >
          {" "}
          {title}{" "}
        </h3>
        <div className="text-sm text-gray-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel} className={cancelBtnClasses}>
            {" "}
            {cancelText}{" "}
          </button>
          <button onClick={onConfirm} className={confirmBtnClasses}>
            {" "}
            {confirmText}{" "}
          </button>
        </div>
      </div>
    </div>
  );
}

function QRCodeModal({
  isOpen,
  onClose,
  qrCodeUrl,
  isLoading,
  error,
  userId,
}: QRCodeModalProps) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 cursor-pointer right-2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          aria-label="Đóng"
        >
        
          <Cross2Icon className="w-5 h-5" />{" "}
        </button>
        <h3 className="text-lg font-bold mb-4 text-gray-800">
          Mã QR Điểm Danh Của Bạn
        </h3>
        <div className="relative w-64 h-64 mx-auto mb-4 bg-gray-100 rounded flex items-center justify-center overflow-hidden border">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              {" "}
              <svg
                className="animate-spin h-10 w-10 text-teal-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                {" "}
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>{" "}
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>{" "}
              </svg>{" "}
            </div>
          )}
          {error && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              {" "}
              <Cross2Icon className="w-8 h-8 text-red-500 mb-2" />{" "}
              <p className="text-xs text-red-600">{error}</p>{" "}
            </div>
          )}
          {qrCodeUrl && !isLoading && !error && (
            <img
              src={qrCodeUrl}
              alt={`Mã QR cho người dùng ${userId || "hiện tại"}`}
              className="object-contain w-full h-full"
              onError={(e) => console.error("Lỗi tải ảnh QR:", e)}
            />
          )}
          {!qrCodeUrl && !isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
              {" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-gray-400 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                {" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v1m6 11h2m-6.5 2H11a1 1 0 01-1-1V11a1 1 0 011-1h2a1 1 0 011 1v5.5a1.5 1.5 0 01-1.5 1.5h-1.5zM12 4V3m6 11h1m-6.5 2H11a1 1 0 01-1-1V11a1 1 0 011-1h2a1 1 0 011 1v5.5a1.5 1.5 0 01-1.5 1.5h-1.5zM12 4V3"
                />{" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 8h2v2H4zm12 0h2v2h-2zM4 12h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 16h2v2H4zm4 1h2v1H8zm4 0h2v1h-2zm4 0h2v1h-2zM4 20h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2z"
                />{" "}
              </svg>{" "}
              <p className="text-xs text-gray-500">Chưa có mã QR</p>{" "}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-2 px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          {" "}
          Đóng{" "}
        </button>
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

interface RegisteredEventsTabContentProps {
  currentUserId: string | null;
  isLoadingUserId: boolean;
  registeredEventIds: Set<string>;
  createdEventIds: Set<string>;
  onRegistrationChange: (eventId: string, registered: boolean) => void;
}

const RegisteredEventsTabContent: React.FC<RegisteredEventsTabContentProps> = ({
  currentUserId,
  isLoadingUserId,
  registeredEventIds,
  createdEventIds,
  onRegistrationChange,
}) => {
  const [tab, setTab] = useState<"available" | "registered">("available");
  const [availableEvents, setAvailableEvents] = useState<EventInfo[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState<boolean>(true);
  const [errorAvailable, setErrorAvailable] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<
    string | "batch_unregister" | null
  >(null);
  const [viewingEventDetails, setViewingEventDetails] =
    useState<EventInfo | null>(null);
  const [selectedToUnregister, setSelectedToUnregister] = useState<Set<string>>(
    new Set()
  );
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [eventSortOrder, setEventSortOrder] = useState<"az" | "za">("az");
  const [eventTimeFilter, setEventTimeFilter] = useState<
    "all" | "today" | "thisWeek" | "thisMonth" | "dateRange"
  >("all");
  const [eventStartDateFilter, setEventStartDateFilter] = useState<string>("");
  const [eventEndDateFilter, setEventEndDateFilter] = useState<string>("");
  const [eventViewMode, setEventViewMode] = useState<"list" | "card">("list");
  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoadingQRCode, setIsLoadingQRCode] = useState<boolean>(false);
  const [errorQRCode, setErrorQRCode] = useState<string | null>(null);
  const [isAttendeeScannerOpen, setIsAttendeeScannerOpen] = useState(false);

  const fetchAvailableEvents = useCallback(async () => {
    setIsLoadingAvailable(true);
    setErrorAvailable(null);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        let m = `Lỗi tải sự kiện`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(`${m} (${res.status})`);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setAvailableEvents(data.result);
      } else {
        setAvailableEvents([]);
        throw new Error(data.message || "Dữ liệu không hợp lệ");
      }
    } catch (err: any) {
      setErrorAvailable(err.message || "Lỗi không xác định");
      setAvailableEvents([]);
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableEvents();
  }, [fetchAvailableEvents]);

  const isRegistered = useCallback(
    (eventId: string): boolean => registeredEventIds.has(eventId),
    [registeredEventIds]
  );
  const isCreatedByUser = useCallback(
    (eventId: string): boolean => createdEventIds.has(eventId),
    [createdEventIds]
  );

  const executeRegistration = useCallback(
    async (eventToRegister: EventInfo) => {
      if (
        !currentUserId ||
        isLoadingUserId ||
        isRegistered(eventToRegister.id) ||
        isCreatedByUser(eventToRegister.id) ||
        isSubmitting
      )
        return;
      setIsSubmitting(eventToRegister.id);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.");
        setIsSubmitting(null);
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
        setIsSubmitting(null);
      }
    },
    [
      currentUserId,
      isLoadingUserId,
      isRegistered,
      isCreatedByUser,
      isSubmitting,
      onRegistrationChange,
    ]
  );

  const handleRegisterClick = useCallback(
    (eventToRegister: EventInfo) => {
      if (
        isSubmitting ||
        !currentUserId ||
        isLoadingUserId ||
        isRegistered(eventToRegister.id) ||
        isCreatedByUser(eventToRegister.id)
      )
        return;
      setConfirmationState({
        isOpen: true,
        title: "Xác nhận đăng ký",
        message: (
          <>
            Bạn chắc chắn muốn đăng ký <br />{" "}
            <strong className="text-indigo-600">
              "{eventToRegister.name}"
            </strong>
            ?
          </>
        ),
        onConfirm: () => {
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          });
          executeRegistration(eventToRegister);
        },
        onCancel: () =>
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          }),
        confirmVariant: "primary",
        confirmText: "Đăng ký",
        cancelText: "Hủy",
      });
    },
    [
      isSubmitting,
      currentUserId,
      isLoadingUserId,
      isRegistered,
      isCreatedByUser,
      executeRegistration,
    ]
  );

  const executeUnregistration = useCallback(
    async (eventToUnregister: EventInfo) => {
      if (isSubmitting || !currentUserId || isLoadingUserId) return;
      setIsSubmitting(eventToUnregister.id);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.");
        setIsSubmitting(null);
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
        setSelectedToUnregister((prev) => {
          const next = new Set(prev);
          next.delete(eventToUnregister.id);
          return next;
        });
      } catch (err: any) {
        toast.error(`Hủy đăng ký thất bại: ${err.message}`);
      } finally {
        setIsSubmitting(null);
      }
    },
    [isSubmitting, currentUserId, isLoadingUserId, onRegistrationChange]
  );

  const handleUnregisterClick = useCallback(
    (eventToUnregister: EventInfo) => {
      if (isSubmitting || !currentUserId || isLoadingUserId) return;
      setConfirmationState({
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
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          });
          executeUnregistration(eventToUnregister);
        },
        onCancel: () =>
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          }),
        confirmVariant: "danger",
        confirmText: "Xác nhận hủy",
        cancelText: "Không",
      });
    },
    [isSubmitting, currentUserId, isLoadingUserId, executeUnregistration]
  );

  const handleSelectToUnregister = (eventId: string) => {
    setSelectedToUnregister((prev) => {
      const n = new Set(prev);
      if (n.has(eventId)) n.delete(eventId);
      else n.add(eventId);
      return n;
    });
  };

  const executeBatchUnregistration = useCallback(
    async (ids: string[]) => {
      if (isSubmitting || !currentUserId || isLoadingUserId) return;
      setIsSubmitting("batch_unregister");
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.");
        setIsSubmitting(null);
        return;
      }
      const loadId = toast.loading(`Đang hủy ${ids.length} sự kiện...`);
      const promises = ids.map((id) =>
        fetch(
          `http://localhost:8080/identity/api/events/${id}/attendees/${currentUserId}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        )
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
          }))
      );
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
      }
      if (failIds.length > 0) {
        setSelectedToUnregister(new Set(failIds));
        toast.error(`Lỗi hủy ${failIds.length} sự kiện. Vui lòng thử lại.`, {
          id: okCount === 0 ? loadId : undefined,
        });
      } else if (okCount === 0 && failIds.length === 0) {
        toast.dismiss(loadId);
      } else {
        setSelectedToUnregister(new Set());
      }
      setIsSubmitting(null);
    },
    [isSubmitting, currentUserId, isLoadingUserId, onRegistrationChange]
  );

  const handleBatchUnregister = useCallback(() => {
    const ids = Array.from(selectedToUnregister);
    if (ids.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sự kiện.");
      return;
    }
    if (!currentUserId || isLoadingUserId) {
      toast.error("Không thể xác định người dùng.");
      return;
    }
    setConfirmationState({
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
        setConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        });
        executeBatchUnregistration(ids);
      },
      onCancel: () =>
        setConfirmationState({
          isOpen: false,
          title: "",
          message: "",
          onConfirm: null,
        }),
      confirmVariant: "danger",
      confirmText: `Hủy (${ids.length})`,
      cancelText: "Không",
    });
  }, [
    selectedToUnregister,
    currentUserId,
    isLoadingUserId,
    executeBatchUnregistration,
  ]);

  const handleEventStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStartDate = e.target.value;
      setEventStartDateFilter(newStartDate);
      if (eventEndDateFilter && newStartDate > eventEndDateFilter) {
        setEventEndDateFilter("");
        toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: "⚠️" });
      }
    },
    [eventEndDateFilter]
  );

  const handleEventEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEndDate = e.target.value;
      if (eventStartDateFilter && newEndDate < eventStartDateFilter) {
        toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
      } else {
        setEventEndDateFilter(newEndDate);
      }
    },
    [eventStartDateFilter]
  );

  const processedEvents = useMemo(() => {
    let eventsToProcess = [...availableEvents];
    if (eventTimeFilter !== "all") {
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
          switch (eventTimeFilter) {
            case "today":
              return eventDate >= todayStart && eventDate <= todayEnd;
            case "thisWeek":
              const { startOfWeek, endOfWeek } = getWeekRange(new Date());
              return eventDate >= startOfWeek && eventDate <= endOfWeek;
            case "thisMonth":
              const { startOfMonth, endOfMonth } = getMonthRange(new Date());
              return eventDate >= startOfMonth && eventDate <= endOfMonth;
            case "dateRange":
              if (!eventStartDateFilter || !eventEndDateFilter) return false;
              const start = new Date(eventStartDateFilter);
              start.setHours(0, 0, 0, 0);
              const end = new Date(eventEndDateFilter);
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
    if (eventSearchTerm.trim()) {
      const lowerSearchTerm = eventSearchTerm.trim().toLowerCase();
      eventsToProcess = eventsToProcess.filter(
        (event) =>
          event.name.toLowerCase().includes(lowerSearchTerm) ||
          (event.location &&
            event.location.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (tab === "available") {
      eventsToProcess = eventsToProcess.filter(
        (event) => !isRegistered(event.id) && !isCreatedByUser(event.id)
      );
    } else {
      eventsToProcess = eventsToProcess.filter((event) =>
        isRegistered(event.id)
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
    availableEvents,
    tab,
    isRegistered,
    isCreatedByUser,
    eventTimeFilter,
    eventStartDateFilter,
    eventEndDateFilter,
    eventSearchTerm,
    eventSortOrder,
  ]);

  const filteredRegisteredEventIds = useMemo(
    () =>
      new Set(
        processedEvents.filter((e) => tab === "registered").map((e) => e.id)
      ),
    [processedEvents, tab]
  );
  const handleSelectAllForUnregister = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isChecked = event.target.checked;
    setSelectedToUnregister(isChecked ? filteredRegisteredEventIds : new Set());
  };

  const fetchQRCode = useCallback(async () => {
    if (!currentUserId || isLoadingUserId || isLoadingQRCode) return;
    if (qrCodeUrl && !errorQRCode) return;
    setIsLoadingQRCode(true);
    setErrorQRCode(null);
    setQrCodeUrl(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập để xem QR.");
      setErrorQRCode("Chưa đăng nhập");
      setIsLoadingQRCode(false);
      return;
    }
    try {
      const url = `http://localhost:8080/identity/users/${currentUserId}/qr-code-image`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        let errorMessage = `Lỗi tải mã QR (${res.status})`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (_) {}
        throw new Error(errorMessage);
      }
      const blob = await res.blob();
      if (qrCodeUrl) URL.revokeObjectURL(qrCodeUrl);
      const objectURL = URL.createObjectURL(blob);
      setQrCodeUrl(objectURL);
    } catch (err: any) {
      console.error("Lỗi fetch QR code:", err);
      const message = err.message || "Không thể tải mã QR.";
      setErrorQRCode(message);
      setQrCodeUrl(null);
      toast.error(message);
    } finally {
      setIsLoadingQRCode(false);
    }
  }, [currentUserId, isLoadingUserId, isLoadingQRCode, errorQRCode, qrCodeUrl]);

  useEffect(() => {
    const currentQrCodeUrl = qrCodeUrl;
    return () => {
      if (currentQrCodeUrl) URL.revokeObjectURL(currentQrCodeUrl);
    };
  }, [qrCodeUrl]);

  const handleShowQRCode = () => {
    if (!currentUserId || isLoadingUserId) {
      toast.error("Chưa thể xác định người dùng để lấy mã QR.");
      return;
    }
    setShowQRCode(true);
    fetchQRCode();
  };

  const renderEventListOrCard = (
    list: EventInfo[],
    currentTab: "available" | "registered"
  ) => {
    const isLoading = isLoadingUserId || isLoadingAvailable;
    const error = errorAvailable;
    const noResultMessage =
      eventSearchTerm ||
      eventTimeFilter !== "all" ||
      eventStartDateFilter ||
      eventEndDateFilter
        ? `Không tìm thấy sự kiện nào khớp.`
        : currentTab === "available"
        ? "Không có sự kiện mới nào để đăng ký."
        : "Bạn chưa đăng ký sự kiện nào.";
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

    const isBatchUnregistering = isSubmitting === "batch_unregister";
    const allFilteredRegisteredSelected =
      currentTab === "registered" &&
      list.length > 0 &&
      filteredRegisteredEventIds.size > 0 &&
      list.every((item) => selectedToUnregister.has(item.id)) &&
      selectedToUnregister.size >= list.length;

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
                className="text-sm text-gray-600 cursor-pointer select-none"
              >
                {" "}
                Chọn tất cả ({selectedToUnregister.size}){" "}
              </label>
            </div>
            <button
              onClick={handleBatchUnregister}
              disabled={
                isBatchUnregistering ||
                selectedToUnregister.size === 0 ||
                !currentUserId ||
                isLoadingUserId
              }
              className={`px-3 py-1 rounded-md text-white shadow-sm transition text-xs font-medium cursor-pointer flex items-center gap-1 ${
                isBatchUnregistering ||
                selectedToUnregister.size === 0 ||
                !currentUserId ||
                isLoadingUserId
                  ? "bg-red-300 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isBatchUnregistering
                ? "..."
                : `Hủy (${selectedToUnregister.size})`}
            </button>
          </div>
        )}
        {list.length === 0 && (
          <p className="text-center text-gray-500 italic py-5">
            {" "}
            {noResultMessage}{" "}
          </p>
        )}
        {eventViewMode === "list" ? (
          <ul className="space-y-3">
            {" "}
            {list.map((event) => {
              const isProcessingSingle = isSubmitting === event.id;
              const isSelected = selectedToUnregister.has(event.id);
              const isProcessingBatchSelected =
                isBatchUnregistering && isSelected;
              const processing =
                isProcessingSingle || isProcessingBatchSelected;
              const alreadyRegistered = isRegistered(event.id);
              const isCreated = isCreatedByUser(event.id);
              const canAct = !!currentUserId && !isLoadingUserId;
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
                    <div className="flex-grow min-w-0">
                      <h3 className="text-md md:text-lg font-semibold text-gray-800 mb-1 flex items-center">
                        {currentTab === "registered" && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            disabled={processing}
                            aria-label={`Chọn hủy ${event.name}`}
                            tabIndex={-1}
                            className="mr-2 h-4 w-4 align-middle text-red-600 border-gray-300 rounded focus:ring-red-500 pointer-events-none flex-shrink-0"
                          />
                        )}
                        {event.name}{" "}
                        {isCreated && currentTab === "available" && (
                          <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                            {" "}
                            ✨ Của bạn{" "}
                          </span>
                        )}
                      </h3>
                      <div
                        className={`flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600 ${
                          currentTab === "registered" ? "pl-6" : "pl-0"
                        } sm:pl-0`}
                      >
                        {event.time && (
                          <span className="flex items-center">
                            {" "}
                            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 opacity-70 flex-shrink-0" />{" "}
                            {new Date(event.time).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}{" "}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center mt-1 sm:mt-0">
                            {" "}
                            <span className="mr-1.5 opacity-70">📍</span>{" "}
                            {event.location}{" "}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:self-end border-t border-gray-100 pt-3 mt-2 sm:border-none sm:pt-0 sm:mt-0">
                    {!(currentTab === "registered" && isSelected) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingEventDetails(event);
                        }}
                        disabled={processing}
                        className="px-3 py-1.5 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-xs font-medium w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                      >
                        {" "}
                        Xem chi tiết{" "}
                      </button>
                    )}
                    {currentTab === "available" &&
                      (isCreated ? (
                        <button
                          className="w-full cursor-not-allowed sm:w-auto px-3 py-1.5 rounded-md text-gray-600 bg-gray-300 text-xs font-medium"
                          disabled
                        >
                          {" "}
                          ✨ Sự kiện của bạn{" "}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegisterClick(event);
                          }}
                          disabled={alreadyRegistered || processing || !canAct}
                          className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                            alreadyRegistered
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {" "}
                          {alreadyRegistered
                            ? "✅ Đã đăng ký"
                            : processing
                            ? "..."
                            : "📝 Đăng ký"}{" "}
                        </button>
                      ))}
                    {currentTab === "registered" && !isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregisterClick(event);
                        }}
                        disabled={processing || !canAct}
                        className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                          processing || !canAct
                            ? "bg-red-300 cursor-wait"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {" "}
                        {processing ? "..." : " Hủy đăng ký"}{" "}
                      </button>
                    )}
                  </div>
                  {currentTab === "registered" && isSelected && processing && (
                    <div className="text-xs text-red-500 italic text-right mt-1">
                      {" "}
                      Đang xử lý...{" "}
                    </div>
                  )}
                </li>
              );
            })}{" "}
          </ul>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {" "}
            {list.map((event) => {
              const isProcessingSingle = isSubmitting === event.id;
              const isSelected = selectedToUnregister.has(event.id);
              const isProcessingBatchSelected =
                isBatchUnregistering && isSelected;
              const processing =
                isProcessingSingle || isProcessingBatchSelected;
              const alreadyRegistered = isRegistered(event.id);
              const isCreated = isCreatedByUser(event.id);
              const canAct = !!currentUserId && !isLoadingUserId;
              return (
                <div
                  key={event.id}
                  className={`border p-4 rounded-lg shadow-sm flex flex-col justify-between transition-colors duration-150 h-full ${
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
                  <div>
                    {" "}
                    <h3 className="text-md font-semibold text-gray-800 mb-1 flex items-start">
                      {" "}
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
                      )}{" "}
                      <span className="line-clamp-2 flex-grow">
                        {" "}
                        {event.name}{" "}
                      </span>{" "}
                      {isCreated && currentTab === "available" && (
                        <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                          {" "}
                          ✨ Của bạn{" "}
                        </span>
                      )}{" "}
                    </h3>{" "}
                    <div
                      className={`space-y-1 text-sm text-gray-600 mt-1 mb-3 ${
                        currentTab === "registered" ? "pl-6" : "pl-0"
                      } sm:pl-0`}
                    >
                      {" "}
                      {event.time && (
                        <p className="flex items-center text-xs">
                          {" "}
                          <CalendarIcon className="w-3 h-3 mr-1.5 opacity-70 flex-shrink-0" />{" "}
                          {new Date(event.time).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}{" "}
                        </p>
                      )}{" "}
                      {event.location && (
                        <p className="flex items-center text-xs">
                          {" "}
                          <span className="mr-1.5 opacity-70">📍</span>{" "}
                          {event.location}{" "}
                        </p>
                      )}{" "}
                    </div>{" "}
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {!(currentTab === "registered" && isSelected) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingEventDetails(event);
                        }}
                        disabled={processing}
                        className="w-full px-3 py-1.5 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-xs font-medium disabled:opacity-50 cursor-pointer"
                      >
                        {" "}
                        Xem chi tiết{" "}
                      </button>
                    )}
                    {currentTab === "available" &&
                      (isCreated ? (
                        <button
                          className="w-full cursor-not-allowed px-3 py-1.5 rounded-md text-gray-600 bg-gray-300 text-xs font-medium"
                          disabled
                        >
                          {" "}
                          ✨ Sự kiện của bạn{" "}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegisterClick(event);
                          }}
                          disabled={alreadyRegistered || processing || !canAct}
                          className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                            alreadyRegistered
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {" "}
                          {alreadyRegistered
                            ? "✅ Đã đăng ký"
                            : processing
                            ? "..."
                            : "📝 Đăng ký"}{" "}
                        </button>
                      ))}
                    {currentTab === "registered" && !isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregisterClick(event);
                        }}
                        disabled={processing || !canAct}
                        className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                          processing || !canAct
                            ? "bg-red-300 cursor-wait"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {" "}
                        {processing ? "..." : " Hủy đăng ký"}{" "}
                      </button>
                    )}
                    {currentTab === "registered" &&
                      isSelected &&
                      processing && (
                        <div className="text-xs text-red-500 italic text-center mt-1">
                          {" "}
                          Đang xử lý...{" "}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}{" "}
          </div>
        )}
      </div>
    );
  };

  const renderEventDetails = (event: EventInfo) => {
    const isProcessingSingle = isSubmitting === event.id;
    const alreadyRegistered = isRegistered(event.id);
    const isCreated = isCreatedByUser(event.id);
    const canPerformAction = !!currentUserId && !isLoadingUserId;
    const descriptionToShow =
      event.description || event.content || event.purpose;
    return (
      <div className="p-4 bg-white rounded-lg shadow border">
        <button
          onClick={() => setViewingEventDetails(null)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50"
        >
          {" "}
          <ArrowLeftIcon className="h-4 w-4 mr-1" /> Quay lại{" "}
        </button>
        <h3 className="text-xl font-bold text-gray-800 mb-3">{event.name}</h3>
        <div className="space-y-2 text-sm text-gray-700">
          {event.time && (
            <p>
              <strong className="font-medium text-gray-900 w-24 inline-block">
                {" "}
                Thời gian:{" "}
              </strong>{" "}
              {new Date(event.time).toLocaleString("vi-VN", {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          )}
          {event.location && (
            <p>
              <strong className="font-medium text-gray-900 w-24 inline-block">
                {" "}
                Địa điểm:{" "}
              </strong>{" "}
              {event.location}
            </p>
          )}
          {descriptionToShow && (
            <p>
              <strong className="font-medium text-gray-900 w-24 inline-block align-top">
                {" "}
                Mô tả:{" "}
              </strong>{" "}
              <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-6rem)]">
                {" "}
                {descriptionToShow}{" "}
              </span>
            </p>
          )}
        </div>
        <div className="mt-4 pt-4 border-t flex justify-end gap-3">
          {isCreated ? (
            <button
              className={`px-4 py-2 rounded-md text-gray-600 bg-gray-300 text-sm font-medium cursor-not-allowed`}
              disabled
            >
              {" "}
              ✨ Sự kiện của bạn{" "}
            </button>
          ) : alreadyRegistered ? (
            <button
              onClick={() => handleUnregisterClick(event)}
              disabled={isProcessingSingle || !canPerformAction}
              className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${
                isProcessingSingle || !canPerformAction
                  ? "bg-red-300 cursor-wait"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {" "}
              {isProcessingSingle ? "..." : " Hủy đăng ký"}{" "}
            </button>
          ) : (
            <button
              onClick={() => handleRegisterClick(event)}
              disabled={isProcessingSingle || !canPerformAction}
              className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${
                isProcessingSingle || !canPerformAction
                  ? "bg-blue-300 cursor-wait"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {" "}
              {isProcessingSingle ? "..." : "📝 Đăng ký"}{" "}
            </button>
          )}
          <button
            onClick={() => setViewingEventDetails(null)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer"
          >
            {" "}
            Quay lại{" "}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-200 p-3 md:p-5 bg-gray-50">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0 flex-wrap gap-2">
        <h2 className="text-xl md:text-2xl font-bold text-green-600">
          {viewingEventDetails ? "Chi tiết sự kiện" : "Đăng ký sự kiện"}
        </h2>
        {!viewingEventDetails && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setIsAttendeeScannerOpen(true)}
              disabled={isLoadingUserId || !currentUserId}
              className="px-3 py-1.5 cursor-pointer rounded-md text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Quét mã QR của sự kiện để check-in"
            >
              <ReaderIcon className="h-4 w-4" /> Quét QR Sự kiện
            </button>
            <button
              onClick={handleShowQRCode}
              disabled={isLoadingUserId || !currentUserId || isLoadingQRCode}
              className="px-3 py-1.5 cursor-pointer rounded-md text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 transition shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Hiển thị mã QR của bạn để người khác quét"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${isLoadingQRCode ? "animate-pulse" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v1m6 11h2m-6.5 2H11a1 1 0 01-1-1V11a1 1 0 011-1h2a1 1 0 011 1v5.5a1.5 1.5 0 01-1.5 1.5h-1.5zM12 4V3m6 11h1m-6.5 2H11a1 1 0 01-1-1V11a1 1 0 011-1h2a1 1 0 011 1v5.5a1.5 1.5 0 01-1.5 1.5h-1.5zM12 4V3"
                />{" "}
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 8h2v2H4zm12 0h2v2h-2zM4 12h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 16h2v2H4zm4 1h2v1H8zm4 0h2v1h-2zm4 0h2v1h-2zM4 20h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2z"
                />{" "}
              </svg>
              {isLoadingQRCode ? "Đang tải..." : "Mã QR của tôi"}
            </button>
          </div>
        )}
      </div>

      {!viewingEventDetails && (
        <>
          <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="relative lg:col-span-1 xl:col-span-1">
                {" "}
                <label
                  htmlFor="searchRegEvents"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  {" "}
                  Tìm sự kiện{" "}
                </label>{" "}
                <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                  {" "}
                  🔍{" "}
                </span>{" "}
                <input
                  type="text"
                  id="searchRegEvents"
                  placeholder="Tên hoặc địa điểm..."
                  value={eventSearchTerm}
                  onChange={(e) => setEventSearchTerm(e.target.value)}
                  className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm"
                />{" "}
              </div>
              <div>
                {" "}
                <label
                  htmlFor="sortRegEvents"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  {" "}
                  Sắp xếp{" "}
                </label>{" "}
                <select
                  id="sortRegEvents"
                  value={eventSortOrder}
                  onChange={(e) =>
                    setEventSortOrder(e.target.value as "az" | "za")
                  }
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                >
                  {" "}
                  <option value="az"> A - Z</option>{" "}
                  <option value="za"> Z - A</option>{" "}
                </select>{" "}
              </div>
              <div>
                {" "}
                <label
                  htmlFor="timeFilterRegEvents"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  {" "}
                  Lọc thời gian{" "}
                </label>{" "}
                <select
                  id="timeFilterRegEvents"
                  value={eventTimeFilter}
                  onChange={(e) =>
                    setEventTimeFilter(
                      e.target.value as
                        | "all"
                        | "today"
                        | "thisWeek"
                        | "thisMonth"
                        | "dateRange"
                    )
                  }
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                >
                  {" "}
                  <option value="all">Tất cả</option>{" "}
                  <option value="today">Hôm nay</option>{" "}
                  <option value="thisWeek">Tuần này</option>{" "}
                  <option value="thisMonth">Tháng này</option>{" "}
                  <option value="dateRange">Khoảng ngày</option>{" "}
                </select>{" "}
              </div>
              <div className="flex items-end justify-start sm:justify-end gap-2">
                {" "}
                <label className="block text-xs font-medium text-gray-600 mb-1 invisible h-4">
                  {" "}
                  Xem{" "}
                </label>{" "}
                <div className="flex w-full sm:w-auto">
                  {" "}
                  <button
                    onClick={() => setEventViewMode("list")}
                    title="Danh sách"
                    className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out h-[42px] ${
                      eventViewMode === "list"
                        ? "bg-green-600 border-green-700 text-white shadow-sm z-10"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    {" "}
                    <ListBulletIcon className="h-5 w-5" />{" "}
                  </button>{" "}
                  <button
                    onClick={() => setEventViewMode("card")}
                    title="Thẻ"
                    className={`flex-1 sm:flex-none p-2 rounded-r-md border transition duration-150 ease-in-out h-[42px] ${
                      eventViewMode === "card"
                        ? "bg-green-600 border-green-700 text-white shadow-sm z-10"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                  >
                    {" "}
                    <Component1Icon className="h-5 w-5" />{" "}
                  </button>{" "}
                </div>{" "}
              </div>
            </div>
          </div>
          {eventTimeFilter === "dateRange" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm flex-shrink-0">
              {" "}
              <div>
                {" "}
                <label
                  htmlFor="startDateFilterReg"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {" "}
                  <span className="inline-block mr-1">🗓️</span> Từ ngày{" "}
                </label>{" "}
                <input
                  type="date"
                  id="startDateFilterReg"
                  value={eventStartDateFilter}
                  onChange={handleEventStartDateChange}
                  max={eventEndDateFilter || undefined}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white"
                />{" "}
              </div>{" "}
              <div>
                {" "}
                <label
                  htmlFor="endDateFilterReg"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {" "}
                  <span className="inline-block mr-1">🗓️</span> Đến ngày{" "}
                </label>{" "}
                <input
                  type="date"
                  id="endDateFilterReg"
                  value={eventEndDateFilter}
                  onChange={handleEventEndDateChange}
                  min={eventStartDateFilter || undefined}
                  className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white"
                />{" "}
              </div>{" "}
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-0 px-1 border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setTab("available")}
              className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 ${
                tab === "available"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {" "}
              📌 Gợi ý (
              {
                availableEvents.filter(
                  (e) => !isRegistered(e.id) && !isCreatedByUser(e.id)
                ).length
              }
              ){" "}
            </button>
            <button
              onClick={() => setTab("registered")}
              className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 ${
                tab === "registered"
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {" "}
              ✅ Đã đăng ký ({registeredEventIds?.size ?? 0}){" "}
            </button>
          </div>
        </>
      )}

      <div className="flex-grow pt-4 px-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0">
        {viewingEventDetails
          ? renderEventDetails(viewingEventDetails)
          : renderEventListOrCard(processedEvents, tab)}
      </div>

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

      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        qrCodeUrl={qrCodeUrl}
        isLoading={isLoadingQRCode}
        error={errorQRCode}
        userId={currentUserId}
      />

      <AttendeeQrScannerModal
        isOpen={isAttendeeScannerOpen}
        onClose={() => setIsAttendeeScannerOpen(false)}
        attendeeUserId={currentUserId}
        onCheckInSuccess={() => {
          toast.success("Check-in thành công qua QR!");
          // fetchAvailableEvents(); // Tùy chọn refresh
        }}
      />
    </div>
  );
};

export default RegisteredEventsTabContent;
