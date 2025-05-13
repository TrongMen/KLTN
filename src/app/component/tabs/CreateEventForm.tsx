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
  OrganizerParticipantInput,
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
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  selectedValue,
  onChange,
  placeholder = "-- Chọn --",
  disabledOptions = new Set(),
  isLoading = false,
  disabled = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOptionName = useMemo(
    () => options.find((opt) => opt.id === selectedValue)?.name || "",
    [options, selectedValue]
  );

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOptionName);
    }
  }, [selectedOptionName, isOpen]);

  const filteredOptions = useMemo(() => {
    if (isLoading) return [];
    return options.filter((option) =>
      option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, isLoading]);

  const handleSelectOption = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      )
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          if (
            selectedOptionName &&
            searchTerm !== selectedOptionName &&
            selectedValue
          ) {
            // Behavior for when user types something different from selected
          } else if (!selectedValue) {
            setSearchTerm("");
          }
        }}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {isOpen && !isLoading && (
        <ul className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isDisabled =
                disabledOptions.has(option.id) && option.id !== selectedValue;
              return (
                <li
                  key={option.id}
                  onClick={() => !isDisabled && handleSelectOption(option.id)}
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
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
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
  organizers: OrganizerParticipantInput[];
  participants: OrganizerParticipantInput[];
  maxAttendees: number | string;
  id?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  avatarUrl?: string | null;
}

interface CreateEventFormProps {
  user: User | null;
  onSuccess: () => void;
  editingEvent?: EventDataForForm | null;
}

const INITIAL_FORM_STATE: EventFormDataState = {
  name: "",
  purpose: "",
  time: "",
  location: "",
  content: "",
  organizers: [],
  participants: [],
  maxAttendees: "",
  avatarUrl: null,
};

const CreateEventForm: React.FC<CreateEventFormProps> = ({
  user,
  onSuccess,
  editingEvent,
}) => {
  const [formData, setFormData] =
    useState<EventFormDataState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const isEditMode = !!editingEvent;

  const [internalAllUsers, setInternalAllUsers] = useState<DetailedApiUser[]>(
    []
  );
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [fetchUsersError, setFetchUsersError] = useState<string | null>(null);
  const [internalRoles, setInternalRoles] = useState<ApiRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(true);
  const [fetchRolesError, setFetchRolesError] = useState<string | null>(null);

  const [eventAvatarFile, setEventAvatarFile] = useState<File | null>(null);
  const [eventAvatarPreviewUrl, setEventAvatarPreviewUrl] = useState<
    string | null
  >(null);
  const avatarImageInputRef = useRef<HTMLInputElement>(null);

  // Hàm để lấy thời gian hiện tại theo định dạng YYYY-MM-DDTHH:mm cho thuộc tính min
  const getCurrentDateTimeLocalString = useCallback(() => {
    const now = new Date();
    // Điều chỉnh múi giờ của client
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return localNow.toISOString().slice(0, 16);
  }, []);


  useEffect(() => {
    const fetchInitialData = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Yêu cầu xác thực để tải dữ liệu.");
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
          "http://localhost:8080/identity/users/with-position-and-role",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ message: `Lỗi ${res.status}` }));
          throw new Error(errData.message || `Lỗi ${res.status}`);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result))
          setInternalAllUsers(data.result);
        else throw new Error(data.message || "Lỗi tải user.");
      } catch (error: any) {
        setFetchUsersError(error.message);
        toast.error(`Lỗi tải user: ${error.message}`);
        setInternalAllUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }

      setIsLoadingRoles(true);
      setFetchRolesError(null);
      try {
        const res = await fetch(
          "http://localhost:8080/identity/api/organizerrole",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ message: `Lỗi ${res.status}` }));
          throw new Error(errData.message || `Lỗi ${res.status}`);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result))
          setInternalRoles(data.result);
        else throw new Error(data.message || "Lỗi tải vai trò.");
      } catch (error: any) {
        setFetchRolesError(error.message);
        toast.error(`Lỗi tải vai trò: ${error.message}`);
        setInternalRoles([]);
      } finally {
        setIsLoadingRoles(false);
      }
    };
    fetchInitialData();
  }, []);

  const usersWithPositionOptions = useMemo(() => {
    if (!internalAllUsers) return [];
    return internalAllUsers
      .filter((u) => !!u.position)
      .map((u) => ({
        id: u.id,
        name:
          `${u.lastName || ""} ${u.firstName || ""}`.trim() ||
          u.username ||
          u.id,
      }));
  }, [internalAllUsers]);

  const allUserOptions = useMemo(() => {
    if (!internalAllUsers) return [];
    return internalAllUsers.map((u) => ({
      id: u.id,
      name:
        `${u.lastName || ""} ${u.firstName || ""}`.trim() || u.username || u.id,
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

  useEffect(() => {
    if (editingEvent) {
      let formattedTime = editingEvent.time;
      try {
        if (editingEvent.time) {
          const date = new Date(editingEvent.time);
          if (!isNaN(date.getTime())) {
             // Định dạng YYYY-MM-DDTHH:mm cho input datetime-local
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, "0");
            const day = date.getDate().toString().padStart(2, "0");
            const hours = date.getHours().toString().padStart(2, "0");
            const minutes = date.getMinutes().toString().padStart(2, "0");
            formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;
          } else {
            formattedTime = ""; // Nếu thời gian không hợp lệ, đặt là rỗng
          }
        }
      } catch (e) {
        console.error("Error formatting date for editingEvent:", e);
        formattedTime = ""; // Fallback nếu có lỗi
      }
      setFormData({
        id: editingEvent.id,
        name: editingEvent.name || "",
        purpose: editingEvent.purpose || "",
        time: formattedTime,
        location: editingEvent.location || "",
        content: editingEvent.content || "",
        organizers: editingEvent.organizers || [],
        participants: editingEvent.participants || [],
        maxAttendees:
          editingEvent.maxAttendees === null ||
          editingEvent.maxAttendees === undefined
            ? ""
            : editingEvent.maxAttendees,
        status: editingEvent.status,
        avatarUrl: editingEvent.avatarUrl || null,
      });
      if (editingEvent.avatarUrl) {
        setEventAvatarPreviewUrl(editingEvent.avatarUrl);
      } else {
        setEventAvatarPreviewUrl(null);
      }
      setEventAvatarFile(null); // Reset file đã chọn khi load event mới
    } else {
      // Khi tạo mới, đặt thời gian mặc định là thời gian hiện tại nếu muốn
      // Hoặc để trống để người dùng tự chọn
      const defaultTime = getCurrentDateTimeLocalString(); // Có thể đặt làm giá trị mặc định khi tạo mới
      setFormData({...INITIAL_FORM_STATE, time: "" }); // Hoặc time: defaultTime
      setEventAvatarPreviewUrl(null);
      setEventAvatarFile(null);
    }
  }, [editingEvent, getCurrentDateTimeLocalString]); // Thêm getCurrentDateTimeLocalString nếu dùng làm default

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "maxAttendees")
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? "" : parseInt(value, 10), // Giữ là string rỗng nếu người dùng xóa
      }));
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
          const selectedUser =
            internalAllUsers && internalAllUsers.find((u) => u.id === value);
          member.positionId = selectedUser?.position?.id || "";
          // Tự động gán vai trò cho người tham gia nếu user đó có organizerRole
          if (type === "participants" && selectedUser?.organizerRole) {
            member.roleId = selectedUser.organizerRole.id;
          } else if (type === "participants" && !selectedUser?.organizerRole) {
            // Nếu user không có organizerRole, và đang thêm vào NTG, có thể reset roleId
            // hoặc để người dùng tự chọn (hiện tại đang reset)
             member.roleId = "";
          }
        } else if (field === "roleId") {
          member.roleId = value;
        }
        updatedMembers[index] = member;
        return { ...prev, [type]: updatedMembers };
      });
    },
    [internalAllUsers]
  );

  const handleAddMember = useCallback((type: "organizers" | "participants") => {
    setFormData((prev) => ({
      ...prev,
      [type]: [...prev[type], { userId: "", roleId: "", positionId: "" }],
    }));
  }, []);

  const handleRemoveMember = useCallback(
    (type: "organizers" | "participants", index: number) => {
      setFormData((prev) => ({
        ...prev,
        [type]: prev[type].filter((_, i) => i !== index),
      }));
    },
    []
  );

  const handleAvatarImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventAvatarFile(file);
      if (eventAvatarPreviewUrl) URL.revokeObjectURL(eventAvatarPreviewUrl);
      setEventAvatarPreviewUrl(URL.createObjectURL(file));
      setFormData((prev) => ({ ...prev, avatarUrl: null })); // Xóa avatarUrl cũ khi chọn file mới
    }
  };
  const handleRemoveAvatarImage = () => {
    setEventAvatarFile(null);
    if (eventAvatarPreviewUrl) URL.revokeObjectURL(eventAvatarPreviewUrl);
    setEventAvatarPreviewUrl(null);
    setFormData((prev) => ({ ...prev, avatarUrl: null }));
    if (avatarImageInputRef.current) avatarImageInputRef.current.value = "";
  };

  useEffect(() => {
    const currentPreview = eventAvatarPreviewUrl;
    return () => {
      if (currentPreview && currentPreview.startsWith("blob:"))
        URL.revokeObjectURL(currentPreview);
    };
  }, [eventAvatarPreviewUrl]);

  const uploadEventAvatar = async (eventId: string, token: string) => {
    if (!eventAvatarFile) return null; // Không upload nếu không có file
    const formData = new FormData();
    formData.append("file", eventAvatarFile);
    const uploadUrl = `http://localhost:8080/identity/api/events/${eventId}/avatar`;
    try {
      const response = await fetch(uploadUrl, {
        method: "PATCH", // Hoặc POST tùy theo API của bạn
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Lỗi upload avatar (${response.status})`
        );
      }
      const result = await response.json();
      if (result.code === 1000 && result.result?.avatarUrl) {
        toast.success("Upload avatar thành công!");
        return result.result.avatarUrl;
      } else {
        throw new Error(
          result.message ||
            "Upload avatar thành công nhưng không nhận được URL."
        );
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
    if (
      !formData.name || !formData.purpose || !formData.time || !formData.location || !formData.content
    ) {
      toast.error("Điền đủ trường bắt buộc có dấu *.");
      return;
    }
    if (formData.organizers.some((o) => !o.userId || !o.roleId || !o.positionId)) {
      toast.error("Điền đủ thông tin Người dùng, Chức vụ và Vai trò cho tất cả thành viên Ban Tổ Chức.");
      return;
    }
    if (formData.organizers.length === 0) {
      toast.error("Cần thêm ít nhất một thành viên Ban Tổ Chức.");
      return;
    }
    if (formData.participants.some((p) => !p.userId || !p.roleId || !p.positionId)) {
      toast.error("Điền đủ thông tin Người dùng, Chức vụ và Vai trò cho tất cả Người Tham Gia (chỉ định).");
      return;
    }

    // Kiểm tra thời gian đã được chuyển sang `min` attribute của input
    // Không cần kiểm tra 7 ngày nữa

    setIsSubmitting(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Hết hạn đăng nhập.");
      router.push("/login");
      setIsSubmitting(false);
      return;
    }

    const finalMaxAttendees =
      formData.maxAttendees === "" || isNaN(Number(formData.maxAttendees))
        ? null
        : Number(formData.maxAttendees);
    let payload: any = {
      name: formData.name,
      purpose: formData.purpose,
      time: new Date(formData.time).toISOString(), // Gửi đi dạng ISO string
      location: formData.location,
      content: formData.content,
      maxAttendees: finalMaxAttendees,
      organizers: formData.organizers,
      participants: formData.participants,
    };
    let url = "http://localhost:8080/identity/api/events";
    let method = "POST";

    if (isEditMode && formData.id) {
      method = "PUT";
      url = `http://localhost:8080/identity/api/events/${formData.id}?updatedByUserId=${user.id}`;
      payload.id = formData.id;
      payload.status = formData.status || "PENDING";
    } else {
      payload.createdBy = user.id;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.code !== 1000) {
        toast.error(
          result?.message || `${isEditMode ? "Cập nhật" : "Tạo"} thất bại.`
        );
      } else {
        const eventIdForResult = isEditMode ? formData.id : result.result?.id;
        let successMessage =
          result?.message || `${isEditMode ? "Cập nhật" : "Tạo"} thành công!`;

        if (eventIdForResult && eventAvatarFile) { // Chỉ upload nếu có file mới
          await uploadEventAvatar(eventIdForResult, token);
        } else if ( isEditMode && formData.avatarUrl === null && editingEvent?.avatarUrl ) {
          // Logic để gọi API xóa avatar trên server nếu có file cũ và người dùng đã bỏ chọn (formData.avatarUrl là null)
          // Ví dụ: await deleteEventAvatarOnServer(eventIdForResult, token);
          // Hiện tại chưa có API này, chỉ để trống hoặc log
           console.log("Avatar was removed by user, consider API call to delete on server if event had one.");
        }
        toast.success(successMessage);
        if (!isEditMode) {
          setFormData(INITIAL_FORM_STATE); // Reset form cho tạo mới
          setEventAvatarFile(null);
          setEventAvatarPreviewUrl(null);
        }
        onSuccess(); // Gọi callback onSuccess (ví dụ: để refresh list, chuyển tab)
      }
    } catch (error: any) {
      toast.error(`Lỗi ${isEditMode ? "cập nhật" : "tạo"} sự kiện: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDataLoading = isLoadingUsers || isLoadingRoles;

  if (
    isDataLoading &&
    !isEditMode &&
    !formData.organizers.length &&
    !formData.participants.length
  ) {
    return (
      <div className="p-6 bg-white rounded-lg text-center">
        <p className="text-gray-500">Đang tải dữ liệu...</p>
      </div>
    );
  }
  if (
    (fetchUsersError || fetchRolesError) &&
    !isEditMode &&
    !formData.organizers.length &&
    !formData.participants.length
  ) {
    return (
      <div className="p-6 bg-white rounded-lg text-center">
        <p className="text-red-500">
          {fetchUsersError && `Lỗi tải user: ${fetchUsersError}`}{" "}
          {fetchUsersError && fetchRolesError && <br />}{" "}
          {fetchRolesError && `Lỗi tải vai trò: ${fetchRolesError}`}
        </p>
        <p className="text-gray-500 mt-2">
          Thử lại hoặc liên hệ quản trị viên.
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 bg-white rounded-lg ">
      <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-800 border-b pb-3">
        {isEditMode ? "✏️ Chỉnh Sửa Sự Kiện" : "➕ Tạo Sự Kiện Mới"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Tên sự kiện <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar sự kiện
            </label>
            <div className="mt-1 flex items-center space-x-4">
              <div
                className={`w-32 h-32 rounded-md border-2 flex items-center justify-center text-gray-400 overflow-hidden cursor-pointer relative group ${
                  eventAvatarPreviewUrl || (isEditMode && formData.avatarUrl)
                    ? "border-gray-300"
                    : "border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
                onClick={() => avatarImageInputRef.current?.click()}
                title="Chọn hoặc thay đổi avatar"
              >
                {eventAvatarPreviewUrl || (isEditMode && formData.avatarUrl) ? (
                  <Image
                    src={eventAvatarPreviewUrl || formData.avatarUrl || ""}
                    alt="Xem trước avatar"
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                  />
                ) : (
                  <div className="text-center p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                    <p className="mt-1 text-xs">Chọn ảnh</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="white" className="w-8 h-8" >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.174C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.174 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                  </svg>
                </div>
              </div>
              <input
                id="avatar-image-upload"
                type="file"
                name="avatarImage"
                ref={avatarImageInputRef}
                accept="image/png, image/jpeg, image/gif"
                onChange={handleAvatarImageChange}
                className="hidden"
              />
              {(eventAvatarFile || (isEditMode && formData.avatarUrl && !eventAvatarPreviewUrl?.startsWith("blob:"))) && (
                <div className="flex flex-col justify-center h-32">
                  {eventAvatarFile && ( <p className="text-xs text-gray-600 mb-1 max-w-[150px] truncate" title={eventAvatarFile.name} > {eventAvatarFile.name} </p> )}
                  <button type="button" onClick={handleRemoveAvatarImage} className="text-xs px-3 py-1.5 border border-red-400 text-red-600 rounded-md hover:bg-red-50 transition-colors" >
                    Bỏ chọn/Xóa ảnh
                  </button>
                </div>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1" >
              Thời gian <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              id="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              min={getCurrentDateTimeLocalString()} // Đặt giá trị min
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1" >
              Địa điểm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="maxAttendees" className="block text-sm font-medium text-gray-700 mb-1" >
              Số lượng tham dự tối đa
            </label>
            <input
              type="number"
              id="maxAttendees"
              name="maxAttendees"
              value={formData.maxAttendees}
              onChange={handleChange}
              min="1"
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1" >
              Mục đích <span className="text-red-500">*</span>
            </label>
            <textarea
              id="purpose"
              name="purpose"
              rows={3}
              value={formData.purpose}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1" >
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              name="content"
              rows={4}
              value={formData.content}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">
            Ban Tổ Chức <span className="text-red-500">*</span>
          </h3>
          {formData.organizers.map((organizer, index) => {
            const selectedUser = internalAllUsers.find( (u) => u.id === organizer.userId );
            const positionName = selectedUser?.position?.name || "(Chọn User)";
            return (
              <div key={index} className="p-3 border rounded-md bg-gray-50 mb-3 space-y-2" >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5"> Họ tên BTC </label>
                    <SearchableDropdown
                      options={allUserOptions}
                      selectedValue={organizer.userId}
                      onChange={(selectedId) => handleMemberChange( "organizers", index, "userId", selectedId )}
                      placeholder="-- Chọn hoặc tìm User --"
                      disabledOptions={busyUserIds}
                      isLoading={isLoadingUsers}
                      disabled={isDataLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5"> Chức vụ </label>
                    <input type="text" value={positionName} readOnly className="w-full p-2 border border-gray-200 bg-gray-100 rounded-md sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5"> Vai trò BTC </label>
                    <SearchableDropdown
                      options={roleOptions}
                      selectedValue={organizer.roleId}
                      onChange={(selectedId) => handleMemberChange( "organizers", index, "roleId", selectedId )}
                      placeholder="-- Chọn hoặc tìm Vai trò --"
                      isLoading={isLoadingRoles}
                      disabled={isDataLoading || !organizer.userId}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => handleRemoveMember("organizers", index)} className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded-md shadow-sm transition-colors" >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={() => handleAddMember("organizers")} className="mt-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors" disabled={isDataLoading} >
            + Thêm BTC
          </button>
        </div>
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-700 mb-3">
            Người Tham Gia (Chỉ định)
          </h3>
          {formData.participants.map((participant, index) => {
             const selectedUser = internalAllUsers.find( (u) => u.id === participant.userId );
             const positionName = selectedUser?.position?.name || " (Chọn User)";
             const isRoleFixedByProfile = !!selectedUser?.organizerRole && selectedUser.id === participant.userId;
            //  const roleForDisplayOrEdit = isRoleFixedByProfile ? selectedUser.organizerRole!.id : participant.roleId;
            //  const roleNameDisplay = isRoleFixedByProfile ? selectedUser.organizerRole!.name : roleOptions.find(r => r.id === participant.roleId)?.name || "N/A";

            return (
              <div key={index} className="p-3 border rounded-md bg-gray-50 mb-3 space-y-2" >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5"> Họ tên NTG </label>
                    <SearchableDropdown
                      options={usersWithPositionOptions} // Chỉ những user có position
                      selectedValue={participant.userId}
                      onChange={(selectedId) => handleMemberChange( "participants", index, "userId", selectedId )}
                      placeholder="-- Chọn User (có vị trí) --"
                      disabledOptions={busyUserIds}
                      isLoading={isLoadingUsers}
                      disabled={isDataLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5"> Chức vụ </label>
                    <input type="text" value={positionName} readOnly className="w-full p-2 border border-gray-200 bg-gray-100 rounded-md sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-0.5"> Vai trò NTG </label>
                     <SearchableDropdown
                        options={roleOptions}
                        selectedValue={participant.roleId} // Luôn lấy từ state
                        onChange={(selectedId) => handleMemberChange("participants", index, "roleId", selectedId) }
                        placeholder="-- Chọn hoặc tìm Vai trò --"
                        isLoading={isLoadingRoles}
                        disabled={isDataLoading || !participant.userId || isRoleFixedByProfile} // Vô hiệu hóa nếu vai trò đã cố định bởi profile
                      />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => handleRemoveMember("participants", index)} className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded-md shadow-sm transition-colors" >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={() => handleAddMember("participants")} className="mt-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-md shadow-sm transition-colors" disabled={isDataLoading} >
            + Thêm NTG
          </button>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          {isEditMode && (
            <button type="button" onClick={() => router.back()} className="mr-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-md shadow-sm transition-colors" >
              Hủy
            </button>
          )}
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 transition-colors"
            disabled={isSubmitting || isDataLoading}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" ></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" ></path>
                </svg>
                Đang gửi...
              </span>
            ) : isEditMode ? (
              "Cập Nhật Sự Kiện"
            ) : (
              "Gửi Yêu Cầu Tạo Sự Kiện"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateEventForm;