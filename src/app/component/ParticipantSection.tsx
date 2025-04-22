import { useState, useEffect } from "react";
import { toast } from "react-hot-toast"; // Sử dụng react-hot-toast giống parent

// --- Types ---
// Định nghĩa cấu trúc dữ liệu cho API responses (giống BTCSection)
type ApiRole = { id: string; name: string; description?: string };
type ApiPosition = { id: string; name: string; description?: string };
type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
};

// Định nghĩa cấu trúc dữ liệu gửi lên component cha
type ParticipantData = {
  userId: string;
  roleId: string;
  positionId: string;
};

// Định nghĩa props mà component nhận vào
type ParticipantSectionProps = {
  onAddParticipant: (participant: ParticipantData) => void; // Callback để thêm NTD vào state cha
  // Có thể truyền thêm initialParticipants nếu cần cho chế độ edit
};

// Định nghĩa cấu trúc state cho mỗi dòng form
type ParticipantFormRow = {
  id: number; // Unique ID for React key
  userId: string;
  positionId: string;
  roleId: string;
};

export default function ParticipantSection({ onAddParticipant }: ParticipantSectionProps) {
  // State cho các dòng form động
  const [participantForms, setParticipantForms] = useState<ParticipantFormRow[]>([]);

  // State cho dữ liệu từ API (giống BTCSection)
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);

  // State quản lý trạng thái tải và lỗi
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dữ liệu khi component được mount (giống BTCSection)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Không tìm thấy token xác thực.");
        }
        const headers = { Authorization: `Bearer ${token}` };

        const [positionsRes, rolesRes, usersRes] = await Promise.all([
          fetch("http://localhost:8080/identity/api/positions", { headers }),
          fetch("http://localhost:8080/identity/api/organizerrole", { headers }), // API endpoint có thể giống hoặc khác cho participant roles? Giả sử giống.
          fetch("http://localhost:8080/identity/users", { headers }),
        ]);

        if (!positionsRes.ok) throw new Error(`Lỗi tải vị trí: ${positionsRes.statusText}`);
        if (!rolesRes.ok) throw new Error(`Lỗi tải vai trò: ${rolesRes.statusText}`);
        if (!usersRes.ok) throw new Error(`Lỗi tải người dùng: ${usersRes.statusText}`);

        const positionsData = await positionsRes.json();
        const rolesData = await rolesRes.json();
        const usersData = await usersRes.json();

        setPositions(positionsData?.result || []);
        setRoles(rolesData?.result || []); // Đảm bảo API trả về vai trò phù hợp cho người tham dự
        setUsers(usersData?.result || []);

      } catch (err: any) {
        const errorMessage = `Không thể tải dữ liệu cho người tham dự: ${err.message}`;
        setError(errorMessage);
        toast.error(errorMessage);
        console.error("Fetch error in ParticipantSection:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Hàm thêm một dòng form trống mới
  const addParticipantFormRow = () => {
    setParticipantForms((prev) => [
      ...prev,
      {
        id: Date.now(),
        userId: "",
        positionId: "",
        roleId: "",
      },
    ]);
  };

  // Hàm xóa một dòng form dựa vào ID của nó
  const removeParticipantFormRow = (idToRemove: number) => {
    setParticipantForms((prev) => prev.filter((form) => form.id !== idToRemove));
  };

  // Hàm xử lý thay đổi giá trị trong các dropdown của một dòng form cụ thể
  const handleParticipantChange = (
    idToUpdate: number,
    field: keyof Omit<ParticipantFormRow, 'id'>,
    value: string
  ) => {
    setParticipantForms((prev) =>
      prev.map((form) =>
        form.id === idToUpdate ? { ...form, [field]: value } : form
      )
    );
  };

  // Hàm xử lý khi nhấn nút "Thêm NTD" trên một dòng
  const handleAddParticipantClick = (formRow: ParticipantFormRow) => {
    if (!formRow.userId || !formRow.positionId || !formRow.roleId) {
      toast.error("Vui lòng chọn Người dùng, Vị trí và Vai trò.");
      return;
    }

    
    onAddParticipant({
      userId: formRow.userId,
      positionId: formRow.positionId,
      roleId: formRow.roleId,
    });

    toast.success("Đã thêm Người tham dự vào danh sách.");

   
    removeParticipantFormRow(formRow.id);
  };

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-md font-semibold mb-1">Người tham dự</h3> {/* Đổi tiêu đề */}

      {loading && <p className="text-gray-500">Đang tải dữ liệu...</p>}
      {error && <p className="text-red-600 bg-red-100 p-2 rounded">{error}</p>}

      <button
        type="button"
        onClick={addParticipantFormRow}
        className="mt-4 mb-2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl hover:bg-blue-700 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
        title="Thêm Người tham dự" // Đổi title
        disabled={loading || !!error}
      >
        +
      </button>

      <div className="space-y-3 ">
        {participantForms.map((form) => (
          <div
            key={form.id}
            className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-2 border rounded bg-gray-50"
          >
            {/* Select User */}
            <select
              value={form.userId}
              onChange={(e) => handleParticipantChange(form.id, "userId", e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 cursor-pointer w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Chọn người dùng --</option>
              {users.map((user) => {
                 const fullName = `${user.lastName || ""} ${user.firstName || ""}`.trim();
                 const displayName = fullName || user.username || "Không rõ";
                return (
                  <option key={user.id} value={user.id}>
                    {displayName} ({user.username})
                  </option>
                );
              })}
            </select>

            {/* Select Position */}
            <select
              value={form.positionId}
              onChange={(e) => handleParticipantChange(form.id, "positionId", e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 cursor-pointer w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Chọn vị trí --</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>

            {/* Select Role - Đảm bảo API trả về vai trò phù hợp cho người tham dự */}
            <select
              value={form.roleId}
              onChange={(e) => handleParticipantChange(form.id, "roleId", e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 cursor-pointer w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">-- Chọn vai trò --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            
            <button
              type="button"
              onClick={() => removeParticipantFormRow(form.id)}
               className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full md:w-auto cursor-pointer text-sm"
            >
              Xóa
            </button>

            
            <button
              type="button"
              onClick={() => handleAddParticipantClick(form)}
              className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 w-full md:w-auto cursor-pointer text-sm"
            >
              Thêm NTD 
            </button>
         
          </div>
        ))}
      </div>
    </div>
  );
}