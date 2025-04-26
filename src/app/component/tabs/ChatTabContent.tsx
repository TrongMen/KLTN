"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast"; // Keep Toaster in UserHome
import { MagnifyingGlassIcon, ChevronLeftIcon, Cross2Icon, InfoCircledIcon, PaperPlaneIcon, FaceIcon, Link2Icon, PersonIcon, TrashIcon, PlusIcon, ExitIcon } from '@radix-ui/react-icons';
import { User as MainUserType, Conversation as MainConversationType, Role, Participant } from "../homeuser"; // Import types from UserHome or a shared types file

// --- Interfaces (Consolidated) ---
// Using imported types mostly, can define specific ones if needed


// --- Props for the Tab Component ---
interface ChatTabContentProps {
  currentUser: MainUserType | null;
}

// --- Main Tab Component ---
const ChatTabContent: React.FC<ChatTabContentProps> = ({ currentUser }) => {
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedConversation, setSelectedConversation] = useState<MainConversationType | null>(null);
  const [conversations, setConversations] = useState<MainConversationType[]>([]); // State to hold fetched conversations
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [errorConversations, setErrorConversations] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // For list view search

  // State for Detail View
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  // TODO: Add state for actual messages of the selected conversation

  // --- Fetch Conversations (Replace Sample Data) ---
  const fetchConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    setErrorConversations(null);
    // TODO: Replace with actual API call
    try {
       // Example API call simulation
       await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
       const token = localStorage.getItem("authToken");
       if (!token) throw new Error("Authentication required.");

       // --- Replace with your actual API endpoint ---
       // const response = await fetch("http://localhost:8080/api/chat/conversations", {
       //    headers: { Authorization: `Bearer ${token}` }
       // });
       // if (!response.ok) throw new Error("Failed to fetch conversations");
       // const data = await response.json();
       // if (data.code === 1000 && Array.isArray(data.result)) {
       //    setConversations(data.result);
       // } else {
       //    throw new Error(data.message || "Invalid data format");
       // }
       // --- End Replace ---

       // Using sample data for now until API is ready
       const sampleConversations: MainConversationType[] = [
          { id: 1, name: "Nguyễn Văn A", isGroup: false, message: "Chào bạn, mình có thể giúp gì?", avatar: "https://ui-avatars.com/api/?name=Nguyễn+Văn+A&background=random" },
          { id: 2, name: "Trần Thị B", isGroup: false, message: "Cuộc họp sẽ bắt đầu lúc 2 giờ.", avatar: "https://ui-avatars.com/api/?name=Trần+Thị+B&background=random" },
          { id: 3, name: "Lê Văn C", isGroup: false, message: "Tuyệt vời! Đã đăng lên trang chủ.", avatar: "https://ui-avatars.com/api/?name=Lê+Văn+C&background=random" },
          { id: 4, name: "Câu lạc bộ IT", isGroup: true, message: "Thông báo: Workshop dời sang T7.", avatar: "https://ui-avatars.com/api/?name=IT&background=random", participants: [{ id: 'user1', name: 'Admin CLB' },{ id: currentUser?.id || 'user2', name: 'Bạn' },{ id: 'user3', name: 'Thành viên A' }] },
          { id: 5, name: "Nhóm dự án X", isGroup: true, message: "Đã push code lên dev.", avatar: "https://ui-avatars.com/api/?name=X&background=random", participants: [{ id: 'user4', name: 'Trưởng nhóm' },{ id: currentUser?.id || 'user2', name: 'Bạn' },{ id: 'user5', name: 'Dev B' },{ id: 'user6', name: 'Tester' }] },
          { id: 6, name: "Phạm Thị D", isGroup: false, message: "Cảm ơn bạn nhiều!", avatar: "https://ui-avatars.com/api/?name=Phạm+Thị+D&background=random" },
       ];
       setConversations(sampleConversations);

    } catch (error: any) {
      console.error("Failed to fetch conversations:", error);
      setErrorConversations(error.message || "Lỗi tải danh sách trò chuyện.");
      toast.error(error.message || "Lỗi tải danh sách trò chuyện.");
      setConversations([]); // Clear on error
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser]); // Depend on currentUser if API needs user context

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // --- Filtering for List View ---
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) {
      return conversations;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return conversations.filter(conv =>
      conv.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm, conversations]);

  // --- Navigation Handlers ---
  const handleSelectConversation = (conversation: MainConversationType) => {
    setSelectedConversation(conversation);
    setViewMode("detail");
    setShowInfoPanel(false); // Reset info panel state when opening detail
    setMessageInput(""); // Clear message input
    // TODO: Fetch actual messages for the selected conversation here
  };

  const handleGoBackToList = () => {
    setViewMode("list");
    setSelectedConversation(null);
    // No need to fetch list again unless data might have changed significantly
  };

  const handleCloseDetail = () => {
      // In a tab context, "close" usually means going back to the list
      handleGoBackToList();
  }

  // --- Detail View Helpers ---
   const isCurrentUserAdmin = useMemo(() => {
      return currentUser?.roles?.some(role => role.name === 'ADMIN') ?? false;
   }, [currentUser]);

   const getParticipantInfo = (conversation: MainConversationType | null) => {
       if (!conversation?.isGroup || !conversation.participants || conversation.participants.length === 0) {
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

  // --- Render Logic ---

  // Render Conversation List View
  const renderListView = () => (
    <div className="flex flex-col h-full">
       <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <MagnifyingGlassIcon width="16" height="16" />
                </span>
               <input type="text" placeholder="Tìm kiếm theo tên..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"/>
            </div>
       </div>
       <ul className="space-y-1 p-3 overflow-y-auto flex-1 bg-gray-50">
            {isLoadingConversations ? (
                <p className="text-center text-gray-500 py-6 italic">Đang tải danh sách...</p>
            ) : errorConversations ? (
                 <p className="text-center text-red-500 py-6">{errorConversations}</p>
            ) : filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                   <li key={conv.id} onClick={() => handleSelectConversation(conv)}
                       className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors duration-150 cursor-pointer group"
                       role="button" tabIndex={0}
                       onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectConversation(conv); }}>
                      <img src={conv.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.name)}&background=random`}
                           alt={`Avatar của ${conv.name}`}
                           className="w-11 h-11 rounded-full object-cover flex-shrink-0 border border-gray-200"/>
                      <div className="flex-1 overflow-hidden">
                          <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-700">{conv.name}</p>
                          <p className="text-xs text-gray-500 truncate group-hover:text-gray-700">{conv.message}</p>
                      </div>
                   </li>
                ))
            ) : (
                <p className="text-center text-gray-500 py-6 italic">
                    {searchTerm ? 'Không tìm thấy cuộc trò chuyện nào.' : 'Không có cuộc trò chuyện nào.'}
                </p>
            )}
       </ul>
       {/* Optional Footer for List View */}
       {/* <div className="p-4 border-t border-gray-200 flex justify-end bg-white flex-shrink-0"> ... </div> */}
    </div>
  );

  // Render Conversation Detail View
  const renderDetailView = (conversation: MainConversationType) => (
     <div className="flex-1 flex flex-col overflow-hidden relative h-130"> {/* Added h-full */}
         {/* Header */}
         <div className="flex justify-between items-center p-3 md:p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
             <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <button onClick={handleGoBackToList} aria-label="Quay lại danh sách chat"
                          className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
                      <ChevronLeftIcon width="24" height="24" />
                  </button>
                  <img src={ conversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.name)}&background=random${conversation.isGroup ? '&font-size=0.4' : ''}` }
                       alt={`Avatar của ${conversation.name}`}
                       className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                      <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate">{conversation.name}</h2>
                      {conversation.isGroup && getParticipantInfo(conversation)}
                  </div>
             </div>
              <div className="flex items-center gap-1 md:gap-2">
                 {conversation.isGroup && (
                      <button onClick={() => setShowInfoPanel(!showInfoPanel)} aria-label="Thông tin cuộc trò chuyện"
                              className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
                          <InfoCircledIcon width="22" height="22" />
                      </button>
                 )}
                 {/* Optional Close button - might not be needed in tab view */}
                 {/* <button onClick={handleCloseDetail} ...> <Cross2Icon /> </button> */}
              </div>
         </div>

         {/* Main Content Area (Chat + Info Panel) */}
         <div className="flex-1 flex overflow-hidden">
             {/* Chat Area */}
             <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${showInfoPanel ? 'w-full md:w-[calc(100%-300px)]' : 'w-full'}`}>
                  {/* Messages - Replace with actual message rendering */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
                      <div className="text-center text-gray-400 italic py-10">Nội dung cuộc trò chuyện sẽ hiển thị ở đây... (Cần fetch và render messages)</div>
                      <div className="flex justify-end">
                           <div className="bg-blue-500 text-white p-2 md:p-3 rounded-lg max-w-[70%]"><p className="text-sm">Tin nhắn gần nhất: "{conversation.message}"</p></div>
                      </div>
                       <div className="flex items-end gap-2 justify-start">
                           <img src={ conversation.isGroup ? (conversation.participants?.[0]?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.participants?.[0]?.name || 'G')}&background=random`) : (conversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.name)}&background=random`) }
                                className="w-6 h-6 rounded-full object-cover border self-end mb-1 flex-shrink-0" alt="Avatar người gửi"/>
                           <div className="bg-gray-100 text-gray-800 p-2 md:p-3 rounded-lg max-w-[70%]">
                               {conversation.isGroup && <span className="text-xs font-semibold text-purple-700 block mb-1">{conversation.participants?.[0]?.name || 'Thành viên nhóm'}</span>}
                               <p className="text-sm">Đây là tin nhắn mẫu.</p>
                           </div>
                       </div>
                       {/* Placeholder scroll content */}
                       {[...Array(10)].map((_, i) => (
                           <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                               {i % 2 !== 0 && <img src={`https://ui-avatars.com/api/?name=${String.fromCharCode(65 + i)}&background=random`} className="w-6 h-6 rounded-full object-cover border self-end mb-1 flex-shrink-0" alt="Avatar" />}
                               <div className={`${i % 2 === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'} p-2 md:p-3 rounded-lg max-w-[70%]`}>
                                   <p className="text-sm">Tin nhắn số {i + 1}.</p>
                               </div>
                           </div>
                       ))}
                  </div>
                   {/* Input Area */}
                  <div className="p-3 md:p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                      <div className="flex items-center gap-2">
                          <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"><FaceIcon width="20" height="20" /></button>
                          <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"><Link2Icon width="20" height="20" /></button>
                          <input type="text" placeholder="Nhập tin nhắn..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                                 onKeyDown={(e) => { if(e.key === 'Enter' && messageInput.trim()) { alert('Gửi: ' + messageInput); setMessageInput(''); } }}
                                 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow text-sm"/>
                          <button onClick={() => { if(messageInput.trim()) { alert('Gửi: ' + messageInput); setMessageInput(''); } }} disabled={!messageInput.trim()}
                                  className={`p-2 rounded-full transition-colors duration-150 ${messageInput.trim() ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                                  aria-label="Gửi tin nhắn">
                              <PaperPlaneIcon width="20" height="20" />
                          </button>
                      </div>
                  </div>
             </div>

             {/* Info Panel (Only for Groups) */}
             {conversation.isGroup && (
                  <div className={`absolute top-0 right-0 h-full bg-white border-l border-gray-200 shadow-lg transition-transform duration-300 ease-in-out transform ${showInfoPanel ? 'translate-x-0' : 'translate-x-full'} w-full md:w-[300px] flex flex-col`}>
                       <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                           <h3 className="text-base font-semibold text-gray-700">Thông tin đoạn chat</h3>
                           <button onClick={() => setShowInfoPanel(false)} aria-label="Đóng thông tin"
                                   className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors cursor-pointer">
                               <Cross2Icon width="20" height="20" />
                           </button>
                       </div>
                       <div className="flex-1 overflow-y-auto p-4 space-y-6">
                           {/* Participants List */}
                            <div className="border-b pb-4">
                                <h4 className="text-sm font-semibold text-gray-600 mb-3"><PersonIcon className="inline-block mr-1 mb-0.5" />{conversation.participants?.length || 0} Thành viên</h4>
                                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {conversation.participants?.map(p => (
                                        <li key={p.id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-2">
                                                <img src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&size=32`} alt={p.name} className="w-7 h-7 rounded-full object-cover"/>
                                                <span className="text-sm text-gray-700">{p.name} {p.id === currentUser?.id ? '(Bạn)' : ''}</span>
                                            </div>
                                             {isCurrentUserAdmin && p.id !== currentUser?.id && (
                                                 <button onClick={() => alert(`Xóa thành viên: ${p.name}`)} aria-label={`Xóa ${p.name}`}
                                                         className="p-1 text-gray-400 cursor-pointer hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
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
                           {/* Shared Files/Images */}
                           <div className="border-b pb-4">
                               <h4 className="text-sm font-semibold text-gray-600 mb-2"><Link2Icon className="inline-block mr-1 mb-0.5" /> File & Ảnh đã gửi</h4>
                               <div className="text-center text-gray-400 text-xs italic py-4">(Khu vực hiển thị ảnh/file)</div>
                               <div className="grid grid-cols-4 gap-2">
                                   {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-200 h-14 rounded flex items-center justify-center text-gray-400 text-xs">Ảnh {i+1}</div>)}
                               </div>
                           </div>
                           {/* Admin Actions Placeholder */}
                           {isCurrentUserAdmin && (
                               <div className="border-b pb-4">
                                   <h4 className="text-sm font-semibold text-gray-600 mb-2">Phân quyền (Admin Only)</h4>
                                   <p className="text-xs text-gray-500">Admin có thể quản lý quyền...</p>
                               </div>
                           )}
                           {/* Group Actions */}
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
             )}
         </div>
     </div>
  );

  return (
    <div className="flex flex-col h-full">
       {/* Header */}
       <div className="flex justify-between items-center mb-4 pb-3 border-b flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-purple-600">
             Danh sách Chat
          </h2>
          {/* Add other header elements if needed */}
       </div>

        {/* Conditional Rendering based on viewMode */}
        <div className="flex-1 overflow-hidden">
            {viewMode === 'list' ? renderListView() : (selectedConversation ? renderDetailView(selectedConversation) : renderListView())}
            {/* Fallback to list view if detail is selected but conversation is null */}
        </div>
    </div>
  );
};

export default ChatTabContent;