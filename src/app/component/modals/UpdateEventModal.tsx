"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { Cross1Icon, ReloadIcon, Cross2Icon } from "@radix-ui/react-icons";

// Không cần import Tiptap nữa
// import { useEditor, EditorContent, Editor } from "@tiptap/react";
// import StarterKit from "@tiptap/starter-kit";
// import MenuBar from "../../../tiptap/MenuBar";

// --- START: Định nghĩa Types ---
interface EventType {
  id: string;
  name: string;
  time?: string;
  location?: string;
  content?: string; // Giữ lại content nhưng dùng với textarea
  description?: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  rejectionReason?: string | null;
  purpose?: string;
  createdBy?: string;
  createdAt?: string;
  organizers?: {
    userId: string;
    positionId?: string;
    roleId?: string;
    [key: string]: any;
  }[];
  participants?: {
    userId: string;
    roleId?: string;
    roleName?: string;
    positionId?: string;
    [key: string]: any;
  }[];
  attendees?: any[];
  permissions?: string[];
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  } | null;
  avatarUrl?: string | null;
  qrCodeUrl?: string | null;
  progressStatus?: string;
}

type ApiRole = { id: string; name: string; description?: string };
type ApiPosition = { id: string; name: string; description?: string };
type ApiUserWithDetails = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email?: string;
  position?: ApiPosition | null;
  organizerRole?: ApiRole | null;
  dob?: string;
  avatar?: string;
  gender?: boolean;
  roles?: { name: string; description?: string; permissions?: any[] }[];
};
type OrganizerData = { userId: string; roleId: string; positionId: string };
type ParticipantData = { userId: string; roleId: string; positionId: string };

export type BTCSectionHandle = {
  getMembersData: () => OrganizerData[];
  resetForms: () => void;
};
export type ParticipantSectionHandle = {
  getMembersData: () => ParticipantData[];
  resetForms: () => void;
};
// --- END: Định nghĩa Types ---

// --- START: Hàm Helper ---
const getUserDisplay = (
  user: ApiUserWithDetails | null | undefined
): string => {
  if (!user) return "";
  const fullName = `${user.lastName || ""} ${user.firstName || ""}`.trim();
  return (fullName || user.username) ?? "";
};
// --- END: Hàm Helper ---

// --- START: Component SearchableUserDropdown ---
type SearchableUserDropdownProps = {
  users: ApiUserWithDetails[];
  selectedUserId: string | null;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabledUserIds?: Set<string>;
};

