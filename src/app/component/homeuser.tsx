// UserHome.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./menu";
import ContactModal from "./modals/ContactModal";
import AboutModal from "./modals/AboutModal";
import HomeTabContent from "./tabs/HomeTabContent";
import MyEventsTabContent from "./tabs/MyEventsTabContent";
import AttendeesTabContent from "./tabs/AttendeesTabContent";
import MembersTabContent from "./tabs/MembersTabContent";
import ChatTabContent from "./tabs/ChatTabContent";
import CreateEventTabContent from "./tabs/CreateEventTabContent";
import MyNewsTabContent from "./tabs/MyNewsTabContent";
import NewsTabContent from "./tabs/NewsTabContent";
import CreateNewsModal, { NewsFormData } from "./modals/CreateNewsModal";
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";
import { ConfirmationDialog } from "../../utils/ConfirmationDialog";
import NotificationDropdown, { NotificationItem } from "./NotificationDropdown";
import { BellIcon } from "@radix-ui/react-icons";

import {
  Role,
  User,
  EventDisplayInfo,
  NewsItem,
} from "./types/appTypes";

import {
  ChatMessageNotificationPayload, // Đã được cập nhật ở file ChatTabContentTypes.ts
  MainConversationType,
  Message,
  ApiUserDetail,
  ApiGroupChatListItem,
  ApiGroupChatDetail,
  Participant as ChatParticipant,
} from "./tabs/chat/ChatTabContentTypes";
import { initializeSocket, disconnectSocket,getSocket, } from "../../socket/socketService";

type ActiveTab =
  | "home"
  | "news"
  | "myNews"
  | "createEvent"
  | "myEvents"
  | "attendees"
  | "registeredEvents"
  | "members"
  | "chatList";

