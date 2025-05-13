import React, { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
// Giả sử các types này được định nghĩa ở đúng đường dẫn
import { EventDisplayInfo as MainEvent } from "../types/appTypes";
import UpdateEventModal from "../modals/UpdatEventAdminHome"; // Đảm bảo đường dẫn đúng
import ConfirmationDialog from "../../../utils/ConfirmationDialog"; // Đảm bảo đường dẫn đúng

import {
  ReloadIcon,
  CheckCircledIcon,
  ClockIcon,
  CalendarIcon,
  ArchiveIcon,
  ListBulletIcon,
  GridIcon,
  InfoCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  Pencil2Icon,
  PersonIcon,
} from "@radix-ui/react-icons";

// --- Interfaces (giữ nguyên từ code gốc của bạn) ---

export interface Role {
  id:string;
  name?: string;

}

export interface User {
  id: string;
  roles?: Role[];
  firstName?: string;
  lastName?: string;
  username?: string;
  dob?: string;
  avatar?: string;
  email?: string;
  gender?: boolean;
}

interface OrganizerInfo {
  userId: string;
  roleName?:  Role[];
  positionName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  resolvedName?: string; 
}

interface ParticipantInfo {
  userId: string;
  roleId?:  Role[];
  roleName?: string;
  positionName?: string;
  fullName?: string; 
  lastName?: string; 
  firstName?: string; 
  resolvedName?: string; 
}

export interface EventDisplayInfo {
  id: string;
  title: string;
  name?: string; 
  date: string;
  time?: string;
  location: string;
  description: string;
  content?: string;
  purpose?: string;
  speaker?: string; 
  image?: string; 
  avatarUrl?: string | null;
  createdAt?: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  createdBy?: string;
  organizers?: OrganizerInfo[];
  participants?: ParticipantInfo[]; // **Quan trọng**: Đảm bảo type này khớp với dữ liệu API trả về ban đầu
  attendees?: {
    userId: string;
    fullName?: string;
    studentCode?: string;
    checkedInAt?: string | null;
    attending?: boolean;
  }[];
  maxAttendees?: number | null;
  currentAttendeesCount?: number;
}


interface ApiResponse {
  code: number;
  message?: string;
  result: any;
}

interface UserInfoFromApi {
  id: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
}

// --- Props Interface ---
interface AdminHomeTabContentProps {
  events: EventDisplayInfo[];
  isLoading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  sortOption: string;
  setSortOption: (value: string) => void;
  timeFilterOption: string;
  setTimeFilterOption: (value: string) => void;
  startDateFilter: string;
  setStartDateFilter: (value: string) => void;
  endDateFilter: string;
  setEndDateFilter: (value: string) => void;
  selectedEvent: EventDisplayInfo | null;
  onEventClick: (event: EventDisplayInfo) => void;
  onBackToList: () => void;
  onRefreshEvents: () => Promise<void>;
  currentUserId: string | null;
}

// --- Helper Functions (giữ nguyên từ code gốc của bạn) ---

type EventStatus = "upcoming" | "ongoing" | "ended";

const fetchUserFullNameById = async (userId: string): Promise<string> => {
  if (!userId || userId.trim() === "") {
    return "Không xác định";
  }
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/notoken/${userId}`
    );
    if (!response.ok) {
      try {
        const errorData = await response.json();
        return `ID: ${userId} (Lỗi ${response.status}: ${
          errorData.message || "Không có thông điệp"
        })`;
      } catch (e) {
        return `ID: ${userId} (Lỗi ${response.status})`;
      }
    }
    const apiResponseData: ApiResponse = await response.json();
    if (apiResponseData && apiResponseData.result) {
      const userData = apiResponseData.result as UserInfoFromApi;
      const lastNameCleaned = userData.lastName ? userData.lastName.trim() : "";
      const fullName = `${lastNameCleaned || ""} ${
        userData.firstName || ""
      }`.trim();
      return fullName || `ID: ${userId}`;
    } else {
      return `ID: ${userId} (Dữ liệu không hợp lệ: ${
        apiResponseData.message || "Không có thông điệp"
      })`;
    }
  } catch (error) {
    console.error("Error fetching or parsing user name for ID:", userId, error);
    return `ID: ${userId} (Lỗi xử lý)`;
  }
};

const UserDisplayNameById: React.FC<{
  userId: string | null | undefined;
  prefix?: string;
  defaultText?: string;
}> = ({ userId, prefix = "", defaultText = "Đang tải..." }) => {
  const [displayName, setDisplayName] = useState<string>(() =>
    userId ? defaultText : "N/A"
  );

  useEffect(() => {
    if (userId && userId.trim() !== "") {
      setDisplayName(defaultText);
      let isActive = true;
      fetchUserFullNameById(userId)
        .then((name) => {
          if (isActive) {
            setDisplayName(name);
          }
        })
        .catch(() => {
          if (isActive) {
            setDisplayName(`ID: ${userId} (Lỗi)`);
          }
        });
      return () => {
        isActive = false;
      };
    } else {
      setDisplayName("N/A");
    }
  }, [userId, defaultText]);

  return (
    <>
      {prefix}
      {displayName}
    </>
  );
};

const getEventStatus = (eventDateStr?: string): EventStatus => {
  if (!eventDateStr) return "upcoming";
  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) return "upcoming"; // Xử lý ngày không hợp lệ
    const eventDateStart = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    if (eventDateStart < todayStart) return "ended";
    else if (eventDateStart > todayStart) return "upcoming";
    else return "ongoing";
  } catch (e) {
    console.error(
      "Error parsing event date for getEventStatus:",
      eventDateStr,
      e
    );
    return "upcoming"; // Trả về mặc định nếu có lỗi
  }
};

const getStatusBadgeClasses = (status: EventStatus): string => {
  const base =
    "px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1";
  switch (status) {
    case "ongoing":
      return `${base} bg-green-100 text-green-800`;
    case "upcoming":
      return `${base} bg-blue-100 text-blue-800`;
    case "ended":
      return `${base} bg-gray-100 text-gray-700`;
    default:
      return `${base} bg-gray-100 text-gray-600`;
  }
};

const getStatusText = (status: EventStatus): string => {
  switch (status) {
    case "ongoing":
      return "Đang diễn ra";
    case "upcoming":
      return "Sắp diễn ra";
    case "ended":
      return "Đã kết thúc";
    default:
      return "";
  }
};

const getStatusIcon = (status: EventStatus) => {
  switch (status) {
    case "ongoing":
      return <CheckCircledIcon className="w-3 h-3" />;
    case "upcoming":
      return <ClockIcon className="w-3 h-3" />;
    case "ended":
      return <ArchiveIcon className="w-3 h-3" />;
    default:
      return null;
  }
};

const getApprovalStatusBadgeColor = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "bg-green-100 text-green-800 border border-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

const getApprovalStatusText = (status?: string) => {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return "Đã duyệt";
    case "PENDING":
      return "Chờ duyệt";
    case "REJECTED":
      return "Bị từ chối";
    default:
      return status || "Không rõ";
  }
};

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

const formatFullDateTime = (
  dateString?: string,
  timeString?: string
): string => {
  if (!dateString) return "Chưa xác định";
  const datePart = new Date(dateString);
  if (isNaN(datePart.getTime())) return "Ngày không hợp lệ";

  let finalDate = datePart;
  if (timeString) {
    const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
    if (timeString.match(timeRegex)) {
      const [hours, minutes, seconds] = timeString.split(":").map(Number);
      if (
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59 &&
        (seconds === undefined || (seconds >= 0 && seconds <= 59))
      ) {
        finalDate.setHours(hours, minutes, seconds || 0, 0);
      }
    } else {
      try {
        const timeDate = new Date(`1970-01-01T${timeString}`);
        if (!isNaN(timeDate.getTime())) {
          finalDate.setHours(
            timeDate.getHours(),
            timeDate.getMinutes(),
            timeDate.getSeconds()
          );
        }
      } catch (e) {
        /* Bỏ qua lỗi parse */
      }
    }
  }
  // Chỉ hiển thị giờ phút nếu timeString được cung cấp và hợp lệ
  const showTime =
    timeString &&
    !isNaN(finalDate.getTime()) &&
    finalDate.getHours() !== 0 &&
    finalDate.getMinutes() !== 0;

  return finalDate.toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(showTime && { hour: "2-digit", minute: "2-digit", hour12: false }), // Chỉ thêm giờ phút nếu hợp lệ
  });
};

// --- Constants ---
const ITEMS_PER_PAGE_OPTIONS = [6, 12, 36];

// --- Types for Fetched Data ---
interface OrganizerWithFetchedName {
  userId: string;
  roleName?: string;
  positionName?: string;
  fetchedFullName?: string;
}

interface ParticipantWithFetchedName {
  userId: string;
  roleName?: string;
  positionName?: string;
  fetchedFullName?: string; 
}

// --- Icon Component ---
const AttendeesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className || "h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1"}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.268-.25-1.857M7 20v-2c0-.653.084-1.268.25-1.857m0 0A5.002 5.002 0 0112 15a5.002 5.002 0 014.745 3.143M12 13a3 3 0 100-6 3 3 0 000 6z"
    />
  </svg>
);

// --- Main Component ---
const AdminHomeTabContent: React.FC<AdminHomeTabContentProps> = ({
  events,
  isLoading,
  error,
  search,
  setSearch,
  sortOption,
  setSortOption,
  timeFilterOption,
  setTimeFilterOption,
  startDateFilter,
  setStartDateFilter,
  endDateFilter,
  setEndDateFilter,
  selectedEvent,
  onEventClick,
  onBackToList,
  onRefreshEvents,
  currentUserId,
}) => {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[0]
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState<EventDisplayInfo | null>(null);

  // States để lưu trữ thông tin chi tiết đã fetch tên
  const [detailedCreatedByName, setDetailedCreatedByName] = useState<
    string | null
  >(null);
  const [detailedOrganizers, setDetailedOrganizers] = useState<
    OrganizerWithFetchedName[]
  >([]);
  // **** THÊM STATE CHO PARTICIPANTS ****
  const [detailedParticipants, setDetailedParticipants] = useState<
    ParticipantWithFetchedName[]
  >([]);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventDisplayInfo | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // --- Fetch detailed names when an event is selected ---
  useEffect(() => {
    if (selectedEvent) {
      // Fetch CreatedBy Name
      if (selectedEvent.createdBy) {
        setDetailedCreatedByName("Đang tải tên...");
        fetchUserFullNameById(selectedEvent.createdBy)
          .then((name) => setDetailedCreatedByName(name))
          .catch(() =>
            setDetailedCreatedByName(`ID: ${selectedEvent.createdBy} (Lỗi)`)
          );
      } else {
        setDetailedCreatedByName("N/A");
      }

      // Fetch Organizer Names
      const organizersArray = selectedEvent.organizers;
      if (organizersArray && organizersArray.length > 0) {
        const initialOrganizers = organizersArray.map((org) => ({
          ...org,
          fetchedFullName: "Đang tải tên...",
        }));
        setDetailedOrganizers(initialOrganizers);
        Promise.all(
          organizersArray.map(async (org) => {
            const name = await fetchUserFullNameById(org.userId);
            return { ...org, fetchedFullName: name };
          })
        )
          .then((updatedOrganizers) => {
            setDetailedOrganizers(updatedOrganizers);
          })
          .catch((error) => {
            console.error("Error fetching all organizer names:", error);
            const fallbackOrganizers = organizersArray.map((org) => ({
              ...org,
              fetchedFullName: `ID: ${org.userId} (Lỗi)`,
            }));
            setDetailedOrganizers(fallbackOrganizers);
          });
      } else {
        setDetailedOrganizers([]);
      }

      // **** FETCH PARTICIPANT NAMES ****
      const participantsArray = selectedEvent.participants;
      if (participantsArray && participantsArray.length > 0) {
        const initialParticipants = participantsArray.map((p) => ({
          ...p,
          fetchedFullName: "Đang tải tên...",
        }));
        setDetailedParticipants(initialParticipants); // Cập nhật state ngay lập tức với trạng thái "Đang tải"
        Promise.all(
          participantsArray.map(async (p) => {
            // Kiểm tra xem participant có userId không trước khi fetch
            if (!p.userId || p.userId.trim() === "") {
              return { ...p, fetchedFullName: "ID không hợp lệ" };
            }
            try {
              const name = await fetchUserFullNameById(p.userId);
              return { ...p, fetchedFullName: name };
            } catch (fetchError) {
              console.error(
                `Error fetching name for participant ID ${p.userId}:`,
                fetchError
              );
              return { ...p, fetchedFullName: `ID: ${p.userId} (Lỗi)` };
            }
          })
        )
          .then((updatedParticipants) => {
            // Cập nhật state với tên đã fetch thành công hoặc thông báo lỗi
            setDetailedParticipants(updatedParticipants);
          })
          .catch((error) => {
            // Xử lý lỗi chung khi Promise.all thất bại (ít khi xảy ra nếu từng fetch đã có catch riêng)
            console.error("Error fetching all participant names:", error);
            const fallbackParticipants = participantsArray.map((p) => ({
              ...p,
              fetchedFullName: `ID: ${p.userId} (Lỗi Chung)`,
            }));
            setDetailedParticipants(fallbackParticipants);
          });
      } else {
        // Nếu không có participants thì đặt state là mảng rỗng
        setDetailedParticipants([]);
      }
    } else {
      // Reset states khi không có sự kiện nào được chọn
      setDetailedCreatedByName(null);
      setDetailedOrganizers([]);
      setDetailedParticipants([]); // **** RESET PARTICIPANTS STATE ****
    }
  }, [selectedEvent]); // Dependency array chỉ có selectedEvent

  // --- Event Handlers (handleConfirmDelete, handleRegister, handleStartDateChange, etc. giữ nguyên) ---

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm) {
      toast.error("Không có sự kiện nào được chọn để xoá.");
      setShowDeleteConfirm(null);
      return;
    }

    const eventToDelete = showDeleteConfirm;
    const toastId = toast.loading("Đang xoá sự kiện...");
    const token = localStorage.getItem("authToken");
    const actualCurrentUserId = currentUserId;

    if (!actualCurrentUserId) {
      toast.error(
        "Không thể xác định người dùng hiện tại để thực hiện xoá. Vui lòng đăng nhập lại.",
        { id: toastId }
      );
      setShowDeleteConfirm(null);
      return;
    }
    if (!token) {
      toast.error(
        "Yêu cầu xác thực để thực hiện hành động này. Vui lòng đăng nhập lại.",
        { id: toastId }
      );
      setShowDeleteConfirm(null);
      return;
    }
    const deletedById = actualCurrentUserId;

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventToDelete.id}?deletedById=${deletedById}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = `Lỗi máy chủ: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage =
            errorData.message ||
            (errorData.error ? errorData.error.message : null) ||
            errorMessage;
        } catch (e) {
          errorMessage = `${errorMessage} - ${
            response.statusText || "Không thể đọc phản hồi lỗi"
          }`;
        }
        throw new Error(errorMessage);
      }
      const responseData = await response.json();
      if (responseData.code === 1000) {
        toast.success(responseData.message || "Đã xoá sự kiện thành công!", {
          id: toastId,
        });
        onRefreshEvents(); // Làm mới danh sách
        onBackToList(); // Quay lại danh sách
      } else {
        throw new Error(
          responseData.message || "Xoá sự kiện thất bại theo phản hồi từ API."
        );
      }
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`, { id: toastId });
      console.error("Lỗi xoá sự kiện:", error);
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const handleRegister = async () => {
    if (!selectedEvent || !currentUserId) {
      toast.error(
        "Không thể đăng ký: Thiếu thông tin sự kiện hoặc người dùng."
      );
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Yêu cầu xác thực để đăng ký. Vui lòng đăng nhập lại.");
      return;
    }

    // Kiểm tra lại nếu đã đăng ký trước khi gọi API
    const isAlreadyRegistered = selectedEvent.attendees?.some(
      (attendee) => attendee.userId === currentUserId
    );
    if (isAlreadyRegistered) {
      toast.error("Bạn đã đăng ký sự kiện này rồi.");
      return;
    }

    setIsRegistering(true);
    const toastId = toast.loading("Đang xử lý đăng ký...");

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${selectedEvent.id}/attendees?userId=${currentUserId}`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        // Body không cần thiết nếu userId đã có trong URL
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.message || `Lỗi ${response.status}: Đăng ký thất bại`
        );
      }

      if (responseData.code === 1000) {
        toast.success(responseData.message || "Đăng ký thành công!", {
          id: toastId,
        });
        // Cập nhật lại sự kiện đang xem với dữ liệu mới nhất từ API
        if (responseData.result) {
          // Quan trọng: Đảm bảo responseData.result có cấu trúc EventDisplayInfo
          // và chứa danh sách attendees đã cập nhật
          const updatedEventData = responseData.result as EventDisplayInfo;

          // Cập nhật lại participants nếu API trả về (thường API đăng ký chỉ cập nhật attendees)
          // Nếu API chỉ trả về attendees, bạn cần giữ lại participants cũ hoặc fetch lại toàn bộ sự kiện
          const eventWithUpdatedAttendees = {
            ...selectedEvent, // Giữ lại thông tin cũ
            attendees: updatedEventData.attendees, // Cập nhật attendees
            currentAttendeesCount:
              updatedEventData.currentAttendeesCount ??
              updatedEventData.attendees?.length, // Cập nhật số lượng
            // Giữ participants cũ nếu API không trả về, hoặc cập nhật nếu có
            participants:
              updatedEventData.participants ?? selectedEvent.participants,
          };
          onEventClick(eventWithUpdatedAttendees); // Cập nhật state của selectedEvent trong component cha
        }
        onRefreshEvents(); // Làm mới lại danh sách sự kiện ở background
      } else {
        throw new Error(
          responseData.message || "Đăng ký thất bại theo phản hồi từ API."
        );
      }
    } catch (error: any) {
      console.error("Lỗi đăng ký sự kiện:", error);
      toast.error(`Lỗi: ${error.message}`, { id: toastId });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDateFilter(newStartDate);
    setCurrentPage(1); // Reset về trang đầu khi thay đổi bộ lọc
    // Tự động xoá ngày kết thúc nếu ngày bắt đầu mới sau ngày kết thúc hiện tại
    if (endDateFilter && newStartDate > endDateFilter) {
      setEndDateFilter("");
      toast(
        "Ngày bắt đầu không thể sau ngày kết thúc. Ngày kết thúc đã được xoá.",
        { icon: "⚠️" }
      );
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    // Chỉ cho phép đặt ngày kết thúc nếu nó không trước ngày bắt đầu
    if (startDateFilter && newEndDate < startDateFilter) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setEndDateFilter(newEndDate);
      setCurrentPage(1); // Reset về trang đầu khi thay đổi bộ lọc
    }
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset về trang đầu khi thay đổi số lượng mục/trang
  };

  const handlePageChange = (newPage: number) => {
    // Chỉ thay đổi trang nếu newPage nằm trong giới hạn hợp lệ
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshEvents(); // Gọi hàm được truyền từ component cha
      toast.success("Đã làm mới danh sách sự kiện!");
    } catch (error) {
      console.error("Lỗi khi làm mới sự kiện (AdminHomeTabContent):", error);
      toast.error("Không thể làm mới sự kiện.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditEvent = (event: EventDisplayInfo) => {
    setEventToEdit(event);
    setIsUpdateModalOpen(true);
  };

  // Sử dụng useCallback để tối ưu hóa, tránh tạo lại hàm mỗi lần render
  const handleEventUpdated = useCallback(
    async (updatedEventData: EventDisplayInfo) => {
      // Nhận toàn bộ dữ liệu sự kiện đã cập nhật
      setIsUpdateModalOpen(false);
      setEventToEdit(null);
      toast.success(
        `Sự kiện "${updatedEventData.title}" đã cập nhật thành công.`
      );

      // 1. Làm mới toàn bộ danh sách sự kiện ở background
      await onRefreshEvents();

      // 2. Nếu sự kiện đang được xem là sự kiện vừa cập nhật, cập nhật trực tiếp state selectedEvent
      if (selectedEvent?.id === updatedEventData.id) {
        // Cập nhật selectedEvent với dữ liệu đầy đủ từ updatedEventData
        // Điều này quan trọng để fetch lại tên organizer/participant nếu cần
        onEventClick(updatedEventData);
      }
    },
    [onRefreshEvents, selectedEvent, onEventClick] // Dependencies
  );

  // --- Memoized Calculations (processedEvents, canRegister, etc. giữ nguyên) ---

  const processedEvents = useMemo(() => {
    let evts = [...events]; // Tạo bản sao để không thay đổi props gốc

    // 1. Lọc theo thời gian (Time Filter)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (timeFilterOption === "upcoming")
      evts = evts.filter((e) => getEventStatus(e.date) === "upcoming");
    else if (timeFilterOption === "ongoing")
      evts = evts.filter((e) => getEventStatus(e.date) === "ongoing");
    else if (timeFilterOption === "ended")
      evts = evts.filter((e) => getEventStatus(e.date) === "ended");
    else if (timeFilterOption === "today")
      evts = evts.filter((e) => {
        try {
          const d = new Date(e.date);
          // So sánh chỉ ngày, không tính giờ
          const eventDayStart = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
          );
          return (
            !isNaN(eventDayStart.getTime()) &&
            eventDayStart.getTime() === todayStart.getTime()
          );
        } catch {
          return false;
        }
      });
    else if (timeFilterOption === "thisWeek") {
      const { startOfWeek, endOfWeek } = getWeekRange(new Date());
      evts = evts.filter((e) => {
        try {
          const d = new Date(e.date);
          return !isNaN(d.getTime()) && d >= startOfWeek && d <= endOfWeek;
        } catch {
          return false;
        }
      });
    } else if (timeFilterOption === "thisMonth") {
      const { startOfMonth, endOfMonth } = getMonthRange(new Date());
      evts = evts.filter((e) => {
        try {
          const d = new Date(e.date);
          return !isNaN(d.getTime()) && d >= startOfMonth && d <= endOfMonth;
        } catch {
          return false;
        }
      });
    } else if (
      timeFilterOption === "dateRange" &&
      startDateFilter &&
      endDateFilter
    ) {
      try {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);
        // Đảm bảo ngày hợp lệ và start <= end
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          evts = evts.filter((e) => {
            try {
              const d = new Date(e.date);
              return !isNaN(d.getTime()) && d >= start && d <= end;
            } catch {
              return false;
            }
          });
        } else if (start > end) {
          console.warn("Start date is after end date in filter.");
          // Có thể hiển thị cảnh báo cho người dùng ở đây thay vì console
        }
      } catch (e) {
        console.error("Error parsing date range for filter:", e);
      }
    } // Mặc định là "all", không cần lọc thêm

    // 2. Lọc theo tìm kiếm (Search Filter)
    if (search) {
      const searchTermLower = search.toLowerCase().trim();
      evts = evts.filter(
        (e) =>
          (e.title && e.title.toLowerCase().includes(searchTermLower)) ||
          (e.location && e.location.toLowerCase().includes(searchTermLower)) ||
          (e.status &&
            getApprovalStatusText(e.status)
              .toLowerCase()
              .includes(searchTermLower)) ||
          // Tạm thời tìm theo createdBy ID, cần fetch tên để tìm theo tên
          (e.createdBy && e.createdBy.toLowerCase().includes(searchTermLower))
        // Có thể thêm tìm kiếm theo description, purpose nếu cần
        // (e.description && e.description.toLowerCase().includes(searchTermLower)) ||
        // (e.purpose && e.purpose.toLowerCase().includes(searchTermLower))
      );
    }

    // 3. Sắp xếp (Sort) - Ưu tiên PENDING lên đầu
    evts.sort((a, b) => {
      const isAPending = a.status?.toUpperCase() === "PENDING";
      const isBPending = b.status?.toUpperCase() === "PENDING";

      // Đưa PENDING lên đầu
      if (isAPending && !isBPending) return -1;
      if (!isAPending && isBPending) return 1;

      // Nếu cả hai cùng là PENDING hoặc không phải PENDING, sắp xếp theo lựa chọn
      if (sortOption === "za") {
        // So sánh không phân biệt chữ hoa/thường, có hỗ trợ tiếng Việt
        return b.title.localeCompare(a.title, "vi", { sensitivity: "base" });
      } else if (sortOption === "az") {
        return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });
      } else {
        // Mặc định là "default" (mới nhất)
        try {
          // Ưu tiên createdAt, nếu không có thì dùng date
          const dateA = a.createdAt
            ? new Date(a.createdAt).getTime()
            : a.date
            ? new Date(a.date).getTime()
            : 0;
          const dateB = b.createdAt
            ? new Date(b.createdAt).getTime()
            : b.date
            ? new Date(b.date).getTime()
            : 0;

          // Xử lý trường hợp ngày không hợp lệ
          if (isNaN(dateA) && isNaN(dateB)) return 0; // Cả hai không hợp lệ, giữ nguyên thứ tự
          if (isNaN(dateA)) return 1; // A không hợp lệ, đẩy xuống cuối
          if (isNaN(dateB)) return -1; // B không hợp lệ, đẩy xuống cuối

          return dateB - dateA; // Sắp xếp giảm dần (mới nhất trước)
        } catch {
          return 0; // Lỗi khi parse ngày, giữ nguyên thứ tự
        }
      }
    });

    return evts;
  }, [
    events,
    search,
    timeFilterOption,
    sortOption,
    startDateFilter,
    endDateFilter,
  ]);

  const totalItems = processedEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Điều chỉnh trang hiện tại nếu nó vượt quá tổng số trang (ví dụ khi lọc/tìm kiếm)
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    // Reset về trang 1 khi các bộ lọc thay đổi để tránh trang trống
    // setCurrentPage(1); // Cân nhắc kỹ lưỡng, có thể gây khó chịu nếu người dùng đang ở trang X và chỉ thay đổi sort
  }, [
    totalPages,
    currentPage,
    search,
    timeFilterOption,
    sortOption,
    startDateFilter,
    endDateFilter,
    itemsPerPage,
  ]); 

  // Tính toán index cho phân trang
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems); // Đảm bảo endIndex không vượt quá số lượng item
  const paginatedEvents = processedEvents.slice(startIndex, endIndex);

  const canRegister = useMemo(() => {
    if (!selectedEvent || !currentUserId) return false;

    const isCreator = currentUserId === selectedEvent.createdBy;
    const isApproved = selectedEvent.status?.toUpperCase() === "APPROVED";
    const hasEnded = getEventStatus(selectedEvent.date) === "ended";
    const isAlreadyRegistered = selectedEvent.attendees?.some(
      (attendee) =>
        attendee.userId === currentUserId && attendee.attending !== false
    ); // Chỉ tính người đăng ký và chưa hủy

    // Kiểm tra số lượng:
    let isFull = false;
    const maxAttendees = selectedEvent.maxAttendees;
    // Chỉ kiểm tra full nếu maxAttendees là một số >= 0
    if (
      maxAttendees !== null &&
      maxAttendees !== undefined &&
      maxAttendees >= 0
    ) {
      // Ưu tiên currentAttendeesCount nếu có, nếu không thì đếm từ mảng attendees
      const currentCount =
        selectedEvent.currentAttendeesCount ??
        selectedEvent.attendees?.filter((a) => a.attending !== false).length ??
        0;
      isFull = currentCount >= maxAttendees;
    }

    // Điều kiện cuối cùng:
    // - Không phải người tạo
    // - Sự kiện đã được duyệt
    // - Sự kiện chưa kết thúc
    // - Sự kiện chưa đầy chỗ (nếu có giới hạn)
    // - Người dùng chưa đăng ký (hoặc đã hủy đăng ký)
    return (
      !isCreator && isApproved && !hasEnded && !isFull && !isAlreadyRegistered
    );
  }, [selectedEvent, currentUserId]);

  // --- JSX Rendering ---
  return (
    <div>
      {/* --- Header and Filters --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600 shrink-0">
          Quản lý Sự kiện
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center flex-wrap">
          {/* Refresh Button */}
          <div className="flex-grow sm:flex-grow-0">
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              title="Làm mới danh sách sự kiện"
              className="w-full h-full p-2 border cursor-pointer border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
            >
              {isRefreshing ? (
                <ReloadIcon className="w-5 h-5 animate-spin text-indigo-600" />
              ) : (
                <ReloadIcon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
          </div>
          {/* Sort Select */}
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="sortOptionAdminHome" className="sr-only">
              Sắp xếp
            </label>
            <select
              id="sortOptionAdminHome"
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                // setCurrentPage(1); // Có thể reset trang ở đây hoặc trong useEffect
              }}
              className="w-full h-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="default">🕒 Mới nhất</option>
              <option value="az">🔤 A - Z (Tên sự kiện)</option>
              <option value="za">🔤 Z - A (Tên sự kiện)</option>
            </select>
          </div>
          {/* Time Filter Select */}
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="timeFilterOptionAdminHome" className="sr-only">
              Lọc thời gian
            </label>
            <select
              id="timeFilterOptionAdminHome"
              value={timeFilterOption}
              onChange={(e) => {
                setTimeFilterOption(e.target.value);
                // setCurrentPage(1); // Reset trang khi đổi bộ lọc
              }}
              className="w-full h-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="all">♾️ Tất cả</option>
              <option value="upcoming">☀️ Sắp diễn ra</option>
              <option value="ongoing">🟢 Đang diễn ra</option>
              <option value="ended">🏁 Đã kết thúc</option>
              <option value="today">📅 Hôm nay</option>
              <option value="thisWeek">🗓️ Tuần này</option>
              <option value="thisMonth">🗓️ Tháng này</option>
              <option value="dateRange">🔢 Khoảng ngày</option>
            </select>
          </div>
          {/* Items Per Page Select */}
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="itemsPerPageSelectAdmin" className="sr-only">
              Sự kiện mỗi trang
            </label>
            <select
              id="itemsPerPageSelectAdmin"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="w-full h-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / trang
                </option>
              ))}
            </select>
          </div>
          {/* View Mode Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 self-center ">
            <button
              onClick={() => setViewMode("card")}
              title="Chế độ thẻ"
              className={`p-2 rounded-md border transition cursor-pointer ${
                viewMode === "card"
                  ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              <GridIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              title="Chế độ danh sách"
              className={`p-2 rounded-md border transition cursor-pointer ${
                viewMode === "list"
                  ? "bg-indigo-600 border-indigo-700 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Date Range Picker (conditionally rendered) */}
      {timeFilterOption === "dateRange" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
          <div>
            <label
              htmlFor="startDateFilterAdmin"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Từ ngày
            </label>
            <input
              type="date"
              id="startDateFilterAdmin"
              value={startDateFilter}
              onChange={handleStartDateChange}
              max={endDateFilter || undefined} // Ngăn chọn ngày bắt đầu sau ngày kết thúc
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="endDateFilterAdmin"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Đến ngày
            </label>
            <input
              type="date"
              id="endDateFilterAdmin"
              value={endDateFilter}
              onChange={handleEndDateChange}
              min={startDateFilter || undefined} // Ngăn chọn ngày kết thúc trước ngày bắt đầu
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative w-full mb-6">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </span>
        <input
          id="searchAdminHome"
          type="text"
          placeholder="Tìm theo tên, địa điểm, trạng thái duyệt, người tạo (ID)..."
          className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            // setCurrentPage(1); // Reset trang khi tìm kiếm
          }}
        />
      </div>

      {/* --- Content Area (Loading, Error, Event Details, Event List) --- */}
      {isLoading && !selectedEvent ? (
        // Loading State (chỉ hiển thị khi chưa chọn sự kiện và đang load)
        <div className="flex justify-center items-center min-h-[200px]">
          <ReloadIcon className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="ml-3 text-gray-500 italic">
            Đang tải danh sách sự kiện...
          </p>
        </div>
      ) : error ? (
        // Error State
        <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
          Lỗi tải sự kiện: {error}
        </p>
      ) : selectedEvent ? (
        // --- Event Details View ---
        <div className="p-4 sm:p-6 border rounded-lg shadow-lg bg-white mb-6 relative animate-fadeIn">
          {/* Back Button */}
          <button
            onClick={onBackToList}
            className="mb-4 text-sm text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer p-1 rounded hover:bg-indigo-50"
            aria-label="Quay lại danh sách sự kiện"
          >
            <ChevronLeftIcon className="h-8 w-8 mr-1" />
            <span className="text-lg">Quay lại</span>
          </button>

          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 pt-8 md:pt-0">
            {/* Left Column: Image */}
            <div className="flex-shrink-0 w-full md:w-1/3 lg:w-1/4">
              {selectedEvent.avatarUrl ? (
                <Image
                  src={selectedEvent.avatarUrl}
                  alt={`Avatar for ${selectedEvent.title}`}
                  width={300} // Nên đặt width/height để tránh layout shift
                  height={300}
                  className="w-full h-auto max-h-80 rounded-lg object-cover border p-1 bg-white shadow-md"
                  priority // Ưu tiên tải ảnh chi tiết
                  onError={(e) => {
                    // Fallback nếu ảnh lỗi
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none"; // Ẩn ảnh lỗi
                    const placeholder = document.createElement("div");
                    placeholder.className =
                      "w-full h-48 md:h-64 lg:h-80 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-5xl font-semibold border";
                    placeholder.textContent =
                      selectedEvent.title?.charAt(0).toUpperCase() || "?";
                    target.parentElement?.appendChild(placeholder);
                  }}
                />
              ) : (
                <div className="w-full h-48 md:h-64 lg:h-80 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-5xl font-semibold border">
                  {selectedEvent.title?.charAt(0).toUpperCase() || "?"}
                </div>
              )}
            </div>

            {/* Right Column: Details */}
            <div className="flex-grow space-y-4">
              {/* Title and Status Badges */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex-1 break-words mr-2">
                  {selectedEvent.title}
                </h2>
                <div className="flex flex-col items-start sm:items-end sm:flex-row gap-2 flex-shrink-0 mt-1 sm:mt-0">
                  {/* Event Time Status */}
                  {(() => {
                    const status = getEventStatus(selectedEvent.date);
                    return (
                      <span
                        className={`${getStatusBadgeClasses(
                          status
                        )} flex-shrink-0`}
                      >
                        {getStatusIcon(status)} {getStatusText(status)}
                      </span>
                    );
                  })()}
                  {/* Approval Status */}
                 
                </div>
              </div>

              {/* Core Info Section */}
              <div className="space-y-3 text-base text-gray-700 border-t pt-4">
                {/* Time */}
                {selectedEvent.date && ( // Luôn hiển thị nếu có ngày
                  <div className="flex items-start">
                    <CalendarIcon className="w-5 h-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-800">Thời gian:</p>
                      <p className="text-gray-600">
                        {formatFullDateTime(
                          selectedEvent.date,
                          selectedEvent.time
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {/* Location */}
                {selectedEvent.location && (
                  <div className="flex items-start">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-800">Địa điểm:</p>
                      <p className="text-gray-600">{selectedEvent.location}</p>
                    </div>
                  </div>
                )}
                {/* Attendee Count */}
                {(selectedEvent.currentAttendeesCount !== undefined ||
                  (selectedEvent.maxAttendees !== null &&
                    selectedEvent.maxAttendees !== undefined)) && (
                  <div className="flex items-start">
                    <AttendeesIcon className="h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-800">
                        Số lượng đăng ký:
                      </p>
                      <p className="text-gray-600">
                        {/* Ưu tiên currentAttendeesCount, nếu không thì đếm attendees */}
                        {selectedEvent.currentAttendeesCount ??
                          (selectedEvent.attendees?.filter(
                            (a) => a.attending !== false
                          ).length ||
                            0)}
                        {/* Hiển thị maxAttendees nếu nó là số và > 0 */}
                        {selectedEvent.maxAttendees !== null &&
                        selectedEvent.maxAttendees !== undefined &&
                        selectedEvent.maxAttendees >= 0
                          ? ` / ${selectedEvent.maxAttendees}`
                          : " / Không giới hạn"}
                        {/* Thông báo nếu đã đủ chỗ */}
                        {selectedEvent.maxAttendees !== null &&
                          selectedEvent.maxAttendees !== undefined &&
                          selectedEvent.maxAttendees >= 0 &&
                          (selectedEvent.currentAttendeesCount ??
                            selectedEvent.attendees?.filter(
                              (a) => a.attending !== false
                            ).length ??
                            0) >= selectedEvent.maxAttendees && (
                            <span className="text-sm text-orange-600 ml-1">
                              (Đã đủ)
                            </span>
                          )}
                      </p>
                    </div>
                  </div>
                )}
                {/* Created By */}
                <div className="flex items-start">
                  <PersonIcon className="w-5 h-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-800">Người tạo:</p>
                    <p className="text-gray-600">
                      {detailedCreatedByName !== null
                        ? detailedCreatedByName
                        : selectedEvent?.createdBy
                        ? `ID: ${selectedEvent.createdBy}`
                        : "N/A"}
                    </p>
                  </div>
                </div>
                {/* Purpose */}
                {selectedEvent.purpose && (
                  <div className="flex items-start">
                    <InfoCircledIcon className="w-5 h-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-gray-800">Mục đích:</p>
                      <p className="text-gray-600 whitespace-pre-wrap">
                        {selectedEvent.purpose}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content/Description Section */}
              <div className="space-y-3 text-sm border-t pt-4">
                <div>
                  <p className="font-semibold text-gray-900 mb-1 text-base">
                    📜 Nội dung chi tiết:
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap text-base">
                    {selectedEvent.content ||
                      selectedEvent.description ||
                      "Không có nội dung chi tiết."}
                  </p>
                </div>
              </div>

              {/* Organizers List */}
              <div className="space-y-1 text-sm border-t pt-4">
                <strong className="font-semibold text-gray-900 mb-1 block text-base">
                  👥 Ban tổ chức:
                </strong>
                {detailedOrganizers.length > 0 ? (
                  <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1 text-base">
                    {detailedOrganizers.map((org, index) => (
                      <li key={`${org.userId}-${index}`}>
                        {org.fetchedFullName || `ID: ${org.userId}`}
                        {org.positionName || org.roleName
                          ? ` - ${org.positionName || ""}${
                              org.positionName && org.roleName ? " (" : ""
                            }${org.roleName || ""}${
                              org.positionName && org.roleName ? ")" : ""
                            }`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-base ml-5">
                    {selectedEvent?.organizers &&
                    selectedEvent.organizers.length > 0
                      ? "Đang tải..."
                      : "Chưa có thông tin."}
                  </p>
                )}
              </div>

              {/* **** PARTICIPANTS LIST **** */}
              <div className="space-y-1 text-sm border-t pt-4">
                <strong className="font-semibold text-gray-900 mb-1 block text-base">
                  👤 Người tham dự ({detailedParticipants.length}):{" "}
                  {/* Hiển thị số lượng */}
                </strong>
                {detailedParticipants.length > 0 ? (
                  <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1 text-base max-h-40 overflow-y-auto pr-2">
                    {" "}
                    {/* Thêm scroll nếu danh sách quá dài */}
                    {detailedParticipants.map((p, index) => (
                      <li key={`${p.userId}-${index}`}>
                        {/* Hiển thị tên đã fetch hoặc ID nếu chưa có/lỗi */}
                        {p.fetchedFullName || `ID: ${p.userId}`}
                        {/* Hiển thị vai trò/vị trí nếu có, tương tự organizer */}
                        {p.positionName || p.roleName
                          ? ` - ${p.positionName || ""}${
                              p.positionName && p.roleName ? " (" : ""
                            }${p.roleName || ""}${
                              p.positionName && p.roleName ? ")" : ""
                            }`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  // Kiểm tra xem mảng gốc có dữ liệu không để phân biệt "Chưa có" và "Đang tải"
                  <p className="text-gray-500 italic text-base ml-5">
                    {selectedEvent?.participants &&
                    selectedEvent.participants.length > 0
                      ? "Đang tải..."
                      : "Chưa có người tham dự."}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap justify-end gap-3">
                {/* Edit Button (only for creator) */}
                {currentUserId && selectedEvent.createdBy === currentUserId && (
                  <button
                    onClick={() => handleEditEvent(selectedEvent)}
                    className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow"
                    aria-label="Sửa sự kiện"
                  >
                    <Pencil2Icon className="w-4 h-4" /> Sửa sự kiện
                  </button>
                )}
                {/* Delete Button */}
                <button
                  onClick={() => setShowDeleteConfirm(selectedEvent)}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow"
                  aria-label="Xoá sự kiện"
                >
                  <TrashIcon className="w-4 h-4" /> Xoá sự kiện
                </button>
                {/* Register Button */}
                {canRegister && (
                  <button
                    onClick={handleRegister}
                    disabled={isRegistering}
                    className={`px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow ${
                      isRegistering ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    title="Đăng ký tham gia sự kiện này"
                    aria-label="Đăng ký tham gia sự kiện"
                  >
                    {isRegistering ? (
                      <>
                        <ReloadIcon className="w-4 h-4 animate-spin mr-1" />{" "}
                        Đang đăng ký...
                      </>
                    ) : (
                      <>
                        <PersonIcon className="w-4 h-4" /> Đăng ký tham gia
                      </>
                    )}
                  </button>
                )}
                {/* Hiển thị thông báo nếu đã đăng ký */}
                {selectedEvent.attendees?.some(
                  (attendee) =>
                    attendee.userId === currentUserId &&
                    attendee.attending !== false
                ) &&
                  !canRegister &&
                  getEventStatus(selectedEvent.date) !== "ended" && (
                    <span className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium flex items-center gap-1.5 border border-gray-200">
                      <CheckCircledIcon className="w-4 h-4 text-green-600" /> Đã
                      đăng ký
                    </span>
                  )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // --- Event List View (Card or List) ---
        <div className="mt-1 mb-6">
          {processedEvents.length > 0 ? (
            viewMode === "card" ? (
              // Card View
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {paginatedEvents.map((event) => {
                  const timeStatus = getEventStatus(event.date);
                  const isMyEvent =
                    currentUserId && event.createdBy === currentUserId;
                  return (
                    <div
                      key={event.id}
                      className="bg-white shadow-md rounded-xl overflow-hidden transform transition duration-300 hover:scale-[1.02] hover:shadow-lg flex flex-col border border-gray-100 hover:border-indigo-200 cursor-pointer group"
                      onClick={() => onEventClick(event)} // Click cả card để xem chi tiết
                    >
                      {/* Card Image */}
                      <div className="w-full h-40 bg-gray-200 relative overflow-hidden">
                        {event.avatarUrl ? (
                          <Image
                            src={event.avatarUrl}
                            alt={`Avatar for ${event.title}`}
                            layout="fill"
                            objectFit="cover"
                            className="transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none"; // Hide broken image
                              const placeholder = document.createElement("div");
                              placeholder.className =
                                "w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold";
                              placeholder.textContent =
                                event.title?.charAt(0).toUpperCase() || "?";
                              target.parentElement?.appendChild(placeholder);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                            {event.title?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                        {/* Badges top-right */}
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                          <span
                            className={`${getStatusBadgeClasses(
                              timeStatus
                            )} shadow-sm`}
                          >
                            {getStatusIcon(timeStatus)}{" "}
                            {getStatusText(timeStatus)}
                          </span>
                          
                        </div>
                      </div>
                      {/* Card Content */}
                      <div className="p-4 flex flex-col flex-grow">
                        <div className="mb-3 flex-grow">
                          <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {event.title}
                          </h2>
                          <div className="space-y-1 mb-2 text-xs text-gray-600">
                            {/* Date & Time */}
                            <p className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                {formatFullDateTime(event.date, event.time)}
                              </span>
                            </p>
                            {/* Location */}
                            <p className="flex items-center gap-1.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5 text-gray-400 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="truncate">
                                {event.location || "Chưa cập nhật"}
                              </span>
                            </p>
                            {/* Attendee Count */}
                            {event.maxAttendees !== null &&
                              event.maxAttendees !== undefined && (
                                <p className="flex items-center gap-1.5">
                                  <AttendeesIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">
                                    {event.currentAttendeesCount ??
                                      (event.attendees?.filter(
                                        (a) => a.attending !== false
                                      ).length ||
                                        0)}{" "}
                                    /{" "}
                                    {event.maxAttendees >= 0
                                      ? event.maxAttendees
                                      : "Không giới hạn"}{" "}
                                    tham dự
                                  </span>
                                </p>
                              )}
                          </div>
                        </div>
                        {/* Card Footer Actions */}
                        <div className="mt-auto pt-3 border-t border-gray-100 flex justify-end gap-2">
                          {isMyEvent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }} // Stop propagation to prevent card click
                              className="px-2.5 py-1 rounded text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium flex items-center gap-1 transition"
                              aria-label={`Sửa sự kiện ${event.title}`}
                            >
                              <Pencil2Icon className="w-3 h-3" /> Sửa
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(event);
                            }} // Stop propagation
                            className="px-2.5 py-1 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 transition"
                            aria-label={`Xoá sự kiện ${event.title}`}
                          >
                            <TrashIcon className="w-3 h-3" /> Xoá
                          </button>
                          {/* Optional: Add a small register button here if needed */}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // List View
              <ul className="space-y-4 animate-fadeIn">
                {paginatedEvents.map((event) => {
                  const timeStatus = getEventStatus(event.date);
                  const isMyEvent =
                    currentUserId && event.createdBy === currentUserId;
                  return (
                    <li
                      key={event.id}
                      className="bg-white shadow-lg rounded-xl overflow-hidden transition transform duration-300 hover:scale-[1.01] hover:shadow-xl flex flex-col md:flex-row border border-gray-200 hover:border-indigo-300 cursor-pointer group"
                      onClick={() => onEventClick(event)} // Click cả list item để xem chi tiết
                    >
                      {/* List Image (Left side on Medium+) */}
                      <div className="relative w-full md:w-1/3 xl:w-1/4 flex-shrink-0 h-48 md:h-auto overflow-hidden">
                        {event.avatarUrl ? (
                          <Image
                            src={event.avatarUrl}
                            alt={`Hình ảnh cho ${event.title}`}
                            layout="fill"
                            objectFit="cover"
                            className="bg-gray-100 transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const placeholder = document.createElement("div");
                              placeholder.className =
                                "w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold";
                              placeholder.textContent =
                                event.title?.charAt(0).toUpperCase() || "?";
                              target.parentElement?.appendChild(placeholder);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold">
                            {event.title?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>

                      {/* List Content (Right side on Medium+) */}
                      <div className="p-4 flex flex-col justify-between flex-grow md:pl-4">
                        {/* Top Section: Title, Badges, Basic Info */}
                        <div className="mb-3">
                          {/* Title and Badges */}
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1">
                            <h2 className="text-md sm:text-lg font-semibold text-gray-800 group-hover:text-indigo-600 line-clamp-2 flex-1 mr-2 transition-colors">
                              {event.title}
                            </h2>
                            <div className="flex flex-col items-start sm:items-end sm:flex-row sm:ml-2 gap-1 mt-1 sm:mt-0 shrink-0">
                              <span
                                className={`${getStatusBadgeClasses(
                                  timeStatus
                                )}`}
                              >
                                {getStatusIcon(timeStatus)}{" "}
                                {getStatusText(timeStatus)}
                              </span>
                             
                            </div>
                          </div>
                          {/* Basic Info */}
                          <div className="text-xs text-gray-500 space-y-1 mb-2">
                            <p className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="truncate">
                                {formatFullDateTime(event.date, event.time)}
                              </span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3.5 w-3.5 text-gray-400 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="truncate">
                                {event.location || "Chưa cập nhật"}
                              </span>
                            </p>
                            {event.maxAttendees !== null &&
                              event.maxAttendees !== undefined && (
                                <p className="flex items-center gap-1.5">
                                  <AttendeesIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">
                                    SL:{" "}
                                    {event.currentAttendeesCount ??
                                      (event.attendees?.filter(
                                        (a) => a.attending !== false
                                      ).length ||
                                        0)}{" "}
                                    /{" "}
                                    {event.maxAttendees >= 0
                                      ? event.maxAttendees
                                      : "Không giới hạn"}
                                  </span>
                                </p>
                              )}
                            {event.createdBy && (
                              <p className="flex items-center gap-1.5">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5 text-gray-400 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                {/* Sử dụng component UserDisplayNameById để hiển thị tên */}
                                <UserDisplayNameById
                                  userId={event.createdBy}
                                  prefix=""
                                  defaultText={`ID: ${event.createdBy}`}
                                />
                              </p>
                            )}
                          </div>
                          {/* Description Snippet */}
                          <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {event.description ||
                              event.purpose ||
                              "Chưa có mô tả chi tiết."}
                          </p>
                        </div>

                        {/* Bottom Section: Actions */}
                        <div className="mt-auto flex justify-end gap-2">
                          {isMyEvent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }} // Stop propagation
                              className="px-3 py-1.5 rounded-md text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition font-medium flex items-center gap-1"
                              aria-label={`Sửa sự kiện ${event.title}`}
                            >
                              <Pencil2Icon className="w-3.5 h-3.5" /> Sửa
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(event);
                            }} // Stop propagation
                            className="px-3 py-1.5 rounded-md text-xs bg-red-100 text-red-700 hover:bg-red-200 transition font-medium flex items-center gap-1"
                            aria-label={`Xoá sự kiện ${event.title}`}
                          >
                            <TrashIcon className="w-3.5 h-3.5" /> Xoá
                          </button>
                          {/* Optional: Add a small register button here if needed */}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            // No Events Found Message
            <p className="text-gray-500 text-center col-span-1 md:col-span-2 lg:col-span-3 py-6 italic">
              Không tìm thấy sự kiện nào khớp với bộ lọc.
            </p>
          )}

          {/* Pagination Controls */}
          {processedEvents.length > 0 && totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-4">
              {/* Page Info */}
              <span className="text-sm text-gray-600">
                Trang <span className="font-semibold">{currentPage}</span> /{" "}
                <span className="font-semibold">{totalPages}</span> (Tổng:{" "}
                <span className="font-semibold">{totalItems}</span> sự kiện)
              </span>
              {/* Page Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md border cursor-pointer bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  aria-label="Trang trước"
                >
                  <ChevronLeftIcon className="w-4 h-4" /> Trước
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md border cursor-pointer bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  aria-label="Trang sau"
                >
                  Sau <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- Modals --- */}
      <UpdateEventModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setEventToEdit(null); // Reset event to edit when closing
        }}
        eventToUpdate={eventToEdit}
        onEventUpdated={handleEventUpdated}
        currentUserId={currentUserId}
      />

      <ConfirmationDialog
        isOpen={!!showDeleteConfirm}
        title="Xác nhận xoá sự kiện"
        message={
          <>
            Bạn có chắc chắn muốn xoá sự kiện <br />
            <strong className="text-indigo-600">
              "{showDeleteConfirm?.title}"
            </strong>
            ? <br />
          </>
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(null)}
        confirmText="Xác nhận Xoá"
        confirmVariant="danger" // Makes the confirm button red
        cancelText="Huỷ bỏ"
      />
    </div>
  );
};

export default AdminHomeTabContent;
