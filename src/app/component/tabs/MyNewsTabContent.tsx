"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast, Toaster } from "react-hot-toast";
import Image from "next/image";
import { User as MainUserType, NewsItem } from "../types/appTypes";
import ConfirmationDialog from "../../../utils/ConfirmationDialog";
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  ClockIcon,
  CrossCircledIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  Component1Icon,
  ListBulletIcon,
  TrashIcon,
  ReloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import CreateNewsModal, { NewsFormData } from "../modals/CreateNewsModal";

const getWeekRange = (
  refDate: Date
): { startOfWeek: Date; endOfWeek: Date } => {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { startOfWeek: start, endOfWeek: end };
};

const getMonthRange = (
  refDate: Date
): { startOfMonth: Date; endOfMonth: Date } => {
  const d = new Date(refDate);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { startOfMonth: start, endOfMonth: end };
};

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "Ngày không hợp lệ";
  }
};

const renderStatusBadge = (status: NewsItem["status"]) => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return (
        <span className="font-semibold px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 inline-flex items-center gap-1">
          <CheckCircledIcon /> Đã duyệt
        </span>
      );
    case "PENDING":
      return (
        <span className="font-semibold px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 inline-flex items-center gap-1">
          <ClockIcon /> Chờ duyệt
        </span>
      );
    case "REJECTED":
      return (
        <span className="font-semibold px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 inline-flex items-center gap-1">
          <CrossCircledIcon /> Từ chối
        </span>
      );
    default:
      return (
        <span className="font-semibold px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
          {status || "N/A"}
        </span>
      );
  }
};


interface MyNewsProps {
  user: MainUserType | null;
   onNewsChange?: () => void;
}

