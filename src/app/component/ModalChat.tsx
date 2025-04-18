"use client";

import React from "react";

export default function ModalChat({ onClose, onSelectConversation }) {
  // Danh sách mẫu
  const conversations = [
    { id: 1, name: "Nguyễn Văn A", message: "Chào bạn!" },
    { id: 2, name: "Trần Thị B", message: "Họp lúc mấy giờ nhỉ?" },
    { id: 3, name: "Lê Văn C", message: "Đã đăng sự kiện rồi nha!" },
  ];

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold text-blue-600 mb-4">💬 Danh sách chat</h2>

        <ul className="space-y-3 max-h-80 overflow-y-auto">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              onClick={() => onSelectConversation(conv)}
              className="p-3 border rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              🧑 {conv.name} - "{conv.message}"
            </li>
          ))}
        </ul>

        <button
          onClick={onClose}
          className="mt-6 px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg transition"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
