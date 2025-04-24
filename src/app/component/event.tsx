"use client";

import React, { useState, useEffect, useCallback, useRef } from "react"; // Thêm useRef
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import BTCSection, { BTCSectionHandle } from "./BTCSection"; // Import thêm Handle type
import ParticipantSection, {
  ParticipantSectionHandle,
} from "./ParticipantSection"; // Import thêm Handle type
import EventList from "./ListEvenUser";

// --- Các Types giữ nguyên như trước ---
type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  role?: string;
};
type EventMemberInput = { userId: string; roleId: string; positionId: string };
type EventData = {
  id?: string;
  name: string;
  purpose: string;
  time: string;
  location: string;
  content: string;
  createdBy?: string;
  organizers: EventMemberInput[];
  participants: EventMemberInput[];
  permissions: string[];
  status?: "PENDING" | "APPROVED" | "REJECTED";
  image?: string;
};

const INITIAL_EVENT_STATE: EventData = {
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
  const [events, setEvents] = useState<EventData[]>([]);
  const [currentEventData, setCurrentEventData] =
    useState<EventData>(INITIAL_EVENT_STATE);
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

  // --- Tạo Refs ---
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
        );
        setEvents(Array.isArray(data.result) ? data.result : []);
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
  }, []);

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

  const handleSetEditingEvent = useCallback((eventToEdit: EventData | null) => {
    if (eventToEdit) {
      const timeForInput = eventToEdit.time
        ? eventToEdit.time.slice(0, 16)
        : "";
      const eventDataForForm: EventData = {
        ...INITIAL_EVENT_STATE,
        ...eventToEdit,
        time: timeForInput,
        organizers: eventToEdit.organizers || [],
        participants: eventToEdit.participants || [],
        permissions: eventToEdit.permissions || [],
      };
      setCurrentEventData(eventDataForForm);
      setEditingEventId(eventToEdit.id || null);
      // Reset child forms when editing starts
      btcSectionRef.current?.resetForms();
      participantSectionRef.current?.resetForms();
    } else {
      setCurrentEventData({
        ...INITIAL_EVENT_STATE,
        createdBy: currentUser?.id || "",
      });
      setEditingEventId(null);
      // Reset child forms when cancelling edit / starting new
      btcSectionRef.current?.resetForms();
      participantSectionRef.current?.resetForms();
    }
  }, []);

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

    // --- Thu thập dữ liệu từ các Section con ---
    const organizersFromSection = btcSectionRef.current?.getMembersData() ?? [];
    const participantsFromSection =
      participantSectionRef.current?.getMembersData() ?? [];
    console.log("Data from BTC Section:", organizersFromSection);
    console.log("Data from Participant Section:", participantsFromSection);

    // --- Validate dữ liệu chính ---
    const requiredFields: (keyof Omit<
      EventData,
      "id" | "createdBy" | "status" | "image" | "organizers" | "participants"
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

    // --- Tạo Request Body ---
    const requestBody: EventData = {
      ...currentEventData,
      organizers: organizersFromSection,
      participants: participantsFromSection,
    };
    if (!isEditing) {
      delete requestBody.id;
      requestBody.createdBy = currentUser?.id;
    } else {
      requestBody.id = editingEventId;
    }

    console.log(`[${method}] Request to ${url}`);
    console.log("Request Body SENDING:", JSON.stringify(requestBody, null, 2)); // <<< KIỂM TRA LOG NÀY

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
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
      handleSetEditingEvent(null); // Reset form và child forms
      await fetchEvents(); // Fetch lại list
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
    <div className="container mx-auto p-4 max-w-6xl">
      <Toaster toastOptions={{ duration: 3500 }} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          🎉 Quản lý sự kiện
        </h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 text-sm text-gray-700 flex items-center"
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
                    Tên sự kiện *
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
                  Quyền truy cập *
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

              {/* Truyền ref và dữ liệu cần thiết (allUsers) */}
              <BTCSection ref={btcSectionRef} allUsers={allUsers} />
              <ParticipantSection
                ref={participantSectionRef}
                allUsers={allUsers}
              />

              <div className="flex justify-end gap-3 mt-6">
                {editingEventId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Hủy bỏ
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-6 py-2 text-white rounded ${
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
