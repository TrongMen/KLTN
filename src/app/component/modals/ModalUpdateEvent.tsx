"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type {
  User,
  EventDataForForm,
  ParticipantInput,
  OrganizerInput,
  DetailedApiUser,
  ApiRole,
} from "../types/typCreateEvent";

interface SearchableDropdownOption {
  id: string;
  name: string;
}

interface SearchableDropdownProps {
  options: SearchableDropdownOption[];
  selectedValue: string | null;
  onChange: (selectedId: string) => void;
  placeholder?: string;
  disabledOptions?: Set<string>;
  isLoading?: boolean;
  disabled?: boolean;
  initialSearchTerm?: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  selectedValue,
  onChange,
  placeholder = "-- Chọn --",
  disabledOptions = new Set(),
  isLoading = false,
  disabled = false,
  initialSearchTerm,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOptionName = useMemo(
    () => options.find((opt) => opt.id === selectedValue)?.name || "",
    [options, selectedValue]
  );

  useEffect(() => {
    if (initialSearchTerm && (selectedValue || !isOpen || !searchTerm )) {
        setSearchTerm(initialSearchTerm);
    } else if (!initialSearchTerm && selectedValue && !isOpen) {
        setSearchTerm(selectedOptionName);
    } else if (!selectedValue && !isOpen) {
        setSearchTerm("");
    }
  }, [selectedOptionName, isOpen, initialSearchTerm, selectedValue]);


  const filteredOptions = useMemo(() => {
    if (isLoading) return [];
    if (!searchTerm && selectedValue && selectedOptionName && isOpen) {
      return options;
    }
    return options.filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, isLoading, selectedValue, selectedOptionName, isOpen]);

  const handleSelectOption = (optionId: string) => {
    const selectedOpt = options.find(opt => opt.id === optionId);
    if (selectedOpt) {
        setSearchTerm(selectedOpt.name);
    }
    onChange(optionId);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        if (selectedValue && selectedOptionName) {
            setSearchTerm(selectedOptionName);
        } else if (!selectedValue) {
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOptionName, selectedValue]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
            setIsOpen(true);
            if (selectedValue && selectedOptionName) {
                if (!searchTerm) setSearchTerm(selectedOptionName);
            } else {
                setSearchTerm("");
            }
        }}
        onBlur={() => {
            setTimeout(() => {
                if (!isOpen && selectedValue && selectedOptionName) {
                    setSearchTerm(selectedOptionName);
                } else if (!isOpen && !selectedValue) {
                }
            }, 150);
        }}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {isOpen && !isLoading && (
        <ul className="absolute z-30 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isDisabled =
                disabledOptions.has(option.id) && option.id !== selectedValue;
              return (
                <li
                  key={option.id}
                  onMouseDown={(e) => { 
                    e.preventDefault(); 
                    if(!isDisabled) handleSelectOption(option.id);
                  }}
                  className={`px-3 py-2 text-sm hover:bg-indigo-50 ${
                    isDisabled
                      ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                      : "cursor-pointer"
                  } ${
                    option.id === selectedValue
                      ? "bg-indigo-100 font-semibold"
                      : ""
                  }`}
                >
                  {option.name}
                  {isDisabled && (
                    <span className="text-xs text-gray-400 ml-1">
                      (Đã chọn)
                    </span>
                  )}
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-sm text-gray-500 italic">
              Không tìm thấy.
            </li>
          )}
        </ul>
      )}
      {isOpen && isLoading && (
        <ul className="absolute z-30 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <li className="px-3 py-2 text-sm text-gray-500 italic">
            Đang tải...
          </li>
        </ul>
      )}
    </div>
  );
};


interface EventFormDataState {
  name: string;
  purpose: string;
  time: string;
  location: string;
  content: string;
  organizers: OrganizerInput[];
  participants: ParticipantInput[];
  maxAttendees: number | string;
  id?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  avatarUrl?: string | null;
}

interface ModalUpdateEventProps {
  user: User | null;
  onSuccess: () => void;
  editingEvent: EventDataForForm;
  isOpen: boolean;
  onClose: () => void;
}

