"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast, Toaster } from "react-hot-toast";


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
interface UserInfo {
  id: string;
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
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

// --- Component ModalEventRegister ---
interface ModalEventRegisterProps {
  onClose: () => void;
  onDataChanged: (eventId: string, registered: boolean) => void;
  currentUserId: string | null;
  isLoadingUserId: boolean;
  registeredEventIds: Set<string>;
  createdEventIds: Set<string>;
}

export default function ModalEventRegisterUser({
  onClose,
  onDataChanged,
  currentUserId,
  isLoadingUserId,
  registeredEventIds,
  createdEventIds,
}: ModalEventRegisterProps) {
  const [tab, setTab] = useState<"available" | "registered">("available");
  const [searchTerm, setSearchTerm] = useState("");
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

  const fetchAvailableEvents = useCallback(async () => {
    setIsLoadingAvailable(true);
    setErrorAvailable(null);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let m = `Lỗi tải sự kiện`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(m);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setAvailableEvents(data.result);
      } else {
        throw new Error(data.message || "Dữ liệu không hợp lệ");
      }
    } catch (err: any) {
      console.error("Lỗi tải sự kiện hiện có:", err);
      setErrorAvailable(err.message || "Lỗi xảy ra");
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  useEffect(() => {
    fetchAvailableEvents();
  }, [fetchAvailableEvents]);

  const isRegistered = useCallback(
    (eventId: string): boolean => {
      return registeredEventIds.has(eventId);
    },
    [registeredEventIds]
  );

  const isCreatedByUser = useCallback(
    (eventId: string): boolean => {
      return createdEventIds.has(eventId);
    },
    [createdEventIds]
  );

  const executeRegistration = async (eventToRegister: EventInfo) => {
    if (
      isSubmitting ||
      isRegistered(eventToRegister.id) ||
      !currentUserId ||
      isLoadingUserId ||
      isCreatedByUser(eventToRegister.id)
    ) {
      if (!currentUserId || isLoadingUserId) toast.error("Chưa thể đăng ký.");
      return;
    }
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
        throw new Error(m);
      }
      await res.json();
      toast.success("Đăng ký thành công!");
      onDataChanged(eventToRegister.id, true); 
    } catch (err: any) {
      toast.error(`Đăng ký thất bại: ${err.message}`);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleRegisterClick = (eventToRegister: EventInfo) => {
    if (
      isSubmitting ||
      isRegistered(eventToRegister.id) ||
      !currentUserId ||
      isLoadingUserId ||
      isCreatedByUser(eventToRegister.id)
    ) {
      if (!currentUserId || isLoadingUserId) toast.error("Chưa thể đăng ký.");
      return;
    }
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận đăng ký",
      message: (
        <>
          Bạn có chắc chắn muốn đăng ký <br />{" "}
          <strong className="text-indigo-600">"{eventToRegister.name}"</strong>?
        </>
      ),
      onConfirm: () => executeRegistration(eventToRegister),
      confirmVariant: "primary",
      confirmText: "Đăng ký",
      cancelText: "Hủy",
    });
  };

