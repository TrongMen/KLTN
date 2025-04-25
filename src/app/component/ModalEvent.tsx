"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link"; // Giữ lại nếu nút "Tạo sự kiện" được sử dụng
import { toast, Toaster } from "react-hot-toast"; // Đảm bảo đã import Toaster

// --- Types ---
interface EventType {
  id: string;
  name: string;
  time?: string;
  location?: string;
  content?: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  rejectionReason?: string;
  purpose?: string;
  createdBy?: string;
  createdAt?: string;
  organizers?: any[];
  participants?: any[];
  attendees?: any[];
  permissions?: string[];
}

// --- Helper Function ---
const getFilenameFromHeader = (header: string | null): string => {
  const defaultFilename = "event_export.docx"; // Tên mặc định .docx
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
    // Đảm bảo file luôn có đuôi .docx
    if (!filename.toLowerCase().endsWith(".docx")) {
      const nameWithoutExt = filename.includes(".")
        ? filename.substring(0, filename.lastIndexOf("."))
        : filename;
      filename = nameWithoutExt + ".docx";
    }
    return filename;
  }
  return defaultFilename;
};

export default function ModalEvent({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"approved" | "pending" | "rejected">(
    "approved"
  );
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [viewingEventDetails, setViewingEventDetails] =
    useState<EventType | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Chưa đăng nhập.");
      const userInfoRes = await fetch(
        "http://localhost:8080/identity/users/myInfo",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!userInfoRes.ok) {
        const d = await userInfoRes.json().catch(() => {});
        throw new Error(d?.message || "Lỗi lấy info user");
      }
      const userInfo = await userInfoRes.json();
      const userId = userInfo?.result?.id;
      if (!userId) throw new Error("Không tìm thấy ID user");
      const eventsRes = await fetch(
        `http://localhost:8080/identity/api/events/creator/${userId}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!eventsRes.ok) {
        const d = await eventsRes.json().catch(() => {});
        throw new Error(d?.message || "Lỗi tải sự kiện");
      }
      const data = await eventsRes.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setEvents(data.result);
      } else {
        setEvents([]);
        console.warn("API /creator/ không trả về mảng event:", data);
      }
    } catch (err: any) {
      console.error("Lỗi tải sự kiện:", err);
      setError(err.message || "Lỗi tải sự kiện");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(
    () =>
      events.filter((event) => {
        const s = event.status?.toUpperCase();
        if (tab === "approved") return s === "APPROVED";
        if (tab === "pending") return s === "PENDING";
        if (tab === "rejected") return s === "REJECTED";
        return false;
      }),
    [events, tab]
  );

  // --- Hàm xử lý xuất file WORD (Thêm header Accept) ---
  const handleExportClick = async (eventId: string | undefined) => {
    if (!eventId) {
      toast.error("Không tìm thấy ID sự kiện.");
      return;
    }
    setIsExporting(true);
    const exportToastId = toast.loading("Đang chuẩn bị file Word...");
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Token không hợp lệ.");
      const url = `http://localhost:8080/identity/api/events/${eventId}/export`;

      // *** THÊM HEADER ACCEPT ***
      const response = await fetch(url, {
        method: "GET", // GET là mặc định nhưng ghi rõ cũng tốt
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Yêu cầu định dạng Word
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
      const filename = getFilenameFromHeader(contentDisposition); // Đã sửa helper

      const blob = await response.blob();
      // Kiểm tra MIME Type từ response để chắc chắn hơn (optional)
      const actualMimeType = response.headers
        .get("content-type")
        ?.split(";")[0]; // Lấy phần chính của content-type
      if (
        actualMimeType !==
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        console.warn(
          `API trả về Content-Type không khớp: ${actualMimeType} (mong đợi DOCX)`
        );
        // Có thể hiển thị cảnh báo cho người dùng nếu muốn
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Đã bắt đầu tải file Word!", { id: exportToastId });
    } catch (err: any) {
      console.error("Lỗi xuất file Word:", err);
      toast.error(err.message || "Xuất file thất bại.", { id: exportToastId });
    } finally {
      setIsExporting(false);
    }
  };

  // --- Component render chi tiết sự kiện (Đã thêm nút Export) ---
  const renderEventDetails = (event: EventType) => {
    return (
      <div className="p-1 flex-grow overflow-y-auto mb-4 pr-2">
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
        <h3 className="text-xl font-bold text-gray-800 mb-4">{event.name}</h3>
        <div className="space-y-2 text-sm text-gray-700">
          
          {event.status && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Trạng thái:
              </strong>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                  event.status === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : event.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-700"
                    : event.status === "REJECTED"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {event.status}
              </span>
            </p>
          )}
          {event.time && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
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
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Địa điểm:
              </strong>{" "}
              {event.location}
            </p>
          )}
          {event.purpose && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Mục đích:
              </strong>{" "}
              {event.purpose}
            </p>
          )}
          {event.content && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block align-top">
                Nội dung:
              </strong>{" "}
              <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-7rem)]">
                {event.content}
              </span>
            </p>
          )}
          {event.status === "REJECTED" && event.rejectionReason && (
            <p className="text-red-600">
              <strong className="font-medium text-red-800 w-28 inline-block">
                Lý do từ chối:
              </strong>{" "}
              {event.rejectionReason}
            </p>
          )}
          {event.createdAt && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Ngày tạo:
              </strong>{" "}
              {new Date(event.createdAt).toLocaleString("vi-VN", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>

        
        {event.status === "APPROVED" && (
          <div className="mt-6 pt-4 border-t flex justify-end">
            <button
              onClick={() => handleExportClick(event.id)}
              disabled={isExporting}
              className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center ${
                isExporting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 mr-2 ${isExporting ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {isExporting ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                )}
              </svg>
              {isExporting ? "Đang xuất..." : "Xuất file Word"}
            </button>
          </div>
        )}
      </div>
    );
  };

  // --- JSX Return chính ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-5 md:p-6 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-blue-600">
            {" "}
            {viewingEventDetails ? "Chi tiết sự kiện" : "Sự kiện của tôi"}{" "}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl font-bold cursor-pointer"
            title="Đóng"
          >
            {" "}
            &times;{" "}
          </button>
        </div>

        {viewingEventDetails ? (
          renderEventDetails(viewingEventDetails)
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-4 border-b flex-shrink-0">
              <button
                onClick={() => setTab("approved")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
                  tab === "approved"
                    ? "border-b-2 border-green-500 text-green-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                ✅ Đã duyệt
              </button>
              <button
                onClick={() => setTab("pending")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
                  tab === "pending"
                    ? "border-b-2 border-yellow-500 text-yellow-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                ⏳ Chờ duyệt
              </button>
              <button
                onClick={() => setTab("rejected")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
                  tab === "rejected"
                    ? "border-b-2 border-red-500 text-red-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                ❌ Từ chối
              </button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-grow mb-6 pr-2">
              {/* ... JSX hiển thị danh sách event ... */}
              {loading ? (
                <p className="text-gray-500 italic text-center py-4">
                  Đang tải...
                </p>
              ) : error ? (
                <p className="text-red-500 italic text-center py-4">{error}</p>
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 md:p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 space-y-1 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setViewingEventDetails(event)}
                  >
                    {" "}
                    <h3 className="font-semibold text-md md:text-lg text-gray-800">
                      {event.name}
                    </h3>{" "}
                    {event.time && (
                      <p className="text-gray-600 text-sm">
                        📅{" "}
                        {new Date(event.time).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}{" "}
                    {event.location && (
                      <p className="text-gray-600 text-sm">
                        📍 {event.location}
                      </p>
                    )}{" "}
                    {tab === "rejected" && event.rejectionReason && (
                      <p className="text-sm text-red-600 mt-1 pt-1 border-t border-red-100">
                        <span className="font-medium">Lý do:</span>{" "}
                        {event.rejectionReason}
                      </p>
                    )}{" "}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic text-center py-4">
                  Không có sự kiện.
                </p>
              )}
            </div>
            <div className="flex justify-between items-center border-t pt-4 flex-shrink-0">
              <button
                onClick={onClose}
                className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm"
              >
                {" "}
                Đóng{" "}
              </button>
              <Link href="/event">
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md cursor-pointer text-sm">
                  + Tạo sự kiện
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