export default function UserHome() {
  const [search, setSearch] = useState("");
  const [allEvents, setAllEvents] = useState<EventDisplayInfo[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(true);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingRegisteredIds, setIsLoadingRegisteredIds] =
    useState<boolean>(true);
  const [createdEventIds, setCreatedEventIds] = useState<Set<string>>(
    new Set()
  );
  const [isLoadingCreatedEventIds, setIsLoadingCreatedEventIds] =
    useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<EventDisplayInfo | null>(
    null
  );
  const [isRegistering, setIsRegistering] = useState<string | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [errorNews, setErrorNews] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState("date");
  const [timeFilterOption, setTimeFilterOption] = useState("all");
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
    onCancel?: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] =
    useState<boolean>(false);
  const [errorNotifications, setErrorNotifications] = useState<string | null>(
    null
  );
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState<boolean>(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationContainerRef = useRef<HTMLDivElement>(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [isSubmittingNews, setIsSubmittingNews] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsItem | null>(null);
  const initializedRef = useRef(false);
  const router = useRouter();
  const { refreshToken } = useRefreshToken();
  const [
    globalChatPayloadForTab,
    setGlobalChatPayloadForTab,
  ] = useState<ChatMessageNotificationPayload | null>(null);

  const [chatUserCache, setChatUserCache] = useState<Record<string, ApiUserDetail>>({});
  const [chatConversations, setChatConversations] = useState<MainConversationType[]>([]);
  const [isLoadingChatConversations, setIsLoadingChatConversations] = useState<boolean>(true);
  const [errorChatConversations, setErrorChatConversations] = useState<string | null>(null);
  const [selectedChatConversation, setSelectedChatConversation] = useState<MainConversationType | null>(null);
  const [isLoadingChatDetails, setIsLoadingChatDetails] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoadingChatMessages, setIsLoadingChatMessages] = useState<boolean>(false);
  const [errorChatMessages, setErrorChatMessages] = useState<string | null>(null);
  const [chatMediaMessages, setChatMediaMessages] = useState<Message[]>([]);
  const [chatFileMessages, setChatFileMessages] = useState<Message[]>([]);
  const [chatAudioMessages, setChatAudioMessages] = useState<Message[]>([]);
  const [isLoadingChatMedia, setIsLoadingChatMedia] = useState<boolean>(false);
  const [isLoadingChatFiles, setIsLoadingChatFiles] = useState<boolean>(false);
  const [isLoadingChatAudio, setIsLoadingChatAudio] = useState<boolean>(false);
  const [errorChatMedia, setErrorChatMedia] = useState<string | null>(null);
  const [errorChatFiles, setErrorChatFiles] = useState<string | null>(null);
  const [errorChatAudio, setErrorChatAudio] = useState<string | null>(null);
  const [isProcessingChatAction, setIsProcessingChatAction] = useState<boolean>(false);
  const [downloadingChatFileId, setDownloadingChatFileId] = useState<string | null>(null);

  // ... (GIỮ NGUYÊN CÁC HÀM fetchChatUserDetailsWithCache, getChatDisplayName, và các hàm fetch API khác)
  // ... (fetchChatConversationsAPI, fetchChatMessagesAPI, etc.)
  const fetchChatUserDetailsWithCache = useCallback(async (userId: string, token: string | null): Promise<ApiUserDetail | null> => { 
    if (chatUserCache[userId]) { 
      return chatUserCache[userId]; 
    } 
    if (!token && !user?.id) { 
        return null; 
    } 
    const effectiveToken = token || localStorage.getItem("authToken"); 
    if(!effectiveToken) { 
        return null; 
    } 
    try { 
      const userUrl = `http://localhost:8080/identity/users/notoken/${userId}`; 
      const userRes = await fetch(userUrl, { 
          headers: { Authorization: `Bearer ${effectiveToken}` } 
      }); 
      if (userRes.ok) { 
        const userData = await userRes.json(); 
        if (userData.code === 1000 && userData.result) { 
          const userDetail = userData.result as ApiUserDetail; 
          setChatUserCache(prev => ({ ...prev, [userId]: userDetail })); 
          return userDetail; 
        } 
      } 
    } catch (err) { 
    } 
    return null; 
  }, [chatUserCache, user?.id]); 

  const getChatDisplayName = useCallback((detail: ApiUserDetail | ChatParticipant | null, fallbackName?: string): string => { 
    if (!detail) return fallbackName || "Người dùng không xác định"; 
    if ('firstName' in detail || 'lastName' in detail) { 
        const apiDetail = detail as ApiUserDetail; 
        const fullName = `${apiDetail.lastName || ""} ${apiDetail.firstName || ""}`.trim(); 
        return fullName || apiDetail.username || fallbackName || `User (${String(apiDetail.id).substring(0,4)})`; 
    } else if ('name' in detail && 'id' in detail && typeof detail.id !== 'undefined') { // Ensure it's ChatParticipant 
        const participantDetail = detail as ChatParticipant; 
        return participantDetail.name || fallbackName || `User (${String(participantDetail.id).substring(0,4)})`; 
    } 
    return fallbackName || "Người dùng không xác định"; 
  }, []); 


  const fetchChatConversationsAPI = useCallback(async () => { 
    if (!user?.id) { 
      setErrorChatConversations("Thông tin người dùng không hợp lệ."); 
      setIsLoadingChatConversations(false); 
      setChatConversations([]); 
      return; 
    } 
    setIsLoadingChatConversations(true); 
    setErrorChatConversations(null); 
    const userId = user.id; 
    let token: string | null = null; 
    try { 
      token = localStorage.getItem("authToken"); 
      if (!token) throw new Error("Yêu cầu xác thực."); 

      const listUrl = `http://localhost:8080/identity/api/events/group-chats/user/${userId}`; 
      const listResponse = await fetch(listUrl, { 
        headers: { Authorization: `Bearer ${token}` }, 
      }); 
      if (!listResponse.ok) 
        throw new Error(`Lỗi ${listResponse.status} khi tải danh sách nhóm.`); 
      const listData = await listResponse.json(); 
      if (listData.code !== 1000 || !Array.isArray(listData.result)) { 
        throw new Error( 
          listData.message || "Dữ liệu danh sách nhóm không hợp lệ." 
        ); 
      } 

      const groupBaseInfo: { 
        id: string; name: string; groupLeaderId: string | null; avatar: string; 
      }[] = listData.result.map((g: ApiGroupChatListItem) => ({ 
        id: g.id, 
        name: g.name, 
        groupLeaderId: g.groupLeaderId, 
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=random&font-size=0.4`, 
      })); 

      if (groupBaseInfo.length === 0) { 
        setChatConversations([]); 
        setIsLoadingChatConversations(false); 
        return; 
      } 
      const tempUserCacheForConversations: Record<string, ApiUserDetail> = {}; 
      const conversationPromises = groupBaseInfo.map(async (groupInfo) => { 
        let lastMessageContent = "Chưa có tin nhắn"; 
        let sentAt: string | undefined = undefined; 
        let lastMessageSenderId: string | undefined = undefined; 
        let lastMessageSenderNameDisplay: string | undefined = undefined; 

        try { 
          const messagesUrl = `http://localhost:8080/identity/api/events/${groupInfo.id}/messages?page=0&size=1&sort=sentAt,desc`; 
          const messagesResponse = await fetch(messagesUrl, { 
            headers: { Authorization: `Bearer ${token!}` }, 
          }); 
          if (messagesResponse.ok) { 
            const messagesData = await messagesResponse.json(); 
            const messagesResult = messagesData.result?.content || messagesData.result; 
            if (messagesData.code === 1000 && Array.isArray(messagesResult) && messagesResult.length > 0) { 
              const lastMessage = messagesResult[0] as Message; 
              lastMessageContent = lastMessage.content ?? `Đã gửi: ${lastMessage.fileName || "File"}`; 
              sentAt = lastMessage.sentAt; 
              lastMessageSenderId = lastMessage.senderId; 

              if (lastMessage.senderId === user.id) { 
                lastMessageSenderNameDisplay = "Bạn"; 
              } else { 
                let userDetail = tempUserCacheForConversations[lastMessage.senderId] || chatUserCache[lastMessage.senderId]; 
                if (!userDetail && token) { 
                    const fetchedDetail = await fetchChatUserDetailsWithCache(lastMessage.senderId, token); 
                    if (fetchedDetail) { 
                        tempUserCacheForConversations[lastMessage.senderId] = fetchedDetail; 
                        userDetail = fetchedDetail; 
                    } 
                } 
                lastMessageSenderNameDisplay = getChatDisplayName(userDetail, lastMessage.senderName || `User (${lastMessage.senderId.substring(0,4)})`); 
              } 
            } 
          } else { 
              lastMessageContent = "Lỗi tải tin nhắn"; 
          } 
        } catch (err) { 
          lastMessageContent = "Lỗi tải tin nhắn"; 
        } 
        return { 
          id: groupInfo.id, name: groupInfo.name, isGroup: true, groupLeaderId: groupInfo.groupLeaderId, 
          avatar: groupInfo.avatar, participants: [], message: lastMessageContent, sentAt: sentAt, 
          lastMessageSenderId: lastMessageSenderId, lastMessageSenderName: lastMessageSenderNameDisplay, 
        }; 
      }); 

      const resolvedConversations = await Promise.all(conversationPromises); 
        if (Object.keys(tempUserCacheForConversations).length > 0) { 
          setChatUserCache(prev => ({ ...prev, ...tempUserCacheForConversations })); 
        } 

      const sortedChats = resolvedConversations.sort( 
        (a, b) => 
          (b.sentAt ? new Date(b.sentAt).getTime() : 0) - 
          (a.sentAt ? new Date(a.sentAt).getTime() : 0) 
      ); 
      setChatConversations(sortedChats); 
    } catch (error: any) { 
      setErrorChatConversations(error.message || "Lỗi tải danh sách."); 
      toast.error(error.message || "Lỗi tải danh sách."); 
      setChatConversations([]); 
    } finally { 
      setIsLoadingChatConversations(false); 
    } 
  }, [user, fetchChatUserDetailsWithCache, getChatDisplayName, chatUserCache]); 

  const fetchChatMessagesAPI = useCallback(async (groupId: string) => { 
    if (!groupId || !user?.id) return; 
    setIsLoadingChatMessages(true); 
    setErrorChatMessages(null); 
    const token = localStorage.getItem("authToken"); 
    if (!token) { 
      setErrorChatMessages("Yêu cầu xác thực."); 
      setIsLoadingChatMessages(false); 
      toast.error("Yêu cầu xác thực để tải tin nhắn."); 
      return; 
    } 
    try { 
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages`; 
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }); 
      if (!response.ok) { 
        let eMsg = `Lỗi ${response.status}`; 
        try { const errData = await response.json(); eMsg = errData.message || eMsg; } catch { } 
        throw new Error(eMsg); 
      } 
      const data = await response.json(); 
      if (data.code === 1000 && data.result) { 
        let fetchedMessages: Message[] = []; 
        if (Array.isArray(data.result)) fetchedMessages = data.result; 
        else if (data.result.content && Array.isArray(data.result.content)) fetchedMessages = data.result.content; 
        else throw new Error("Định dạng dữ liệu tin nhắn không hợp lệ từ API."); 

        const tempMsgUserCache: Record<string, ApiUserDetail> = {}; 
        const messagesWithSenderNames = await Promise.all( 
          fetchedMessages.map(async (msg) => { 
            if (msg.senderId === user.id) return { ...msg, senderName: "Bạn" }; 
            if (msg.senderName && msg.senderName.includes(" ") && !msg.senderName.startsWith("User (")) return msg; 
            let senderDetail = tempMsgUserCache[msg.senderId] || chatUserCache[msg.senderId] || selectedChatConversation?.participants?.find(p => p.id === msg.senderId); 
            if (!senderDetail && token) { 
                const fetchedDetail = await fetchChatUserDetailsWithCache(msg.senderId, token); 
                if (fetchedDetail) { 
                    tempMsgUserCache[msg.senderId] = fetchedDetail; 
                    senderDetail = fetchedDetail; 
                } 
            } 
            const displayName = getChatDisplayName(senderDetail, msg.senderName || `User (${msg.senderId.substring(0,4)})`); 
            return { ...msg, senderName: displayName }; 
          }) 
        ); 
        if (Object.keys(tempMsgUserCache).length > 0) { 
          setChatUserCache(prev => ({ ...prev, ...tempMsgUserCache })); 
        } 
        const sortedMessages = messagesWithSenderNames.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()); 
        setChatMessages(sortedMessages); 
      } else if (data.code === 1000 && ((Array.isArray(data.result) && data.result.length === 0) || (data.result.content && Array.isArray(data.result.content) && data.result.content.length === 0))) { 
        setChatMessages([]); 
      } else throw new Error(data.message || "Định dạng dữ liệu tin nhắn không hợp lệ"); 
    } catch (error: any) { 
      setErrorChatMessages(error.message || "Lỗi tải tin nhắn."); 
      toast.error(`Lỗi tải tin nhắn: ${error.message}`); 
      setChatMessages([]); 
    } finally { 
      setIsLoadingChatMessages(false); 
    } 
  }, [user, chatUserCache, fetchChatUserDetailsWithCache, getChatDisplayName, selectedChatConversation?.participants]); 


  const fetchGroupChatDetailsAPI = useCallback(async (groupId: string) => { 
    if (!groupId || !user?.id) return; 
    setIsLoadingChatDetails(true); 
    const currentSummary = chatConversations.find(c => String(c.id) === groupId); 
    setSelectedChatConversation(prev => ({ 
        ...(prev || {} as MainConversationType), 
        ...(currentSummary || { id: groupId, name: "Đang tải..." }), 
        id: groupId, 
        participants: prev?.participants || [], 
    })); 

    const token = localStorage.getItem("authToken"); 
    if (!token) { 
      toast.error("Yêu cầu xác thực."); 
      setIsLoadingChatDetails(false); 
      return; 
    } 
    try { 
      const groupUrl = `http://localhost:8080/identity/api/events/group-chats/${groupId}`; 
      const groupResponse = await fetch(groupUrl, { headers: { Authorization: `Bearer ${token}` } }); 
      if (!groupResponse.ok) { 
        let e = `Lỗi ${groupResponse.status}`; 
        try { const d = await groupResponse.json(); e = d.message || e; } catch {} 
        throw new Error(e); 
      } 
      const groupData = await groupResponse.json(); 
      if (groupData.code !== 1000 || !groupData.result) { 
        throw new Error(groupData.message || "Không lấy được chi tiết nhóm."); 
      } 
      const groupDetailsApi = groupData.result as ApiGroupChatDetail; 
      const memberIds = new Set<string>(groupDetailsApi.memberIds || []); 
      if (groupDetailsApi.groupLeaderId) memberIds.add(groupDetailsApi.groupLeaderId); 

      const tempDetailUserCache: Record<string, ApiUserDetail> = {}; 
      const participantPromises = Array.from(memberIds).map(async (id) => { 
          let detail = chatUserCache[id]; 
          if (!detail && token) { 
              const fetched = await fetchChatUserDetailsWithCache(id, token); 
              if(fetched) { 
                  tempDetailUserCache[id] = fetched; 
                  detail = fetched; 
              } 
          } 
          return detail; 
      }); 
      const fetchedUserDetailsArray = (await Promise.all(participantPromises)).filter(Boolean) as ApiUserDetail[]; 
      if(Object.keys(tempDetailUserCache).length > 0) { 
          setChatUserCache(prev => ({ ...prev, ...tempDetailUserCache})); 
      } 

      const finalParticipantList: ChatParticipant[] = Array.from(memberIds).map((id) => { 
        const userDetail = fetchedUserDetailsArray.find(u => u.id === id) || chatUserCache[id]; 
        const name = getChatDisplayName(userDetail, `User (${id.substring(0,4)})`); 
        const avatar = userDetail?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name.charAt(0) || "?")}&background=random&size=32`; 
        return { id, name, avatar }; 
      }); 

      setSelectedChatConversation(prev => ({ 
        ...(prev || {} as MainConversationType), 
        id: groupDetailsApi.id, 
        name: groupDetailsApi.name, 
        isGroup: true, 
        groupLeaderId: groupDetailsApi.groupLeaderId, 
        participants: finalParticipantList, 
        avatar: prev?.avatar || currentSummary?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupDetailsApi.name)}&background=random&font-size=0.4`, 
        message: prev?.message || currentSummary?.message || "...", 
        sentAt: prev?.sentAt || currentSummary?.sentAt, 
        lastMessageSenderId: prev?.lastMessageSenderId || currentSummary?.lastMessageSenderId, 
        lastMessageSenderName: prev?.lastMessageSenderName || currentSummary?.lastMessageSenderName, 
      })); 
    } catch (error: any) { 
      toast.error(`Lỗi tải chi tiết nhóm: ${error.message}`); 
      setSelectedChatConversation(prev => ({ 
          ...(prev || {} as MainConversationType), 
          id: groupId, 
          name: prev?.name || "Lỗi tải tên nhóm", 
          participants: prev?.participants || [], 
      })); 
    } finally { 
      setIsLoadingChatDetails(false); 
    } 
  }, [chatConversations, user, fetchChatUserDetailsWithCache, getChatDisplayName, chatUserCache]); 


  const fetchChatMediaMessagesAPI = useCallback(async (groupId: string) => { 
    if (!groupId) return; setIsLoadingChatMedia(true); setErrorChatMedia(null); 
    try { 
      const token = localStorage.getItem("authToken"); if (!token) throw new Error("Auth required."); 
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/media`; 
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }); 
      if (!res.ok) { let e = `Lỗi ${res.status}`; try { const d = await res.json(); e = d.message || e; } catch {} throw new Error(e); } 
      const data = await res.json(); 
      if (data.code === 1000 && Array.isArray(data.result)) setChatMediaMessages(data.result); 
      else if (data.code === 1000 && Array.isArray(data.result) && data.result.length === 0) setChatMediaMessages([]); 
      else throw new Error(data.message || "Cannot load media list."); 
    } catch (error: any) { setErrorChatMedia(error.message || "Error loading media."); setChatMediaMessages([]); } 
    finally { setIsLoadingChatMedia(false); } 
  }, []); 

  const fetchChatFileMessagesAPI = useCallback(async (groupId: string) => { 
    if (!groupId) return; setIsLoadingChatFiles(true); setErrorChatFiles(null); 
    try { 
      const token = localStorage.getItem("authToken"); if (!token) throw new Error("Auth required."); 
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/files`; 
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }); 
      if (!res.ok) { let e = `Lỗi ${res.status}`; try { const d = await res.json(); e = d.message || e; } catch {} throw new Error(e); } 
      const data = await res.json(); 
      if (data.code === 1000 && Array.isArray(data.result)) setChatFileMessages(data.result); 
      else if (data.code === 1000 && Array.isArray(data.result) && data.result.length === 0) setChatFileMessages([]); 
      else throw new Error(data.message || "Cannot load file list."); 
    } catch (error: any) { setErrorChatFiles(error.message || "Error loading files."); setChatFileMessages([]); } 
    finally { setIsLoadingChatFiles(false); } 
  }, []); 

  const fetchChatAudioMessagesAPI = useCallback(async (groupId: string) => { 
    if (!groupId) return; setIsLoadingChatAudio(true); setErrorChatAudio(null); 
    try { 
      const token = localStorage.getItem("authToken"); if (!token) throw new Error("Auth required."); 
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/audios`; 
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }); 
      if (!res.ok) { let e = `Lỗi ${res.status}`; try { const d = await res.json(); e = d.message || e; } catch {} throw new Error(e); } 
      const data = await res.json(); 
      if (data.code === 1000 && Array.isArray(data.result)) setChatAudioMessages(data.result); 
      else if (data.code === 1000 && Array.isArray(data.result) && data.result.length === 0) setChatAudioMessages([]); 
      else throw new Error(data.message || "Cannot load audio list."); 
    } catch (error: any) { setErrorChatAudio(error.message || "Error loading audio."); setChatAudioMessages([]); } 
    finally { setIsLoadingChatAudio(false); } 
  }, []); 


  const handleRemoveMemberChatAPI = useCallback(async (groupId: string | number, memberId: string, leaderId: string) => { 
    if (!groupId || !memberId || !leaderId) { toast.error("Missing info."); return; } 
    setIsProcessingChatAction(true); const tId = toast.loading("Removing..."); 
    try { 
      const token = localStorage.getItem("authToken"); if (!token) throw new Error("Auth required."); 
      const url = `http://localhost:8080/identity/api/events/group-chats/${groupId}/members/${memberId}?leaderId=${leaderId}`; 
      const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); 
      if (!res.ok) { let e = `Lỗi ${res.status}`; try { const d = await res.json(); e = d.message || e; } catch {} throw new Error(e); } 
      toast.success("Removed!", { id: tId }); 
      fetchGroupChatDetailsAPI(String(groupId)); 
    } catch (error: any) { toast.error(`Failed: ${error.message}`, { id: tId }); } 
    finally { setIsProcessingChatAction(false); } 
  }, [fetchGroupChatDetailsAPI]); 


  const handleLeaveGroupChatAPI = useCallback(async (groupId: string | number, memberId: string) => { 
    if (!groupId || !memberId) { toast.error("Missing info."); return; } 
    setIsProcessingChatAction(true); const tId = toast.loading("Leaving..."); 
    try { 
      const token = localStorage.getItem("authToken"); if (!token) throw new Error("Auth required."); 
      const url = `http://localhost:8080/identity/api/events/group-chats/${groupId}/leave?memberId=${memberId}`; 
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } }); 
      if (!res.ok) { let e = `Lỗi ${res.status}`; try { const d = await res.json(); e = d.message || e; } catch {} throw new Error(e); } 
      toast.success("Left group!", { id: tId }); 
      setChatConversations(prev => prev.filter(c => String(c.id) !== String(groupId))); 
      setSelectedChatConversation(null); 
    } catch (error: any) { toast.error(`Failed: ${error.message}`, { id: tId }); } 
    finally { setIsProcessingChatAction(false); } 
  }, []); 


  const handleSendMessageChatAPI = useCallback(async (groupId: string, senderId: string, messageText: string, tempMessageId: string): Promise<Message | null> => { 
    setIsProcessingChatAction(true); 
    try { 
        const token = localStorage.getItem("authToken"); if (!token) throw new Error("Auth required."); 
        if (!groupId) throw new Error("Group ID không tồn tại."); 
        const url = `http://localhost:8080/identity/api/events/${groupId}/messages`; 
        const form = new FormData(); form.append("senderId", senderId); form.append("content", messageText); 
        const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }); 
        const data = await res.json(); 
        if (!res.ok) { let e = `Lỗi ${res.status}`; e = data.message || e; throw new Error(e); } 
        if (!(data.code === 1000 && data.result && data.result.id)) { 
            throw new Error(data.message || "Gửi thất bại, không có dữ liệu tin nhắn trả về hợp lệ."); 
        } 
        const actualMessageFromServer = { ...data.result, senderName: "Bạn" } as Message; 

        setChatConversations((prevList) => { 
            const idx = prevList.findIndex((c) => String(c.id) === String(groupId)); 
            if (idx === -1) return prevList; 
            const updatedConvo = { 
              ...prevList[idx], 
              message: actualMessageFromServer.content ?? `Đã gửi: ${actualMessageFromServer.fileName || "File"}`, 
              sentAt: actualMessageFromServer.sentAt, 
              lastMessageSenderId: actualMessageFromServer.senderId, 
              lastMessageSenderName: "Bạn", 
            }; 
            const newList = prevList.filter(c => String(c.id) !== String(groupId)); 
            newList.unshift(updatedConvo); 
            return newList.sort((a, b) => (new Date(b.sentAt || 0).getTime()) - (new Date(a.sentAt || 0).getTime()));
        }); 
        return actualMessageFromServer; 
    } catch (error: any) { 
        toast.error(`Gửi thất bại: ${error.message}`); 
        return null; 
    } finally { 
        setIsProcessingChatAction(false); 
    } 
  }, []); 


  const handleSendFileChatAPI = useCallback(async (groupId: string, senderId: string, file: File): Promise<Message | null> => { 
    setIsProcessingChatAction(true); const tId = toast.loading(`Uploading ${file.name}...`); 
    try { 
      const token = localStorage.getItem("authToken"); if (!token) throw new Error("Auth required."); 
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages`; 
      const form = new FormData(); form.append("senderId", senderId); form.append("file", file); 
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }); 
      if (!res.ok) { let e = `Lỗi ${res.status}`; try { const d = await res.json(); e = d.message || e; } catch {} throw new Error(e); } 
      const data = await res.json(); 
      if (data.code === 1000 && data.result) { 
        toast.success(`Sent ${file.name}!`, { id: tId }); 
        const sentMessage = { ...data.result, senderName: "Bạn" } as Message; 
        setChatMessages(prev => [...prev, sentMessage].sort((a,b)=> new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())); 
        setChatConversations((prevList) => { 
            const idx = prevList.findIndex((c) => String(c.id) === String(groupId)); 
            if (idx === -1) return prevList; 
            const updatedConvo = { 
              ...prevList[idx], 
              message: `Đã gửi: ${sentMessage.fileName || "File"}`, 
              sentAt: sentMessage.sentAt, 
              lastMessageSenderId: sentMessage.senderId, 
              lastMessageSenderName: "Bạn", 
            }; 
            const newList = prevList.filter(c => String(c.id) !== String(groupId)); 
            newList.unshift(updatedConvo); 
            return newList.sort((a, b) => (new Date(b.sentAt || 0).getTime()) - (new Date(a.sentAt || 0).getTime()));
        }); 
        return sentMessage; 
      } else throw new Error(data.message || `Send failed ${file.name}.`); 
    } catch (error: any) { toast.error(`Send failed: ${error.message}`, { id: tId }); return null; } 
    finally { setIsProcessingChatAction(false); } 
  }, []); 

  const handleDeleteMessageChatAPI = useCallback(async (messageId: string, userId: string, currentGroupId: string | number): Promise<boolean> => { 
    setIsProcessingChatAction(true); const toastId = toast.loading("Đang xóa tin nhắn..."); 
    try { 
      const token = localStorage.getItem("authToken"); if (!token) throw new Error("Yêu cầu xác thực."); 
      const url = `http://localhost:8080/identity/api/events/messages/${messageId}?userId=${userId}`; 
      const response = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }); 
      const responseText = await response.text(); 
      let responseData; 
      try { responseData = responseText ? JSON.parse(responseText) : { code: response.ok ? 1000 : 0 }; } 
      catch (e) { if (response.ok && !responseText) responseData = { code: 1000 }; else throw new Error("Phản hồi xóa không hợp lệ.");} 
      if (!response.ok && responseData.code !== 1000) throw new Error(responseData.message || `Lỗi ${response.status}`); 
      toast.success("Đã xóa tin nhắn!", { id: toastId }); 

      let newLastMessage: Message | null = null; 
      setChatMessages((prevMessages) => { 
          const remaining = prevMessages.filter((msg) => msg.id !== messageId); 
          if(remaining.length > 0) newLastMessage = remaining[remaining.length - 1]; 
          return remaining; 
      }); 
      setChatConversations((prevList) => { 
          const idx = prevList.findIndex((c) => String(c.id) === String(currentGroupId)); 
          if (idx === -1) return prevList; 
          const senderDetails = selectedChatConversation?.participants?.find(p => p.id === newLastMessage?.senderId) || (newLastMessage ? chatUserCache[newLastMessage.senderId] : null); 
          const senderName = newLastMessage ? (newLastMessage.senderId === user?.id ? "Bạn" : getChatDisplayName(senderDetails, newLastMessage.senderName)) : undefined; 
          const updatedConvo = { 
            ...prevList[idx], 
            message: newLastMessage ? (newLastMessage.content ?? `Đã gửi: ${newLastMessage.fileName || "File"}`) : "Chưa có tin nhắn", 
            sentAt: newLastMessage?.sentAt, lastMessageSenderId: newLastMessage?.senderId, lastMessageSenderName: senderName, 
          }; 
          const newList = prevList.filter(c => String(c.id) !== String(currentGroupId)); 
          newList.unshift(updatedConvo); return newList.sort((a, b) => (new Date(b.sentAt || 0).getTime()) - (new Date(a.sentAt || 0).getTime()));
      }); 
      return true; 
    } catch (error: any) { toast.error(`Xóa thất bại: ${error.message}`, { id: toastId }); return false;} 
    finally { setIsProcessingChatAction(false); } 
  }, [user?.id, selectedChatConversation?.participants, chatUserCache, getChatDisplayName]); 


  const handleDownloadFileChatAPI = useCallback(async (messageId: string, fileName?: string | null) => { 
    if (!messageId) return; setDownloadingChatFileId(messageId); 
    const tId = toast.loading(`Downloading ${fileName || "file"}...`); 
    try { 
      const token = localStorage.getItem("authToken"); if (!token) throw new Error("Auth required."); 
      const url = `http://localhost:8080/identity/api/events/messages/${messageId}/download`; 
      const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${token}` } }); 
      if (!res.ok) { 
        let e = `Download error: ${res.status}`; 
        try { const d = await res.json(); e = d.message || e; } 
        catch { e = `Error ${res.status}: ${res.statusText || "Download failed"}`; } 
        throw new Error(e); 
      } 
      const disposition = res.headers.get("content-disposition"); let finalFName = fileName || "downloaded_file"; 
      if (disposition) { 
        const m = disposition.match(/filename\*?=['"]?([^'";]+)['"]?/i); 
        if (m && m[1]) { 
          const encoded = m[1]; 
          if (encoded.toLowerCase().startsWith("utf-8''")) finalFName = decodeURIComponent(encoded.substring(7)); 
          else { try { finalFName = decodeURIComponent(escape(encoded)); } catch (e) { finalFName = encoded; }} 
        } 
      } 
      const blob = await res.blob(); const dlUrl = window.URL.createObjectURL(blob); 
      const a = document.createElement("a"); a.style.display = "none"; a.href = dlUrl; a.download = finalFName; 
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(dlUrl); a.remove(); 
      toast.success(`Downloaded ${finalFName}!`, { id: tId }); 
    } catch (error: any) { toast.error(`Download failed: ${error.message || "Unknown error"}`, { id: tId }); } 
    finally { setDownloadingChatFileId(null); } 
  }, []); 

  const fetchNews = useCallback(async () => { 
    setIsLoadingNews(true); 
    setErrorNews(null); 
    let currentToken = localStorage.getItem("authToken"); 
    try { 
      let headers: HeadersInit = {}; 
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`; 
      const url = `http://localhost:8080/identity/api/news/status?status=APPROVED`; 
      let res = await fetch(url, { headers, cache: "no-store" }); 
      if ( 
        (res.status === 401 || res.status === 403) && 
        currentToken && 
        refreshToken 
      ) { 
        const nt = await refreshToken(); 
        if (nt) { 
          currentToken = nt; 
          localStorage.setItem("authToken", nt); 
          headers["Authorization"] = `Bearer ${currentToken}`; 
          res = await fetch(url, { headers, cache: "no-store" }); 
        } else throw new Error("Unauthorized or Refresh Failed"); 
      } 
      if (!res.ok) { 
        const status = res.status; 
        let msg = `HTTP ${status}`; 
        try { 
          const err = await res.json(); 
          msg = err.message || msg; 
        } catch (_) {} 
        throw new Error(msg); 
      } 
      const d = await res.json(); 
      if (d.code === 1000 && Array.isArray(d.result)) { 
        const fmt: NewsItem[] = d.result.map((item: any) => ({ 
          id: item.id, 
          title: item.title || "N/A", 
          content: item.content, 
          summary: 
            item.summary || 
            item.content?.substring(0, 100) + 
              (item.content?.length > 100 ? "..." : "") || 
            "", 
          date: item.createdAt || item.publishedAt || "", 
          imageUrl: item.coverImageUrl, 
          status: item.status, 
          createdBy: item.createdBy, 
          publishedAt: item.publishedAt, 
          event: item.event, 
          createdAt: item.createdAt, 
          coverImageUrl: item.coverImageUrl, 
          rejectionReason: item.rejectionReason, 
        })); 
        setNewsItems(fmt); 
      } else throw new Error(d.message || "Lỗi định dạng dữ liệu tin tức"); 
    } catch (e: any) { 
      setErrorNews(e.message || "Lỗi tải tin tức."); 
    } finally { 
      setIsLoadingNews(false); 
    } 
  }, [refreshToken]); 

  const fetchAllEvents = useCallback(async () => { 
    setIsLoadingEvents(true); 
    setErrorEvents(null); 
    let currentToken = localStorage.getItem("authToken"); 
    try { 
      let headers: HeadersInit = {}; 
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`; 
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`; 
      let res = await fetch(url, { headers, cache: "no-store" }); 
      if ( 
        (res.status === 401 || res.status === 403) && 
        currentToken && 
        refreshToken 
      ) { 
        const nt = await refreshToken(); 
        if (nt) { 
          currentToken = nt; 
          localStorage.setItem("authToken", nt); 
          headers["Authorization"] = `Bearer ${currentToken}`; 
          res = await fetch(url, { headers, cache: "no-store" }); 
        } else throw new Error("Unauthorized or Refresh Failed"); 
      } 
      if (!res.ok) { 
        const status = res.status; 
        let msg = `HTTP ${status}`; 
        try { 
          const err = await res.json(); 
          msg = err.message || msg; 
        } catch (_) {} 
        throw new Error(msg); 
      } 
      const d = await res.json(); 
      if (d.code === 1000 && Array.isArray(d.result)) { 
        const fmt: EventDisplayInfo[] = d.result 
          .filter((e: any) => !e.deleted) 
          .map((e: any) => ({ 
            id: e.id, 
            title: e.name || "N/A", 
            name: e.name, 
            date: e.time || e.createdAt || "", 
            time: e.time, 
            location: e.location || "N/A", 
            description: e.content || e.purpose || "", 
            content: e.content, 
            purpose: e.purpose, 
            avatarUrl: e.avatarUrl || null, 
            status: e.status, 
            createdBy: e.createdBy, 
            organizers: e.organizers || [], 
            participants: e.participants || [], 
            attendees: e.attendees || [], 
          })); 
        setAllEvents(fmt); 
      } else throw new Error(d.message || "Lỗi định dạng dữ liệu sự kiện"); 
    } catch (e: any) { 
      setErrorEvents(e.message || "Lỗi tải sự kiện."); 
      if (e.message?.includes("Unauthorized")) 
        router.push("/login?sessionExpired=true"); 
    } finally { 
      setIsLoadingEvents(false); 
    } 
  }, [refreshToken, router]); 

  const fetchRegisteredEventIds = useCallback( 
    async (userIdParam: string, token: string | null) => { 
      if (!userIdParam || !token) { 
        setIsLoadingRegisteredIds(false); 
        setRegisteredEventIds(new Set()); 
        return; 
      } 
      setIsLoadingRegisteredIds(true); 
      let currentToken = token; 
      try { 
        const url = `http://localhost:8080/identity/api/events/attendee/${userIdParam}`; 
        let res = await fetch(url, { 
          headers: { Authorization: `Bearer ${currentToken}` }, 
          cache: "no-store", 
        }); 
        if (res.status === 401 || res.status === 403) { 
          const nt = await refreshToken(); 
          if (nt) { 
            currentToken = nt; 
            localStorage.setItem("authToken", nt); 
            res = await fetch(url, { 
              headers: { Authorization: `Bearer ${currentToken}` }, 
              cache: "no-store", 
            }); 
          } else throw new Error("Unauthorized or Refresh Failed"); 
        } 
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); 
        const data = await res.json(); 
        if (data.code === 1000 && Array.isArray(data.result)) 
          setRegisteredEventIds( 
            new Set(data.result.map((event: any) => event.id)) 
          ); 
        else { 
          setRegisteredEventIds(new Set()); 
        } 
      } catch (err: any) { 
        setRegisteredEventIds(new Set()); 
        if (err.message?.includes("Unauthorized")) 
          router.push("/login?sessionExpired=true"); 
      } finally { 
        setIsLoadingRegisteredIds(false); 
      } 
    }, 
    [refreshToken, router] 
  ); 

  const fetchUserCreatedEvents = useCallback( 
    async (userIdParam: string, token: string | null) => { 
      if (!userIdParam || !token) { 
        setIsLoadingCreatedEventIds(false); 
        setCreatedEventIds(new Set()); 
        return; 
      } 
      setIsLoadingCreatedEventIds(true); 
      let currentToken = token; 
      try { 
        const url = `http://localhost:8080/identity/api/events/creator/${userIdParam}`; 
        let res = await fetch(url, { 
          headers: { Authorization: `Bearer ${currentToken}` }, 
          cache: "no-store", 
        }); 
        if (res.status === 401 || res.status === 403) { 
          const nt = await refreshToken(); 
          if (nt) { 
            currentToken = nt; 
            localStorage.setItem("authToken", nt); 
            res = await fetch(url, { 
              headers: { Authorization: `Bearer ${currentToken}` }, 
              cache: "no-store", 
            }); 
          } else throw new Error("Unauthorized or Refresh Failed"); 
        } 
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); 
        const data = await res.json(); 
        if (data.code === 1000 && Array.isArray(data.result)) 
          setCreatedEventIds( 
            new Set(data.result.map((event: any) => event.id)) 
          ); 
        else setCreatedEventIds(new Set()); 
      } catch (err: any) { 
        setCreatedEventIds(new Set()); 
        if (err.message?.includes("Unauthorized")) 
          router.push("/login?sessionExpired=true"); 
      } finally { 
        setIsLoadingCreatedEventIds(false); 
      } 
    }, 
    [refreshToken, router] 
  ); 

  const fetchNotifications = useCallback( 
    async (userIdParam: string, token: string | null) => { 
      if (!userIdParam || !token) { 
        setNotifications([]); 
        return; 
      } 
      setIsLoadingNotifications(true); 
      setErrorNotifications(null); 
      const limit = 10; 
      let currentToken = token; 
      try { 
        const url = `http://localhost:8080/identity/api/notifications?userId=${userIdParam}&limit=${limit}`; 
        let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` }; 
        let res = await fetch(url, { headers, cache: "no-store" }); 
        if (res.status === 401 || res.status === 403) { 
          const newToken = await refreshToken(); 
          if (newToken) { 
            currentToken = newToken; 
            localStorage.setItem("authToken", newToken); 
            headers["Authorization"] = `Bearer ${newToken}`; 
            res = await fetch(url, { headers, cache: "no-store" }); 
          } else throw new Error("Unauthorized or Refresh Failed"); 
        } 
        if (!res.ok) { 
          const status = res.status; 
          let msg = `HTTP error ${status}`; 
          try { 
            const errorData = await res.json(); 
            msg = errorData.message || msg; 
          } catch (_) {} 
          throw new Error(msg); 
        } 
        const data = await res.json(); 
        if (data.code === 1000 && Array.isArray(data.result)) { 
          const formattedNotifications: NotificationItem[] = data.result.map( 
            (item: any) => ({ 
              id: item.id, 
              title: item.title, 
              content: item.content, 
              type: item.type, 
              read: item.read, 
              createdAt: item.createdAt, 
              relatedId: item.relatedId ?? null, 
              userId: item.userId ?? null, 
            }) 
          ); 
          setNotifications(formattedNotifications); 
        } else 
          throw new Error(data.message || "Lỗi định dạng dữ liệu thông báo"); 
      } catch (error: any) { 
        setErrorNotifications(error.message || "Lỗi tải thông báo."); 
        setNotifications([]); 
        if (error.message?.includes("Unauthorized")) 
          router.push("/login?sessionExpired=true"); 
      } finally { 
        setIsLoadingNotifications(false); 
      } 
    }, 
    [refreshToken, router] 
  ); 

  useEffect(() => { 
    if (initializedRef.current) return; 
    initializedRef.current = true; 

    const loadInitialData = async () => { 
      setIsLoadingUser(true); 
      setIsLoadingEvents(true); 
      setIsLoadingRegisteredIds(true); 
      setIsLoadingCreatedEventIds(true); 
      setIsLoadingNews(true); 

      const currentAuthToken = localStorage.getItem("authToken"); 
      let userIdForFetches: string | null = null; 
      let tokenForSubFetches: string | null = currentAuthToken; 

      try { 
        if (currentAuthToken) { 
          const headers: HeadersInit = { 
            Authorization: `Bearer ${currentAuthToken}`, 
          }; 
          const userInfoUrl = `http://localhost:8080/identity/users/myInfo`; 
          let userRes = await fetch(userInfoUrl, { 
            headers, 
            cache: "no-store", 
          }); 

          if (userRes.status === 401 || userRes.status === 403) { 
            const nt = await refreshToken(); 
            if (nt) { 
              tokenForSubFetches = nt; 
              localStorage.setItem("authToken", nt); 
              userRes = await fetch(userInfoUrl, { 
                headers: { Authorization: `Bearer ${nt}` }, 
                cache: "no-store", 
              }); 
            } else { 
              throw new Error("Unauthorized or Refresh Failed"); 
            } 
          } 

          if (!userRes.ok) { 
            throw new Error(`Workspace user info failed: ${userRes.status}`); 
          } 

          const userData = await userRes.json(); 
          if (userData.code === 1000 && userData.result?.id) { 
            const fetchedUser: User = userData.result; 
            userIdForFetches = fetchedUser.id; 
            setUser(fetchedUser); 
          } else { 
            throw new Error("Invalid user data received"); 
          } 
        } else { 
          setUser(null); 
        } 
      } catch (error: any) { 
        setUser(null); 
        userIdForFetches = null; 
        tokenForSubFetches = null; 
        if (!error.message?.includes("Invalid user data")) { 
          router.push("/login?sessionExpired=true"); 
        } 
      } finally { 
        setIsLoadingUser(false); 
      } 

      await Promise.all([fetchAllEvents(), fetchNews()]); 

      if (userIdForFetches && tokenForSubFetches) { 
        await Promise.all([ 
          fetchRegisteredEventIds(userIdForFetches, tokenForSubFetches), 
          fetchUserCreatedEvents(userIdForFetches, tokenForSubFetches), 
          fetchNotifications(userIdForFetches, tokenForSubFetches), 
        ]); 
      } else { 
        setIsLoadingRegisteredIds(false); 
        setIsLoadingCreatedEventIds(false); 
        setNotifications([]); 
        setIsLoadingNotifications(false); 
      } 
    }; 

    loadInitialData(); 
  }, [ 
    fetchAllEvents, 
    fetchRegisteredEventIds, 
    fetchUserCreatedEvents, 
    fetchNews, 
    fetchNotifications, 
    refreshToken, 
    router, 
  ]); 

  useEffect(() => {
    if (user?.id) {
      console.log(`UserHome: Attempting to initialize socket for user: ${user.id}`);
      const handlers = {
        onNotificationReceived: (newNotification: NotificationItem) => {
          toast(`🔔 ${newNotification.title || "Bạn có thông báo mới!"}`, {
            duration: 5000,
          });
          setNotifications((prevNotifications) => {
            if (newNotification.id && prevNotifications.some(n => n.id === newNotification.id)) {
              return prevNotifications.map(n => n.id === newNotification.id ? newNotification : n);
            }
            const updatedNotifications = [newNotification, ...prevNotifications].slice(0, 15); // Giữ tối đa 15 thông báo
            return updatedNotifications;
          });
        },
        onGlobalChatNotificationReceived: (payload: ChatMessageNotificationPayload) => {
           console.log("UserHome: >>> Received global_chat_notification PAYLOAD:", payload);
          console.log(`UserHome: Current User ID: ${user?.id}, Payload Sender ID: ${payload?.senderId}`);

          setGlobalChatPayloadForTab(payload); // Cập nhật payload cho ChatTabContent (nếu cần)

          if (user && payload.senderId !== user.id) {
            // ---- BẮT ĐẦU CHỈNH SỬA ----
            let notificationDisplayContent = "";

            if (payload.messageType === "TEXT" && payload.actualMessageContent) {
              notificationDisplayContent = payload.actualMessageContent;
            } else if (payload.messageType === "FILE" && payload.fileName) {
              notificationDisplayContent = `Đã gửi một tệp: ${payload.fileName}`;
            } else if (payload.messageType === "IMAGE") {
              notificationDisplayContent = "Đã gửi một hình ảnh.";
            } else if (payload.messageType === "VIDEO") {
              notificationDisplayContent = "Đã gửi một video.";
            } else if (payload.messageType === "AUDIO") {
              notificationDisplayContent = "Đã gửi một đoạn âm thanh.";
            } else if (payload.actualMessageContent) { // Dự phòng nếu type không rõ nhưng có actualMessageContent
                notificationDisplayContent = payload.actualMessageContent;
            }
             else { // Dự phòng cuối cùng về preview
              notificationDisplayContent = payload.messageContentPreview || "Có tin nhắn mới";
            }

            const chatNotification: NotificationItem = {
              id: `chat-${payload.messageId}-${Date.now()}`, // Đảm bảo ID là duy nhất
              title: `Tin nhắn mới từ ${payload.senderName} (Nhóm: ${payload.groupName})`,
              content: notificationDisplayContent.substring(0, 150) + (notificationDisplayContent.length > 150 ? "..." : ""), // Sử dụng nội dung đầy đủ, cắt bớt nếu quá dài
              type: "NEW_CHAT_MESSAGE",
              read: false,
              createdAt: payload.sentAt || new Date().toISOString(),
              relatedId: payload.groupId, // Quan trọng để điều hướng khi click
              userId: user.id,
            };
            // ---- KẾT THÚC CHỈNH SỬA ----

            // Hiển thị toast với nội dung rõ ràng hơn một chút
            toast(
              `💬 ${payload.senderName}: ${notificationDisplayContent.substring(0, 50)}${notificationDisplayContent.length > 50 ? "..." : ""}`,
              { duration: 4000 }
            );

            setNotifications((prevNotifications) =>
              [chatNotification, ...prevNotifications].slice(0, 15) // Giữ tối đa 15 thông báo
            );
          }
        },
        onConnect: () => {
          console.log("UserHome: Main socket connected.");
        },
        onDisconnect: (reason: any) => {
          console.log("UserHome: Main socket disconnected.", reason);
        },
        onConnectError: (error: Error) => {
          console.error("UserHome: Main socket connection error.", error);
        },
      };
      initializeSocket(user.id, handlers);
    }
    return () => {
      disconnectSocket();
    };
  // Đảm bảo user, setGlobalChatPayloadForTab, setNotifications được thêm vào dependency array nếu chúng được sử dụng bên trong effect
  // và có khả năng thay đổi. set... từ useState thường ổn định.
  }, [user, setGlobalChatPayloadForTab, setNotifications]);


  useEffect(() => { 
    const handleClickOutside = (event: MouseEvent) => { 
      if ( 
        notificationContainerRef.current && 
        !notificationContainerRef.current.contains(event.target as Node) && 
        notificationButtonRef.current && 
        !notificationButtonRef.current.contains(event.target as Node) 
      ) { 
        setShowNotificationDropdown(false); 
      } 
    }; 
    document.addEventListener("mousedown", handleClickOutside); 
    return () => { 
      document.removeEventListener("mousedown", handleClickOutside); 
    }; 
  }, []); 


  const executeRegistration = async (event: EventDisplayInfo) => { 
    if (!user?.id || isRegistering) return; 
    setIsRegistering(event.id); 
    let token = localStorage.getItem("authToken"); 
    if (!token) { 
      toast.error("Vui lòng đăng nhập lại."); 
      setIsRegistering(null); 
      router.push("/login"); 
      return; 
    } 
    try { 
      const url = `http://localhost:8080/identity/api/events/${event.id}/attendees?userId=${user.id}`; 
      let res = await fetch(url, { 
        method: "POST", 
        headers: { Authorization: `Bearer ${token}` }, 
      }); 
      if (res.status === 401 || res.status === 403) { 
        const nt = await refreshToken(); 
        if (nt) { 
          token = nt; 
          localStorage.setItem("authToken", nt); 
          res = await fetch(url, { 
            method: "POST", 
            headers: { Authorization: `Bearer ${token}` }, 
          }); 
        } else throw new Error("Không thể làm mới phiên đăng nhập."); 
      } 
      if (!res.ok) { 
        let m = "Đăng ký thất bại"; 
        try { 
          const d = await res.json(); 
          m = d.message || m; 
        } catch (_) {} 
        if (res.status === 403) m = "Không có quyền."; 
        else if (res.status === 400) m = "Yêu cầu không hợp lệ."; 
        else if (res.status === 409) m = "Bạn đã đăng ký sự kiện này rồi."; 
        else if (res.status === 401) 
          m = "Phiên đăng nhập hết hạn hoặc không hợp lệ."; 
        throw new Error(m); 
      } 
      const data = await res.json(); 
      if (data.code === 1000) { 
        toast.success(`Đã đăng ký "${event.title}"!`); 
        setRegisteredEventIds((prev) => new Set(prev).add(event.id)); 
      } else throw new Error(data.message || "Lỗi đăng ký không xác định."); 
    } catch (err: any) { 
      toast.error(`${err.message || "Đăng ký thất bại."}`); 
      if (err.message?.includes("Unauthorized")) 
        router.push("/login?sessionExpired=true"); 
    } finally { 
      setIsRegistering(null); 
    } 
  }; 

  const handleRegister = (event: EventDisplayInfo) => { 
    if (!user?.id) { 
      toast.error("Đăng nhập để đăng ký."); 
      router.push("/login"); 
      return; 
    } 
    if ( 
      registeredEventIds.has(event.id) || 
      isRegistering || 
      createdEventIds.has(event.id) 
    ) { 
      if (registeredEventIds.has(event.id)) 
        toast.error("Bạn đã đăng ký sự kiện này."); 
      if (createdEventIds.has(event.id)) 
        toast.error("Bạn là người tạo sự kiện này."); 
      return; 
    } 
    const isEventUpcoming = 
      new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0)); 
    if (!isEventUpcoming) { 
      toast.error("Sự kiện này đã diễn ra."); 
      return; 
    } 
    setConfirmationState({ 
      isOpen: true, 
      title: "Xác nhận đăng ký", 
      message: ( 
        <> 
          Đăng ký sự kiện <br />{" "} 
          <strong className="text-indigo-600">"{event.title}"</strong>? 
        </> 
      ), 
      onConfirm: () => { 
        executeRegistration(event); 
        setConfirmationState((prev) => ({ ...prev, isOpen: false })); 
      }, 
      onCancel: () => 
        setConfirmationState((prev) => ({ ...prev, isOpen: false })), 
      confirmVariant: "primary", 
      confirmText: "Đăng ký", 
      cancelText: "Hủy", 
    }); 
  }; 

  const handleRegistrationChange = useCallback( 
    (eventId: string, registered: boolean) => { 
      setRegisteredEventIds((prevIds) => { 
        const newIds = new Set(prevIds); 
        if (registered) newIds.add(eventId); 
        else newIds.delete(eventId); 
        return newIds; 
      }); 
    }, 
    [] 
  ); 

  const handleEventClick = (event: EventDisplayInfo) => { 
    setSelectedEvent(event); 
  }; 
  const handleBackToList = () => { 
    setSelectedEvent(null); 
  }; 

  const handleLogout = async () => { 
    try { 
      const t = localStorage.getItem("authToken"); 
      if (t) 
        await fetch("http://localhost:8080/identity/auth/logout", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" }, 
          body: JSON.stringify({ token: t }), 
        }); 
    } catch (e) { 
    } finally { 
      localStorage.clear(); 
      setUser(null); 
      setRegisteredEventIds(new Set()); 
      setCreatedEventIds(new Set()); 
      setNewsItems([]); 
      setNotifications([]); 
      setShowNotificationDropdown(false); 
      setChatConversations([]); 
      setSelectedChatConversation(null); 
      setChatMessages([]); 
      setChatUserCache({}); 
      setActiveTab("home"); 
      router.push("/login"); 
    } 
  }; 

  const refreshNewsList = useCallback(() => { 
    fetchNews(); 
  }, [fetchNews]); 

  const handleNotificationClick = () => { 
    setShowNotificationDropdown((prev) => !prev); 
  }; 

  const handleMarkAsRead = async (notificationId: string) => { 
    let token = localStorage.getItem("authToken"); 
    if (!token || !user?.id) { 
      toast.error("Vui lòng đăng nhập lại."); 
      return; 
    } 
    let currentToken = token; 
    try { 
      const url = `http://localhost:8080/identity/api/notifications/${notificationId}/read`; 
      let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` }; 
      let res = await fetch(url, { method: "PUT", headers: headers }); 
      if (res.status === 401 || res.status === 403) { 
        const newToken = await refreshToken(); 
        if (newToken) { 
          currentToken = newToken; 
          localStorage.setItem("authToken", newToken); 
          headers["Authorization"] = `Bearer ${newToken}`; 
          res = await fetch(url, { method: "PUT", headers: headers }); 
        } else { 
          throw new Error("Không thể làm mới phiên đăng nhập."); 
        } 
      } 
      if (!res.ok) { 
        let errorMsg = `Lỗi ${res.status}`; 
        try { 
          const errorData = await res.json(); 
          errorMsg = errorData.message || errorMsg; 
        } catch (_) {} 
        throw new Error(errorMsg); 
      } 
      setNotifications((prev) => 
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)) 
      ); 
    } catch (error: any) { 
      toast.error(`Lỗi: ${error.message || "Không thể đánh dấu đã đọc."}`); 
      if (error.message?.includes("Unauthorized")) 
        router.push("/login?sessionExpired=true"); 
    } 
  }; 

  const handleNewsFormSubmit = async ( 
    formData: NewsFormData, 
    newsId?: string 
  ) => { 
    if (!user) { 
      toast.error("Vui lòng đăng nhập để thực hiện."); 
      return; 
    } 
    setIsSubmittingNews(true); 
    const apiFormData = new FormData(); 
    apiFormData.append("title", formData.title); 
    apiFormData.append("content", formData.content); 
    if (formData.eventId) { 
      apiFormData.append("eventId", formData.eventId); 
    } 
    let API_URL = "http://localhost:8080/identity/api/news"; 
    let method = "POST"; 
    let currentToken = localStorage.getItem("authToken"); 

    if (newsId) { 
      API_URL = `http://localhost:8080/identity/api/news/${newsId}`; 
      method = "PUT"; 
      if (formData.imageFile) { 
        apiFormData.append("coverImage", formData.imageFile); 
      } 
    } else { 
      apiFormData.append("type", "NEWS"); 
      apiFormData.append("featured", "false"); 
      apiFormData.append("pinned", "false"); 
      apiFormData.append("createdById", user.id); 
      if (formData.imageFile) { 
        apiFormData.append("coverImage", formData.imageFile); 
      } 
    } 

    try { 
      let headers: HeadersInit = {}; 
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`; 
      let response = await fetch(API_URL, { 
        method: method, 
        headers: headers, 
        body: apiFormData, 
      }); 
      if ( 
        (response.status === 401 || response.status === 403) && 
        currentToken && 
        refreshToken 
      ) { 
        const newToken = await refreshToken(); 
        if (newToken) { 
          currentToken = newToken; 
          localStorage.setItem("authToken", newToken); 
          headers["Authorization"] = `Bearer ${currentToken}`; 
          response = await fetch(API_URL, { 
            method: method, 
            headers: headers, 
            body: apiFormData, 
          }); 
        } else { 
          throw new Error("Refresh token failed or missing."); 
        } 
      } 
      const result = await response.json(); 
      if (response.ok && result.code === 1000) { 
        toast.success( 
          result.message || 
            (newsId ? "Cập nhật thành công!" : "Tạo mới thành công!") 
        ); 

        setIsNewsModalOpen(false); 
        setEditingNewsItem(null); 
        refreshNewsList(); 
        if (activeTab === 'myNews') { 
        } 
      } else { 
        toast.error( 
          result.message || 
            (newsId ? "Cập nhật thất bại." : "Tạo mới thất bại.") 
        ); 
      } 
    } catch (error: any) { 
      if (error.message?.includes("Refresh token failed")) { 
        toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại."); 
        router.push("/login?sessionExpired=true"); 
      } else { 
        toast.error("Lỗi khi gửi yêu cầu: " + error.message); 
      } 
    } finally { 
      setIsSubmittingNews(false); 
    } 
  }; 

  const handleOpenCreateModal = () => { 
    if (!user) { 
      toast.error("Vui lòng đăng nhập để tạo tin tức."); 
      return; 
    } 
    setEditingNewsItem(null); 
    setIsNewsModalOpen(true); 
  }; 
  const handleOpenEditModal = (newsItem: NewsItem) => { 
    setEditingNewsItem(newsItem); 
    setIsNewsModalOpen(true); 
  }; 
  const handleCloseModal = () => { 
    if (!isSubmittingNews) { 
      setIsNewsModalOpen(false); 
      setEditingNewsItem(null); 
    } 
  }; 

  const handleSessionExpired = useCallback(() => { 
    router.push("/login?sessionExpired=true"); 
  }, [router]); 


  const handleGlobalEventRefresh = useCallback(() => { 
    fetchAllEvents(); 
    const currentToken = localStorage.getItem("authToken"); 
    if (user?.id && currentToken) { 
      fetchUserCreatedEvents(user.id, currentToken); 
      fetchRegisteredEventIds(user.id, currentToken); 
    } 
  }, [user, fetchAllEvents, fetchUserCreatedEvents, fetchRegisteredEventIds]); 


  const isPageLoading = !initializedRef.current || isLoadingUser; 

  const getTabButtonClasses = (tabName: ActiveTab): string => { 
    const base = 
      "cursor-pointer px-4 py-2 text-xs sm:text-sm font-semibold rounded-full shadow-sm transition"; 
    const active = "text-white"; 
    const inactive = "hover:bg-opacity-80"; 
    let bg = "", 
      text = "", 
      hover = ""; 
    switch (tabName) { 
      case "home": 
        bg = "bg-indigo-600"; text = "text-indigo-800"; hover = "hover:bg-indigo-700"; break; 
      case "news": 
        bg = "bg-green-600"; text = "text-green-800"; hover = "hover:bg-green-700"; break; 
      case "myNews": 
        bg = "bg-amber-600"; text = "text-amber-800"; hover = "hover:bg-amber-700"; break; 
      case "createEvent": 
        bg = "bg-cyan-600"; text = "text-cyan-800"; hover = "hover:bg-cyan-700"; break; 
      case "myEvents": 
        bg = "bg-blue-600"; text = "text-blue-800"; hover = "hover:bg-blue-700"; break; 
      case "attendees": 
        bg = "bg-teal-600"; text = "text-teal-800"; hover = "hover:bg-teal-700"; break; 
      case "registeredEvents": 
        bg = "bg-green-600"; text = "text-green-800"; hover = "hover:bg-green-700"; break; 
      case "members": 
        bg = "bg-pink-600"; text = "text-pink-800"; hover = "hover:bg-pink-700"; break; 
      case "chatList": 
        bg = "bg-purple-600"; text = "text-purple-800"; hover = "hover:bg-purple-700"; break; 
      default: 
        bg = "bg-gray-100"; text = "text-gray-800"; hover = "hover:bg-gray-200"; 
    } 
    const specificBg = activeTab === tabName ? bg : bg.replace(/-\d00/, "-100"); 
    const specificText = activeTab === tabName ? "" : text; 
    const specificHover = activeTab === tabName ? hover : hover.replace(/-\d00/, "-200"); 
    return `${base} ${specificBg} ${ activeTab === tabName ? active : specificText } ${activeTab !== tabName ? inactive : ""} ${specificHover}`; 
  }; 

  const getActiveIndicatorColor = (tabName: ActiveTab): string => { 
    switch (tabName) { 
      case "home": return "border-t-indigo-600"; 
      case "news": return "border-t-green-600"; 
      case "myNews": return "border-t-amber-600"; 
      case "createEvent": return "border-t-cyan-600"; 
      case "myEvents": return "border-t-blue-600"; 
      case "attendees": return "border-t-teal-600"; 
      case "registeredEvents": return "border-t-green-600"; 
      case "members": return "border-t-pink-600"; 
      case "chatList": return "border-t-purple-600"; 
      default: return "border-t-gray-400"; 
    } 
  }; 

  const unreadNotificationCount = useMemo( 
    () => notifications.filter((n) => !n.read).length, 
    [notifications] 
  ); 

  const tabs = [ 
    { id: "home", label: "🎉 Trang chủ", requiresAuth: false }, 
    { id: "news", label: "📰 Bảng tin", requiresAuth: false }, 
    { id: "createEvent", label: "➕ Tạo sự kiện", requiresAuth: true }, 
    { id: "myNews", label: "📝 Tin tức của tôi", requiresAuth: true }, 
    { id: "myEvents", label: "🛠 Sự kiện / Đăng ký", requiresAuth: true }, 
    { id: "attendees", label: "✅ Điểm danh ", requiresAuth: true }, 
    { id: "members", label: "👥 Thành viên CLB", requiresAuth: true }, 
    { id: "chatList", label: "💬 Trò chuyện", requiresAuth: true }, 
  ]; 


  return ( 
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 relative"> 
      <Toaster toastOptions={{ duration: 3000 }} position="top-center" /> 
      <nav className="bg-gray-900 text-white px-4 py-4 shadow-md mb-6 sticky top-0 z-40"> 
        <div className="max-w-7xl mx-auto flex justify-between items-center"> 
          <div className="text-lg sm:text-xl font-bold">Quản lý sự kiện</div> 
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base"> 
            <span 
              className="cursor-pointer hover:text-gray-300 transition-colors" 
              onClick={() => setShowAboutModal(true)} 
            > 
              Giới thiệu 
            </span> 
            <span 
              className="cursor-pointer hover:text-gray-300" 
              onClick={() => setShowContactModal(true)} 
            > 
              Liên hệ 
            </span> 
            {initializedRef.current && !isLoadingUser && ( 
              <UserMenu user={user} onLogout={handleLogout} /> 
            )} 
            {(!initializedRef.current || isLoadingUser) && ( 
              <span className="text-gray-400">Đang tải...</span> 
            )} 
            {initializedRef.current && !isLoadingUser && !user && ( 
              <Link href="/login"> 
                <span className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded cursor-pointer"> 
                  Đăng nhập 
                </span> 
              </Link> 
            )} 
          </div> 
        </div> 
      </nav> 
      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 border border-gray-200 sticky top-20 z-30 "> 
        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-5 justify-center pb-3"> 
          {tabs.map((tab) => { 
            const showTab = 
              !tab.requiresAuth || (tab.requiresAuth && initializedRef.current && user); 
              if (tab.requiresAuth && (!initializedRef.current || isLoadingUser || !user)) { 
                  return null; 
              } 
            return ( 
              <div key={tab.id} className="relative flex flex-col items-center"> 
                <button 
                  onClick={() => setActiveTab(tab.id as ActiveTab)} 
                  className={getTabButtonClasses(tab.id as ActiveTab)} 
                > 
                  {tab.label} 
                </button> 
                {activeTab === tab.id && ( 
                  <div 
                    className={`absolute top-full mt-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] ${getActiveIndicatorColor( 
                      tab.id as ActiveTab 
                    )} border-r-[6px] border-r-transparent`} 
                    style={{ left: "50%", transform: "translateX(-50%)" }} 
                  ></div> 
                )} 
              </div> 
            ); 
          })} 
          {tabs.find((t) => t.id === activeTab)?.requiresAuth && 
            !user && 
            initializedRef.current && 
            !isLoadingUser && ( 
              <span className="text-sm text-gray-500 italic p-2 self-center"> 
                Đăng nhập để xem các mục khác 
              </span> 
            )} 
        </div> 
      </div> 

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 min-h-[400px]"> 
        {isPageLoading ? ( 
          <p className="text-center text-gray-500 italic py-6"> 
            Đang tải dữ liệu người dùng... 
          </p> 
        ) : ( 
          <> 
            {activeTab === "home" && ( 
              <HomeTabContent 
                allEvents={allEvents} 
                isLoadingEvents={isLoadingEvents} 
                errorEvents={errorEvents} 
                registeredEventIds={registeredEventIds} 
                createdEventIds={createdEventIds} 
                user={user} 
                isLoadingRegisteredIds={isLoadingRegisteredIds} 
                isLoadingCreatedEventIds={isLoadingCreatedEventIds} 
                isRegistering={isRegistering} 
                onRegister={handleRegister} 
                onEventClick={handleEventClick} 
                selectedEvent={selectedEvent} 
                onBackToList={handleBackToList} 
                search={search} 
                setSearch={setSearch} 
                sortOption={sortOption} 
                setSortOption={setSortOption} 
                timeFilterOption={timeFilterOption} 
                setTimeFilterOption={setTimeFilterOption} 
                refreshToken={refreshToken} 
                onRefreshEvents={fetchAllEvents} 
                newsItems={newsItems} 
                isLoadingNews={isLoadingNews} 
                errorNews={errorNews} 
                refreshNewsList={refreshNewsList} 
              /> 
            )} 
            {activeTab === "news" && ( 
              <NewsTabContent 
                newsItems={newsItems} 
                isLoading={isLoadingNews} 
                error={errorNews} 
                user={user} 
                onOpenCreateModal={handleOpenCreateModal} 
                onOpenEditModal={handleOpenEditModal} 
                onNewsDeleted={refreshNewsList} 
                refreshToken={refreshToken} 
                onRefreshNews={fetchNews} 
              /> 
            )} 
            {user && activeTab === "myNews" && ( 
              <MyNewsTabContent 
                user={user} 
                onNewsChange={() => { 
                  fetchNews(); 
                }} 
              /> 
            )} 
            {user && activeTab === "createEvent" && ( 
              <CreateEventTabContent 
                user={user} 
                onEventCreated={() => { 
                  fetchAllEvents(); 
                  const t = localStorage.getItem("authToken"); 
                  if (user?.id && t) { 
                    fetchUserCreatedEvents(user.id, t); 
                    fetchNotifications(user.id, t); 
                  } 
                  setActiveTab("myEvents"); 
                  toast.success("Sự kiện đã được tạo và đang chờ duyệt!"); 
                }} 
              /> 
            )} 
            {user && activeTab === "myEvents" && ( 
              <MyEventsTabContent 
                user={user} 
                initialRegisteredEventIds={registeredEventIds} 
                isLoadingRegisteredIds={isLoadingRegisteredIds} 
                createdEventIdsFromParent={createdEventIds} 
                onRegistrationChange={handleRegistrationChange} 
                onEventNeedsRefresh={handleGlobalEventRefresh} 
              /> 
            )} 
            {user && activeTab === "attendees" && ( 
              <AttendeesTabContent 
                user={user} 
              /> 
            )} 
            {user && activeTab === "members" && ( 
              <MembersTabContent 
                user={user} 
                userRole={user.roles?.[0]?.name?.toUpperCase() || "UNKNOWN"} 
                currentUserEmail={user.email || null} 
                refreshToken={refreshToken} 
                onSessionExpired={handleSessionExpired} 
              /> 
            )} 
            {user && activeTab === "chatList" && ( 
                <ChatTabContent 
                    currentUser={user} 
                    globalChatMessagePayload={globalChatPayloadForTab} 
                    conversations={chatConversations} 
                    isLoadingConversations={isLoadingChatConversations} 
                    errorConversations={errorChatConversations} 
                    fetchConversations={fetchChatConversationsAPI} 
                    setConversations={setChatConversations} 
                    selectedConversation={selectedChatConversation} 
                    setSelectedConversation={setSelectedChatConversation} 
                    isLoadingDetails={isLoadingChatDetails} 
                    fetchGroupChatDetails={fetchGroupChatDetailsAPI} 
                    messages={chatMessages} 
                    isLoadingMessages={isLoadingChatMessages} 
                    errorMessages={errorChatMessages} 
                    fetchMessages={fetchChatMessagesAPI} 
                    setMessages={setChatMessages} 
                    mediaMessages={chatMediaMessages} 
                    fileMessages={chatFileMessages} 
                    audioMessages={chatAudioMessages} 
                    isLoadingMedia={isLoadingChatMedia} 
                    isLoadingFiles={isLoadingChatFiles} 
                    isLoadingAudio={isLoadingChatAudio} 
                    errorMedia={errorChatMedia} 
                    errorFiles={errorChatFiles} 
                    errorAudio={errorChatAudio} 
                    fetchMediaMessages={fetchChatMediaMessagesAPI} 
                    fetchFileMessages={fetchChatFileMessagesAPI} 
                    fetchAudioMessages={fetchChatAudioMessagesAPI} 
                    setMediaMessages={setChatMediaMessages} 
                    setFileMessages={setChatFileMessages} 
                    setAudioMessages={setChatAudioMessages} 
                    userCache={chatUserCache} 
                    fetchUserDetailsWithCache={fetchChatUserDetailsWithCache} 
                    getDisplayName={getChatDisplayName} 
                    handleRemoveMember={handleRemoveMemberChatAPI} 
                    handleLeaveGroup={handleLeaveGroupChatAPI} 
                    handleSendMessageAPI={handleSendMessageChatAPI} 
                    handleSendFileAPI={handleSendFileChatAPI} 
                    handleDeleteMessageAPI={handleDeleteMessageChatAPI} 
                    handleDownloadFileAPI={handleDownloadFileChatAPI} 
                    isProcessingChatAction={isProcessingChatAction} 
                    downloadingFileId={downloadingChatFileId} 
                    setDownloadingFileId={setDownloadingChatFileId} 
                /> 
            )} 
            {tabs.find((t) => t.id === activeTab)?.requiresAuth && 
              !user && 
              initializedRef.current && 
              !isLoadingUser && ( 
                <p className="text-center text-red-500 py-6"> 
                  Vui lòng đăng nhập để truy cập mục này. 
                </p> 
              )} 
          </> 
        )} 
      </div> 
      {initializedRef.current && !isLoadingUser && user && ( 
        <div 
          className="fixed bottom-6 right-6 z-50 group" 
          ref={notificationContainerRef} 
        > 
          <button 
            ref={notificationButtonRef} 
            onClick={handleNotificationClick} 
            className="relative flex items-center cursor-pointer justify-center h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition ease-in-out duration-150" 
            aria-label="Thông báo" 
            aria-haspopup="true" 
            aria-expanded={showNotificationDropdown} 
          > 
            <span className="sr-only">Xem thông báo</span> 
            <BellIcon className="h-6 w-6" aria-hidden="true" /> 
            {unreadNotificationCount > 0 && ( 
              <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white transform translate-x-1/4 -translate-y-1/4 ring-2 ring-white pointer-events-none"> 
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount} 
              </span> 
            )} 
          </button> 
          {showNotificationDropdown && ( 
            <div className="absolute bottom-full right-0 mb-2 w-80 sm:w-96"> 
              <NotificationDropdown 
                notifications={notifications} 
                isLoading={isLoadingNotifications && notifications.length === 0} 
                error={errorNotifications} 
                onMarkAsRead={handleMarkAsRead} 
                onClose={() => setShowNotificationDropdown(false)} 
              /> 
            </div> 
          )} 
        </div> 
      )} 
      <ConfirmationDialog 
        isOpen={confirmationState.isOpen} 
        title={confirmationState.title} 
        message={confirmationState.message} 
        confirmVariant={confirmationState.confirmVariant} 
        confirmText={confirmationState.confirmText} 
        cancelText={confirmationState.cancelText} 
        onConfirm={() => { 
          if (confirmationState.onConfirm) confirmationState.onConfirm(); 
        }} 
        onCancel={() => 
          setConfirmationState((prev) => ({ ...prev, isOpen: false })) 
        } 
      /> 
      {showContactModal && ( 
        <ContactModal onClose={() => setShowContactModal(false)} /> 
      )} 
      {showAboutModal && ( 
        <AboutModal onClose={() => setShowAboutModal(false)} /> 
      )} 
      <CreateNewsModal 
        isOpen={isNewsModalOpen} 
        onClose={handleCloseModal} 
        onSubmit={handleNewsFormSubmit} 
        isSubmitting={isSubmittingNews} 
        editMode={!!editingNewsItem} 
        initialData={editingNewsItem} 
      /> 
    </div> 
  ); 
}