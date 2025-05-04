"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image"; // Import Image from next/image
import { toast } from "react-hot-toast";
import { NewsItem, User } from "../homeuser";
import { ConfirmationDialog } from "../../../utils/ConfirmationDialog";
import { Pencil1Icon, TrashIcon, ReloadIcon, PersonIcon } from '@radix-ui/react-icons'; // Import icons including PersonIcon for placeholder

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
  onOpenEditModal,
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
      // Consider redirecting to login
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
           localStorage.setItem('authToken', newToken); // Update token
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
          onNewsDeleted(); // Refresh the list
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
      if (error.message?.includes("Unauthorized")) {
         // Optional: Redirect to login if unauthorized
         // router.push('/login?sessionExpired=true');
      }
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmationState({ isOpen: false, newsItemToDelete: null });
  };

  // Helper function to get creator display name
  const getCreatorName = (creator: NewsItem['createdBy']): string => {
      if (!creator) return 'Người tạo ẩn danh';
      const fullName = `${creator.lastName || ''} ${creator.firstName || ''}`.trim();
      return fullName || creator.username || 'Người tạo ẩn danh';
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
        Lỗi tải bảng tin: {error}
      </p>
    );
  }

  const safeNewsItems = Array.isArray(newsItems) ? newsItems : [];
  const sortedNews = [...safeNewsItems].sort(
    (a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
  );

  return (
    <div className="mt-10 pt-6 border-t border-gray-200">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-green-600">📰 Bảng tin</h2>
        {user && (
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition duration-150 flex items-center gap-1"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
             </svg>
             Tạo Bảng Tin
          </button>
        )}
      </div>

      {sortedNews.length > 0 ? (
         // Reverted container to flex-wrap for grid layout
        <div className="flex flex-wrap justify-center gap-4">
          {sortedNews.map((item) => {
            const canDelete = user?.roles?.some(
              (role) => role.name === "ADMIN" || role.name === "USER"
            );
            const canUpdate =
              user?.id === item.createdBy?.id && item.status === "APPROVED";
            const creatorName = getCreatorName(item.createdBy);

            return (
              // Main container for each card - restored width and flex-col
              <div
                key={item.id}
                className="p-0 w-full md:w-[calc(50%-0.5rem)] lg:w-[calc(33.33%-0.66rem)] bg-white shadow rounded-lg border border-gray-100 hover:shadow-md transition-shadow duration-150 relative group flex flex-col overflow-hidden" // Added overflow-hidden
              >
                {/* Image container */}
                {item.imageUrl && (
                  <div className="flex-shrink-0 w-full h-40 relative"> {/* Ensure relative positioning */}
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      layout="fill" // Use fill layout
                      objectFit="cover" // Cover the container
                      className="" // No specific classes needed here with layout='fill'
                       onError={(e) => {
                           // Attempt to remove the image container or replace with placeholder on error
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                                parent.style.display = 'none'; // Hide container on error
                            }
                       }}
                    />
                  </div>
                )}

                 {/* Text content container */}
                <div className="p-4 flex flex-col flex-grow"> {/* Added flex-grow here to allow creator info to push down if needed */}
                  <h3 className="text-lg font-semibold text-gray-800 mb-1 pr-16 line-clamp-2"> {/* Padding right for buttons */}
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-3">{item.summary}</p>

                  {/* Spacer to push date and creator down */}
                  <div className="flex-grow"></div>

                  {/* Date and Creator Info at the bottom */}
                  <div className="mt-2 pt-2 border-t border-gray-100"> {/* Separator line */}
                     <p className="text-xs text-gray-400 mb-1"> {/* Date */}
                        {new Date(item.date || item.createdAt || Date.now()).toLocaleDateString("vi-VN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                     </p>
                     {/* Creator Info */}
                     {item.createdBy && (
                        <div className="flex items-center">
                            {item.createdBy.avatar ? (
                            <Image
                                src={item.createdBy.avatar}
                                alt={creatorName || 'Creator avatar'}
                                width={20} // Slightly smaller avatar (w-5)
                                height={20} // Slightly smaller avatar (h-5)
                                className="w-5 h-5 rounded-full mr-1.5 object-cover bg-gray-200" // Added bg-gray-200 for loading/placeholder
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            ) : (
                            // Placeholder avatar using Radix icon
                            <span className="inline-block h-5 w-5 rounded-full overflow-hidden bg-gray-200 mr-1.5 flex items-center justify-center">
                                <PersonIcon className="h-3 w-3 text-gray-500" />
                            </span>
                            )}
                            <span className="text-xs text-gray-500 truncate" title={creatorName}> {/* Added truncate */}
                                {creatorName}
                            </span>
                        </div>
                     )}
                  </div>
                </div>

                {/* Action buttons - Kept absolute positioning for card layout */}
                 <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"> {/* Ensure z-index */}
                    {canUpdate && (
                        <button
                        onClick={() => onOpenEditModal(item)}
                        className="p-1.5 rounded-full bg-white/70 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors shadow" // Added slight background/shadow
                        title="Chỉnh sửa tin tức"
                        >
                        <Pencil1Icon className="h-4 w-4" />
                        </button>
                    )}
                    {canDelete && (
                        <button
                        onClick={() => handleDeleteClick(item)}
                        disabled={isDeleting === item.id}
                        className={`p-1.5 rounded-full bg-white/70 text-gray-600 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 disabled:cursor-wait transition-colors shadow ${
                            isDeleting === item.id ? "animate-pulse" : ""
                        }`}
                        title="Xóa tin tức"
                        >
                        {isDeleting === item.id ? (
                            <ReloadIcon className="animate-spin h-4 w-4 text-red-500" />
                        ) : (
                            <TrashIcon className="h-4 w-4" />
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