"use client";

import React, { useState, useMemo } from "react"; // Thêm useState, useMemo
import { MagnifyingGlassIcon } from '@radix-ui/react-icons'; // Icon tìm kiếm (cần cài đặt @radix-ui/react-icons)

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
  const [searchTerm, setSearchTerm] = useState(""); // State cho từ khóa tìm kiếm

  // Dữ liệu mẫu (Nên lấy từ API trong ứng dụng thực tế)
  const conversations: Conversation[] = [
     { id: 1, name: "Nguyễn Văn A", isGroup: false, message: "Chào bạn, mình có thể giúp gì?", avatar: "https://ui-avatars.com/api/?name=Nguyễn+Văn+A&background=random" },
     { id: 2, name: "Trần Thị B", isGroup: false, message: "Cuộc họp sẽ bắt đầu lúc 2 giờ chiều nay nhé.", avatar: "https://ui-avatars.com/api/?name=Trần+Thị+B&background=random" },
     { id: 3, name: "Lê Văn C", isGroup: false, message: "Tuyệt vời! Sự kiện đã được đăng lên trang chủ rồi.", avatar: "https://ui-avatars.com/api/?name=Lê+Văn+C&background=random" },
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
     {
         id: 5,
         name: "Nhóm dự án X",
         isGroup: true,
         message: "Mình đã push code lên nhánh dev rồi nha.",
         avatar: "https://ui-avatars.com/api/?name=X&background=random",
         participants: [
             { id: 'user4', name: 'Trưởng nhóm' },
             { id: 'user2', name: 'Bạn' },
             { id: 'user5', name: 'Dev B' },
             { id: 'user6', name: 'Tester' },
         ]
     },
      { id: 6, name: "Phạm Thị D", isGroup: false, message: "Cảm ơn bạn nhiều!", avatar: "https://ui-avatars.com/api/?name=Phạm+Thị+D&background=random" },
  ];

  // Lọc danh sách dựa trên searchTerm
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) {
      return conversations;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return conversations.filter(conv =>
      conv.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm, conversations]); // Chỉ tính toán lại khi searchTerm hoặc conversations thay đổi

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">

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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Input Tìm kiếm */}
        <div className="p-3 border-b border-gray-200">
           <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <MagnifyingGlassIcon width="16" height="16" />
                </span>
               <input
                   type="text"
                   placeholder="Tìm kiếm theo tên..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
               />
           </div>
       </div>

        {/* Danh sách đã lọc */}
        <ul className="space-y-1 p-3 overflow-y-auto flex-1 bg-gray-50">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <li
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectConversation(conv); }}
              >
                <img
                  src={conv.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.name)}&background=random`}
                  alt={`Avatar của ${conv.name}`}
                  className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-gray-200"
                />
                <div className="flex-1 overflow-hidden">
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
            // Hiển thị thông báo tùy theo có tìm kiếm hay không
            <p className="text-center text-gray-500 py-6 italic">
                {searchTerm ? 'Không tìm thấy cuộc trò chuyện nào.' : 'Không có cuộc trò chuyện nào.'}
            </p>
          )}
        </ul>

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