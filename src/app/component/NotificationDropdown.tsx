"use client";

import React from 'react';
import Link from 'next/link';

// Định nghĩa interface NotificationItem
export interface NotificationItem {
    id: string;
    title: string;
    content: string;
    type: string;
    read: boolean;
    createdAt: string;
    relatedId: string | null;
    userId: string | null;
}

// Định nghĩa Props cho component
interface NotificationDropdownProps {
    notifications: NotificationItem[];
    isLoading: boolean;
    error: string | null;
    onMarkAsRead: (notificationId: string) => void;
    onClose: () => void;
    // Bỏ ref prop nếu không dùng forwardRef
}

// Helper function định dạng thời gian
const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) { return "Thời gian không xác định"; }
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} giây trước`;
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval} năm trước`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval} tháng trước`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval} ngày trước`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval} giờ trước`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval} phút trước`;
    return `${Math.floor(seconds)} giây trước`;
};

// Component NotificationDropdown trở thành một functional component thông thường
const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    notifications,
    isLoading,
    error,
    onMarkAsRead,
    onClose
}) => {
    return (
        // Bỏ ref={ref} nếu không dùng forwardRef
        <div
            // Giữ nguyên các class định vị và style khác
            className="absolute right-0 bottom-full mb-2 w-80 sm:w-96 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto flex flex-col animate-fade-in-up"
        >
            {/* Header */}
            <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-700">Thông báo</h3>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {isLoading ? (
                    <div className="p-4 text-center text-sm text-gray-500">Đang tải thông báo...</div>
                ) : error ? (
                    <div className="p-4 text-center text-sm text-red-500">Lỗi: {error}</div>
                ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">Bạn không có thông báo nào.</div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {notifications.map((noti) => (
                            <li
                                key={noti.id}
                                className={`p-3 transition duration-150 ease-in-out block ${
                                    !noti.read
                                        ? 'bg-indigo-50 hover:bg-indigo-100 cursor-pointer'
                                        : 'hover:bg-gray-50 cursor-pointer'
                                }`}
                                onClick={() => {
                                    if (!noti.read) {
                                        onMarkAsRead(noti.id);
                                    }
                                    console.log("Clicked notification:", noti.id, "Related ID:", noti.relatedId);
                                    onClose();
                                }}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 overflow-hidden">
                                        <p className={`text-xs font-semibold text-gray-800 truncate ${!noti.read ? 'font-bold' : ''}`} title={noti.title}>{noti.title}</p>
                                        <p className={`text-xs text-gray-600 mt-1 line-clamp-2 ${!noti.read ? 'font-medium' : ''}`} title={noti.content}>{noti.content}</p>
                                        <p className="text-xs text-gray-400 mt-1.5">{formatTimeAgo(noti.createdAt)}</p>
                                    </div>
                                    {!noti.read && (
                                        <div
                                            title="Chưa đọc"
                                            className="flex-shrink-0 w-2.5 h-2.5 mt-1 bg-blue-500 rounded-full"
                                            aria-label="Unread notification"
                                        ></div>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-gray-200 text-center sticky bottom-0 bg-white z-10 flex-shrink-0">
                <button onClick={onClose} className="text-xs text-indigo-600 hover:underline focus:outline-none cursor-pointer">
                    Đóng
                </button>
            </div>
             {/* Optional animation style */}
             <style jsx>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

// Vẫn giữ displayName nếu muốn
NotificationDropdown.displayName = 'NotificationDropdown';

export default NotificationDropdown;