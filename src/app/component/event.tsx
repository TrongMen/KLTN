"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
// *** Sử dụng named import ***
import { BTCSection, type BTCSectionHandle } from "./BTCSection";
import {
  ParticipantSection,
  type ParticipantSectionHandle,
} from "../component/ParticipantSection";
import EventList from "./ListEvenUser"; // File này chứa cả ConfirmDialog

// --- START: Định nghĩa Types chung ---
// (Nên tách ra file types.ts riêng nếu dự án lớn)
export type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  role?: string;
};
export type ApiRole = { id: string; name: string };
export type ApiPosition = { id: string; name: string };

// Kiểu EventMember phản ánh API GET trả về (có thể có name) và dùng trong EventList
export type EventMember = {
  userId: string;
  roleId?: string;
  positionId?: string;
  roleName?: string;
  positionName?: string;
};

// Kiểu Event chính, dùng cho state `events` và props của `EventList`
export type Event = {
  id?: string;
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
  attendees?: any[]; // Giữ lại nếu API GET trả về
  rejectionReason?: string | null;
  createdAt?: string;
};

// Kiểu EventMemberInput chỉ dùng khi GỬI dữ liệu (cần ID)
export type EventMemberInput = {
  userId: string;
  roleId: string;
  positionId: string;
};

// --- END: Định nghĩa Types chung ---

// State khởi tạo dùng Type Event
const INITIAL_EVENT_STATE: Event = {
  name: "",
  purpose: "",
  time: "",
  location: "",
  content: "",
  organizers: [],
  participants: [],
  permissions: [],
};

