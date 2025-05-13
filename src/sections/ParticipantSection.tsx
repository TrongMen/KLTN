"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
} from "react";
import { toast } from "react-hot-toast";
import type { ApiUser as MainApiUserType } from "../app/component/tabs/CreateEventTabContent";


type ApiUser = MainApiUserType & {
  position?: { id: string; name: string } | null;
  organizerRole?: { id: string; name: string } | null;
};


type ApiRole = { id: string; name: string };

export type ParticipantData = { userId: string; roleId: string; positionId: string };

type ParticipantSectionProps = {
  allUsers: MainApiUserType[];
  existingParticipants: ParticipantData[];
  globallyBusyUserIds: Set<string>;
  onFormChange: () => void;
};

export type ParticipantSectionHandle = {
  getMembersData: () => ParticipantData[];
  resetForms: () => void;
  getFormUserIds: () => string[];
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

const getUserDisplay = (user: ApiUser | MainApiUserType | null | undefined): string => {
  if (!user) return "";
  const fullName = `${user.lastName || ""} ${user.firstName || ""}`.trim();
  return fullName || user.username || "";
};

type SearchableUserDropdownProps = {
  users: ApiUser[];
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
    const filterLogic = (user: ApiUser) => {
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
  const handleUserSelect = (user: ApiUser) => {
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

export const ParticipantSection = forwardRef<
  ParticipantSectionHandle,
  ParticipantSectionProps
>(({ allUsers, existingParticipants, globallyBusyUserIds, onFormChange }, ref) => {
  const [participantForms, setParticipantForms] = useState<ParticipantFormRow[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);

  const usersForDropdown: ApiUser[] = useMemo(() => {
    return allUsers.filter(user => user.position != null) as ApiUser[];
  }, [allUsers]);

  useEffect(() => {
    onFormChange();
  }, [participantForms, onFormChange]);

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
        if (!rRes.ok) throw new Error(`Lỗi tải vai trò (${rRes.status})`);
        const rData = await rRes.json();
        if (rData?.code !== 1000) {
          throw new Error(
            `API Roles trả về lỗi: ${rData?.message || "Unknown API error"}`
          );
        }
        setRoles(rData?.result || []);
      } catch (err: any) {
        const msg = `Lỗi tải vai trò NTD: ${err.message}`;
        setErrorRoles(msg);
        toast.error(msg);
        console.error("Fetch error ParticipantSection (Roles):", err);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (loadingRoles || !allUsers || allUsers.length === 0) return;

    if (existingParticipants && existingParticipants.length > 0) {
      const formsToSet = existingParticipants.map((p, index) => {
        const userDetail = allUsers.find(u => u.id === p.userId) as ApiUser | undefined;
        const positionNameFromProfile = userDetail?.position?.name || "—";

        let effectiveRoleId = p.roleId || "";
        let effectiveRoleName = roles.find(r => r.id === effectiveRoleId)?.name || "—";
        let canSelect = true;

        if (userDetail?.organizerRole) {
          effectiveRoleId = userDetail.organizerRole.id;
          effectiveRoleName = userDetail.organizerRole.name;
          canSelect = false;
        } else if (!p.roleId && userDetail) {
          canSelect = true;
          effectiveRoleId = "";
          effectiveRoleName = "—";
        }

        return {
          id: Date.now() + index + Math.random(),
          userId: p.userId,
          positionId: p.positionId || userDetail?.position?.id || "",
          positionName: positionNameFromProfile,
          roleId: effectiveRoleId,
          roleName: effectiveRoleName,
          canSelectRole: canSelect,
        };
      });
      setParticipantForms(formsToSet);
    } else if (!existingParticipants || existingParticipants.length === 0) {
      setParticipantForms([]);
    }
  }, [existingParticipants, allUsers, roles, loadingRoles]);


  const addParticipantFormRow = () => {
    setParticipantForms((prev) => [
      ...prev,
      {
        id: Date.now(),
        userId: "",
        positionId: "",
        positionName: "—",
        roleId: "",
        roleName: "—",
        canSelectRole: false,
      },
    ]);
  }

  const removeParticipantFormRow = (id: number) => {
    setParticipantForms((prev) => prev.filter((f) => f.id !== id));
  }

  const handleParticipantChange = useCallback(
    (
      id: number,
      field: "userId" | "roleId",
      value: string
    ) => {
      setParticipantForms((prev) =>
        prev.map((form) => {
          if (form.id === id) {
            if (field === "userId") {
              const selectedUser = allUsers.find((u) => u.id === value) as ApiUser | undefined;
              const positionId = selectedUser?.position?.id ?? "";
              const positionName = selectedUser?.position?.name ?? "—";

              let roleId = "";
              let roleName = "—";
              let canSelectRole = false;

              if (selectedUser) {
                if (selectedUser.organizerRole) {
                  roleId = selectedUser.organizerRole.id;
                  roleName = selectedUser.organizerRole.name;
                  canSelectRole = false;
                } else {
                  roleId = "";
                  roleName = "—";
                  canSelectRole = true;
                }
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
              const selectedRole = roles.find(r => r.id === value);
              return { ...form, roleId: value, roleName: selectedRole?.name || "" };
            }
          }
          return form;
        })
      );
    },
    [allUsers, roles]
  );

  useImperativeHandle(
    ref,
    () => ({
      getMembersData: () => {
        const members = participantForms
          .filter(
            (form) =>
              form.userId &&
              form.roleId &&
              form.positionId
          )
          .map((form) => ({
            userId: form.userId,
            positionId: form.positionId,
            roleId: form.roleId,
          }));
        const uniqueMembersMap = new Map<string, ParticipantData>();
        members.forEach((member) => {
          if (!uniqueMembersMap.has(member.userId)) {
            uniqueMembersMap.set(member.userId, member);
          }
        });
        return Array.from(uniqueMembersMap.values());
      },
      resetForms: () => {
        setParticipantForms([]);
      },
      getFormUserIds: () => participantForms.map(form => form.userId).filter(Boolean),
    }),
    [participantForms]
  );

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-md font-semibold mb-1 text-gray-600">
        Thêm Người tham dự (Yêu cầu có Vị trí trong CLB)
      </h3>
      {loadingRoles && (
        <p className="text-sm text-gray-500">Đang tải danh sách vai trò...</p>
      )}
      {errorRoles && (
        <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{errorRoles}</p>
      )}
      <button
        type="button"
        onClick={addParticipantFormRow}
        className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
        title="Thêm dòng nhập NTD"
        disabled={loadingRoles || !!errorRoles || usersForDropdown.length === 0}
      >
        +
      </button>
      {usersForDropdown.length === 0 && !loadingRoles && !errorRoles && (
        <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">Không có người dùng nào có vị trí để thêm làm người tham dự.</p>
      )}
      <div className="space-y-2">
        {participantForms.map((form) => (
          <div
            key={form.id}
            className="flex flex-col sm:flex-row gap-2 items-center p-2 border rounded bg-gray-50"
          >
            <div className="w-full sm:w-1/3 md:flex-grow">
              <SearchableUserDropdown
                users={usersForDropdown}
                selectedUserId={form.userId}
                onChange={(userId) =>
                  handleParticipantChange(form.id, "userId", userId)
                }
                disabledUserIds={globallyBusyUserIds}
                placeholder="-- Tìm user (có vị trí) --"
              />
            </div>
            <div className="w-full sm:w-1/4 md:flex-1 border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center whitespace-nowrap">
              <span className="font-medium mr-1 ">Vị trí:</span>
              <span className="truncate" title={form.positionName || ""}>
                {form.positionName || "—"}
              </span>
            </div>
            <div className="w-full sm:w-1/4 md:flex-1 min-h-[30px] flex items-center whitespace-nowrap">
              {form.userId ? (
                form.canSelectRole ? (
                  <select
                    value={form.roleId}
                    onChange={(e) =>
                      handleParticipantChange(form.id, "roleId", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white h-[30px]"
                    disabled={!form.userId || loadingRoles || !!errorRoles}
                  >
                    <option value="">-- Chọn vai trò NTD --</option>
                    {roles?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center">
                    <span className="font-medium mr-1 ">Vai trò NTD:</span>
                    <span className="truncate" title={form.roleName || ""}>
                      {form.roleName || "Không có"}
                    </span>
                  </div>
                )
              ) : (
                <div className="w-full border border-gray-200 bg-gray-100 rounded px-2 py-1 text-sm text-gray-700 min-h-[30px] flex items-center">
                  <span className="font-medium mr-1">Vai trò NTD:</span> —
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
});
ParticipantSection.displayName = "ParticipantSection";