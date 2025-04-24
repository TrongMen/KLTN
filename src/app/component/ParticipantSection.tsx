// File: ParticipantSection.tsx
"use client";

import React, {
  useState,
  useEffect,
  useMemo, // Thêm useMemo
  // useCallback, // Bỏ nếu không dùng trong file này
  forwardRef,
  useImperativeHandle,
  useRef, // Thêm useRef
} from "react";
import { toast } from "react-hot-toast";

// --- Types ---
type ApiRole = { id: string; name: string; }; // Đơn giản hóa nếu không cần description
type ApiPosition = { id: string; name: string; }; // Đơn giản hóa
type ApiUser = { id: string; firstName: string; lastName: string; username: string; }; // Bỏ email nếu không dùng
type ParticipantData = { userId: string; roleId: string; positionId: string }; // Dữ liệu trả về từ getMembersData

type ParticipantSectionProps = {
  allUsers: ApiUser[];
  existingParticipants: ParticipantData[]; // *** THÊM LẠI: Cần để disable dropdown ***
};

// Handle type
export type ParticipantSectionHandle = {
  getMembersData: () => ParticipantData[];
  resetForms: () => void;
};

type ParticipantFormRow = { id: number; userId: string; positionId: string; roleId: string; };
// --- Hết Types ---

// --- START: Hàm Helper ---
const getUserDisplay = (user: ApiUser | null | undefined): string => {
    if (!user) return "";
    const fullName = `${user.lastName || ""} ${user.firstName || ""}`.trim();
    return fullName || user.username;
};
// --- END: Hàm Helper ---

// --- START: Định nghĩa SearchableUserDropdown component (Nội bộ) ---
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<ApiUser[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cập nhật hiển thị input khi user ID được chọn thay đổi
  useEffect(() => {
    const selectedUser = users?.find(u => u.id === selectedUserId);
    setSearchTerm(getUserDisplay(selectedUser));
  }, [selectedUserId, users]);

  // Lọc users dựa trên searchTerm
  useEffect(() => {
    if (!users) { setFilteredUsers([]); return; }
    if (!searchTerm) { setFilteredUsers(users); return; }
    const lowerSearchTerm = searchTerm.toLowerCase();
    setFilteredUsers(
      users.filter(user => {
        const fullName = (`${user?.lastName ?? ""} ${user?.firstName ?? ""}`).trim().toLowerCase();
        const username = (user?.username ?? "").toLowerCase();
        return fullName.includes(lowerSearchTerm) || username.includes(lowerSearchTerm);
      })
    );
  }, [searchTerm, users]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        const selectedUser = users?.find(u => u.id === selectedUserId);
        setSearchTerm(getUserDisplay(selectedUser));
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef, selectedUserId, users]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); };
  const handleInputFocus = () => { setIsDropdownOpen(true); };
  const handleUserSelect = (user: ApiUser) => {
    if (disabledUserIds.has(user.id)) return;
    onChange(user.id); setSearchTerm(getUserDisplay(user)); setIsDropdownOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input type="text" value={searchTerm} onChange={handleInputChange} onFocus={handleInputFocus} placeholder={placeholder} className="border border-gray-300 rounded px-2 py-1 w-full focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm" autoComplete="off"/>
      {isDropdownOpen && (
        <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg text-sm">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const isDisabled = disabledUserIds.has(user.id);
              return ( <li key={user.id} onClick={() => !isDisabled && handleUserSelect(user)} className={`px-3 py-2 hover:bg-blue-100 ${isDisabled ? 'text-gray-400 bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}`} > {getUserDisplay(user)} {isDisabled && <span className="text-xs text-gray-400 ml-1">(Đã thêm)</span>} </li> );
            })
          ) : ( <li className="px-3 py-2 text-gray-500 italic">Không tìm thấy.</li> )}
        </ul>
      )}
    </div>
  );
}
// --- END: Định nghĩa SearchableUserDropdown ---


