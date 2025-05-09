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

type ApiRole = { id: string; name: string; description?: string };
type ApiPosition = { id: string; name: string; description?: string };

type ApiUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email?: string;
};

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

export type OrganizerData = { userId: string; roleId: string; positionId: string };

type BTCSectionProps = {
  existingOrganizers: OrganizerData[];
  globallyBusyUserIds: Set<string>;
  onFormChange: () => void;
};

export type BTCSectionHandle = {
  getMembersData: () => OrganizerData[];
  resetForms: () => void;
  getFormUserIds: () => string[];
};

type OrganizerFormRow = {
  id: number;
  userId: string;
  positionId: string;
  positionName: string;
  roleId: string;
  roleName: string;
};

type SearchableUserDropdownProps = {
  users: ApiUserWithDetails[];
  selectedUserId: string | null;
  onChange: (userId: string) => void;
  placeholder?: string;
  disabledUserIds?: Set<string>;
};

const getUserDisplay = (
  user: ApiUserWithDetails | ApiUser | null | undefined
): string => {
  if (!user) return "";
  const fullName = `${user.lastName || ""} ${user.firstName || ""}`.trim();
  return fullName || (user.username ?? "");
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
    // Show all non-disabled users, or the selected user even if disabled
    const filterLogic = (user: ApiUserWithDetails) => {
        if (user.id === selectedUserId) return true; // Always show the selected user
        if (disabledUserIds.has(user.id)) return false; // Hide other disabled users
        if (!searchTerm) return true; // If no search term, show all non-disabled

        const lowerSearchTerm = searchTerm.toLowerCase();
        const fullName = `${user?.lastName ?? ""} ${user?.firstName ?? ""}`
          .trim()
          .toLowerCase();
        const username = (user?.username ?? "").toLowerCase();
        return (
          fullName.includes(lowerSearchTerm) ||
          username.includes(lowerSearchTerm)
        );
    };
    setFilteredUsers(users.filter(filterLogic));
  }, [searchTerm, users, disabledUserIds, selectedUserId]);


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
  };

  const handleUserSelect = (user: ApiUserWithDetails) => {
    if (disabledUserIds.has(user.id) && user.id !== selectedUserId) return;
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
              const isDisabled = disabledUserIds.has(user.id) && user.id !== selectedUserId;
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

export const BTCSection = forwardRef<BTCSectionHandle, BTCSectionProps>(
  ({ existingOrganizers, globallyBusyUserIds, onFormChange }, ref) => {
    const [organizerForms, setOrganizerForms] = useState<OrganizerFormRow[]>([]);
    const [detailedUsers, setDetailedUsers] = useState<ApiUserWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const existingOrganizerIds = useMemo(
      () => new Set(existingOrganizers?.map((o) => o.userId) ?? []),
      [existingOrganizers]
    );
    
    useEffect(() => {
        onFormChange();
    }, [organizerForms, onFormChange]);

    useEffect(() => {
      const fetchDetailedUsers = async () => {
        setLoading(true);
        setError(null);
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
            throw new Error(
              `Lỗi tải danh sách user chi tiết: ${
                errorData?.message || res.status
              }`
            );
          }
          const data = await res.json();
          if (data?.code !== 1000) {
            throw new Error(
              `API trả về lỗi: ${data?.message || "Unknown API error"}`
            );
          }
          setDetailedUsers(data?.result || []);
        } catch (err: any) {
          const msg = `Lỗi tải dữ liệu BTC: ${err.message}`;
          setError(msg);
          toast.error(msg);
          console.error("Fetch error BTCSection:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchDetailedUsers();
    }, []);

    const addOrganizerFormRow = () => {
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
    };

    const removeOrganizerFormRow = (id: number) => {
      setOrganizerForms((prev) => prev.filter((f) => f.id !== id));
    };

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
          const newMembers = organizerForms
            .filter((form) => 
                form.userId && 
                form.positionId && 
                form.roleId && 
                !existingOrganizerIds.has(form.userId) 
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
        getFormUserIds: () => organizerForms.map(form => form.userId).filter(Boolean),
      }),
      [organizerForms, existingOrganizerIds, detailedUsers]
    );

    return (
      <div className="mt-6 border-t pt-4">
        <h3 className="text-md font-semibold mb-1 text-gray-600">
          Thêm Ban tổ chức
        </h3>
        {loading && (
          <p className="text-sm text-gray-500">Đang tải danh sách user...</p>
        )}
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
              className="flex flex-col sm:flex-row gap-2 items-center p-2 border rounded bg-gray-50"
            >
              <div className="w-1/4 sm:flex-grow">
                <SearchableUserDropdown
                  users={detailedUsers}
                  selectedUserId={form.userId}
                  onChange={(userId) =>
                    handleOrganizerChange(form.id, "userId", userId)
                  }
                  disabledUserIds={globallyBusyUserIds}
                  placeholder="-- Tìm hoặc chọn user --"
                />
              </div>
              <div className="w-full sm:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap">
                <span className="font-medium mr-1">Vị trí:</span>{" "}
                {form.positionName || (form.userId ? "Không có" : "—")}
              </div>
              <div className="w-full sm:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap">
                <span className="font-medium mr-1">Vai trò :</span>{" "}
                {form.roleName || (form.userId ? "Không có" : "—")}
              </div>
              <button
                type="button"
                onClick={() => removeOrganizerFormRow(form.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full sm:w-auto cursor-pointer text-sm flex-shrink-0"
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