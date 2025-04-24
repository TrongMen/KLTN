"use client";

import { toast } from "react-hot-toast";
import React, { useState, useCallback } from "react";


type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  role?: string;
};
type EventMember = {
  userId: string;
  roleId?: string;
  positionId?: string;
  roleName?: string;
  positionName?: string;
};
type Event = {
  id: string;
  name: string;
  time: string;
  location: string;
  createdBy: string;
  purpose: string;
  content: string;
  image?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  organizers: EventMember[];
  participants: EventMember[];
  permissions: string[];
  attendees?: any[];
  rejectionReason?: string | null;
  createdAt?: string;
};
type Props = {
  events: Event[];
  setEvents: (events: Event[]) => void;
  users: ApiUser[];
  currentUser?: ApiUser;
  setEditingEvent: (event: Event | null) => void;
};


const getUserFullName = (userId: string, allUsers: ApiUser[]): string => {
  if (!allUsers || allUsers.length === 0) return `(Loading...)`;
  const userFound = allUsers.find((u) => u.id === userId);
  if (!userFound) return `(ID: ${userId ? userId.substring(0, 8) : "?"}...)`;
  const fullName = `${userFound.lastName || ""} ${
    userFound.firstName || ""
  }`.trim();
  return fullName || userFound.username || `(ID: ${userId.substring(0, 8)}...)`;
};
const getMemberNames = (
  members: EventMember[] | undefined | null,
  allUsers: ApiUser[]
): string => {
  if (!allUsers || allUsers.length === 0) return "Đang tải...";
  if (!members || members.length === 0) return "Chưa có";
  const names = members
    .map((m) => getUserFullName(m.userId, allUsers))
    .filter((n) => n && !n.startsWith("(ID:") && !n.startsWith("(Loading"));
  const MAX_NAMES = 2;
  if (names.length === 0) {
    return members.length > 0 ? "Không tìm thấy tên" : "Chưa có";
  }
  if (names.length > MAX_NAMES) {
    return `${names.slice(0, MAX_NAMES).join(", ")} và ${
      members.length - MAX_NAMES
    } người khác`;
  }
  return names.join(", ");
};


type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
};

function ConfirmDialog({

  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
}: ConfirmDialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
        <div className="text-gray-700 mb-6">{message}</div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer "
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventList({
  events,
  setEvents,
  users,
  currentUser,
  setEditingEvent,
}: Props) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  const handleDeleteClick = useCallback((event: Event) => {
    setEventToDelete(event);
    setIsConfirmOpen(true);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setIsConfirmOpen(false);
    setEventToDelete(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!eventToDelete) return;
    const eventId = eventToDelete.id;
    const eventName = eventToDelete.name;
    closeConfirmDialog();

    const loadingToastId = toast.loading("Đang xóa sự kiện...");
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `http://localhost:8080/identity/api/events/${eventId}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!response.ok) {
        let msg = "Xóa thất bại";
        try {
          const d = await response.json();
          msg = d.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      toast.success(`Đã xóa "${eventName}".`, { id: loadingToastId });
    } catch (error: any) {
      toast.error(error.message || "Lỗi xóa", { id: loadingToastId });
      console.error("Delete err:", error);
    }
  }, [eventToDelete, setEvents, closeConfirmDialog]);

  const handleApproveEvent = async (eventId: string, approved: boolean) => {
    const status = approved ? "APPROVED" : "REJECTED";
    const action = approved ? "duyệt" : "từ chối";
    const loadId = toast.loading(`Đang ${action}...`);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Token không lệ");
      const res = await fetch(
        `http://localhost:8080/identity/api/events/${eventId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        let msg = `Lỗi ${action}`;
        try {
          const d = await res.json();
          msg = d.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, status } : e))
      );
      toast.success(`Đã ${action} thành công!`, { id: loadId });
    } catch (err: any) {
      toast.error(err.message || `Lỗi ${action}`, { id: loadId });
      console.error("Approve err:", err);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        📅 Danh sách Sự kiện ({events?.length ?? 0})
      </h2>
      {!events || events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-2">Chưa có sự kiện.</p>
          <p className="text-gray-400 text-sm">
            Thêm sự kiện bằng form ở trên.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <article
              key={event.id}
              className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
            >
              <div className="p-4 flex-grow flex flex-col justify-between">
                {/* Phần hiển thị thông tin sự kiện giữ nguyên */}
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 flex-1 mr-2">
                      {event.name}
                    </h3>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${
                        event.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : event.status === "REJECTED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {event.status === "APPROVED"
                        ? "Đã duyệt"
                        : event.status === "REJECTED"
                        ? "Đã từ chối"
                        : "Chờ duyệt"}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <p className="flex items-center">
                      <span className="mr-2 w-4 text-center">🗓</span>
                      {event.time
                        ? new Date(event.time).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}
                    </p>
                    <p className="flex items-center">
                      <span className="mr-2 w-4 text-center">📍</span>
                      {event.location || "N/A"}
                    </p>
                    <p
                      className="flex items-center"
                      title={getMemberNames(event.organizers, users)}
                    >
                      <span className="mr-2 w-4 text-center">👥</span>
                      <span className="truncate">
                        BTC: {getMemberNames(event.organizers, users)}
                      </span>
                    </p>
                    <p
                      className="flex items-center"
                      title={getMemberNames(event.participants, users)}
                    >
                      <span className="mr-2 w-4 text-center">👤</span>
                      <span className="truncate">
                        Tham dự: {getMemberNames(event.participants, users)}
                      </span>
                    </p>
                    <p className="flex items-center">
                      <span className="mr-2 w-4 text-center">🔒</span>Quyền:{" "}
                      {event.permissions?.join(", ") || "N/A"}
                    </p>
                  </div>
                  <p
                    className="text-gray-700 text-sm mb-2 line-clamp-2"
                    title={event.purpose}
                  >
                    <span className="font-medium">Mục đích:</span>
                    {event.purpose}
                  </p>
                  <p
                    className="text-gray-700 text-sm mb-4 line-clamp-3"
                    title={event.content}
                  >
                    <span className="font-medium">Nội dung:</span>
                    {event.content}
                  </p>
                </div>
                {/* Phần nút bấm */}
                <div className="flex justify-between items-center gap-2 pt-2 border-t border-gray-100 mt-auto">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="flex-1 cursor-pointer py-1 bg-blue-50 text-blue-600 text-sm rounded hover:bg-blue-100 transition-colors"
                  >
                    Sửa
                  </button>
                  {currentUser?.role === "ADMIN" &&
                    event.status === "PENDING" && (
                      <>
                        {" "}
                        <button
                          onClick={() => handleApproveEvent(event.id, true)}
                          className="flex-1 py-1 bg-green-50 text-green-600 text-sm rounded hover:bg-green-100 transition-colors"
                        >
                          Duyệt
                        </button>{" "}
                        <button
                          onClick={() => handleApproveEvent(event.id, false)}
                          className="flex-1 py-1 bg-orange-50 text-orange-600 text-sm rounded hover:bg-orange-100 transition-colors"
                        >
                          Từ chối
                        </button>{" "}
                      </>
                    )}
                  
                  <button
                    onClick={() => handleDeleteClick(event)}
                    className="flex-1 cursor-pointer py-1 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDelete}
        title="Xác nhận xóa sự kiện"
        message={
          <>
            Bạn có chắc chắn muốn xóa sự kiện{" "}
            <span className="font-semibold">"{eventToDelete?.name ?? ""}"</span>
            ?
            <br />
            Hành động này không thể hoàn tác.
          </>
        }
        confirmText="Xóa"
      />
    </section>
  );
}