const MyNewsTabContent: React.FC<MyNewsProps> = ({ user }) => {
  const [mainTab, setMainTab] = useState<"myNews" | "deletedNews">("myNews");
  const [myNewsTab, setMyNewsTab] = useState<
    "approved" | "pending" | "rejected"
  >("approved");
  const [currentMyNewsItems, setCurrentMyNewsItems] = useState<NewsItem[]>([]);
  const [myNewsItemCounts, setMyNewsItemCounts] = useState<{
    approved: number | null;
    pending: number | null;
    rejected: number | null;
  }>({ approved: null, pending: null, rejected: null });
  const [isLoadingMyNewsCounts, setIsLoadingMyNewsCounts] =
    useState<boolean>(true);
  const [isLoadingMyNewsContent, setIsLoadingMyNewsContent] =
    useState<boolean>(true);
  const [myNewsError, setMyNewsError] = useState<string>("");

  const [deletedNewsItems, setDeletedNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState<boolean>(true);
  const [deletedNewsError, setDeletedNewsError] = useState<string>("");
  const [deletedNewsPagination, setDeletedNewsPagination] = useState({
    page: 0,
    size: 10,
    totalPages: 0,
    totalElements: 0,
  });
  const [deletedNewsViewMode, setDeletedNewsViewMode] = useState<
    "card" | "list"
  >("list");

  const [viewingNewsDetails, setViewingNewsDetails] = useState<NewsItem | null>(
    null
  );
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [confirmationState, setConfirmationState] = useState<
    ConfirmationDialogProps & { isOpen: boolean }
  >({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
  });
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [refreshMyNewsTrigger, setRefreshMyNewsTrigger] = useState<number>(0);

  const [myNewsSearchTerm, setMyNewsSearchTerm] = useState("");
  const [myNewsSortOrder, setMyNewsSortOrder] = useState<
    "newest" | "oldest" | "az" | "za"
  >("newest");
  const [myNewsTimeFilterOption, setMyNewsTimeFilterOption] = useState<
    "all" | "today" | "thisWeek" | "thisMonth" | "dateRange"
  >("all");
  const [myNewsStartDateFilter, setMyNewsStartDateFilter] =
    useState<string>("");
  const [myNewsEndDateFilter, setMyNewsEndDateFilter] = useState<string>("");
  const [myNewsViewMode, setMyNewsViewMode] = useState<"card" | "list">("card");

  const currentUserId = user?.id ?? null;
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchMyNewsData = useCallback(
    async (
      status: "approved" | "pending" | "rejected"
    ): Promise<{ count: number; items: NewsItem[] }> => {
      if (!currentUserId)
        throw new Error("Không tìm thấy thông tin người dùng.");
      try {
        const token = localStorage.getItem("authToken");
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const statusParam = status.toUpperCase();
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/status?status=${statusParam}`;
        const newsRes = await fetch(url, { headers, cache: "no-store" });

        if (!newsRes.ok) {
          if (newsRes.status === 404) return { count: 0, items: [] };
          const d = await newsRes.json().catch(() => ({}));
          throw new Error(d?.message || `Lỗi tải tin tức (${newsRes.status})`);
        }

        const data = await newsRes.json();
        let userNewsOfStatus: NewsItem[] = [];
        if (data.code === 1000 && Array.isArray(data.result)) {
          const allNewsOfStatus: NewsItem[] = data.result.map((item: any) => ({
            id: item.id,
            title: item.title || "N/A",
            content: item.content,
            summary:
              item.summary ||
              item.content?.substring(0, 150) +
                (item.content?.length > 150 ? "..." : "") ||
              "",
            imageUrl: item.coverImageUrl,
            status: item.status,
            createdAt: item.createdAt,
            publishedAt: item.publishedAt,
            rejectionReason: item.rejectionReason,
            createdBy: item.createdBy,
            event: item.event,
            deleted: item.deleted,
            deletedAt: item.deletedAt,
            deletedBy: item.deletedBy,
          }));
          userNewsOfStatus = allNewsOfStatus.filter(
            (item) => item.createdBy?.id === currentUserId
          );
        } else {
          console.warn(
            "API fetchMyNewsData không trả về cấu trúc mong đợi:",
            data
          );
        }
        return { count: userNewsOfStatus.length, items: userNewsOfStatus };
      } catch (err: any) {
        console.error(`Lỗi tải tin tức trạng thái ${status}:`, err);
        throw err;
      }
    },
    [currentUserId]
  );

  const fetchDeletedNews = useCallback(
    async (page = 0, size = 10) => {
      if (!currentUserId) {
        setDeletedNewsItems([]);
        setIsLoadingDeleted(false);
        setDeletedNewsError("Không tìm thấy thông tin người dùng.");
        return;
      }
      setIsLoadingDeleted(true);
      setDeletedNewsError("");
      try {
        const token = localStorage.getItem("authToken");
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/deleted?page=${page}&size=${size}`;
        const res = await fetch(url, { headers, cache: "no-store" });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.message || `Lỗi tải tin đã xóa (${res.status})`);
        }
        const data = await res.json();

        if (
          data.code === 1000 &&
          data.result &&
          Array.isArray(data.result.content)
        ) {
          const userDeletedNews: NewsItem[] = data.result.content
            .filter((item: any) => item.createdBy?.id === currentUserId)
            .map((item: any) => ({
              id: item.id,
              title: item.title || "N/A",
              content: item.content,
              summary:
                item.summary ||
                item.content?.substring(0, 150) +
                  (item.content?.length > 150 ? "..." : "") ||
                "",
              imageUrl: item.coverImageUrl,
              status: item.status,
              createdAt: item.createdAt,
              publishedAt: item.publishedAt,
              rejectionReason: item.rejectionReason,
              createdBy: item.createdBy,
              event: item.event,
              deleted: item.deleted,
              deletedAt: item.deletedAt,
              deletedBy: item.deletedBy,
            }));

          setDeletedNewsItems(userDeletedNews);
          const totalUserElements = data.result.totalElements;
          const totalUserPages = Math.ceil(totalUserElements / size);

          setDeletedNewsPagination({
            page: data.result.number,
            size: data.result.size,
            totalPages: totalUserPages,
            totalElements: totalUserElements,
          });
        } else {
          console.warn(
            "API bảng tin đã xóa không trả về cấu trúc mong đợi:",
            data
          );
          setDeletedNewsItems([]);
          setDeletedNewsPagination({
            page: 0,
            size: 10,
            totalPages: 0,
            totalElements: 0,
          });
          setDeletedNewsError("Dữ liệu tin tức đã xóa không hợp lệ");
        }
      } catch (err: any) {
        console.error("Lỗi tải tin tức đã xóa:", err);
        setDeletedNewsError(err.message || "Lỗi tải tin tức đã xóa");
        setDeletedNewsItems([]);
        setDeletedNewsPagination({
          page: 0,
          size: 10,
          totalPages: 0,
          totalElements: 0,
        });
      } finally {
        setIsLoadingDeleted(false);
      }
    },
    [currentUserId]
  );

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    const toastId = toast.loading("Đang làm mới dữ liệu...");

    try {
      if (!currentUserId) {
        throw new Error("Không tìm thấy thông tin người dùng để làm mới.");
      }

      if (mainTab === "myNews") {
        setRefreshMyNewsTrigger(prev => prev + 1);
      } else if (mainTab === "deletedNews") {
        await fetchDeletedNews(deletedNewsPagination.page, deletedNewsPagination.size);
      }
      toast.success("Dữ liệu đã được làm mới!", { id: toastId });
    } catch (error: any) {
      console.error("Lỗi trong quá trình làm mới:", error);
      toast.error(`Làm mới thất bại: ${error.message || "Lỗi không xác định"}`, { id: toastId });
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isRefreshing,
    mainTab,
    currentUserId,
    fetchDeletedNews,
    deletedNewsPagination.page,
    deletedNewsPagination.size,
    setRefreshMyNewsTrigger
  ]);


  useEffect(() => {
    if (mainTab === "myNews" && currentUserId) {
      setIsLoadingMyNewsCounts(true);
      setIsLoadingMyNewsContent(true);
      setMyNewsError("");
      setMyNewsItemCounts({ approved: null, pending: null, rejected: null });

      const statuses: ("approved" | "pending" | "rejected")[] = [
        "approved",
        "pending",
        "rejected",
      ];
      const initialActiveSubTab = myNewsTab;

      Promise.allSettled(statuses.map((status) => fetchMyNewsData(status)))
        .then((results) => {
          const newCounts = { approved: 0, pending: 0, rejected: 0 };
          let initialTabItems: NewsItem[] | null = null;
          let combinedErrorMessages = "";

          results.forEach((result, index) => {
            const status = statuses[index];
            if (result.status === "fulfilled") {
              newCounts[status] = result.value.count;
              if (status === initialActiveSubTab) {
                initialTabItems = result.value.items;
              }
            } else {
              console.error(
                `Failed fetch count/data for ${status}:`,
                result.reason
              );
              newCounts[status] = 0;
              const errorMsg =
                result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason);
              combinedErrorMessages += ` Lỗi ${status}: ${errorMsg}`;
            }
          });

          setMyNewsItemCounts(newCounts);
          setMyNewsError(combinedErrorMessages.trim());
          setCurrentMyNewsItems(initialTabItems ?? []);
          setIsLoadingMyNewsContent(false);
        })
        .finally(() => setIsLoadingMyNewsCounts(false));
    } else if (mainTab !== "myNews" || !currentUserId) {
      setCurrentMyNewsItems([]);
      setMyNewsItemCounts({ approved: 0, pending: 0, rejected: 0 });
      setIsLoadingMyNewsCounts(false);
      setIsLoadingMyNewsContent(false);
      setMyNewsError("");
    }
  }, [
    mainTab,
    currentUserId,
    fetchMyNewsData,
    myNewsTab,
    refreshMyNewsTrigger,
  ]);

  useEffect(() => {
    const isInitialLoadForCounts = isLoadingMyNewsCounts;
    const isDataPotentiallyLoaded =
      !isInitialLoadForCounts &&
      currentMyNewsItems.length > 0 &&
      currentMyNewsItems[0]?.status?.toUpperCase() === myNewsTab.toUpperCase();

    if (
      mainTab !== "myNews" ||
      isInitialLoadForCounts ||
      !currentUserId ||
      isDataPotentiallyLoaded
    ) {
      if (isDataPotentiallyLoaded && isLoadingMyNewsContent) {
        setIsLoadingMyNewsContent(false);
      }
      return;
    }

    setIsLoadingMyNewsContent(true);
    setMyNewsError("");
    setCurrentMyNewsItems([]);

    fetchMyNewsData(myNewsTab)
      .then((result) => {
        setCurrentMyNewsItems(result.items);
        setMyNewsItemCounts((prev) => ({ ...prev, [myNewsTab]: result.count }));
      })
      .catch((err) => {
        console.error(`Error fetching content for sub-tab ${myNewsTab}:`, err);
        setMyNewsError(
          `Lỗi tải tin ${myNewsTab}: ${err.message || "Unknown error"}`
        );
        setCurrentMyNewsItems([]);
      })
      .finally(() => setIsLoadingMyNewsContent(false));
  }, [
    mainTab,
    myNewsTab,
    currentUserId,
    fetchMyNewsData,
    isLoadingMyNewsCounts,
    isLoadingMyNewsContent,
  ]);

  useEffect(() => {
    if (mainTab === "deletedNews" && currentUserId) {
      fetchDeletedNews(deletedNewsPagination.page, deletedNewsPagination.size);
    } else if (mainTab !== "deletedNews" || !currentUserId) {
      setDeletedNewsItems([]);
      setIsLoadingDeleted(false);
      setDeletedNewsError("");
      setDeletedNewsPagination({
        page: 0,
        size: 10,
        totalPages: 0,
        totalElements: 0,
      });
    }
  }, [
    mainTab,
    currentUserId,
    fetchDeletedNews,
    deletedNewsPagination.page,
    deletedNewsPagination.size,
  ]);


  const handleOpenCreateModal = (itemToEdit: NewsItem | null = null) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thực hiện.");
      return;
    }
    setEditingNewsItem(itemToEdit);
    setIsCreateModalOpen(true);
  };
  const handleNewsModalClose = () => {
     if (!isSubmittingNews) {
      setIsCreateModalOpen(false);
      setEditingNewsItem(null);
    }
  };

  const handleNewsFormSubmit = useCallback(
    async (formData: NewsFormData) => {
      if (!currentUserId) {
        toast.error("Không thể thực hiện. Thiếu ID người dùng.");
        return;
      }
      setIsSubmittingNews(true);
      const isEditing = !!editingNewsItem;
      const toastId = toast.loading(
        isEditing ? "Đang cập nhật..." : "Đang tạo..."
      );

      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Vui lòng đăng nhập lại.");

        const apiFormData = new FormData();
        apiFormData.append("title", formData.title);
        apiFormData.append("content", formData.content);

        if (formData.imageFile instanceof File) {
          apiFormData.append("coverImage", formData.imageFile);
        }
        if (formData.eventId) {
          apiFormData.append("eventId", formData.eventId);
        }

        let API_URL = "${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news";
        let method = "POST";

        if (isEditing && editingNewsItem) {
          API_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/${editingNewsItem.id}?UserId=${currentUserId}`;
          method = "PUT";
        } else {
          apiFormData.append("type", "NEWS");
          apiFormData.append("featured", "false");
          apiFormData.append("pinned", "false");
          apiFormData.append("createdById", currentUserId);
        }

        const headers: HeadersInit = { Authorization: `Bearer ${token}` };

        const response = await fetch(API_URL, {
          method: method,
          headers: headers,
          body: apiFormData,
        });

        const responseData = await response.json();

        if (!response.ok || responseData.code !== 1000) {
          console.error("API Error Response:", responseData);
          throw new Error(
            responseData.message ||
              `Lỗi ${isEditing ? "cập nhật" : "tạo"} (${response.status})`
          );
        }

        toast.success(
          responseData.message ||
            (isEditing ? "Cập nhật thành công!" : "Tạo mới thành công!"),
          { id: toastId }
        );
        handleNewsModalClose();
        setRefreshMyNewsTrigger((prev) => prev + 1);
        if (!isEditing) {
          setMyNewsTab("pending");
        }
      } catch (error: any) {
        console.error(`Lỗi ${isEditing ? "cập nhật" : "tạo"}:`, error);
        toast.error(
          `${isEditing ? "Cập nhật" : "Tạo"} thất bại: ${error.message}`,
          { id: toastId }
        );
      } finally {
        setIsSubmittingNews(false);
      }
    },
    [currentUserId, editingNewsItem, handleNewsModalClose]
  );

  const executeDeleteNews = useCallback(
    async (newsId: string, newsTitle: string) => {
      if (isDeleting || !currentUserId) return;
      setIsDeleting(newsId);
      const toastId = toast.loading(`Đang xóa tin tức "${newsTitle}"...`);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Vui lòng đăng nhập lại.");

        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/${newsId}?deletedById=${currentUserId}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 204 || res.ok) {
          toast.success(`Đã xóa tin tức "${newsTitle}"`, { id: toastId });
          setRefreshMyNewsTrigger((prev) => prev + 1);
          setViewingNewsDetails(null);
        } else {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.message || `Lỗi xóa tin tức (${res.status})`);
        }
      } catch (err: any) {
        console.error(`Lỗi xóa tin ${newsId}:`, err);
        toast.error(`Xóa thất bại: ${err.message}`, { id: toastId });
      } finally {
        setIsDeleting(null);
        setConfirmationState((prev) => ({ ...prev, isOpen: false }));
      }
    },
    [isDeleting, currentUserId]
  );


  const handleDeleteNews = (newsId: string, newsTitle: string) => {
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận xóa",
      message: (
        <>
          Bạn chắc chắn muốn xóa tin tức <br />
          <strong className="text-red-600">"{newsTitle}"</strong>? <br />
          <span className="text-xs">
            (Tin tức sẽ được chuyển vào thùng rác)
          </span>
        </>
      ),
      confirmText: "Xác nhận xóa",
      cancelText: "Hủy",
      confirmVariant: "danger",
      onConfirm: () => executeDeleteNews(newsId, newsTitle),
      onCancel: () =>
        setConfirmationState((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const executeRestoreNews = useCallback(
    async (newsId: string) => {
        if (isRestoring) return;
      setIsRestoring(newsId);
      const originalTitle =
        deletedNewsItems.find((n) => n.id === newsId)?.title || newsId;
      const toastId = toast.loading(
        `Đang khôi phục tin tức "${originalTitle}"...`
      );
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Vui lòng đăng nhập lại.");
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/${newsId}/restore`;
        const res = await fetch(url, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(
            d?.message || `Lỗi khôi phục tin tức (${res.status})`
          );
        }
        toast.success(`Đã khôi phục tin tức "${originalTitle}"`, {
          id: toastId,
        });
        fetchDeletedNews(
          deletedNewsPagination.page,
          deletedNewsPagination.size
        );
        setRefreshMyNewsTrigger((prev) => prev + 1);
      } catch (err: any) {
        console.error(`Lỗi khôi phục tin ${newsId}:`, err);
        toast.error(`Khôi phục thất bại: ${err.message}`, { id: toastId });
      } finally {
        setIsRestoring(null);
        setConfirmationState((prev) => ({ ...prev, isOpen: false }));
      }
    },
    [
      isRestoring,
      fetchDeletedNews,
      deletedNewsPagination.page,
      deletedNewsPagination.size,
      deletedNewsItems,
    ]
  );


  const handleRestoreNews = (newsId: string, newsTitle: string) => {
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận khôi phục",
      message: (
        <>
          Bạn chắc chắn muốn khôi phục tin tức <br />
          <strong className="text-blue-600">"{newsTitle}"</strong>?
        </>
      ),
      confirmText: "Khôi phục",
      cancelText: "Hủy",
      confirmVariant: "primary",
      onConfirm: () => executeRestoreNews(newsId),
      onCancel: () =>
        setConfirmationState((prev) => ({ ...prev, isOpen: false })),
    });
  };

  const processedMyNews = useMemo(() => {
    let itemsToProcess = [...currentMyNewsItems];
    if (myNewsTimeFilterOption !== "all") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      itemsToProcess = itemsToProcess.filter((item) => {
        const dateStrToUse = item.createdAt;
        if (!dateStrToUse) return false;
        try {
          const itemDate = new Date(dateStrToUse);
          if (isNaN(itemDate.getTime())) return false;

          switch (myNewsTimeFilterOption) {
            case "today":
              return itemDate >= todayStart && itemDate <= todayEnd;
            case "thisWeek":
              const { startOfWeek, endOfWeek } = getWeekRange(new Date());
              return itemDate >= startOfWeek && itemDate <= endOfWeek;
            case "thisMonth":
              const { startOfMonth, endOfMonth } = getMonthRange(new Date());
              return itemDate >= startOfMonth && itemDate <= endOfMonth;
            case "dateRange":
              if (!myNewsStartDateFilter || !myNewsEndDateFilter) return true;
              const start = new Date(myNewsStartDateFilter);
              start.setHours(0, 0, 0, 0);
              const end = new Date(myNewsEndDateFilter);
              end.setHours(23, 59, 59, 999);
              if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end)
                return true;
              return itemDate >= start && itemDate <= end;
            default:
              return true;
          }
        } catch (e) {
          console.error("Lỗi parse ngày:", dateStrToUse, e);
          return false;
        }
      });
    }

    if (myNewsSearchTerm.trim()) {
      const lowerSearchTerm = myNewsSearchTerm.trim().toLowerCase();
      itemsToProcess = itemsToProcess.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerSearchTerm) ||
          (item.summary &&
            item.summary.toLowerCase().includes(lowerSearchTerm)) ||
          (item.content && item.content.toLowerCase().includes(lowerSearchTerm))
      );
    }
    itemsToProcess.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();

      switch (myNewsSortOrder) {
        case "oldest":
          return dateA - dateB;
        case "az":
          return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });
        case "za":
          return b.title.localeCompare(a.title, "vi", { sensitivity: "base" });
        case "newest":
        default:
          return dateB - dateA;
      }
    });
    return itemsToProcess;
  }, [
    currentMyNewsItems,
    myNewsSearchTerm,
    myNewsSortOrder,
    myNewsTimeFilterOption,
    myNewsStartDateFilter,
    myNewsEndDateFilter,
  ]);

  const handleMyNewsStartDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMyNewsStartDateFilter(e.target.value);
    if (myNewsEndDateFilter && e.target.value > myNewsEndDateFilter) {
      setMyNewsEndDateFilter("");
    }
  };
  const handleMyNewsEndDateChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newEndDate = e.target.value;
    if (myNewsStartDateFilter && newEndDate < myNewsStartDateFilter) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setMyNewsEndDateFilter(newEndDate);
    }
  };
  const handleDeletedPageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < deletedNewsPagination.totalPages)
      setDeletedNewsPagination((prev) => ({ ...prev, page: newPage }));
  };

  const displayMyNewsCount = (status: "approved" | "pending" | "rejected") => {
    const count = myNewsItemCounts[status];
    if (isLoadingMyNewsCounts && count === null) return "...";
    if (count === null && !isLoadingMyNewsCounts) return "?";
    return count ?? 0;
  };

  const renderNewsDetails = (item: NewsItem) => {
    const isDeleted = mainTab === "deletedNews";
    const processing =
      isDeleting === item.id || isRestoring === item.id || isSubmittingNews;
    const canEdit = !isDeleted && user?.id === item.createdBy?.id;
    const canDelete = !isDeleted && user?.id === item.createdBy?.id;
    const canRestore = isDeleted && user?.id === item.createdBy?.id;

    return (
      <div className="p-1  overflow-y-auto mb-4 pr-2 bg-white p-4 rounded-lg shadow border scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
        <button
          onClick={() => setViewingNewsDetails(null)}
          className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer p-1 rounded hover:bg-blue-50"
        >
          <ChevronLeftIcon className="h-6 w-6 " /> Quay lại danh sách
        </button>

        <h3 className="text-xl font-bold text-gray-800 mb-4">{item.title}</h3>

        {item.imageUrl && (
          <div className="mb-4 relative w-full h-64 md:h-80 rounded overflow-hidden bg-gray-50">
            <Image
              src={item.imageUrl}
              alt={item.title}
              layout="fill"
              objectFit="contain"
              className="bg-gray-100"
            />
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-700 mb-4">
          {!isDeleted && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Trạng thái:
              </strong>{" "}
              {renderStatusBadge(item.status)}
            </p>
          )}
          {!isDeleted && item.status === "REJECTED" && item.rejectionReason && (
            <p className="text-red-600">
              <strong className="font-medium text-red-800 w-28 inline-block">
                Lý do từ chối:
              </strong>{" "}
              {item.rejectionReason}
            </p>
          )}
          <p>
            <strong className="font-medium text-gray-900 w-28 inline-block">
              Ngày tạo:
            </strong>{" "}
            {formatDate(item.createdAt)}
          </p>
          {!isDeleted && item.publishedAt && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Ngày đăng:
              </strong>{" "}
              {formatDate(item.publishedAt)}
            </p>
          )}
          {isDeleted && item.deletedAt && (
            <p className="text-red-700">
              <strong className="font-medium text-red-900 w-28 inline-block">
                Ngày xóa:
              </strong>{" "}
              {formatDate(item.deletedAt)}
            </p>
          )}
          {isDeleted && item.deletedBy && (
            <p className="text-red-700">
              <strong className="font-medium text-red-900 w-28 inline-block">
                Người xóa:
              </strong>{" "}
              {item.deletedBy.lastName} {item.deletedBy.firstName} (
              {item.deletedBy.username})
            </p>
          )}
          {item.event && (
            <p>
              <strong className="font-medium text-gray-900 w-28 inline-block">
                Sự kiện liên quan:
              </strong>{" "}
              {item.event.name || item.event.id}
            </p>
          )}
        </div>

        {item.content && (
          <div className="prose prose-sm max-w-none mt-4 pt-4 border-t">
            <h4 className="font-semibold mb-2 text-gray-800">
              Nội dung chi tiết:
            </h4>
            <div dangerouslySetInnerHTML={{ __html: item.content }} />
          </div>
        )}

        <div className="mt-6 pt-4 border-t flex justify-end gap-2">
          {canRestore && (
            <button
              onClick={() => handleRestoreNews(item.id, item.title)}
              disabled={!!isRestoring || processing}
              className={`px-4 py-2 rounded cursor-pointer text-white shadow-sm transition text-sm font-medium flex items-center gap-1.5 ${
                isRestoring === item.id
                  ? "bg-blue-300 cursor-wait"
                  : "bg-blue-500 hover:bg-blue-600 cursor-pointer"
              } ${
                isRestoring && isRestoring !== item.id
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isRestoring === item.id ? (
                <ReloadIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ReloadIcon className="h-4 w-4" />
              )}
              {isRestoring === item.id ? "Đang khôi phục..." : "Khôi phục"}
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => handleOpenCreateModal(item)}
              disabled={!!isDeleting || processing}
              className={`px-4 py-2 rounded text-white shadow-sm transition text-sm font-medium flex items-center gap-1.5 ${
                isDeleting || processing
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-500 hover:bg-indigo-600 cursor-pointer"
              }`}
            >
              <Pencil1Icon className="h-4 w-4" /> Sửa tin
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteNews(item.id, item.title)}
              disabled={!!isDeleting || processing}
              className={`px-4 py-2 rounded text-white shadow-sm transition text-sm font-medium flex items-center gap-1.5 ${
                isDeleting === item.id
                  ? "bg-red-300 cursor-wait"
                  : "bg-red-500 hover:bg-red-600 cursor-pointer"
              } ${
                isDeleting && isDeleting !== item.id
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isDeleting === item.id ? (
                <ReloadIcon className="h-4 w-4 animate-spin" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
              {isDeleting === item.id ? "Đang xóa..." : "Xóa tin"}
            </button>
          )}
          <button
            onClick={() => setViewingNewsDetails(null)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer"
          >
            Đóng xem chi tiết
          </button>
        </div>
      </div>
    );
  };
  const renderMyNewsList = () => {
    const isLoading = isLoadingMyNewsContent;
    const error = myNewsError;
    const items = processedMyNews;
    const viewMode = myNewsViewMode;

    if (isLoading && items.length === 0)
      return (
        <p className="text-gray-500 italic text-center py-4">
          Đang tải nội dung...
        </p>
      );

    if (error && items.length === 0 && !isLoadingMyNewsCounts && !isLoading)
      return (
        <p className="text-red-500 italic text-center py-4 bg-red-50 border border-red-200 rounded p-3">{`Lỗi tải danh sách: ${error}`}</p>
      );

    const noItemsMatchFilters =
      items.length === 0 &&
      !isLoading &&
      currentMyNewsItems.length > 0 &&
      (myNewsSearchTerm || myNewsTimeFilterOption !== "all");
    const tabIsEmpty =
      !isLoadingMyNewsCounts &&
      myNewsItemCounts[myNewsTab] === 0 &&
      items.length === 0 &&
      !noItemsMatchFilters;

    const renderNoItemsMessage = () => (
      <p className="text-gray-500 italic text-center py-6 col-span-full">
        {
          noItemsMatchFilters
            ? "Không tìm thấy tin tức nào khớp."
            : tabIsEmpty
            ? "Không có tin tức nào trong mục này."
            : error && items.length === 0 && !isLoading
            ? `Lỗi tải nội dung: ${error}`
            : "Không có tin tức."
        }
      </p>
    );

    if (items.length === 0 && !isLoading) {
      return renderNoItemsMessage();
    }

    return (
      <>
        {viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white shadow rounded-lg flex flex-col justify-between border border-gray-200 hover:shadow-md transition-shadow duration-150 group"
              >
                <div
                  onClick={() => setViewingNewsDetails(item)}
                  className="cursor-pointer flex flex-col flex-grow h-full"
                >
                  {item.imageUrl && (
                    <div className="relative w-full h-80 mb-3 rounded overflow-hidden bg-gray-50">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        layout="fill"
                        objectFit="cover"
                        className="bg-gray-100"
                        priority={true}
                      />
                    </div>
                  )}
                  <div className="flex-grow">
                    <h3 className="font-semibold text-base text-gray-800 line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                      {item.summary}
                    </p>
                  </div>
                  <div className="mt-auto pt-2 border-t border-gray-100 text-xs space-y-1">
                    <p className="text-gray-500 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 opacity-70" />{" "}
                      {formatDate(item.createdAt)}
                    </p>
                    <div>{renderStatusBadge(item.status)}</div>
                    {item.status === "REJECTED" && item.rejectionReason && (
                      <p
                        className="text-xs text-red-500 mt-1 pt-1 border-t border-dashed border-red-100 truncate"
                        title={item.rejectionReason}
                      >
                        <span className="font-medium">Lý do:</span>{" "}
                        {item.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end gap-2">
                  {user?.id === item.createdBy?.id && (
                    <>
                      <button
                        onClick={() => handleOpenCreateModal(item)}
                        disabled={isDeleting === item.id}
                        className={`p-1.5 rounded text-indigo-600 hover:bg-indigo-100 transition duration-150 ease-in-out flex items-center gap-1 text-xs font-medium ${
                          isDeleting === item.id
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                      >
                        <Pencil1Icon className="h-3.5 w-3.5" /> Sửa
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item.id, item.title)}
                        disabled={isDeleting === item.id}
                        className={`p-1.5 rounded text-red-600 hover:bg-red-100 transition duration-150 ease-in-out flex items-center gap-1 text-xs font-medium ${
                          isDeleting === item.id
                            ? "opacity-50 cursor-wait"
                            : "cursor-pointer"
                        }`}
                      >
                        {isDeleting === item.id ? (
                          <ReloadIcon className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <TrashIcon className="h-3.5 w-3.5" />
                        )}
                        {isDeleting === item.id ? "Đang xóa" : "Xóa"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="px-3 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors duration-150 ease-in-out"
                >
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => setViewingNewsDetails(item)}
                  >
                    {item.imageUrl && (
                      <div className="relative w-16 h-12 rounded overflow-hidden flex-shrink-0 hidden sm:block bg-gray-50">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          layout="fill"
                          objectFit="cover"
                          className="bg-gray-100"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm md:text-base text-gray-800 line-clamp-1">
                        {item.title}
                      </p>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 opacity-70" />{" "}
                          {formatDate(item.createdAt)}
                        </span>
                        <span>{renderStatusBadge(item.status)}</span>
                      </div>
                      {item.status === "REJECTED" && item.rejectionReason && (
                        <p
                          className="text-xs text-red-500 mt-1.5 truncate"
                          title={item.rejectionReason}
                        >
                          <span className="font-medium">Lý do:</span>{" "}
                          {item.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0 flex items-center gap-2">
                    {user?.id === item.createdBy?.id && (
                      <>
                        <button
                          onClick={() => handleOpenCreateModal(item)}
                          disabled={isDeleting === item.id}
                          className={`p-1.5 rounded text-indigo-600 hover:bg-indigo-100 transition duration-150 ease-in-out flex items-center gap-1 text-xs font-medium ${
                            isDeleting === item.id
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                        >
                          <Pencil1Icon className="h-3.5 w-3.5" /> Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteNews(item.id, item.title)}
                          disabled={isDeleting === item.id}
                          className={`p-1.5 rounded text-red-600 hover:bg-red-100 transition duration-150 ease-in-out flex items-center gap-1 text-xs font-medium ${
                            isDeleting === item.id
                              ? "opacity-50 cursor-wait"
                              : "cursor-pointer"
                          }`}
                        >
                          {isDeleting === item.id ? (
                            <ReloadIcon className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <TrashIcon className="h-3.5 w-3.5" />
                          )}
                          {isDeleting === item.id ? "Đang xóa" : "Xóa"}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  };

  const renderDeletedNewsList = () => {
    const isLoading = isLoadingDeleted;
    const error = deletedNewsError;
    const items = deletedNewsItems;
    const viewMode = deletedNewsViewMode;
    const { page, totalPages } = deletedNewsPagination;

    if (isLoading)
      return (
        <p className="text-gray-500 italic text-center py-4">
          Đang tải tin đã xóa...
        </p>
      );
    if (error && items.length === 0)
      return (
        <p className="text-red-500 italic text-center py-4 bg-red-50 border border-red-200 rounded p-3">
          {error}
        </p>
      );
    if (items.length === 0)
      return (
        <p className="text-gray-500 italic text-center py-6">
          Không có tin tức nào đã xóa.
        </p>
      );

    return (
      <>
        <div className="flex justify-end mb-3">
          <div className="flex">
            <button
              onClick={() => setDeletedNewsViewMode("list")}
              title="Chế độ danh sách"
              className={`flex-1 md:flex-none cursor-pointer p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${
                deletedNewsViewMode === "list"
                  ? "bg-red-600 border-red-700 text-white shadow-sm z-10"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setDeletedNewsViewMode("card")}
              title="Chế độ thẻ"
              className={`flex-1 md:flex-none cursor-pointer p-2 rounded-r-md border transition duration-150 ease-in-out ${
                deletedNewsViewMode === "card"
                  ? "bg-red-600 border-red-700 text-white shadow-sm z-10"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <Component1Icon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white shadow rounded-lg flex flex-col justify-between border border-gray-200 relative group hover:shadow-md transition-shadow duration-150"
              >
                <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {user?.id === item.createdBy?.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestoreNews(item.id, item.title);
                      }}
                      disabled={!!isRestoring}
                      title="Khôi phục tin tức"
                      className={`p-1.5 rounded-full cursor-pointer bg-blue-100 text-blue-600 hover:bg-blue-200 transition duration-150 ease-in-out ${
                        isRestoring === item.id
                          ? "opacity-50 cursor-wait animate-pulse"
                          : ""
                      } ${
                        isRestoring && isRestoring !== item.id
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {isRestoring === item.id ? (
                        <ReloadIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <ReloadIcon className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>

                <div
                  onClick={() => setViewingNewsDetails(item)}
                  className="cursor-pointer flex flex-col flex-grow h-full"
                >
                  {item.imageUrl && (
                    <div className="relative w-full h-36 mb-3 rounded overflow-hidden bg-gray-50 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        layout="fill"
                        objectFit="cover"
                        className="bg-gray-100"
                      />
                    </div>
                  )}
                  <div className="flex-grow">
                    <h3 className="font-semibold text-base text-gray-600 line-clamp-2 mb-1">
                      {item.title}
                    </h3>
                  </div>
                  <div className="mt-auto pt-2 border-t border-gray-100 text-xs space-y-1 text-gray-500">
                    <p className="flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3 opacity-70" />{" "}
                      <span>Tạo: {formatDate(item.createdAt)}</span>
                    </p>
                    {item.deletedAt && (
                      <p className="flex items-center gap-1 text-red-600">
                        <TrashIcon className="w-3 h-3 opacity-70" />{" "}
                        <span>Xóa: {formatDate(item.deletedAt)}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="px-3 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors duration-150 ease-in-out"
                >
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => setViewingNewsDetails(item)}
                  >
                    {item.imageUrl && (
                      <div className="relative w-16 h-12 rounded overflow-hidden flex-shrink-0 hidden sm:block bg-gray-50 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Image
                          src={item.imageUrl}
                          alt={item.title}
                          layout="fill"
                          objectFit="cover"
                          className="bg-gray-100"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm md:text-base text-gray-600 line-clamp-1">
                        {item.title}
                      </p>
                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 opacity-70" /> Tạo:{" "}
                          {formatDate(item.createdAt)}
                        </span>
                        {item.deletedAt && (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <TrashIcon className="w-3 h-3 opacity-70" /> Xóa:{" "}
                            {formatDate(item.deletedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0">
                    {user?.id === item.createdBy?.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreNews(item.id, item.title);
                        }}
                        disabled={!!isRestoring}
                        title="Khôi phục tin tức"
                        className={`p-1.5 rounded cursor-pointer text-blue-600 hover:bg-blue-100 transition duration-150 ease-in-out flex items-center gap-1 text-xs font-medium ${
                          isRestoring === item.id
                            ? "opacity-50 cursor-wait"
                            : ""
                        } ${
                          isRestoring && isRestoring !== item.id
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {isRestoring === item.id ? (
                          <ReloadIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <ReloadIcon className="h-4 w-4" />
                        )}
                        <span>Khôi phục</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center space-x-4">
            <button
              onClick={() => handleDeletedPageChange(page - 1)}
              disabled={page === 0}
              className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Trang trước"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              Trang {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => handleDeletedPageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Trang sau"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </>
    );
  };


  return (
    <div className="flex flex-col h-270 p-3 md:p-5 bg-gray-50">
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => {
            setMainTab("myNews");
            setViewingNewsDetails(null);
          }}
          className={`pb-2 font-semibold cursor-pointer text-base md:text-lg transition-colors duration-150 ${
            mainTab === "myNews"
              ? "border-b-2 border-amber-500 text-amber-600"
              : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
          }`}
        >
          Bảng tin của tôi
        </button>
        <button
          onClick={() => {
            setMainTab("deletedNews");
            setViewingNewsDetails(null);
          }}
          className={`pb-2 font-semibold cursor-pointer text-base md:text-lg transition-colors duration-150 ${
            mainTab === "deletedNews"
              ? "border-b-2 border-red-500 text-red-600"
              : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
          }`}
        >
          <TrashIcon className="inline-block mr-1 h-5 w-5" /> Tin đã xóa
        </button>
      </div>

      <div className="flex flex-col flex-grow min-h-0">
        {viewingNewsDetails ? (
          renderNewsDetails(viewingNewsDetails)
        ) : mainTab === "myNews" ? (
          <>
            <div className="flex flex-wrap justify-between items-center mb-4 flex-shrink-0 gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-bold text-amber-600">
                  Quản lý Tin tức
                </h2>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || isLoadingMyNewsCounts || isLoadingMyNewsContent || !!isDeleting || !!isRestoring || isSubmittingNews}
                    className="p-1.5 sm:p-2 cursor-pointer border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
                    title="Làm mới danh sách tin tức"
                >
                    {isRefreshing ? (
                        <ReloadIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-amber-600" />
                    ) : (
                        <ReloadIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                    )}
                </button>
              </div>
              <button
                onClick={() => handleOpenCreateModal(null)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 cursor-pointer bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-1.5 transition-colors duration-150"
              >
                <PlusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Tạo Bảng Tin
              </button>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-2 mb-5 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => setMyNewsTab("approved")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base transition-colors duration-150 ${
                  myNewsTab === "approved"
                    ? "border-b-2 border-green-500 text-green-600"
                    : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
                }`}
              >
                ✅ Đã duyệt ({displayMyNewsCount("approved")})
              </button>
              <button
                onClick={() => setMyNewsTab("pending")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base transition-colors duration-150 ${
                  myNewsTab === "pending"
                    ? "border-b-2 border-yellow-500 text-yellow-600"
                    : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
                }`}
              >
                ⏳ Chờ duyệt ({displayMyNewsCount("pending")})
              </button>
              <button
                onClick={() => setMyNewsTab("rejected")}
                className={`pb-2 font-semibold cursor-pointer text-sm md:text-base transition-colors duration-150 ${
                  myNewsTab === "rejected"
                    ? "border-b-2 border-red-500 text-red-600"
                    : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-300"
                }`}
              >
                ❌ Từ chối ({displayMyNewsCount("rejected")})
              </button>
            </div>

            <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="relative lg:col-span-1">
                  <label
                    htmlFor="searchMyNews"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Tìm kiếm
                  </label>
                  <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
                    <MagnifyingGlassIcon />
                  </span>
                  <input
                    type="text"
                    id="searchMyNews"
                    placeholder="Tiêu đề, nội dung..."
                    value={myNewsSearchTerm}
                    onChange={(e) => setMyNewsSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sortMyNews"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Sắp xếp
                  </label>
                  <select
                    id="sortMyNews"
                    value={myNewsSortOrder}
                    onChange={(e) => setMyNewsSortOrder(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.5rem center",
                      backgroundSize: "1.5em 1.5em",
                    }}
                  >
                    <option value="newest">Ngày tạo mới nhất</option>
                    <option value="oldest">Ngày tạo cũ nhất</option>
                    <option value="az"> A - Z</option>
                    <option value="za"> Z - A</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="timeFilterMyNews"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Lọc thời gian (Ngày tạo)
                  </label>
                  <select
                    id="timeFilterMyNews"
                    value={myNewsTimeFilterOption}
                    onChange={(e) =>
                      setMyNewsTimeFilterOption(e.target.value as any)
                    }
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
                     style={{
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.5rem center",
                      backgroundSize: "1.5em 1.5em",
                    }}
                  >
                    <option value="all">Tất cả</option>
                    <option value="today">Hôm nay</option>
                    <option value="thisWeek">Tuần này</option>
                    <option value="thisMonth">Tháng này</option>
                    <option value="dateRange">Khoảng ngày</option>
                  </select>
                </div>
                <div className="flex items-end justify-start md:justify-end gap-2">
                  <div className="flex w-full md:w-auto">
                    <button
                      onClick={() => setMyNewsViewMode("card")}
                      title="Chế độ thẻ"
                      className={`flex-1 md:flex-none cursor-pointer p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out ${
                        myNewsViewMode === "card"
                          ? "bg-amber-600 border-amber-700 text-white shadow-sm z-10"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      <Component1Icon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setMyNewsViewMode("list")}
                      title="Chế độ danh sách"
                      className={`flex-1 md:flex-none cursor-pointer p-2 rounded-r-md border transition duration-150 ease-in-out ${
                        myNewsViewMode === "list"
                          ? "bg-amber-600 border-amber-700 text-white shadow-sm z-10"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      <ListBulletIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              {myNewsTimeFilterOption === "dateRange" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-100">
                  <div>
                    <label
                      htmlFor="startDateFilterMyNews"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      <span className="inline-block mr-1">🗓️</span> Từ ngày
                    </label>
                    <input
                      type="date"
                      id="startDateFilterMyNews"
                      value={myNewsStartDateFilter}
                      onChange={handleMyNewsStartDateChange}
                      max={myNewsEndDateFilter || undefined}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm bg-white"
                      aria-label="Ngày bắt đầu lọc"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="endDateFilterMyNews"
                      className="block text-xs font-medium text-gray-700 mb-1"
                    >
                      <span className="inline-block mr-1">🗓️</span> Đến ngày
                    </label>
                    <input
                      type="date"
                      id="endDateFilterMyNews"
                      value={myNewsEndDateFilter}
                      onChange={handleMyNewsEndDateChange}
                      min={myNewsStartDateFilter || undefined}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 shadow-sm bg-white"
                      aria-label="Ngày kết thúc lọc"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-y-auto flex-grow mb-1 pr-1 min-h-[300px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {renderMyNewsList()}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
              <h2 className="text-xl md:text-2xl font-bold text-red-600">
                Tin tức đã xóa
              </h2>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing || isLoadingDeleted || !!isRestoring }
                    className="p-1.5 sm:p-2 cursor-pointer border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
                    title="Làm mới danh sách tin đã xóa"
                >
                    {isRefreshing ? (
                        <ReloadIcon className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-red-600" />
                    ) : (
                        <ReloadIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    )}
                </button>
            </div>
            <div className="overflow-y-auto flex-grow mb-1 pr-1 min-h-[300px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {renderDeletedNewsList()}
            </div>
          </>
        )}
      </div>

      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        confirmVariant={confirmationState.confirmVariant}
        onConfirm={confirmationState.onConfirm}
        onCancel={confirmationState.onCancel}
      />

      <CreateNewsModal
        isOpen={isCreateModalOpen}
        onClose={handleNewsModalClose}
        onSubmit={handleNewsFormSubmit}
        isSubmitting={isSubmittingNews}
        editMode={!!editingNewsItem}
        initialData={editingNewsItem}
      />
    </div>
  );
};

export default MyNewsTabContent;