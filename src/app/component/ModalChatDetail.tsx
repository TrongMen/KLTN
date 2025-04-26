// File: ModalChatDetail.tsx
"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeftIcon, Cross2Icon, InfoCircledIcon, PaperPlaneIcon, FaceIcon, Link2Icon, PersonIcon, TrashIcon, PlusIcon, ExitIcon } from '@radix-ui/react-icons';

interface Role {
  name: string;
  description?: string;
  permissions?: any[];
}
interface User {
  id: string;
  roles?: Role[];
  firstName?: string;
  lastName?: string;
  username?: string;
  dob?: string;
  avatar?: string;
  email?: string;
  gender?: boolean;
}
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

interface ModalChatDetailProps {
  conversation: Conversation;
  onClose: () => void;
  onGoBack: () => void;
  currentUser: User | null;
}

export default function ModalChatDetail({
  conversation,
  onClose,
  onGoBack,
  currentUser,
}: ModalChatDetailProps) {
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messageInput, setMessageInput] = useState("");

  const isCurrentUserAdmin = useMemo(() => {
      return currentUser?.roles?.some(role => role.name === 'ADMIN') ?? false;
  }, [currentUser]);


  const getParticipantInfo = () => {
    if (!conversation.isGroup || !conversation.participants || conversation.participants.length === 0) {
        return null;
    }
    const count = conversation.participants.length;
    const namesToShow = conversation.participants.slice(0, 3).map(p => p.name).join(', ');
    const remainingCount = count - 3;

    return (
      <p className="text-xs text-gray-500 truncate mt-0.5 cursor-pointer hover:underline" onClick={() => setShowInfoPanel(true)}>
        {count} thành viên: {namesToShow}
        {remainingCount > 0 && ` và ${remainingCount} người khác`}
      </p>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-60 p-0 md:p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white rounded-none md:rounded-lg shadow-xl w-full h-full md:w-full md:max-w-4xl flex flex-col md:max-h-[90vh] overflow-hidden relative">

        <div className="flex justify-between items-center p-3 md:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
             <button
                onClick={onGoBack}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                aria-label="Quay lại danh sách chat"
             >
                <ChevronLeftIcon width="24" height="24" />
             </button>

            <img
              src={
                conversation.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  conversation.name
                )}&background=random${conversation.isGroup ? '&font-size=0.4' : ''}`
              }
              alt={`Avatar của ${conversation.name}`}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
                <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate">
                 {conversation.name}
                </h2>
                {conversation.isGroup && getParticipantInfo()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversation.isGroup && (
                 <button
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                    aria-label="Thông tin cuộc trò chuyện"
                 >
                    <InfoCircledIcon width="22" height="22" />
                 </button>
            )}
             <button
                onClick={onClose}
                className="text-gray-500 hover:text-red-600 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                aria-label="Đóng chat"
             >
                <Cross2Icon width="22" height="22" />
             </button>
          </div>
        </div>


        <div className="flex-1 flex overflow-hidden">

            <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${showInfoPanel ? 'w-full md:w-[calc(100%-320px)]' : 'w-full'}`}>
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
                  <div className="text-center text-gray-400 italic py-10">
                    Nội dung cuộc trò chuyện sẽ hiển thị ở đây...
                  </div>
                  <div className="flex justify-end">
                    <div className="bg-blue-500 text-white p-2 md:p-3 rounded-lg max-w-[70%]">
                      <p className="text-sm">Tin nhắn gần nhất: "{conversation.message}"</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 justify-start">
                     <img src={
                         conversation.isGroup ?
                         (conversation.participants?.[0]?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.participants?.[0]?.name || 'G')}&background=random`) :
                         (conversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.name)}&background=random`)
                     }
                         className="w-6 h-6 rounded-full object-cover border self-end mb-1 flex-shrink-0"
                         alt="Avatar người gửi"
                    />
                     <div className="bg-gray-100 text-gray-800 p-2 md:p-3 rounded-lg max-w-[70%]">
                        {conversation.isGroup && <span className="text-xs font-semibold text-purple-700 block mb-1">{conversation.participants?.[0]?.name || 'Thành viên nhóm'}</span>}
                        <p className="text-sm">Chào bạn, tôi có thể giúp gì?</p>
                     </div>
                  </div>
                   {[...Array(10)].map((_, i) => (
                     <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                       {i % 2 !== 0 && <img src={`https://ui-avatars.com/api/?name=${String.fromCharCode(65 + i)}&background=random`} className="w-6 h-6 rounded-full object-cover border self-end mb-1 flex-shrink-0" alt="Avatar" />}
                       <div className={`${i % 2 === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'} p-2 md:p-3 rounded-lg max-w-[70%]`}>
                         <p className="text-sm">Đây là tin nhắn số {i + 1} để kiểm tra giao diện cuộn.</p>
                       </div>
                     </div>
                   ))}
                </div>

                <div className="p-3 md:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                        <FaceIcon width="20" height="20" />
                    </button>
                     <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                        <Link2Icon width="20" height="20" />
                    </button>
                    <input
                      type="text"
                      placeholder="Nhập tin nhắn..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && messageInput.trim()) { alert('Gửi: ' + messageInput); setMessageInput(''); } }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow text-sm"
                    />
                    <button
                       onClick={() => { if(messageInput.trim()) { alert('Gửi: ' + messageInput); setMessageInput(''); } }}
                       disabled={!messageInput.trim()}
                       className={`p-2 rounded-full transition-colors duration-150  ${messageInput.trim() ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                       aria-label="Gửi tin nhắn"
                    >
                       <PaperPlaneIcon width="20" height="20" />
                    </button>
                  </div>
                </div>
             </div>

            <div className={`absolute top-0 right-0 h-full bg-white border-l border-gray-200 shadow-lg transition-transform duration-300 ease-in-out transform ${showInfoPanel ? 'translate-x-0' : 'translate-x-full'} w-full md:w-80 flex flex-col`}>
               <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                    <h3 className="text-base font-semibold text-gray-700">Thông tin đoạn chat</h3>
                    <button
                        onClick={() => setShowInfoPanel(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                        aria-label="Đóng thông tin"
                    >
                        <Cross2Icon width="20" height="20" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="border-b pb-4">
                        <h4 className="text-sm font-semibold text-gray-600 mb-3">
                            <PersonIcon className="inline-block mr-1 mb-0.5" />
                            {conversation.participants?.length || 0} Thành viên
                        </h4>
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {conversation.participants?.map(p => (
                                <li key={p.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-2">
                                        <img
                                            src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&size=32`}
                                            alt={p.name}
                                            className="w-7 h-7 rounded-full object-cover"
                                        />
                                        <span className="text-sm text-gray-700">{p.name} {p.id === currentUser?.id ? '(Bạn)' : ''}</span>
                                    </div>
                                    {isCurrentUserAdmin && p.id !== currentUser?.id && (
                                        <button
                                            onClick={() => alert(`Xóa thành viên: ${p.name}`)}
                                            className="p-1 text-gray-400 cursor-pointer hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label={`Xóa ${p.name}`}
                                        >
                                            <TrashIcon width="16" height="16" />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {isCurrentUserAdmin && (
                             <button onClick={() => alert('Mở modal thêm thành viên')} className="mt-3 cursor-pointer w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 transition-colors">
                                <PlusIcon /> Thêm thành viên
                             </button>
                        )}
                    </div>

                     <div className="border-b pb-4">
                        <h4 className="text-sm font-semibold text-gray-600 mb-2">
                           <Link2Icon className="inline-block mr-1 mb-0.5" /> File & Ảnh đã gửi
                        </h4>
                        <div className="text-center text-gray-400 text-xs italic py-4">
                            (Khu vực hiển thị ảnh/file)
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-200 h-14 rounded flex items-center justify-center text-gray-400 text-xs">Ảnh {i+1}</div>)}
                        </div>
                     </div>

                    {isCurrentUserAdmin && (
                       <div className="border-b pb-4">
                            <h4 className="text-sm font-semibold text-gray-600 mb-2">
                               Phân quyền (Admin Only Placeholder)
                           </h4>
                           <p className="text-xs text-gray-500">Admin có thể quản lý quyền...</p>
                       </div>
                    )}


                     <div>
                         {currentUser && conversation.isGroup && (
                             <button onClick={() => alert('Rời nhóm')} className="w-full cursor-pointer flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 font-medium transition-colors mb-3">
                               <ExitIcon /> Rời khỏi nhóm
                             </button>
                         )}

                         {isCurrentUserAdmin && (
                             <button onClick={() => alert('Giải tán nhóm')} className="w-full cursor-pointer flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded border border-red-700 font-medium transition-colors">
                                 <TrashIcon /> Giải tán nhóm
                             </button>
                         )}
                     </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}