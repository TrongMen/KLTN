"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import { toast } from "react-hot-toast";

// --- Types ---
type ApiRole = { id: string; name: string; description?: string };
type ApiPosition = { id: string; name: string; description?: string };
type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
};
type OrganizerData = { userId: string; roleId: string; positionId: string };

type BTCSectionProps = {
  allUsers: ApiUser[];

  existingOrganizers: OrganizerData[];
};

// Handle type
export type BTCSectionHandle = {
  getMembersData: () => OrganizerData[];
  resetForms: () => void;
};

type OrganizerFormRow = {
  id: number;
  userId: string;
  positionId: string;
  roleId: string;
};

type SearchableUserDropdownProps = {
  users: ApiUser[];
  selectedUserId: string | null;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabledUserIds?: Set<string>;
};

const getUserDisplay = (user: ApiUser | null | undefined): string => {
  if (!user) return "";
  const fullName = `${user.lastName || ""} ${user.firstName || ""}`.trim();
  return fullName || user.username;
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

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
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
        onFocus={handleInputFocus}
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
              Không tìm thấy user.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export const BTCSection = forwardRef<BTCSectionHandle, BTCSectionProps>(
  ({ allUsers, existingOrganizers }, ref) => {
    const [organizerForms, setOrganizerForms] = useState<OrganizerFormRow[]>(
      []
    );
    const [roles, setRoles] = useState<ApiRole[]>([]);
    const [positions, setPositions] = useState<ApiPosition[]>([]);

    // const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // *** Tính toán ID đã tồn tại từ props ***
    const existingOrganizerIds = useMemo(
      () => new Set(existingOrganizers?.map((o) => o.userId) ?? []),
      [existingOrganizers]
    );

    useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const token = localStorage.getItem("authToken");
          if (!token) throw new Error("Token không tồn tại.");
          const headers = { Authorization: `Bearer ${token}` };
         
          const [pRes, rRes] = await Promise.all([
            fetch("http://localhost:8080/identity/api/positions", { headers }),
            fetch("http://localhost:8080/identity/api/organizerrole", {
              headers,
            }),
          ]);
          if (!pRes.ok) throw new Error(`Lỗi tải vị trí`);
          if (!rRes.ok) throw new Error(`Lỗi tải vai trò`);
          const pData = await pRes.json();
          const rData = await rRes.json();
          setPositions(pData?.result || []);
          setRoles(rData?.result || []);
          // *** Không setUsers ở đây nữa ***
        } catch (err: any) {
          const msg = `Lỗi tải lựa chọn BTC: ${err.message}`;
          setError(msg);
          toast.error(msg);
          console.error("Fetch error BTCSection:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, []); 

    const addOrganizerFormRow = () =>
      setOrganizerForms((prev) => [
        ...prev,
        { id: Date.now(), userId: "", positionId: "", roleId: "" },
      ]);
    const removeOrganizerFormRow = (id: number) =>
      setOrganizerForms((prev) => prev.filter((f) => f.id !== id));
    const handleOrganizerChange = (
      id: number,
      field: keyof Omit<OrganizerFormRow, "id">,
      value: string
    ) =>
      setOrganizerForms((prev) =>
        prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
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
                form.positionId &&
                form.roleId &&
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
            }
          });
          return Array.from(uniqueNewMembersMap.values());
        },
        resetForms: () => {
          setOrganizerForms([]);
        },
      }),
      [organizerForms, existingOrganizers]
    ); // Thêm existingOrganizers vào dependency

    return (
      <div className="mt-6 border-t pt-4">
        <h3 className="text-md font-semibold mb-1 text-gray-600">
          Thêm Ban tổ chức
        </h3>
        {loading && <p className="text-sm text-gray-500">Đang tải...</p>}{" "}
        {error && (
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</p>
        )}
        <button
          type="button"
          onClick={addOrganizerFormRow}
          className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Thêm dòng nhập BTC"
          disabled={loading || !!error}
        >
          +
        </button>
        <div className="space-y-2">
          {organizerForms.map((form) => (
            <div
              key={form.id}
              className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2 border rounded bg-gray-50"
            >
              
              <SearchableUserDropdown
                users={allUsers} 
                selectedUserId={form.userId}
                onChange={(userId) =>
                  handleOrganizerChange(form.id, "userId", userId)
                }
                disabledUserIds={existingOrganizerIds} 
                placeholder="-- Tìm hoặc chọn user --"
              />
              <select
                value={form.positionId}
                onChange={(e) =>
                  handleOrganizerChange(form.id, "positionId", e.target.value)
                }
                className="border border-gray-300 rounded px-2 py-1 cursor-pointer w-full focus:ring-1 focus:ring-blue-500 text-sm"
              >
                {" "}
                <option value="">-- Chọn vị trí --</option>{" "}
                {positions?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}{" "}
              </select>
              <select
                value={form.roleId}
                onChange={(e) =>
                  handleOrganizerChange(form.id, "roleId", e.target.value)
                }
                className="border border-gray-300 rounded px-2 py-1 cursor-pointer w-full focus:ring-1 focus:ring-blue-500 text-sm"
              >
                {" "}
                <option value="">-- Chọn vai trò --</option>{" "}
                {roles?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}{" "}
              </select>
              <button
                type="button"
                onClick={() => removeOrganizerFormRow(form.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full sm:w-auto cursor-pointer text-sm"
              >
                Hủy Dòng
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
BTCSection.displayName = "BTCSection";

