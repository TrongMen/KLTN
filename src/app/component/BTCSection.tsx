import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { toast } from "react-hot-toast";

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
  allUsers: ApiUser[]; // Chỉ cần allUsers để hiển thị tên nếu cần (không cần nữa vì list bị bỏ) và disable dropdown
  // Props `existingOrganizers` không cần thiết nữa vì không hiển thị list ở đây
};

// Định nghĩa handle để lộ ra ngoài cho ref
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

// Sử dụng forwardRef
const BTCSection = forwardRef<BTCSectionHandle, BTCSectionProps>(
  ({ allUsers }, ref) => {
    const [organizerForms, setOrganizerForms] = useState<OrganizerFormRow[]>(
      []
    );
    const [roles, setRoles] = useState<ApiRole[]>([]);
    const [positions, setPositions] = useState<ApiPosition[]>([]);
    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Không cần existingOrganizerIds nữa vì không có nút Thêm trên dòng
    // const existingOrganizerIds = useMemo(() => new Set(existingOrganizers?.map(o => o.userId) ?? []), [existingOrganizers]);

    useEffect(() => {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
          const token = localStorage.getItem("authToken");
          if (!token) throw new Error("Token không tồn tại.");
          const headers = { Authorization: `Bearer ${token}` };
          const [pRes, rRes, uRes] = await Promise.all([
            fetch("http://localhost:8080/identity/api/positions", { headers }),
            fetch("http://localhost:8080/identity/api/organizerrole", {
              headers,
            }),
            fetch("http://localhost:8080/identity/users", { headers }),
          ]);
          if (!pRes.ok) throw new Error(`Lỗi tải vị trí`);
          if (!rRes.ok) throw new Error(`Lỗi tải vai trò`);
          if (!uRes.ok) throw new Error(`Lỗi tải người dùng`);
          const pData = await pRes.json();
          const rData = await rRes.json();
          const uData = await uRes.json();
          setPositions(pData?.result || []);
          setRoles(rData?.result || []);
          setUsers(uData?.result || []);
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

    // Lộ ra hàm để component cha gọi qua ref
    useImperativeHandle(ref, () => ({
      getMembersData: () => {
        // Lọc và trả về dữ liệu hợp lệ từ các dòng form
        return organizerForms
          .filter((form) => form.userId && form.positionId && form.roleId) // Chỉ lấy dòng đã điền đủ
          .map((form) => ({
            userId: form.userId,
            positionId: form.positionId,
            roleId: form.roleId,
          }));
      },
      resetForms: () => {
        setOrganizerForms([]); // Reset lại state nội bộ
      },
    }));

    return (
      <div className="mt-6 border-t pt-4">
        {/* Bỏ phần hiển thị danh sách BTC hiện có */}
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
              {" "}
              {/* Giảm cột vì bỏ nút Thêm */}
              <select
                value={form.userId}
                onChange={(e) =>
                  handleOrganizerChange(form.id, "userId", e.target.value)
                }
                className="border border-gray-300 rounded px-2 py-1 cursor-pointer w-full focus:ring-1 focus:ring-blue-500 text-sm"
              >
                {" "}
                <option value="">-- Chọn user --</option>{" "}
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {" "}
                    {`${u.lastName || ""} ${u.firstName || ""}`.trim() ||
                      u.username}{" "}
                  </option>
                ))}{" "}
              </select>
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
              {/* Bỏ nút Thêm trên dòng */}
              <button
                type="button"
                onClick={() => removeOrganizerFormRow(form.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 w-full sm:w-auto cursor-pointer text-sm"
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

BTCSection.displayName = "BTCSection"; // Thêm displayName cho forwardRef
export default BTCSection;
