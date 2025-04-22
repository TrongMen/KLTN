import React, { useState, useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";
import { Role, roleDisplayMap, roleValueMap } from "./ModalRole_part1";


export default function ModalRole({ onClose }: { onClose: () => void }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPermissions, setLoadingPermissions] = useState<boolean>(false);
  const [newPermissionName, setNewPermissionName] = useState<string>("");

  // useEffect(() => {
  //   fetchUsers();
  //   fetchPermissions();
  // }, []);

  // const fetchUsers = async () => {
  //   setLoading(true);
  //   try {
  //     const response = await fetch("http://localhost:8080/identity/users", {
  //       headers: {
  //         Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  //       },
  //     });
  //     if (!response.ok) {
  //       throw new Error("Failed to fetch users");
  //     }
  //     const data = await response.json();
  //     const users: Role[] = (data.result || []).map((user: any) => ({
  //       id: user.id,
  //       name: user.firstName + " " + user.lastName,
  //       email: user.email,
  //       rolez: user.roles.name,
  //       roleDescription: user.roles.description,
  //       avatar: user.avatar,
  //     }));
  //     setRoles(users);
  //   } catch (error) {
  //     toast.error("Lỗi khi tải danh sách người dùng");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchPermissions = async () => {
    setLoadingPermissions(true);
    try {
      const token = localStorage.getItem("authToken") || "";
      const data = await getPermissions(token);
      setPermissions(data.result || []);
    } catch (error: any) {
      toast.error(`Lỗi khi tải danh sách quyền: ${error.message || error}`);
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleRoleChange = async (targetUser: Role, newRoleDisplay: string) => {
    const updatedRoles = [...roles];
    const targetIndex = updatedRoles.findIndex(
      (r) => r.email === targetUser.email
    );

    if (targetIndex === -1) return;

    const newRole = roleValueMap[newRoleDisplay] || newRoleDisplay;

    try {
      const response = await fetch(`http://localhost:8080/identity/users/${targetUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          ...targetUser,
          roles: [newRole],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Lỗi khi cập nhật quyền: ${errorData.message || response.statusText}`);
        return;
      }

      updatedRoles[targetIndex].rolez = newRoleDisplay;
      setRoles(updatedRoles);
      toast.success(`${targetUser.name} được phân quyền thành "${newRoleDisplay}"`);
      setSelectedMenu(null);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(`Lỗi khi gọi API: ${error.message}`);
      } else {
        toast.error("Lỗi không xác định khi gọi API");
      }
    }
  };

  const handleAddPermission = async () => {
    if (!newPermissionName.trim()) {
      toast.error("Tên quyền không được để trống");
      return;
    }
    try {
      const token = localStorage.getItem("authToken") || "";
      await addPermission({ name: newPermissionName.trim() }, token);
      toast.success("Thêm quyền thành công");
      setNewPermissionName("");
      fetchPermissions();
    } catch (error: any) {
      toast.error(`Lỗi khi thêm quyền: ${error.message || error}`);
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    try {
      const token = localStorage.getItem("authToken") || "";
      await deletePermission(permissionId, token);
      toast.success("Xóa quyền thành công");
      fetchPermissions();
    } catch (error: any) {
      toast.error(`Lỗi khi xóa quyền: ${error.message || error}`);
    }
  };

  const getMenuOptions = (rolez: string) => {
    switch (rolez) {
      case "Admin":
        return ["Thành viên vãng lai", "Thành viên nòng cốt"];
      case "Thành viên vãng lai":
        return ["Admin", "Thành viên nòng cốt"];
      case "Thành viên nòng cốt":
        return ["Admin", "Thành viên vãng lai"];
      default:
        return ["Admin", "Thành viên vãng lai", "Thành viên nòng cốt"];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40">
      <Toaster toastOptions={{ duration: 3500 }} />
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">
          🎭 Quản lý chức vụ
        </h2>

        {loading ? (
          <p>Đang tải danh sách người dùng...</p>
        ) : (
          <>
            <ul className="space-y-4 max-h-96 overflow-y-auto pr-2 mb-6">
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
                      <p className="text-gray-600">{roleDisplayMap[role.rolez] || role.rolez}</p>
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
                        {getMenuOptions(roleDisplayMap[role.rolez] || role.rolez).map((option, optIndex) => (
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

            <h2 className="text-2xl font-bold text-blue-600 mb-4">
              🔐 Quản lý quyền
            </h2>

            {loadingPermissions ? (
              <p>Đang tải danh sách quyền...</p>
            ) : (
              <>
                <ul className="space-y-4 max-h-64 overflow-y-auto pr-2 mb-4">
                  {permissions.map((permission) => (
                    <li
                      key={permission.id}
                      className="flex justify-between items-center border border-gray-200 p-3 rounded-lg bg-gray-50"
                    >
                      <span>{permission.name}</span>
                      <button
                        onClick={() => handleDeletePermission(permission.id)}
                        className="text-red-600 hover:text-red-800 font-semibold"
                      >
                        Xóa
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Tên quyền mới"
                    value={newPermissionName}
                    onChange={(e) => setNewPermissionName(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 flex-grow"
                  />
                  <button
                    onClick={handleAddPermission}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Thêm quyền
                  </button>
                </div>
              </>
            )}
          </>
        )}

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
