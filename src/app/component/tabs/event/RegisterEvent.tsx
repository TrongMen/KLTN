"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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

  const currentUserId = user?.id ?? null;
  const [isRefreshingInternal, setIsRefreshingInternal] = useState<boolean>(false);

  useEffect(() => {
    setIsLoadingRegisteredIds(isLoadingRegisteredIdsProp);
  }, [isLoadingRegisteredIdsProp]);

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
      fetchRegisterAvailableEvents();
    } else {
      setRegisterIsLoading(false);
      setRegisterAvailableEvents([]);
    }
  }, [user, fetchRegisterAvailableEvents]);

  const handleRefreshRegisteredEvents = useCallback(async () => {
    if (isRefreshingInternal || isParentRefreshing) return;

    setIsRefreshingInternal(true);
    const toastId = toast.loading("Đang làm mới dữ liệu đăng ký...");
    try {
      await fetchRegisterAvailableEvents();
      await onMainRefreshTrigger(); 
      toast.success("Dữ liệu đăng ký đã được làm mới!", { id: toastId });
    } catch (error: any) {
      console.error("Lỗi trong quá trình làm mới (đăng ký):", error);
      toast.error(
        `Làm mới (đăng ký) thất bại: ${error.message || "Lỗi không xác định"}`,
        { id: toastId }
      );
    } finally {
      setIsRefreshingInternal(false);
    }
  }, [isRefreshingInternal, isParentRefreshing, fetchRegisterAvailableEvents, onMainRefreshTrigger]);

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
          {" "}
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
          {" "}
          Bạn chắc chắn muốn hủy đăng ký <br />{" "}
          <strong className="text-indigo-600">
            {" "}
            "{eventToUnregister.name}"{" "}
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

    const results = await Promise.allSettled(promises.map(p => p.catch(e => e))); 

    let okCount = 0;
    const failIds: string[] = [];
    const okIds: string[] = [];

    results.forEach((result) => {
        if (result.status === 'fulfilled') {
            const resValue = result.value;
            if (resValue.status === 'fulfilled') {
                okCount++;
                okIds.push(resValue.value);
            } else { 
                failIds.push(resValue.id);
                console.error(`Fail batch unreg ${resValue.id || 'unknown'}: ${resValue.reason}`);
            }
        } else { 
            const reason = result.reason as any;
            failIds.push(reason.id || 'unknown_id_on_network_error');
            console.error(`Network/Promise error in batch unreg ${reason.id || 'unknown'}: ${reason.reason || reason.message || 'Unknown promise rejection'}`);
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
    } else if (okCount === 0 && failIds.length === 0 && ids.length > 0) {
        toast.error(`Không thể hủy ${ids.length} sự kiện. Vui lòng thử lại.`, { id: loadId });
    } else if (ids.length === 0){
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
          {" "}
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
          {" "}
          {error}{" "}
        </p>
      );

    return (
      <div className="mt-4">
        {currentTab === "registered" && list.length > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-gray-50 py-2 z-10 px-1 -mx-1 rounded-t-md">
            <div className="flex items-center">
              {" "}
              <input
                type="checkbox"
                id="select-all-unregister"
                className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                checked={allFilteredRegisteredSelected}
                onChange={handleSelectAllForUnregister}
                disabled={list.length === 0 || isBatchUnregistering}
                aria-label="Chọn tất cả để hủy"
              />{" "}
              <label
                htmlFor="select-all-unregister"
                className="text-sm text-gray-600 cursor-pointer"
              >
                {" "}
                Chọn tất cả ({registerSelectedToUnregister.size}){" "}
              </label>{" "}
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
              {" "}
              {isBatchUnregistering ? (
                <ReloadIcon className="w-3 h-3 animate-spin" />
              ) : (
                <Cross2Icon className="w-3 h-3" />
              )}{" "}
              {isBatchUnregistering
                ? "..."
                : `Hủy (${registerSelectedToUnregister.size})`}{" "}
            </button>
          </div>
        )}
        {list.length === 0 && (
          <p className="text-center text-gray-500 italic py-5">
            {" "}
            {noResultMessage}{" "}
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
                  className={`border p-3 md:p-4 rounded-lg shadow-sm transition-colors duration-150 flex flex-col gap-3 cursor-pointer
                    ${ currentTab === "registered" ? 
                        (isSelected ? "bg-red-50 border-red-200 hover:bg-red-100" : "bg-white hover:bg-gray-50 border-gray-200")
                        : (isCreated ? "bg-gray-50 border-gray-200 cursor-default" : "bg-white hover:bg-gray-50 border-gray-200")
                    } 
                    ${processing ? "opacity-70 !cursor-wait" : ""}`
                  }
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
                          alt={`Avatar`}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-md object-cover mr-3 flex-shrink-0 border bg-gray-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 font-semibold mr-3 flex-shrink-0 border">
                          {" "}
                          {event.name?.charAt(0).toUpperCase() || "?"}{" "}
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
                                    disabled={processing}
                                    aria-label={`Chọn hủy ${event.name}`}
                                    className="h-full w-full text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                                />
                            </span>
                          )}
                          {event.name}
                          {isCreated && currentTab === "available" && (
                            <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                              {" "}
                              ✨ Của bạn{" "}
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600 pl-0">
                          {event.time && (
                            <span className="flex items-center gap-1.5">
                              {" "}
                              <CalendarIcon className="w-3.5 h-3.5 opacity-70" />{" "}
                              {new Date(event.time).toLocaleString("vi-VN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}{" "}
                            </span>
                          )}
                          {event.location && (
                            <span className="flex items-center mt-1 sm:mt-0 gap-1.5">
                              {" "}
                              <span className="opacity-70">📍</span>{" "}
                              {event.location}{" "}
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
                          className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                            alreadyRegistered
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {" "}
                          {alreadyRegistered ? (
                            <CheckCircledIcon />
                          ) : processing ? (
                            <ReloadIcon className="animate-spin" />
                          ) : (
                            <Pencil1Icon />
                          )}{" "}
                          {alreadyRegistered
                            ? "Đã đăng ký"
                            : processing
                            ? "..."
                            : "Đăng ký"}{" "}
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
                        {" "}
                        {processing ? (
                          <ReloadIcon className="animate-spin" />
                        ) : (
                          <Cross2Icon />
                        )}{" "}
                        {processing ? "..." : " Hủy"}{" "}
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
                      {" "}
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
                      />{" "}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold mb-3 rounded-md">
                      {" "}
                      {event.name?.charAt(0).toUpperCase() || "?"}{" "}
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
                                disabled={processing}
                                aria-label={`Chọn hủy ${event.name}`}
                                className="h-full w-full text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                            />
                        </span>
                      )}
                      <span className="line-clamp-2 flex-grow">
                        {" "}
                        {event.name}{" "}
                      </span>
                      {isCreated && currentTab === "available" && (
                        <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          {" "}
                          ✨{" "}
                        </span>
                      )}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600 mt-1 mb-3">
                      {event.time && (
                        <p className="flex items-center text-xs">
                          {" "}
                          <CalendarIcon className="w-3 h-3 mr-1.5 opacity-70 flex-shrink-0" />{" "}
                          {new Date(event.time).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}{" "}
                        </p>
                      )}
                      {event.location && (
                        <p className="flex items-center text-xs">
                          {" "}
                          <span className="mr-1.5 opacity-70">📍</span>{" "}
                          {event.location}{" "}
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
                          className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium flex items-center justify-center gap-1 ${
                            alreadyRegistered
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {" "}
                          {alreadyRegistered ? (
                            <CheckCircledIcon />
                          ) : processing ? (
                            <ReloadIcon className="animate-spin" />
                          ) : (
                            <Pencil1Icon />
                          )}{" "}
                          {alreadyRegistered
                            ? "Đã đăng ký"
                            : processing
                            ? "..."
                            : "Đăng ký"}{" "}
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
                        {" "}
                        {processing ? (
                          <ReloadIcon className="animate-spin" />
                        ) : (
                          <Cross2Icon />
                        )}{" "}
                        {processing ? "..." : " Hủy"}{" "}
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
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
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
            !!registerIsSubmitting
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
      </div>
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
              <MagnifyingGlassIcon />{" "}
            </span>{" "}
            <input
              type="text"
              id="searchRegEvents"
              placeholder="Tên hoặc địa điểm..."
              value={registerSearchTerm}
              onChange={(e) => setRegisterSearchTerm(e.target.value)}
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
              value={registerTimeFilter}
              onChange={(e) =>
                setRegisterTimeFilter(e.target.value as any)
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.5rem center",
                backgroundSize: "1.5em 1.5em",
              }}
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
            <div className="flex w-full sm:w-auto">
              {" "}
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
              </button>{" "}
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
              </button>{" "}
            </div>{" "}
          </div>
        </div>
        {registerTimeFilter === "dateRange" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm">
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
                value={registerStartDateFilter}
                onChange={handleRegisterEventStartDateChange}
                max={registerEndDateFilter || undefined}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white"
              />{" "}
            </div>
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
                value={registerEndDateFilter}
                onChange={handleRegisterEventEndDateChange}
                min={registerStartDateFilter || undefined}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white"
              />{" "}
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
    </>
  );
};

export default RegisteredEventsTab;