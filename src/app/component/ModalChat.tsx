"use client";

import React from "react";

interface Participant {
  id: string | number;
  name: string;
  avatar?: string;
}
interface Conversation {
  id: number | string;
  name: string;
  isGroup: boolean;
  participants?: Participant[];
  message: string;
  avatar?: string;
}

interface ModalChatProps {
  onClose: () => void;
  onSelectConversation: (conversation: Conversation) => void;
}

export default function ModalChat({ onClose, onSelectConversation }: ModalChatProps) {
  // Danh sách mẫu - thêm avatar placeholder
  const conversations: Conversation[] = [
   
    
    {
      id: 4,
      name: "Câu lạc bộ IT",
      isGroup: true,
      message: "Thông báo: Buổi workshop tuần này dời sang T7.",
      avatar: "https://ui-avatars.com/api/?name=IT&background=random",
      participants: [ 
          { id: 'user1', name: 'Admin CLB' },
          { id: 'user2', name: 'Bạn' },
          { id: 'user3', name: 'Thành viên A' },
      ]
  },
    
     
  ];

  return (
    // Backdrop
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      {/* Modal Content */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            <span role="img" aria-label="chat bubble" className="mr-2">💬</span>
            Danh sách trò chuyện
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150 p-1 rounded-full hover:bg-gray-100"
            aria-label="Đóng modal"
          >
            {/* Icon X */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conversation List */}
        <ul className="space-y-1 p-3 overflow-y-auto flex-1 bg-gray-50"> {/* Thêm padding và nền nhẹ */}
          {conversations.length > 0 ? (
            conversations.map((conv) => (
              <li
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer group"
                role="button" // Thêm role cho accessibility
                tabIndex={0} // Cho phép focus bằng bàn phím
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectConversation(conv); }} // Cho phép chọn bằng Enter/Space
              >
                {/* Avatar */}
                <img
                  src={conv.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.name)}&background=random`}
                  alt={`Avatar của ${conv.name}`}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-gray-200"
                />
                {/* Name and Message */}
                <div className="flex-1 overflow-hidden"> {/* Đảm bảo không bị tràn text */}
                  <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-700">
                    {conv.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate group-hover:text-gray-700">
                    {conv.message}
                  </p>
                </div>
              </li>
            ))
          ) : (
            <p className="text-center text-gray-500 py-6 italic">Không có cuộc trò chuyện nào.</p> // Thông báo khi list rỗng
          )}
        </ul>

        {/* Footer (Optional - nếu muốn giữ nút đóng ở dưới) */}
        <div className="p-4 border-t border-gray-200 flex justify-end bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors duration-150 font-medium text-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}