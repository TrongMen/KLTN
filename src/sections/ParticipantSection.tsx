// File: ParticipantSection.tsx
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { toast } from "react-hot-toast";

// --- Types ---
// Cập nhật ApiUser để bao gồm position và organizerRole (nullable)
type ApiUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  position?: { id: string; name: string } | null;
  organizerRole?: { id: string; name: string } | null;
};

type ApiRole = { id: string; name: string }; // Dùng cho danh sách role có thể chọn

type ParticipantData = { userId: string; roleId: string; positionId: string };

type ParticipantSectionProps = {
  allUsers: ApiUser[]; // Phải chứa đủ thông tin position và organizerRole
  existingParticipants: ParticipantData[];
};

export type ParticipantSectionHandle = {
  getMembersData: () => ParticipantData[];
  resetForms: () => void;
};

// Cập nhật ParticipantFormRow
type ParticipantFormRow = {
  id: number;
  userId: string;
  positionId: string; // Lấy từ user đã chọn
  positionName: string; // Lấy từ user đã chọn (để hiển thị)
  roleId: string; // Lấy từ user hoặc từ select
  roleName: string; // Lấy từ user (để hiển thị nếu có)
  canSelectRole: boolean; // True nếu user không có role và cần chọn
};
// --- Hết Types ---

// --- START: Hàm Helper ---
const getUserDisplay = (user: ApiUser | null | undefined): string => {
  if (!user) return "";
  const fullName = `${user.lastName || ""} ${user.firstName || ""}`.trim();
  // Ưu tiên họ tên, sau đó đến username
  return fullName || user.username || "";
};

