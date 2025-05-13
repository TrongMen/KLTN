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
    const filterLogic = (user: ApiUserWithDetails) => {
      if (user.id === selectedUserId) return true;
      if (disabledUserIds.has(user.id)) return false;
      if (!searchTerm) return true;

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
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [errorUsers, setErrorUsers] = useState<string | null>(null);

    const [availableOrganizerRoles, setAvailableOrganizerRoles] = useState<ApiRole[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(true);
    const [errorRoles, setErrorRoles] = useState<string | null>(null);

    useEffect(() => {
      onFormChange();
    }, [organizerForms, onFormChange]);

    useEffect(() => {
      const fetchDetailedUsers = async () => {
        setLoadingUsers(true);
        setErrorUsers(null);
        try {
          const token = localStorage.getItem("authToken");
          if (!token) throw new Error("Token không tồn tại.");
          const headers = { Authorization: `Bearer ${token}` };
          const res = await fetch(
            "${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/with-position-and-role",
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
          const msg = `Lỗi tải dữ liệu User cho BTC: ${err.message}`;
          setErrorUsers(msg);
          toast.error(msg);
          console.error("Fetch error BTCSection (Users):", err);
        } finally {
          setLoadingUsers(false);
        }
      };
      fetchDetailedUsers();
    }, []);

    useEffect(() => {
      const fetchOrganizerRolesList = async () => {
        setLoadingRoles(true);
        setErrorRoles(null);
        try {
          const token = localStorage.getItem("authToken");
          if (!token) throw new Error("Token không tồn tại.");
          const headers = { Authorization: `Bearer ${token}` };
          const rRes = await fetch(
            "${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/organizerrole",
            { headers }
          );
          if (!rRes.ok) throw new Error(`Lỗi tải Vai trò tổ chức (${rRes.status})`);
          const rData = await rRes.json();
          if (rData?.code !== 1000) {
            throw new Error(
              `API Roles trả về lỗi: ${rData?.message || "Unknown API error"}`
            );
          }
          setAvailableOrganizerRoles(rData?.result || []);
        } catch (err: any) {
          const msg = `Lỗi tải danh sách Vai trò tổ chức: ${err.message}`;
          setErrorRoles(msg);
          toast.error(msg);
          console.error("Fetch error BTCSection (Organizer Roles):", err);
        } finally {
          setLoadingRoles(false);
        }
      };
      fetchOrganizerRolesList();
    }, []);

    useEffect(() => {
      if (loadingUsers || loadingRoles) return;

      if (existingOrganizers && existingOrganizers.length > 0) {
        const formsToSet = existingOrganizers.map((org, index) => {
          const userDetail = detailedUsers.find(u => u.id === org.userId);
          const positionNameFromProfile = userDetail?.position?.name || "—";
          const roleNameFromList = availableOrganizerRoles.find(r => r.id === org.roleId)?.name || "—";

          return {
            id: Date.now() + index + Math.random(),
            userId: org.userId,
            positionId: org.positionId,
            positionName: positionNameFromProfile,
            roleId: org.roleId,
            roleName: roleNameFromList,
          };
        });
        setOrganizerForms(formsToSet);
      } else if (!existingOrganizers || existingOrganizers.length === 0) {
        setOrganizerForms([]);
      }
    }, [existingOrganizers, detailedUsers, availableOrganizerRoles, loadingUsers, loadingRoles]);


    const addOrganizerFormRow = () => {
      setOrganizerForms((prev) => [
        ...prev,
        {
          id: Date.now(),
          userId: "",
          positionId: "",
          positionName: "—",
          roleId: "",
          roleName: "—",
        },
      ]);
    };

    const removeOrganizerFormRow = (id: number) => {
      setOrganizerForms((prev) => prev.filter((f) => f.id !== id));
    };

    const handleOrganizerChange = useCallback(
      (
        id: number,
        field: "userId" | "roleId",
        value: string
      ) => {
        setOrganizerForms((prev) =>
          prev.map((form) => {
            if (form.id === id) {
              if (field === "userId") {
                const selectedDetailedUser = detailedUsers.find(
                  (u) => u.id === value
                );
                const positionId = selectedDetailedUser?.position?.id ?? "";
                const positionName = selectedDetailedUser?.position?.name ?? "—";

                return {
                  ...form,
                  userId: value,
                  positionId,
                  positionName,
                  roleId: "",
                  roleName: "—",
                };
              } else if (field === "roleId") {
                const selectedRole = availableOrganizerRoles.find(r => r.id === value);
                return {
                  ...form,
                  roleId: value,
                  roleName: selectedRole?.name || "—"
                };
              }
            }
            return form;
          })
        );
      },
      [detailedUsers, availableOrganizerRoles]
    );

    useImperativeHandle(
      ref,
      () => ({
        getMembersData: () => {
          const members = organizerForms
            .filter((form) =>
                form.userId &&
                form.positionId &&
                form.roleId
            )
            .map((form) => ({
              userId: form.userId,
              positionId: form.positionId,
              roleId: form.roleId,
            }));
          const uniqueMembersMap = new Map<string, OrganizerData>();
          members.forEach((member) => {
            if (!uniqueMembersMap.has(member.userId)) {
              uniqueMembersMap.set(member.userId, member);
            }
          });
          return Array.from(uniqueMembersMap.values());
        },
        resetForms: () => {
          setOrganizerForms([]);
        },
        getFormUserIds: () => organizerForms.map(form => form.userId).filter(Boolean),
      }),
      [organizerForms]
    );

    return (
      <div className="mt-6 border-t pt-4">
        <h3 className="text-md font-semibold mb-1 text-gray-600">
          Thêm Ban tổ chức
        </h3>
        {loadingUsers && (
          <p className="text-sm text-gray-500">Đang tải danh sách user...</p>
        )}
        {errorUsers && (
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{errorUsers}</p>
        )}
        {loadingRoles && !errorUsers && (
          <p className="text-sm text-gray-500 mt-1">Đang tải danh sách vai trò BTC...</p>
        )}
        {errorRoles && (
          <p className="text-sm text-red-600 bg-red-100 p-2 rounded mt-1">{errorRoles}</p>
        )}
        <button
          type="button"
          onClick={addOrganizerFormRow}
          className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          title="Thêm dòng nhập BTC"
          disabled={loadingUsers || !!errorUsers || loadingRoles || !!errorRoles}
        >
          +
        </button>
        <div className="space-y-2">
          {organizerForms.map((form) => (
            <div
              key={form.id}
              className="flex flex-col sm:flex-row gap-2 items-center p-2 border rounded bg-gray-50"
            >
              <div className="w-full sm:w-1/3 md:flex-grow">
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
              <div className="w-full sm:w-1/4 md:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap">
                <span className="font-medium mr-1">Vị trí:</span>{" "}
                <span className="truncate" title={form.positionName || ""}>
                  {form.positionName || (form.userId ? "Không có" : "—")}
                </span>
              </div>
              <div className="w-full sm:w-1/4 md:flex-1 min-h-[30px] flex items-center whitespace-nowrap">
                {form.userId && !loadingRoles && !errorRoles ? (
                  <select
                    value={form.roleId}
                    onChange={(e) =>
                      handleOrganizerChange(form.id, "roleId", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white h-[30px]"
                    disabled={!form.userId}
                  >
                    <option value="">-- Chọn vai trò BTC --</option>
                    {availableOrganizerRoles?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center">
                    <span className="font-medium mr-1">Vai trò BTC:</span>
                    {form.userId && loadingRoles && "Đang tải..."}
                    {form.userId && errorRoles && "Lỗi tải vai trò"}
                    {!form.userId && "—"}
                    {form.userId && !loadingRoles && !errorRoles && !form.roleId && form.roleName === "—" && "—"}
                    {form.userId && !loadingRoles && !errorRoles && form.roleId && form.roleName !== "—" && <span className="truncate" title={form.roleName}>{form.roleName}</span>}
                  </div>
                )}
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