"use client";
import React, { useState } from "react";

interface Member {
  name: string;
  role: "Thành viên vãng lai" | "Thành viên nòng cốt";
  email: string;
}

interface ModalMemberProps {
  onClose: () => void;
  userRole: "admin" | "thành viên vãng lai" | "thành viên nòng cốt";
  currentUserEmail: string;
}

export default function ModalMember({
  onClose,
  userRole,
  currentUserEmail,
}: ModalMemberProps) {
  const [tab, setTab] = useState<"all" | "casual" | "core">("all");
  const [isMember, setIsMember] = useState<boolean>(false);

  const members: Member[] = [
    { name: "Nguyễn Văn A", role: "Thành viên vãng lai", email: "a@club.vn" },
    { name: "Lê Văn C", role: "Thành viên nòng cốt", email: "c@club.vn" },
    { name: "Ngô Văn D", role: "Thành viên vãng lai", email: "d@club.vn" },
  ];

  const filteredMembers = members.filter((member) => {
    if (tab === "all") return true;
    if (tab === "casual") return member.role === "Thành viên vãng lai";
    if (tab === "core") return member.role === "Thành viên nòng cốt";
    return false;
  });

  const handleRemoveMember = (email: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thành viên này không?")) {
      // setMembers((prev) => prev.filter((m) => m.email !== email));
    }
  };

  const handleLeaveGroup = () => {
    if (confirm("Bạn có chắc chắn muốn rời khỏi nhóm không?")) {
      setIsMember(false);
      onClose();
    }
  };

  const handleJoinGroup = () => {
    if (confirm("Bạn có muốn tham gia nhóm không?")) {
      setIsMember(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-3xl p-6 flex flex-col justify-between max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-purple-600">Thành viên câu lạc bộ</h2>
          <button
            onClick={onClose}
            className="text-red-500 text-xl font-bold cursor-pointer"
            title="Đóng"
          >
            ✖
          </button>
        </div>

        <div className="flex gap-4 mb-4 border-b">
          <button
            onClick={() => setTab("all")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "all" ? "border-b-2 border-purple-500 text-purple-600" : "text-gray-500"
            }`}
          >
            👥 Tất cả
          </button>
          <button
            onClick={() => setTab("casual")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "casual" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
            }`}
          >
            🧍‍♂️ Thành viên vãng lai
          </button>
          <button
            onClick={() => setTab("core")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "core" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500"
            }`}
          >
            💪 Thành viên nòng cốt
          </button>
        </div>

        {userRole === "admin" && (
          <div className="mb-4">
            <button
              onClick={() => alert("Mở modal mời thành viên")}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600"
            >
              ➕ Mời thành viên
            </button>
          </div>
        )}

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

                <div className="flex gap-2">
                  {userRole === "admin" && member.email !== currentUserEmail && (
                    <button
                      onClick={() => handleRemoveMember(member.email)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      ❌ Xóa
                    </button>
                  )}

                  {userRole === "thành viên vãng lai" && !isMember && (
                    <button
                      onClick={handleJoinGroup}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      ➕ Tham gia nhóm
                    </button>
                  )}

                  {userRole === "thành viên vãng lai" && isMember && (
                    <button
                      onClick={handleLeaveGroup}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      🚪 Rời nhóm
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 italic">Không có thành viên nào.</p>
          )}
        </div>

        <div className="flex justify-end">
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