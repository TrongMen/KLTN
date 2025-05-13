"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { toast, Toaster } from "react-hot-toast";
import Image from "next/image";
import {
  User as MainUserType,
  FullApiUser,
  LockedByInfo,
  Role,
  Position,
} from "../types/appTypeMember"; 
import { ApiUser, User as ModalCurrentUserType } from "../types/appTypes"; 

import QRScanner from "../modals/QRScanner";
import ConfirmationDialog from "../../../utils/ConfirmationDialog";
import { MdQrCodeScanner, MdQrCode } from "react-icons/md";

import {
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
  ChevronLeftIcon,
  LockOpen1Icon, // Giả sử bạn có icon này
} from "@radix-ui/react-icons";

import { useEventFilters } from "../../../hooks/useEventFIlter";
import { useAttendeeFilters } from "../../../hooks/useAttendeeFilter";

interface ApprovedEvent {
  id: string;
  name: string;
  time?: string;
  location?: string;
  status?: string;
  createdAt?: string;
  avatarUrl?: string | null;
  progressStatus?: "UPCOMING" | "ONGOING" | "ENDED" | string;
  maxAttendees?: number;
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

interface TestProps {
  user: MainUserType | null;
}

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
      // console.error("Error decoding filename:", e);
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


const Test: React.FC<TestProps> = ({ user }) => {
  const [userApprovedEvents, setUserApprovedEvents] = useState<ApprovedEvent[]>(
    []
  );
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [eventError, setEventError] = useState<string | null>(null);
  
  const [eventViewMode, setEventViewMode] = useState<"list" | "card">("list");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  
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
    onCancel?: () => void;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoadingQrCode, setIsLoadingQrCode] = useState<boolean>(false);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const currentUserId = user?.id ?? null;
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);

  const {
    eventSearchTerm,
    setEventSearchTerm,
    eventSortOrder,
    setEventSortOrder,
    eventStatusFilterOption,
    setEventStatusFilterOption,
    eventStartDateFilter,
    eventEndDateFilter,
    processedEvents,
    handleEventStartDateChange,
    handleEventEndDateChange,
  } = useEventFilters(userApprovedEvents);

  const {
    attendeeSearchTerm,
    setAttendeeSearchTerm,
    attendeeSortOrder,
    setAttendeeSortOrder,
    processedAttendees,
    getAttendeeName,
  } = useAttendeeFilters(attendees, originalAttendance, attendanceChanges, mode);


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
              maxAttendees: e.maxAttendees,
            }));
          setUserApprovedEvents(approved);
          if (showToast) {
            toast.success("Đã làm mới danh sách sự kiện!");
          }
        } else {
          setUserApprovedEvents([]);
          if (showToast) {
            toast.error("Làm mới thất bại: Dữ liệu không hợp lệ.");
          }
        }
      } catch (e: any) {
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
          setAttendees(fetched);
          const initialAttendance: Record<string, boolean> = {};
          fetched.forEach((a) => {
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
          await blob.text(); 
          throw new Error("API không trả về ảnh QR hợp lệ.");
        } catch (readError) {
          throw new Error("API không trả về ảnh QR hợp lệ.");
        }
      }
    } catch (err: any) {
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
        // Also refresh QR code if an event is selected
        const newQrUrl = await fetchQrCodeImage(selectedEventId);
        if (qrCodeUrl && qrCodeUrl !== newQrUrl) { // Revoke old if new one fetched
            window.URL.revokeObjectURL(qrCodeUrl);
        }
      } else {
        await fetchUserApprovedEvents(true);
      }
      toast.dismiss(toastId);
    } catch (error: any) {
      toast.error("Làm mới thất bại.", { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedEventId, fetchAttendees, fetchUserApprovedEvents, fetchQrCodeImage, qrCodeUrl]);

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

  const getStaticAttendanceDisplay = (
    originalAttendeeStatus: boolean ,
    eventStatus?: ApprovedEvent['progressStatus']
  ): { text: string; className: string } => {
    if (eventStatus === "UPCOMING") {
      return { text: "Chưa diễn ra", className: "bg-yellow-100 text-yellow-800 border border-yellow-300" };
    }
    if (originalAttendeeStatus === true) {
      return { text: "Có mặt", className: "bg-green-100 text-green-800 border border-green-300" };
    } else {
      return { text: "Vắng", className: "bg-red-100 text-red-800 border border-red-300" };
    }
  };

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
      // Khi chuyển sang chế độ điểm danh, giữ lại các thay đổi hiện tại nếu có
      setAttendanceChanges({ ...originalAttendance }); // Bỏ dòng này để giữ thay đổi đang có
      setSelectedForDelete(new Set());
    } else if (newMode === "delete") {
      setAttendanceChanges({ ...originalAttendance }); // Reset điểm danh khi sang chế độ xóa
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
        // Trường hợp người mới được thêm và điểm danh luôn (hiện tại logic này chưa hỗ trợ thêm mới từ client)
        // changes.push({ userId: id, status: attendanceChanges[id] });
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
            return { apiSuccess: false, reason: m, userId };
          }
          try {
            const updateResult = await res.json();
            if (updateResult.code === 1000) {
                 return { apiSuccess: true, value: { userId, status } };
            } else {
                 return { apiSuccess: false, reason: updateResult.message || 'Lỗi không rõ từ API', userId };
            }
          } catch (e) {
            return { apiSuccess: false, reason: 'Lỗi phân tích phản hồi JSON', userId };
          }
        })
        .catch((err) => ({ apiSuccess: false, reason: err.message, userId }));
    });

    const results = await Promise.allSettled(promises);
    let ok = 0,
      fail = 0;
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.apiSuccess) {
        ok++;
      } else {
        fail++;
      }
    });

    if (ok > 0) {
      toast.success(`Đã lưu ${ok} thay đổi.`, { id: loadId });
    }
    if (fail > 0) {
      toast.error(`Lưu thất bại ${fail} thay đổi.`, {
        id: ok === 0 ? loadId : undefined,
      });
    } else if (ok === 0 && fail === 0 && changes.length > 0) {
        toast.error("Không thể xử lý yêu cầu lưu.", {id: loadId});
    }
     else if (ok === 0 && fail === 0) { // No changes were attempted if changes.length was 0
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
            let m = `Lỗi HTTP: ${res.status}`;
            try {
              const d = await res.json();
              m = d.message || m;
            } catch (_) { }
            return { success: false, reason: m, userId };
          }

          if (res.status === 204) { 
            return { success: true, userId };
          }
          
          try {
            const deleteResult = await res.json();
            if (deleteResult.code === 1000) {
              return { success: true, userId, data: deleteResult };
            } else {
              return { success: false, reason: deleteResult.message || 'Lỗi không xác định từ API', userId };
            }
          } catch (e) {
            // If response is 204, res.json() will fail, this case is handled above.
            // This catch is for other JSON parsing errors on non-204 success, which is unusual.
            return { success: false, reason: 'Phản hồi API không hợp lệ sau khi xóa', userId };
          }
        })
        .catch((err) => {
            return { success: false, reason: err.message || 'Lỗi mạng hoặc không thể kết nối', userId };
        });
    });

    const results = await Promise.allSettled(promises);
    let ok = 0;
    let fail = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success) {
        ok++;
      } else {
        fail++;
      }
    });
    
    if (ok > 0 && fail === 0) {
      toast.success(`Đã xóa ${ok} người.`, { id: loadId });
    } else if (ok > 0 && fail > 0) {
      toast.success(`Đã xóa ${ok} người, ${fail} thất bại.`, { id: loadId });
    } else if (fail > 0 && ok === 0) {
      toast.error(`Xóa thất bại ${fail} người.`, { id: loadId });
    } else if (idsToDelete.length > 0 && ok === 0 && fail === 0) { 
      toast.error(`Không thể xử lý yêu cầu xóa.`, { id: loadId });
    } else {
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
            errorMsg = `${errorMsg}: ${txt.slice(0,100)}`;
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
      toast.error(err.message || "Xuất file danh sách tham gia thất bại.", {
        id: exportToastId,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const callCheckInApi = async (qrData: string) => {
    if (!selectedEventId) {
      toast.error("Vui lòng chọn một sự kiện trước khi điểm danh.");
      return;
    }
    if (isProcessingCheckIn) return;

    setIsProcessingCheckIn(true);
    const loadingToastId = toast.loading("Đang xử lý điểm danh...");
    
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Chưa đăng nhập hoặc token không hợp lệ.");
      }

      const apiUrl = `http://localhost:8080/identity/api/events/${selectedEventId}/check-in`;
      const formData = new FormData();
      formData.append("qrCodeData", qrData);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.code === 1000) {
        toast.success(result.message || "Điểm danh thành công!", {
          id: loadingToastId,
        });
        if(selectedEventId) {
            fetchAttendees(selectedEventId, true); 
        }
      } else {
        throw new Error(
          result.message || `Lỗi điểm danh từ API (${response.status})`
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Điểm danh thất bại.", {
        id: loadingToastId,
      });
    } finally {
      setIsProcessingCheckIn(false);
    }
  };
  
  const selectedEventName = selectedEventFullData?.name;

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorScanner, setErrorScanner] = useState<string | null>(null);

  const handleScanSuccessCallback = (decodedText: string) => {
    setScanResult(decodedText); 
    setErrorScanner(null);
    
    setIsScannerOpen(false); 

    setTimeout(() => {
        callCheckInApi(decodedText);
    }, 100); 
  };

  const handleScanErrorCallback = (errorMessage: string) => {
    if (
      !errorMessage.includes("NotFoundException") &&
      !errorMessage.includes("NotAllowedError") 
    ) {
      setErrorScanner(errorMessage);
       toast.error(`Lỗi máy quét: ${errorMessage.length > 50 ? errorMessage.substring(0,50)+'...' : errorMessage }`);
    }
     if (errorMessage.includes("Requested device not found")) {
        setErrorScanner("Không tìm thấy camera. Vui lòng kiểm tra và chọn lại.");
        toast.error("Không tìm thấy camera. Vui lòng kiểm tra và chọn lại.");
    }
    if (errorMessage.toLowerCase().includes("permission denied") || errorMessage.toLowerCase().includes("notallowederror")) {
        setErrorScanner("Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.");
        toast.error("Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.");
    }
  };

  return (
    <div className="flex flex-col h-full p-3 md:p-5 bg-gray-50">
      <Toaster  reverseOrder={false} />
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
                    className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition cursor-pointer ${
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
                    className={`flex-1 sm:flex-none p-2 rounded-r-md border transition cursor-pointer  ${
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
                          {event.location && ( // Thay maxAttendees thành location
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
                          className="px-3 py-1.5 cursor-pointer rounded-md bg-teal-500 hover:bg-teal-600 text-white text-xs font-medium transition"
                        >
                          Điểm danh
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
                          Điểm danh
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
                    className={`flex-1 sm:flex-none p-2 cursor-pointer rounded-l-md border border-r-0 transition ${
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
                    className={`flex-1 sm:flex-none p-2 rounded-r-md border transitio cursor-pointer ${
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
                      const originalAttendeeStatus =
                        originalAttendance[attendee.userId];
                        
                      const attendanceDisplay = getStaticAttendanceDisplay(originalAttendeeStatus, selectedEventFullData?.progressStatus);

                      const hasChanged =
                        mode === "attendance" &&
                        isEventOngoing &&
                        isCheckedForAttendance !== (originalAttendeeStatus ?? false);
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
                          {(mode === "view" || (mode === "attendance" && !isEventOngoing)) && !isRowProcessing && (
                              <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${attendanceDisplay.className}`}
                              >
                                  {attendanceDisplay.text}
                              </span>
                          )}
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
                      const originalAttendeeStatus =
                        originalAttendance[attendee.userId];

                      const attendanceDisplay = getStaticAttendanceDisplay(originalAttendeeStatus, selectedEventFullData?.progressStatus);
                        
                      const hasChanged =
                        mode === "attendance" &&
                        isEventOngoing &&
                        isCheckedForAttendance !== (originalAttendeeStatus ?? false);
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
                            {(mode === "view" || (mode === "attendance" && !isEventOngoing)) && !isRowProcessing && (
                                <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full self-start shrink-0 ${attendanceDisplay.className}`}
                                >
                                    {attendanceDisplay.text}
                                </span>
                            )}
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
                                ? "pl-[52px]" // Căn chỉnh với avatar khi không có checkbox
                                : "pl-3" // Căn chỉnh khi có checkbox
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
                        <MdQrCode size={16} />
                        QR điểm danh
                      </button>
                      <button
                        onClick={() => {
                            setErrorScanner(null); 
                            setScanResult(null);
                            setIsScannerOpen(true);
                        }}
                        disabled={!isEventOngoing || isProcessing || isProcessingCheckIn}
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
                        <MdQrCodeScanner size={16}  />
                        Quét QR
                      </button>
                      
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
                    {isExporting ? "Đang xuất..." : "Xuất danh sách người tham gia"}{" "}
                  </button>{" "}
                </div>
              </div>
            )}
        </>
      )}

        {isQrModalOpen && selectedEventId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-5 max-w-sm w-full text-center relative">
                <button 
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700"
                >
                <Cross2Icon className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">
                QR Code Điểm Danh
                </h3>
                {isLoadingQrCode && <p className="text-gray-500">Đang tải QR code...</p>}
                {qrCodeError && <p className="text-red-500">{qrCodeError}</p>}
                {qrCodeUrl && !qrCodeError && (
                <div className="my-4 flex justify-center">
                    <Image src={qrCodeUrl} alt="QR Code Điểm Danh" width={256} height={256} className="border rounded" />
                </div>
                )}
                {selectedEventFullData?.name && <p className="text-sm text-gray-600 mt-1">Sự kiện: {selectedEventFullData.name}</p>}
                <button
                    onClick={() => setIsQrModalOpen(false)}
                    className="mt-4 px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 text-sm"
                >
                    Đóng
                </button>
            </div>
            </div>
        )}

        {isScannerOpen && selectedEventId && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-2">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                    <div className="flex justify-between items-center p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">
                        Quét mã QR để điểm danh
                        </h3>
                        <button
                        onClick={() => setIsScannerOpen(false)} 
                        className="text-gray-400 hover:text-gray-600"
                        >
                        <Cross2Icon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4">
                        <QRScanner
                            onScanSuccess={handleScanSuccessCallback}
                            onScanError={handleScanErrorCallback}
                        />
                        {errorScanner && (
                        <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-md text-sm text-center">
                            <p>{errorScanner}</p>
                        </div>
                        )}
                    </div>
                     <div className="p-4 border-t border-gray-200 flex justify-end">
                        <button
                            onClick={() => setIsScannerOpen(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>
          )}


      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmVariant={confirmationState.confirmVariant}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={confirmationState.onConfirm || (() => {})}
        onCancel={confirmationState.onCancel || (() =>
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          }))
        }
      />
    </div>
  );
};

export default Test;