// --- START: Component ParticipantSection ---
// *** Thêm export const và nhận existingParticipants ***
export const ParticipantSection = forwardRef<ParticipantSectionHandle, ParticipantSectionProps>(
  ({ allUsers, existingParticipants }, ref) => {
    const [participantForms, setParticipantForms] = useState<ParticipantFormRow[]>([]);
    const [roles, setRoles] = useState<ApiRole[]>([]);
    const [positions, setPositions] = useState<ApiPosition[]>([]);
    // *** Bỏ state users nội bộ ***
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // *** Tính toán ID đã tồn tại từ props ***
    const existingParticipantIds = useMemo(() => new Set(existingParticipants?.map(p => p.userId) ?? []), [existingParticipants]);

    useEffect(() => {
      const fetchData = async () => {
        setLoading(true); setError(null);
        try {
          const token = localStorage.getItem("authToken"); if (!token) throw new Error("Token không tồn tại."); const headers = { Authorization: `Bearer ${token}` };
          // *** Chỉ fetch positions và roles (kiểm tra lại endpoint role nếu khác) ***
          const [pRes, rRes] = await Promise.all([ fetch("http://localhost:8080/identity/api/positions", { headers }), fetch("http://localhost:8080/identity/api/organizerrole", { headers }) /* <-- Kiểm tra endpoint này */ ]);
          if (!pRes.ok) throw new Error(`Lỗi tải vị trí`); if (!rRes.ok) throw new Error(`Lỗi tải vai trò`);
          const pData = await pRes.json(); const rData = await rRes.json();
          setPositions(pData?.result || []); setRoles(rData?.result || []);
        } catch (err: any) { const msg = `Lỗi tải lựa chọn NTD: ${err.message}`; setError(msg); toast.error(msg); console.error("Fetch error ParticipantSection:", err);
        } finally { setLoading(false); }
      }; fetchData();
    }, []);

    const addParticipantFormRow = () => setParticipantForms((prev) => [...prev, { id: Date.now(), userId: "", positionId: "", roleId: "" }]);
    const removeParticipantFormRow = (id: number) => setParticipantForms((prev) => prev.filter((f) => f.id !== id));
    const handleParticipantChange = ( id: number, field: keyof Omit<ParticipantFormRow, 'id'>, value: string ) => setParticipantForms((prev) => prev.map((f) => f.id === id ? { ...f, [field]: value } : f ));

    // Hàm getMembersData và resetForms giữ nguyên logic cũ
    useImperativeHandle(ref, () => ({
      getMembersData: () => {
          const existingIds = new Set(existingParticipants?.map(p => p.userId) ?? []);
          const newMembers = participantForms
              .filter(form => form.userId && form.positionId && form.roleId && !existingIds.has(form.userId))
              .map(form => ({ userId: form.userId, positionId: form.positionId, roleId: form.roleId }));
          const uniqueNewMembersMap = new Map<string, ParticipantData>();
          newMembers.forEach(member => { if (!uniqueNewMembersMap.has(member.userId)) { uniqueNewMembersMap.set(member.userId, member); } });
          return Array.from(uniqueNewMembersMap.values());
      },
      resetForms: () => { setParticipantForms([]); }
    }), [participantForms, existingParticipants]); // Thêm dependency

    return (
      <div className="mt-6 border-t pt-4">
        <h3 className="text-md font-semibold mb-1 text-gray-600">Thêm Người tham dự</h3>
        {loading && <p className="text-sm text-gray-500">Đang tải...</p>} {error && <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error}</p>}
        <button type="button" onClick={addParticipantFormRow} className="mt-1 mb-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xl hover:bg-blue-600 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed" title="Thêm dòng nhập NTD" disabled={loading || !!error}>+</button>
        <div className="space-y-2">
            {participantForms.map((form) => (
                <div key={form.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2 border rounded bg-gray-50">
                    {/* *** Sử dụng SearchableUserDropdown *** */}
                    <SearchableUserDropdown
                        users={allUsers}
                        selectedUserId={form.userId}
                        onChange={(userId) => handleParticipantChange(form.id, "userId", userId)}
                        disabledUserIds={existingParticipantIds} // Disable user đã có
                        placeholder="-- Tìm hoặc chọn user --"
                    />
                    <select value={form.positionId} onChange={(e) => handleParticipantChange(form.id, "positionId", e.target.value)} className="border border-gray-300 rounded px-2 py-1 cursor-pointer w-full focus:ring-1 focus:ring-blue-500 text-sm"> <option value="">-- Chọn vị trí --</option> {positions?.map((p) => ( <option key={p.id} value={p.id}>{p.name}</option> ))} </select>
                    <select value={form.roleId} onChange={(e) => handleParticipantChange(form.id, "roleId", e.target.value)} className="border border-gray-300 rounded px-2 py-1 cursor-pointer w-full focus:ring-1 focus:ring-blue-500 text-sm"> <option value="">-- Chọn vai trò --</option> {roles?.map((r) => ( <option key={r.id} value={r.id}>{r.name}</option> ))} </select>
                    <button type="button" onClick={() => removeParticipantFormRow(form.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full sm:w-auto cursor-pointer text-sm">Hủy Dòng</button>
                </div>
            ))}
        </div>
      </div>
    );
});
ParticipantSection.displayName = 'ParticipantSection';
// --- END: Component ParticipantSection ---

// *** Không export default, đảm bảo EventManagementPage dùng named import ***
// export default ParticipantSection;