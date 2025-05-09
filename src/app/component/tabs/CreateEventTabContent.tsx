"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { BTCSection, type BTCSectionHandle } from "../../../sections/BTCSection";
import {
  ParticipantSection,
  type ParticipantSectionHandle,
} from "../../../sections/ParticipantSection";
import EventList from "../../../sections/ListEvenUser";
import { User as MainUserType } from "../homeuser";
import type { OrganizerData } from "../../../sections/BTCSection";
import type { ParticipantData } from "../../../sections/ParticipantSection";


export type ApiUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email?: string;
  role?: string;
  position?: { id: string; name: string } | null;
  organizerRole?: { id: string; name: string } | null;
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
  status?: "PENDING" | "APPROVED" | "REJECTED";
  image?: string;
  avatarUrl?: string | null;
  attendees?: any[];
  rejectionReason?: string | null;
  createdAt?: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  progressStatus?: string;
  qrCodeUrl?: string | null;
  maxAttendees?: number | null;
};

export type EventMemberInput = {
  userId: string;
  roleId: string;
  positionId: string;
};

const INITIAL_EVENT_STATE: Omit<Event, "id" | "status"> & { id?: string, status?: "PENDING" | "APPROVED" | "REJECTED" } = {
  name: "",
  purpose: "",
  time: "",
  location: "",
  content: "",
  organizers: [],
  participants: [],
  avatarUrl: null,
  maxAttendees: null,
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
    Omit<Event, "id" | "status"> & { id?: string, status?: "PENDING" | "APPROVED" | "REJECTED" }
  >(INITIAL_EVENT_STATE);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const btcSectionRef = useRef<BTCSectionHandle>(null);
  const participantSectionRef = useRef<ParticipantSectionHandle>(null);
  const [formChangeCounter, setFormChangeCounter] = useState(0);

  const handleChildFormChange = useCallback(() => {
      setFormChangeCounter(prev => prev + 1);
  }, []);


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

  const transformToOrganizerDataArray = useCallback((members: EventMember[] | undefined): OrganizerData[] => {
    if (!members) return [];
    return members
      .filter(
        (member): member is EventMember & { roleId: string; positionId: string } =>
          typeof member.roleId === 'string' && member.roleId !== '' &&
          typeof member.positionId === 'string' && member.positionId !== ''
      )
      .map((member) => ({
        userId: member.userId,
        roleId: member.roleId,
        positionId: member.positionId,
      }));
  }, []);

  const transformToParticipantDataArray = useCallback((members: EventMember[] | undefined): ParticipantData[] => {
    if (!members) return [];
    return members
      .filter(
        (member): member is EventMember & { roleId: string; positionId: string } =>
          typeof member.roleId === 'string' && member.roleId !== '' &&
          typeof member.positionId === 'string' && member.positionId !== ''
      )
      .map((member) => ({
        userId: member.userId,
        roleId: member.roleId,
        positionId: member.positionId,
      }));
  }, []);


  const globallyBusyUserIds = useMemo((): Set<string> => {
      const ids = new Set<string>();

      const btcFormUserIds = btcSectionRef.current?.getFormUserIds?.() || [];
      btcFormUserIds.forEach(id => { if (id) ids.add(id); });

      const participantFormUserIds = participantSectionRef.current?.getFormUserIds?.() || [];
      participantFormUserIds.forEach(id => { if (id) ids.add(id); });

      if (editingEventId) {
          const initialOrganizers = transformToOrganizerDataArray(currentEventData.organizers);
          initialOrganizers.forEach(org => ids.add(org.userId));

          const initialParticipants = transformToParticipantDataArray(currentEventData.participants);
          initialParticipants.forEach(p => ids.add(p.userId));
      }
      return ids;
  }, [formChangeCounter, editingEventId, currentEventData.organizers, currentEventData.participants, transformToOrganizerDataArray, transformToParticipantDataArray]);


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
          const d = await auRes.json().catch(() => ({}));
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
        console.error("API lấy danh sách sự kiện lỗi:", data);
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
    if (name === "maxAttendees") {
      const numValue = parseInt(value, 10);
      setCurrentEventData((prev) => ({
        ...prev,
        [name]: value === "" ? null : (isNaN(numValue) ? prev.maxAttendees : numValue),
      }));
    } else {
      setCurrentEventData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreviewUrl(previewUrl);
    } else {
      setAvatarFile(null);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
    }
  };

  useEffect(() => {
    const currentPreviewUrl = avatarPreviewUrl;
    return () => {
      if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const resetFormState = useCallback(() => {
    setCurrentEventData({ ...INITIAL_EVENT_STATE, createdBy: user?.id || "", maxAttendees: null });
    setEditingEventId(null);
    setAvatarFile(null);
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl(null);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
    btcSectionRef.current?.resetForms();
    participantSectionRef.current?.resetForms();
    handleChildFormChange(); 
  }, [user, avatarPreviewUrl, handleChildFormChange]);

  const handleSetEditingEvent = useCallback(
    (eventToEdit: Event | null) => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);

      if (eventToEdit) {
        const timeForInput = eventToEdit.time
          ? eventToEdit.time.slice(0, 16)
          : "";
        const eventDataForForm = {
          ...INITIAL_EVENT_STATE,
          ...eventToEdit,
          time: timeForInput,
          organizers: eventToEdit.organizers || [],
          participants: eventToEdit.participants || [],
          avatarUrl: eventToEdit.avatarUrl || null,
          maxAttendees: eventToEdit.maxAttendees === undefined ? null : eventToEdit.maxAttendees,
        };
        setCurrentEventData(eventDataForForm);
        setEditingEventId(eventToEdit.id);
        setAvatarFile(null);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
        
        btcSectionRef.current?.resetForms(); 
        participantSectionRef.current?.resetForms();
        handleChildFormChange(); 
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        resetFormState();
      }
    },
    [resetFormState, avatarPreviewUrl, handleChildFormChange]
  );

  const cancelEdit = () => handleSetEditingEvent(null);

  const uploadAvatar = async (eventId: string, token: string) => {
    if (!avatarFile) return;
    const formData = new FormData();
    formData.append("file", avatarFile);
    const avatarApiUrl = `http://localhost:8080/identity/api/events/${eventId}/avatar`;

    try {
      const avatarResponse = await fetch(avatarApiUrl, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!avatarResponse.ok) {
        let errorMsg = `Lỗi upload avatar (${avatarResponse.status} ${avatarResponse.statusText})`;
        let errorDetails = "";
        try {
          const errorText = await avatarResponse.text();
          errorDetails = errorText.trim();
          if (errorDetails.startsWith("{") || errorDetails.startsWith("[")) {
            try {
              const jsonData = JSON.parse(errorDetails);
              if (jsonData && jsonData.message) errorMsg = jsonData.message;
              else if (errorDetails)
                errorMsg = `${errorMsg}: ${errorDetails.slice(0, 200)}`;
            } catch (jsonParseError) {
              if (errorDetails)
                errorMsg = `${errorMsg}: ${errorDetails.slice(0, 200)}`;
            }
          } else if (errorDetails) {
            errorMsg = `${errorMsg}: ${errorDetails.slice(0, 200)}`;
          }
        } catch (readError) {
        }
        throw new Error(errorMsg);
      }
      const avatarResult = await avatarResponse.json();
      if (avatarResult.code === 1000 && avatarResult.result?.avatarUrl) {
        toast.success("Upload avatar thành công!");
      } else {
        throw new Error(
          avatarResult.message ||
            "Upload thành công nhưng dữ liệu trả về không đúng định dạng."
        );
      }
    } catch (error: any) {
      toast.error(
        `Upload avatar thất bại: ${error.message || "Lỗi không xác định"}`
      );
    }
  };


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

    const requiredFields: (keyof Omit<Event, "id" | "createdBy" | "status" | "image" | "avatarUrl" | "organizers" | "participants" | "attendees" | "rejectionReason" | "createdAt" | "deleted" | "deletedAt" | "deletedBy" | "progressStatus" | "qrCodeUrl" | "maxAttendees" >)[] = ["name", "purpose", "time", "location", "content"];
    
    const missingFields = requiredFields.filter((field) => {
      const value = currentEventData[field as keyof typeof currentEventData];
      return value === null || value === undefined || String(value).trim() === "";
    });

    if (missingFields.length > 0) {
      const fieldLabels: Record<string, string> = {
        name: "Tên",
        purpose: "Mục đích",
        time: "Ngày giờ",
        location: "Địa điểm",
        content: "Nội dung",
      };
      const names = missingFields.map((f) => fieldLabels[f] || f).join(", ");
      toast.error(`Vui lòng nhập/chọn: ${names}`);
      setIsLoading(false);
      return;
    }

    const effectiveOrganizers = editingEventId
      ? transformToOrganizerDataArray(currentEventData.organizers) 
      : [];
    const allSubmittedOrganizers = [...effectiveOrganizers, ...organizersFromSection];
    
    if (allSubmittedOrganizers.length === 0 ) {
        if (organizersFromSection.length === 0 && (!currentEventData.organizers || currentEventData.organizers.filter(org => org.roleId && org.positionId).length === 0)) {
          toast.error("Vui lòng thêm ít nhất một người vào Ban Tổ Chức (với vai trò và vị trí hợp lệ).");
          setIsLoading(false);
          return;
        }
    }


    const isEditing = !!editingEventId;
    const method = isEditing ? "PUT" : "POST";
    let url = isEditing
      ? `http://localhost:8080/identity/api/events/${editingEventId}`
      : "http://localhost:8080/identity/api/events";

    const finalOrganizersPayload = organizersFromSection.map(org => ({ userId: org.userId, roleId: org.roleId, positionId: org.positionId }));
 
    let orgPayload = finalOrganizersPayload;
    if (isEditing) {
        const existingValidOrganizers = transformToOrganizerDataArray(currentEventData.organizers);
        const newOrgIds = new Set(organizersFromSection.map(o => o.userId));
        const combined = [
            ...organizersFromSection,
            ...existingValidOrganizers.filter(eo => !newOrgIds.has(eo.userId))
        ];
        orgPayload = combined.map(o => ({userId: o.userId, roleId: o.roleId, positionId: o.positionId}));
    }


    let participantPayload = participantsFromSection.map(p => ({ userId: p.userId, roleId: p.roleId, positionId: p.positionId }));
    if (isEditing) {
        const existingValidParticipants = transformToParticipantDataArray(currentEventData.participants);
        const newParticipantIds = new Set(participantsFromSection.map(p => p.userId));
        const combined = [
            ...participantsFromSection,
            ...existingValidParticipants.filter(ep => !newParticipantIds.has(ep.userId))
        ];
        participantPayload = combined.map(p => ({userId: p.userId, roleId: p.roleId, positionId: p.positionId}));
    }


    let requestBodyBase: any = {
      name: currentEventData.name,
      purpose: currentEventData.purpose,
      time: currentEventData.time
        ? new Date(currentEventData.time).toISOString()
        : null,
      location: currentEventData.location,
      content: currentEventData.content,
      organizers: orgPayload,
      participants: participantPayload,
      maxAttendees: currentEventData.maxAttendees === null || currentEventData.maxAttendees === undefined || String(currentEventData.maxAttendees).trim() === "" ? null : Number(currentEventData.maxAttendees),
    };

    if (!isEditing) {
      requestBodyBase.createdBy = user?.id;
      requestBodyBase.attendees = [];
    } else {
      requestBodyBase.id = editingEventId;
      requestBodyBase.status = currentEventData.status || "PENDING"; 
      if (user?.id) {
        url = `${url}?updatedByUserId=${user.id}`;
      } else {
        toast.error("Không tìm thấy ID người dùng để cập nhật.");
        setIsLoading(false);
        return;
      }
    }

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
        } catch (e) {
          try {
            const t = await response.text();
            msg = `${msg}: ${t.slice(0, 100)}`;
          } catch (_) {}
        }
        throw new Error(msg);
      }

      const result = await response.json();

      if (result.code === 1000) {
        const eventIdForResult = isEditing ? editingEventId : result.result?.id;
        toast.success(
          result.message ||
            `${isEditing ? "Cập nhật" : "Thêm"} sự kiện thành công!`
        );

        if (eventIdForResult && avatarFile) {
          await uploadAvatar(eventIdForResult, token);
        }
        
        handleSetEditingEvent(null); 
        await fetchEvents();
        onEventCreated();
      } else {
        throw new Error(
          result.message || `Lỗi khi ${isEditing ? "cập nhật" : "thêm"}`
        );
      }
    } catch (error: any) {
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
            Đang tải dữ liệu...
          </div>
        ) : (
          <form onSubmit={handleSubmitEvent} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar sự kiện
                </label>
                <div className="mt-1 flex items-start space-x-4">
                  <div
                    className={`w-24 h-24 rounded-md border-2 flex items-center justify-center text-gray-400 overflow-hidden
                    ${ (avatarPreviewUrl || (editingEventId && currentEventData.avatarUrl))
                        ? 'border-gray-300'
                        : 'border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100'
                    } cursor-pointer relative group`}
                    onClick={() => avatarInputRef.current?.click()}
                    title="Nhấn để chọn hoặc thay đổi ảnh"
                  >
                    {(avatarPreviewUrl || (editingEventId && currentEventData.avatarUrl)) ? (
                      <Image
                        src={avatarPreviewUrl || currentEventData.avatarUrl || ""}
                        alt="Xem trước avatar"
                        layout="fill"
                        objectFit="cover"
                        className="rounded-md"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                        <p className="mt-1 text-xs">Chọn ảnh</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.174 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                    </div>
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    name="avatar"
                    ref={avatarInputRef}
                    accept="image/png, image/jpeg, image/gif"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  {(avatarFile || (editingEventId && currentEventData.avatarUrl && !avatarPreviewUrl)) && (
                    <div className="flex flex-col justify-center h-24">
                        {avatarFile && (
                          <p className="text-xs text-gray-600 mb-1 max-w-[150px] truncate" title={avatarFile.name}>
                              {avatarFile.name}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null);
                            if (avatarPreviewUrl) {
                              URL.revokeObjectURL(avatarPreviewUrl);
                              setAvatarPreviewUrl(null);
                            }
                            if (editingEventId) {
                                setCurrentEventData(prev => ({...prev, avatarUrl: null}));
                            }
                            if (avatarInputRef.current) {
                              avatarInputRef.current.value = "";
                            }
                          }}
                          className="text-xs px-3 py-1.5 border border-red-400 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        >
                          Bỏ chọn
                        </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="time"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
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
                <label
                  htmlFor="maxAttendees"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Số người tham dự tối đa
                </label>
                <input
                  id="maxAttendees"
                  type="number"
                  name="maxAttendees"
                  value={currentEventData.maxAttendees === null || currentEventData.maxAttendees === undefined ? "" : currentEventData.maxAttendees}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
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
              
            </div>
            <BTCSection
              ref={btcSectionRef}
              existingOrganizers={transformToOrganizerDataArray(
                editingEventId ? currentEventData.organizers : undefined
              )}
              globallyBusyUserIds={globallyBusyUserIds}
              onFormChange={handleChildFormChange}
            />
            <ParticipantSection
              ref={participantSectionRef}
              allUsers={allUsers}
              existingParticipants={transformToParticipantDataArray(
                editingEventId ? currentEventData.participants : undefined
              )}
              globallyBusyUserIds={globallyBusyUserIds}
              onFormChange={handleChildFormChange}
            />
            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              {editingEventId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer text-sm"
                >
                  Hủy bỏ
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
            getUserFullName={getUserFullName}
          />
        )}
      </div>
    </div>
  );
};

export default CreateEventTabContent;