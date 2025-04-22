import { useState, useEffect } from "react";
import { toast } from "react-hot-toast"; // Sử dụng react-hot-toast giống parent

// --- Types ---
// Định nghĩa cấu trúc dữ liệu cho API responses (điều chỉnh nếu cần)
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
type OrganizerData = {
  userId: string;
  roleId: string;
  positionId: string;
};

// Định nghĩa props mà component nhận vào
type BTCSectionProps = {
  onAddOrganizer: (organizer: OrganizerData) => void; // Callback để thêm BTC vào state cha
  // Có thể truyền thêm initialOrganizers nếu cần cho chế độ edit
};


type OrganizerFormRow = {
  id: number; // Unique ID for React key
  userId: string;
  positionId: string;
  roleId: string;
};

export default function BTCSection({ onAddOrganizer }: BTCSectionProps) {
  // State cho các dòng form động
  const [organizerForms, setOrganizerForms] = useState<OrganizerFormRow[]>([]);

  // State cho dữ liệu từ API
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [positions, setPositions] = useState<ApiPosition[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);

  // State quản lý trạng thái tải và lỗi
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dữ liệu khi component được mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null); // Reset lỗi trước khi fetch
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Không tìm thấy token xác thực.");
        }
        const headers = { Authorization: `Bearer ${token}` };

        // Gọi đồng thời các API
        const [positionsRes, rolesRes, usersRes] = await Promise.all([
          fetch("http://localhost:8080/identity/api/positions", { headers }),
          fetch("http://localhost:8080/identity/api/organizerrole", { headers }),
          fetch("http://localhost:8080/identity/users", { headers }),
        ]);

        // Kiểm tra từng response
        if (!positionsRes.ok) throw new Error(`Lỗi tải vị trí: ${positionsRes.statusText}`);
        if (!rolesRes.ok) throw new Error(`Lỗi tải vai trò: ${rolesRes.statusText}`);
        if (!usersRes.ok) throw new Error(`Lỗi tải người dùng: ${usersRes.statusText}`);

        // Xử lý JSON
        const positionsData = await positionsRes.json();
        const rolesData = await rolesRes.json();
        const usersData = await usersRes.json();

        // Cập nhật state (giả sử API trả về { result: [...] })
        // Kiểm tra null/undefined trước khi set
        setPositions(positionsData?.result || []);
        setRoles(rolesData?.result || []);
        setUsers(usersData?.result || []);

      } catch (err: any) {
        const errorMessage = `Không thể tải dữ liệu: ${err.message}`;
        setError(errorMessage);
        toast.error(errorMessage); // Thông báo lỗi cho người dùng
        console.error("Fetch error in BTCSection:", err);
      } finally {
        setLoading(false); // Kết thúc trạng thái tải
      }
    };

    fetchData();
  }, []); // Chạy một lần khi mount

  // Hàm thêm một dòng form trống mới
  const addOrganizerFormRow = () => {
    setOrganizerForms((prev) => [
      ...prev,
      {
        id: Date.now(), // ID duy nhất dựa trên timestamp
        userId: "",     // Giá trị khởi tạo rỗng
        positionId: "",
        roleId: "",
      },
    ]);
  };

  // Hàm xóa một dòng form dựa vào ID của nó
  const removeOrganizerFormRow = (idToRemove: number) => {
    setOrganizerForms((prev) => prev.filter((form) => form.id !== idToRemove));
  };

  // Hàm xử lý thay đổi giá trị trong các dropdown của một dòng form cụ thể
  const handleOrganizerChange = (
    idToUpdate: number,
    field: keyof Omit<OrganizerFormRow, 'id'>, // Chỉ cho phép 'userId', 'positionId', 'roleId'
    value: string
  ) => {
    setOrganizerForms((prev) =>
      prev.map((form) =>
        form.id === idToUpdate ? { ...form, [field]: value } : form
      )
    );
  };

  // Hàm xử lý khi nhấn nút "Thêm BTC" trên một dòng
  const handleAddOrganizerClick = (formRow: OrganizerFormRow) => {
    // Kiểm tra xem đã chọn đủ thông tin chưa
    if (!formRow.userId || !formRow.positionId || !formRow.roleId) {
      toast.error("Vui lòng chọn Người dùng, Vị trí và Vai trò.");
      return;
    }

    // Gọi callback prop để gửi dữ liệu lên component cha
    onAddOrganizer({
      userId: formRow.userId,
      positionId: formRow.positionId,
      roleId: formRow.roleId,
    });

    toast.success("Đã thêm Ban tổ chức vào danh sách.");

    // Xóa dòng form này khỏi giao diện sau khi thêm thành công
    removeOrganizerFormRow(formRow.id);
  };

  // --- Render ---
  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-md font-semibold mb-1">Ban tổ chức</h3>

      {/* Hiển thị trạng thái tải hoặc lỗi */}
      {loading && <p className="text-gray-500">Đang tải dữ liệu...</p>}
      {error && <p className="text-red-600 bg-red-100 p-2 rounded">{error}</p>}

      {/* Nút thêm dòng form mới */}
      <button
        type="button"
        onClick={addOrganizerFormRow}
        className="mt-4 mb-2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl hover:bg-blue-700 transition cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
        title="Thêm Ban tổ chức"
        disabled={loading || !!error} // Không cho thêm nếu đang tải hoặc có lỗi
      >
        +
      </button>

      {/* Danh sách các dòng form động */}
      <div className="space-y-3   ">
        {organizerForms.map((form) => (
          <div
            key={form.id}
            className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center p-2 border rounded bg-gray-50"
          >
            {/* Select User */}
            <select
              value={form.userId} // Không cần || "" vì giá trị khởi tạo đã là ""
              onChange={(e) => handleOrganizerChange(form.id, "userId", e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 cursor-pointer w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required // Có thể thêm required nếu form cha cần validation
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
              onChange={(e) => handleOrganizerChange(form.id, "positionId", e.target.value)}
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

            {/* Select Role */}
            <select
              value={form.roleId}
              onChange={(e) => handleOrganizerChange(form.id, "roleId", e.target.value)}
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
              onClick={() => removeOrganizerFormRow(form.id)}
              className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full md:w-auto cursor-pointer text-sm"
            >
              Xóa
            </button>

            
            <button
              type="button"
              onClick={() => handleAddOrganizerClick(form)}
              className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200 w-full md:w-auto cursor-pointer text-sm"
            >
              Thêm BTC
            </button>
            
          </div>
        ))}
      </div>

      
    </div>
  );
}