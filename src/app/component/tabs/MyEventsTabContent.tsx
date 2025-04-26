import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { User } from '../homeuser'; // Adjust import path if needed

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

const getFilenameFromHeader = (header: string | null): string => {
    const defaultFilename = "event_export.docx";
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


interface MyEventsTabContentProps {
    user: User | null;
}

const MyEventsTabContent: React.FC<MyEventsTabContentProps> = ({ user }) => {
    const [tab, setTab] = useState<'approved' | 'pending' | 'rejected'>('approved');
    const [events, setEvents] = useState<EventType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>("");
    const [viewingEventDetails, setViewingEventDetails] = useState<EventType | null>(null);
    const [isExporting, setIsExporting] = useState<boolean>(false);

    const fetchEvents = useCallback(async () => {
         if (!user?.id) {
            setError("Không tìm thấy thông tin người dùng.");
            setLoading(false);
            setEvents([]);
            return;
         }
         setLoading(true);
         setError("");
         try {
            const token = localStorage.getItem("authToken");
            if (!token) throw new Error("Chưa đăng nhập.");
            const userId = user.id;
             const eventsRes = await fetch(
                 `http://localhost:8080/identity/api/events/creator/${userId}`,
                 { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
             );
            if (!eventsRes.ok) {
                const d = await eventsRes.json().catch(() => ({}));
                throw new Error(d?.message || `Lỗi tải sự kiện (${eventsRes.status})`);
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
    }, [user]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const filteredEvents = useMemo(() =>
     events.filter((event) => {
         const s = event.status?.toUpperCase();
         if (tab === "approved") return s === "APPROVED";
         if (tab === "pending") return s === "PENDING";
         if (tab === "rejected") return s === "REJECTED";
         return false;
     }), [events, tab]);

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

             const response = await fetch(url, {
                 method: "GET",
                 headers: {
                     Authorization: `Bearer ${token}`,
                     Accept:
                         "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
                     } catch (_) { }
                 }
                 throw new Error(errorMsg);
             }

             const contentDisposition = response.headers.get("Content-Disposition");
             const filename = getFilenameFromHeader(contentDisposition);

             const blob = await response.blob();
             const actualMimeType = response.headers
                 .get("content-type")
                 ?.split(";")[0];
             if (
                 actualMimeType !==
                 "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
             ) {
                 console.warn(
                     `API trả về Content-Type không khớp: ${actualMimeType} (mong đợi DOCX)`
                 );
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
                                 className={`font-semibold px-2 py-0.5 rounded-full text-xs ${event.status === "APPROVED"
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
                             className={`bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm cursor-pointer flex items-center ${isExporting ? "opacity-50 cursor-not-allowed" : ""
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


    return (
        <div className="flex flex-col h-full">
             <h2 className="text-xl md:text-2xl font-bold text-blue-600 mb-4 flex-shrink-0">
                  {viewingEventDetails ? "Chi tiết sự kiện" : "Sự kiện của tôi"}
             </h2>

             {viewingEventDetails ? (
                renderEventDetails(viewingEventDetails)
             ) : (
                 <>
                     <div className="flex flex-wrap gap-4 mb-4 border-b flex-shrink-0">
                       <button
                            onClick={() => setTab("approved")}
                            className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
                                tab === "approved" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500 hover:text-gray-700"
                            }`}
                        >✅ Đã duyệt</button>
                          <button
                            onClick={() => setTab("pending")}
                            className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
                                tab === "pending" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500 hover:text-gray-700"
                            }`}
                        >⏳ Chờ duyệt</button>
                        <button
                            onClick={() => setTab("rejected")}
                            className={`pb-2 font-semibold cursor-pointer text-sm md:text-base ${
                                tab === "rejected" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500 hover:text-gray-700"
                            }`}
                        >❌ Từ chối</button>
                     </div>

                    <div className="space-y-3 overflow-y-auto flex-grow mb-6 pr-2 min-h-[200px]">
                         {loading ? (
                            <p className="text-gray-500 italic text-center py-4">Đang tải...</p>
                         ) : error ? (
                            <p className="text-red-500 italic text-center py-4">{error}</p>
                         ) : filteredEvents.length > 0 ? (
                            filteredEvents.map((event) => (
                                 <div
                                    key={event.id}
                                    className="p-3 md:p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200 space-y-1 hover:bg-gray-100 cursor-pointer"
                                    onClick={() => setViewingEventDetails(event)}
                                >
                                     <h3 className="font-semibold text-md md:text-lg text-gray-800">{event.name}</h3>
                                      {event.time && (
                                        <p className="text-gray-600 text-sm">
                                            📅 {new Date(event.time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                                        </p>
                                      )}
                                      {event.location && <p className="text-gray-600 text-sm">📍 {event.location}</p>}
                                      {tab === "rejected" && event.rejectionReason && (
                                        <p className="text-sm text-red-600 mt-1 pt-1 border-t border-red-100">
                                            <span className="font-medium">Lý do:</span> {event.rejectionReason}
                                        </p>
                                      )}
                                 </div>
                            ))
                         ) : (
                            <p className="text-gray-500 italic text-center py-4">Không có sự kiện nào trong mục này.</p>
                         )}
                     </div>
                 </>
             )}
        </div>
    );
};

export default MyEventsTabContent;