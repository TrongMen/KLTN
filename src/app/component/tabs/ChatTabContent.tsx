"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  Cross2Icon,
  InfoCircledIcon,
  PaperPlaneIcon,
  FaceIcon,
  Link2Icon,
  PersonIcon,
  TrashIcon,
  PlusIcon,
  ExitIcon,
} from "@radix-ui/react-icons";
import {
  User as MainUserType,
  Conversation as MainConversationType,
  Role,
  Participant,
} from "../homeuser";

interface ApiGroupChatListItem {
  id: string;
  name: string;
  eventId: string | null;
  groupLeaderId: string | null;
  memberIds: string[] | null;
  status: string | null;
}

interface ApiGroupChatDetail {
  id: string;
  name: string;
  eventId: string | null;
  groupLeaderId: string | null;
  memberIds: string[];
  status: string | null;
}

interface ApiUserDetail {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
    roles: Role[];
    avatar: string | null;
    email: string | null;
    gender: boolean | null;
}


interface ChatTabContentProps {
  currentUser: MainUserType | null;
}

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "primary" | "danger";
}

function ConfirmationDialog({
    isOpen, title, message, onConfirm, onCancel,
    confirmText = "Xác nhận", cancelText = "Hủy bỏ", confirmVariant = "primary"
}: ConfirmationDialogProps) {
    if (!isOpen) return null;
    const confirmButtonClasses = useMemo(() => {
        let base = "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
        if (confirmVariant === "danger") {
            base += "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
        } else {
            base += "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
        }
        return base;
    }, [confirmVariant]);
    const cancelButtonClasses = "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300 ease-out" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby="dialog-title" >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 ease-out scale-100" onClick={(e) => e.stopPropagation()} >
                <h3 id="dialog-title" className={`text-lg font-bold mb-3 ${confirmVariant === "danger" ? "text-red-700" : "text-gray-800"}`} >{title}</h3>
                <div className="text-sm text-gray-600 mb-5">{message}</div>
                <div className="flex gap-3">
                    <button onClick={onCancel} className={cancelButtonClasses}>{cancelText}</button>
                    <button onClick={onConfirm} className={confirmButtonClasses}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
}


