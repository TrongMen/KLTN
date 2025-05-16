"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import {
  EventDisplayInfo as MainEvent,
  User as AppUser,
} from "../types/appTypes";
import ModalUpdateEvent from "../modals/ModalUpdateEvent";
import ConfirmationDialog, {
  ConfirmationDialogProps,
} from "../../../utils/ConfirmationDialog";
import { EventDataForForm } from "../types/typCreateEvent";
import { OrganizerParticipantInput } from "../types/typCreateEvent";
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

export interface Role {
  id: string;
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
  roleName?: string;
  roleId?: string;
  positionName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  resolvedName?: string;
}

interface ParticipantInfo {
  userId: string;
  roleName?: string;
  roleId?: string;
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
  participants?: ParticipantInfo[];
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
  username?: string;
}

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
  currentUser: AppUser | null;
}

type EventStatus = "upcoming" | "ongoing" | "ended";
type ConfirmationState = Omit<ConfirmationDialogProps, "onCancel"> & {
  onConfirm: (() => Promise<void>) | null;
};

interface MemberWithName extends OrganizerInfo, ParticipantInfo {
  fetchedFullName?: string;
}

const fetchUserFullNameById = async (userId: string): Promise<string> => {
  if (!userId || userId.trim() === "") return "Không xác định";
  try {
    const response = await fetch(
      `http://localhost:8080/identity/users/notoken/${userId}`
    );
    if (!response.ok) {
      try {
        const errorData = await response.json();
        return `ID: ${userId} (Lỗi ${response.status}: ${
          errorData.message || "Không rõ"
        })`;
      } catch (e) {
        return `ID: ${userId} (Lỗi ${response.status})`;
      }
    }
    const apiResponseData: ApiResponse = await response.json();
    if (apiResponseData && apiResponseData.result) {
      const userData = apiResponseData.result as UserInfoFromApi;
      const fullName =
        `${userData.lastName || ""} ${userData.firstName || ""}`.trim() ||
        userData.username;
      return fullName || `ID: ${userId}`;
    } else {
      return `ID: ${userId} (Dữ liệu không hợp lệ: ${
        apiResponseData.message || "N/A"
      })`;
    }
  } catch (error) {
    console.error("Lỗi fetch tên user ID:", userId, error);
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
          if (isActive) setDisplayName(name);
        })
        .catch(() => {
          if (isActive) setDisplayName(`ID: ${userId} (Lỗi)`);
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
    if (isNaN(eventDate.getTime())) return "upcoming";
    const eventDateStart = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    if (eventDateStart < todayStart) return "ended";
    else if (eventDateStart > todayStart) return "upcoming";
    else return "ongoing";
  } catch (e) {
    console.error("Lỗi parse ngày (getEventStatus):", eventDateStr, e);
    return "upcoming";
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
      } catch (e) {}
    }
  }
  const showTime =
    timeString &&
    !isNaN(finalDate.getTime()) &&
    (finalDate.getHours() !== 0 ||
      finalDate.getMinutes() !== 0 ||
      finalDate.getSeconds() !== 0);
  return finalDate.toLocaleString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(showTime && { hour: "2-digit", minute: "2-digit", hour12: false }),
  });
};

