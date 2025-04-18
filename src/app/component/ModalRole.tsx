"use client";

import React, { useState } from "react";
import { toast } from "react-toastify";

export default function ModalRole({ onClose, roles = [], onUpdateRoles }) {
  const [selectedMenu, setSelectedMenu] = useState(null);

  const handleRoleChange = async (targetUser, newRole) => {
    const updatedRoles = [...roles];
    const targetIndex = updatedRoles.findIndex(
      (r) => r.email === targetUser.email
    );

    if (targetIndex === -1) return;

    // Call backend API to update user roles
    try {
      const response = await fetch(`http://localhost:8080/identity/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          ...targetUser,
          roles: [newRole], // assuming roles is an array of role names
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Lỗi khi cập nhật quyền: ${errorData.message || response.statusText}`);
        return;
      }

      // Update local state on success
      updatedRoles[targetIndex].rolez = newRole;
      toast.success(`${targetUser.name} được phân quyền thành "${newRole}"`);

      if (onUpdateRoles) {
        onUpdateRoles(updatedRoles);
      }

      setSelectedMenu(null); // close menu after selection
    } catch (error) {
      toast.error(`Lỗi khi gọi API: ${error.message}`);
    }
  };

  const getMenuOptions = (rolez) => {
    switch (rolez) {
      case "Thành viên nòng cốt":
        return ["Thành viên vãng lai"];
      case "Thành viên vãng lai":
        return ["Thành viên nòng cốt"];
      default:
        return ["Thành viên nòng cốt", "Thành viên vãng lai"];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl relative">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">
          🎭 Quản lý chức vụ
        </h2>

        <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {roles.map((role, index) => (
            <li
              key={index}
              className="relative flex items-center justify-between border border-gray-200 p-4 rounded-lg shadow-sm bg-gray-50"
            >
              <div className="flex items-center gap-4">
                <img
                  src={role.avatar || "/default-avatar.png"}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    {role.name}
                  </h2>
                  <p className="text-gray-600">{role.rolez}</p>
                </div>
              </div>

              <div className="relative overflow-visible">
                <button
                  onClick={() =>
                    setSelectedMenu(selectedMenu === index ? null : index)
                  }
                  className="cursor-pointer text-xl px-2 text-gray-600 hover:text-gray-900"
                >
                  ⋮
                </button>

                {selectedMenu === index && (
                  <div className="absolute right-2 mt-0 w-48 bg-white border rounded-lg shadow-lg z-9">
                    {getMenuOptions(role.rolez).map((option, optIndex) => (
                      <button
                        key={optIndex}
                        onClick={() => handleRoleChange(role, option)}
                        className="block w-full cursor-pointer text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 cursor-pointer py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold rounded-full"
          >
            Đóng
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute cursor-pointer top-3 right-3 text-red-500 hover:text-red-700 text-xl"
        >
          ✖
        </button>
      </div>
    </div>
  );
}