  const executeUnregistration = async (eventToUnregister: EventInfo) => {
    if (isSubmitting || !currentUserId || isLoadingUserId) {
      if (!currentUserId || isLoadingUserId)
        toast.error("Không thể xác định user.");
      return;
    }
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
          m = d.message || msg;
        } catch (_) {}
        throw new Error(m);
      }
      toast.success("Hủy đăng ký thành công!");
      onDataChanged(eventToUnregister.id, false); // Thông báo cho cha
    } catch (err: any) {
      toast.error(`Hủy đăng ký thất bại: ${err.message}`);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleUnregisterClick = (eventToUnregister: EventInfo) => {
    if (isSubmitting || !currentUserId || isLoadingUserId) {
      if (!currentUserId || isLoadingUserId)
        toast.error("Không thể xác định user.");
      return;
    }
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận hủy",
      message: (
        <>
          Bạn chắc chắn muốn hủy đăng ký <br />{" "}
          <strong className="text-indigo-600">
            "{eventToUnregister.name}"
          </strong>
          ?
        </>
      ),
      onConfirm: () => executeUnregistration(eventToUnregister),
      confirmVariant: "danger",
      confirmText: "Xác nhận hủy",
      cancelText: "Không",
    });
  };

  const handleSelectToUnregister = (eventId: string) => {
    setSelectedToUnregister((prev) => {
      const n = new Set(prev);
      if (n.has(eventId)) {
        n.delete(eventId);
      } else {
        n.add(eventId);
      }
      return n;
    });
  };

  const executeBatchUnregistration = async (ids: string[]) => {
    if (isSubmitting || !currentUserId || isLoadingUserId) {
      if (!currentUserId || isLoadingUserId)
        toast.error("Không thể xác định người dùng.");
      return;
    }
    setIsSubmitting("batch_unregister");
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsSubmitting(null);
      return;
    }
    const promises = ids.map((id) => {
      const url = `http://localhost:8080/identity/api/events/${id}/attendees/${currentUserId}`;
      return fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok) {
            let m = `Hủy đk ${id} lỗi`;
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
      } else if (r.status === "fulfilled" && r.value.status === "rejected") {
        failIds.push(r.value.id);
        console.error(`Fail unreg ${r.value.id}: ${r.value.reason}`);
      } else if (r.status === "rejected") {
        console.error(`Network err unreg: ${r.reason}`);
      }
    });
    if (okCount > 0) {
      toast.success(`Đã hủy ${okCount} sự kiện.`);
      setSelectedToUnregister(new Set());
      okIds.forEach((id) => onDataChanged(id, false));
    }
    if (failIds.length > 0) {
      toast.error(`Lỗi hủy ${failIds.length} sự kiện.`);
    }
    setIsSubmitting(null);
  };

  const handleBatchUnregister = () => {
    const ids = Array.from(selectedToUnregister);
    if (ids.length === 0) {
      toast.error("Chọn sự kiện để hủy.");
      return;
    }
    if (!currentUserId || isLoadingUserId) {
      toast.error("Không thể xác định user.");
      return;
    }
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận hủy",
      message: (
        <>
          Hủy đăng ký{" "}
          <strong className="text-indigo-600">{ids.length} sự kiện</strong> đã
          chọn?
        </>
      ),
      onConfirm: () => executeBatchUnregistration(ids),
      confirmVariant: "danger",
      confirmText: `Hủy (${ids.length})`,
      cancelText: "Không",
    });
  };

  const filterEvents = useCallback(
    (events: EventInfo[]) => {
      if (!searchTerm) return events;
      const lower = searchTerm.toLowerCase();
      return events.filter(
        (e) =>
          e.name.toLowerCase().includes(lower) ||
          e.location?.toLowerCase().includes(lower)
      );
    },
    [searchTerm]
  );

  const filteredAvailableEvents = useMemo(
    () => filterEvents(availableEvents),
    [availableEvents, filterEvents]
  );
  const filteredRegisteredEvents = useMemo(() => {
    const registered = availableEvents.filter((event) =>
      registeredEventIds.has(event.id)
    );
    return filterEvents(registered);
  }, [availableEvents, registeredEventIds, filterEvents]);

  const renderEventList = (
    list: EventInfo[],
    type: "available" | "registered"
  ) => {
    const isLoading = isLoadingUserId || isLoadingAvailable;
    const error = errorAvailable; 
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
    if (list.length === 0)
      return (
        <p className="text-center text-gray-500 italic py-5">
          {" "}
          {searchTerm
            ? "Không tìm thấy."
            : type === "available"
            ? "Không có sự kiện."
            : "Chưa đăng ký sự kiện."}{" "}
        </p>
      );

    return (
      <ul className="space-y-3">
        {list.map((event) => {
          const processing =
            isSubmitting === event.id || isSubmitting === "batch_unregister";
          const alreadyRegistered = isRegistered(event.id);
          const isCreated = isCreatedByUser(event.id);
          const isSelected = selectedToUnregister.has(event.id);
          const canAct = !!currentUserId && !isLoadingUserId;

          return (
            <li
              key={event.id}
              className={`border p-3 md:p-4 rounded-lg shadow-sm bg-white transition-colors duration-150 flex flex-col gap-3 ${
                type === "registered"
                  ? "cursor-pointer hover:bg-gray-50"
                  : "hover:bg-gray-50"
              }`}
              onClick={
                type === "registered"
                  ? () => handleSelectToUnregister(event.id)
                  : undefined
              }
            >
              <div className="flex flex-col sm:flex-row justify-between items-start w-full gap-2">
                <div className="flex-grow">
                  <h3 className="text-md md:text-lg font-semibold text-gray-800 mb-1">
                    {event.name}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600">
                    {event.time && (
                      <span className="flex items-center">
                        <span className="mr-1.5 opacity-70">📅</span>
                        {new Date(event.time).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center mt-1 sm:mt-0">
                        <span className="mr-1.5 opacity-70">📍</span>
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
                {type === "registered" && (
                  <div className="flex-shrink-0 pt-1 sm:pt-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectToUnregister(event.id);
                      }}
                      className="h-5 disabled:opacity-50 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                      aria-label={`Chọn hủy ${event.name}`}
                    />
                  </div>
                )}
              </div>
              {type === "available" && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:items-center border-t border-gray-100 pt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingEventDetails(event);
                    }}
                    disabled={processing}
                    className="px-3 py-1.5 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-xs font-medium w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                  {isCreated ? (
                    <button
                      className="w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-gray-600 bg-gray-300 text-xs font-medium"
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
                      className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                        alreadyRegistered
                          ? "bg-gray-400 cursor-not-allowed"
                          : processing || !canAct
                          ? "bg-blue-300 cursor-wait"
                          : "bg-blue-500 hover:bg-blue-600"
                      }`}
                    >
                      {alreadyRegistered
                        ? "✅ Đã đăng ký"
                        : processing
                        ? "..."
                        : "📝 Đăng ký"}
                    </button>
                  )}
                </div>
              )}
              {type === "registered" && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:items-center border-t border-gray-100 pt-3">
                  <button
                    
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingEventDetails(event);
                    }}
                    disabled={processing}
                    className="px-3 py-1.5 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-xs font-medium w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderEventDetails = (event: EventInfo) => {
    const processing = isSubmitting === event.id;
    const alreadyRegistered = isRegistered(event.id);
    const isCreated = isCreatedByUser(event.id);
    const canPerformAction = !!currentUserId && !isLoadingUserId;
    const descriptionToShow =
      event.description || event.content || event.purpose;
    return (
      <div className="p-1">
        <button
          onClick={() => setViewingEventDetails(null)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Quay lại
        </button>
        <h3 className="text-xl font-bold text-gray-800 mb-3">{event.name}</h3>
        <div className="space-y-2 text-sm text-gray-700">
          {event.time && (
            <p>
              <strong className="font-medium text-gray-900 w-24 inline-block">
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
              <strong className="font-medium text-gray-900 w-24 inline-block">
                Địa điểm:
              </strong>{" "}
              {event.location}
            </p>
          )}
          {descriptionToShow && (
            <p>
              <strong className="font-medium text-gray-900 w-24 inline-block align-top">
                Mô tả:
              </strong>{" "}
              <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-6rem)]">
                {descriptionToShow}
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
              ✨ Sự kiện của bạn
            </button>
          ) : alreadyRegistered ? (
            <button
              onClick={() => handleUnregisterClick(event)}
              disabled={processing || !canPerformAction}
              className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${
                processing || !canPerformAction
                  ? "bg-red-300 cursor-wait"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {processing ? "..." : " Hủy đăng ký"}
            </button>
          ) : (
            <button
              onClick={() => handleRegisterClick(event)}
              disabled={processing || !canPerformAction}
              className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${
                processing || !canPerformAction
                  ? "bg-blue-300 cursor-wait"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              {processing ? "..." : "📝 Đăng ký"}
            </button>
          )}
          <button
            onClick={() => setViewingEventDetails(null)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Toaster toastOptions={{ duration: 3000 }} />
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-0 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 md:p-5 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-blue-700">
            {" "}
            {viewingEventDetails
              ? "Chi tiết sự kiện"
              : "Danh sách sự kiện"}{" "}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-600 text-2xl font-semibold cursor-pointer p-1"
            title="Đóng"
          >
            {" "}
            &times;{" "}
          </button>
        </div>
        {!viewingEventDetails && (
          <>
            {" "}
            <div className="p-4 md:p-5 ">
              {" "}
              <div className="relative">
                {" "}
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔍
                </span>{" "}
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc địa điểm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />{" "}
              </div>{" "}
            </div>{" "}
            <div className="flex flex-wrap gap-4 mb-0 px-4 md:px-5 border-b flex-shrink-0">
              {" "}
              <button
                onClick={() => setTab("available")}
                className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 ${
                  tab === "available"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {" "}
                📌 Gợi ý{" "}
              </button>{" "}
              <button
                onClick={() => setTab("registered")}
                className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 ${
                  tab === "registered"
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {" "}
                ✅ Đã đăng ký{" "}
              </button>{" "}
            </div>{" "}
          </>
        )}
        <div className="overflow-y-auto flex-grow p-4 md:p-5">
          {viewingEventDetails
            ? renderEventDetails(viewingEventDetails)
            : tab === "available"
            ? renderEventList(filteredAvailableEvents, "available")
            : renderEventList(filteredRegisteredEvents, "registered")}
        </div>
        <div
          className={`flex ${
            selectedToUnregister.size > 0 &&
            tab === "registered" &&
            !viewingEventDetails
              ? "justify-between"
              : "justify-end"
          } p-4 md:p-5 border-t flex-shrink-0 items-center`}
        >
          {tab === "registered" &&
            selectedToUnregister.size > 0 &&
            !viewingEventDetails && (
              <button
                onClick={handleBatchUnregister}
                disabled={
                  isSubmitting === "batch_unregister" ||
                  !currentUserId ||
                  isLoadingUserId
                }
                className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${
                  isSubmitting === "batch_unregister" ||
                  !currentUserId ||
                  isLoadingUserId
                    ? "bg-red-300 cursor-wait"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {" "}
                {isSubmitting === "batch_unregister"
                  ? "..."
                  : `Hủy đăng ký(${selectedToUnregister.size}) sự kiện`}{" "}
              </button>
            )}
          <button
            onClick={onClose}
            className="px-5 cursor-pointer py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm transition text-sm font-medium"
          >
            {" "}
            Đóng{" "}
          </button>
        </div>
      </div>
      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmVariant={confirmationState.confirmVariant}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={() => {
          if (confirmationState.onConfirm) confirmationState.onConfirm();
          setConfirmationState({
            isOpen: false,
            title: "",
            message: "",
            onConfirm: null,
          });
        }}
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
}