const ITEMS_PER_PAGE_OPTIONS = [6, 12, 18, 24, 36];
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
  currentUser,
}) => {
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    ITEMS_PER_PAGE_OPTIONS[1]
  );
  const [isRefreshingLocal, setIsRefreshingLocal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState<EventDisplayInfo | null>(null);
  const [detailedCreatedByName, setDetailedCreatedByName] = useState<
    string | null
  >(null);
  const [detailedOrganizers, setDetailedOrganizers] = useState<
    MemberWithName[]
  >([]);
  const [detailedParticipants, setDetailedParticipants] = useState<
    MemberWithName[]
  >([]);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventDataForForm | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  useEffect(() => {
    if (selectedEvent) {
      if (selectedEvent.createdBy) {
        setDetailedCreatedByName("Đang tải...");
        fetchUserFullNameById(selectedEvent.createdBy)
          .then(setDetailedCreatedByName)
          .catch(() =>
            setDetailedCreatedByName(`ID: ${selectedEvent.createdBy} (Lỗi)`)
          );
      } else {
        setDetailedCreatedByName("N/A");
      }

      const fetchMemberDetails = async (
        members: (OrganizerInfo | ParticipantInfo)[] | undefined
      ): Promise<MemberWithName[]> => {
        if (!members || members.length === 0) return [];
        const initialMembers = members.map((m) => ({
          ...m,
          fetchedFullName: "Đang tải...",
        }));
        const settledMembers = await Promise.all(
          members.map(async (member) => {
            if (!member.userId)
              return { ...member, fetchedFullName: "Thiếu ID" };
            try {
              const name = await fetchUserFullNameById(member.userId);
              return { ...member, fetchedFullName: name };
            } catch {
              return {
                ...member,
                fetchedFullName: `ID: ${member.userId} (Lỗi)`,
              };
            }
          })
        );
        return settledMembers;
      };
      fetchMemberDetails(selectedEvent.organizers).then(setDetailedOrganizers);
      fetchMemberDetails(selectedEvent.participants).then(
        setDetailedParticipants
      );
    } else {
      setDetailedCreatedByName(null);
      setDetailedOrganizers([]);
      setDetailedParticipants([]);
    }
  }, [selectedEvent]);

  const handleConfirmDelete = async () => {
    if (!showDeleteConfirm || !currentUserId) {
      toast.error("Lỗi không xác định hoặc thiếu thông tin.");
      setShowDeleteConfirm(null);
      return;
    }
    const eventToDelete = showDeleteConfirm;
    const toastId = toast.loading("Đang xoá...");
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Yêu cầu xác thực.", { id: toastId });
      setShowDeleteConfirm(null);
      return;
    }
    try {
      const url = `http://localhost:8080/identity/api/events/${eventToDelete.id}?deletedById=${currentUserId}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let errMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.message || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
      const responseData = await response.json().catch(() => null);
      if (
        response.status === 204 ||
        (responseData && responseData.code === 1000)
      ) {
        toast.success(responseData?.message || "Đã xoá sự kiện thành công!", {
          id: toastId,
        });
        onRefreshEvents();
        onBackToList();
      } else {
        throw new Error(responseData?.message || "Xoá thất bại.");
      }
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`, { id: toastId });
      console.error("Lỗi xoá:", error);
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setStartDateFilter(newStartDate);
    setCurrentPage(1);
    if (endDateFilter && newStartDate > endDateFilter) {
      setEndDateFilter("");
      toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: "⚠️" });
    }
  };
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    if (startDateFilter && newEndDate < startDateFilter) {
      toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
    } else {
      setEndDateFilter(newEndDate);
      setCurrentPage(1);
    }
  };
  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };
  const handleRefresh = async () => {
    setIsRefreshingLocal(true);
    try {
      await onRefreshEvents();
      toast.success("Đã làm mới!");
    } catch (error) {
      console.error("Lỗi làm mới:", error);
      toast.error("Không thể làm mới.");
    } finally {
      setIsRefreshingLocal(false);
    }
  };

  const handleEditEvent = (event: EventDisplayInfo) => {
    const organizersForModal: OrganizerParticipantInput[] = (
      event.organizers || []
    ).map((org) => {
      let roleId = "";
      let roleName = org.roleName || ""; // Ưu tiên roleName dạng string từ API sự kiện
      if (
        org.roleName &&
        Array.isArray(org.roleName) &&
        org.roleName.length > 0
      ) {
        // Fallback nếu roleName là mảng Role
        roleId = org.roleName[0].id;
        roleName = org.roleName[0].name || roleName;
      } else if (typeof org.roleId === "string") {
        // Nếu API sự kiện có roleId trực tiếp
        roleId = org.roleId;
      }
      return {
        userId: org.userId,
        name: org.fullName || org.resolvedName || "",
        roleId: roleId,
        roleName: roleName,
        positionId: "",
      };
    });
    const participantsForModal: OrganizerParticipantInput[] = (
      event.participants || []
    ).map((par) => {
      let roleId = "";
      let roleName = par.roleName || "";
      if (par.roleId && Array.isArray(par.roleId) && par.roleId.length > 0) {
        // Kiểu cũ participant có roleId là mảng Role[]
        roleId = par.roleId[0].id;
        roleName = par.roleId[0].name || roleName;
      } else if (typeof par.roleId === "string") {
        // Nếu API trả về roleId là string
        roleId = par.roleId;
      }
      return {
        userId: par.userId,
        name: par.fullName || par.resolvedName || "",
        roleId: roleId,
        roleName: roleName,
        positionId: "",
      };
    });

    const eventForModal: EventDataForForm = {
      id: event.id,
      name: event.title || event.name || "",
      purpose: event.purpose || "",
      time: event.time || event.date, // ModalUpdateEvent sẽ xử lý format
      location: event.location || "",
      content: event.content || event.description || "",
      maxAttendees: event.maxAttendees ?? null,
      status: event.status as EventDataForForm["status"],
      avatarUrl: event.avatarUrl,
      organizers: organizersForModal,
      participants: participantsForModal,
    };
    setEventToEdit(eventForModal);
    setIsUpdateModalOpen(true);
  };

  const handleEventUpdatedSuccessfully = async () => {
    setIsUpdateModalOpen(false);
    setEventToEdit(null);
    toast.success("Sự kiện đã được cập nhật thành công.");
    await onRefreshEvents();
    if (selectedEvent && eventToEdit && selectedEvent.id === eventToEdit.id) {
      const refreshedEvent = events.find((e) => e.id === eventToEdit.id);
      if (refreshedEvent) onEventClick(refreshedEvent);
      else onBackToList();
    }
  };

  const handleRegister = async () => {
    if (!selectedEvent || !currentUserId) {
      toast.error("Thiếu thông tin sự kiện/người dùng.");
      return;
    }
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Yêu cầu đăng nhập.");
      return;
    }
    const isAlreadyRegistered = selectedEvent.attendees?.some(
      (att) => att.userId === currentUserId && att.attending !== false
    );
    if (isAlreadyRegistered) {
      toast.error("Bạn đã đăng ký sự kiện này.");
      return;
    }

    setIsRegistering(true);
    const toastId = toast.loading("Đang đăng ký...");
    try {
      const apiUrl = `http://localhost:8080/identity/api/events/${selectedEvent.id}/attendees?userId=${currentUserId}`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || `Lỗi ${response.status}`);
      }
      if (responseData.code === 1000) {
        toast.success(responseData.message || "Đăng ký thành công!", {
          id: toastId,
        });
        if (responseData.result) {
          const updatedEventData = responseData.result as EventDisplayInfo;
          onEventClick({
            ...selectedEvent,
            attendees: updatedEventData.attendees,
            currentAttendeesCount:
              updatedEventData.currentAttendeesCount ??
              updatedEventData.attendees?.length,
            participants:
              updatedEventData.participants ?? selectedEvent.participants,
          });
        } else {
          onRefreshEvents();
        }
      } else {
        throw new Error(responseData.message || "Đăng ký thất bại.");
      }
    } catch (error: any) {
      console.error("Lỗi đăng ký:", error);
      toast.error(`Lỗi: ${error.message}`, { id: toastId });
    } finally {
      setIsRegistering(false);
    }
  };

  const processedEvents = useMemo(() => {
    let evts = [...events];
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
          const ed = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          return !isNaN(ed.getTime()) && ed.getTime() === todayStart.getTime();
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
          console.warn("Start date after end date.");
        }
      } catch (e) {
        console.error("Date range parse error:", e);
      }
    }
    if (search) {
      const sL = search.toLowerCase().trim();
      evts = evts.filter(
        (e) =>
          (e.title && e.title.toLowerCase().includes(sL)) ||
          (e.location && e.location.toLowerCase().includes(sL)) ||
          (e.status &&
            getApprovalStatusText(e.status).toLowerCase().includes(sL)) ||
          (e.createdBy && e.createdBy.toLowerCase().includes(sL))
      );
    }
    evts.sort((a, b) => {
      const pA = a.status?.toUpperCase() === "PENDING";
      const pB = b.status?.toUpperCase() === "PENDING";
      if (pA && !pB) return -1;
      if (!pA && pB) return 1;
      if (sortOption === "za")
        return b.title.localeCompare(a.title, "vi", { sensitivity: "base" });
      if (sortOption === "az")
        return a.title.localeCompare(b.title, "vi", { sensitivity: "base" });
      else {
        try {
          const dA = a.createdAt
            ? new Date(a.createdAt).getTime()
            : a.date
            ? new Date(a.date).getTime()
            : 0;
          const dB = b.createdAt
            ? new Date(b.createdAt).getTime()
            : b.date
            ? new Date(b.date).getTime()
            : 0;
          if (isNaN(dA) && isNaN(dB)) return 0;
          if (isNaN(dA)) return 1;
          if (isNaN(dB)) return -1;
          return dB - dA;
        } catch {
          return 0;
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
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedEvents = processedEvents.slice(startIndex, endIndex);
  const canRegister = useMemo(() => {
    if (!selectedEvent || !currentUserId) return false;
    const isCreator = currentUserId === selectedEvent.createdBy;
    const isApproved = selectedEvent.status?.toUpperCase() === "APPROVED";
    const hasEnded = getEventStatus(selectedEvent.date) === "ended";
    const isAlreadyRegistered = selectedEvent.attendees?.some(
      (att) => att.userId === currentUserId && att.attending !== false
    );
    let isFull = false;
    const maxAtt = selectedEvent.maxAttendees;
    if (maxAtt !== null && maxAtt !== undefined && maxAtt >= 0) {
      const currentCount =
        selectedEvent.currentAttendeesCount ??
        selectedEvent.attendees?.filter((a) => a.attending !== false).length ??
        0;
      isFull = currentCount >= maxAtt;
    }
    return (
      !isCreator && isApproved && !hasEnded && !isFull && !isAlreadyRegistered
    );
  }, [selectedEvent, currentUserId]);

  if (isLoading && !events.length && !selectedEvent) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <ReloadIcon className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="ml-3 text-gray-600 text-lg italic">
          Đang tải dữ liệu sự kiện...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600 shrink-0">
          Quản lý Sự kiện
        </h1>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center flex-wrap">
          <div className="flex-grow sm:flex-grow-0">
            <button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshingLocal}
              title="Làm mới"
              className="w-full h-full p-2 border cursor-pointer border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
            >
              {isRefreshingLocal ? (
                <ReloadIcon className="w-5 h-5 animate-spin text-indigo-600" />
              ) : (
                <ReloadIcon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
          </div>
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="sortOptionAdminHome" className="sr-only">
              Sắp xếp
            </label>
            <select
              id="sortOptionAdminHome"
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
              }}
              className="w-full h-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
            >
              <option value="default">🕒 Mới nhất</option>
              <option value="az">🔤 A - Z </option>
              <option value="za">🔤 Z - A </option>
            </select>
          </div>
          <div className="flex-grow sm:flex-grow-0">
            <label htmlFor="timeFilterOptionAdminHome" className="sr-only">
              Lọc thời gian
            </label>
            <select
              id="timeFilterOptionAdminHome"
              value={timeFilterOption}
              onChange={(e) => {
                setTimeFilterOption(e.target.value);
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
              {ITEMS_PER_PAGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o} / trang
                </option>
              ))}
            </select>
          </div>
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
              max={endDateFilter || undefined}
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
              min={startDateFilter || undefined}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
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
            setCurrentPage(1);
          }}
        />
      </div>

      {isLoading && !selectedEvent && !events.length ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <ReloadIcon className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="ml-3 text-gray-600 text-lg italic">Đang tải...</p>
        </div>
      ) : error && !events.length ? (
        <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
          Lỗi tải sự kiện: {error}
        </p>
      ) : selectedEvent ? (
        <div className="p-4 sm:p-6 border rounded-lg shadow-lg bg-white mb-6 relative animate-fadeIn">
          <button
            onClick={onBackToList}
            className="mb-4 text-sm text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer p-1 rounded hover:bg-indigo-50"
            aria-label="Quay lại danh sách"
          >
            <ChevronLeftIcon className="h-8 w-8 mr-1" />
            <span className="text-lg">Quay lại</span>
          </button>
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 pt-8 md:pt-0">
            <div className="flex-shrink-0 w-full md:w-1/3 lg:w-1/4">
              {selectedEvent.avatarUrl ? (
                <Image
                  src={selectedEvent.avatarUrl}
                  alt={`Avatar for ${selectedEvent.title}`}
                  width={300}
                  height={300}
                  className="w-full h-auto max-h-80 rounded-lg object-cover border p-1 bg-white shadow-md"
                  priority
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
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
            <div className="flex-grow space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex-1 break-words mr-2">
                  {selectedEvent.title}
                </h2>
                <div className="flex flex-col items-start sm:items-end sm:flex-row sm:ml-2 gap-1 mt-1 sm:mt-0 shrink-0">
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
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${getApprovalStatusBadgeColor(
                      selectedEvent.status
                    )}`}
                  >
                    {getApprovalStatusText(selectedEvent.status)}
                  </span>
                </div>
              </div>
              <div className="space-y-3 text-base text-gray-700 border-t pt-4">
                {selectedEvent.date && (
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
                        {selectedEvent.currentAttendeesCount ??
                          (selectedEvent.attendees?.filter(
                            (a) => a.attending !== false
                          ).length ||
                            0)}
                        {selectedEvent.maxAttendees !== null &&
                        selectedEvent.maxAttendees !== undefined &&
                        selectedEvent.maxAttendees >= 0
                          ? ` / ${selectedEvent.maxAttendees}`
                          : " / Không giới hạn"}
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
                              org.positionName && org.roleName ? " - " : ""
                            }${org.roleName || ""}${
                              org.positionName && org.roleName ? "" : ""
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
              <div className="space-y-1 text-sm border-t pt-4">
                <strong className="font-semibold text-gray-900 mb-1 block text-base">
                  👤 Người tham dự ({detailedParticipants.length}):
                </strong>
                {detailedParticipants.length > 0 ? (
                  <ul className="list-disc list-inside pl-5 text-gray-600 space-y-1 text-base max-h-40 overflow-y-auto pr-2">
                    {detailedParticipants.map((p, index) => (
                      <li key={`${p.userId}-${index}`}>
                        {p.fetchedFullName || `ID: ${p.userId}`}
                        {p.positionName || p.roleName
                          ? ` - ${p.positionName || ""}${
                              p.positionName && p.roleName ? " - " : ""
                            }${p.roleName || ""}${
                              p.positionName && p.roleName ? "" : ""
                            }`
                          : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic text-base ml-5">
                    {selectedEvent?.participants &&
                    selectedEvent.participants.length > 0
                      ? "Đang tải..."
                      : "Chưa có người tham dự."}
                  </p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap justify-end gap-3">
                {currentUserId && selectedEvent.createdBy === currentUserId && (
                  <>
                    <button
                      onClick={() => handleEditEvent(selectedEvent)}
                      className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow"
                      aria-label="Sửa sự kiện"
                    >
                      <Pencil2Icon className="w-4 h-4" /> Sửa sự kiện
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(selectedEvent)}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition text-sm font-medium flex items-center gap-1.5 shadow-sm hover:shadow"
                  aria-label="Xoá sự kiện"
                >
                  <TrashIcon className="w-4 h-4" /> Xoá sự kiện
                </button>
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
                        <ReloadIcon className="w-4 h-4 animate-spin mr-1" />
                        Đang đăng ký...
                      </>
                    ) : (
                      <>
                        <PersonIcon className="w-4 h-4" /> Đăng ký tham gia
                      </>
                    )}
                  </button>
                )}
                {selectedEvent.attendees?.some(
                  (att) =>
                    att.userId === currentUserId && att.attending !== false
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
        <div className="mt-1 mb-6">
          {processedEvents.length > 0 ? (
            viewMode === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                {paginatedEvents.map((event) => {
                  const timeStatus = getEventStatus(event.date);
                  const isMyEvent =
                    currentUserId && event.createdBy === currentUserId;
                  return (
                    <div
                      key={event.id}
                      className="bg-white shadow-md rounded-xl overflow-hidden transform transition duration-300 hover:scale-[1.02] hover:shadow-lg flex flex-col border border-gray-100 hover:border-indigo-200 cursor-pointer group"
                      onClick={() => onEventClick(event)}
                    >
                      <div className="w-full h-40 bg-gray-200 relative overflow-hidden">
                        {event.avatarUrl ? (
                          <Image
                            src={event.avatarUrl}
                            alt={event.title}
                            layout="fill"
                            objectFit="cover"
                            className="transition-transform duration-300 group-hover:scale-105"
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
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                          <span
                            className={`${getStatusBadgeClasses(
                              timeStatus
                            )} shadow-sm`}
                          >
                            {getStatusIcon(timeStatus)}{" "}
                            {getStatusText(timeStatus)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getApprovalStatusBadgeColor(
                              event.status
                            )} shadow-sm`}
                          >
                            {getApprovalStatusText(event.status)}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <div className="mb-3 flex-grow">
                          <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {event.title}
                          </h2>
                          <div className="space-y-1 mb-2 text-xs text-gray-600">
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
                          </div>
                        </div>
                        <div className="mt-auto pt-3 border-t border-gray-100 flex justify-end gap-2">
                          {isMyEvent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }}
                              className="px-2.5 py-1 rounded text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium flex items-center gap-1 transition"
                              aria-label={`Sửa ${event.title}`}
                            >
                              <Pencil2Icon className="w-3 h-3" /> Sửa
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(event);
                            }}
                            className="px-2.5 py-1 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1 transition"
                            aria-label={`Xoá ${event.title}`}
                          >
                            <TrashIcon className="w-3 h-3" /> Xoá
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                <ul className="divide-y divide-gray-200">
                  {paginatedEvents.map((event) => {
                    const timeStatus = getEventStatus(event.date);
                    const isMyEvent =
                      currentUserId && event.createdBy === currentUserId;
                    return (
                      <li
                        key={event.id}
                        className="px-4 py-3 hover:bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between transition-colors cursor-pointer group"
                        onClick={() => onEventClick(event)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {event.avatarUrl ? (
                            <div className="relative w-16 h-12 rounded overflow-hidden flex-shrink-0 hidden sm:block bg-gray-100">
                              <Image
                                src={event.avatarUrl}
                                alt={event.title}
                                layout="fill"
                                objectFit="cover"
                                className="transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  const t = e.target as HTMLImageElement;
                                  t.style.display = "none";
                                  const p = document.createElement("div");
                                  p.className =
                                    "w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 text-4xl font-semibold";
                                  p.textContent =
                                    event.title?.charAt(0).toUpperCase() || "?";
                                  t.parentElement?.appendChild(p);
                                }}
                              />
                            </div>
                          ) : (
                            <div className="relative w-16 h-12 rounded flex-shrink-0 hidden sm:block bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 items-center justify-center text-xl font-semibold flex">
                              {event.title?.charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm md:text-base text-gray-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                              {event.title}
                            </p>
                            <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="inline-flex items-center gap-1">
                                <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                                {formatFullDateTime(event.date, event.time)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-3.5 w-3.5 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {event.location || "N/A"}
                              </span>
                              <span
                                className={`${getStatusBadgeClasses(
                                  timeStatus
                                )}`}
                              >
                                {getStatusIcon(timeStatus)}{" "}
                                {getStatusText(timeStatus)}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getApprovalStatusBadgeColor(
                                  event.status
                                )}`}
                              >
                                {getApprovalStatusText(event.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 sm:mt-0 sm:ml-4 flex-shrink-0 flex items-center gap-2 justify-end">
                          {isMyEvent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEvent(event);
                              }}
                              className="px-3 py-1.5 rounded-md text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 transition font-medium flex items-center gap-1"
                              aria-label={`Sửa ${event.title}`}
                            >
                              <Pencil2Icon className="w-3.5 h-3.5" /> Sửa
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(event);
                            }}
                            className="px-3 py-1.5 rounded-md text-xs bg-red-100 text-red-700 hover:bg-red-200 transition font-medium flex items-center gap-1"
                            aria-label={`Xoá ${event.title}`}
                          >
                            <TrashIcon className="w-3.5 h-3.5" /> Xoá
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          ) : (
            <p className="text-gray-500 text-center col-span-1 md:col-span-2 lg:col-span-3 py-6 italic">
              Không có sự kiện nào.
            </p>
          )}
          {processedEvents.length > 0 && totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-4">
              <span className="text-sm text-gray-600">
                Trang <span className="font-semibold">{currentPage}</span> /{" "}
                <span className="font-semibold">{totalPages}</span> (Tổng:{" "}
                <span className="font-semibold">{totalItems}</span> sự kiện)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-md border bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  aria-label="Trang trước"
                >
                  <ChevronLeftIcon className="w-4 h-4" /> Trước
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-md border bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  aria-label="Trang sau"
                >
                  Sau <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {eventToEdit && (
        <ModalUpdateEvent
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setEventToEdit(null);
          }}
          editingEvent={eventToEdit}
          onSuccess={handleEventUpdatedSuccessfully}
          user={currentUser}
        />
      )}
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
        confirmVariant="danger"
        cancelText="Huỷ bỏ"
      />
    </div>
  );
};

export default AdminHomeTabContent;
