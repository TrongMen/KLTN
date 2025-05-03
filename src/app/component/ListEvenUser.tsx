"use client";

import { toast } from "react-hot-toast";
import React, { useState, useCallback, useEffect,useRef } from "react";
import Image from "next/image";

export type ApiUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email?: string;
  role?: string;
};

export type EventMember = {
  userId: string;
  roleId?: string;
  positionId?: string;
  roleName?: string;
  positionName?: string;
};

export type Event = {
  id: string;
  name: string;
  purpose: string;
  time: string;
  location: string;
  content: string;
  createdBy?: string;
  organizers: EventMember[];
  participants: EventMember[];
  permissions: string[];
  status?: "PENDING" | "APPROVED" | "REJECTED";
  image?: string;
  attendees?: any[];
  rejectionReason?: string | null;
  createdAt?: string;
};

interface EventListProps {
  events: Event[];
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  users: ApiUser[];
  currentUser?: ApiUser;
  setEditingEvent: (event: Event | null) => void;
  refreshEvents: () => Promise<void>;
}

const getUserFullName = (
  userId: string | undefined,
  allUsers: ApiUser[]
): string => {
  if (!userId) return "(Không xác định)";
  if (!allUsers || allUsers.length === 0) return `(Loading...)`;
  const userFound = allUsers.find((u) => u.id === userId);
  if (!userFound) return `(ID: ${userId.substring(0, 8)}...)`;
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
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
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
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const EventList: React.FC<EventListProps> = ({
  events,
  setEvents,
  users,
  currentUser,
  setEditingEvent,
  refreshEvents,
}) => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [viewingEventDetails, setViewingEventDetails] = useState<Event | null>(
    null
  );
  const [qrCodeLink, setQrCodeLink] = useState<string | null>(null);
  const [qrCodeImageSrc, setQrCodeImageSrc] = useState<string | null>(null);
  const [isLoadingQrLink, setIsLoadingQrLink] = useState<boolean>(false);
  const [isLoadingQrImage, setIsLoadingQrImage] = useState<boolean>(false);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null); // Ref để lưu blob URL hiện tại

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
    if (!currentUser?.id) {
      toast.error("Không thể xác định người dùng hiện tại để thực hiện xóa.");
      closeConfirmDialog();
      return;
    }
    const deletedById = currentUser.id;
    const eventId = eventToDelete.id;
    const eventName = eventToDelete.name;
    closeConfirmDialog();

    const loadingToastId = toast.loading("Đang xóa sự kiện...");
    try {
      const token = localStorage.getItem("authToken");
      const url = `http://localhost:8080/identity/api/events/${eventId}?deletedById=${deletedById}`;
      console.log("API Delete URL:", url);

      const response = await fetch(url, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        let msg = "Xóa thất bại";
        try {
          const d = await response.json();
          msg = d?.message || msg;
          console.error("Server Error on Delete:", d);
        } catch (_) {
          const text = await response.text().catch(() => "");
          console.error("Server Error Text on Delete:", text);
          msg = `${msg} (${response.status})`;
        }
        throw new Error(msg);
      }

      const result = await response.json();
      if (result.code === 1000) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
        toast.success(result.message || `Đã xóa "${eventName}".`, {
          id: loadingToastId,
        });
      } else {
        console.error("Delete API returned non-1000 code:", result);
        throw new Error(
          result.message || "Xóa thành công nhưng có lỗi phản hồi từ server."
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi xóa", { id: loadingToastId });
      console.error("Delete err:", error);
    }
  }, [
    eventToDelete,
    setEvents,
    closeConfirmDialog,
    currentUser,
    refreshEvents,
  ]);

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
        let msg = `Lỗi ${action} (${res.status})`;
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
      console.error("Approve/Reject err:", err);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
  };

  const fetchQrCodeLink = useCallback(async (eventId: string) => {
    setIsLoadingQrLink(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
       setQrCodeError("Vui lòng đăng nhập để lấy link QR.");
       setIsLoadingQrLink(false);
       return;
    }
    try {
        const response = await fetch(
            `http://localhost:8080/identity/api/events/${eventId}/qr-code`, // API lấy link
            {
                method: "GET", // Method là GET
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Lỗi lấy link QR: ${response.status}`);
        }
        const result = await response.json();
        if (result.code === 1000 && result.result) {
            setQrCodeLink(result.result);
             // Nếu chưa có ảnh từ blob, dùng link này làm src ảnh luôn
            if (!qrCodeImageSrc) {
                setQrCodeImageSrc(result.result);
            }
        } else {
            throw new Error(result.message || "Không thể lấy link QR.");
        }
    } catch (error: any) {
        console.error("Error fetching QR code link:", error);
        setQrCodeError(error.message || "Lỗi khi lấy link QR.");
    } finally {
       setIsLoadingQrLink(false);
    }
 }, [qrCodeImageSrc]); // Phụ thuộc qrCodeImageSrc để quyết định có set src ảnh không

  const fetchQrCodeImage = useCallback(async (eventId: string) => {
    setIsLoadingQrImage(true);
    const token = localStorage.getItem("authToken");
     if (!token) {
       setQrCodeError("Vui lòng đăng nhập để lấy ảnh QR.");
       setIsLoadingQrImage(false);
       return;
    }
    try {
        const response = await fetch(
            `http://localhost:8080/identity/api/events/${eventId}/qr-code-image`, // API lấy ảnh
            {
                method: "GET", // Method là GET
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (!response.ok) {
             const errorText = await response.text().catch(()=>`Lỗi ${response.status}`);
             throw new Error(`Lỗi lấy ảnh QR: ${errorText}`);
        }
        const blob = await response.blob();
        if (blob.size === 0 || !blob.type.startsWith('image/')) {
             throw new Error("Dữ liệu ảnh QR không hợp lệ.");
        }
        // Thu hồi blob URL cũ trước khi tạo mới
        if (currentBlobUrlRef.current) {
            URL.revokeObjectURL(currentBlobUrlRef.current);
        }
        const newBlobUrl = URL.createObjectURL(blob);
        setQrCodeImageSrc(newBlobUrl); // Ưu tiên hiển thị ảnh từ blob
        currentBlobUrlRef.current = newBlobUrl; // Lưu lại để thu hồi sau

    } catch (error: any) {
        console.error("Error fetching QR code image:", error);
        // Chỉ set lỗi nếu chưa có lỗi từ việc fetch link
        if(!qrCodeError) setQrCodeError(error.message || "Lỗi khi lấy ảnh QR.");
        // Nếu fetch link thành công trước đó, giữ lại link làm fallback
        if (!qrCodeLink) setQrCodeImageSrc(null);
        else setQrCodeImageSrc(qrCodeLink);

    } finally {
        setIsLoadingQrImage(false);
    }
  }, [qrCodeError, qrCodeLink]); // Phụ thuộc qrCodeError và qrCodeLink

  // Thu hồi Blob URL khi component unmount hoặc khi đổi ảnh
  useEffect(() => {
    const blobUrl = currentBlobUrlRef.current;
    return () => {
        if (blobUrl) {
            console.log("Revoking Blob URL:", blobUrl);
            URL.revokeObjectURL(blobUrl);
            currentBlobUrlRef.current = null;
        }
    };
  }, [qrCodeImageSrc]); // Chạy cleanup khi qrCodeImageSrc thay đổi

  const handleViewDetails = useCallback(
    (event: Event) => {
      setViewingEventDetails(event);
      setQrCodeLink(null);
      setQrCodeImageSrc(null); // Reset cả src ảnh
      setIsLoadingQrLink(false); // Reset loading states
      setIsLoadingQrImage(false);
      setQrCodeError(null);

      if (event.status === "APPROVED") {
        fetchQrCodeLink(event.id); // Gọi API lấy link
        fetchQrCodeImage(event.id); // Gọi API lấy ảnh
      } else {
        setQrCodeError("Chỉ có thể xem QR cho sự kiện đã được duyệt.");
      }
    },
    [fetchQrCodeLink, fetchQrCodeImage]
  );

 const handleBackToList = useCallback(() => {
    // Thu hồi blob URL nếu có trước khi đóng modal
    if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
    }
    setViewingEventDetails(null);
    setQrCodeLink(null);
    setQrCodeImageSrc(null);
    setIsLoadingQrLink(false);
    setIsLoadingQrImage(false);
    setQrCodeError(null);
  }, []);

  const renderStatusBadge = (status?: string) => {
    const s = status?.toUpperCase();
    let bgColor = "bg-gray-100";
    let textColor = "text-gray-700";
    let text = status || "Không rõ";

    if (s === "APPROVED") {
      bgColor = "bg-green-100";
      textColor = "text-green-700";
      text = "Đã duyệt";
    } else if (s === "PENDING") {
      bgColor = "bg-yellow-100";
      textColor = "text-yellow-700";
      text = "Chờ duyệt";
    } else if (s === "REJECTED") {
      bgColor = "bg-red-100";
      textColor = "text-red-700";
      text = "Từ chối";
    }
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${bgColor} ${textColor}`}
      >
        {text}
      </span>
    );
  };

  const renderEventDetailsModal = () => {
    if (!viewingEventDetails) return null;

    const isLoading = isLoadingQrLink || isLoadingQrImage;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-800">
              {viewingEventDetails.name}
            </h3>
            <button
              onClick={handleBackToList}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              &times;
            </button>
          </div>
          <div className="p-5 overflow-y-auto space-y-3 text-sm">
            <p>
              <strong className="font-medium text-gray-700 w-24 inline-block">
                Trạng thái:
              </strong>{" "}
              {renderStatusBadge(viewingEventDetails.status)}
            </p>
            {viewingEventDetails.status === "REJECTED" &&
              viewingEventDetails.rejectionReason && (
                <p className="text-red-600">
                  <strong className="font-medium text-red-800 w-24 inline-block">
                    Lý do từ chối:
                  </strong>{" "}
                  {viewingEventDetails.rejectionReason}
                </p>
              )}
            <p>
              <strong className="font-medium text-gray-700 w-24 inline-block">
                Thời gian:
              </strong>{" "}
              {viewingEventDetails.time
                ? new Date(viewingEventDetails.time).toLocaleString("vi-VN")
                : "N/A"}
            </p>
            <p>
              <strong className="font-medium text-gray-700 w-24 inline-block">
                Địa điểm:
              </strong>{" "}
              {viewingEventDetails.location || "N/A"}
            </p>
            <p>
              <strong className="font-medium text-gray-700 w-24 inline-block">
                Mục đích:
              </strong>{" "}
              {viewingEventDetails.purpose || "N/A"}
            </p>
            <p>
              <strong className="font-medium text-gray-700 w-24 inline-block align-top">
                Nội dung:
              </strong>{" "}
              <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-6rem)]">
                {viewingEventDetails.content || "N/A"}
              </span>
            </p>
            <p>
              <strong className="font-medium text-gray-700 w-24 inline-block">
                Đối tượng:
              </strong>{" "}
              {(viewingEventDetails.permissions || []).join(", ") || "N/A"}
            </p>
            <p>
              <strong className="font-medium text-gray-700 w-24 inline-block">
                Người tạo:
              </strong>{" "}
              {getUserFullName(viewingEventDetails.createdBy, users)}
            </p>
            <div>
              <strong className="font-medium text-gray-700 mb-1 block">
                Ban tổ chức:
              </strong>
              {viewingEventDetails.organizers &&
              viewingEventDetails.organizers.length > 0 ? (
                <ul className="list-disc list-inside pl-4 text-gray-600">
                  {viewingEventDetails.organizers.map((org) => (
                    <li key={org.userId}>
                      {getUserFullName(org.userId, users)}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-gray-500 italic">Không có</span>
              )}
            </div>
            <div>
              <strong className="font-medium text-gray-700 mb-1 block">
                Người tham gia (vai trò):
              </strong>
              {viewingEventDetails.participants &&
              viewingEventDetails.participants.length > 0 ? (
                <ul className="list-disc list-inside pl-4 text-gray-600">
                  {viewingEventDetails.participants.map((p) => (
                    <li key={p.userId}>
                      {getUserFullName(p.userId, users)}
                      {p.roleName && ` - ${p.roleName}`}
                      {p.positionName && ` (${p.positionName})`}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-gray-500 italic">Không có</span>
              )}
            </div>

            {viewingEventDetails.status === "APPROVED" && (
              <div className="mt-4 pt-4 border-t text-center">
                <h4 className="text-md font-semibold mb-2 text-gray-700">
                  Mã QR Sự kiện
                </h4>
                {isLoading && (
                  <p className="text-gray-500 italic">Đang tải mã QR...</p>
                )}
                {qrCodeError && !isLoading && (
                  <p className="text-red-500 italic">{qrCodeError}</p>
                )}
                {!isLoading && !qrCodeError && (qrCodeImageSrc || qrCodeLink) && (
                  <div className="flex flex-col items-center gap-3">
                    {qrCodeImageSrc && (
                         <Image
                            src={qrCodeImageSrc}
                            alt={`Mã QR cho sự kiện ${viewingEventDetails.name}`}
                            className="w-40 h-40 object-contain border p-1 bg-white shadow-sm"
                            width={160}
                            height={160}
                            priority
                          />
                    )}
                     {qrCodeLink && (
                         <a
                             href={qrCodeLink}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-blue-600 hover:text-blue-800 text-xs underline break-all"
                          >
                              {qrCodeLink}
                         </a>
                     )}
                     {!qrCodeImageSrc && !qrCodeLink && (
                         <p className="text-gray-500 italic">Không thể tải mã QR.</p>
                     )}
                  </div>
                )}
              </div>
            )}
            {viewingEventDetails.status !== "APPROVED" && qrCodeError && (
                 <div className="mt-4 pt-4 border-t text-center">
                     <h4 className="text-md font-semibold mb-2 text-gray-700">
                        Mã QR Sự kiện
                     </h4>
                     <p className="text-red-500 italic">{qrCodeError}</p>
                 </div>
             )}
          </div>
          <div className="p-4 border-t flex justify-end">
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer text-sm"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        📅 Danh sách Sự kiện ({events?.length ?? 0})
      </h2>
      {!events || events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border">
          <p className="text-gray-500 mb-2">Chưa có sự kiện nào được tạo.</p>
          <p className="text-gray-400 text-sm">
            Sử dụng form ở trên để thêm sự kiện mới.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <article
              key={event.id}
              className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col border border-gray-200 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="p-4 flex-grow flex flex-col justify-between">
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
                      {" "}
                      <span className="mr-2 w-4 text-center">🗓</span>{" "}
                      {event.time
                        ? new Date(event.time).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "N/A"}{" "}
                    </p>
                    <p className="flex items-center">
                      {" "}
                      <span className="mr-2 w-4 text-center">📍</span>{" "}
                      {event.location || "N/A"}{" "}
                    </p>
                    <p
                      className="flex items-center"
                      title={getMemberNames(event.organizers, users)}
                    >
                      {" "}
                      <span className="mr-2 w-4 text-center">👥</span>{" "}
                      <span className="truncate">
                        BTC: {getMemberNames(event.organizers, users)}
                      </span>{" "}
                    </p>
                    <p
                      className="flex items-center"
                      title={getMemberNames(event.participants, users)}
                    >
                      {" "}
                      <span className="mr-2 w-4 text-center">👤</span>{" "}
                      <span className="truncate">
                        Tham dự: {getMemberNames(event.participants, users)}
                      </span>{" "}
                    </p>
                    <p className="flex items-center">
                      {" "}
                      <span className="mr-2 w-4 text-center">🎯</span>{" "}
                      <span
                        className="truncate"
                        title={event.permissions?.join(", ") || "N/A"}
                      >
                        Đối tượng: {event.permissions?.join(", ") || "N/A"}
                      </span>{" "}
                    </p>
                    {event.rejectionReason && event.status === "REJECTED" && (
                      <p className="flex items-start text-red-600">
                        {" "}
                        <span className="mr-2 w-4 text-center pt-0.5">
                          ⚠️
                        </span>{" "}
                        <span className="flex-1">
                          Lý do từ chối: {event.rejectionReason}
                        </span>{" "}
                      </p>
                    )}
                  </div>
                  <p
                    className="text-gray-700 text-sm mb-2 line-clamp-2"
                    title={event.purpose}
                  >
                    {" "}
                    <span className="font-medium">Mục đích:</span>{" "}
                    {event.purpose}{" "}
                  </p>
                  <p
                    className="text-gray-700 text-sm mb-4 line-clamp-3"
                    title={event.content}
                  >
                    {" "}
                    <span className="font-medium">Nội dung:</span>{" "}
                    {event.content}{" "}
                  </p>
                </div>
                <div className="flex justify-between items-center gap-2 pt-3 border-t border-gray-100 mt-auto">
                  <button
                    onClick={() => handleViewDetails(event)}
                    title="Xem chi tiết"
                    className="flex-1 text-center py-1 bg-gray-50 text-gray-600 text-sm rounded hover:bg-gray-100 transition-colors"
                  >
                    👁️ Chi tiết
                  </button>
                  {(currentUser?.id === event.createdBy ||
                    currentUser?.role === "ADMIN") && (
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="flex-1 text-center cursor-pointer py-1 bg-blue-50 text-blue-600 text-sm rounded hover:bg-blue-100 transition-colors"
                    >
                      {" "}
                      Sửa{" "}
                    </button>
                  )}
                  {currentUser?.role === "ADMIN" &&
                    event.status === "PENDING" && (
                      <>
                        {" "}
                        <button
                          onClick={() => handleApproveEvent(event.id, true)}
                          className="flex-1 text-center py-1 bg-green-50 text-green-600 text-sm rounded hover:bg-green-100 transition-colors"
                        >
                          {" "}
                          Duyệt{" "}
                        </button>{" "}
                        <button
                          onClick={() => handleApproveEvent(event.id, false)}
                          className="flex-1 text-center py-1 bg-orange-50 text-orange-600 text-sm rounded hover:bg-orange-100 transition-colors"
                        >
                          {" "}
                          Từ chối{" "}
                        </button>{" "}
                      </>
                    )}
                  {(currentUser?.id === event.createdBy ||
                    currentUser?.role === "ADMIN") && (
                    <button
                      onClick={() => handleDeleteClick(event)}
                      className="flex-1 text-center cursor-pointer py-1 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100 transition-colors"
                    >
                      {" "}
                      Xóa{" "}
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {renderEventDetailsModal()}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDelete}
        title="Xác nhận xóa sự kiện"
        message={
          <>
            {" "}
            Bạn có chắc chắn muốn xóa sự kiện{" "}
            <span className="font-semibold">"{eventToDelete?.name ?? ""}"</span>
            ? <br /> Hành động này sẽ đánh dấu sự kiện là đã xóa và không thể
            hoàn tác trực tiếp.{" "}
          </>
        }
        confirmText="Xác nhận Xóa"
      />
    </section>
  );
};

export default EventList;