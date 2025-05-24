"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import ConfirmationDialog from "../../../../utils/ConfirmationDialog";
import {
  MagnifyingGlassIcon,
  ReloadIcon,
  InfoCircledIcon,
  Pencil1Icon,
  CheckCircledIcon,
  Cross2Icon,
  CalendarIcon,
  Component1Icon,
  ListBulletIcon,
} from "@radix-ui/react-icons";
import { User as MainUserType } from "../../types/appTypes";
import { MdQrCodeScanner, MdQrCode } from "react-icons/md";
import QRScanner from "../../modals/QRScanner";

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
  organizers?: { userId: string; fullName?: string; firstName?: string; lastName?: string; roleName?: string; positionName?: string; [key: string]: any }[];
  participants?: {
    userId: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
    roleName?: string;
    positionName?: string;
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
  avatarUrl?: string | null;
  qrCodeUrl?: string | null;
  progressStatus?: string;
  date?: string;
}

type RegisterEventTemporalFilterOption = "all" | "upcoming" | "ongoing" | "ended" | "dateRange";

const getEventTemporalStatus = (eventTime?: string | Date): "upcoming" | "ongoing" | "ended" | "unknown" => {
    if (!eventTime) return "unknown";
    try {
        const eventDate = new Date(eventTime);
        if (isNaN(eventDate.getTime())) return "unknown";

        const now = new Date();
        const todayDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

        if (eventDayStart > todayDayStart) return "upcoming";
        if (eventDayStart.getTime() === todayDayStart.getTime()) return "ongoing";
        if (eventDayStart < todayDayStart) return "ended";
        return "unknown";
    } catch {
        return "unknown";
    }
};


interface RegisteredEventsTabProps {
  user: MainUserType | null;
  initialRegisteredEventIds: Set<string>;
  isLoadingRegisteredIdsProp: boolean;
  onRegistrationChange: (eventId: string, registered: boolean) => void;
  isCreatedByUser: (eventId: string) => boolean;
  isRegistered: (eventId: string) => boolean;
  setViewingEventDetails: (event: EventType | null) => void;
  onMainRefreshTrigger: () => Promise<void>;
  isParentRefreshing: boolean;
}

