"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast, Toaster } from "react-hot-toast";

interface ApprovedEvent {
  id: string;
  name: string;
  time?: string;
  location?: string;
  status?: string;
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
  studentCode?: string; // Thêm studentCode vào type
}

interface ModalAttendeesProps {
  onClose: () => void;
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
  const confirmButtonClasses = useMemo(() => {
    let base =
      "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger") {
      base +=
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    } else {
      base +=
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
    }
    return base;
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
            confirmVariant === "danger" ? "text-red-700" : "text-gray-800"
          }`}
        >
          {title}
        </h3>
        <div className="text-sm text-gray-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel} className={cancelButtonClasses}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={confirmButtonClasses}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const getAttendeeName = (attendee: Attendee): string => {
  const fn = `${attendee.lastName || ""} ${attendee.firstName || ""}`.trim();
  return fn || attendee.username || `ID: ${attendee.userId.substring(0, 8)}`;
};

export default function ModalAttendees({ onClose }: ModalAttendeesProps) {
  const [userApprovedEvents, setUserApprovedEvents] = useState<ApprovedEvent[]>(
    []
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [originalAttendance, setOriginalAttendance] = useState<
    Record<string, boolean>
  >({});
  const [attendanceChanges, setAttendanceChanges] = useState<
    Record<string, boolean>
  >({});
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [mode, setMode] = useState<"view" | "attendance" | "delete">("view");
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  const fetchUserApprovedEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setEventError(null);
    setUserApprovedEvents([]);
    let cId: string | null = null;
    try {
      const tk = localStorage.getItem("authToken");
      if (!tk) throw new Error("Chưa đăng nhập.");
      const h = { Authorization: `Bearer ${tk}` };
      const uiRes = await fetch("http://localhost:8080/identity/users/myInfo", {
        headers: h,
      });
      if (!uiRes.ok) {
        const d = await uiRes.json().catch(() => {});
        throw new Error(d?.message || "Lỗi info");
      }
      const ui = await uiRes.json();
      cId = ui?.result?.id;
      if (!cId) throw new Error("Lỗi ID user");
      const url = `http://localhost:8080/identity/api/events/creator/${cId}`;
      const evRes = await fetch(url, { headers: h, cache: "no-store" });
      if (!evRes.ok) {
        const d = await evRes.json().catch(() => {});
        throw new Error(d?.message || "Lỗi event");
      }
      const data = await evRes.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const approved = data.result.filter(
          (e: any) => e.status === "APPROVED"
        );
        setUserApprovedEvents(approved);
      } else {
        setUserApprovedEvents([]);
        console.warn("API creator lỗi:", data);
      }
    } catch (e: any) {
      console.error("Lỗi fetch UserApprovedEvents:", e);
      setEventError(e.message || "Lỗi");
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  const fetchAttendees = useCallback(async () => {
    if (!selectedEventId) return;
    setIsLoadingAttendees(true);
    setAttendeeError(null);
    setAttendees([]);
    setOriginalAttendance({});
    setAttendanceChanges({});
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Chưa đăng nhập.");
      const h = { Authorization: `Bearer ${token}` };
      const res = await fetch(
        `http://localhost:8080/identity/api/events/${selectedEventId}/attendees`,
        { headers: h }
      );
      if (!res.ok) {
        let m = `Lỗi tải attendees`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(m);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const fetched: Attendee[] = data.result;
        const uMap = new Map<string, Attendee>();
        fetched.forEach((a) => {
          if (a.userId && !uMap.has(a.userId)) uMap.set(a.userId, a);
          else if (a.userId && uMap.has(a.userId)) {
            console.warn(`Duplicate attendee: ${a.userId}`);
          }
        });
        const unique = Array.from(uMap.values());
        setAttendees(unique);
        const iAtt: Record<string, boolean> = {};
        unique.forEach((a) => {
          if (a.userId) iAtt[a.userId] = a.attending ?? false;
        });
        setOriginalAttendance(iAtt);
        setAttendanceChanges(iAtt);
      } else {
        throw new Error(data.message || "Lỗi data attendees");
      }
    } catch (err: any) {
      console.error("Lỗi fetchAttendees:", err);
      setAttendeeError(err.message || "Lỗi tải attendees");
    } finally {
      setIsLoadingAttendees(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchUserApprovedEvents();
  }, [fetchUserApprovedEvents]);
  useEffect(() => {
    if (selectedEventId) {
      fetchAttendees();
    } else {
      setAttendees([]);
      setOriginalAttendance({});
      setAttendanceChanges({});
    }
  }, [selectedEventId, fetchAttendees]);

  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setMode("view");
    setSelectedForDelete(new Set());
  };
  const handleBackToEventList = () => {
    setSelectedEventId(null);
    setMode("view");
  };
  const handleSetMode = (newMode: "view" | "attendance" | "delete") => {
    setMode(newMode);
    setSelectedForDelete(new Set());
    setAttendanceChanges({ ...originalAttendance });
  };
  const handleCancelMode = () => {
    setMode("view");
    setSelectedForDelete(new Set());
    setAttendanceChanges({ ...originalAttendance });
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

  const handleSaveChanges = async () => {
    if (!selectedEventId || isProcessing) return;
    const changes: { userId: string; status: boolean }[] = [];
    Object.keys(attendanceChanges).forEach((id) => {
      if (attendanceChanges[id] !== originalAttendance[id])
        changes.push({ userId: id, status: attendanceChanges[id] });
    });
    if (changes.length === 0) {
      toast("Không có thay đổi.", { icon: "ℹ️" });
      setMode("view");
      return;
    }
    setIsProcessing(true);
    const loadId = toast.loading(`Đang lưu ${changes.length} thay đổi...`);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Token không lệ.");
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
          return { status: "fulfilled", value: { userId, status } };
        })
        .catch((err) => ({ status: "rejected", reason: err.message, userId }));
    });
    const results = await Promise.allSettled(promises);
    let ok = 0,
      fail = 0;
    const successUpdates: Record<string, boolean> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.status === "fulfilled") {
        ok++;
        successUpdates[r.value.value.userId] = r.value.value.status;
      } else {
        fail++;
        console.error(
          "Lỗi lưu điểm danh:",
          r.status === "rejected" ? r.reason : r.value.reason
        );
      }
    });
    if (ok > 0) {
      setOriginalAttendance((prev) => ({ ...prev, ...successUpdates }));
      setAttendanceChanges((prev) => ({ ...prev, ...successUpdates }));
      toast.success(`Đã lưu ${ok} thay đổi.`, { id: loadId });
    }
    if (fail > 0) {
      toast.error(`Lỗi ${fail} thay đổi.`, {
        id: ok === 0 ? loadId : undefined,
      });
      setAttendanceChanges(originalAttendance);
    } else if (ok === 0 && fail === 0) {
      toast.dismiss(loadId);
    }
    setIsProcessing(false);
    setMode("view");
  };
  const executeBatchDelete = async () => {
    const ids = Array.from(selectedForDelete);
    if (!selectedEventId || ids.length === 0 || isProcessing) return;
    setIsProcessing(true);
    const loadId = toast.loading(`Đang xóa ${ids.length} người...`);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Token không lệ.");
      setIsProcessing(false);
      return;
    }
    const promises = ids.map((userId) => {
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
          return { status: "fulfilled", value: userId };
        })
        .catch((err) => ({ status: "rejected", reason: err.message, userId }));
    });
    const results = await Promise.allSettled(promises);
    let ok = 0,
      fail = 0;
    const successDeletes = new Set<string>();
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.status === "fulfilled") {
        ok++;
        successDeletes.add(r.value.value);
      } else {
        fail++;
        console.error(
          "Lỗi xóa attendee:",
          r.status === "rejected" ? r.reason : r.value.reason
        );
      }
    });
    if (ok > 0) {
      const newAttendees = attendees.filter(
        (att) => !successDeletes.has(att.userId)
      );
      const newAttendance = { ...originalAttendance };
      successDeletes.forEach((id) => delete newAttendance[id]);
      setAttendees(newAttendees);
      setOriginalAttendance(newAttendance);
      setAttendanceChanges(newAttendance);
      setSelectedForDelete(new Set());
      toast.success(`Đã xóa ${ok} người.`, { id: loadId });
    }
    if (fail > 0) {
      toast.error(`Lỗi khi xóa ${fail} người.`, {
        id: ok === 0 ? loadId : undefined,
      });
    } else if (ok === 0 && fail === 0) {
      toast.dismiss(loadId);
    }
    setIsProcessing(false);
    setMode("view");
  };
  const handleConfirmBatchDelete = () => {
    const ids = Array.from(selectedForDelete);
    if (ids.length === 0) {
      toast.error("Chọn người để xóa.");
      return;
    }
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận xóa",
      message: (
        <>
          Xóa <strong className="text-red-600">{ids.length} người</strong> đã
          chọn?
        </>
      ),
      onConfirm: executeBatchDelete,
      confirmVariant: "danger",
      confirmText: `Xóa (${ids.length})`,
      cancelText: "Hủy",
    });
  };

  const selectedEventName = useMemo(
    () =>
      userApprovedEvents.find((event) => event.id === selectedEventId)?.name,
    [userApprovedEvents, selectedEventId]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-5 md:p-6 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 pb-3 border-b flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-blue-700 truncate pr-2">
            {" "}
            {selectedEventId
              ? `👥 Người tham gia: ${selectedEventName || "..."}`
              : "📅 Danh sách sự kiện"}{" "}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold cursor-pointer flex-shrink-0"
            title="Đóng"
          >
            {" "}
            &times;{" "}
          </button>
        </div>

        <div className="overflow-y-auto flex-grow mb-4 pr-2">
          {!selectedEventId && (
            <>
            
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
               
                Vui lòng chọn sự kiện
              </h3>
              {isLoadingEvents ? (
                <p className="text-center text-gray-500 italic py-5">
                  {" "}
                  Đang tải...
                </p>
              ) : eventError ? (
                <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  {eventError}
                </p>
              ) : userApprovedEvents.length === 0 ? (
                <p className="text-center text-gray-500 italic py-5">
                  {" "}
                  Bạn không có sự kiện nào đã được duyệt.
                </p>
              ) : (
                <div className="space-y-2">
                  {userApprovedEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => handleSelectEvent(event.id)}
                      className="w-full text-left p-3 bg-gray-50 cursor-pointer rounded-lg border border-gray-200 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <p className="font-semibold text-gray-800">
                        {event.name}
                      </p>
                      {event.time && (
                        <p className="text-base text-gray-500 mt-1">
                          📅{" "}
                          {new Date(event.time).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-base text-gray-500">
                          📍 {event.location}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}{" "}
            </>
          )}
          {selectedEventId && (
            <>
              {" "}
              <div className="flex justify-between items-center mb-3">
                {" "}
                <button
                  onClick={handleBackToEventList}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer "
                >
                  {" "}
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
                  </svg>{" "}
                  Quay lại{" "}
                </button>{" "}
                {mode !== "view" && (
                  <button
                    onClick={handleCancelMode}
                    className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-md cursor-pointer"
                  >
                    Hủy
                  </button>
                )}{" "}
              </div>{" "}
              {isLoadingAttendees ? (
                <p className="text-center text-gray-500 italic py-5">
                  {" "}
                  Đang tải...
                </p>
              ) : attendeeError ? (
                <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  {attendeeError}
                </p>
              ) : attendees.length === 0 ? (
                <p className="text-center text-gray-500 italic py-5">
                  {" "}
                  Chưa có người tham dự.
                </p>
              ) : (
                <div className="space-y-3">
                  {" "}
                  {attendees.map((attendee) => {
                    const isSelectedForDelete = selectedForDelete.has(
                      attendee.userId
                    );
                    const isCheckedForAttendance =
                      attendanceChanges[attendee.userId] ?? false;
                    const isRowProcessing = isProcessing;
                    return (
                      <div
                        key={attendee.userId}
                        className={`flex items-center justify-between bg-gray-50 p-3 rounded-lg border transition-colors ${
                          mode === "delete" && isSelectedForDelete
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200"
                        }`}
                      >
                        {" "}
                        <div className="flex items-center gap-3 flex-grow mr-2">
                          {" "}
                          {mode === "attendance" && (
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
                              className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer flex-shrink-0 disabled:opacity-50"
                            />
                          )}{" "}
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
                              className="w-5 h-5 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer flex-shrink-0 disabled:opacity-50"
                            />
                          )}{" "}
                          <div>
                            {" "}
                            <p
                              className={`font-semibold ${
                                mode === "delete" && isSelectedForDelete
                                  ? "text-red-800"
                                  : "text-gray-800"
                              }`}
                            >
                              {getAttendeeName(attendee)}
                            </p>{" "}
                            <div className="flex flex-wrap gap-x-3 text-base text-gray-500 mt-0.5">
                              {" "}
                              {attendee.studentCode && (
                                <span className="text-blue-600 ">
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
                        {mode === "view" && (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              originalAttendance[attendee.userId] ?? false
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {" "}
                            {originalAttendance[attendee.userId] ?? false
                              ? "Có mặt"
                              : "Vắng"}{" "}
                          </span>
                        )}{" "}
                      </div>
                    );
                  })}{" "}
                </div>
              )}{" "}
            </>
          )}
        </div>

        <div className="flex justify-between items-center border-t pt-4 flex-shrink-0">
          {" "}
          <div>
            {" "}
            {selectedEventId && !isLoadingAttendees && attendees.length > 0 && (
              <>
                {" "}
                {mode === "view" && (
                  <div className="flex gap-2">
                    {" "}
                    <button
                      onClick={() => handleSetMode("attendance")}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-800 rounded-md text-sm font-medium cursor-pointer disabled:opacity-50"
                    >
                      Điểm danh
                    </button>{" "}
                    <button
                      onClick={() => handleSetMode("delete")}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-sm font-medium cursor-pointer disabled:opacity-50"
                    >
                      Xóa người
                    </button>{" "}
                  </div>
                )}{" "}
                {mode === "attendance" && (
                  <button
                    onClick={handleSaveChanges}
                    disabled={isProcessing}
                    className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${
                      isProcessing
                        ? "bg-blue-300 cursor-wait"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {" "}
                    {isProcessing ? "Đang lưu..." : "Lưu điểm danh"}{" "}
                  </button>
                )}{" "}
                {mode === "delete" && (
                  <button
                    onClick={handleConfirmBatchDelete}
                    disabled={isProcessing || selectedForDelete.size === 0}
                    className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${
                      isProcessing || selectedForDelete.size === 0
                        ? "bg-red-300 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {" "}
                    {isProcessing
                      ? "Đang xóa..."
                      : `Xóa (${selectedForDelete.size})`}{" "}
                  </button>
                )}{" "}
              </>
            )}{" "}
          </div>{" "}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow transition text-sm font-medium cursor-pointer"
          >
            {" "}
            Đóng{" "}
          </button>{" "}
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
