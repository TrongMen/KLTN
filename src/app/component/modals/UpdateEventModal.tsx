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

// --- Interfaces ---

// Cập nhật EventType để maxAttendees rõ ràng hơn là number hoặc null
interface EventType {
  id: string;
  name: string; // Đổi từ title nếu API trả về name
  time?: string; // Nên dùng string ISO 8601 nếu API trả về
  date?: string; // Thêm date nếu có
  location?: string;
  content?: string;
  description?: string; // Giữ lại nếu cần
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  rejectionReason?: string | null;
  purpose?: string;
  createdBy?: string;
  createdAt?: string;
  organizers?: {
    userId: string;
    positionId?: string; // Đảm bảo có các ID này
    roleId?: string;
    // Các trường khác nếu có
    [key: string]: any;
  }[];
  participants?: {
    userId: string;
    roleId?: string; // Đảm bảo có các ID này
    positionId?: string;
    // Các trường khác nếu có, ví dụ roleName để hiển thị nếu cần
    roleName?: string;
    [key: string]: any;
  }[];
  attendees?: any[]; // Giữ nguyên nếu không cần type chi tiết ở đây
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
  progressStatus?: string; // Giữ lại nếu cần
  maxAttendees?: number | null; // Rõ ràng hơn: number hoặc null
  currentAttendeesCount?: number; // Giữ lại nếu cần
}


// --- Các Interfaces và Components phụ (BTCSection, ParticipantSection, SearchableUserDropdown,...) giữ nguyên như trong code bạn cung cấp ---
// ... (Giữ nguyên code của BTCSection, ParticipantSection, SearchableUserDropdown, ApiRole, ApiPosition, ApiUserWithDetails,...)
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

const getUserDisplay = (
  user: ApiUserWithDetails | null | undefined
): string => {
  if (!user) return "";
  const fullName = `${user.lastName || ""} ${user.firstName || ""}`.trim();
  // Ưu tiên họ tên, sau đó đến username
  return fullName || user.username || "";
};

