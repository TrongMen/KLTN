"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import { NewsItem, User } from "../homeuser"; // Import types
import { ConfirmationDialog } from "../../../utils/ConfirmationDialog"; 

interface NewsFeedSectionProps {
  newsItems: NewsItem[];
  isLoading: boolean;
  error: string | null;
  user: User | null;
  onOpenCreateModal: () => void; 
  onOpenEditModal: (item: NewsItem) => void; 
  onNewsDeleted: () => void; 
  refreshToken?: () => Promise<string | null>;
}

const NewsFeedSection: React.FC<NewsFeedSectionProps> = ({
  newsItems,
  isLoading,
  error,
  user,
  onOpenCreateModal,
  onOpenEditModal, // Nhận prop mới
  onNewsDeleted,
  refreshToken,
}) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    newsItemToDelete: NewsItem | null;
  }>({ isOpen: false, newsItemToDelete: null });

  const handleDeleteClick = (newsItem: NewsItem) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập.");
      return;
    }
    // Kiểm tra quyền Admin ở đây nếu cần, trước khi mở confirm
    const isAdmin = user?.roles?.some((role) => role.name === "ADMIN" || role.name === "USER");
    if (!isAdmin) {
      toast.error("Chỉ quản trị viên mới có thể xóa.");
      return;
    }
    setConfirmationState({ isOpen: true, newsItemToDelete: newsItem });
  };

  const handleConfirmDelete = async () => {
    const newsItem = confirmationState.newsItemToDelete;
    if (!newsItem || !user || !user.id) {
      setConfirmationState({ isOpen: false, newsItemToDelete: null });
      return;
    }
    setIsDeleting(newsItem.id);
    setConfirmationState({ isOpen: false, newsItemToDelete: null });
    let token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Phiên đăng nhập hết hạn.");
      setIsDeleting(null);
      return;
    }
    const API_URL = `http://localhost:8080/identity/api/news/${newsItem.id}?deletedById=${user.id}`;
    try {
      let response = await fetch(API_URL, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (
        (response.status === 401 || response.status === 403) &&
        refreshToken
      ) {
        const newToken = await refreshToken();
        if (newToken) {
          token = newToken;
          response = await fetch(API_URL, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } else throw new Error("Không thể làm mới phiên đăng nhập.");
      }
      if (response.ok) {
        const result = await response.json();
        if (result.code === 1000) {
          toast.success(result.message || "Xóa thành công!");
          onNewsDeleted();
        } else {
          throw new Error(result.message || "Xóa thất bại.");
        }
      } else {
        let errorMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (_) {}
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error("Error deleting news item:", error);
      toast.error(`Xóa thất bại: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmationState({ isOpen: false, newsItemToDelete: null });
  };

  if (isLoading) {
    return (
      <p className="text-center text-gray-500 italic py-6">
        Đang tải bảng tin...
      </p>
    );
  }
  if (error) {
    return (
      <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200 mt-6">
        {error}
      </p>
    );
  }

  const safeNewsItems = Array.isArray(newsItems) ? newsItems : [];
  const sortedNews = [...safeNewsItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="mt-10 pt-6 border-t border-gray-200">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-green-600">📰 Bảng tin</h2>
        {user && (
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition duration-150"
          >
            {" "}
            + Tạo Bảng Tin{" "}
          </button>
        )}
      </div>

      {sortedNews.length > 0 ? (
        <div className="space-y-2 justify-center items-center flex flex-wrap gap-4">
          {sortedNews.map((item) => {
          
            const canDelete = user?.roles?.some(
              (role) => role.name === "ADMIN" || role.name === "USER"
            );
            
            const canUpdate =
              user?.id === item.createdBy?.id && item.status === "APPROVED";

            return (
              <div
                key={item.id}
                className="p-4 w-1/2 bg-white shadow rounded-lg border border-gray-100 hover:shadow-md transition-shadow duration-150 relative group"
              >
                {" "}
                
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover rounded mb-3"
                  />
                )}
                <h3 className="text-lg font-semibold text-gray-800 mb-1 pr-16">
                  {item.title}
                </h3>{" "}
                {/* Tăng padding phải */}
                <p className="text-sm text-gray-600 mb-2">{item.summary}</p>
                <p className="text-xs text-gray-400">
                  {" "}
                  {new Date(item.date).toLocaleDateString("vi-VN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                </p>
                {/* Container cho các nút actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {canUpdate && (
                    <button
                      onClick={() => onOpenEditModal(item)} // Gọi hàm mở modal edit
                      className="p-1 rounded-full text-gray-400 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                      title="Chỉnh sửa tin tức"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDeleteClick(item)}
                      disabled={isDeleting === item.id}
                      className={`p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 disabled:cursor-wait transition-colors ${
                        isDeleting === item.id ? "animate-pulse" : ""
                      }`}
                      title="Xóa tin tức"
                    >
                      {isDeleting === item.id ? (
                        <svg
                          className="animate-spin h-5 w-5 text-red-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4 italic">
          Không có tin tức nào để hiển thị.
        </p>
      )}

      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title="Xác nhận xóa"
        message={
          <>
            Bạn có chắc chắn muốn xóa tin tức: <br />
            <strong className="text-red-600">
              "{confirmationState.newsItemToDelete?.title}"
            </strong>
            ?<br /> Hành động này không thể hoàn tác.
          </>
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        confirmVariant="danger"
      />
    </div>
  );
};

export default NewsFeedSection;
