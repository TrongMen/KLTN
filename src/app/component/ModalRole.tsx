"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import { PlusIcon, Pencil2Icon, TrashIcon, CheckIcon, Cross2Icon } from '@radix-ui/react-icons';

interface Item {
  id: number | string; // ID có thể là số hoặc chuỗi
  name: string;
}

// --- Interfaces (Thêm vào để đồng bộ) ---
interface RoleAPI { // Đổi tên tránh trùng lặp
  name: string;
  description?: string;
  permissions?: any[];
}
interface User {
  id: string;
  roles?: RoleAPI[];
  firstName?: string;
  lastName?: string;
  username?: string;
  dob?: string;
  avatar?: string;
  email?: string;
  gender?: boolean;
}

type EditMode = {
  type: "position" | "role";
  action: "add" | "edit";
  id?: number | string;
  oldName?: string;
};

type ActiveTab = "position" | "role";

export default function ModalRole({ onClose }: { onClose: () => void }) {
  const [positions, setPositions] = useState<Item[]>([]);
  const [roles, setRoles] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [inputName, setInputName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ type: ActiveTab; id: number | string } | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('position');
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<number | string>>(new Set());
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number | string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      setPositions([]);
      setRoles([]);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Missing auth token");

        const headers = {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${token}`
        };

        const [positionsRes, rolesRes] = await Promise.all([
          fetch("http://localhost:8080/identity/api/positions", { headers }),
          fetch("http://localhost:8080/identity/api/organizerrole", { headers }),
        ]);

        const positionsData = await positionsRes.json();
        const rolesData = await rolesRes.json();

        if (!positionsRes.ok) throw new Error(positionsData.message || 'Failed to fetch positions');
        if (!rolesRes.ok) throw new Error(rolesData.message || 'Failed to fetch roles');


        setPositions(Array.isArray(positionsData.result) ? positionsData.result : []);
        setRoles(Array.isArray(rolesData.result) ? rolesData.result : []);

      } catch (err: any) {
        setError(err.message || "Không thể tải dữ liệu vị trí và vai trò");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Computed Values ---
  const currentList = activeTab === 'position' ? positions : roles;
  const currentSelectedIds = activeTab === 'position' ? selectedPositionIds : selectedRoleIds;
  const setCurrentSelectedIds = activeTab === 'position' ? setSelectedPositionIds : setSelectedRoleIds;

  // --- Handlers ---
  const openEditModal = (mode: EditMode) => {
    setEditMode(mode);
    setInputName(mode.oldName || "");
  };

  const handleSave = async () => {
    if (!editMode || !inputName.trim()) {
       if (!inputName.trim()) toast.error("Tên không được để trống");
       return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) return toast.error("Yêu cầu đăng nhập lại.");

    const { type, action, id } = editMode;
    const urlBase = type === "position"
        ? "http://localhost:8080/identity/api/positions"
        : "http://localhost:8080/identity/api/organizerrole";
    const url = action === "add" ? urlBase : `${urlBase}/${id}`;
    const method = action === "add" ? "POST" : "PUT";
    const body = JSON.stringify({ name: inputName });

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body,
      });

      const resultData = await response.json(); // Luôn parse json để lấy message lỗi nếu có

      if (!response.ok) {
          throw new Error(resultData.message || `${action === 'add' ? 'Thêm' : 'Cập nhật'} thất bại`);
      }


      if (resultData.code !== 1000 || !resultData.result) {
           throw new Error(resultData.message || 'Phản hồi API không hợp lệ');
      }

      const newItem = resultData.result;

      if (type === "position") {
        setPositions((prev) =>
          action === "add"
            ? [...prev, newItem]
            : prev.map((i) => (i.id === id ? { ...i, name: inputName } : i))
        );
      } else {
        setRoles((prev) =>
          action === "add"
            ? [...prev, newItem]
            : prev.map((i) => (i.id === id ? { ...i, name: inputName } : i))
        );
      }

      toast.success(`${action === "add" ? "Đã thêm" : "Đã cập nhật"} ${type === "position" ? "vị trí" : "vai trò"}!`);
    } catch (err: any) {
      toast.error(err.message || `${action === "add" ? "Không thể thêm" : "Không thể cập nhật"} ${type === "position" ? "vị trí" : "vai trò"}.`);
      console.error("Save error:", err);
    } finally {
      setEditMode(null);
      setInputName("");
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;

    const { type, id } = confirmDelete;
    const token = localStorage.getItem("authToken");
    if (!token) return toast.error("Yêu cầu đăng nhập lại.");

    const url = type === "position"
        ? `http://localhost:8080/identity/api/positions/${id}`
        : `http://localhost:8080/identity/api/organizerrole/${id}`;

    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
         let m = `Xóa thất bại`;
          try { const d = await res.json(); m = d.message || m; } catch (_) {}
         throw new Error(m);
      }

      if (type === "position") {
        setPositions((prev) => prev.filter((i) => i.id !== id));
      } else {
        setRoles((prev) => prev.filter((i) => i.id !== id));
      }

      toast.success(`Đã xóa ${type === "position" ? "vị trí" : "vai trò"} thành công`);
    } catch (err: any) {
      toast.error(err.message || `Không thể xóa ${type === "position" ? "vị trí" : "vai trò"}.`);
      console.error("Delete error:", err);
    } finally {
      setConfirmDelete(null);
    }
  };

   const handleBulkDelete = async () => {
     const idsToDelete = Array.from(currentSelectedIds);
     if (idsToDelete.length === 0) return;

     const token = localStorage.getItem("authToken");
     if (!token) return toast.error("Yêu cầu đăng nhập lại.");

     const type = activeTab;
     const urlBase = type === "position"
         ? "http://localhost:8080/identity/api/positions"
         : "http://localhost:8080/identity/api/organizerrole";

     const deletePromises = idsToDelete.map(id =>
        fetch(`${urlBase}/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
     );

     try {
        // Chờ tất cả các yêu cầu hoàn thành
        const results = await Promise.allSettled(deletePromises);

        const successfulDeletes = results
            .filter((result, index) => result.status === 'fulfilled' && result.value.ok)
            .map((_, index) => idsToDelete[index]);

        const failedDeletes = results.length - successfulDeletes.length;

        // Cập nhật state nếu có mục được xóa thành công
        if (successfulDeletes.length > 0) {
            const successfulSet = new Set(successfulDeletes);
             if (type === "position") {
               setPositions((prev) => prev.filter((i) => !successfulSet.has(i.id)));
             } else {
               setRoles((prev) => prev.filter((i) => !successfulSet.has(i.id)));
             }
             setCurrentSelectedIds(new Set()); // Xóa lựa chọn
        }

        // Hiển thị thông báo
        if (failedDeletes === 0) {
            toast.success(`Đã xóa ${successfulDeletes.length} mục thành công.`);
        } else {
            toast.error(`Xóa ${successfulDeletes.length} mục thành công, ${failedDeletes} mục thất bại.`);
            console.error("Bulk delete failures:", results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)));
        }

     } catch (err) { // Lỗi mạng tổng thể
         toast.error("Lỗi mạng trong quá trình xóa hàng loạt.");
         console.error("Bulk delete network error:", err);
     } finally {
         setShowBulkDeleteConfirm(false);
     }
   };


  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    if (isChecked) {
      setCurrentSelectedIds(new Set(currentList.map(item => item.id)));
    } else {
      setCurrentSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: number | string, isSelected: boolean) => {
    setCurrentSelectedIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  // --- Loading/Error States ---
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-3xl relative max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
             <h2 className="text-2xl font-bold text-blue-600">
                 🎯 Quản lý vị trí và vai trò
             </h2>
             <button
                onClick={onClose}
                className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Đóng"
             >
                <Cross2Icon width="24" height="24" />
             </button>
        </div>


        {/* Tabs */}
        <div className="flex border-b mb-4 flex-shrink-0">
          <button
            onClick={() => setActiveTab('position')}
            className={`py-2 px-4 font-semibold transition-colors ${activeTab === 'position' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📌 Vị trí ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('role')}
            className={`py-2 px-4 font-semibold transition-colors ${activeTab === 'role' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            🧩 Vai trò ({roles.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
             {/* Header của Tab (Thêm mới, Xóa chọn) */}
              <div className="flex justify-between items-center mb-3 sticky top-0 bg-white py-2 z-10">
                  <div>
                     <input
                       type="checkbox"
                       id={`select-all-${activeTab}`}
                       className="mr-2 cursor-pointer"
                       checked={currentList.length > 0 && currentSelectedIds.size === currentList.length}
                       onChange={handleSelectAll}
                       disabled={currentList.length === 0}
                     />
                     <label htmlFor={`select-all-${activeTab}`} className="text-sm text-gray-600 cursor-pointer">Chọn tất cả</label>
                 </div>
                 <div>
                      <button
                         onClick={() => openEditModal({ type: activeTab, action: "add" })}
                         className="bg-blue-500 cursor-pointer text-white px-3 py-1.5 rounded-md hover:bg-blue-600 text-sm mr-2 inline-flex items-center gap-1"
                     >
                         <PlusIcon /> Thêm mới
                     </button>
                     <button
                         onClick={() => setShowBulkDeleteConfirm(true)}
                         disabled={currentSelectedIds.size === 0}
                         className={`bg-red-500 cursor-pointer text-white px-3 py-1.5 rounded-md hover:bg-red-600 text-sm inline-flex items-center gap-1 ${currentSelectedIds.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                          <TrashIcon /> Xóa ({currentSelectedIds.size})
                     </button>
                 </div>
              </div>

              {/* Danh sách */}
              <ul className="space-y-2">
                  {currentList.length === 0 && (
                       <p className="text-center text-gray-500 italic py-4">Không có {activeTab === 'position' ? 'vị trí' : 'vai trò'} nào.</p>
                   )}
                   {currentList.map((item) => (
                    <li
                      key={item.id}
                      className={`flex justify-between items-center p-3 rounded-lg transition-colors ${currentSelectedIds.has(item.id) ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                     <div className="flex items-center">
                         <input
                             type="checkbox"
                             id={`${activeTab}-${item.id}`}
                             checked={currentSelectedIds.has(item.id)}
                             onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                             className="mr-3 cursor-pointer"
                         />
                         <label htmlFor={`${activeTab}-${item.id}`} className="cursor-pointer text-gray-800">{item.name}</label>
                     </div>

                      <div className="space-x-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            openEditModal({
                              type: activeTab,
                              action: "edit",
                              id: item.id,
                              oldName: item.name,
                            })
                          }
                          className="text-yellow-600 hover:text-yellow-800 cursor-pointer p-1 hover:bg-yellow-100 rounded"
                          aria-label={`Sửa ${item.name}`}
                        >
                           <Pencil2Icon />
                        </button>
                        <button
                           onClick={() => setConfirmDelete({ type: activeTab, id: item.id })}
                           className="text-red-600 hover:text-red-800 cursor-pointer p-1 hover:bg-red-100 rounded"
                           aria-label={`Xóa ${item.name}`}
                        >
                           <TrashIcon />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

        </div>


        {/* Modal nhập tên */}
        {editMode && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                {editMode.action === "add" ? "Thêm mới" : "Chỉnh sửa"}
                {editMode.type === "position" ? " vị trí" : " vai trò"}
              </h3>
              <input
                type="text"
                className="w-full border p-2 rounded mb-4 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập tên..."
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditMode(null)}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 cursor-pointer text-sm font-medium"
                >
                  Lưu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal xác nhận xóa đơn lẻ */}
        {confirmDelete && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm text-center">
              <p className="text-base mb-4 text-gray-700">
                Bạn có chắc muốn xóa
                {confirmDelete.type === "position" ? " vị trí" : " vai trò"} này?
              </p>
               <p className="text-sm text-red-600 mb-4">(Hành động này không thể hoàn tác)</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-5 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-2 rounded bg-red-500 text-white hover:bg-red-600 cursor-pointer text-sm font-medium"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}

         {/* Modal xác nhận xóa hàng loạt */}
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm text-center">
              <p className="text-base mb-4 text-gray-700">
                 Bạn có chắc muốn xóa {currentSelectedIds.size}
                 {activeTab === "position" ? " vị trí" : " vai trò"} đã chọn?
               </p>
               <p className="text-sm text-red-600 mb-4">(Hành động này không thể hoàn tác)</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-5 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-5 py-2 rounded bg-red-500 text-white hover:bg-red-600 cursor-pointer text-sm font-medium"
                >
                   Xóa ({currentSelectedIds.size})
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}