type SearchableUserDropdownProps = {
  users: ApiUserWithDetails[];
  selectedUserId: string | null;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabledUserIds?: Set<string>; // Set các user ID đã được chọn ở nơi khác
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
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref cho dropdown

  // Cập nhật input khi selectedUserId thay đổi từ bên ngoài
  useEffect(() => {
    const selectedUser = users?.find((u) => u.id === selectedUserId);
    setSearchTerm(getUserDisplay(selectedUser)); // Hiển thị tên user đã chọn
  }, [selectedUserId, users]);

  // Lọc danh sách user dựa trên searchTerm
  useEffect(() => {
    if (!users) {
      setFilteredUsers([]);
      return;
    }
    if (!searchTerm) {
      // Nếu không có searchTerm, hiển thị tất cả user (chưa bị disable)
      setFilteredUsers(users); //.filter(u => !disabledUserIds.has(u.id))); Tạm thời bỏ lọc ở đây để hiển thị đủ
      return;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    setFilteredUsers(
      users.filter((user) => {
        const fullName = `${user?.lastName ?? ""} ${user?.firstName ?? ""}`
          .trim()
          .toLowerCase();
        const username = (user?.username ?? "").toLowerCase();
        // Tìm kiếm trong cả họ tên và username
        return (
          fullName.includes(lowerSearchTerm) ||
          username.includes(lowerSearchTerm)
        );
      })
    );
  }, [searchTerm, users]); // Bỏ disabledUserIds khỏi dependency nếu không muốn lọc lại khi nó thay đổi

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        // Reset searchTerm về giá trị của user đang được chọn khi đóng dropdown
        const selectedUser = users?.find((u) => u.id === selectedUserId);
        setSearchTerm(getUserDisplay(selectedUser));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, selectedUserId, users]);

  // Xử lý khi input thay đổi
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsDropdownOpen(true); // Mở dropdown khi gõ
  };

  // Xử lý khi click vào input
  const handleInputClick = () => {
    setIsDropdownOpen(true);
    // Nếu input trống, hiển thị tất cả user
    if (!searchTerm && users) {
      setFilteredUsers(users); //.filter(u => !disabledUserIds.has(u.id)));
    }
  };

  // Xử lý khi chọn một user từ dropdown
  const handleUserSelect = (user: ApiUserWithDetails) => {
    if (disabledUserIds.has(user.id)) return; // Không cho chọn nếu đã bị disable
    onChange(user.id); // Gọi callback để cập nhật state cha
    setSearchTerm(getUserDisplay(user)); // Hiển thị tên user đã chọn trong input
    setIsDropdownOpen(false); // Đóng dropdown
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onClick={handleInputClick}
        placeholder={placeholder}
        className="border border-gray-300 rounded px-2 py-1 w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm h-[30px]" // Fixed height
        autoComplete="off" // Tắt gợi ý mặc định của trình duyệt
      />
      {isDropdownOpen && (
        <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg text-sm scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isDisabled = disabledUserIds.has(user.id);
              return (
                <li
                  key={user.id}
                  onClick={() => !isDisabled && handleUserSelect(user)}
                  className={`px-3 py-2 hover:bg-blue-100 ${
                    isDisabled
                      ? "text-gray-400 bg-gray-100 cursor-not-allowed" // Style cho user bị disable
                      : "cursor-pointer" // Style cho user có thể chọn
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

type BTCSectionProps = {
  existingOrganizers: OrganizerData[]; // Dữ liệu BTC đã có từ eventToUpdate
  detailedUsers: ApiUserWithDetails[]; // Danh sách tất cả user đã fetch
  loadingUsers: boolean;
  fetchUsersError: string | null;
};
type OrganizerFormRow = {
  id: number; // ID tạm thời cho React key
  userId: string;
  positionId: string;
  positionName: string; // Chỉ để hiển thị
  roleId: string;
  roleName: string; // Chỉ để hiển thị
};

const BTCSection = forwardRef<BTCSectionHandle, BTCSectionProps>(
  (
    { existingOrganizers, detailedUsers, loadingUsers, fetchUsersError },
    ref
  ) => {
    // State để quản lý các dòng form thêm mới BTC
    const [organizerForms, setOrganizerForms] = useState<OrganizerFormRow[]>(
      []
    );

    // Lấy danh sách ID của BTC đã tồn tại để disable trong dropdown
    const existingOrganizerIds = useMemo(
      () => new Set(existingOrganizers?.map((o) => o.userId) ?? []),
      [existingOrganizers]
    );

    // Lọc danh sách user chỉ lấy những người có vai trò BTC (organizerRole)
    const usersForDropdown = useMemo(
      () => detailedUsers.filter((user) => user.organizerRole != null),
      [detailedUsers]
    );

    // Hàm thêm một dòng form mới
    const addOrganizerFormRow = () =>
      setOrganizerForms((prev) => [
        ...prev,
        {
          id: Date.now(), // ID tạm thời unique
          userId: "",
          positionId: "",
          positionName: "",
          roleId: "",
          roleName: "",
        },
      ]);

    // Hàm xóa một dòng form
    const removeOrganizerFormRow = (id: number) =>
      setOrganizerForms((prev) => prev.filter((f) => f.id !== id));

    // Hàm xử lý khi thay đổi user trong dropdown của một dòng form
    const handleOrganizerChange = useCallback(
      (
        id: number, // ID của dòng form
        field: keyof Omit<OrganizerFormRow, "id" | "positionName" | "roleName">, // Chỉ cho phép thay đổi userId
        value: string // userId mới
      ) => {
        setOrganizerForms((prev) =>
          prev.map((form) => {
            if (form.id === id) {
              if (field === "userId") {
                // Tìm thông tin chi tiết của user được chọn
                const selectedDetailedUser = detailedUsers.find(
                  (u) => u.id === value
                );
                // Tự động điền position và role dựa trên user đã chọn
                return {
                  ...form,
                  userId: value,
                  positionId: selectedDetailedUser?.position?.id ?? "",
                  positionName: selectedDetailedUser?.position?.name ?? "—",
                  roleId: selectedDetailedUser?.organizerRole?.id ?? "",
                  roleName: selectedDetailedUser?.organizerRole?.name ?? "—",
                };
              }
              // Không cho phép thay đổi các trường khác trực tiếp ở đây
            }
            return form;
          })
        );
      },
      [detailedUsers] // Dependency: detailedUsers để tìm thông tin user
    );

    // Expose hàm để component cha có thể lấy dữ liệu và reset form
    useImperativeHandle(
      ref,
      () => ({
        // Hàm lấy dữ liệu các BTC mới được thêm vào (hợp lệ)
        getMembersData: () => {
          const existingIds = new Set(
            existingOrganizers?.map((o) => o.userId) ?? []
          );
          // Lọc các form hợp lệ (có userId, roleId, positionId và chưa tồn tại)
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

          // Kiểm tra và cảnh báo trùng lặp trong các dòng mới thêm
          const uniqueNewMembersMap = new Map<string, OrganizerData>();
          newMembers.forEach((member) => {
            if (!uniqueNewMembersMap.has(member.userId)) {
              uniqueNewMembersMap.set(member.userId, member);
            } else {
              // Nếu user ID bị trùng lặp trong các dòng mới thêm
              console.warn(
                `BTCSection: User ID ${member.userId} bị trùng lặp trong các dòng mới.`
              );
              // Hiển thị toast thông báo cho người dùng
              toast.error(
                `User ${getUserDisplay(
                  detailedUsers.find((u) => u.id === member.userId)
                )} bị trùng lặp trong danh sách BTC mới thêm.`,
                { duration: 4000 }
              );
            }
          });
          // Trả về mảng các BTC mới và duy nhất
          return Array.from(uniqueNewMembersMap.values());
        },
        // Hàm reset lại các dòng form thêm mới
        resetForms: () => {
          setOrganizerForms([]);
        },
      }),
      [organizerForms, existingOrganizers, detailedUsers] // Dependencies
    );

    return (
      <div className="mt-4 border-t pt-4">
        <h3 className="text-md font-semibold mb-1 text-gray-600">
          Thêm Ban tổ chức (BTC)
        </h3>
        {/* Hiển thị trạng thái loading hoặc lỗi */}
        {loadingUsers && <p className="text-sm text-gray-500">Đang tải danh sách user...</p>}
        {fetchUsersError && (
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
            Lỗi tải user: {fetchUsersError}
          </p>
        )}
        {/* Nút thêm dòng mới */}
        <button
          type="button"
          onClick={addOrganizerFormRow}
          className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Thêm dòng nhập BTC"
          disabled={loadingUsers || !!fetchUsersError} // Disable nếu đang load hoặc có lỗi
        >
          +
        </button>
        {/* Danh sách các dòng form */}
        <div className="space-y-2">
          {organizerForms.map((form) => (
            <div
              key={form.id}
              className="flex flex-col sm:flex-row gap-2 items-center p-2 border rounded bg-gray-50"
            >
              {/* Dropdown chọn User */}
              <div className="w-full sm:flex-grow">
                <SearchableUserDropdown
                  users={usersForDropdown} // Chỉ hiện user có vai trò BTC
                  selectedUserId={form.userId}
                  onChange={(userId) =>
                    handleOrganizerChange(form.id, "userId", userId)
                  }
                  disabledUserIds={existingOrganizerIds} // Disable user đã có trong BTC
                  placeholder="-- Tìm user (có vai trò BTC) --"
                />
              </div>
              {/* Hiển thị Vị trí (tự động điền) */}
              <div
                className="w-full sm:w-1/3 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
                title={form.positionName || ""}
              >
                <span className="font-medium mr-1 flex-shrink-0">Vị trí:</span>
                <span className="truncate">
                  {form.positionName || (form.userId ? "N/A" : "—")}
                </span>
              </div>
              {/* Hiển thị Vai trò BTC (tự động điền) */}
              <div
                className="w-full sm:w-1/3 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
                title={form.roleName || ""}
              >
                <span className="font-medium mr-1 flex-shrink-0">Vai trò:</span>
                <span className="truncate">
                  {form.roleName || (form.userId ? "N/A" : "—")}
                </span>
              </div>
              {/* Nút xóa dòng */}
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
BTCSection.displayName = "BTCSection"; // Tên hiển thị cho React DevTools


type ParticipantSectionProps = {
    existingParticipants: ParticipantData[]; // Dữ liệu NTD đã có từ eventToUpdate
    detailedUsers: ApiUserWithDetails[]; // Danh sách tất cả user đã fetch
    loadingUsers: boolean;
    fetchUsersError: string | null;
};
type ParticipantFormRow = {
    id: number; // ID tạm thời cho React key
    userId: string;
    positionId: string;
    positionName: string; // Chỉ để hiển thị
    roleId: string; // Có thể là vai trò BTC mặc định hoặc vai trò được chọn
    roleName: string; // Chỉ để hiển thị
    canSelectRole: boolean; // Cho biết user này có thể chọn vai trò khác không (nếu không có vai trò BTC mặc định)
};

const ParticipantSection = forwardRef<ParticipantSectionHandle, ParticipantSectionProps>(
    (
        { existingParticipants, detailedUsers, loadingUsers, fetchUsersError },
        ref
    ) => {
        // State quản lý các dòng form thêm mới NTD
        const [participantForms, setParticipantForms] = useState<ParticipantFormRow[]>([]);
        // State lưu danh sách các vai trò có thể chọn (nếu user không có vai trò BTC mặc định)
        const [roles, setRoles] = useState<ApiRole[]>([]);
        const [loadingRoles, setLoadingRoles] = useState(true);
        const [errorRoles, setErrorRoles] = useState<string | null>(null);

        // Lấy danh sách ID của NTD đã tồn tại để disable trong dropdown
        const existingParticipantIds = useMemo(
            () => new Set(existingParticipants?.map((p) => p.userId) ?? []),
            [existingParticipants]
        );

        // Lọc danh sách user chỉ lấy những người có vị trí (position) - vì NTD phải có vị trí
        const usersForDropdown = useMemo(
            () => detailedUsers.filter((user) => user.position != null),
            [detailedUsers]
        );

        // Fetch danh sách các vai trò (OrganizerRole) khi component mount
        useEffect(() => {
            const fetchRoles = async () => {
                setLoadingRoles(true);
                setErrorRoles(null);
                try {
                    const token = localStorage.getItem("authToken");
                    if (!token) throw new Error("Token không tồn tại.");
                    const headers = { Authorization: `Bearer ${token}` };
                    const rRes = await fetch(
                        "${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/organizerrole", // API endpoint lấy danh sách vai trò
                        { headers }
                    );
                    if (!rRes.ok)
                        throw new Error(`Lỗi tải danh sách vai trò (${rRes.status})`);
                    const rData = await rRes.json();
                    if (rData?.code !== 1000) {
                        throw new Error(`API Roles lỗi: ${rData?.message || "Unknown"}`);
                    }
                    setRoles(rData?.result || []); // Lưu danh sách vai trò vào state
                } catch (err: any) {
                    const msg = `Lỗi tải vai trò NTD: ${err.message}`;
                    setErrorRoles(msg);
                    toast.error(msg);
                    console.error("Fetch error ParticipantSection roles:", err);
                } finally {
                    setLoadingRoles(false);
                }
            };
            fetchRoles();
        }, []); // Chạy 1 lần khi mount

        // Hàm thêm một dòng form mới cho NTD
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
                    canSelectRole: false, // Mặc định là không thể chọn vai trò
                },
            ]);

        // Hàm xóa một dòng form NTD
        const removeParticipantFormRow = (id: number) =>
            setParticipantForms((prev) => prev.filter((f) => f.id !== id));

        // Hàm xử lý khi thay đổi user hoặc vai trò trong một dòng form NTD
        const handleParticipantChange = useCallback(
            (
                id: number,
                field: keyof Omit<ParticipantFormRow, "id" | "positionName" | "roleName" | "canSelectRole" | "positionId">, // Chỉ cho phép thay đổi userId hoặc roleId
                value: string
            ) => {
                setParticipantForms((prev) =>
                    prev.map((form) => {
                        if (form.id === id) {
                            // Nếu thay đổi User
                            if (field === "userId") {
                                const selectedUser = detailedUsers.find((u) => u.id === value);
                                const positionId = selectedUser?.position?.id ?? "";
                                const positionName = selectedUser?.position?.name ?? "—";
                                let roleId = "";
                                let roleName = "";
                                let canSelectRole = false;

                                // Kiểm tra xem user có vai trò BTC mặc định không
                                if (selectedUser?.organizerRole) {
                                    // Nếu có, dùng vai trò mặc định và không cho chọn
                                    roleId = selectedUser.organizerRole.id;
                                    roleName = selectedUser.organizerRole.name;
                                    canSelectRole = false;
                                } else if (selectedUser) {
                                    // Nếu không có vai trò mặc định, cho phép chọn từ danh sách
                                    roleId = ""; // Reset roleId
                                    roleName = "";
                                    canSelectRole = true;
                                } else {
                                    // Nếu user không hợp lệ (không tìm thấy)
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
                            }
                            // Nếu thay đổi Role (chỉ cho phép khi canSelectRole là true)
                            else if (field === "roleId" && form.canSelectRole) {
                                // Cập nhật roleId, roleName sẽ được hiển thị dựa trên roleId này
                                return { ...form, roleId: value, roleName: "" }; // Reset roleName để select hiển thị đúng
                            }
                        }
                        return form;
                    })
                );
            },
            [detailedUsers] // Dependency: detailedUsers
        );


        // Expose hàm để component cha có thể lấy dữ liệu và reset form
        useImperativeHandle(
            ref,
            () => ({
                // Hàm lấy dữ liệu các NTD mới được thêm vào (hợp lệ)
                getMembersData: () => {
                    const existingIds = new Set(
                        existingParticipants?.map((p) => p.userId) ?? []
                    );
                    // Lọc các form hợp lệ (có userId, roleId, positionId và chưa tồn tại)
                    const newMembers = participantForms
                        .filter(
                            (form) =>
                                form.userId &&
                                form.roleId && // Đảm bảo đã chọn/có vai trò
                                form.positionId && // Đảm bảo có vị trí
                                !existingIds.has(form.userId)
                        )
                        .map((form) => ({
                            userId: form.userId,
                            positionId: form.positionId,
                            roleId: form.roleId, // Lấy roleId đã chọn hoặc mặc định
                        }));

                     // Kiểm tra và cảnh báo trùng lặp trong các dòng mới thêm
                    const uniqueNewMembersMap = new Map<string, ParticipantData>();
                    newMembers.forEach((member) => {
                        if (!uniqueNewMembersMap.has(member.userId)) {
                            uniqueNewMembersMap.set(member.userId, member);
                        } else {
                             // Nếu user ID bị trùng lặp trong các dòng mới thêm
                            console.warn(
                                `ParticipantSection: User ID ${member.userId} bị trùng lặp trong các dòng mới.`
                            );
                             // Hiển thị toast thông báo cho người dùng
                            toast.error(
                                `User ${getUserDisplay(
                                    detailedUsers.find((u) => u.id === member.userId)
                                )} bị trùng lặp trong danh sách NTD mới thêm.`,
                                { duration: 4000 }
                            );
                        }
                    });
                     // Trả về mảng các NTD mới và duy nhất
                    return Array.from(uniqueNewMembersMap.values());
                },
                // Hàm reset lại các dòng form thêm mới
                resetForms: () => {
                    setParticipantForms([]);
                },
            }),
            [participantForms, existingParticipants, detailedUsers] // Dependencies
        );

        // Xác định trạng thái loading và error tổng thể cho section này
        const isLoading = loadingUsers || loadingRoles;
        const hasError = !!fetchUsersError || !!errorRoles;

        return (
            <div className="mt-4 border-t pt-4">
                <h3 className="text-md font-semibold mb-1 text-gray-600">
                   Thêm Người tham dự (NTD)
                </h3>
                 {/* Hiển thị trạng thái loading hoặc lỗi */}
                {isLoading && (
                    <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
                )}
                {fetchUsersError && (
                    <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
                       Lỗi tải user: {fetchUsersError}
                    </p>
                )}
                {errorRoles && (
                    <p className="text-sm text-red-600 bg-red-100 p-2 rounded">
                       Lỗi tải vai trò: {errorRoles}
                    </p>
                )}
                 {/* Nút thêm dòng mới */}
                <button
                    type="button"
                    onClick={addParticipantFormRow}
                    className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
                    title="Thêm dòng nhập NTD"
                    disabled={isLoading || hasError} // Disable nếu đang load hoặc có lỗi
                >
                    +
                </button>
                 {/* Danh sách các dòng form */}
                <div className="space-y-2">
                    {participantForms.map((form) => (
                        <div
                            key={form.id}
                            className="flex flex-col sm:flex-row gap-2 items-center p-2 border rounded bg-gray-50"
                        >
                             {/* Dropdown chọn User */}
                            <div className="w-full sm:flex-grow">
                                <SearchableUserDropdown
                                    users={usersForDropdown} // Chỉ hiện user có vị trí
                                    selectedUserId={form.userId}
                                    onChange={(userId) =>
                                        handleParticipantChange(form.id, "userId", userId)
                                    }
                                    disabledUserIds={existingParticipantIds} // Disable user đã có trong NTD
                                    placeholder="-- Tìm user (có vị trí) --"
                                />
                            </div>
                             {/* Hiển thị Vị trí (tự động điền) */}
                            <div
                                className="w-full sm:w-1/3 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap overflow-hidden text-ellipsis"
                                title={form.positionName || ""}
                            >
                                <span className="font-medium mr-1 flex-shrink-0">Vị trí:</span>
                                <span className="truncate">
                                    {form.positionName || (form.userId ? "N/A" : "—")}
                                </span>
                            </div>
                             {/* Hiển thị hoặc cho chọn Vai trò */}
                            <div className="w-full sm:w-1/3 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center">
                                {form.userId ? ( // Chỉ hiển thị/cho chọn khi đã chọn user
                                    form.canSelectRole ? ( // Nếu user không có vai trò mặc định -> cho chọn
                                        <select
                                            value={form.roleId}
                                            onChange={(e) =>
                                                handleParticipantChange(
                                                    form.id,
                                                    "roleId",
                                                    e.target.value
                                                )
                                            }
                                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-sm h-[28px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none" // appearance-none để tùy chỉnh giao diện dễ hơn nếu cần
                                            disabled={loadingRoles || roles.length === 0} // Disable nếu đang load hoặc không có vai trò nào
                                            required // Bắt buộc chọn vai trò
                                        >
                                            <option value="">-- Chọn vai trò --</option>
                                            {/* Lọc và hiển thị các vai trò có sẵn */}
                                            {roles?.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : ( // Nếu user có vai trò mặc định -> hiển thị
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
                                ) : ( // Nếu chưa chọn user -> hiển thị placeholder
                                    <div className="w-full whitespace-nowrap">
                                        <span className="font-medium mr-1 flex-shrink-0">
                                            Vai trò:
                                        </span>
                                        <span className="truncate">—</span>
                                    </div>
                                )}
                            </div>
                             {/* Nút xóa dòng */}
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
ParticipantSection.displayName = "ParticipantSection"; // Tên hiển thị cho React DevTools


// --- UpdateEventModal Component ---

interface UpdateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToUpdate: EventType | null; // Dữ liệu sự kiện cần cập nhật
  onEventUpdated: (updatedEvent: EventType) => void; // Callback khi cập nhật thành công
  currentUserId: string | null; // ID của người dùng hiện tại (để gửi updatedByUserId)
}

const UpdateEventModal: React.FC<UpdateEventModalProps> = ({
  isOpen,
  onClose,
  eventToUpdate,
  onEventUpdated,
  currentUserId,
}) => {
  // --- State cho các trường input cơ bản ---
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [time, setTime] = useState(""); // Lưu trữ dạng 'YYYY-MM-DDTHH:mm' cho input datetime-local
  const [location, setLocation] = useState("");
  const [content, setContent] = useState("");
  const [maxAttendees, setMaxAttendees] = useState<string>(""); // Lưu dạng string cho input

  // --- State cho việc fetch và quản lý user, roles, positions ---
  const [detailedUsers, setDetailedUsers] = useState<ApiUserWithDetails[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [fetchUsersError, setFetchUsersError] = useState<string | null>(null);

  // --- State quản lý danh sách BTC và NTD đã có ---
  const [existingOrganizers, setExistingOrganizers] = useState<OrganizerData[]>([]);
  const [existingParticipants, setExistingParticipants] = useState<ParticipantData[]>([]);

  // --- State cho trạng thái submit và lỗi ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Refs để gọi hàm từ component con ---
  const btcSectionRef = useRef<BTCSectionHandle>(null);
  const participantSectionRef = useRef<ParticipantSectionHandle>(null);

  // --- State và Ref cho việc upload avatar ---
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null); // Ref cho input file

  // --- Effect để fetch danh sách users khi modal mở ---
  useEffect(() => {
    if (!isOpen) return; // Chỉ fetch khi modal mở

    const fetchDetailedUsers = async () => {
      setLoadingUsers(true);
      setFetchUsersError(null);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Token không tồn tại.");
        const headers = { Authorization: `Bearer ${token}` };
        // API endpoint để lấy users kèm position và organizerRole
        const res = await fetch(
          "${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/with-position-and-role",
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
        setDetailedUsers(data?.result || []); // Lưu danh sách user vào state
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
  }, [isOpen]); // Chạy lại khi `isOpen` thay đổi

  // --- Effect để điền dữ liệu vào form khi `eventToUpdate` thay đổi hoặc modal mở ---
  useEffect(() => {
    if (eventToUpdate && isOpen) {
        setName(eventToUpdate.name || "");
        setPurpose(eventToUpdate.purpose || "");

        // *** SỬA LỖI HIỂN THỊ THỜI GIAN ***
        let initialTimeValue = "";
        // Ưu tiên dùng eventToUpdate.time nếu nó là string ISO hợp lệ
        // Nếu không, thử dùng eventToUpdate.date
        const dateTimeString = eventToUpdate.time || eventToUpdate.date;
        if (dateTimeString) {
            try {
                const dateObj = new Date(dateTimeString);
                if (!isNaN(dateObj.getTime())) {
                    // Chuyển sang định dạng YYYY-MM-DDTHH:mm
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                    const day = String(dateObj.getDate()).padStart(2, "0");
                    const hours = String(dateObj.getHours()).padStart(2, "0");
                    const minutes = String(dateObj.getMinutes()).padStart(2, "0");
                    initialTimeValue = `${year}-${month}-${day}T${hours}:${minutes}`;
                }
            } catch (e) {
                console.error("Error parsing event time/date:", e);
            }
        }
        setTime(initialTimeValue);

        setLocation(eventToUpdate.location || "");
        setContent(eventToUpdate.content || eventToUpdate.description || ""); // Ưu tiên content

        // *** SỬA LỖI HIỂN THỊ MAX ATTENDEES ***
        // Chuyển đổi number | null | undefined thành string cho input
        // Nếu là null hoặc undefined -> chuỗi rỗng ""
        // Nếu là số -> chuyển thành chuỗi
        setMaxAttendees(eventToUpdate.maxAttendees != null ? eventToUpdate.maxAttendees.toString() : "");

        setError(null); // Reset lỗi cũ

        // Xử lý Avatar
        setAvatarPreview(eventToUpdate.avatarUrl || null); // Hiển thị avatar hiện tại
        setAvatarFile(null); // Reset file đã chọn (nếu có)
        if(avatarInputRef.current) avatarInputRef.current.value = ""; // Reset input file

        // Chuẩn bị dữ liệu BTC và NTD đã có
        const organizersData: OrganizerData[] =
            eventToUpdate.organizers
            ?.filter((o) => o.userId && o.roleId && o.positionId) // Đảm bảo có đủ ID
            .map((o) => ({
                userId: o.userId,
                roleId: o.roleId!, // Dùng ! vì đã filter
                positionId: o.positionId!,
            })) ?? [];
        setExistingOrganizers(organizersData);

        const participantsData: ParticipantData[] =
            eventToUpdate.participants
            ?.filter((p) => p.userId && p.roleId && p.positionId) // Đảm bảo có đủ ID
            .map((p) => ({
                userId: p.userId,
                roleId: p.roleId!,
                positionId: p.positionId!,
            })) ?? [];
        setExistingParticipants(participantsData);

        // Reset các form thêm mới trong component con
        btcSectionRef.current?.resetForms();
        participantSectionRef.current?.resetForms();

    } else if (!isOpen) {
        // Reset form hoàn toàn khi modal đóng (nếu không có eventToUpdate)
        setName("");
        setPurpose("");
        setTime("");
        setLocation("");
        setContent("");
        setMaxAttendees("");
        setAvatarPreview(null);
        setAvatarFile(null);
        if(avatarInputRef.current) avatarInputRef.current.value = "";
        setExistingOrganizers([]);
        setExistingParticipants([]);
        btcSectionRef.current?.resetForms();
        participantSectionRef.current?.resetForms();
        setError(null);
    }
}, [eventToUpdate, isOpen]); // Dependencies: chạy khi event hoặc trạng thái mở thay đổi


  // Hàm xử lý thay đổi input file avatar
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      // Kiểm tra loại file
      if (!validTypes.includes(file.type)) {
        toast.error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp).');
        return;
      }
      // Kiểm tra kích thước file
      if (file.size > maxSize) {
        toast.error('Kích thước ảnh không được vượt quá 5MB.');
        return;
      }

      setAvatarFile(file); // Lưu file vào state

      // Tạo URL tạm thời để xem trước ảnh
      const currentPreview = avatarPreview;
      // Thu hồi URL cũ nếu nó là blob URL để tránh leak memory
      if (currentPreview && currentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(currentPreview);
      }
      setAvatarPreview(URL.createObjectURL(file)); // Tạo và set URL mới
    } else {
      // Nếu người dùng hủy chọn file
      setAvatarFile(null);
      // Thu hồi URL cũ nếu là blob
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
      // Quay lại hiển thị avatar gốc của sự kiện
      setAvatarPreview(eventToUpdate?.avatarUrl || null);
    }
  };

  // Hàm xóa ảnh mới đã chọn (quay về ảnh gốc hoặc không có ảnh)
  const clearAvatarSelection = () => {
      // Thu hồi URL blob nếu có
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
          URL.revokeObjectURL(avatarPreview);
      }
      setAvatarFile(null); // Xóa file đã chọn
      setAvatarPreview(eventToUpdate?.avatarUrl || null); // Hiển thị lại ảnh gốc
      // Reset input file để có thể chọn lại cùng file đó
      if (avatarInputRef.current) {
          avatarInputRef.current.value = "";
      }
  };

  // Effect để tự động thu hồi blob URL khi component unmount hoặc preview thay đổi
  useEffect(() => {
      const currentPreview = avatarPreview;
      if (currentPreview && currentPreview.startsWith('blob:')) {
          // Trả về một cleanup function
          return () => {
              URL.revokeObjectURL(currentPreview);
          };
      }
      // Nếu không phải blob URL, không cần làm gì
      return () => {};
  }, [avatarPreview]); // Dependency: avatarPreview


   // Hàm upload avatar lên server
   const uploadAvatar = async (eventId: string, file: File, token: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('avatar', file); // Key phải khớp với backend API
    const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventId}/avatar`; // Endpoint upload avatar

    try {
        const response = await fetch(apiUrl, {
            method: 'POST', // Hoặc PUT tùy backend
            headers: {
                // Không cần 'Content-Type': 'multipart/form-data', trình duyệt tự xử lý
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
            // Ném lỗi với message từ API nếu có
            throw new Error(data.message || `Lỗi ${response.status} khi tải lên avatar.`);
        }
        if (data.code === 1000 && data.result?.avatarUrl) {
            toast.success("Cập nhật avatar thành công!");
            return data.result.avatarUrl; // Trả về URL mới của avatar
        } else {
            // Ném lỗi nếu code không thành công hoặc không có avatarUrl trả về
            throw new Error(data.message || "Tải lên avatar không thành công theo phản hồi API.");
        }
    } catch (uploadError: any) {
        console.error("Lỗi tải lên avatar:", uploadError);
        toast.error(`Lỗi tải avatar: ${uploadError.message}`);
        return null; // Trả về null nếu có lỗi
    }
};


  // --- Hàm xử lý submit form ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventToUpdate || !currentUserId) {
      setError("Thiếu thông tin sự kiện hoặc người dùng.");
      return;
    }

    // --- Validate các trường bắt buộc ---
    if (!name.trim()) {
      setError("Tên sự kiện không được để trống.");
      toast.error("Tên sự kiện không được để trống.");
      return;
    }
    if (!time) {
      setError("Thời gian sự kiện không được để trống.");
      toast.error("Thời gian sự kiện không được để trống.");
      return;
    }
    const currentContent = content.trim();
    if (!currentContent) {
      setError("Nội dung chi tiết không được để trống.");
      toast.error("Nội dung chi tiết không được để trống.");
      return;
    }
    // Validate location nếu bạn muốn nó là bắt buộc
    // if (!location.trim()) {
    //   setError("Địa điểm không được để trống.");
    //   toast.error("Địa điểm không được để trống.");
    //   return;
    // }

    setIsSubmitting(true);
    setError(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("Yêu cầu xác thực. Vui lòng đăng nhập lại.");
      toast.error("Yêu cầu xác thực. Vui lòng đăng nhập lại.");
      setIsSubmitting(false);
      return;
    }

    let bodyPayload; // Payload để gửi lên API
    try {
      // Lấy dữ liệu BTC và NTD mới từ component con
      const newOrganizersData = btcSectionRef.current?.getMembersData() ?? [];
      const newParticipantsData = participantSectionRef.current?.getMembersData() ?? [];

      // Kết hợp danh sách cũ và mới, đảm bảo không trùng lặp userId
      const finalOrganizersMap = new Map<string, { userId: string }>();
      existingOrganizers.forEach((org) => finalOrganizersMap.set(org.userId, { userId: org.userId }));
      newOrganizersData.forEach((org) => finalOrganizersMap.set(org.userId, { userId: org.userId }));

      const finalParticipantsMap = new Map<string, { userId: string; roleId: string }>();
      existingParticipants.forEach((par) => finalParticipantsMap.set(par.userId, { userId: par.userId, roleId: par.roleId }));
      newParticipantsData.forEach((par) => finalParticipantsMap.set(par.userId, { userId: par.userId, roleId: par.roleId }));

      const finalOrganizers = Array.from(finalOrganizersMap.values());
      const finalParticipants = Array.from(finalParticipantsMap.values());

      // *** Validate BTC và NTD ***
      if (finalOrganizers.length === 0) {
        throw new Error("Cần có ít nhất một người trong Ban tổ chức.");
      }
      if (finalParticipants.length === 0) {
        throw new Error("Cần có ít nhất một người tham gia.");
      }
       // Kiểm tra xem tất cả NTD mới đã chọn vai trò chưa (nếu cần)
       const participantsWithoutRole = newParticipantsData.filter(p => {
           const formRow = participantSectionRef.current
               ? (participantSectionRef.current as any).participantForms?.find((f: ParticipantFormRow) => f.userId === p.userId)
               : null;
           // Kiểm tra nếu được phép chọn vai trò mà chưa chọn
           return formRow?.canSelectRole && !p.roleId;
       });

       if (participantsWithoutRole.length > 0) {
           const userNames = participantsWithoutRole.map(p => getUserDisplay(detailedUsers.find(u => u.id === p.userId))).join(', ');
           throw new Error(`Vui lòng chọn vai trò cho người tham gia: ${userNames}`);
       }


      // *** SỬA LỖI FORMAT THỜI GIAN GỬI ĐI ***
      let formattedTimeForAPI: string | null = null;
      try {
        const date = new Date(time); // Parse từ input 'YYYY-MM-DDTHH:mm'
        if (isNaN(date.getTime())) {
          throw new Error("Định dạng ngày giờ không hợp lệ.");
        }
        // Chuyển thành ISO 8601 UTC hoặc theo múi giờ của client nếu API hỗ trợ
        // Ví dụ: Gửi đi dạng ISO 8601 đầy đủ (bao gồm giây và múi giờ Z - UTC)
        formattedTimeForAPI = date.toISOString();
        // Hoặc nếu API chỉ cần YYYY-MM-DDTHH:mm:ss thì format lại:
        // const year = date.getFullYear();
        // const month = String(date.getMonth() + 1).padStart(2, "0");
        // const day = String(date.getDate()).padStart(2, "0");
        // const hours = String(date.getHours()).padStart(2, "0");
        // const minutes = String(date.getMinutes()).padStart(2, "0");
        // const seconds = String(date.getSeconds()).padStart(2, "0"); // Thêm giây nếu API yêu cầu
        // formattedTimeForAPI = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      } catch (timeError: any) {
        throw new Error(`Lỗi xử lý thời gian: ${timeError.message}`);
      }


      // *** SỬA LỖI PARSE MAX ATTENDEES ***
      let parsedMaxAttendees: number | null = null;
      const trimmedMaxAttendees = maxAttendees.trim();
      if (trimmedMaxAttendees !== "") { // Chỉ parse nếu không phải chuỗi rỗng
          const num = parseInt(trimmedMaxAttendees, 10);
          if (!isNaN(num) && num >= 0) { // Phải là số và không âm
              parsedMaxAttendees = num;
          } else {
               // Ném lỗi nếu giá trị nhập vào không hợp lệ
              throw new Error("Số người tham dự tối đa phải là một số nguyên không âm.");
          }
      }
      // Nếu trimmedMaxAttendees là "", parsedMaxAttendees sẽ là null (không giới hạn)

      // Tạo payload cuối cùng
      bodyPayload = {
        name: name.trim(),
        purpose: purpose.trim() || null, // Gửi null nếu trống
        time: formattedTimeForAPI, // Gửi thời gian đã format
        location: location.trim() || null, // Gửi null nếu trống
        content: currentContent,
        attendees: eventToUpdate.attendees || [], // Giữ lại attendees cũ nếu API không tự xử lý
        organizers: finalOrganizers, // Danh sách BTC cuối cùng
        participants: finalParticipants, // Danh sách NTD cuối cùng
        maxAttendees: parsedMaxAttendees, // Số lượng tối đa (number hoặc null)
      };

    } catch (prepError: any) {
      // Bắt lỗi trong quá trình chuẩn bị dữ liệu
      setError(`Lỗi chuẩn bị dữ liệu: ${prepError.message}`);
      toast.error(`Lỗi: ${prepError.message}`);
      setIsSubmitting(false);
      return;
    }

    let updatedEventData: EventType | null = null; // Lưu dữ liệu trả về từ API

    // --- Gọi API cập nhật sự kiện ---
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventToUpdate.id}?updatedByUserId=${currentUserId}`;
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
        // Ném lỗi nếu response không thành công (status code không phải 2xx)
        throw new Error(
          data.message || `Lỗi ${response.status}: Cập nhật thất bại`
        );
      }
      if (data.code !== 1000 || !data.result) {
         // Ném lỗi nếu API trả về code không thành công hoặc không có result
        throw new Error(data.message || "Cập nhật sự kiện không thành công theo phản hồi API.");
      }

      // --- Cập nhật thành công ---
      toast.success(data.message || "Cập nhật thông tin sự kiện thành công!");
      updatedEventData = data.result as EventType; // Lưu dữ liệu sự kiện đã cập nhật

      // --- Upload avatar nếu có file mới được chọn ---
      let finalAvatarUrl = updatedEventData?.avatarUrl; // Giữ avatar cũ mặc định
      if (avatarFile) {
        // Nếu có file mới, tiến hành upload
        const newAvatarUrl = await uploadAvatar(eventToUpdate.id, avatarFile, token);
        if (newAvatarUrl !== null) {
            // Nếu upload thành công, cập nhật finalAvatarUrl
            finalAvatarUrl = newAvatarUrl;
        }
        // Nếu upload lỗi, toast đã hiển thị, finalAvatarUrl giữ nguyên giá trị cũ
      }

      // --- Gọi callback và đóng modal ---
      if(updatedEventData) {
           // Cập nhật avatarUrl trong dữ liệu trước khi gọi callback
          updatedEventData.avatarUrl = finalAvatarUrl;
          onEventUpdated(updatedEventData); // Gửi dữ liệu đã cập nhật (kèm avatar mới nếu có) về component cha
      }
      handleClose(); // Đóng modal và reset form

    } catch (err: any) {
      // Bắt lỗi từ API call hoặc upload avatar
      console.error("Lỗi cập nhật sự kiện:", err);
      const errorMessage = err.message || "Đã xảy ra lỗi không mong muốn.";
      setError(errorMessage); // Hiển thị lỗi trên modal
      toast.error(`Cập nhật thất bại: ${errorMessage}`);
    } finally {
      setIsSubmitting(false); // Luôn tắt trạng thái submitting
    }
  };

  // --- Hàm xử lý khi đóng modal (reset state) ---
  const handleClose = () => {
    // Reset state của các component con
    btcSectionRef.current?.resetForms();
    participantSectionRef.current?.resetForms();
    // Reset state của modal
    setName("");
    setPurpose("");
    setTime("");
    setLocation("");
    setContent("");
    setMaxAttendees("");
    // Reset avatar
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview); // Thu hồi blob URL cũ
    }
    setAvatarPreview(null);
    setAvatarFile(null);
    if(avatarInputRef.current) avatarInputRef.current.value = ""; // Reset input file
    // Reset lỗi và danh sách cũ
    setError(null);
    setExistingOrganizers([]);
    setExistingParticipants([]);
    // Gọi hàm onClose từ props
    onClose();
  };

  // Nếu modal không mở, không render gì cả
  if (!isOpen) return null;

  // --- JSX Rendering ---
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity duration-300 ease-in-out animate-fade-in"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fade-in-scale">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="modal-title" className="text-lg font-semibold text-gray-800">
            Chỉnh sửa sự kiện: {eventToUpdate?.name || '...'}
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

        {/* Modal Body (Form) */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-grow overflow-hidden" // Cho phép form co giãn và có scroll nếu cần
        >
          {/* Scrollable Content Area */}
          <div className="p-5 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {/* Error Message */}
            {error && (
              <div
                className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm"
                role="alert"
              >
                <p className="font-medium">Có lỗi xảy ra:</p>
                <p>{error}</p>
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {/* Event Name */}
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

                {/* Event Time */}
                <div>
                <label
                    htmlFor="eventTimeUpdate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    Thời gian <span className="text-red-500">*</span>
                </label>
                <input
                    type="datetime-local" // Input chuẩn cho ngày và giờ
                    id="eventTimeUpdate"
                    value={time} // Giá trị dạng 'YYYY-MM-DDTHH:mm'
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-50"
                    disabled={isSubmitting}
                    aria-required="true"
                />
                </div>

                 {/* Event Location */}
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

                 {/* Max Attendees */}
                <div>
                    <label
                        htmlFor="eventMaxAttendeesUpdate"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Số người tham dự tối đa
                    </label>
                    <input
                        type="number"
                        id="eventMaxAttendeesUpdate"
                        value={maxAttendees} // Giá trị là string từ state
                        onChange={(e) => setMaxAttendees(e.target.value)}
                        min="0" // Ngăn nhập số âm trực tiếp
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-50 appearance-textfield [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" // Hide number arrows
                        disabled={isSubmitting}
                        placeholder="Để trống = không giới hạn"
                    />
                </div>

                 {/* Event Purpose */}
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

                {/* Event Content */}
                <div className="md:col-span-2">
                    <label
                        htmlFor="eventContentUpdate"
                        className="block text-sm font-medium text-gray-700 mb-1"
                    >
                        Nội dung chi tiết <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="eventContentUpdate"
                        rows={5} // Tăng số dòng nếu cần
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm resize-y disabled:bg-gray-50"
                        disabled={isSubmitting}
                        aria-required="true"
                        placeholder="Nhập nội dung chi tiết cho sự kiện..."
                    />
                </div>

                {/* Avatar Upload */}
                <div className="md:col-span-2">
                    <label htmlFor="eventAvatarUpdate" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Ảnh đại diện (Avatar)
                    </label>
                    <div className="flex items-center gap-4 mb-3">
                        {/* Input File Button */}
                        <label className="flex-grow cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 transition duration-150 ease-in-out">
                            <span className="truncate">{avatarFile ? avatarFile.name : "Chọn ảnh mới (tối đa 5MB)"}</span>
                            <input
                                id="eventAvatarUpdate"
                                name="eventAvatarUpdate"
                                type="file"
                                className="sr-only" // Ẩn input gốc
                                accept="image/png, image/jpeg, image/gif, image/webp" // Chỉ chấp nhận file ảnh
                                onChange={handleAvatarChange}
                                ref={avatarInputRef} // Ref để reset
                                disabled={isSubmitting}
                            />
                        </label>
                        {/* Clear Button (hiển thị khi có ảnh mới được chọn) */}
                        {avatarPreview && avatarFile && ( // Chỉ hiển thị khi có file MỚI được chọn
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
                    {/* Avatar Preview */}
                    {avatarPreview && (
                        <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 w-32 h-32 overflow-hidden flex items-center justify-center">
                            <Image
                                src={avatarPreview} // Hiển thị ảnh gốc hoặc ảnh mới đã chọn
                                alt="Xem trước avatar"
                                width={128} // Đặt kích thước cố định
                                height={128}
                                style={{ // Đảm bảo ảnh không bị méo
                                    display: 'block',
                                    objectFit: 'contain', // Thu nhỏ ảnh để vừa khung, giữ tỷ lệ
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    width: 'auto',
                                    height: 'auto',
                                }}
                                onError={(e) => { // Xử lý nếu ảnh preview bị lỗi
                                    console.error("Lỗi tải ảnh preview:", e);
                                    // Quay về ảnh gốc nếu preview lỗi
                                    setAvatarPreview(eventToUpdate?.avatarUrl || null);
                                }}
                            />
                        </div>
                    )}
                </div>


              {/* BTC Section */}
              <div className="md:col-span-2">
                <BTCSection
                  ref={btcSectionRef}
                  existingOrganizers={existingOrganizers}
                  detailedUsers={detailedUsers}
                  loadingUsers={loadingUsers}
                  fetchUsersError={fetchUsersError}
                />
              </div>

              {/* Participant Section */}
              <div className="md:col-span-2">
                <ParticipantSection
                  ref={participantSectionRef}
                  existingParticipants={existingParticipants}
                  detailedUsers={detailedUsers}
                  loadingUsers={loadingUsers}
                  fetchUsersError={fetchUsersError}
                />
              </div>

            </div> {/* End Grid */}
          </div> {/* End Scrollable Area */}

          {/* Modal Footer */}
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
                loadingUsers || // Disable nếu đang load users
                !!fetchUsersError || // Disable nếu có lỗi load users
                !currentUserId // Disable nếu không có user ID hiện tại
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
       {/* CSS cho animation */}
       <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
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
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-fade-in-scale {
          animation: fadeInScale 0.3s ease-out forwards;
        }
        /* Hide arrows on number inputs */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield; /* Firefox */
        }
      `}</style>
    </div>
  );
};

export default UpdateEventModal;