function SearchableUserDropdown({
  users,
  selectedUserId,
  onChange,
  placeholder = "-- Chọn hoặc tìm user --",
  disabledUserIds = new Set(),
}: SearchableUserDropdownProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<ApiUserWithDetails[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectedUser = users?.find((u) => u.id === selectedUserId);
    setSearchTerm(getUserDisplay(selectedUser));
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!users) {
      setFilteredUsers([]);
      return;
    }
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    setFilteredUsers(
      users.filter((user) => {
        const fullName = `${user?.lastName ?? ""} ${user?.firstName ?? ""}`
          .trim()
          .toLowerCase();
        const username = (user?.username ?? "").toLowerCase();
        return (
          fullName.includes(lowerSearchTerm) ||
          username.includes(lowerSearchTerm)
        );
      })
    );
  }, [searchTerm, users]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        const selectedUser = users?.find((u) => u.id === selectedUserId);
        setSearchTerm(getUserDisplay(selectedUser));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, selectedUserId, users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true);
  };
  const handleInputClick = () => {
    setIsDropdownOpen(true);
    if (!searchTerm && users) {
      setFilteredUsers(users);
    }
  };
  const handleUserSelect = (user: ApiUserWithDetails) => {
    if (disabledUserIds.has(user.id)) return;
    onChange(user.id);
    setSearchTerm(getUserDisplay(user));
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onClick={handleInputClick}
        placeholder={placeholder}
        className="border border-gray-300 rounded px-2 py-1 w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm h-[30px]"
        autoComplete="off"
      />
      {isDropdownOpen && (
        <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg text-sm">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isDisabled = disabledUserIds.has(user.id);
              return (
                <li
                  key={user.id}
                  onClick={() => !isDisabled && handleUserSelect(user)}
                  className={`px-3 py-2 hover:bg-blue-100 ${
                    isDisabled
                      ? "text-gray-400 bg-gray-100 cursor-not-allowed"
                      : "cursor-pointer"
                  }`}
                >
                  {getUserDisplay(user)}
                  {isDisabled && (
                    <span className="text-xs text-gray-400 ml-1">
                      (Đã thêm)
                    </span>
                  )}
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-gray-500 italic">
              Không tìm thấy user hợp lệ.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
// --- END: Component SearchableUserDropdown ---

// --- START: Component BTCSection ---
type BTCSectionProps = {
  existingOrganizers: OrganizerData[];
  detailedUsers: ApiUserWithDetails[];
  loadingUsers: boolean;
  fetchUsersError: string | null;
};
type OrganizerFormRow = {
  id: number;
  userId: string;
  positionId: string;
  positionName: string;
  roleId: string;
  roleName: string;
};

const BTCSection = forwardRef<BTCSectionHandle, BTCSectionProps>(
  (
    { existingOrganizers, detailedUsers, loadingUsers, fetchUsersError },
    ref
  ) => {
    const [organizerForms, setOrganizerForms] = useState<OrganizerFormRow[]>(
      []
    );
    const existingOrganizerIds = useMemo(
      () => new Set(existingOrganizers?.map((o) => o.userId) ?? []),
      [existingOrganizers]
    );
    const usersForDropdown = useMemo(
      () => detailedUsers.filter((user) => user.organizerRole != null),
      [detailedUsers]
    );

    const addOrganizerFormRow = () =>
      setOrganizerForms((prev) => [
        ...prev,
        {
          id: Date.now(),
          userId: "",
          positionId: "",
          positionName: "",
          roleId: "",
          roleName: "",
        },
      ]);
    const removeOrganizerFormRow = (id: number) =>
      setOrganizerForms((prev) => prev.filter((f) => f.id !== id));

    const handleOrganizerChange = useCallback(
      (
        id: number,
        field: keyof Omit<OrganizerFormRow, "id" | "positionName" | "roleName">,
        value: string
      ) => {
        setOrganizerForms((prev) =>
          prev.map((form) => {
            if (form.id === id) {
              if (field === "userId") {
                const selectedDetailedUser = detailedUsers.find(
                  (u) => u.id === value
                );
                return {
                  ...form,
                  userId: value,
                  positionId: selectedDetailedUser?.position?.id ?? "",
                  positionName: selectedDetailedUser?.position?.name ?? "—",
                  roleId: selectedDetailedUser?.organizerRole?.id ?? "",
                  roleName: selectedDetailedUser?.organizerRole?.name ?? "—",
                };
              }
            }
            return form;
          })
        );
      },
      [detailedUsers]
    );

    useImperativeHandle(
      ref,
      () => ({
        getMembersData: () => {
          const existingIds = new Set(
            existingOrganizers?.map((o) => o.userId) ?? []
          );
          const newMembers = organizerForms
            .filter(
              (form) =>
                form.userId &&
                form.roleId &&
                form.positionId &&
                !existingIds.has(form.userId)
            )
            .map((form) => ({
              userId: form.userId,
              positionId: form.positionId,
              roleId: form.roleId,
            }));
          const uniqueNewMembersMap = new Map<string, OrganizerData>();
          newMembers.forEach((member) => {
            if (!uniqueNewMembersMap.has(member.userId)) {
              uniqueNewMembersMap.set(member.userId, member);
            } else {
              console.warn(
                `BTCSection: User ID ${member.userId} bị trùng lặp.`
              );
              toast.warn(
                `User ${getUserDisplay(
                  detailedUsers.find((u) => u.id === member.userId)
                )} bị trùng trong BTC.`,
                { duration: 4000 }
              );
            }
          });
          return Array.from(uniqueNewMembersMap.values());
        },
        resetForms: () => {
          setOrganizerForms([]);
        },
      }),
      [organizerForms, existingOrganizers, detailedUsers]
    );

    return (
      <div className="mt-4 border-t pt-4">
        <h3 className="text-md font-semibold mb-1 text-gray-600">
          Ban tổ chức
        </h3>
        {loadingUsers && <p className="text-sm text-gray-500">Đang tải...</p>}
        {fetchUsersError && (
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
            {fetchUsersError}
          </p>
        )}
        <button
          type="button"
          onClick={addOrganizerFormRow}
          className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Thêm dòng nhập BTC"
          disabled={loadingUsers || !!fetchUsersError}
        >
          +
        </button>
        <div className="space-y-2">
          {organizerForms.map((form) => (
            <div
              key={form.id}
              className="flex flex-col sm:flex-row gap-2 items-center p-2 border rounded bg-gray-50"
            >
              <div className="w-full sm:flex-grow">
                <SearchableUserDropdown
                  users={usersForDropdown}
                  selectedUserId={form.userId}
                  onChange={(userId) =>
                    handleOrganizerChange(form.id, "userId", userId)
                  }
                  disabledUserIds={existingOrganizerIds}
                  placeholder="-- Tìm user (có vai trò BTC) --"
                />
              </div>
              <div
                className="w-full sm:w-1/3 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
                title={form.positionName || ""}
              >
                <span className="font-medium mr-1 flex-shrink-0">Vị trí:</span>
                <span className="truncate">
                  {form.positionName || (form.userId ? "N/A" : "—")}
                </span>
              </div>
              <div
                className="w-full sm:w-1/3 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
                title={form.roleName || ""}
              >
                <span className="font-medium mr-1 flex-shrink-0">Vai trò:</span>
                <span className="truncate">
                  {form.roleName || (form.userId ? "N/A" : "—")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeOrganizerFormRow(form.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full sm:w-auto cursor-pointer text-sm flex-shrink-0 h-[30px]"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
BTCSection.displayName = "BTCSection";
// --- END: Component BTCSection ---

// --- START: Component ParticipantSection ---
type ParticipantSectionProps = {
  existingParticipants: ParticipantData[];
  detailedUsers: ApiUserWithDetails[];
  loadingUsers: boolean;
  fetchUsersError: string | null;
};
type ParticipantFormRow = {
  id: number;
  userId: string;
  positionId: string;
  positionName: string;
  roleId: string;
  roleName: string;
  canSelectRole: boolean;
};

const ParticipantSection = forwardRef<
  ParticipantSectionHandle,
  ParticipantSectionProps
>(
  (
    { existingParticipants, detailedUsers, loadingUsers, fetchUsersError },
    ref
  ) => {
    const [participantForms, setParticipantForms] = useState<
      ParticipantFormRow[]
    >([]);
    const [roles, setRoles] = useState<ApiRole[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [errorRoles, setErrorRoles] = useState<string | null>(null);
    const existingParticipantIds = useMemo(
      () => new Set(existingParticipants?.map((p) => p.userId) ?? []),
      [existingParticipants]
    );
    const usersForDropdown = useMemo(
      () => detailedUsers.filter((user) => user.position != null),
      [detailedUsers]
    );

    useEffect(() => {
      const fetchRoles = async () => {
        setLoadingRoles(true);
        setErrorRoles(null);
        try {
          const token = localStorage.getItem("authToken");
          if (!token) throw new Error("Token không tồn tại.");
          const headers = { Authorization: `Bearer ${token}` };
          const rRes = await fetch(
            "http://localhost:8080/identity/api/organizerrole",
            { headers }
          );
          if (!rRes.ok)
            throw new Error(`Lỗi tải danh sách vai trò (${rRes.status})`);
          const rData = await rRes.json();
          if (rData?.code !== 1000) {
            throw new Error(`API Roles lỗi: ${rData?.message || "Unknown"}`);
          }
          setRoles(rData?.result || []);
        } catch (err: any) {
          const msg = `Lỗi tải vai trò: ${err.message}`;
          setErrorRoles(msg);
          toast.error(msg);
          console.error("Fetch error ParticipantSection roles:", err);
        } finally {
          setLoadingRoles(false);
        }
      };
      fetchRoles();
    }, []);

    const addParticipantFormRow = () =>
      setParticipantForms((prev) => [
        ...prev,
        {
          id: Date.now(),
          userId: "",
          positionId: "",
          positionName: "",
          roleId: "",
          roleName: "",
          canSelectRole: false,
        },
      ]);
    const removeParticipantFormRow = (id: number) =>
      setParticipantForms((prev) => prev.filter((f) => f.id !== id));

    const handleParticipantChange = useCallback(
      (
        id: number,
        field: keyof Omit<
          ParticipantFormRow,
          "id" | "positionName" | "roleName" | "canSelectRole" | "positionId"
        >,
        value: string
      ) => {
        setParticipantForms((prev) =>
          prev.map((form) => {
            if (form.id === id) {
              if (field === "userId") {
                const selectedUser = detailedUsers.find((u) => u.id === value);
                const positionId = selectedUser?.position?.id ?? "";
                const positionName = selectedUser?.position?.name ?? "—";
                let roleId = "";
                let roleName = "";
                let canSelectRole = false;
                if (selectedUser?.organizerRole) {
                  roleId = selectedUser.organizerRole.id;
                  roleName = selectedUser.organizerRole.name;
                  canSelectRole = false;
                } else if (selectedUser) {
                  roleId = "";
                  roleName = "";
                  canSelectRole = true;
                } else {
                  roleId = "";
                  roleName = "";
                  canSelectRole = false;
                }
                return {
                  ...form,
                  userId: value,
                  positionId,
                  positionName,
                  roleId,
                  roleName,
                  canSelectRole,
                };
              } else if (field === "roleId" && form.canSelectRole) {
                return { ...form, roleId: value, roleName: "" };
              }
            }
            return form;
          })
        );
      },
      [detailedUsers]
    );

    useImperativeHandle(
      ref,
      () => ({
        getMembersData: () => {
          const existingIds = new Set(
            existingParticipants?.map((p) => p.userId) ?? []
          );
          const newMembers = participantForms
            .filter(
              (form) =>
                form.userId &&
                form.roleId &&
                form.positionId &&
                !existingIds.has(form.userId)
            )
            .map((form) => ({
              userId: form.userId,
              positionId: form.positionId,
              roleId: form.roleId,
            }));
          const uniqueNewMembersMap = new Map<string, ParticipantData>();
          newMembers.forEach((member) => {
            if (!uniqueNewMembersMap.has(member.userId)) {
              uniqueNewMembersMap.set(member.userId, member);
            } else {
              console.warn(
                `ParticipantSection: User ID ${member.userId} bị trùng lặp.`
              );
              toast.warn(
                `User ${getUserDisplay(
                  detailedUsers.find((u) => u.id === member.userId)
                )} bị trùng trong NTD.`,
                { duration: 4000 }
              );
            }
          });
          return Array.from(uniqueNewMembersMap.values());
        },
        resetForms: () => {
          setParticipantForms([]);
        },
      }),
      [participantForms, existingParticipants, detailedUsers]
    );

    const isLoading = loadingUsers || loadingRoles;
    const hasError = !!fetchUsersError || !!errorRoles;

    return (
      <div className="mt-4 border-t pt-4">
        <h3 className="text-md font-semibold mb-1 text-gray-600">
          Người tham dự
        </h3>
        {isLoading && (
          <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
        )}
        {fetchUsersError && (
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
            {fetchUsersError}
          </p>
        )}
        {errorRoles && (
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
            {errorRoles}
          </p>
        )}
        <button
          type="button"
          onClick={addParticipantFormRow}
          className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Thêm dòng nhập NTD"
          disabled={isLoading || hasError}
        >
          +
        </button>
        <div className="space-y-2">
          {participantForms.map((form) => (
            <div
              key={form.id}
              className="flex flex-col sm:flex-row gap-2 items-center p-2 border rounded bg-gray-50"
            >
              <div className="w-full sm:flex-grow">
                <SearchableUserDropdown
                  users={usersForDropdown}
                  selectedUserId={form.userId}
                  onChange={(userId) =>
                    handleParticipantChange(form.id, "userId", userId)
                  }
                  disabledUserIds={existingParticipantIds}
                  placeholder="-- Tìm user (có vị trí) --"
                />
              </div>
              <div
                className="w-full sm:w-1/3 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
                title={form.positionName || ""}
              >
                <span className="font-medium mr-1 flex-shrink-0">Vị trí:</span>
                <span className="truncate">
                  {form.positionName || (form.userId ? "N/A" : "—")}
                </span>
              </div>
              <div className="w-full sm:w-1/3 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center">
                {form.userId ? (
                  form.canSelectRole ? (
                    <select
                      value={form.roleId}
                      onChange={(e) =>
                        handleParticipantChange(
                          form.id,
                          "roleId",
                          e.target.value
                        )
                      }
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm h-[28px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loadingRoles}
                    >
                      <option value="">-- Chọn vai trò --</option>
                      {roles?.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      className="w-full whitespace-nowrap overflow-hidden text-ellipsis"
                      title={form.roleName || ""}
                    >
                      <span className="font-medium mr-1 flex-shrink-0">
                        Vai trò:
                      </span>
                      <span className="truncate">{form.roleName || "N/A"}</span>
                    </div>
                  )
                ) : (
                  <div className="w-full whitespace-nowrap">
                    <span className="font-medium mr-1 flex-shrink-0">
                      Vai trò:
                    </span>
                    <span className="truncate">—</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeParticipantFormRow(form.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full sm:w-auto cursor-pointer text-sm flex-shrink-0 h-[30px]"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
ParticipantSection.displayName = "ParticipantSection";
// --- END: Component ParticipantSection ---

// --- START: Component UpdateEventModal ---
interface UpdateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToUpdate: EventType | null;
  onEventUpdated: (updatedEvent: EventType) => void;
  currentUserId: string | null;
}

const UpdateEventModal: React.FC<UpdateEventModalProps> = ({
  isOpen,
  onClose,
  eventToUpdate,
  onEventUpdated,
  currentUserId,
}) => {
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  // State mới cho content thay vì dùng Tiptap
  const [content, setContent] = useState("");
  const [permissionsInput, setPermissionsInput] = useState<string>("");
  const [detailedUsers, setDetailedUsers] = useState<ApiUserWithDetails[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchUsersError, setFetchUsersError] = useState<string | null>(null);
  const [existingOrganizers, setExistingOrganizers] = useState<OrganizerData[]>(
    []
  );
  const [existingParticipants, setExistingParticipants] = useState<
    ParticipantData[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const btcSectionRef = useRef<BTCSectionHandle>(null);
  const participantSectionRef = useRef<ParticipantSectionHandle>(null);

  // State cho avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);


  // Bỏ useEffect và useEditor của Tiptap

  useEffect(() => {
    if (!isOpen) return;
    const fetchDetailedUsers = async () => {
      setLoadingUsers(true);
      setFetchUsersError(null);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Token không tồn tại.");
        const headers = { Authorization: `Bearer ${token}` };
        const res = await fetch(
          "http://localhost:8080/identity/users/with-position-and-role",
          { headers }
        );
        if (!res.ok) {
          const errorData = await res
            .json()
            .catch(() => ({ message: res.statusText }));
          throw new Error(`Lỗi tải user: ${errorData?.message || res.status}`);
        }
        const data = await res.json();
        if (data?.code !== 1000) {
          throw new Error(`API users lỗi: ${data?.message || "Unknown"}`);
        }
        setDetailedUsers(data?.result || []);
      } catch (err: any) {
        const msg = `Lỗi tải dữ liệu User: ${err.message}`;
        setFetchUsersError(msg);
        toast.error(msg);
        console.error("Fetch error UpdateEventModal Users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchDetailedUsers();
  }, [isOpen]);

  useEffect(() => {
    if (eventToUpdate) {
      setName(eventToUpdate.name || "");
      setPurpose(eventToUpdate.purpose || "");
      const eventTime = eventToUpdate.time
        ? new Date(eventToUpdate.time)
        : null;
      const formattedTime =
        eventTime && !isNaN(eventTime.getTime())
          ? `${eventTime.getFullYear()}-${String(
              eventTime.getMonth() + 1
            ).padStart(2, "0")}-${String(eventTime.getDate()).padStart(
              2,
              "0"
            )}T${String(eventTime.getHours()).padStart(2, "0")}:${String(
              eventTime.getMinutes()
            ).padStart(2, "0")}`
          : "";
      setTime(formattedTime);
      setLocation(eventToUpdate.location || "");
      // Cập nhật state content mới
      setContent(eventToUpdate.content || "");
      setPermissionsInput(eventToUpdate.permissions?.join(", ") || "");
      setError(null);

      // Cập nhật avatar preview và reset file đã chọn
      setAvatarPreview(eventToUpdate.avatarUrl || null);
      setAvatarFile(null);
      if(avatarInputRef.current) avatarInputRef.current.value = "";

      const organizersData: OrganizerData[] =
        eventToUpdate.organizers
          ?.filter((o) => o.userId && o.roleId && o.positionId)
          .map((o) => ({
            userId: o.userId,
            roleId: o.roleId!,
            positionId: o.positionId!,
          })) ?? [];
      setExistingOrganizers(organizersData);
      const participantsData: ParticipantData[] =
        eventToUpdate.participants
          ?.filter((p) => p.userId && p.roleId && p.positionId)
          .map((p) => ({
            userId: p.userId,
            roleId: p.roleId!,
            positionId: p.positionId!,
          })) ?? [];
      setExistingParticipants(participantsData);
      btcSectionRef.current?.resetForms();
      participantSectionRef.current?.resetForms();
    } else {
      // Reset state khi không có eventToUpdate
      setName("");
      setPurpose("");
      setTime("");
      setLocation("");
      setContent("");
      setPermissionsInput("");
      setAvatarPreview(null);
      setAvatarFile(null);
      if(avatarInputRef.current) avatarInputRef.current.value = "";
      setExistingOrganizers([]);
      setExistingParticipants([]);
      btcSectionRef.current?.resetForms();
      participantSectionRef.current?.resetForms();
    }
  }, [eventToUpdate, isOpen]); // Thêm isOpen để reset khi modal mở lại mà không có event

  const parsePermissions = (input: string): string[] => {
    return input
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p);
  };

  // --- START: Hàm xử lý Avatar ---
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            toast.error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp).');
            return;
        }
        if (file.size > maxSize) {
            toast.error('Kích thước ảnh không được vượt quá 5MB.');
            return;
        }

        setAvatarFile(file);
        // Tạo và hiển thị preview
        const currentPreview = avatarPreview;
        if (currentPreview && currentPreview.startsWith('blob:')) {
            URL.revokeObjectURL(currentPreview); // Thu hồi blob URL cũ
        }
        setAvatarPreview(URL.createObjectURL(file));
    } else {
        // Nếu người dùng hủy chọn file
        setAvatarFile(null);
        // Thu hồi blob URL nếu có
        if (avatarPreview && avatarPreview.startsWith('blob:')) {
            URL.revokeObjectURL(avatarPreview);
        }
        // Quay lại ảnh gốc của sự kiện hoặc null
        setAvatarPreview(eventToUpdate?.avatarUrl || null);
    }
  };

  const clearAvatarSelection = () => {
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
          URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(null);
      setAvatarPreview(eventToUpdate?.avatarUrl || null); // Revert to original or null
      if (avatarInputRef.current) {
          avatarInputRef.current.value = ""; // Reset file input visually
      }
  };

  // Cleanup blob URL khi unmount hoặc preview thay đổi
  useEffect(() => {
      const currentPreview = avatarPreview;
      if (currentPreview && currentPreview.startsWith('blob:')) {
          return () => {
              URL.revokeObjectURL(currentPreview);
          };
      }
      return () => {}; // No cleanup needed if not a blob
  }, [avatarPreview]);

  // --- END: Hàm xử lý Avatar ---


  // --- START: Hàm Upload Avatar ---
  const uploadAvatar = async (eventId: string, file: File, token: string) => {
      const formData = new FormData();
      // Key 'avatar' cần khớp với backend API
      formData.append('avatar', file);

      const apiUrl = `http://localhost:8080/identity/api/events/${eventId}/avatar`;

      try {
          // Không cần refresh token ở đây nếu handleSubmit đã xử lý
          const response = await fetch(apiUrl, {
              method: 'POST', // Hoặc PUT tùy theo API backend
              headers: {
                  // Không set 'Content-Type', browser tự làm với FormData
                  'Authorization': `Bearer ${token}`,
              },
              body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.message || `Lỗi ${response.status} khi tải lên avatar.`);
          }
          if (data.code === 1000) {
              toast.success("Cập nhật avatar thành công!");
              // Trả về avatarUrl mới nếu API trả về
              return data.result?.avatarUrl || null;
          } else {
              throw new Error(data.message || "Tải lên avatar không thành công.");
          }
      } catch (uploadError: any) {
          console.error("Lỗi tải lên avatar:", uploadError);
          toast.error(`Lỗi tải avatar: ${uploadError.message}`);
          return null; // Trả về null nếu có lỗi
      }
  };
  // --- END: Hàm Upload Avatar ---


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventToUpdate || !currentUserId) {
      setError("Thiếu thông tin sự kiện hoặc người dùng.");
      return;
    }
    if (!name.trim()) {
      setError("Tên sự kiện không được để trống.");
      return;
    }
    if (!time) {
      setError("Thời gian sự kiện không được để trống.");
      return;
    }
    // Lấy nội dung từ state mới thay vì Tiptap
    const currentContent = content.trim();
    if (!currentContent) {
      setError("Nội dung chi tiết không được để trống.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Vui lòng đăng nhập lại.");
      setIsSubmitting(false);
      return;
    }

    let bodyPayload;
    try {
      const newOrganizersData = btcSectionRef.current?.getMembersData() ?? [];
      const newParticipantsData =
        participantSectionRef.current?.getMembersData() ?? [];
      const finalOrganizersMap = new Map<string, { userId: string }>();
      existingOrganizers.forEach((org) =>
        finalOrganizersMap.set(org.userId, { userId: org.userId })
      );
      newOrganizersData.forEach((org) =>
        finalOrganizersMap.set(org.userId, { userId: org.userId })
      );
      const finalParticipantsMap = new Map<
        string,
        { userId: string; roleId: string }
      >();
      existingParticipants.forEach((par) =>
        finalParticipantsMap.set(par.userId, {
          userId: par.userId,
          roleId: par.roleId,
        })
      );
      newParticipantsData.forEach((par) =>
        finalParticipantsMap.set(par.userId, {
          userId: par.userId,
          roleId: par.roleId,
        })
      );
      const finalOrganizers = Array.from(finalOrganizersMap.values());
      const finalParticipants = Array.from(finalParticipantsMap.values());
      const parsedPermissionsData = parsePermissions(permissionsInput);
      let formattedTimeForAPI: string | null = null;
      const date = new Date(time);
      if (isNaN(date.getTime())) {
        throw new Error("Định dạng ngày giờ không hợp lệ.");
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      formattedTimeForAPI = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

      bodyPayload = {
        name: name.trim(),
        purpose: purpose.trim() || null,
        time: formattedTimeForAPI,
        location: location.trim() || null,
        content: currentContent, // Sử dụng content từ state
        attendees: [],
        organizers: finalOrganizers,
        participants: finalParticipants,
        permissions: parsedPermissionsData,
      };
      if (finalOrganizers.length === 0) {
        throw new Error("Cần có ít nhất một người trong BTC.");
      }
      if (finalParticipants.length === 0) {
        throw new Error("Cần có ít nhất một người tham dự.");
      }
    } catch (prepError: any) {
      setError(`Lỗi chuẩn bị dữ liệu: ${prepError.message}`);
      setIsSubmitting(false);
      return;
    }

    let updatedEventData: EventType | null = null; // Biến lưu trữ dữ liệu event sau khi cập nhật chính

    try {
      // Bước 1: Cập nhật thông tin chính của sự kiện (không bao gồm avatar)
      const apiUrl = `http://localhost:8080/identity/api/events/${eventToUpdate.id}?updatedByUserId=${currentUserId}`;
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyPayload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message || `Lỗi ${response.status}: Cập nhật thất bại`
        );
      }
      if (data.code !== 1000 || !data.result) {
         throw new Error(data.message || "Cập nhật sự kiện không thành công.");
      }

      toast.success(data.message || "Cập nhật thông tin sự kiện thành công!");
      updatedEventData = data.result; // Lưu kết quả cập nhật chính

      // Bước 2: Nếu có avatar mới, tiến hành upload
      let finalAvatarUrl = updatedEventData?.avatarUrl; // Giữ avatar cũ nếu không upload mới
      if (avatarFile) {
        const newAvatarUrl = await uploadAvatar(eventToUpdate.id, avatarFile, token);
        if (newAvatarUrl) {
            finalAvatarUrl = newAvatarUrl; // Cập nhật avatarUrl nếu upload thành công
        }
        // Nếu uploadAvatar lỗi, toast đã được hiển thị bên trong hàm đó
        // Không cần throw lỗi ở đây để tránh dừng luôn quy trình
      }

       // Cập nhật lại dữ liệu event với avatarUrl cuối cùng (có thể là mới hoặc cũ)
       if(updatedEventData) {
           updatedEventData.avatarUrl = finalAvatarUrl;
           onEventUpdated(updatedEventData); // Gọi callback với dữ liệu event đầy đủ
       }

      onClose(); // Đóng modal sau khi mọi thứ hoàn tất (hoặc sau khi cập nhật chính thành công)

    } catch (err: any) {
      console.error("Lỗi cập nhật sự kiện:", err);
      const errorMessage = err.message || "Đã xảy ra lỗi không mong muốn.";
      setError(errorMessage);
      toast.error(`Cập nhật thất bại: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    btcSectionRef.current?.resetForms();
    participantSectionRef.current?.resetForms();
    // Reset thêm state của modal này nếu cần
    setName("");
    setPurpose("");
    setTime("");
    setLocation("");
    setContent("");
    setPermissionsInput("");
    setAvatarPreview(null);
    setAvatarFile(null);
    if(avatarInputRef.current) avatarInputRef.current.value = "";
    setError(null);
    onClose();
  };

  // Bỏ useEffect cleanup của Tiptap

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity duration-300 ease-in-out"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-800">
            Chỉnh sửa sự kiện
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50 p-1 rounded-full hover:bg-gray-100"
            aria-label="Đóng modal"
          >
            <Cross2Icon className="h-5 w-5" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-grow overflow-hidden"
        >
          <div className="p-5 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {error && (
              <div
                className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"
                role="alert"
              >
                <p className="font-medium">Có lỗi xảy ra:</p>
                <p>{error}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              {/* Input Tên sự kiện, Thời gian, Địa điểm, Mục đích giữ nguyên */}
               <div className="md:col-span-2">
                <label
                  htmlFor="eventNameUpdate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tên sự kiện <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="eventNameUpdate"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-50"
                  disabled={isSubmitting}
                  aria-required="true"
                />
              </div>
              <div>
                <label
                  htmlFor="eventTimeUpdate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Thời gian <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="eventTimeUpdate"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-50"
                  disabled={isSubmitting}
                  aria-required="true"
                />
              </div>
              <div>
                <label
                  htmlFor="eventLocationUpdate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Địa điểm
                </label>
                <input
                  type="text"
                  id="eventLocationUpdate"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-50"
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="eventPurposeUpdate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Mục đích
                </label>
                <textarea
                  id="eventPurposeUpdate"
                  rows={2}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm resize-y disabled:bg-gray-50"
                  disabled={isSubmitting}
                />
              </div>

               {/* --- Textarea cho Content thay thế Tiptap --- */}
              <div className="md:col-span-2">
                  <label
                      htmlFor="eventContentUpdate"
                      className="block text-sm font-medium text-gray-700 mb-1"
                  >
                      Nội dung chi tiết <span className="text-red-500">*</span>
                  </label>
                  <textarea
                      id="eventContentUpdate"
                      rows={5} // Số dòng có thể điều chỉnh
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm resize-y disabled:bg-gray-50"
                      disabled={isSubmitting}
                      aria-required="true"
                      placeholder="Nhập nội dung chi tiết cho sự kiện..."
                  />
              </div>
              {/* --- Kết thúc Textarea --- */}

               {/* --- Phần cập nhật Avatar --- */}
              <div className="md:col-span-2">
                  <label htmlFor="eventAvatarUpdate" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Ảnh đại diện (Avatar)
                  </label>
                  <div className="flex items-center gap-4 mb-3">
                      <label className="flex-grow cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 transition duration-150 ease-in-out">
                          <span className="truncate">{avatarFile ? avatarFile.name : "Chọn ảnh mới (tối đa 5MB)"}</span>
                          <input
                              id="eventAvatarUpdate"
                              name="eventAvatarUpdate"
                              type="file"
                              className="sr-only"
                              accept="image/png, image/jpeg, image/gif, image/webp"
                              onChange={handleAvatarChange}
                              ref={avatarInputRef}
                              disabled={isSubmitting}
                          />
                      </label>
                      {avatarPreview && avatarFile && ( // Chỉ hiển thị nút xóa khi có preview mới từ file
                          <button
                              type="button"
                              onClick={clearAvatarSelection}
                              className="text-sm text-red-600 hover:text-red-800 transition duration-150 ease-in-out flex-shrink-0"
                              disabled={isSubmitting}
                          >
                              Xóa ảnh mới
                          </button>
                      )}
                  </div>

                  {/* Hiển thị preview */}
                  {avatarPreview && (
                      <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 w-32 h-32 overflow-hidden flex items-center justify-center">
                          <Image
                              src={avatarPreview}
                              alt="Xem trước avatar"
                              width={128}
                              height={128}
                              style={{
                                  display: 'block',
                                  objectFit: 'contain', // Contain để thấy toàn bộ ảnh trong khung
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                  width: 'auto',
                                  height: 'auto',
                              }}
                              onError={(e) => { // Xử lý lỗi tải ảnh preview (ví dụ blob URL hết hạn)
                                  console.error("Lỗi tải ảnh preview:", e);
                                  setAvatarPreview(eventToUpdate?.avatarUrl || null); // Quay lại ảnh gốc nếu preview lỗi
                              }}
                           />
                      </div>
                  )}
              </div>
               {/* --- Kết thúc cập nhật Avatar --- */}


              {/* BTCSection, ParticipantSection, Permissions giữ nguyên */}
              <div className="md:col-span-2">
                <BTCSection
                  ref={btcSectionRef}
                  existingOrganizers={existingOrganizers}
                  detailedUsers={detailedUsers}
                  loadingUsers={loadingUsers}
                  fetchUsersError={fetchUsersError}
                />
              </div>
              <div className="md:col-span-2">
                <ParticipantSection
                  ref={participantSectionRef}
                  existingParticipants={existingParticipants}
                  detailedUsers={detailedUsers}
                  loadingUsers={loadingUsers}
                  fetchUsersError={fetchUsersError}
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="eventPermissionsUpdate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Quyền truy cập
                </label>
                <input
                  type="text"
                  id="eventPermissionsUpdate"
                  value={permissionsInput}
                  onChange={(e) => setPermissionsInput(e.target.value)}
                  placeholder="Nhập tên quyền, cách nhau bởi dấu phẩy (,)"
                  className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-50"
                  disabled={isSubmitting}
                  aria-describedby="permissions-format-help"
                />
                <p
                  id="permissions-format-help"
                  className="text-xs text-gray-500 mt-1"
                >
                  Ví dụ: `Giảng viên, Sinh viên`.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end items-center p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer disabled:opacity-50 mr-3 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                loadingUsers ||
                !!fetchUsersError ||
                !currentUserId
              }
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <ReloadIcon className="h-4 w-4 animate-spin" /> Đang cập
                  nhật...
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </button>
          </div>
        </form>
      </div>
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default UpdateEventModal;