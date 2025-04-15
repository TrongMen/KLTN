import React, { useState } from "react";

interface Member {
  name: string;
  role: "Sinh viên" | "Giảng viên" | "Ban tổ chức";
  email: string;
}

interface ModalMemberProps {
  onClose: () => void;
  userRole: "admin" | "ban tổ chức" | "sinh viên" | "giảng viên";
  currentUserEmail: string;
}

export default function ModalMember({
  onClose,
  userRole,
  currentUserEmail,
}: ModalMemberProps) {
  const [tab, setTab] = useState<"all" | "student" | "teacher" | "organizer">(
    "all"
  );

  const [isMember, setIsMember] = useState<boolean>(false); // Trạng thái để theo dõi sinh viên đã tham gia nhóm hay chưa

  const members: Member[] = [
    { name: "Nguyễn Văn A", role: "Sinh viên", email: "a@student.edu.vn" },
    { name: "Trần Thị B", role: "Giảng viên", email: "b@teacher.edu.vn" },
    { name: "Lê Văn C", role: "Sinh viên", email: "c@student.edu.vn" },
    { name: "Ngô Văn D", role: "Ban tổ chức", email: "d@club.edu.vn" },
  ];

  const filteredMembers = members.filter((member) => {
    if (tab === "all") return true;
    if (tab === "student") return member.role === "Sinh viên";
    if (tab === "teacher") return member.role === "Giảng viên";
    if (tab === "organizer") return member.role === "Ban tổ chức";
    return false;
  });

  const handleRemoveMember = (email: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa thành viên này không?")) {
      // setMembers((prev) => prev.filter((m) => m.email !== email));
    }
  };

  const handleLeaveGroup = () => {
    if (confirm("Bạn có chắc chắn muốn rời khỏi nhóm không?")) {
      // setMembers((prev) => prev.filter((m) => m.email !== currentUserEmail));
      setIsMember(false); // Cập nhật trạng thái khi rời nhóm
      onClose(); // Tự động đóng modal khi rời nhóm
    }
  };

  const handleJoinGroup = () => {
    if (confirm("Bạn có muốn tham gia nhóm không?")) {
      setIsMember(true); // Cập nhật trạng thái khi tham gia nhóm
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-3xl p-6 flex flex-col justify-between max-h-[90vh]">
        {/* Header */}
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

        {/* Tabs */}
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
            onClick={() => setTab("student")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "student" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
            }`}
          >
            🎓 Sinh viên
          </button>
          <button
            onClick={() => setTab("teacher")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "teacher" ? "border-b-2 border-green-500 text-green-600" : "text-gray-500"
            }`}
          >
            🧑‍🏫 Giảng viên
          </button>
          <button
            onClick={() => setTab("organizer")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "organizer" ? "border-b-2 border-pink-500 text-pink-600" : "text-gray-500"
            }`}
          >
            📖 Ban tổ chức
          </button>
        </div>

        {/* Invite Button */}
        {(userRole === "admin" || userRole === "ban tổ chức") && (
          <div className="mb-4">
            <button
              onClick={() => alert("Mở modal mời thành viên")}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600"
            >
              ➕ Mời thành viên
            </button>
          </div>
        )}

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
                  {(userRole === "admin" || userRole === "ban tổ chức") &&
                    member.email !== currentUserEmail && (
                      <button
                        onClick={() => handleRemoveMember(member.email)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        ❌ Xóa
                      </button>
                    )}

                  {/* Thêm hoặc rời nhóm */}
                  {userRole === "sinh viên" && !isMember && (
                    <button
                      onClick={handleJoinGroup}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      ➕ Tham gia nhóm
                    </button>
                  )}

                  {userRole === "sinh viên" && isMember && (
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

        {/* Bottom button */}
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