const RegisteredEventsTab: React.FC<RegisteredEventsTabProps> = ({
  user,
  initialRegisteredEventIds,
  isLoadingRegisteredIdsProp,
  onRegistrationChange,
  isCreatedByUser,
  isRegistered,
  setViewingEventDetails,
  onMainRefreshTrigger,
  isParentRefreshing,
}) => {
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
    onCancel?: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });
  const [registerSearchTerm, setRegisterSearchTerm] = useState("");
  const [registerSortOrder, setRegisterSortOrder] = useState<"az" | "za">("az");
  const [registerTimeFilter, setRegisterTimeFilter] = useState<RegisterEventTemporalFilterOption>("all");
  const [registerStartDateFilter, setRegisterStartDateFilter] =
    useState<string>("");
  const [registerEndDateFilter, setRegisterEndDateFilter] =
    useState<string>("");
  const [registerViewMode, setRegisterViewMode] = useState<"list" | "card">(
    "list"
  );

  const currentUserId = user?.id ?? null;
  const [isRefreshingInternal, setIsRefreshingInternal] = useState<boolean>(false);

  const [showMyQRCodeModal, setShowMyQRCodeModal] = useState<boolean>(false);
  const [myQRCodeImageUrl, setMyQRCodeImageUrl] = useState<string | null>(null);
  const [isLoadingMyQRCode, setIsLoadingMyQRCode] = useState<boolean>(false);
  const [errorMyQRCode, setErrorMyQRCode] = useState<string | null>(null);

  const [isScanCheckInModalOpen, setIsScanCheckInModalOpen] = useState<boolean>(false);
  const [isCheckingInEvent, setIsCheckingInEvent] = useState<boolean>(false);
  const [isRequestingQrScanCameraPermission, setIsRequestingQrScanCameraPermission] = useState<boolean>(false);


  useEffect(() => {
    setIsLoadingRegisteredIds(isLoadingRegisteredIdsProp);
  }, [isLoadingRegisteredIdsProp]);

  const fetchRegisterAvailableEvents = useCallback(async (showToastOnSuccess = false) => {
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
          data.result.filter((event: EventType) => !event.deleted)
        );
        if (showToastOnSuccess) {
          toast.success("Đã làm mới danh sách sự kiện!");
        }
      } else {
        setRegisterAvailableEvents([]);
        throw new Error(data.message || "Dữ liệu sự kiện có sẵn không hợp lệ");
      }
    } catch (err: any) {
      setRegisterError(
        err.message || "Lỗi không xác định khi tải sự kiện có sẵn"
      );
      setRegisterAvailableEvents([]);
      if (showToastOnSuccess) {
        toast.error(`Làm mới thất bại: ${err.message || 'Lỗi không xác định'}`);
      }
    } finally {
      setRegisterIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchRegisterAvailableEvents(false);
    } else {
      setRegisterIsLoading(false);
      setRegisterAvailableEvents([]);
    }
  }, [user, fetchRegisterAvailableEvents]);

  const handleRefreshRegisteredEvents = useCallback(async () => {
    if (isRefreshingInternal || isParentRefreshing) return;

    setIsRefreshingInternal(true);
    const toastId = toast.loading("Đang làm mới dữ liệu...");
    try {
      await fetchRegisterAvailableEvents(false);
      await onMainRefreshTrigger();
      toast.success("Dữ liệu đã được làm mới!", { id: toastId });
    } catch (error: any) {
      console.error("Lỗi trong quá trình làm mới (đăng ký):", error);
      toast.error(
        `Làm mới thất bại: ${error.message || "Lỗi không xác định"}`,
        { id: toastId }
      );
    } finally {
      setIsRefreshingInternal(false);
    }
  }, [isRefreshingInternal, isParentRefreshing, fetchRegisterAvailableEvents, onMainRefreshTrigger]);

  const processedRegisterEvents = useMemo(() => {
    let eventsToProcess = [...registerAvailableEvents];

    if (registerTab === "available") {
      eventsToProcess = eventsToProcess.filter(
        (event) => !isRegistered(event.id) && !isCreatedByUser(event.id)
      );
    } else {
      eventsToProcess = eventsToProcess.filter((event) =>
        isRegistered(event.id)
      );
    }
    
    if (registerTimeFilter !== "all") {
        const now = new Date();
        const todayDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        eventsToProcess = eventsToProcess.filter(event => {
            const dateStrToUse = event.time || event.date;

            if (registerTimeFilter === "dateRange") {
                if (!registerStartDateFilter || !registerEndDateFilter) return true;
                if (!dateStrToUse) return false;
                try {
                    const eventDate = new Date(dateStrToUse);
                    if (isNaN(eventDate.getTime())) return false;
                    const startFilter = new Date(registerStartDateFilter); startFilter.setHours(0,0,0,0);
                    const endFilter = new Date(registerEndDateFilter); endFilter.setHours(23,59,59,999);
                    return !isNaN(startFilter.getTime()) && !isNaN(endFilter.getTime()) && startFilter <= endFilter &&
                           eventDate >= startFilter && eventDate <= endFilter;
                } catch (e) {
                    console.error("Error parsing date for dateRange (Registered Events):", dateStrToUse, e);
                    return false;
                }
            } else {
                if (!dateStrToUse) return false;
                try {
                    const eventDate = new Date(dateStrToUse);
                    if (isNaN(eventDate.getTime())) return false;
                    const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

                    switch (registerTimeFilter) {
                        case "upcoming":
                            return eventDayStart > todayDayStart;
                        case "ongoing":
                            return eventDayStart.getTime() === todayDayStart.getTime();
                        case "ended":
                            return eventDayStart < todayDayStart;
                        default:
                            return true;
                    }
                } catch (e) {
                    console.error("Error parsing event date for temporal status (Registered Events):", dateStrToUse, e);
                    return false;
                }
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

  const handleRegisterEventStartDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRegisterStartDateFilter(e.target.value);
    if (registerEndDateFilter && e.target.value > registerEndDateFilter) {
      setRegisterEndDateFilter("");
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
          Bạn chắc chắn muốn đăng ký <br />
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

    const eventStatus = getEventTemporalStatus(eventToUnregister.time || eventToUnregister.date);
    if (eventStatus === "ended") {
        toast.error("Không thể hủy đăng ký sự kiện đã diễn ra.");
        return;
    }

    setRegisterConfirmationState({
      isOpen: true,
      title: "Xác nhận hủy đăng ký",
      message: (
        <>
          Bạn chắc chắn muốn hủy đăng ký <br />
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

  const eventsToUnregister = ids
    .map(id => processedRegisterEvents.find(event => event.id === id))
    .filter(event => event !== undefined) as EventType[];

  const endedEventIdsInSelection = eventsToUnregister
    .filter(event => getEventTemporalStatus(event.time || event.date) === "ended")
    .map(event => event.id);

  if (endedEventIdsInSelection.length > 0) {
    toast.error(`Không thể hủy đăng ký các sự kiện đã diễn ra. (${endedEventIdsInSelection.length} sự kiện)`);
    setRegisterSelectedToUnregister(prev => {
        const next = new Set(prev);
        endedEventIdsInSelection.forEach(id => next.delete(id));
        return next;
    });
    if (ids.length === endedEventIdsInSelection.length) return; 
    ids = ids.filter(id => !endedEventIdsInSelection.includes(id)); 
    if (ids.length === 0) return; 
  }


  setRegisterIsSubmitting("batch_unregister");
  const token = localStorage.getItem("authToken");
  if (!token) {
    toast.error("Vui lòng đăng nhập lại.");
    setRegisterIsSubmitting(null);
    return;
  }
  const loadId = toast.loading(`Đang hủy ${ids.length} sự kiện...`);

  type BatchUnregSuccess = { status: "fulfilled"; value: string; id: string };
  type BatchUnregError = { status: "rejected"; reason: string; id: string };
  type BatchUnregMappedResult = BatchUnregSuccess | BatchUnregError;

  const promises: Promise<BatchUnregMappedResult>[] = ids.map(
    (id): Promise<BatchUnregMappedResult> =>
      fetch(
        `http://localhost:8080/identity/api/events/${id}/attendees/${currentUserId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      )
        .then(async (res): Promise<BatchUnregMappedResult> => {
          if (!res.ok) {
            let m = `Hủy ${id} lỗi`;
            try {
              const d = await res.json();
              m = d.message || m;
            } catch (_) {}
            return { status: "rejected" as const, reason: m, id };
          }
          return { status: "fulfilled" as const, value: id, id: id };
        })
        .catch((err): BatchUnregMappedResult => ({
          status: "rejected" as const,
          reason: err.message || `Lỗi mạng hủy ${id}`,
          id,
        }))
  );

  const results = await Promise.allSettled(promises);
  let okCount = 0;
  const failIds: string[] = [];
  const okIds: string[] = [];

  results.forEach((r) => {
    if (r.status === "fulfilled") {
      const mappedResult = r.value;
      if (mappedResult.status === "fulfilled") {
        okCount++;
        okIds.push(mappedResult.value);
      } else {
        const failedId = mappedResult.id;
        if (failedId) failIds.push(failedId);
      }
    } else {
      const idFromReason = (r.reason as any)?.id;
      if (idFromReason && typeof idFromReason === 'string' && !failIds.includes(idFromReason)) {
        failIds.push(idFromReason);
      }
    }
  });

  if (okCount > 0) {
    toast.success(`Hủy ${okCount} sự kiện thành công.`, { id: loadId });
    okIds.forEach((id) => onRegistrationChange(id, false));
  }
  if (failIds.length > 0) {
    setRegisterSelectedToUnregister(new Set(failIds));
    toast.error(`Lỗi hủy ${failIds.length} sự kiện. Vui lòng thử lại.`, {
      id: okCount === 0 && endedEventIdsInSelection.length === 0 ? loadId : undefined,
    });
  } else if (okCount > 0 && failIds.length === 0){
    setRegisterSelectedToUnregister(new Set());
  }
  
  if (okCount === 0 && failIds.length === 0 && ids.length > 0 && endedEventIdsInSelection.length === 0) {
      toast.error(`Không thể hủy ${ids.length} sự kiện. Vui lòng thử lại.`, { id: loadId });
  } else if (ids.length === 0 && endedEventIdsInSelection.length === 0) { 
      toast.dismiss(loadId);
  } else if (okCount > 0 && failIds.length === 0) {
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

    const eventsToUnregister = ids
        .map(id => processedRegisterEvents.find(event => event.id === id))
        .filter(event => event !== undefined) as EventType[];
    
    const endedEventNames = eventsToUnregister
        .filter(event => getEventTemporalStatus(event.time || event.date) === "ended")
        .map(event => event.name);

    let messageContent = <>Hủy đăng ký <strong className="text-indigo-600">{ids.length} sự kiện</strong> đã chọn?</>;
    if (endedEventNames.length > 0) {
        messageContent = (
            <>
                <p>Hủy đăng ký <strong className="text-indigo-600">{ids.length - endedEventNames.length} sự kiện</strong> hợp lệ?</p>
                <p className="text-xs text-orange-600 mt-1">
                    (Sẽ bỏ qua {endedEventNames.length} sự kiện đã diễn ra: {endedEventNames.join(', ')})
                </p>
            </>
        );
    }
     if (ids.length - endedEventNames.length === 0 && endedEventNames.length > 0) {
        toast.error(`Tất cả ${endedEventNames.length} sự kiện bạn chọn đều đã diễn ra và không thể hủy đăng ký.`);
        return;
    }


    setRegisterConfirmationState({
      isOpen: true,
      title: "Xác nhận hủy hàng loạt",
      message: messageContent,
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
      confirmText: `Hủy (${ids.length - endedEventNames.length})`,
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

  const fetchMyQRCode = useCallback(async () => {
    if (!currentUserId || isLoadingMyQRCode) return;
    setIsLoadingMyQRCode(true);
    setErrorMyQRCode(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập để xem QR.");
      setErrorMyQRCode("Chưa đăng nhập");
      setIsLoadingMyQRCode(false);
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
      if (myQRCodeImageUrl) URL.revokeObjectURL(myQRCodeImageUrl);
      const objectURL = URL.createObjectURL(blob);
      setMyQRCodeImageUrl(objectURL);
    } catch (err: any) {
      const message = err.message || "Không thể tải mã QR.";
      setErrorMyQRCode(message);
      setMyQRCodeImageUrl(null);
      toast.error(message);
    } finally {
      setIsLoadingMyQRCode(false);
    }
  }, [currentUserId, isLoadingMyQRCode, myQRCodeImageUrl]);

  useEffect(() => {
    const currentQrCodeUrl = myQRCodeImageUrl;
    return () => {
      if (currentQrCodeUrl) URL.revokeObjectURL(currentQrCodeUrl);
    };
  }, [myQRCodeImageUrl]);

  const handleShowMyQRCode = () => {
    if (!currentUserId) {
      toast.error("Chưa thể xác định người dùng để lấy mã QR.");
      return;
    }
    setShowMyQRCodeModal(true);
    fetchMyQRCode();
  };

  const handleOpenQrScanCheckInModal = useCallback(async () => {
    if (!currentUserId) {
        toast.error("Vui lòng đăng nhập để điểm danh.");
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Trình duyệt của bạn không hỗ trợ truy cập camera.");
        setIsScanCheckInModalOpen(false);
        return;
    }
    setIsRequestingQrScanCameraPermission(true);
    const permissionToastId = "qr-scan-camera-permission-toast";
    toast.loading("Đang yêu cầu quyền truy cập camera...", { id: permissionToastId });
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        toast.success("Sẵn sàng quét. Đang mở trình quét QR...", { id: permissionToastId });
        setIsScanCheckInModalOpen(true);
    } catch (err: any) {
        console.error("Lỗi yêu cầu quyền camera để quét QR:", err);
        let errorMessage = "Lỗi khi yêu cầu quyền camera.";
        if (err instanceof DOMException) {
            if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                errorMessage = "Không tìm thấy camera trên thiết bị.";
            } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                errorMessage = "Bạn đã từ chối quyền truy cập camera. Vui lòng kiểm tra cài đặt trình duyệt.";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                errorMessage = "Không thể đọc dữ liệu từ camera. Camera có thể đang được sử dụng bởi ứng dụng khác.";
            } else if (err.name === "AbortError") {
                errorMessage = "Yêu cầu camera đã bị hủy.";
            } else if (err.name === "SecurityError") {
                errorMessage = "Lỗi bảo mật khi truy cập camera. Trang web cần được phục vụ qua HTTPS.";
            } else {
                errorMessage = `Lỗi camera: ${err.message || err.name}`;
            }
        } else if (err instanceof Error) {
            errorMessage = err.message;
        }
        toast.error(errorMessage, { id: permissionToastId });
        setIsScanCheckInModalOpen(false);
    } finally {
        setIsRequestingQrScanCameraPermission(false);
    }
  }, [currentUserId]);

  const handleCheckInScanSuccess = async (qrCodeData: string) => {
    setIsScanCheckInModalOpen(false);
    if (!currentUserId) {
      toast.error("Không tìm thấy ID người dùng hiện tại. Vui lòng thử đăng nhập lại.");
      return;
    }
    setIsCheckingInEvent(true);
    const toastId = toast.loading("Đang xử lý điểm danh...");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập để thực hiện điểm danh.", { id: toastId });
        setIsCheckingInEvent(false);
        return;
      }
      const formData = new FormData();
      formData.append('qrCodeData', qrCodeData);
      const response = await fetch(`http://localhost:8080/identity/api/events/${currentUserId}/check-in-2`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (response.ok && result.code === 1000) {
        const checkInData = result.result;
        toast.success(
          `${result.message || "Điểm danh thành công!"}\nSự kiện: ${checkInData.eventName}`,
          { id: toastId, duration: 5000 }
        );
        if (checkInData.eventId) {
          onRegistrationChange(checkInData.eventId, true);
        }
        await fetchRegisterAvailableEvents(false);
      } else {
        throw new Error(result.message || `Lỗi ${response.status}`);
      }
    } catch (error: any) {
      toast.error(`Điểm danh thất bại: ${error.message}`, { id: toastId });
    } finally {
      setIsCheckingInEvent(false);
    }
  };

  const handleCheckInScanError = (errorMessage: string) => {
    toast.error(`Lỗi quét QR: ${errorMessage}`);
    setIsScanCheckInModalOpen(false);
  };
  
  useEffect(() => {
    if (!isScanCheckInModalOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setIsScanCheckInModalOpen(false);
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
        window.removeEventListener('keydown', handleEsc);
    };
  }, [isScanCheckInModalOpen]);


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
              const eventStatus = getEventTemporalStatus(event.time || event.date);
              const isEventEnded = eventStatus === "ended";

              return (
                <li
                  key={event.id}
                  className={`border p-3 md:p-4 rounded-lg shadow-sm transition-colors duration-150 flex flex-col gap-3 cursor-pointer
                    ${ currentTab === "registered" ? 
                        (isSelected ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-white hover:bg-gray-50 border-gray-200")
                        : (isCreated ? "bg-gray-50 border-gray-200 cursor-default" : "bg-white hover:bg-gray-50 border-gray-200")
                    } 
                    ${processing ? "opacity-70 !cursor-wait" : ""}`}
                  onClick={() => {
                      if (!processing && !(isCreated && currentTab === "available")) {
                          setViewingEventDetails(event);
                      }
                  }}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start w-full gap-2">
                    <div className="flex items-center flex-grow min-w-0">
                      {event.avatarUrl ? (
                        <Image
                          src={event.avatarUrl}
                          alt={`Avatar sự kiện ${event.name}`}
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
                              <span className="mr-2 h-4 w-4 flex items-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                        if (!processing) handleSelectToUnregister(event.id);
                                    }}
                                    disabled={processing || (isEventEnded && currentTab === "registered")}
                                    aria-label={`Chọn hủy ${event.name}`}
                                    className="h-full w-full text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                />
                              </span>
                          )}
                          {event.name}
                          {isCreated && currentTab === "available" && (
                            <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                              ✨ Của bạn
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600 pl-0">
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
                    {currentTab === "available" &&
                      (isCreated ? (
                        <button
                          onClick={(e) => e.stopPropagation()}
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
                          disabled={alreadyRegistered || processing || !canAct || isEventEnded}
                          className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                            alreadyRegistered || isEventEnded
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                          title={isEventEnded ? "Sự kiện đã kết thúc" : alreadyRegistered ? "Đã đăng ký" : "Đăng ký"}
                        >
                          {alreadyRegistered ? (
                            <CheckCircledIcon />
                          ) : processing ? (
                            <ReloadIcon className="animate-spin" />
                          ) : isEventEnded ? (
                            <Cross2Icon />
                          ) : (
                            <Pencil1Icon />
                          )}
                          {alreadyRegistered
                            ? "Đã đăng ký"
                            : processing
                            ? "..."
                            : isEventEnded
                            ? "Đã kết thúc"
                            : "Đăng ký"}
                        </button>
                      ))}
                    {currentTab === "registered" && !isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregisterClick(event);
                        }}
                        disabled={processing || !canAct || isEventEnded}
                        className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                          processing || !canAct || isEventEnded
                            ? "bg-red-300 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                          title={isEventEnded ? "Không thể hủy sự kiện đã diễn ra" : "Hủy đăng ký"}
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
              const eventStatus = getEventTemporalStatus(event.time || event.date);
              const isEventEnded = eventStatus === "ended";

              return (
                <div
                  key={event.id}
                  className={`border p-4 rounded-lg shadow-sm flex flex-col justify-between transition-colors duration-150 cursor-pointer
                  ${ currentTab === "registered" ? 
                      (isSelected ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-white hover:bg-gray-50 border-gray-200")
                      : (isCreated ? "bg-gray-50 border-gray-200 cursor-default" : "bg-white hover:bg-gray-50 border-gray-200")
                  } 
                  ${processing ? "opacity-70 !cursor-wait" : ""}`}
                  onClick={() => {
                    if (!processing && !(isCreated && currentTab === "available")) {
                        setViewingEventDetails(event);
                    }
                  }}
                >
                  {event.avatarUrl ? (
                    <div className="w-full h-32 bg-gray-200 relative mb-3 rounded-md overflow-hidden">
                      <Image
                        src={event.avatarUrl}
                        alt={`Avatar sự kiện ${event.name}`}
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
                         <span className="mr-2 mt-1 h-4 w-4 flex items-center flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                  if (!processing) handleSelectToUnregister(event.id);
                              }}
                              disabled={processing || (isEventEnded && currentTab === "registered")}
                              aria-label={`Chọn hủy ${event.name}`}
                              className="h-full w-full text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </span>
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
                    {currentTab === "available" &&
                      (isCreated ? (
                        <button
                          onClick={(e) => e.stopPropagation()}
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
                          disabled={alreadyRegistered || processing || !canAct || isEventEnded}
                          className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                            alreadyRegistered || isEventEnded
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                          title={isEventEnded ? "Sự kiện đã kết thúc" : alreadyRegistered ? "Đã đăng ký" : "Đăng ký"}
                        >
                          {alreadyRegistered ? (
                            <CheckCircledIcon />
                          ) : processing ? (
                            <ReloadIcon className="animate-spin" />
                          ) : isEventEnded ? (
                            <Cross2Icon/>
                          ) : (
                            <Pencil1Icon />
                          )}
                          {alreadyRegistered
                            ? "Đã đăng ký"
                            : processing
                            ? "..."
                            : isEventEnded
                            ? "Đã kết thúc"
                            : "Đăng ký"}
                        </button>
                      ))}
                    {currentTab === "registered" && !isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnregisterClick(event);
                        }}
                        disabled={processing || !canAct || isEventEnded}
                        className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                          processing || !canAct || isEventEnded
                            ? "bg-red-300 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                        title={isEventEnded ? "Không thể hủy sự kiện đã diễn ra" : "Hủy đăng ký"}
                      >
                        {processing ? (
                          <ReloadIcon className="animate-spin" />
                        ) : (
                          <Cross2Icon />
                        )}
                        {processing ? "..." : " Hủy"}
                      </button>
                    )}
                    {currentTab === "registered" && isSelected && processing && (
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
    <>
      <div className="flex items-center gap-3 mb-4 flex-shrink-0 flex-wrap">
        <h2 className="text-xl md:text-2xl font-bold text-green-600">
          Tìm & Đăng ký sự kiện
        </h2>
        <button
          onClick={handleRefreshRegisteredEvents}
          disabled={
            isRefreshingInternal ||
            isParentRefreshing ||
            registerIsLoading ||
            isLoadingRegisteredIds ||
            !!registerIsSubmitting ||
            isRequestingQrScanCameraPermission 
          }
          className="p-1.5 sm:p-2 cursor-pointer border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
          title="Làm mới danh sách sự kiện có sẵn"
        >
          {isRefreshingInternal || isParentRefreshing ? (
            <ReloadIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-green-600" />
          ) : (
            <ReloadIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
          )}
        </button>
        <div className="ml-auto flex gap-2 flex-wrap">
            <button
                onClick={handleOpenQrScanCheckInModal}
                disabled={isLoadingRegisteredIds || !currentUserId || isCheckingInEvent || isRequestingQrScanCameraPermission}
                className="px-3 py-1.5 cursor-pointer rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Quét mã QR của sự kiện để check-in"
            >
                {isRequestingQrScanCameraPermission ? (
                     <ReloadIcon className="w-5 h-5 animate-spin" />
                ) : isCheckingInEvent ? (
                    <ReloadIcon className="w-5 h-5 animate-spin" />
                ) : (
                    <MdQrCodeScanner size={20} />
                )}
                {isRequestingQrScanCameraPermission 
                    ? "Xin quyền..." 
                    : isCheckingInEvent 
                    ? "Đang xử lý..." 
                    : "Quét QR Điểm Danh"}
            </button>
            <button
                onClick={handleShowMyQRCode}
                disabled={isLoadingRegisteredIds || !currentUserId || isLoadingMyQRCode || isRequestingQrScanCameraPermission}
                className="px-3 py-1.5 cursor-pointer rounded-md text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Hiển thị mã QR của bạn"
            >
                <MdQrCode size={20} />
                Mã QR của tôi
            </button>
        </div>
      </div>
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
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.5em 1.5em",
              }}
            >
              <option value="az"> A - Z</option>
              <option value="za"> Z - A</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="timeFilterRegEvents"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Lọc theo trạng thái
            </label>
            <select
              id="timeFilterRegEvents"
              value={registerTimeFilter}
              onChange={(e) =>
                setRegisterTimeFilter(e.target.value as RegisterEventTemporalFilterOption)
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.5em 1.5em",
              }}
            >
              <option value="all">Tất cả thời gian</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="ended">Đã diễn ra</option>
              <option value="dateRange">Khoảng ngày cụ thể</option>
            </select>
          </div>
          <div className="flex items-end justify-start sm:justify-end gap-2">
            <div className="flex w-full sm:w-auto">
              <button
                onClick={() => setRegisterViewMode("list")}
                title="Danh sách"
                className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out cursor-pointer ${
                  registerViewMode === "list"
                    ? "bg-green-600 border-green-700 text-white shadow-sm z-10"
                    : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setRegisterViewMode("card")}
                title="Thẻ"
                className={`flex-1 sm:flex-none p-2 rounded-r-md border transition duration-150 ease-in-out cursor-pointer ${
                  registerViewMode === "card"
                    ? "bg-green-600 border-green-700 text-white shadow-sm z-10"
                    : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <Component1Icon className="h-5 w-5" />
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
          <MagnifyingGlassIcon /> Gợi ý ({
            processedRegisterEvents.filter(
              (e) => !isRegistered(e.id) && !isCreatedByUser(e.id)
            ).length
          })
        </button>
        <button
          onClick={() => setRegisterTab("registered")}
          className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 flex items-center gap-1 ${
            registerTab === "registered"
              ? "border-green-500 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <CheckCircledIcon /> Đã đăng ký ({initialRegisteredEventIds?.size ?? 0})
        </button>
      </div>
      <div className="overflow-y-auto flex-grow pt-4 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        {renderRegisterEventListOrCard()}
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

        {showMyQRCodeModal && (
            <div
                className="fixed inset-0 bg-black/30 bg-opacity-75 flex items-center justify-center z-[80] p-4"
                onClick={() => setShowMyQRCodeModal(false)}
            >
                <div
                    className="bg-white p-6 rounded-lg shadow-xl text-center max-w-xs w-full "
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Mã QR cá nhân của bạn</h3>
                    {isLoadingMyQRCode && <div className="flex justify-center items-center h-48"><ReloadIcon className="w-8 h-8 animate-spin text-indigo-500"/></div>}
                    {errorMyQRCode && <p className="text-red-500 bg-red-50 p-3 rounded border border-red-200 my-4">{errorMyQRCode}</p>}
                    {myQRCodeImageUrl && !errorMyQRCode && (
                        <div className="my-4 flex justify-center">
                            <img src={myQRCodeImageUrl} alt="Mã QR của bạn" className="w-full max-w-[256px] h-auto object-contain border rounded"/>
                        </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                        <p>Dùng mã này để được điểm danh bởi người khác.</p>
                        {errorMyQRCode && <button onClick={fetchMyQRCode} className="mt-2 text-blue-600 hover:underline font-medium">Thử lại</button>}
                    </div>
                    <button
                        onClick={() => setShowMyQRCodeModal(false)}
                        className="mt-6 cursor-pointer w-full bg-indigo-600 text-white py-2.5 px-4 rounded-md hover:bg-indigo-700 transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        )}

        {isScanCheckInModalOpen && (
            <div
                className="fixed inset-0 bg-black/30 bg-opacity-75 flex items-center justify-center z-[90] p-4"
                onClick={() => { if(!isRequestingQrScanCameraPermission) setIsScanCheckInModalOpen(false);}}
            >
                <div
                    className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-md relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">Quét mã QR Sự kiện để Điểm danh</h3>
                    <button
                        onClick={() => setIsScanCheckInModalOpen(false)}
                        disabled={isRequestingQrScanCameraPermission || isCheckingInEvent}
                        className="absolute top-3 right-3 cursor-pointer text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Đóng trình quét QR"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <QRScanner
                        onScanSuccess={handleCheckInScanSuccess}
                        onScanError={handleCheckInScanError}
                    />
                </div>
            </div>
        )}

    </>
  );
};

export default RegisteredEventsTab;