export default function EventManagementPage() {
  const [events, setEvents] = useState<Event[]>([]); // State dùng Type Event
  const [currentEventData, setCurrentEventData] =
    useState<Event>(INITIAL_EVENT_STATE); // State dùng Type Event
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true);
  const [availablePermissions] = useState([
    "Giảng viên",
    "Sinh viên",
    "Quản trị viên",
  ]);
  const router = useRouter();

  const btcSectionRef = useRef<BTCSectionHandle>(null);
  const participantSectionRef = useRef<ParticipantSectionHandle>(null);

  const getUserFullName = useCallback(
    (userId: string, usersList: ApiUser[]): string => {
      if (!usersList || usersList.length === 0) return `(Loading...)`;
      const userFound = usersList.find((u) => u.id === userId);
      if (!userFound)
        return `(ID: ${userId ? userId.substring(0, 8) : "N/A"}...)`;
      const fullName = `${userFound.lastName || ""} ${
        userFound.firstName || ""
      }`.trim();
      return (
        fullName || userFound.username || `(ID: ${userId.substring(0, 8)}...)`
      );
    },
    []
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsFetchingInitialData(true);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Token không tồn tại.");
        const headers = { Authorization: `Bearer ${token}` };
        const [uiRes, auRes] = await Promise.all([
          fetch("http://localhost:8080/identity/users/myInfo", { headers }),
          fetch("http://localhost:8080/identity/users", { headers }),
        ]);
        if (!uiRes.ok) {
          const d = await uiRes.json().catch(() => {});
          throw new Error(d?.message || "Lỗi lấy info user");
        }
        if (!auRes.ok) {
          const d = await auRes.json().catch(() => {});
          throw new Error(d?.message || "Lỗi lấy all users");
        }
        const uiData = await uiRes.json();
        const auData = await auRes.json();
        if (uiData.result) setCurrentUser(uiData.result);
        else throw new Error("User data invalid");
        setAllUsers(auData?.result || []);
        console.log("Fetched all users:", auData?.result?.length);
      } catch (error: any) {
        console.error("Lỗi tải initial data:", error);
        toast.error(`Lỗi tải data: ${error.message}`);
      } finally {
        setIsFetchingInitialData(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!editingEventId && currentUser && !currentEventData.createdBy) {
      setCurrentEventData((prev) => ({ ...prev, createdBy: currentUser.id }));
    }
  }, [currentUser, editingEventId, currentEventData.createdBy]);

  // fetchEvents sẽ set state `events` với kiểu dữ liệu Event (có thể chứa name)
  const fetchEvents = useCallback(async () => {
    if (!currentUser?.id) {
      setEvents([]);
      return;
    }
    console.log(`Workspaceing events...`);
    setIsFetchingEvents(true);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const url = `http://localhost:8080/identity/api/events/creator/${currentUser.id}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        let m = `Lỗi tải sự kiện`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(m);
      }
      const data = await res.json();
      if (data.code === 1000 && data.result) {
        console.log(
          "Fetched events data:",
          JSON.stringify(data.result, null, 2)
        ); // Kiểm tra cấu trúc trả về ở đây
        setEvents(Array.isArray(data.result) ? data.result : []); // setEvents với dữ liệu API trả về
      } else {
        console.error("API events data error:", data);
        setEvents([]);
        throw new Error(data.message || "Lỗi cấu trúc events");
      }
    } catch (error: any) {
      toast.error(`Lỗi tải sự kiện: ${error.message}`);
      console.error("Fetch events error:", error);
      setEvents([]);
    } finally {
      setIsFetchingEvents(false);
    }
  }, [currentUser]); // Bỏ fetchEvents khỏi dependency của chính nó

  useEffect(() => {
    if (currentUser?.id && !isFetchingInitialData) {
      fetchEvents();
    } else if (!currentUser?.id) {
      setEvents([]);
    }
  }, [currentUser, fetchEvents, isFetchingInitialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCurrentEventData((prev) => ({ ...prev, [name]: value }));
  };
  const handlePermissionChange = (permission: string) => {
    setCurrentEventData((prev) => {
      const ps = prev.permissions || [];
      return {
        ...prev,
        permissions: ps.includes(permission)
          ? ps.filter((p) => p !== permission)
          : [...ps, permission],
      };
    });
  };

  // handleSetEditingEvent làm việc với Type Event
  const handleSetEditingEvent = useCallback(
    (eventToEdit: Event | null) => {
      // Sửa thành Type Event
      if (eventToEdit) {
        const timeForInput = eventToEdit.time
          ? eventToEdit.time.slice(0, 16)
          : "";
        const eventDataForForm: Event = {
          // Dùng Type Event
          ...INITIAL_EVENT_STATE,
          ...eventToEdit,
          time: timeForInput,
          organizers: eventToEdit.organizers || [],
          participants: eventToEdit.participants || [],
          permissions: eventToEdit.permissions || [],
        };
        setCurrentEventData(eventDataForForm);
        setEditingEventId(eventToEdit.id || null);
        btcSectionRef.current?.resetForms();
        participantSectionRef.current?.resetForms();
      } else {
        setCurrentEventData({
          ...INITIAL_EVENT_STATE,
          createdBy: currentUser?.id || "",
        });
        setEditingEventId(null);
        btcSectionRef.current?.resetForms();
        participantSectionRef.current?.resetForms();
      }
    },
    [currentUser]
  ); // Phụ thuộc currentUser

  const cancelEdit = () => handleSetEditingEvent(null);

  const handleSubmitEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsLoading(false);
      return;
    }

    const organizersFromSection = btcSectionRef.current?.getMembersData() ?? [];
    const participantsFromSection =
      participantSectionRef.current?.getMembersData() ?? [];
    console.log("Data from BTC Section for submit:", organizersFromSection);
    console.log(
      "Data from Participant Section for submit:",
      participantsFromSection
    );

    // Validate fields cơ bản của currentEventData
    const requiredFields: (keyof Omit<
      Event,
      | "id"
      | "createdBy"
      | "status"
      | "image"
      | "organizers"
      | "participants"
      | "attendees"
      | "rejectionReason"
      | "createdAt"
    >)[] = ["name", "purpose", "time", "location", "content", "permissions"];
    const missingFields = requiredFields.filter((field) => {
      if (field === "permissions")
        return (
          !currentEventData.permissions ||
          currentEventData.permissions.length === 0
        );
      const value = currentEventData[field];
      return value === null || value === undefined || value === "";
    });
    if (missingFields.length > 0) {
      const names = missingFields
        .map((f) => {
          if (f === "permissions") return "Quyền";
          if (f === "time") return "Ngày giờ";
          return f[0].toUpperCase() + f.slice(1);
        })
        .join(", ");
      toast.error(`Nhập/chọn: ${names}`);
      setIsLoading(false);
      return;
    }

    const isEditing = !!editingEventId;
    const url = isEditing
      ? `http://localhost:8080/identity/api/events/${editingEventId}`
      : "http://localhost:8080/identity/api/events";
    const method = isEditing ? "PUT" : "POST";

    // Tạo request body cuối cùng để gửi đi, đảm bảo dùng đúng Type EventMemberInput (chứa ID)
    const finalRequestBody = {
      // Lấy các trường từ currentEventData (ngoại trừ organizers/participants cũ nếu đang edit)
      ...currentEventData,
      id: isEditing ? editingEventId : undefined, // ID chỉ khi edit
      createdBy: isEditing ? currentEventData.createdBy : currentUser?.id, // Giữ lại creator nếu edit, nếu không thì là user hiện tại
      // Gộp thành viên cũ (nếu edit và không bị trùng) với thành viên mới từ section
      organizers: organizersFromSection, // Chỉ gửi những gì lấy từ ref (đã là EventMemberInput)
      participants: participantsFromSection, // Chỉ gửi những gì lấy từ ref (đã là EventMemberInput)
    };

    // Xóa các trường không cần thiết hoặc không có trong API POST/PUT endpoint
    delete finalRequestBody.attendees;
    delete finalRequestBody.rejectionReason;
    delete finalRequestBody.createdAt;
    if (!isEditing) delete finalRequestBody.id; // Đảm bảo không có id khi tạo mới

    console.log(`[${method}] Request to ${url}`);
    console.log(
      "Request Body SENDING:",
      JSON.stringify(finalRequestBody, null, 2)
    ); // <<< KIỂM TRA LOG NÀY

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalRequestBody),
      });
      if (!response.ok) {
        let msg = `${isEditing ? "Cập nhật" : "Thêm"} lỗi (${response.status})`;
        let serverData = null;
        try {
          serverData = await response.json();
          msg = serverData?.message || msg;
          console.error("Server Error:", serverData);
        } catch (e) {
          try {
            const t = await response.text();
            console.error("Server Error Text:", t);
            msg = `${msg}: ${t.slice(0, 100)}`;
          } catch (_) {}
        }
        throw new Error(msg);
      }
      toast.success(`${isEditing ? "Cập nhật" : "Thêm"} thành công!`);
      handleSetEditingEvent(null);
      await fetchEvents();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(
        error.message || `Lỗi khi ${isEditing ? "cập nhật" : "thêm"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isPageLoading = isFetchingInitialData;

  return (
    // --- Phần JSX Render giữ nguyên ---
    <div className="container mx-auto p-4 max-w-6xl">
      <Toaster toastOptions={{ duration: 3500 }} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          🎉 Quản lý sự kiện
        </h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-3 bg-gray-100 rounded-md hover:bg-gray-200 text-sm text-gray-700 flex items-center cursor-pointer"
          aria-label="Quay lại"
          title="Quay lại"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Quay lại
        </button>
      </div>
      {isPageLoading ? (
        <div className="text-center py-10 text-gray-500">Đang tải...</div>
      ) : (
        <>
          <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              {editingEventId ? "✏️ Chỉnh sửa Sự kiện" : "➕ Thêm Sự kiện Mới"}
            </h2>
            <form onSubmit={handleSubmitEvent}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Tên *
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={currentEventData.name}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="time"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Ngày giờ *
                  </label>
                  <input
                    id="time"
                    type="datetime-local"
                    name="time"
                    value={currentEventData.time}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Địa điểm *
                  </label>
                  <input
                    id="location"
                    type="text"
                    name="location"
                    value={currentEventData.location}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Người tạo
                  </label>
                  <input
                    type="text"
                    value={
                      editingEventId && currentEventData.createdBy
                        ? getUserFullName(currentEventData.createdBy, allUsers)
                        : currentUser
                        ? `${currentUser.lastName} ${currentUser.firstName}`
                        : "..."
                    }
                    readOnly
                    className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label
                  htmlFor="purpose"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mục đích *
                </label>
                <textarea
                  id="purpose"
                  name="purpose"
                  rows={3}
                  value={currentEventData.purpose}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mt-4">
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nội dung *
                </label>
                <textarea
                  id="content"
                  name="content"
                  rows={4}
                  value={currentEventData.content}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quyền *
                </label>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {availablePermissions.map((p) => (
                    <label
                      key={p}
                      className="inline-flex items-center cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={currentEventData.permissions?.includes(p)}
                        onChange={() => handlePermissionChange(p)}
                        className="form-checkbox h-5 w-5 text-blue-600"
                      />
                      <span className="ml-2 text-gray-700">{p}</span>
                    </label>
                  ))}
                </div>
                {(!currentEventData.permissions ||
                  currentEventData.permissions.length === 0) && (
                  <p className="text-xs text-red-500 mt-1">
                    Chọn ít nhất một quyền.
                  </p>
                )}
              </div>

              {/* Truyền ref và props cần thiết */}
              <BTCSection
                ref={btcSectionRef}
                allUsers={allUsers}
                existingOrganizers={currentEventData.organizers}
              />
              <ParticipantSection
                ref={participantSectionRef}
                allUsers={allUsers}
                existingParticipants={currentEventData.participants}
              />

              <div className="flex justify-end gap-3 mt-6">
                {editingEventId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-6 py-2 text-white rounded cursor-pointer ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg
                        className="animate-spin mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="opacity-25"
                        ></circle>
                        <path
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          className="opacity-75"
                        ></path>
                      </svg>
                      Đang xử lý...
                    </span>
                  ) : editingEventId ? (
                    "Cập nhật"
                  ) : (
                    "Thêm sự kiện"
                  )}
                </button>
              </div>
            </form>
          </div>

          {isFetchingEvents ? (
            <div className="text-center py-10 text-gray-500">
              Đang tải danh sách...
            </div>
          ) : (
            <EventList
              events={events}
              setEvents={setEvents}
              users={allUsers}
              currentUser={currentUser || undefined}
              setEditingEvent={handleSetEditingEvent}
            />
          )}
        </>
      )}
    </div>
  );
}
