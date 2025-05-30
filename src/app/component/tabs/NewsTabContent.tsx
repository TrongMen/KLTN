"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { NewsItem, User, EventDisplayInfo } from "../types/appTypes"; // Thêm EventDisplayInfo
import { ConfirmationDialog } from "../../../utils/ConfirmationDialog";
import NewsDetailModal from "../modals/NewsDetailModal";
import CreateNewsModal from "../modals/CreateNewsModal";
import {
  Pencil1Icon,
  TrashIcon,
  ReloadIcon,
  PersonIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@radix-ui/react-icons";

interface NewsTabContentProps {
  newsItems: NewsItem[];
  isLoading: boolean;
  error: string | null;
  user: User | null;
  onNewsDeleted: () => void;
  refreshToken?: () => Promise<string | null>;
  onRefreshNews: () => Promise<void>;
  // Props mới cho việc đăng ký sự kiện liên quan từ NewsDetailModal
  allEvents: EventDisplayInfo[];
  registeredEventIds: Set<string>;
  createdEventIdsForEvents: Set<string>; // ID các sự kiện do người dùng hiện tại tạo
  onRegisterForEvent: (event: EventDisplayInfo) => void; // Hàm đăng ký sự kiện từ UserHome
  isRegisteringForEventId: string | null; // ID sự kiện đang được xử lý đăng ký
}

const ITEMS_PER_PAGE_OPTIONS = [6, 12, 24];

const getCreatorName = (creator: NewsItem["createdBy"]): string => {
  if (!creator) return "Người tạo ẩn danh";
  const fullName = `${creator.lastName || ""} ${
    creator.firstName || ""
  }`.trim();
  return fullName || creator.username || "Người tạo ẩn danh";
};

const NewsTabContent: React.FC<NewsTabContentProps> = ({
  newsItems,
  isLoading,
  error,
  user,
  onNewsDeleted,
  refreshToken,
  onRefreshNews,
  allEvents,
  registeredEventIds,
  createdEventIdsForEvents,
  onRegisterForEvent,
  isRegisteringForEventId,
}) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    newsItemToDelete: NewsItem | null;
  }>({ isOpen: false, newsItemToDelete: null });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(
    null
  );
  const [isRefreshingButton, setIsRefreshingButton] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  );

  const [isCreateOrEditModalOpen, setIsCreateOrEditModalOpen] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const [isEditModeModal, setIsEditModeModal] = useState(false);
  const [relatedEventDetailsForModal, setRelatedEventDetailsForModal] = useState<EventDisplayInfo | null>(null);


  const handleOpenCreateModal = () => {
    setEditingNewsItem(null);
    setIsEditModeModal(false);
    setIsCreateOrEditModalOpen(true);
  };

  const handleOpenEditModal = (item: NewsItem) => {
    setEditingNewsItem(item);
    setIsEditModeModal(true);
    setIsCreateOrEditModalOpen(true);
  };

  const handleCloseCreateOrEditModal = () => {
    setIsCreateOrEditModalOpen(false);
    setEditingNewsItem(null);
  };

  const handleModalActionSuccess = (updatedOrCreatedItem?: NewsItem, wasEditMode?: boolean) => {
    handleCloseCreateOrEditModal();
    onRefreshNews();
  };

  const safeNewsItems = useMemo(
    () => (Array.isArray(newsItems) ? newsItems : []),
    [newsItems]
  );

  const sortedNews = useMemo(() => {
    const safeParseDateTimestamp = (
      dateInput: string | number | undefined | null
    ): number => {
      if (!dateInput) return 0;
      try {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? 0 : date.getTime();
      } catch (e) {
        console.error("Lỗi parse ngày tháng khi sắp xếp:", dateInput, e);
        return 0;
      }
    };
    try {
      return [...safeNewsItems].sort((a, b) => {
        const timeB = safeParseDateTimestamp(b.date || b.createdAt);
        const timeA = safeParseDateTimestamp(a.date || a.createdAt);
        return timeB - timeA;
      });
    } catch (sortError) {
      console.error("Lỗi trong quá trình sắp xếp tin tức:", sortError);
      return [...safeNewsItems];
    }
  }, [safeNewsItems]);

  const filteredNews = useMemo(() => {
    if (!searchTerm.trim()) {
      return sortedNews;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
    return sortedNews.filter((item) => {
      const creatorName = getCreatorName(item.createdBy).toLowerCase();
      const title = item.title?.toLowerCase() || "";
      const summary = item.summary?.toLowerCase() || "";
      const content = (item as any).content?.toLowerCase() || "";
      return (
        title.includes(lowerCaseSearchTerm) ||
        summary.includes(lowerCaseSearchTerm) ||
        creatorName.includes(lowerCaseSearchTerm) ||
        content.includes(lowerCaseSearchTerm)
      );
    });
  }, [sortedNews, searchTerm]);

  const totalItems = filteredNews.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNews = filteredNews.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleOpenDetailModal = (item: NewsItem) => {
    setSelectedNewsItem(item);
    if (item.event?.id && Array.isArray(allEvents)) {
      const foundEvent = allEvents.find(ev => ev.id === item.event!.id);
      setRelatedEventDetailsForModal(foundEvent || null);
    } else {
      setRelatedEventDetailsForModal(null);
    }
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedNewsItem(null);
    setRelatedEventDetailsForModal(null);
  };

  const handleDeleteClick = (newsItem: NewsItem) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập.");
      return;
    }
    const isCreatorResult = user?.id === newsItem.createdBy?.id;
    const isAdminResult = user?.roles?.some((role) => role.name === "ADMIN");
    if (!(isAdminResult || isCreatorResult)) {
      toast.error("Bạn không có quyền xóa tin tức này.");
      return;
    }
    setConfirmationState({ isOpen: true, newsItemToDelete: newsItem });
  };

  const handleConfirmDelete = async () => {
    const newsItemToDelete = confirmationState.newsItemToDelete;
    if (!newsItemToDelete || !user || !user.id) {
      setConfirmationState({ isOpen: false, newsItemToDelete: null });
      return;
    }
    const newsTitle = newsItemToDelete.title || "tin tức này";
    setIsDeleting(newsItemToDelete.id);
    setConfirmationState({ isOpen: false, newsItemToDelete: null });
    const toastId = toast.loading(`Đang xóa "${newsTitle}"...`);
    let token = localStorage.getItem("authToken");

    if (!token && refreshToken) {
      const newToken = await refreshToken();
      if (newToken) {
        token = newToken;
        localStorage.setItem("authToken", newToken);
      }
    }
    if (!token) {
      toast.error("Phiên đăng nhập hết hạn hoặc không thể làm mới token.", { id: toastId });
      setIsDeleting(null);
      return;
    }

    const API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/${newsItemToDelete.id}?deletedById=${user.id}`;
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
          localStorage.setItem("authToken", newToken);
          response = await fetch(API_URL, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } else {
          throw new Error("Không thể làm mới phiên.");
        }
      }
      if (response.ok || response.status === 204) {
        toast.success(`Đã xóa thành công "${newsTitle}"!`, { id: toastId });
        onNewsDeleted();
      } else {
        let errorMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {
          errorMsg = response.statusText || errorMsg;
        }
        if (response.status === 401 || response.status === 403) {
          errorMsg = "Không có quyền hoặc phiên hết hạn.";
        }
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      toast.error(`Xóa thất bại: ${err.message}`, { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmationState({ isOpen: false, newsItemToDelete: null });
  };

  const handleTriggerEditFromDetailModal = (itemToEdit: NewsItem) => {
    setIsDetailModalOpen(false); // Đóng modal chi tiết
    setTimeout(() => { // Đảm bảo modal chi tiết đã đóng hoàn toàn trước khi mở modal sửa
      handleOpenEditModal(itemToEdit);
    }, 0);
  };

  const handleTriggerDeleteFromDetailModal = (itemToDelete: NewsItem) => {
    setIsDetailModalOpen(false);
    handleDeleteClick(itemToDelete);
  };

  const handleRefreshNewsInternal = async () => {
    setIsRefreshingButton(true);
    try {
      await onRefreshNews();
      setCurrentPage(1);
      toast.success("Đã làm mới bảng tin!");
    } catch (err) {
      console.error("Lỗi khi làm mới bảng tin:", err);
      toast.error("Không thể làm mới bảng tin.");
    } finally {
      setIsRefreshingButton(false);
    }
  };

  if (isLoading && !isDeleting && !isRefreshingButton) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <ReloadIcon className="w-8 h-8 animate-spin text-green-600" />
        <p className="ml-3 text-gray-500 italic">Đang tải bảng tin...</p>
      </div>
    );
  }
  if (error) {
    return (
      <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200 mt-6">
        Lỗi tải bảng tin: {error}
      </p>
    );
  }

  return (
    <div className="mt-10 pt-6 border-t border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-green-600">📰 Bảng tin</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-90">
            <input
              type="text"
              placeholder="Tìm theo tiêu đề, nội dung, người tạo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={handleRefreshNewsInternal}
            disabled={isLoading || isRefreshingButton}
            title="Làm mới bảng tin"
            className={`p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 ${
              isRefreshingButton ? "cursor-wait" : "cursor-pointer"
            } flex items-center justify-center w-full sm:w-auto`}
          >
            {isRefreshingButton ? (
              <ReloadIcon className="w-5 h-5 animate-spin text-green-600" />
            ) : (
              <ReloadIcon className="w-5 h-5 text-green-600" />
            )}
          </button>
          {user &&
            user.roles?.some(
              (role) =>
                role.name === "ADMIN" ||
                role.name === "MANAGER" ||
                role.name === "USER" 
            ) && (
              <button
                onClick={handleOpenCreateModal}
                className="px-4 cursor-pointer py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 flex items-center gap-1 w-full sm:w-auto justify-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Tạo Bảng Tin
              </button>
            )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Hiển thị {startIndex + 1}-{Math.min(endIndex, totalItems)} của{" "}
          {totalItems} tin tức
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
            Số lượng/trang:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="p-1 border rounded text-sm"
          >
            {ITEMS_PER_PAGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {paginatedNews.length > 0 ? (
        <>
          <div className="flex flex-wrap justify-start gap-5">
            {paginatedNews.map((item) => {
              const isCreatorResult = user?.id === item.createdBy?.id;
              const isAdminResult = user?.roles?.some(
                (role) => role.name === "ADMIN"
              );
              const canUpdate = (isCreatorResult && item.status === "APPROVED") || isAdminResult; 
              const canDelete = isAdminResult || isCreatorResult;
              const creatorName = getCreatorName(item.createdBy);

              return (
                <div
                  key={item.id}
                  className="w-full md:w-[calc(50%-1.25rem/2)] lg:w-[calc(33.33%-2.5rem/3)] bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 transition-all duration-300 group flex flex-col overflow-hidden relative"
                >
                  {item.imageUrl ? (
                    <div
                      onClick={() => handleOpenDetailModal(item)}
                      className="flex-shrink-0 w-full h-48 relative bg-gray-200 cursor-pointer overflow-hidden"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.title || "Hình ảnh tin tức"}
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const parent = (e.target as HTMLImageElement)
                            .parentElement;
                          if (
                            parent &&
                            !parent.querySelector(".error-placeholder")
                          ) {
                            const placeholder = document.createElement("div");
                            placeholder.className =
                              "error-placeholder w-full h-full flex items-center justify-center text-gray-400 text-sm italic";
                            placeholder.textContent = "Không thể tải ảnh";
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => handleOpenDetailModal(item)}
                      className="flex-shrink-0 w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 italic cursor-pointer"
                    >
                      (Không có ảnh)
                    </div>
                  )}
                  <div className="p-4 flex flex-col flex-grow">
                    <h3
                      onClick={() => handleOpenDetailModal(item)}
                      className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {item.title || "Tiêu đề không có"}
                    </h3>
                  
                    <div className="mt-auto pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1.5">
                        {new Date(
                          item.date || item.createdAt || Date.now()
                        ).toLocaleDateString("vi-VN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {item.createdBy && (
                        <div className="flex items-center">
                          {item.createdBy.avatar ? (
                            <Image
                              src={item.createdBy.avatar}
                              alt={creatorName}
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full mr-1.5 object-cover bg-gray-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <span className="inline-block h-5 w-5 rounded-full overflow-hidden bg-gray-200 mr-1.5 flex items-center justify-center">
                              <PersonIcon className="h-3 w-3 text-gray-500" />
                            </span>
                          )}
                          <span
                            className="text-xs text-gray-600 font-medium truncate"
                            title={creatorName}
                          >
                            {creatorName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {(canUpdate || canDelete) && user && ( 
                    <div
                      className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canUpdate && ( 
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(item);
                          }}
                          className="p-1.5 rounded-full bg-white/90 hover:bg-blue-100 text-gray-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 shadow cursor-pointer"
                          title="Chỉnh sửa tin tức"
                        >
                          <Pencil1Icon className="h-4 w-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(item);
                          }}
                          disabled={isDeleting === item.id}
                          className={`p-1.5 rounded-full bg-white/90 text-gray-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200 shadow cursor-pointer ${
                            isDeleting === item.id
                              ? "animate-pulse bg-red-50"
                              : ""
                          }`}
                          title="Xóa tin tức"
                        >
                          {isDeleting === item.id ? (
                            <ReloadIcon className="animate-spin h-4 w-4 text-red-600" />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-4">
              <span className="text-sm text-gray-600">
                Trang <span className="font-semibold">{currentPage}</span> /{" "}
                <span className="font-semibold">{totalPages}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md border bg-white text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                >
                  <ChevronLeftIcon className="w-4 h-4" /> Trước
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md border bg-white text-sm hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
                >
                  Sau <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-center py-10 italic">
          {searchTerm
            ? `Không tìm thấy tin tức nào khớp với "${searchTerm}".`
            : "Không có tin tức nào để hiển thị."}
        </p>
      )}

      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title="Xác nhận xóa"
        message={
          <>
            Bạn có chắc chắn muốn xóa tin tức: <br />
            <strong className="text-red-600">
              "{confirmationState.newsItemToDelete?.title || "này"}"
            </strong>{" "}
            ?<br /> Hành động này không thể hoàn tác.
          </>
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        confirmVariant="danger"
      />

      {selectedNewsItem && (
        <NewsDetailModal
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
          item={selectedNewsItem}
          user={user}
          onTriggerEdit={handleTriggerEditFromDetailModal}
          onTriggerDelete={handleTriggerDeleteFromDetailModal}
          relatedEventDetails={relatedEventDetailsForModal}
          onAttemptRegisterRelatedEvent={onRegisterForEvent}
          registeredEventIds={registeredEventIds}
          isRegisteringForEventId={isRegisteringForEventId}
          createdEventIdsForEvents={createdEventIdsForEvents}
        />
      )}

      {isCreateOrEditModalOpen && (
        <CreateNewsModal
          isOpen={isCreateOrEditModalOpen}
          onClose={handleCloseCreateOrEditModal}
          onActionSuccess={handleModalActionSuccess}
          editMode={isEditModeModal}
          initialData={editingNewsItem}
          user={user}
          refreshToken={refreshToken}
        />
      )}
    </div>
  );
};

export default NewsTabContent;