const ModalUpdateEvent: React.FC<ModalUpdateEventProps> = ({
  user,
  onSuccess,
  editingEvent,
  isOpen,
  onClose,
}) => {
  const [formData, setFormData] = useState<EventFormDataState>({
    name: "",
    purpose: "",
    time: "",
    location: "",
    content: "",
    organizers: [],
    participants: [],
    maxAttendees: "",
    avatarUrl: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const [internalAllUsers, setInternalAllUsers] = useState<DetailedApiUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [fetchUsersError, setFetchUsersError] = useState<string | null>(null);
  const [internalRoles, setInternalRoles] = useState<ApiRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(true);
  const [fetchRolesError, setFetchRolesError] = useState<string | null>(null);

  const [eventAvatarFile, setEventAvatarFile] = useState<File | null>(null);
  const [eventAvatarPreviewUrl, setEventAvatarPreviewUrl] = useState<string | null>(null);
  const avatarImageInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDropdownOptionsData = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.warn("Chưa xác thực, không thể tải tùy chọn mới cho dropdowns.");
        setIsLoadingUsers(false);
        setIsLoadingRoles(false);
        setFetchUsersError("Chưa xác thực.");
        setFetchRolesError("Chưa xác thực.");
        return;
      }
      
      setIsLoadingUsers(true);
      setFetchUsersError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: `Lỗi ${res.status}` }));
          throw new Error(errData.message || `Lỗi ${res.status}`);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          setInternalAllUsers(data.result);
        } else {
          throw new Error(data.message || "Lỗi tải danh sách người dùng.");
        }
      } catch (error: any) {
        setFetchUsersError(error.message);
        toast.error(`Lỗi tải tùy chọn người dùng: ${error.message}`);
        setInternalAllUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }

      setIsLoadingRoles(true);
      setFetchRolesError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/organizerrole`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ message: `Lỗi ${res.status}` }));
          throw new Error(errData.message || `Lỗi ${res.status}`);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          setInternalRoles(data.result);
        } else {
          throw new Error(data.message || "Lỗi tải danh sách vai trò.");
        }
      } catch (error: any) {
        setFetchRolesError(error.message);
        toast.error(`Lỗi tải tùy chọn vai trò: ${error.message}`);
        setInternalRoles([]);
      } finally {
        setIsLoadingRoles(false);
      }
    };

    if (isOpen) {
      fetchDropdownOptionsData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingEvent && isOpen) {
      let formattedTime = "";
      if (editingEvent.time) {
        try {
          const date = new Date(editingEvent.time); 
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDate().toString().padStart(2, "0");
            const hours = date.getHours().toString().padStart(2, "0");
            const minutes = date.getMinutes().toString().padStart(2, "0");
            formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        } catch (e) {
          console.error("Error formatting date for editingEvent:", e);
        }
      }

      setFormData({
        id: editingEvent.id,
        name: editingEvent.name || "",
        purpose: editingEvent.purpose || "",
        time: formattedTime,
        location: editingEvent.location || "",
        content: editingEvent.content || "",
        organizers: editingEvent.organizers.map(o => ({ 
            userId: o.userId || "", 
            roleId: o.roleId || "", 
            positionId: o.positionId || "", 
            name: o.name || "",
            roleName: o.roleName || "",
            positionName: o.positionName || ""
        })),
        participants: editingEvent.participants.map(p => ({ 
            userId: p.userId || "", 
            roleId: p.roleId || "", 
            positionId: p.positionId || "",
            name: p.name || "",
            roleName: p.roleName || "",
            positionName: p.positionName || ""
        })),
        maxAttendees: editingEvent.maxAttendees === null || editingEvent.maxAttendees === undefined ? "" : String(editingEvent.maxAttendees),
        status: editingEvent.status,
        avatarUrl: editingEvent.avatarUrl || null,
      });

      if (editingEvent.avatarUrl) {
        setEventAvatarPreviewUrl(editingEvent.avatarUrl);
      } else {
        setEventAvatarPreviewUrl(null);
      }
      setEventAvatarFile(null);
    }
  }, [editingEvent, isOpen]);

  const organizerUserOptions = useMemo(() => {
    if (!internalAllUsers || !Array.isArray(internalAllUsers)) return [];
    return internalAllUsers
      .filter(user => user.roles && Array.isArray(user.roles) && user.roles.some(role => role.name === "USER"))
      .map((u) => ({
        id: u.id,
        name: `${u.lastName || ""} ${u.firstName || ""}`.trim() || u.username || u.id,
      }));
  }, [internalAllUsers]);

  const usersWithPositionOptions = useMemo(() => {
    if (!internalAllUsers || !Array.isArray(internalAllUsers)) return [];
    return internalAllUsers
      .filter((u) => !!u.position)
      .map((u) => ({
        id: u.id,
        name: `${u.lastName || ""} ${u.firstName || ""}`.trim() || u.username || u.id,
      }));
  }, [internalAllUsers]);
  
  const roleOptions = useMemo(() => {
    if (!internalRoles) return [];
    return internalRoles.map((r) => ({ id: r.id, name: r.name }));
  }, [internalRoles]);

  const busyUserIds = useMemo(() => {
    const ids = new Set<string>();
    formData.organizers.forEach((o) => {
      if (o.userId) ids.add(o.userId);
    });
    formData.participants.forEach((p) => {
      if (p.userId) ids.add(p.userId);
    });
    return ids;
  }, [formData.organizers, formData.participants]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "maxAttendees")
      setFormData((prev) => ({ ...prev, [name]: value === "" ? "" : parseInt(value, 10) }));
    else setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = useCallback(
    (
      type: "organizers" | "participants",
      index: number,
      field: "userId" | "roleId",
      value: string
    ) => {
      setFormData((prev) => {
        const updatedMembers = [...prev[type]];
        const member = { ...updatedMembers[index] };

        if (field === "userId") {
          member.userId = value;
          const selectedUser = internalAllUsers.find((u) => u.id === value);
          member.name = selectedUser
            ? `${selectedUser.lastName || ""} ${selectedUser.firstName || ""}`.trim() || selectedUser.username || `ID: ${value}`
            : "";
          member.positionId = selectedUser?.position?.id || ""; 
          member.positionName = selectedUser?.position?.name || (value ? (selectedUser?.position?.id ? selectedUser.position.name : "Chưa có/Không áp dụng") : "N/A");
          
          member.roleId = ""; 
          member.roleName = "";

          if (type === "participants" && selectedUser?.organizerRole?.id) {
              const isValidEventRole = roleOptions.some(r => r.id === selectedUser.organizerRole!.id);
              if (isValidEventRole) {
                  member.roleId = selectedUser.organizerRole.id;
                  member.roleName = selectedUser.organizerRole.name;
              } else {
                  console.warn(`Vai trò mặc định '${selectedUser.organizerRole.name}' của người dùng '${member.name}' không phải là vai trò sự kiện hợp lệ.`);
              }
          }
        } else if (field === "roleId") {
          member.roleId = value;
          const selectedRole = roleOptions.find(r => r.id === value);
          member.roleName = selectedRole?.name || "";
        }
        updatedMembers[index] = member;
        return { ...prev, [type]: updatedMembers };
      });
    },
    [internalAllUsers, roleOptions]
  );

  const handleAddMember = useCallback((type: "organizers" | "participants") => {
    setFormData((prev) => ({
      ...prev,
      [type]: [...prev[type], { userId: "", roleId: "", positionId: "", name: "", roleName: "", positionName: "" }],
    }));
  }, []);

  const handleRemoveMember = useCallback((type: "organizers" | "participants", index: number) => {
    setFormData((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  }, []);

  const handleAvatarImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventAvatarFile(file);
      if (eventAvatarPreviewUrl && eventAvatarPreviewUrl.startsWith("blob:"))
        URL.revokeObjectURL(eventAvatarPreviewUrl);
      setEventAvatarPreviewUrl(URL.createObjectURL(file));
      setFormData((prev) => ({ ...prev, avatarUrl: null }));
    }
  };

  const handleRemoveAvatarImage = () => {
    setEventAvatarFile(null);
    if (eventAvatarPreviewUrl && eventAvatarPreviewUrl.startsWith("blob:"))
      URL.revokeObjectURL(eventAvatarPreviewUrl);
    setEventAvatarPreviewUrl(null);
    setFormData((prev) => ({ ...prev, avatarUrl: null }));
    if (avatarImageInputRef.current) avatarImageInputRef.current.value = "";
  };

  useEffect(() => {
    const currentPreview = eventAvatarPreviewUrl;
    return () => {
      if (currentPreview && currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
    };
  }, [eventAvatarPreviewUrl]);

  const uploadEventAvatar = async (eventId: string, token: string) => {
    if (!eventAvatarFile) return null;
    const formDataUpload = new FormData();
    formDataUpload.append("file", eventAvatarFile);
    const uploadUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventId}/avatar`;
    try {
      const response = await fetch(uploadUrl, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formDataUpload,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi upload avatar (${response.status})`);
      }
      const result = await response.json();
      if (result.code === 1000 && result.result?.avatarUrl) {
        toast.success("Upload avatar thành công!");
        return result.result.avatarUrl;
      } else {
        throw new Error(result.message || "Upload avatar không thành công.");
      }
    } catch (error: any) {
      toast.error(`Upload avatar thất bại: ${error.message}`);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vui lòng đăng nhập.");
      router.push("/login");
      return;
    }
    if (!formData.name || !formData.purpose || !formData.time || !formData.location || !formData.content) {
      toast.error("Vui lòng điền đầy đủ các trường thông tin sự kiện bắt buộc (*).");
      return;
    }
    
    const activeOrganizers = formData.organizers.filter(o => o.userId);
    if (activeOrganizers.length === 0 && formData.organizers.some(o => o.roleId)) {
        toast.error("Thành viên Ban Tổ Chức đã chọn Vai trò nhưng chưa chọn User. Vui lòng hoàn tất hoặc xóa dòng.");
        setIsSubmitting(false);
        return;
    }
    if (activeOrganizers.length === 0) {
        toast.error("Sự kiện phải có ít nhất một thành viên Ban Tổ Chức (đã chọn User).");
        setIsSubmitting(false);
        return;
    }
    if (activeOrganizers.some(o => !o.userId)) { 
        toast.error("Vui lòng chọn User cho tất cả thành viên Ban Tổ Chức đã thêm.");
        setIsSubmitting(false);
        return;
    }


    const activeParticipants = formData.participants.filter(p => p.userId);
    if (activeParticipants.length < formData.participants.length && formData.participants.some(p => !p.userId && p.roleId)) {
        toast.error("Người Tham Dự đã chọn Vai trò nhưng chưa chọn User. Vui lòng hoàn tất hoặc xóa dòng.");
        setIsSubmitting(false);
        return;
    }

    setIsSubmitting(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      router.push("/login");
      setIsSubmitting(false);
      return;
    }

    if (!formData.id) {
      toast.error("Không tìm thấy ID sự kiện để cập nhật.");
      setIsSubmitting(false);
      return;
    }

    const finalMaxAttendees = formData.maxAttendees === "" || isNaN(Number(formData.maxAttendees))
      ? null
      : Number(formData.maxAttendees);

    let timeToSend: string;
    const dateTimeLocalString = formData.time; 

    if (dateTimeLocalString) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTimeLocalString) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTimeLocalString) && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dateTimeLocalString)) {
          try {
              const parsedDate = new Date(dateTimeLocalString);
              if (isNaN(parsedDate.getTime())) throw new Error("Invalid date");
              timeToSend = parsedDate.toISOString();

          } catch(e){
              toast.error("Định dạng thời gian không hợp lệ. Vui lòng kiểm tra lại.");
              setIsSubmitting(false);
              return;
          }
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateTimeLocalString)) {
           timeToSend = dateTimeLocalString + ":00.000Z";
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(dateTimeLocalString)) {
           timeToSend = dateTimeLocalString + ".000Z";
      }
      else { // Already ISOString with Z
           timeToSend = dateTimeLocalString;
      }
    } else { 
      toast.error("Thời gian là bắt buộc.");
      setIsSubmitting(false);
      return;
    }

    const organizersForApi = activeOrganizers.map(({ name, roleName, positionName, ...rest }) => ({
        ...rest,
        roleId: rest.roleId || null, 
        positionId: rest.positionId || null 
    }));
    const participantsForApi = activeParticipants.map(({ name, roleName, positionName, ...rest }) => ({
        ...rest,
        roleId: rest.roleId || null, 
        positionId: rest.positionId || null
    }));

    let payload: any = {
      id: formData.id,
      name: formData.name,
      purpose: formData.purpose,
      time: timeToSend,
      location: formData.location,
      content: formData.content,
      maxAttendees: finalMaxAttendees,
      organizers: organizersForApi,
      participants: participantsForApi, 
      status: formData.status || "PENDING",
    };
    
    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${formData.id}?updatedByUserId=${user.id}`;
    const method = "PUT";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || result.code !== 1000) {
        toast.error(result?.message || "Cập nhật sự kiện thất bại.");
      } else {
        let successMessage = result?.message || "Cập nhật sự kiện thành công!";
        if (eventAvatarFile) {
          await uploadEventAvatar(formData.id!, token);
        } else if (formData.avatarUrl === null && editingEvent?.avatarUrl) {
        }
        toast.success(successMessage);
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      toast.error(`Lỗi khi cập nhật sự kiện: ${error.message || "Lỗi không xác định"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDataLoading = isLoadingUsers || isLoadingRoles;

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  
  return (
    <div
      className="fixed inset-0 bg-black/30 bg-opacity-60 flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out animate-fade-in"
    >
      <div
        ref={modalContentRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
            ✏️ Chỉnh Sửa Sự Kiện
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full -mr-2 -mt-2 sm:-mr-0 sm:-mt-0 cursor-pointer"
            aria-label="Đóng modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {isDataLoading && (!internalAllUsers.length || !internalRoles.length) && (!editingEvent || !editingEvent.id) ? (
            <div className="text-center py-10">
              <p className="text-gray-500">Đang tải dữ liệu cho form...</p>
            </div>
          ) : (fetchUsersError || fetchRolesError) && (!editingEvent || !editingEvent.id) ? (
            <div className="text-center py-10">
              <p className="text-red-500">
                {fetchUsersError && `Lỗi tải người dùng: ${fetchUsersError}`}
                {fetchUsersError && fetchRolesError && <br />}
                {fetchRolesError && `Lỗi tải vai trò: ${fetchRolesError}`}
              </p>
              <p className="text-gray-500 mt-2">Vui lòng đóng modal và thử lại.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <label htmlFor="nameModal" className="block text-sm font-medium text-gray-700 mb-1">
                    Tên sự kiện <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="nameModal" name="name" value={formData.name} onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avatar sự kiện</label>
                  <div className="mt-1 flex items-center space-x-4">
                    <div
                      className={`w-24 h-24 sm:w-32 sm:h-32 rounded-md border-2 flex items-center justify-center text-gray-400 overflow-hidden cursor-pointer relative group ${
                        eventAvatarPreviewUrl || formData.avatarUrl ? "border-gray-300" : "border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => avatarImageInputRef.current?.click()}
                      title="Chọn hoặc thay đổi avatar"
                    >
                      {eventAvatarPreviewUrl || formData.avatarUrl ? (
                        <Image src={eventAvatarPreviewUrl || formData.avatarUrl || ""} alt="Xem trước avatar" layout="fill" objectFit="cover" className="rounded-md"/>
                      ) : (
                        <div className="text-center p-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-10 sm:w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                          </svg>
                          <p className="mt-1 text-xs">Chọn ảnh</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" className="w-6 h-6 sm:w-8 sm:h-8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.174 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                      </div>
                    </div>
                    <input id="avatar-image-upload-modal" type="file" name="avatarImage" ref={avatarImageInputRef} accept="image/png, image/jpeg, image/gif" onChange={handleAvatarImageChange} className="hidden" />
                    {(eventAvatarFile || (formData.avatarUrl && !eventAvatarPreviewUrl?.startsWith("blob:"))) && (
                      <div className="flex flex-col justify-center h-24 sm:h-32">
                        {eventAvatarFile && (
                          <p className="text-xs text-gray-600 mb-1 max-w-[150px] truncate" title={eventAvatarFile.name}>
                            {eventAvatarFile.name}
                          </p>
                        )}
                        <button type="button" onClick={handleRemoveAvatarImage}
                          className="text-xs px-3 py-1.5 border border-red-400 text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer">
                          Bỏ chọn/Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="timeModal" className="block text-sm font-medium text-gray-700 mb-1">Thời gian <span className="text-red-500">*</span></label>
                  <input type="datetime-local" id="timeModal" name="time" value={formData.time} onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required/>
                </div>
                <div>
                  <label htmlFor="locationModal" className="block text-sm font-medium text-gray-700 mb-1">Địa điểm <span className="text-red-500">*</span></label>
                  <input type="text" id="locationModal" name="location" value={formData.location} onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required/>
                </div>
                <div>
                  <label htmlFor="maxAttendeesModal" className="block text-sm font-medium text-gray-700 mb-1">Số lượng tham dự tối đa</label>
                  <input type="number" id="maxAttendeesModal" name="maxAttendees" value={formData.maxAttendees} onChange={handleChange} min="0"
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Để trống nếu không giới hạn"/>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="purposeModal" className="block text-sm font-medium text-gray-700 mb-1">Mục đích <span className="text-red-500">*</span></label>
                  <textarea id="purposeModal" name="purpose" rows={3} value={formData.purpose} onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required/>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="contentModal" className="block text-sm font-medium text-gray-700 mb-1">Nội dung <span className="text-red-500">*</span></label>
                  <textarea id="contentModal" name="content" rows={4} value={formData.content} onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required/>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Ban Tổ Chức <span className="text-red-500">*</span></h3>
                {formData.organizers.map((organizer, index) => (
                    <div key={`org-${index}`} className="p-3 border rounded-md bg-gray-50 mb-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-0.5">Họ tên</label>
                                <SearchableDropdown
                                    options={organizerUserOptions}
                                    selectedValue={organizer.userId}
                                    initialSearchTerm={organizer.name}
                                    onChange={(selectedId) => handleMemberChange("organizers", index, "userId", selectedId)}
                                    placeholder="-- Chọn hoặc tìm User --"
                                    disabledOptions={busyUserIds}
                                    isLoading={isLoadingUsers}
                                    disabled={isDataLoading && !internalAllUsers.length}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-0.5">Chức vụ (từ Profile)</label>
                                <input type="text" value={organizer.positionName} readOnly className="w-full p-2 border border-gray-200 bg-gray-100 rounded-md sm:text-sm"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-0.5">Vai trò BTC (trong sự kiện)</label>
                                <SearchableDropdown
                                    options={roleOptions}
                                    selectedValue={organizer.roleId}
                                    initialSearchTerm={organizer.roleName}
                                    onChange={(selectedId) => handleMemberChange("organizers", index, "roleId", selectedId)}
                                    placeholder="-- Chọn Vai trò BTC (Tùy chọn) --"
                                    isLoading={isLoadingRoles}
                                    disabled={(isDataLoading && !internalRoles.length) || !organizer.userId}
                                />
                            </div>
                        </div>
                          <div className="flex justify-end">
                            <button type="button" onClick={() => handleRemoveMember("organizers", index)}
                                className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded-md shadow-sm transition-colors cursor-pointer">
                                Xóa
                            </button>
                          </div>
                      </div>
                ))}
                <button type="button" onClick={() => handleAddMember("organizers")}
                  className="mt-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
                  disabled={(isDataLoading && (!internalAllUsers.length || !internalRoles.length))}>
                  + Thêm BTC
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Người Tham Gia</h3>
                {formData.participants.map((participant, index) => (
                      <div key={`part-${index}`} className="p-3 border rounded-md bg-gray-50 mb-3 space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                              <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Họ tên NTG</label>
                                  <SearchableDropdown
                                      options={usersWithPositionOptions}
                                      selectedValue={participant.userId}
                                      initialSearchTerm={participant.name}
                                      onChange={(selectedId) => handleMemberChange("participants", index, "userId", selectedId)}
                                      placeholder="-- Chọn User (có vị trí) --"
                                      disabledOptions={busyUserIds}
                                      isLoading={isLoadingUsers}
                                      disabled={isDataLoading && !internalAllUsers.length}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Chức vụ (từ Profile)</label>
                                  <input type="text" value={participant.positionName} readOnly className="w-full p-2 border border-gray-200 bg-gray-100 rounded-md sm:text-sm"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-0.5">Vai trò NTG (trong sự kiện)</label>
                                  <SearchableDropdown
                                      options={roleOptions}
                                      selectedValue={participant.roleId}
                                      initialSearchTerm={participant.roleName}
                                      onChange={(selectedId) => handleMemberChange("participants", index, "roleId", selectedId)}
                                      placeholder="-- Chọn Vai trò NTG (Tùy chọn) --"
                                      isLoading={isLoadingRoles}
                                      disabled={(isDataLoading && !internalRoles.length) || !participant.userId }
                                  />
                              </div>
                          </div>
                            <div className="flex justify-end">
                              <button type="button" onClick={() => handleRemoveMember("participants", index)}
                                  className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded-md shadow-sm transition-colors">
                                  Xóa
                              </button>
                            </div>
                        </div>
                ))}
                <button type="button" onClick={() => handleAddMember("participants")}
                  className="mt-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors"
                  disabled={(isDataLoading && (!internalAllUsers.length || !internalRoles.length))}>
                  + Thêm NTG
                </button>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6 space-x-3">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                  Hủy
                </button>
                <button type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 transition-colors cursor-pointer"
                  disabled={isSubmitting || (isDataLoading && (!internalAllUsers.length || !internalRoles.length))}>
                  {isSubmitting ? "Đang cập nhật..." : "Cập Nhật Sự Kiện"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalUpdateEvent;