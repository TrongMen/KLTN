"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast"; // Keep Toaster in UserHome
import {
  ArrowLeftIcon,
  CheckIcon,
  Cross2Icon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { User as MainUserType } from "../homeuser"; // Import User type from UserHome


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
  studentCode?: string; 
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

// --- Helper Function ---
const getAttendeeName = (attendee: Attendee): string => {
  const fn = `${attendee.lastName || ""} ${attendee.firstName || ""}`.trim();
  // Use username or ID as fallback if name is empty
  return fn || attendee.username || `ID: ${attendee.userId?.substring(0, 8) ?? 'N/A'}`;
};

// --- Main Tab Component ---
const AttendeesTabContent: React.FC<AttendeesTabContentProps> = ({ user }) => {
  const [userApprovedEvents, setUserApprovedEvents] = useState<ApprovedEvent[]>(
    []
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [originalAttendance, setOriginalAttendance] = useState<
    Record<string, boolean> // userId: isAttending
  >({});
  const [attendanceChanges, setAttendanceChanges] = useState<
    Record<string, boolean> // userId: isAttending
  >({});
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>( // Set of userIds
    new Set()
  );
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState<boolean>(false);
  const [eventError, setEventError] = useState<string | null>(null);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // For save/delete actions
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

  // --- Fetch Functions ---
  const fetchUserApprovedEvents = useCallback(async () => {
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
      const cId = user.id; // Use ID from prop

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
          .map((e:any) => ({ // Map to ApprovedEvent type
              id: e.id,
              name: e.name,
              time: e.time,
              location: e.location,
              status: e.status,
          }));
        setUserApprovedEvents(approved);
      } else {
        setUserApprovedEvents([]);
        console.warn("API creator events returned unexpected data:", data);
      }
    } catch (e: any) {
      console.error("Lỗi fetch UserApprovedEvents:", e);
      setEventError(e.message || "Lỗi không xác định khi tải sự kiện");
    } finally {
      setIsLoadingEvents(false);
    }
  }, [user]); // Depend on user prop

  const fetchAttendees = useCallback(async () => {
    if (!selectedEventId) return;
    setIsLoadingAttendees(true);
    setAttendeeError(null);
    // Reset states before fetching new attendees
    setAttendees([]);
    setOriginalAttendance({});
    setAttendanceChanges({});
    setSelectedForDelete(new Set());
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Chưa đăng nhập.");
      const h = { Authorization: `Bearer ${token}` };
      const res = await fetch(
        `http://localhost:8080/identity/api/events/${selectedEventId}/attendees`,
        { headers: h }
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

        // --- Deduplicate based on userId ---
        const userMap = new Map<string, Attendee>();
        fetched.forEach((a) => {
          if (a.userId && !userMap.has(a.userId)) { // Keep the first record found for a userId
            userMap.set(a.userId, a);
          } else if (a.userId && userMap.has(a.userId)) {
            // Optional: Log if duplicates are found
            // console.warn(`Duplicate attendee found for userId: ${a.userId}`);
          }
        });
        const uniqueAttendees = Array.from(userMap.values());
        // --- End Deduplication ---

        setAttendees(uniqueAttendees);

        // Initialize attendance state based on fetched data
        const initialAttendance: Record<string, boolean> = {};
        uniqueAttendees.forEach((a) => {
          if (a.userId) initialAttendance[a.userId] = a.attending ?? false; // Default to false if undefined
        });
        setOriginalAttendance(initialAttendance);
        setAttendanceChanges(initialAttendance); // Start changes same as original

      } else {
        throw new Error(data.message || "Lỗi định dạng dữ liệu người tham gia");
      }
    } catch (err: any) {
      console.error("Lỗi fetchAttendees:", err);
      setAttendeeError(err.message || "Lỗi không xác định khi tải người tham gia");
      setAttendees([]); // Clear attendees on error
    } finally {
      setIsLoadingAttendees(false);
    }
  }, [selectedEventId]); // Depend only on selectedEventId

  // --- useEffects ---
  useEffect(() => {
    // Fetch events when the component mounts or user changes
    fetchUserApprovedEvents();
  }, [fetchUserApprovedEvents]);

  useEffect(() => {
    // Fetch attendees when an event is selected
    if (selectedEventId) {
      fetchAttendees();
    } else {
      // Clear attendee data if no event is selected
      setAttendees([]);
      setOriginalAttendance({});
      setAttendanceChanges({});
      setSelectedForDelete(new Set());
      setMode("view"); // Reset mode
    }
  }, [selectedEventId, fetchAttendees]);

  // --- Handlers ---
  const handleSelectEvent = (eventId: string) => {
    setSelectedEventId(eventId);
    setMode("view"); // Reset mode when selecting a new event
    // Attendee data will be fetched by the useEffect watching selectedEventId
  };

  const handleBackToEventList = () => {
    setSelectedEventId(null);
    // States will be reset by the useEffect watching selectedEventId
  };

  const handleSetMode = (newMode: "view" | "attendance" | "delete") => {
    setMode(newMode);
    // Reset specific states when changing mode
    setSelectedForDelete(new Set());
    setAttendanceChanges({ ...originalAttendance }); // Reset changes to original
  };

  const handleCancelMode = () => {
    handleSetMode("view"); // Use handleSetMode to reset correctly
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
    if (isChecked) {
      setSelectedForDelete(new Set(attendees.map((att) => att.userId)));
    } else {
      setSelectedForDelete(new Set());
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedEventId || isProcessing) return;

    const changes: { userId: string; status: boolean }[] = [];
    Object.keys(attendanceChanges).forEach((id) => {
      // Check if the value actually changed from the original
      if (attendanceChanges[id] !== originalAttendance[id]) {
        changes.push({ userId: id, status: attendanceChanges[id] });
      }
    });

    if (changes.length === 0) {
      toast("Không có thay đổi để lưu.", { icon: "ℹ️" });
      setMode("view"); // Go back to view mode
      return;
    }

    setIsProcessing(true);
    const loadId = toast.loading(`Đang lưu ${changes.length} thay đổi điểm danh...`);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Token không hợp lệ. Vui lòng đăng nhập lại.", { id: loadId });
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
          let m = `Lỗi lưu điểm danh cho ${userId}`;
          try {
            const d = await res.json(); m = d.message || m;
          } catch (_) {}
          // Return a rejected-like structure for Promise.allSettled
          return { status: "rejected", reason: m, userId };
        }
        // Return a fulfilled-like structure
        return { status: "fulfilled", value: { userId, status } };
      })
      .catch((err) => ({ status: "rejected", reason: err.message, userId })); // Catch network errors
    });

    const results = await Promise.allSettled(promises); // Use allSettled

    let ok = 0, fail = 0;
    const successUpdates: Record<string, boolean> = {};

    results.forEach((r) => {
        // Check if the promise itself fulfilled and the nested status is also 'fulfilled'
        if (r.status === 'fulfilled' && r.value.status === 'fulfilled') {
            ok++;
            successUpdates[r.value.value.userId] = r.value.value.status;
        } else {
            fail++;
            const reason = r.status === 'rejected' ? r.reason : r.value.reason;
            const failedUserId = r.status === 'rejected' ? (r.reason as any)?.userId : r.value.userId; // Try to get userId
            console.error(`Lỗi lưu điểm danh cho UserID ${failedUserId || 'unknown'}:`, reason);
        }
    });


    if (ok > 0) {
      // Update original state only for successful changes
      setOriginalAttendance((prev) => ({ ...prev, ...successUpdates }));
      // Reset changes state to reflect the new original state
      setAttendanceChanges((prev) => ({ ...prev, ...successUpdates }));
      toast.success(`Đã lưu thành công ${ok} thay đổi.`, { id: loadId });
    }
    if (fail > 0) {
       toast.error(`Lưu thất bại ${fail} thay đổi. Xem console để biết chi tiết.`, { id: ok === 0 ? loadId : undefined });
    } else if (ok === 0 && fail === 0){
        // Should not happen if changes.length > 0, but handle anyway
         toast.dismiss(loadId);
    }

    setIsProcessing(false);
    setMode("view"); // Return to view mode after saving
  };

  const executeBatchDelete = async () => {
    const idsToDelete = Array.from(selectedForDelete);
    if (!selectedEventId || idsToDelete.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const loadId = toast.loading(`Đang xóa ${idsToDelete.length} người tham gia...`);
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
              const d = await res.json(); m = d.message || m;
            } catch (_) {}
            return { status: "rejected", reason: m, userId };
          }
          return { status: "fulfilled", value: userId }; // Return userId on success
        })
        .catch((err) => ({ status: "rejected", reason: err.message, userId }));
    });

    const results = await Promise.allSettled(promises);
    let ok = 0, fail = 0;
    const successfullyDeletedIds = new Set<string>();

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.status === 'fulfilled') {
        ok++;
        successfullyDeletedIds.add(r.value.value);
      } else {
        fail++;
        const reason = r.status === 'rejected' ? r.reason : r.value.reason;
        const failedUserId = r.status === 'rejected' ? (r.reason as any)?.userId : r.value.userId;
        console.error(`Lỗi xóa UserID ${failedUserId || 'unknown'}:`, reason);
      }
    });

    if (ok > 0) {
      // Update UI: filter out deleted attendees
      setAttendees((prev) => prev.filter((att) => !successfullyDeletedIds.has(att.userId)));
      // Update original/changes state
      const newAttendance = { ...originalAttendance };
       successfullyDeletedIds.forEach((id) => delete newAttendance[id]);
       setOriginalAttendance(newAttendance);
       setAttendanceChanges(newAttendance); // Reset changes as well
       setSelectedForDelete(new Set()); // Clear selection
      toast.success(`Đã xóa thành công ${ok} người tham gia.`, { id: loadId });
    }
     if (fail > 0) {
         toast.error(`Xóa thất bại ${fail} người. Xem console.`, { id: ok === 0 ? loadId : undefined });
     } else if (ok === 0 && fail === 0) {
         toast.dismiss(loadId);
     }

    setIsProcessing(false);
    setMode("view"); // Back to view mode
  };

  const handleConfirmBatchDelete = () => {
    const ids = Array.from(selectedForDelete);
    if (ids.length === 0) {
      toast.error("Vui lòng chọn ít nhất một người để xóa.");
      return;
    }
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận xóa người tham gia",
      message: (
        <>
          Bạn có chắc chắn muốn xóa{" "}
          <strong className="text-red-600">{ids.length} người</strong> đã chọn
          khỏi sự kiện này không? Hành động này không thể hoàn tác.
        </>
      ),
      onConfirm: () => {
        setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null }); // Close dialog first
        executeBatchDelete(); // Then execute delete
      },
      onCancel: () => setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null }),
      confirmVariant: "danger",
      confirmText: `Xóa (${ids.length})`,
      cancelText: "Hủy",
    });
  };

  // Memoized event name for display
  const selectedEventName = useMemo(
    () => userApprovedEvents.find((event) => event.id === selectedEventId)?.name,
    [userApprovedEvents, selectedEventId]
  );

  // --- Render Logic ---
  return (
    // Removed modal wrapper, renders directly in tab content area
    <div className="flex flex-col h-full"> {/* Use flex-col for structure */}
       {/* Header for the Tab */}
      <h2 className="text-xl md:text-2xl font-bold text-teal-600 mb-4 pb-3 border-b flex-shrink-0">
        Quản lý Người tham gia Sự kiện
      </h2>

       {/* Content Area */}
      <div className="overflow-y-auto flex-grow mb-4 pr-2">
        {!selectedEventId && (
          <>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">
              Vui lòng chọn sự kiện để xem người tham gia
            </h3>
            {isLoadingEvents ? (
              <p className="text-center text-gray-500 italic py-5"> Đang tải danh sách sự kiện...</p>
            ) : eventError ? (
              <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{eventError}</p>
            ) : userApprovedEvents.length === 0 ? (
              <p className="text-center text-gray-500 italic py-5">Bạn không có sự kiện nào đã được duyệt để quản lý.</p>
            ) : (
              <div className="space-y-2">
                {userApprovedEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event.id)}
                    className="w-full text-left p-3 bg-gray-50 cursor-pointer rounded-lg border border-gray-200 hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-teal-300"
                  >
                    <p className="font-semibold text-gray-800">{event.name}</p>
                    {event.time && ( <p className="text-sm text-gray-500 mt-1">📅 {new Date(event.time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</p> )}
                    {event.location && ( <p className="text-sm text-gray-500">📍 {event.location}</p> )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selectedEventId && (
          <>
            {/* Sub-header: Back button and Event Title */}
            <div className="flex justify-between items-center mb-3 flex-wrap gap-2 border-b pb-2">
               <button onClick={handleBackToEventList} className="text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50">
                  <ArrowLeftIcon className="h-4 w-4 mr-1" /> Quay lại danh sách sự kiện
               </button>
               <h3 className="text-base font-semibold text-gray-700 truncate text-right">
                  {selectedEventName || "Đang tải tên sự kiện..."}
               </h3>
            </div>

             {/* Attendee List Area */}
            {isLoadingAttendees ? (
              <p className="text-center text-gray-500 italic py-5"> Đang tải danh sách người tham gia...</p>
            ) : attendeeError ? (
              <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{attendeeError}</p>
            ) : attendees.length === 0 ? (
              <p className="text-center text-gray-500 italic py-5">Sự kiện này chưa có người tham gia nào được ghi nhận.</p>
            ) : (
              <div className="space-y-3">
                {/* Action Bar for Delete/Attendance modes */}
                {mode === "delete" && (
                    <div className="flex items-center justify-between border-b pb-2 mb-2 sticky top-0 bg-white py-1 z-10 px-1">
                       <div className="flex items-center">
                           <input type="checkbox" id={`select-all-delete`} className="mr-2 cursor-pointer h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                               checked={attendees.length > 0 && selectedForDelete.size === attendees.length}
                               onChange={handleSelectAllForDelete} disabled={attendees.length === 0 || isProcessing} />
                           <label htmlFor={`select-all-delete`} className="text-sm text-gray-600 cursor-pointer">Chọn tất cả ({selectedForDelete.size})</label>
                       </div>
                       {/* Delete button moved to footer */}
                    </div>
                )}
                 {mode === "attendance" && (
                    <div className="flex items-center justify-end border-b pb-2 mb-2 sticky top-0 bg-white py-1 z-10 px-1">
                         {/* Save button moved to footer */}
                         <p className="text-sm text-gray-500 italic">Đánh dấu vào ô để xác nhận có mặt.</p>
                    </div>
                 )}

                {/* Attendee Rows */}
                {attendees.map((attendee) => {
                  const isSelectedForDelete = selectedForDelete.has(attendee.userId);
                  const isCheckedForAttendance = attendanceChanges[attendee.userId] ?? false;
                  const isRowProcessing = isProcessing; // Disable row during global processing

                  return (
                    <div key={attendee.userId}
                         className={`flex items-center justify-between bg-gray-50 p-3 rounded-lg border transition-colors ${
                            mode === "delete" && isSelectedForDelete ? "border-red-300 bg-red-50" : "border-gray-200"
                         } ${isRowProcessing ? 'opacity-70' : ''}`} >

                       <div className="flex items-center gap-3 flex-grow mr-2 overflow-hidden">
                          {/* Checkbox based on mode */}
                          {mode === "delete" && (
                             <input type="checkbox" checked={isSelectedForDelete}
                                    onChange={(e) => handleDeleteCheckboxChange( attendee.userId, e.target.checked )}
                                    disabled={isRowProcessing} aria-labelledby={`attendee-name-${attendee.userId}`}
                                    className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer flex-shrink-0 disabled:opacity-50"/>
                          )}
                          {mode === "attendance" && (
                             <input type="checkbox" checked={isCheckedForAttendance}
                                    onChange={(e) => handleAttendanceCheckboxChange( attendee.userId, e.target.checked )}
                                    disabled={isRowProcessing} aria-labelledby={`attendee-name-${attendee.userId}`}
                                    className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer flex-shrink-0 disabled:opacity-50"/>
                          )}

                          {/* Attendee Info */}
                          <div className="flex-grow overflow-hidden">
                             <p id={`attendee-name-${attendee.userId}`}
                                className={`font-semibold text-sm truncate ${mode === "delete" && isSelectedForDelete ? "text-red-800" : "text-gray-800"}`} >
                                {getAttendeeName(attendee)}
                             </p>
                             <div className="flex flex-wrap gap-x-3 text-xs text-gray-500 mt-0.5">
                                {attendee.studentCode && (<span className="text-blue-600">MSSV: {attendee.studentCode}</span>)}
                                {attendee.username && (<span>@{attendee.username}</span>)}
                                {attendee.roleName && (<span className="italic">({attendee.roleName})</span>)}
                                {attendee.positionName && (<span className="font-medium">[{attendee.positionName}]</span>)}
                             </div>
                          </div>
                       </div>

                        {/* Status/Indicator based on mode */}
                       {mode === "view" && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                             originalAttendance[attendee.userId] ?? false ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                          }`} >
                             {originalAttendance[attendee.userId] ?? false ? "Có mặt" : "Vắng"}
                          </span>
                       )}
                       {mode === "attendance" && (
                          <span className={`flex-shrink-0 p-1 rounded-full ${
                             isCheckedForAttendance ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          }`} >
                             {isCheckedForAttendance ? <CheckIcon className="w-4 h-4" /> : <Cross2Icon className="w-4 h-4" />}
                          </span>
                       )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Buttons - Only show if an event is selected */}
       {selectedEventId && !isLoadingAttendees && attendees.length > 0 && (
          <div className="flex justify-between items-center border-t pt-4 flex-shrink-0 gap-3">
             {/* Left Aligned Buttons (Mode Actions) */}
              <div>
                  {mode === "view" && (
                      <div className="flex gap-2">
                          <button onClick={() => handleSetMode("attendance")} disabled={isProcessing}
                                  className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-800 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1">
                              <CheckIcon /> Điểm danh
                          </button>
                          <button onClick={() => handleSetMode("delete")} disabled={isProcessing}
                                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 inline-flex items-center gap-1">
                               <TrashIcon /> Xóa người
                           </button>
                      </div>
                  )}
                   {mode === "attendance" && (
                       <div className="flex gap-2">
                            <button onClick={handleCancelMode} disabled={isProcessing}
                                     className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50">
                                 Hủy
                             </button>
                            <button onClick={handleSaveChanges} disabled={isProcessing}
                                    className={`px-4 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium cursor-pointer ${
                                       isProcessing ? "bg-blue-300 cursor-wait" : "bg-blue-600 hover:bg-blue-700"
                                    }`}>
                                 {isProcessing ? "Đang lưu..." : "Lưu điểm danh"}
                             </button>
                       </div>
                   )}
                   {mode === "delete" && (
                       <div className="flex gap-2">
                           <button onClick={handleCancelMode} disabled={isProcessing}
                                   className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50">
                                Hủy
                           </button>
                            <button onClick={handleConfirmBatchDelete} disabled={isProcessing || selectedForDelete.size === 0}
                                    className={`px-4 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium cursor-pointer inline-flex items-center gap-1 ${
                                        isProcessing || selectedForDelete.size === 0 ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                                    }`}>
                               <TrashIcon /> Xóa ({selectedForDelete.size}) đã chọn
                           </button>
                       </div>
                   )}
              </div>

              {/* Right Aligned Close Button (Maybe not needed if closing is handled by UserHome?) */}
              {/* <button onClick={onClose} className="...">Đóng</button> */}
          </div>
       )}


       {/* Confirmation Dialog Render */}
      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmVariant={confirmationState.confirmVariant}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={confirmationState.onConfirm || (() => {})} // Provide default empty func
        onCancel={() => setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null })}
      />
    </div>
  );
};

export default AttendeesTabContent; // Ensure default export