type SearchableUserDropdownProps = {
  users: ApiUser[]; // Danh sách user đã được lọc
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
  const [filteredUsers, setFilteredUsers] = useState<ApiUser[]>([]);
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

    // Hiển thị tất cả user hợp lệ khi input trống và focus/click
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
        setSearchTerm(getUserDisplay(selectedUser)); // Khôi phục tên nếu click ra ngoài
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
    // Hiển thị tất cả user khi click vào input trống
    if (!searchTerm) {
      setFilteredUsers(users);
    }
  };
  const handleUserSelect = (user: ApiUser) => {
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
        className="border border-gray-300 rounded px-2 py-1 w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
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
                  {" "}
                  {getUserDisplay(user)}{" "}
                  {isDisabled && (
                    <span className="text-xs text-gray-400 ml-1">
                      (Đã thêm)
                    </span>
                  )}{" "}
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

export const ParticipantSection = forwardRef<
  ParticipantSectionHandle,
  ParticipantSectionProps
>(({ allUsers, existingParticipants }, ref) => {
  const [participantForms, setParticipantForms] = useState<
    ParticipantFormRow[]
  >([]);
  const [roles, setRoles] = useState<ApiRole[]>([]); // Danh sách role để chọn
  // Bỏ state positions vì lấy từ user
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tính toán ID user đã tồn tại
  const existingParticipantIds = useMemo(
    () => new Set(existingParticipants?.map((p) => p.userId) ?? []),
    [existingParticipants]
  );


  const usersForDropdown = useMemo(() => {
    return allUsers.filter((user) => user.position != null);
  }, [allUsers]);

  // Fetch chỉ danh sách Roles
  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Token không tồn tại.");
        const headers = { Authorization: `Bearer ${token}` };
        // *** Chỉ fetch roles ***
        const rRes = await fetch(
          "http://localhost:8080/identity/api/organizerrole",
          { headers }
        ); 
        if (!rRes.ok) throw new Error(`Lỗi tải vai trò`);
        const rData = await rRes.json();
        // Kiểm tra cấu trúc trả về của API roles
        if (rData?.code !== 1000) {
          throw new Error(
            `API Roles trả về lỗi: ${rData?.message || "Unknown API error"}`
          );
        }
        setRoles(rData?.result || []);
      } catch (err: any) {
        const msg = `Lỗi tải lựa chọn NTD: ${err.message}`;
        setError(msg);
        toast.error(msg);
        console.error("Fetch error ParticipantSection:", err);
      } finally {
        setLoading(false);
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
        positionName: "", // Khởi tạo rỗng
        roleId: "",
        roleName: "", // Khởi tạo rỗng
        canSelectRole: false, // Khởi tạo là false
      },
    ]);

  const removeParticipantFormRow = (id: number) =>
    setParticipantForms((prev) => prev.filter((f) => f.id !== id));

  // Cập nhật handleParticipantChange
  const handleParticipantChange = (
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
            // Tìm user được chọn trong danh sách gốc (chứa đủ thông tin)
            const selectedUser = allUsers.find((u) => u.id === value);
            const positionId = selectedUser?.position?.id ?? "";
            const positionName = selectedUser?.position?.name ?? "—"; // Mặc định nếu không có

            let roleId = "";
            let roleName = "";
            let canSelectRole = false;

            if (selectedUser?.organizerRole) {
              // User đã có role -> hiển thị role đó
              roleId = selectedUser.organizerRole.id;
              roleName = selectedUser.organizerRole.name;
              canSelectRole = false;
            } else if (selectedUser) {
              // User chưa có role -> cho phép chọn
              roleId = ""; // Reset roleId khi user thay đổi và cần chọn lại
              roleName = ""; // Reset
              canSelectRole = true;
            } else {
              // Không chọn user nào cả
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
            // Chỉ cho phép thay đổi roleId nếu được phép chọn (canSelectRole = true)
            return { ...form, roleId: value };
          }
        }
        return form;
      })
    );
  };

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
              form.userId && form.roleId && !existingIds.has(form.userId)
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
          }
        });
        return Array.from(uniqueNewMembersMap.values());
      },
      resetForms: () => {
        setParticipantForms([]);
      },
    }),
    [participantForms, existingParticipants]
  ); 

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-md font-semibold mb-1 text-gray-600">
        Thêm Người tham dự
      </h3>
      {loading && (
        <p className="text-sm text-gray-500">Đang tải danh sách vai trò...</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</p>
      )}
      <button
        type="button"
        onClick={addParticipantFormRow}
        className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
        title="Thêm dòng nhập NTD"
        disabled={loading || !!error}
      >
        +
      </button>
      <div className="space-y-2">
        {participantForms.map((form) => (
          <div
            key={form.id}
            className="flex flex-col sm:flex-row gap-2 items-center p-2 border rounded bg-gray-50"
          >
            
            <div className="w-1/4 sm:flex-grow">
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

        
            <div className="w-full sm:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap">
              <span className="font-medium mr-1 ">Vị trí:</span>
              <span className="font-medium mr-1 " title={form.positionName || ""}>
                {form.positionName || "—"}{" "}
                
              </span>
            </div>

          
            <div className="w-full sm:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap">
              {" "}
           
              {form.userId ? (
                form.canSelectRole ? (
                  <select
                    value={form.roleId}
                    onChange={(e) =>
                      handleParticipantChange(form.id, "roleId", e.target.value)
                    }
                    className="w-full sm:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap" // Set height
                  >
                    <option value=""> Chọn vai trò </option>
                    {roles?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full sm:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap">
                    {" "}
                    
                    <span className="font-medium mr-1 ">
                      Vai trò:
                    </span>
                    <span className="font-medium mr-1 " title={form.roleName || ""}>
                      {form.roleName || "Không có"}{" "}
                      
                    </span>
                  </div>
                )
              ) : (
                // Placeholder khi chưa chọn user
                // <div className="w-full sm:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap">
                //   <span className="font-medium mr-1">Vai trò :</span>
                  <span className="font-medium mr-1">Vai trò :</span>
                  // </div>
              )}
            </div>

            {/* Nút xóa */}
            <button
              type="button"
              onClick={() => removeParticipantFormRow(form.id)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full sm:w-auto cursor-pointer text-sm flex-shrink-0 h-[30px]"
            >
              {" "}
              {/* Set height */}
              Xóa
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
ParticipantSection.displayName = "ParticipantSection";