const ChatTabContent: React.FC<ChatTabContentProps> = ({ currentUser }) => {
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedConversation, setSelectedConversation] =
    useState<MainConversationType | null>(null);
  const [conversations, setConversations] = useState<MainConversationType[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [errorConversations, setErrorConversations] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [participantSearchTerm, setParticipantSearchTerm] = useState("");

  const [removeConfirmationState, setRemoveConfirmationState] = useState<{
        isOpen: boolean;
        memberToRemove: Participant | null;
        onConfirm: (() => void) | null;
        onCancel: () => void;
    }>({ isOpen: false, memberToRemove: null, onConfirm: null, onCancel: () => {} });


  const fetchConversations = useCallback(async () => {
    if (!currentUser?.id) {
      setErrorConversations("Thông tin người dùng không hợp lệ.");
      setIsLoadingConversations(false);
      setConversations([]);
      return;
    }
    setIsLoadingConversations(true);
    setErrorConversations(null);
    const userId = currentUser.id;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Yêu cầu xác thực.");
      const url = `http://localhost:8080/identity/api/events/group-chats/user/${userId}`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

      if (!response.ok) {
        let errorMsg = `Lỗi ${response.status}`;
        try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();

      if (data.code === 1000 && Array.isArray(data.result)) {
        const groupChats: MainConversationType[] = data.result.map(
          (group: ApiGroupChatListItem) => ({
            id: group.id,
            name: group.name,
            isGroup: true,
            groupLeaderId: group.groupLeaderId,
            message: "...",
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random&font-size=0.4`,
            participants: [],
          })
        );
        setConversations(groupChats);
      } else {
        throw new Error(data.message || "Định dạng dữ liệu danh sách không hợp lệ");
      }
    } catch (error: any) {
      console.error("Lỗi tải danh sách nhóm chat:", error);
      setErrorConversations(error.message || "Lỗi tải danh sách trò chuyện.");
      toast.error(error.message || "Lỗi tải danh sách trò chuyện.");
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchGroupChatDetails = useCallback(async (groupId: string) => {
    if (!groupId || !currentUser?.id) return;
    setIsLoadingDetails(true);
    setParticipantSearchTerm("");
    const currentSummary = conversations.find(c => c.id === groupId);
    setSelectedConversation(currentSummary || null);

    let groupDetails: ApiGroupChatDetail | null = null;
    const userDetailsMap = new Map<string, ApiUserDetail>();

    try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Yêu cầu xác thực.");

        const groupUrl = `http://localhost:8080/identity/api/events/group-chats/${groupId}`;
        const groupResponse = await fetch(groupUrl, { headers: { Authorization: `Bearer ${token}` } });
        if (!groupResponse.ok) {
            let errorMsg = `Lỗi lấy chi tiết nhóm (${groupResponse.status})`;
            try { const errData = await groupResponse.json(); errorMsg = errData.message || errorMsg; } catch(e){}
            throw new Error(errorMsg);
        }
        const groupData = await groupResponse.json();
        if (groupData.code !== 1000 || !groupData.result) {
            throw new Error(groupData.message || "Không lấy được chi tiết nhóm chat.");
        }
        groupDetails = groupData.result;

        const allParticipantIds = new Set<string>(groupDetails.memberIds || []);
        if (groupDetails.groupLeaderId) {
            allParticipantIds.add(groupDetails.groupLeaderId);
        }

        const participantPromises = Array.from(allParticipantIds).map(async (userId) => {
            try {
                const userUrl = `http://localhost:8080/identity/users/notoken/${userId}`;
                const userResponse = await fetch(userUrl);
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    if (userData.code === 1000 && userData.result) {
                        return { status: 'fulfilled', value: userData.result as ApiUserDetail };
                    } else {
                        console.warn(`Dữ liệu không hợp lệ cho user ${userId}:`, userData.message || `code ${userData.code}`);
                        return { status: 'rejected', reason: `Invalid data for user ${userId}` };
                    }
                } else {
                     console.warn(`Lỗi ${userResponse.status} khi fetch user ${userId}`);
                    return { status: 'rejected', reason: `Failed to fetch user ${userId}` };
                }
            } catch (err) {
                 console.error(`Lỗi nghiêm trọng khi fetch user ${userId}:`, err);
                return { status: 'rejected', reason: `Error fetching user ${userId}` };
            }
        });

        const results = await Promise.allSettled(participantPromises);

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.status === 'fulfilled') {
                userDetailsMap.set(result.value.value.id, result.value.value);
            } else if (result.status === 'fulfilled' && result.value.status === 'rejected'){
                 console.warn(`Workspace rejected for a user: ${result.value.reason}`);
            } else if (result.status === 'rejected') {
                 console.error(`Promise rejected for a user fetch: ${result.reason}`);
            }
        });

        const finalParticipantList: Participant[] = [];
        allParticipantIds.forEach(userId => {
            const userDetail = userDetailsMap.get(userId);
            let participantName: string;
            let participantAvatar: string | null = null;

            if (userId === currentUser.id) {
                 participantName = `${currentUser.lastName || ''} ${currentUser.firstName || ''}`.trim() || `Bạn (${currentUser.id.substring(0,4)}...)`;
                 participantAvatar = currentUser.avatar || userDetail?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.firstName || '?')}&background=random&size=32`;
            } else if (userDetail) {
                const fetchedName = `${userDetail.lastName || ''} ${userDetail.firstName || ''}`.trim();
                participantName = fetchedName || userDetail.username || `User (${userId.substring(0, 4)}...)`;
                participantAvatar = userDetail.avatar;
            } else {
                 participantName = `User (${userId.substring(0, 4)}...)`;
                 participantAvatar = `https://ui-avatars.com/api/?name=?&background=random&size=32`;
            }

            finalParticipantList.push({
                id: userId,
                name: participantName,
                avatar: participantAvatar,
            });
        });

        setSelectedConversation(prev => ({
          ...(prev || {} as MainConversationType),
          id: groupDetails!.id,
          name: groupDetails!.name,
          isGroup: true,
          groupLeaderId: groupDetails!.groupLeaderId,
          participants: finalParticipantList,
          message: prev?.message || "...",
        }));

    } catch (error: any) {
      console.error(`Lỗi tải chi tiết nhóm chat ${groupId}:`, error);
      toast.error(`Lỗi tải chi tiết nhóm: ${error.message}`);
      setSelectedConversation(currentSummary || null);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [conversations, currentUser]);

  const handleRemoveMember = useCallback(async (groupId: string | number, memberIdToRemove: string, leaderId: string) => {
      if (!groupId || !memberIdToRemove || !leaderId) {
          toast.error("Thiếu thông tin để xóa thành viên.");
          return;
      }
      setIsProcessingAction(true);
      const loadingToastId = toast.loading("Đang xóa thành viên...");

      try {
          const token = localStorage.getItem("authToken");
          if (!token) throw new Error("Yêu cầu xác thực.");

          const url = `http://localhost:8080/identity/api/events/group-chats/${groupId}/members/${memberIdToRemove}?leaderId=${leaderId}`;

          const response = await fetch(url, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
          });

          if (!response.ok) {
              let errorMsg = `Lỗi ${response.status}`;
              try {
                  const errData = await response.json();
                  errorMsg = errData.message || errorMsg;
              } catch (e) {}
              throw new Error(errorMsg);
          }

          toast.success("Xóa thành viên thành công!", { id: loadingToastId });

          setSelectedConversation(prev => {
              if (!prev || !prev.participants) return prev;
              return {
                  ...prev,
                  participants: prev.participants.filter(p => p.id !== memberIdToRemove)
              };
          });

           setRemoveConfirmationState({ isOpen: false, memberToRemove: null, onConfirm: null, onCancel: () => {} });

      } catch (error: any) {
          console.error("Lỗi xóa thành viên:", error);
          toast.error(`Xóa thất bại: ${error.message}`, { id: loadingToastId });
      } finally {
          setIsProcessingAction(false);
      }

  }, []);

 const closeRemoveConfirmationDialog = useCallback(() => {
     setRemoveConfirmationState({ isOpen: false, memberToRemove: null, onConfirm: null, onCancel: () => {} });
 }, []);


 const confirmRemoveMember = (member: Participant) => {
      if (!selectedConversation || !currentUser || typeof selectedConversation.id !== 'string') return;
      const groupId = selectedConversation.id;
      const leaderId = currentUser.id;

      setRemoveConfirmationState({
          isOpen: true,
          memberToRemove: member,
          onConfirm: () => handleRemoveMember(groupId, member.id, leaderId),
          onCancel: closeRemoveConfirmationDialog,
      });
  };

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return conversations.filter((conv) =>
      conv.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm, conversations]);

   // *** Di chuyển useMemo của filteredParticipants ra cấp cao nhất ***
   const filteredParticipants = useMemo(() => {
    if (!selectedConversation?.participants) return [];
    if (!participantSearchTerm.trim()) {
        return selectedConversation.participants;
    }
    const lowerCaseSearch = participantSearchTerm.toLowerCase();
    // Cần đảm bảo p.name không phải là null/undefined trước khi gọi toLowerCase
    return selectedConversation.participants.filter(p =>
        p.name?.toLowerCase().includes(lowerCaseSearch)
    );
    }, [selectedConversation?.participants, participantSearchTerm]);


  const handleSelectConversation = useCallback((conversation: MainConversationType) => {
    setViewMode("detail");
    setShowInfoPanel(false);
    setMessageInput("");
    setParticipantSearchTerm("");
    if (conversation.isGroup && typeof conversation.id === 'string') {
      fetchGroupChatDetails(conversation.id);
    } else {
      setSelectedConversation(conversation);
      setIsLoadingDetails(false);
    }
  }, [fetchGroupChatDetails]);

  const handleGoBackToList = () => {
    setViewMode("list");
    setSelectedConversation(null);
  };

  const getParticipantInfo = (conversation: MainConversationType | null) => {
    if (!conversation?.isGroup) return null;
    if (isLoadingDetails && (!conversation.participants || conversation.participants.length === 0)) {
      return <p className="text-xs text-gray-500 truncate mt-0.5">Đang tải thành viên...</p>;
    }
    if (!conversation.participants || conversation.participants.length === 0) {
      return <p className="text-xs text-gray-500 truncate mt-0.5">(Chưa có thông tin thành viên)</p>;
    }

    const count = conversation.participants.length;
    const namesToShow = conversation.participants.slice(0, 3).map(p => p.name).join(", ");
    const remainingCount = count - 3;

    return (
      <p className="text-xs text-gray-500 truncate mt-0.5 cursor-pointer hover:underline" onClick={() => {setShowInfoPanel(true); setParticipantSearchTerm('');}}>
        {count} thành viên: {namesToShow}
        {remainingCount > 0 && ` và ${remainingCount} người khác`}
      </p>
    );
  };

  const renderListView = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"><MagnifyingGlassIcon width="16" height="16" /></span>
          <input type="text" placeholder="Tìm kiếm theo tên nhóm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      </div>
      <ul className="space-y-1 p-3 overflow-y-auto flex-1 bg-gray-50">
        {isLoadingConversations ? (
          <p className="text-center text-gray-500 py-6 italic">Đang tải danh sách...</p>
        ) : errorConversations ? (
          <p className="text-center text-red-500 py-6">{errorConversations}</p>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => (
            <li key={conv.id} onClick={() => handleSelectConversation(conv)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectConversation(conv); }}>
              <img src={conv.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.name)}&background=random`} alt={`Avatar của ${conv.name}`} className="w-11 h-11 rounded-full object-cover flex-shrink-0 border" />
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-700">{conv.name}</p>
                <p className="text-xs text-gray-500 truncate group-hover:text-gray-700">{conv.message}</p>
              </div>
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500 py-6 italic">{searchTerm ? 'Không tìm thấy nhóm chat nào.' : 'Không có nhóm chat nào.'}</p>
        )}
      </ul>
    </div>
  );

  const renderDetailView = (conversation: MainConversationType) => {
    const isLeader = conversation.isGroup && currentUser?.id === conversation.groupLeaderId;

    const getParticipantDisplayName = (participant: Participant) => {
        const isCurrentUser = participant.id === currentUser?.id;
        const isGroupLeader = participant.id === conversation.groupLeaderId;
        let displayName = participant.name;

        if (isGroupLeader && isCurrentUser) {
            return `${displayName} (Trưởng nhóm, Bạn)`;
        } else if (isGroupLeader) {
            return `${displayName} (Trưởng nhóm)`;
        } else if (isCurrentUser) {
            return `${displayName} (Bạn)`;
        } else {
            return displayName;
        }
    };


    return (
      <div className="flex-1 flex flex-col overflow-hidden relative h-full">
        <div className="flex justify-between items-center p-3 md:p-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button onClick={handleGoBackToList} aria-label="Quay lại" className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 cursor-pointer"><ChevronLeftIcon width="24" height="24" /></button>
            <img src={conversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.name)}&background=random${conversation.isGroup ? '&font-size=0.4' : ''}`} alt={conversation.name} className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-semibold truncate">{conversation.name}</h2>
              {conversation.isGroup && getParticipantInfo(conversation)}
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {conversation.isGroup && (
              <button onClick={() => {setShowInfoPanel(!showInfoPanel); setParticipantSearchTerm('');}} aria-label="Thông tin" className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-200 cursor-pointer"><InfoCircledIcon width="22" height="22" /></button>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className={`flex-1 flex flex-col transition-all duration-300 ${showInfoPanel ? 'w-full md:w-[calc(100%-300px)]' : 'w-full'}`}>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white min-h-[400px]">
               { (!conversation.messages || conversation.messages.length === 0) && (
                     <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 italic">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                             <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                         </svg>
                        Chưa có tin nhắn nào. <br/> Bắt đầu cuộc trò chuyện!
                     </div>
                )}
            </div>
            <div className="p-3 md:p-4 border-t bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer"><Link2Icon width="20" height="20" /></button>
                <input type="text" placeholder="Nhập tin nhắn..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && messageInput.trim()) { /* send */ setMessageInput(''); } }} className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer"><FaceIcon width="20" height="20" /></button>
                <button onClick={() => { if(messageInput.trim()) { /* send */ setMessageInput(''); } }} disabled={!messageInput.trim()} className={`p-2 rounded-full ${messageInput.trim() ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} aria-label="Gửi"><PaperPlaneIcon width="20" height="20" /></button>
              </div>
            </div>
          </div>

          {conversation.isGroup && (
            <div className={`absolute top-0 right-0 h-full bg-white border-l shadow-lg transition-transform duration-300 transform ${showInfoPanel ? 'translate-x-0' : 'translate-x-full'} w-full md:w-[400px] flex flex-col`}>
              <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                <h3 className="text-base font-semibold">Thông tin</h3>
                <button onClick={() => setShowInfoPanel(false)} aria-label="Đóng" className="text-gray-400 cursor-pointer hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"><Cross2Icon width="20" height="20" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col">
                {isLoadingDetails ? (
                  <div className="flex justify-center items-center py-10 text-gray-500">
                     <span className="animate-spin mr-2">⏳</span> Đang tải...
                  </div>
                ) : (
                  <>
                    <div className="border-b pb-4 flex flex-col flex-grow">
                        <div className="flex justify-between items-center mb-2">
                             <h4 className="text-sm font-semibold text-gray-600"><PersonIcon className="inline mr-1 mb-0.5" />{filteredParticipants?.length || 0} Thành viên</h4>
                        </div>

                        <div className="relative mb-3">
                            <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
                                <MagnifyingGlassIcon width="14" height="14" />
                            </span>
                            <input
                                type="text"
                                placeholder="Tìm thành viên..."
                                value={participantSearchTerm}
                                onChange={(e) => setParticipantSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-sm"
                            />
                        </div>

                      <ul className="space-y-2 overflow-y-auto pr-1 flex-grow min-h-[8rem] max-h-48">
                        {filteredParticipants.length > 0 ? (
                             filteredParticipants.map(p => (
                              <li key={p.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={p.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random&size=32`} alt={p.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0"/>
                                  <span className="text-sm text-gray-700 truncate">{getParticipantDisplayName(p)}</span>
                                </div>
                                 {isLeader && p.id !== currentUser?.id && (
                                   <button
                                        onClick={() => confirmRemoveMember(p)}
                                        disabled={isProcessingAction}
                                        aria-label={`Xóa ${p.name}`}
                                        className={`p-1 text-gray-400 cursor-pointer hover:text-red-600 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                                    >
                                        <TrashIcon width="16" height="16" />
                                   </button>
                                 )}
                              </li>
                             ))
                            ) : (
                            <li className="text-center text-xs text-gray-400 italic py-4">Không tìm thấy thành viên.</li>
                        )}
                      </ul>
                      {isLeader && (
                        <button onClick={() => toast.error('Chức năng thêm thành viên chưa được cài đặt.')} className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 cursor-pointer"><PlusIcon /> Thêm thành viên</button>
                      )}
                    </div>
                    <div className="border-b pb-4">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2"><Link2Icon className="inline mr-1 mb-0.5" /> File & Ảnh</h4>
                      <div className="text-center text-gray-400 text-xs italic py-4">(Chưa có)</div>
                    </div>
                    <div className="mt-auto pt-4">
                      {!isLeader && conversation.isGroup && currentUser && (
                           <button onClick={() => toast.error('Chức năng rời nhóm chưa được cài đặt.')} className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 font-medium mb-3"><ExitIcon /> Rời khỏi nhóm</button>
                      )}
                      {isLeader && (
                        <button onClick={() => toast.error('Chức năng giải tán nhóm chưa được cài đặt.')} className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded border border-red-700 font-medium cursor-pointer"><TrashIcon /> Giải tán nhóm</button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

       <ConfirmationDialog
            isOpen={removeConfirmationState.isOpen}
            title="Xác nhận xóa thành viên"
            message={
                <>
                    Bạn có chắc chắn muốn xóa thành viên{' '}
                    <strong>{removeConfirmationState.memberToRemove?.name}</strong> khỏi nhóm chat này không?
                </>
            }
            confirmText="Xóa"
            cancelText="Hủy bỏ"
            confirmVariant="danger"
            onConfirm={removeConfirmationState.onConfirm || (() => {})}
            onCancel={removeConfirmationState.onCancel}
        />
      </div>
    );
  };

   return (
     <div className="flex flex-col h-full">
       <div className="flex justify-between items-center mb-4 pb-3 border-b flex-shrink-0">
         <h2 className="text-xl md:text-2xl font-bold text-purple-600">
           Danh sách Chat
         </h2>
       </div>
       <div className="flex-1 overflow-hidden">
         {viewMode === 'list'
           ? renderListView()
           : selectedConversation
           ? renderDetailView(selectedConversation)
           : renderListView()}
       </div>
     </div>
   );
};

export default ChatTabContent;