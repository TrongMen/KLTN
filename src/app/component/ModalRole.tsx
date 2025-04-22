"use client";

import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";

interface Item {
  id: number;
  name: string;
}

type EditMode = {
  type: "position" | "role";
  action: "add" | "edit";
  id?: number;
  oldName?: string;
};

export default function ModalRole({ onClose }: { onClose: () => void }) {
  const [positions, setPositions] = useState<Item[]>([]);
  const [roles, setRoles] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [inputName, setInputName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ type: "position" | "role"; id: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");

        const [positionsRes, rolesRes] = await Promise.all([
          fetch("http://localhost:8080/identity/api/positions", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:8080/identity/api/organizerrole", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (!positionsRes.ok || !rolesRes.ok) {
          throw new Error("Failed to fetch data");
        }

        const positionsData = await positionsRes.json();
        const rolesData = await rolesRes.json();

        setPositions(positionsData.result || []);
        setRoles(rolesData.result || []);
      } catch (err) {
        setError("Không thể tải dữ liệu vị trí và vai trò");
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openEditModal = (mode: EditMode) => {
    setEditMode(mode);
    setInputName(mode.oldName || "");
  };

  const handleSave = async () => {
    if (!inputName.trim()) return toast.error("Tên không được để trống");

    const token = localStorage.getItem("authToken");
    const { type, action, id } = editMode!;
    const urlBase =
      type === "position"
        ? "http://localhost:8080/identity/api/positions"
        : "http://localhost:8080/identity/api/organizerrole";

    try {
      const response = await fetch(
        action === "add" ? urlBase : `${urlBase}/${id}`,
        {
          method: action === "add" ? "POST" : "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: inputName }),
        }
      );

      if (!response.ok) throw new Error("Request failed");

      const newItem = await response.json();
      if (type === "position") {
        setPositions((prev) =>
          action === "add"
            ? [...prev, newItem.result]
            : prev.map((i) => (i.id === id ? { ...i, name: inputName } : i))
        );
      } else {
        setRoles((prev) =>
          action === "add"
            ? [...prev, newItem.result]
            : prev.map((i) => (i.id === id ? { ...i, name: inputName } : i))
        );
      }

      toast.success(`${action === "add" ? "Đã thêm" : "Đã cập nhật"} ${type === "position" ? "vị trí" : "vai trò"}`);
    } catch (err) {
      toast.error(`${action === "add" ? "Không thể thêm" : "Không thể cập nhật"} ${type === "position" ? "vị trí" : "vai trò"}`);
      console.error(err);
    } finally {
      setEditMode(null);
      setInputName("");
    }
  };

  const handleDelete = async () => {
    const { type, id } = confirmDelete!;
    const token = localStorage.getItem("authToken");
    const url =
      type === "position"
        ? `http://localhost:8080/identity/api/positions/${id}`
        : `http://localhost:8080/identity/api/organizerrole/${id}`;

    try {
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Delete failed");

      if (type === "position") {
        setPositions((prev) => prev.filter((i) => i.id !== id));
      } else {
        setRoles((prev) => prev.filter((i) => i.id !== id));
      }

      toast.success(`Đã xóa ${type === "position" ? "vị trí" : "vai trò"} thành công`);
    } catch (err) {
      toast.error(`Không thể xóa ${type === "position" ? "vị trí" : "vai trò"}`);
      console.error(err);
    } finally {
      setConfirmDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p>Đang tải danh sách vị trí...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <p className="text-red-500">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Toaster toastOptions={{ duration: 3000 }} />
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-3xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-blue-600 mb-6">
          🎯 Quản lý vị trí và vai trò
        </h2>

        {/* Danh sách Vị trí */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-gray-800">📌 Vị trí</h3>
            <button
              onClick={() => openEditModal({ type: "position", action: "add" })}
              className="bg-blue-500 cursor-pointer text-white px-3 py-1 rounded-full hover:bg-blue-600"
            >
              + Thêm
            </button>
          </div>
          <ul className="space-y-2">
            {positions.map((pos) => (
              <li
                key={pos.id}
                className="flex justify-between items-center bg-gray-100 p-3 rounded-lg"
              >
                <span>{pos.name}</span>
                <div className="space-x-2">
                  <button
                    onClick={() =>
                      openEditModal({
                        type: "position",
                        action: "edit",
                        id: pos.id,
                        oldName: pos.name,
                      })
                    }
                    className="text-yellow-600 hover:text-yellow-800 cursor-pointer"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: "position", id: pos.id })}
                    className="text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Danh sách Vai trò */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-gray-800">🧩 Vai trò</h3>
            <button
              onClick={() => openEditModal({ type: "role", action: "add" })}
              className="bg-blue-500 text-white px-3 py-1 rounded-full hover:bg-blue-600 cursor-pointer"
            >
              + Thêm
            </button>
          </div>
          <ul className="space-y-2">
            {roles.map((role) => (
              <li
                key={role.id}
                className="flex justify-between items-center bg-gray-100 p-3 rounded-lg"
              >
                <span>{role.name}</span>
                <div className="space-x-2">
                  <button
                    onClick={() =>
                      openEditModal({
                        type: "role",
                        action: "edit",
                        id: role.id,
                        oldName: role.name,
                      })
                    }
                    className="text-yellow-600 hover:text-yellow-800 cursor-pointer"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setConfirmDelete({ type: "role", id: role.id })}
                    className="text-red-600 hover:text-red-800 cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Đóng modal */}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 cursor-pointer"
          >
            Đóng
          </button>
        </div>

        {/* Icon đóng góc phải */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xl cursor-pointer"
        >
          ✖
        </button>
      </div>

      {/* Modal nhập tên */}
      {editMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editMode.action === "add" ? "Thêm mới" : "Chỉnh sửa"}{" "}
              {editMode.type === "position" ? "vị trí" : "vai trò"}
            </h3>
            <input
              type="text"
              className="w-full border p-2 rounded mb-4"
              placeholder="Nhập tên..."
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditMode(null)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-sm">
            <p className="text-lg mb-4">
              Bạn có chắc muốn xóa{" "}
              {confirmDelete.type === "position" ? "vị trí" : "vai trò"} này?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 cursor-pointer"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
