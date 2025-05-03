"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { toast } from "react-hot-toast";
import { BTCSection, type BTCSectionHandle } from "../BTCSection";
import {
  ParticipantSection,
  type ParticipantSectionHandle,
} from "../ParticipantSection";
import EventList from "../ListEvenUser"; // Component này sẽ chứa logic QR
import { User as MainUserType } from "../homeuser";

export type ApiUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email?: string;
  role?: string;
};

export type EventMember = {
  userId: string;
  roleId?: string;
  positionId?: string;
  roleName?: string;
  positionName?: string;
};

export type Event = {
  id: string;
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
  attendees?: any[];
  rejectionReason?: string | null;
  createdAt?: string;
};

export type EventMemberInput = {
  userId: string;
  roleId: string;
  positionId: string;
};

const INITIAL_EVENT_STATE: Omit<Event, "id"> & { id?: string } = {
  name: "",
  purpose: "",
  time: "",
  location: "",
  content: "",
  organizers: [],
  participants: [],
  permissions: [],
};

interface CreateEventTabContentProps {
  user: MainUserType | null;
  onEventCreated: () => void;
}

const CreateEventTabContent: React.FC<CreateEventTabContentProps> = ({
  user,
  onEventCreated,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [currentEventData, setCurrentEventData] = useState<
    Omit<Event, "id"> & { id?: string }
  >(INITIAL_EVENT_STATE);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [availablePermissions] = useState([
    "Giảng viên",
    "Sinh viên",
    "Quản trị viên",
  ]);
  const btcSectionRef = useRef<BTCSectionHandle>(null);
  const participantSectionRef = useRef<ParticipantSectionHandle>(null);

  const getUserFullName = useCallback(
    (userId: string | undefined, usersList: ApiUser[]): string => {
      if (!userId) return "(Không xác định)";
      if (!usersList || usersList.length === 0) return `(Loading...)`;
      const userFound = usersList.find((u) => u.id === userId);
      if (!userFound) return `(ID: ${userId.substring(0, 8)}...)`;
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
    const fetchRequiredData = async () => {
      setIsFetchingUsers(true);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Token không tồn tại.");
        const headers = { Authorization: `Bearer ${token}` };
        const auRes = await fetch("http://localhost:8080/identity/users", {
          headers,
        });
        if (!auRes.ok) {
          const d = await auRes.json().catch(() => {});
          throw new Error(d?.message || "Lỗi lấy danh sách người dùng");
        }
        const auData = await auRes.json();
        if (auData?.code !== 1000) {
          throw new Error(auData?.message || "Lỗi API Users");
        }

        setAllUsers(auData?.result || []);
      } catch (error: any) {
        console.error("Lỗi tải dữ liệu người dùng:", error);
        toast.error(`Lỗi tải dữ liệu User: ${error.message}`);
        setAllUsers([]);
      } finally {
        setIsFetchingUsers(false);
      }
    };
    fetchRequiredData();
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      return;
    }
    setIsFetchingEvents(true);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const url = `http://localhost:8080/identity/api/events/creator/${user.id}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        let m = `Lỗi tải sự kiện (${res.status})`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(m);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setEvents(data.result);
      } else {
        console.error(
          "API lấy danh sách sự kiện trả về lỗi hoặc sai định dạng:",
          data
        );
        setEvents([]);
      }
    } catch (error: any) {
      toast.error(`Lỗi tải danh sách sự kiện: ${error.message}`);
      console.error("Fetch events error:", error);
      setEvents([]);
    } finally {
      setIsFetchingEvents(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id && !isFetchingUsers) {
      fetchEvents();
    } else if (!user?.id) {
      setEvents([]);
    }
  }, [user, fetchEvents, isFetchingUsers]);

  useEffect(() => {
    if (user && !editingEventId && !currentEventData.createdBy) {
      setCurrentEventData((prev) => ({ ...prev, createdBy: user.id }));
    }
  }, [user, editingEventId, currentEventData.createdBy]);

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

  const handleSetEditingEvent = useCallback(
    (eventToEdit: Event | null) => {
      if (eventToEdit) {
        const timeForInput = eventToEdit.time
          ? eventToEdit.time.slice(0, 16)
          : "";
        const eventDataForForm: Event = {
          ...INITIAL_EVENT_STATE,
          ...eventToEdit,
          time: timeForInput,
          organizers: eventToEdit.organizers || [],
          participants: eventToEdit.participants || [],
          permissions: eventToEdit.permissions || [],
        };
        setCurrentEventData(eventDataForForm);
        setEditingEventId(eventToEdit.id);
        btcSectionRef.current?.resetForms();
        participantSectionRef.current?.resetForms();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setCurrentEventData({
          ...INITIAL_EVENT_STATE,
          createdBy: user?.id || "",
        });
        setEditingEventId(null);
        btcSectionRef.current?.resetForms();
        participantSectionRef.current?.resetForms();
      }
    },
    [user]
  );

  const cancelEdit = () => handleSetEditingEvent(null);

  const handleSubmitEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token || !user) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsLoading(false);
      return;
    }

    const organizersFromSection: EventMemberInput[] =
      btcSectionRef.current?.getMembersData() ?? [];
    const participantsFromSection: EventMemberInput[] =
      participantSectionRef.current?.getMembersData() ?? [];

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
      const value = currentEventData[field as keyof typeof currentEventData];
      return value === null || value === undefined || value === "";
    });
    if (missingFields.length > 0) {
      const fieldLabels: Record<string, string> = {
        name: "Tên",
        purpose: "Mục đích",
        time: "Ngày giờ",
        location: "Địa điểm",
        content: "Nội dung",
        permissions: "Đối tượng",
      };
      const names = missingFields.map((f) => fieldLabels[f] || f).join(", ");
      toast.error(`Vui lòng nhập/chọn: ${names}`);
      setIsLoading(false);
      return;
    }
    const existingOrganizers = editingEventId
      ? currentEventData.organizers
      : [];
    if (organizersFromSection.length === 0 && existingOrganizers.length === 0) {
      toast.error("Vui lòng thêm ít nhất một người vào Ban Tổ Chức.");
      setIsLoading(false);
      return;
    }

    const isEditing = !!editingEventId;
    const url = isEditing
      ? `http://localhost:8080/identity/api/events/${editingEventId}`
      : "http://localhost:8080/identity/api/events";
    const method = isEditing ? "PUT" : "POST";

    const formattedOrganizers = organizersFromSection.map((org) => ({
      userId: org.userId,
    }));
    const formattedParticipants = participantsFromSection.map((p) => ({
      userId: p.userId,
      positionId: p.positionId,
      roleId: p.roleId,
    }));

    let requestBodyBase: any = {
      name: currentEventData.name,
      purpose: currentEventData.purpose,
      time: currentEventData.time
        ? new Date(currentEventData.time).toISOString()
        : null,
      location: currentEventData.location,
      content: currentEventData.content,
      permissions: currentEventData.permissions || [],
    };

    if (!isEditing) {
      requestBodyBase.createdBy = user?.id;
      requestBodyBase.organizers = formattedOrganizers;
      requestBodyBase.participants = formattedParticipants;
      requestBodyBase.attendees = [];
    } else {
      requestBodyBase = {
        id: editingEventId,
        name: currentEventData.name,
        purpose: currentEventData.purpose,
        time: currentEventData.time
          ? new Date(currentEventData.time).toISOString()
          : null,
        location: currentEventData.location,
        content: currentEventData.content,
        organizers: formattedOrganizers,
        participants: formattedParticipants,
        permissions: currentEventData.permissions || [],
        status: currentEventData.status,
      };
    }

    console.log(`[${method}] Request to ${url}`);
    console.log("Request Body:", JSON.stringify(requestBodyBase, null, 2));

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBodyBase),
      });
      if (!response.ok) {
        let msg = `${isEditing ? "Cập nhật" : "Thêm"} lỗi (${response.status})`;
        try {
          const d = await response.json();
          msg = d?.message || msg;
          console.error("Server Error:", d);
        } catch (e) {
          try {
            const t = await response.text();
            console.error("Server Error Text:", t);
            msg = `${msg}: ${t.slice(0, 100)}`;
          } catch (_) {}
        }
        throw new Error(msg);
      }
      const result = await response.json();
      if (result.code === 1000) {
        toast.success(`${isEditing ? "Cập nhật" : "Thêm"} thành công!`);
        handleSetEditingEvent(null);
        await fetchEvents();
        onEventCreated();
      } else {
        throw new Error(
          result.message || `Lỗi khi ${isEditing ? "cập nhật" : "thêm"}`
        );
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(
        error.message || `Lỗi khi ${isEditing ? "cập nhật" : "thêm"}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isPageLoading = isFetchingUsers;

  return (
    <div>
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
          {editingEventId ? "✏️ Chỉnh sửa Sự kiện" : "➕ Tạo sự kiện mới"}
        </h2>
        {isPageLoading ? (
          <div className="text-center py-10 text-gray-500">
            {" "}
            Đang tải dữ liệu cần thiết...{" "}
          </div>
        ) : (
          <form onSubmit={handleSubmitEvent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {" "}
                  Tên sự kiện <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={currentEventData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="time"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {" "}
                  Ngày giờ <span className="text-red-500">*</span>
                </label>
                <input
                  id="time"
                  type="datetime-local"
                  name="time"
                  value={currentEventData.time}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {" "}
                  Địa điểm <span className="text-red-500">*</span>
                </label>
                <input
                  id="location"
                  type="text"
                  name="location"
                  value={currentEventData.location}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Người tạo
                </label>
                <input
                  type="text"
                  value={getUserFullName(
                    editingEventId ? currentEventData.createdBy : user?.id,
                    allUsers
                  )}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="purpose"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {" "}
                  Mục đích <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="purpose"
                  name="purpose"
                  rows={3}
                  value={currentEventData.purpose}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {" "}
                  Nội dung <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  name="content"
                  rows={4}
                  value={currentEventData.content}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {" "}
                  Đối tượng tham gia <span className="text-red-500">*</span>
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
                        className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{p}</span>
                    </label>
                  ))}
                </div>
                {(!currentEventData.permissions ||
                  currentEventData.permissions.length === 0) && (
                  <p className="text-xs text-red-500 mt-1">
                    Chọn ít nhất một đối tượng.
                  </p>
                )}
              </div>
            </div>

            <BTCSection
              ref={btcSectionRef}
              existingOrganizers={
                editingEventId ? currentEventData.organizers : []
              }
            />
            <ParticipantSection
              ref={participantSectionRef}
              allUsers={allUsers}
              existingParticipants={
                editingEventId ? currentEventData.participants : []
              }
            />

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              {editingEventId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer text-sm"
                >
                  {" "}
                  Hủy bỏ{" "}
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || isPageLoading}
                className={`px-6 py-2 text-white rounded cursor-pointer text-sm font-medium ${
                  isLoading || isPageLoading
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    {" "}
                    <svg
                      className="animate-spin mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      {" "}
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      ></circle>{" "}
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        className="opacity-75"
                      ></path>{" "}
                    </svg>{" "}
                    Đang xử lý...{" "}
                  </span>
                ) : editingEventId ? (
                  "Cập nhật sự kiện"
                ) : (
                  "Gửi yêu cầu tạo"
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          Danh sách sự kiện đã tạo
        </h2>
        {isFetchingEvents ? (
          <div className="text-center py-10 text-gray-500">
            Đang tải danh sách...
          </div>
        ) : (
          <EventList
            events={events}
            setEvents={setEvents}
            users={allUsers}
            currentUser={user as ApiUser | undefined}
            setEditingEvent={handleSetEditingEvent}
            refreshEvents={fetchEvents}
          />
        )}
      </div>
    </div>
  );
};

export default CreateEventTabContent;