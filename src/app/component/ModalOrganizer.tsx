"use client";
import React, { useState } from "react";

interface Member {
  name: string;
  role: "Sinh viên" | "Giảng viên" | "Thành viên Ban tổ chức" | "Trưởng ban tổ chức" | "Phó ban tổ chức";
  email: string;
}

interface ModalOrganizerProps {
  onClose: () => void;
  userRole: "admin" | "ban tổ chức" | "sinh viên" | "giảng viên";
  currentUserEmail: string;
}

export default function ModalOrganizer({
  onClose,
  userRole,
  currentUserEmail,
}: ModalOrganizerProps) {
  const [tab, setTab] = useState<"all" | "student" | "teacher" | "organizer">("organizer");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberEmail, setNewMemberEmail] = useState<string>("");

  const members: Member[] = [
    { name: "Nguyễn Văn A", role: "Thành viên Ban tổ chức", email: "a@club.edu.vn" },
    { name: "Trần Thị B", role: "Trưởng ban tổ chức", email: "b@club.edu.vn" },
    { name: "Lê Văn C", role: "Phó ban tổ chức", email: "c@club.edu.vn" },
    { name: "Ngô Văn D", role: "Thành viên Ban tổ chức", email: "d@club.edu.vn" },
  ];

  const filteredMembers = members.filter((member) => {
    if (tab === "organizer") {
      return (
        member.role === "Thành viên Ban tổ chức" ||
        member.role === "Trưởng ban tổ chức" ||
        member.role === "Phó ban tổ chức"
      );
    }
    return false;
  });

  const handleRoleChange = (email: string, newRole: string) => {
    if (confirm(`Bạn có chắc chắn muốn thay đổi vai trò của ${email} thành ${newRole}?`)) {
      console.log(`Cập nhật vai trò của ${email} thành ${newRole}`);
    }
  };

  const handleAddMember = () => {
    if (newMemberName && newMemberEmail) {
      members.push({ name: newMemberName, role: "Thành viên Ban tổ chức", email: newMemberEmail });
      setNewMemberName("");
      setNewMemberEmail("");
      alert("Thêm thành viên thành công!");
    } else {
      alert("Vui lòng điền đầy đủ thông tin.");
    }
  };

  const handleRemoveMember = (email: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa thành viên ${email}?`)) {
      const index = members.findIndex((member) => member.email === email);
      if (index > -1) {
        members.splice(index, 1);
        alert("Xóa thành viên thành công!");
      }
    }
  };

  const handleTransferLeadership = (email: string) => {
    if (confirm(`Bạn có chắc chắn muốn nhường quyền Trưởng ban cho ${email}?`)) {
      // Chuyển quyền trưởng ban cho người khác
      const memberIndex = members.findIndex((member) => member.email === email);
      if (memberIndex > -1) {
        members[memberIndex].role = "Trưởng ban tổ chức";
        alert(`Nhường quyền trưởng ban cho ${email} thành công!`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-3xl p-6 flex flex-col justify-between max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-purple-600">Thành viên Ban tổ chức</h2>
          <button
            onClick={onClose}
            className="text-red-500 text-xl font-bold cursor-pointer"
            title="Đóng"
          >
            ✖
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b">
          <button
            onClick={() => setTab("organizer")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "organizer" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500"
            }`}
          >
            📖 Ban tổ chức
          </button>
        </div>

        {/* Members List */}
        <div className="space-y-2 overflow-y-auto flex-1 mb-6">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member, idx) => (
              <div
                key={idx}
                className="p-4 bg-gray-100 rounded-md shadow-sm border border-gray-300 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  <p className="text-gray-600">📧 {member.email}</p>
                  <p className="text-sm text-gray-500">🔖 {member.role}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {(userRole === "admin" || userRole === "ban tổ chức" || userRole === "Trưởng ban tổ chức") && (
                    <>
                      {userRole === "Trưởng ban tổ chức" && member.role !== "Trưởng ban tổ chức" && (
                        <button
                          onClick={() => handleTransferLeadership(member.email)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          📢 Nhường quyền trưởng ban
                        </button>
                      )}

                      {(userRole === "admin" || userRole === "Trưởng ban tổ chức") && (
                        <>
                          <button
                            onClick={() => handleRemoveMember(member.email)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            ❌ Xóa thành viên
                          </button>
                        </>
                      )}
                    </>
                  )}

                  {(userRole === "admin" || userRole === "Trưởng ban tổ chức") && (
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="border border-gray-300 rounded-md p-2 text-sm"
                    >
                      <option value="">Chọn vai trò</option>
                      <option value="Trưởng ban tổ chức">Trưởng ban tổ chức</option>
                      <option value="Phó ban tổ chức">Phó ban tổ chức</option>
                      <option value="Thành viên Ban tổ chức">Thành viên Ban tổ chức</option>
                    </select>
                  )}

                  {(userRole === "admin" || userRole === "ban tổ chức") && selectedRole && member.email !== currentUserEmail && (
                    <button
                      onClick={() => handleRoleChange(member.email, selectedRole)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      📢 Phân quyền
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 italic">Không có thành viên nào trong ban tổ chức.</p>
          )}
        </div>

        {/* Add New Member */}
        {userRole === "Trưởng ban tổ chức" && (
          <div className="mt-4">
            <h3 className="font-semibold text-lg">Thêm thành viên mới</h3>
            <input
              type="text"
              placeholder="Tên thành viên"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="border border-gray-300 p-2 rounded-md mb-2 w-full"
            />
            <input
              type="email"
              placeholder="Email thành viên"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="border border-gray-300 p-2 rounded-md mb-4 w-full"
            />
            <button
              onClick={handleAddMember}
              className="bg-green-600 text-white p-2 rounded-md w-full"
            >
              Thêm thành viên
            </button>
          </div>
        )}

        {/* Bottom button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
