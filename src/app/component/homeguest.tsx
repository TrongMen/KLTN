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
import { io, Socket } from "socket.io-client";
import UserMenu from "./menu";
import ContactModal from "./modals/ContactModal";
import AboutModal from "./modals/AboutModal";
import HomeTabContent from "./tabs/HomeTabContent";
import RegisteredEventsTabContent from "./tabs/RegisteredEventsTabContent";
import MembersTabContent from "./tabs/MembersTabContent";
import ChatTabContent from "./tabs/ChatTabContent";
import NewsTabContent from "./tabs/NewsTabContent";
import { useRefreshToken } from "../../hooks/useRefreshToken";
import { toast, Toaster } from "react-hot-toast";
import NotificationDropdown, { NotificationItem } from "./NotificationDropdown";
import {
  BellIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
} from "@radix-ui/react-icons";
import { User, EventDisplayInfo, NewsItem } from "./types/appTypes";
import Image from "next/image";
import {
  ChatMessageNotificationPayload,
  MainConversationType,
  Message,
  ApiUserDetail,
  ApiGroupChatListItem,
  ApiGroupChatDetail,
  Participant as ChatParticipant,
} from "./tabs/chat/ChatTabContentTypes";
import ConfirmationDialog from "../../utils/ConfirmationDialog";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["vietnamese", "latin"],
  weight: ["700"],
});
type ActiveTab = "home" | "news" | "registeredEvents" | "members" | "chatList";
const OTHER_TABS_PER_PAGE_MOBILE = 3;
const OTHER_TABS_PER_PAGE_DESKTOP = 6;
export default function HomeGuest() {
  console.log("HomeGuest function body started");
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [sortOption, setSortOption] = useState("date");
  const [timeFilterOption, setTimeFilterOption] = useState("all");
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [isRegistering, setIsRegistering] = useState<string | null>(null);
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

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState<boolean>(true);
  const [errorNews, setErrorNews] = useState<string | null>(null);

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

  const socketRef = useRef<Socket | null>(null);
  const initializedRef = useRef(false);
  const router = useRouter();
  const { refreshToken } = useRefreshToken();

  const [globalChatPayloadForTab, setGlobalChatPayloadForTab] =
    useState<ChatMessageNotificationPayload | null>(null);
  const [chatUserCache, setChatUserCache] = useState<
    Record<string, ApiUserDetail>
  >({});
  const [chatConversations, setChatConversations] = useState<
    MainConversationType[]
  >([]);
  const [isLoadingChatConversations, setIsLoadingChatConversations] =
    useState<boolean>(true);
  const [errorChatConversations, setErrorChatConversations] = useState<
    string | null
  >(null);
  const [selectedChatConversation, setSelectedChatConversation] =
    useState<MainConversationType | null>(null);
  const [isLoadingChatDetails, setIsLoadingChatDetails] =
    useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoadingChatMessages, setIsLoadingChatMessages] =
    useState<boolean>(false);
  const [errorChatMessages, setErrorChatMessages] = useState<string | null>(
    null
  );
  const [chatMediaMessages, setChatMediaMessages] = useState<Message[]>([]);
  const [chatFileMessages, setChatFileMessages] = useState<Message[]>([]);
  const [chatAudioMessages, setChatAudioMessages] = useState<Message[]>([]);
  const [isLoadingChatMedia, setIsLoadingChatMedia] = useState<boolean>(false);
  const [isLoadingChatFiles, setIsLoadingChatFiles] = useState<boolean>(false);
  const [isLoadingChatAudio, setIsLoadingChatAudio] = useState<boolean>(false);
  const [errorChatMedia, setErrorChatMedia] = useState<string | null>(null);
  const [errorChatFiles, setErrorChatFiles] = useState<string | null>(null);
  const [errorChatAudio, setErrorChatAudio] = useState<string | null>(null);
  const [isProcessingChatAction, setIsProcessingChatAction] =
    useState<boolean>(false);
  const [downloadingChatFileId, setDownloadingChatFileId] = useState<
    string | null
  >(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentTabSetPage, setCurrentTabSetPage] = useState(0);

  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobileView();
    window.addEventListener("resize", checkMobileView);
    return () => window.removeEventListener("resize", checkMobileView);
  }, []);

  const TABS_PER_PAGE = isMobileView
    ? OTHER_TABS_PER_PAGE_MOBILE
    : OTHER_TABS_PER_PAGE_DESKTOP;

  const fetchChatUserDetailsWithCache = useCallback(
    async (
      userId: string,
      tokenParam: string | null
    ): Promise<ApiUserDetail | null> => {
      const effectiveToken = tokenParam || localStorage.getItem("authToken");
      if (!effectiveToken) {
        return null;
      }
      try {
        const userUrl = `http://localhost:8080/identity/users/notoken/${userId}`;
        let userRes = await fetch(userUrl, {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });

        if (userRes.status === 401 || userRes.status === 403) {
          const newRefreshedToken = await refreshToken();
          if (newRefreshedToken) {
            userRes = await fetch(userUrl, {
              headers: { Authorization: `Bearer ${newRefreshedToken}` },
            });
          } else {
            console.error(
              "Failed to refresh token for user details (HomeGuest)"
            );
            return null;
          }
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.code === 1000 && userData.result) {
            return userData.result as ApiUserDetail;
          }
        }
      } catch (err) {
        console.error("Error fetching user details for chat (HomeGuest):", err);
      }
      return null;
    },
    [refreshToken]
  );

  const getChatDisplayName = useCallback(
    (
      detail: ApiUserDetail | ChatParticipant | null,
      fallbackName?: string
    ): string => {
      if (!detail) return fallbackName || "Người dùng không xác định";
      if ("firstName" in detail || "lastName" in detail) {
        const apiDetail = detail as ApiUserDetail;
        const fullName = `${apiDetail.lastName || ""} ${
          apiDetail.firstName || ""
        }`.trim();
        return (
          fullName ||
          apiDetail.username ||
          fallbackName ||
          `User (${String(apiDetail.id).substring(0, 4)})`
        );
      } else if (
        "name" in detail &&
        "id" in detail &&
        typeof detail.id !== "undefined"
      ) {
        const participantDetail = detail as ChatParticipant;
        return (
          participantDetail.name ||
          fallbackName ||
          `User (${String(participantDetail.id).substring(0, 4)})`
        );
      }
      return fallbackName || "Người dùng không xác định";
    },
    []
  );

  const fetchChatConversationsAPI = useCallback(async () => {
    if (!user?.id) {
      setErrorChatConversations(
        "Thông tin người dùng không hợp lệ để tải cuộc trò chuyện."
      );
      setIsLoadingChatConversations(false);
      setChatConversations([]);
      return;
    }
    setIsLoadingChatConversations(true);
    setErrorChatConversations(null);
    const currentUserId = user.id;
    let token = localStorage.getItem("authToken");
    const newFetchedUserDetailsGlobally: Record<string, ApiUserDetail> = {};

    try {
      if (!token) {
        const refreshedToken = await refreshToken();
        if (refreshedToken) {
          token = refreshedToken;
          localStorage.setItem("authToken", token);
        } else {
          throw new Error("Yêu cầu xác thực.");
        }
      }

      const listUrl = `http://localhost:8080/identity/api/events/group-chats/user/${currentUserId}`;
      let listResponse = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (listResponse.status === 401 || listResponse.status === 403) {
        const refreshedToken = await refreshToken();
        if (refreshedToken) {
          token = refreshedToken;
          localStorage.setItem("authToken", token);
          listResponse = await fetch(listUrl, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
        } else {
          throw new Error(
            "Không thể làm mới token và truy cập danh sách nhóm."
          );
        }
      }

      if (!listResponse.ok) {
        const errorData = await listResponse.json().catch(() => ({
          message: `Lỗi ${listResponse.status} khi tải danh sách nhóm.`,
        }));
        throw new Error(
          errorData.message ||
            `Lỗi ${listResponse.status} khi tải danh sách nhóm.`
        );
      }

      const listData = await listResponse.json();

      if (listData.code !== 1000 || !Array.isArray(listData.result)) {
        throw new Error(
          listData.message || "Dữ liệu danh sách nhóm không hợp lệ."
        );
      }

      const groupBaseInfo: {
        id: string;
        name: string;
        groupLeaderId: string | null;
        avatar: string;
      }[] = listData.result.map((g: ApiGroupChatListItem) => ({
        id: g.id,
        name: g.name,
        groupLeaderId: g.groupLeaderId,
        avatar:
          g.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            g.name
          )}&background=random&font-size=0.4`,
      }));

      if (groupBaseInfo.length === 0) {
        setChatConversations([]);
        // setIsLoadingChatConversations(false); // Moved to finally block
        return;
      }

      const conversationPromises = groupBaseInfo.map(async (groupInfo) => {
        let lastMessageContent = "Chưa có tin nhắn";
        let sentAt: string | undefined = undefined;
        let lastMessageSenderId: string | undefined = undefined;
        let lastMessageSenderNameDisplay: string | undefined = undefined;

        try {
          const messagesUrl = `http://localhost:8080/identity/api/events/${groupInfo.id}/messages?page=0&size=1&sort=sentAt,desc`;
          const messagesResponse = await fetch(messagesUrl, {
            headers: { Authorization: `Bearer ${token!}` },
            cache: "no-store",
          });
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            const messagesResult =
              messagesData.result?.content || messagesData.result;
            if (
              messagesData.code === 1000 &&
              Array.isArray(messagesResult) &&
              messagesResult.length > 0
            ) {
              const lastMessage = messagesResult[0] as Message;
              lastMessageContent =
                lastMessage.content ??
                `Đã gửi: ${lastMessage.fileName || "File"}`;
              sentAt = lastMessage.sentAt;
              lastMessageSenderId = lastMessage.senderId;

              if (lastMessage.senderId === currentUserId) {
                lastMessageSenderNameDisplay = "Bạn";
              } else {
                // Check existing global cache first
                let userDetail =
                  chatUserCache[lastMessage.senderId] ||
                  newFetchedUserDetailsGlobally[lastMessage.senderId];
                if (!userDetail) {
                  const fetchedDetail = await fetchChatUserDetailsWithCache(
                    lastMessage.senderId,
                    token
                  );
                  if (fetchedDetail) {
                    newFetchedUserDetailsGlobally[lastMessage.senderId] =
                      fetchedDetail; // Store for batch update
                    userDetail = fetchedDetail;
                  }
                }
                lastMessageSenderNameDisplay = getChatDisplayName(
                  userDetail,
                  lastMessage.senderName ||
                    `User (${lastMessage.senderId.substring(0, 4)})`
                );
              }
            }
          } else {
            console.warn(
              `Could not fetch last message for group ${groupInfo.id}: ${messagesResponse.status} (HomeGuest)`
            );
          }
        } catch (err) {
          console.error(
            `Error fetching last message for group ${groupInfo.id} (HomeGuest):`,
            err
          );
        }
        return {
          id: groupInfo.id,
          name: groupInfo.name,
          isGroup: true,
          groupLeaderId: groupInfo.groupLeaderId,
          avatar: groupInfo.avatar,
          participants: [],
          message: lastMessageContent,
          sentAt: sentAt,
          lastMessageSenderId: lastMessageSenderId,
          lastMessageSenderName: lastMessageSenderNameDisplay,
        };
      });

      const resolvedConversations = await Promise.all(conversationPromises);
      if (Object.keys(newFetchedUserDetailsGlobally).length > 0) {
        setChatUserCache((prev) => ({
          ...prev,
          ...newFetchedUserDetailsGlobally,
        }));
      }

      const sortedChats = resolvedConversations.sort(
        (a, b) =>
          (b.sentAt ? new Date(b.sentAt).getTime() : 0) -
          (a.sentAt ? new Date(a.sentAt).getTime() : 0)
      );
      setChatConversations(sortedChats);
    } catch (error: any) {
      setErrorChatConversations(
        error.message || "Lỗi tải danh sách cuộc trò chuyện."
      );
      toast.error(error.message || "Lỗi tải danh sách cuộc trò chuyện.");
      setChatConversations([]);
      if (
        error.message?.includes("Yêu cầu xác thực") ||
        error.message?.includes("Không thể làm mới token")
      ) {
        router.push("/login?sessionExpired=true");
      }
    } finally {
      setIsLoadingChatConversations(false);
    }
  }, [
    user,
    refreshToken,
    router,
    getChatDisplayName,
    fetchChatUserDetailsWithCache,
    chatUserCache,
  ]);

  const fetchChatMessagesAPI = useCallback(
    async (groupId: string) => {
      if (!groupId || !user?.id) return;
      setIsLoadingChatMessages(true);
      setErrorChatMessages(null);
      let token = localStorage.getItem("authToken");
      const currentUserId = user.id;
      const newFetchedUserDetailsGlobally: Record<string, ApiUserDetail> = {};

      try {
        if (!token) {
          const refreshedToken = await refreshToken();
          if (refreshedToken) {
            token = refreshedToken;
            localStorage.setItem("authToken", token);
          } else throw new Error("Yêu cầu xác thực.");
        }
        const url = `http://localhost:8080/identity/api/events/${groupId}/messages`;
        let response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 403) {
          const refreshedToken = await refreshToken();
          if (refreshedToken) {
            token = refreshedToken;
            localStorage.setItem("authToken", token);
            response = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
          } else throw new Error("Không thể làm mới token và tải tin nhắn.");
        }
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ message: `Lỗi ${response.status}` }));
          throw new Error(errorData.message || `Lỗi ${response.status}`);
        }
        const data = await response.json();
        if (data.code === 1000 && data.result) {
          let fetchedMessages: Message[] = [];
          if (Array.isArray(data.result)) fetchedMessages = data.result;
          else if (data.result.content && Array.isArray(data.result.content))
            fetchedMessages = data.result.content;
          else
            throw new Error("Định dạng dữ liệu tin nhắn không hợp lệ từ API.");

          const messagesWithSenderNames = await Promise.all(
            fetchedMessages.map(async (msg) => {
              if (msg.senderId === currentUserId)
                return { ...msg, senderName: "Bạn" };
              let senderDetail =
                chatUserCache[msg.senderId] ||
                newFetchedUserDetailsGlobally[msg.senderId] ||
                selectedChatConversation?.participants?.find(
                  (p) => p.id === msg.senderId
                );
              if (!senderDetail) {
                const fetchedDetail = await fetchChatUserDetailsWithCache(
                  msg.senderId,
                  token
                );
                if (fetchedDetail) {
                  newFetchedUserDetailsGlobally[msg.senderId] = fetchedDetail;
                  senderDetail = fetchedDetail;
                }
              }
              const displayName = getChatDisplayName(
                senderDetail,
                msg.senderName || `User (${msg.senderId.substring(0, 4)})`
              );
              return { ...msg, senderName: displayName };
            })
          );
          if (Object.keys(newFetchedUserDetailsGlobally).length > 0) {
            setChatUserCache((prev) => ({
              ...prev,
              ...newFetchedUserDetailsGlobally,
            }));
          }
          const sortedMessages = messagesWithSenderNames.sort(
            (a, b) =>
              new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
          );
          setChatMessages(sortedMessages);
        } else if (
          data.code === 1000 &&
          ((Array.isArray(data.result) && data.result.length === 0) ||
            (data.result.content &&
              Array.isArray(data.result.content) &&
              data.result.content.length === 0))
        ) {
          setChatMessages([]);
        } else
          throw new Error(
            data.message || "Định dạng dữ liệu tin nhắn không hợp lệ."
          );
      } catch (error: any) {
        setErrorChatMessages(error.message || "Lỗi tải tin nhắn.");
        toast.error(`Lỗi tải tin nhắn: ${error.message}`);
        setChatMessages([]);
        if (
          error.message?.includes("Yêu cầu xác thực") ||
          error.message?.includes("Không thể làm mới token")
        ) {
          router.push("/login?sessionExpired=true");
        }
      } finally {
        setIsLoadingChatMessages(false);
      }
    },
    [
      user,
      refreshToken,
      router,
      fetchChatUserDetailsWithCache,
      getChatDisplayName,
      selectedChatConversation?.participants,
      chatUserCache,
    ]
  );

  const fetchGroupChatDetailsAPI = useCallback(
    async (groupId: string) => {
      if (!groupId || !user?.id) return;
      setIsLoadingChatDetails(true);
      const currentSummary = chatConversations.find(
        (c) => String(c.id) === groupId
      );
      setSelectedChatConversation((prev) => ({
        ...(prev || ({} as MainConversationType)),
        ...(currentSummary || { id: groupId, name: "Đang tải..." }),
        id: groupId,
        participants: prev?.participants || [],
      }));
      let token = localStorage.getItem("authToken");
      const newFetchedUserDetailsGlobally: Record<string, ApiUserDetail> = {};
      if (!token) {
        const nt = await refreshToken();
        if (nt) token = nt;
        else {
          toast.error("Yêu cầu xác thực.");
          setIsLoadingChatDetails(false);
          return;
        }
      }
      try {
        const groupUrl = `http://localhost:8080/identity/api/events/group-chats/${groupId}`;
        let groupResponse = await fetch(groupUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (groupResponse.status === 401 || groupResponse.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            groupResponse = await fetch(groupUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } else throw new Error("Làm mới token thất bại");
        }
        if (!groupResponse.ok) {
          const errData = await groupResponse
            .json()
            .catch(() => ({ message: `Lỗi ${groupResponse.status}` }));
          throw new Error(errData.message || `Lỗi ${groupResponse.status}`);
        }
        const groupData = await groupResponse.json();
        if (groupData.code !== 1000 || !groupData.result) {
          throw new Error(groupData.message || "Không lấy được chi tiết nhóm.");
        }
        const groupDetailsApi = groupData.result as ApiGroupChatDetail;
        const memberIds = new Set<string>(groupDetailsApi.memberIds || []);
        if (groupDetailsApi.groupLeaderId)
          memberIds.add(groupDetailsApi.groupLeaderId);

        const participantPromises = Array.from(memberIds).map(async (id) => {
          let detail = chatUserCache[id] || newFetchedUserDetailsGlobally[id];
          if (!detail) {
            const fetched = await fetchChatUserDetailsWithCache(id, token);
            if (fetched) {
              newFetchedUserDetailsGlobally[id] = fetched;
              detail = fetched;
            }
          }
          return detail;
        });
        const fetchedUserDetailsArray = (
          await Promise.all(participantPromises)
        ).filter(Boolean) as ApiUserDetail[];
        if (Object.keys(newFetchedUserDetailsGlobally).length > 0) {
          setChatUserCache((prev) => ({
            ...prev,
            ...newFetchedUserDetailsGlobally,
          }));
        }
        const finalParticipantList: ChatParticipant[] = Array.from(
          memberIds
        ).map((id) => {
          const userDetail =
            fetchedUserDetailsArray.find((u) => u.id === id) ||
            chatUserCache[id];
          const name = getChatDisplayName(
            userDetail,
            `User (${id.substring(0, 4)})`
          );
          const avatar =
            userDetail?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              name.charAt(0) || "?"
            )}&background=random&size=32`;
          return { id, name, avatar };
        });
        setSelectedChatConversation((prev) => ({
          ...(prev || ({} as MainConversationType)),
          id: groupDetailsApi.id,
          name: groupDetailsApi.name,
          isGroup: true,
          groupLeaderId: groupDetailsApi.groupLeaderId,
          participants: finalParticipantList,
          avatar:
            prev?.avatar ||
            currentSummary?.avatar ||
            groupDetailsApi.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              groupDetailsApi.name
            )}&background=random&font-size=0.4`,
          message: prev?.message || currentSummary?.message || "...",
          sentAt: prev?.sentAt || currentSummary?.sentAt,
          lastMessageSenderId:
            prev?.lastMessageSenderId || currentSummary?.lastMessageSenderId,
          lastMessageSenderName:
            prev?.lastMessageSenderName ||
            currentSummary?.lastMessageSenderName,
        }));
      } catch (error: any) {
        toast.error(`Lỗi tải chi tiết nhóm: ${error.message}`);
        setSelectedChatConversation((prev) => ({
          ...(prev || ({} as MainConversationType)),
          id: groupId,
          name: prev?.name || "Lỗi tải tên nhóm",
          participants: prev?.participants || [],
        }));
        if (
          error.message?.includes("Yêu cầu xác thực") ||
          error.message?.includes("Làm mới token thất bại")
        ) {
          router.push("/login?sessionExpired=true");
        }
      } finally {
        setIsLoadingChatDetails(false);
      }
    },
    [
      chatConversations,
      user,
      refreshToken,
      router,
      fetchChatUserDetailsWithCache,
      getChatDisplayName,
      chatUserCache,
    ]
  );

  const fetchChatMediaMessagesAPI = useCallback(
    async (groupId: string) => {
      if (!groupId || !user?.id) return;
      setIsLoadingChatMedia(true);
      setErrorChatMedia(null);
      let token = localStorage.getItem("authToken");
      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) token = nt;
          else throw new Error("Auth required.");
        }
        const url = `http://localhost:8080/identity/api/events/${groupId}/messages/media`;
        let res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } else throw new Error("Refresh token failed");
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || `Lỗi ${res.status}`);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result))
          setChatMediaMessages(data.result);
        else if (data.code === 1000 && data.result.length === 0)
          setChatMediaMessages([]);
        else throw new Error(data.message || "Cannot load media list.");
      } catch (error: any) {
        setErrorChatMedia(error.message || "Error loading media.");
        setChatMediaMessages([]);
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        )
          router.push("/login?sessionExpired=true");
      } finally {
        setIsLoadingChatMedia(false);
      }
    },
    [user?.id, refreshToken, router]
  );

  const fetchChatFileMessagesAPI = useCallback(
    async (groupId: string) => {
      if (!groupId || !user?.id) return;
      setIsLoadingChatFiles(true);
      setErrorChatFiles(null);
      let token = localStorage.getItem("authToken");
      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) token = nt;
          else throw new Error("Auth required.");
        }
        const url = `http://localhost:8080/identity/api/events/${groupId}/messages/files`;
        let res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } else throw new Error("Refresh token failed");
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || `Lỗi ${res.status}`);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result))
          setChatFileMessages(data.result);
        else if (data.code === 1000 && data.result.length === 0)
          setChatFileMessages([]);
        else throw new Error(data.message || "Cannot load file list.");
      } catch (error: any) {
        setErrorChatFiles(error.message || "Error loading files.");
        setChatFileMessages([]);
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        )
          router.push("/login?sessionExpired=true");
      } finally {
        setIsLoadingChatFiles(false);
      }
    },
    [user?.id, refreshToken, router]
  );

  const fetchChatAudioMessagesAPI = useCallback(
    async (groupId: string) => {
      if (!groupId || !user?.id) return;
      setIsLoadingChatAudio(true);
      setErrorChatAudio(null);
      let token = localStorage.getItem("authToken");
      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) token = nt;
          else throw new Error("Auth required.");
        }
        const url = `http://localhost:8080/identity/api/events/${groupId}/messages/audios`;
        let res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } else throw new Error("Refresh token failed");
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || `Lỗi ${res.status}`);
        }
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result))
          setChatAudioMessages(data.result);
        else if (data.code === 1000 && data.result.length === 0)
          setChatAudioMessages([]);
        else throw new Error(data.message || "Cannot load audio list.");
      } catch (error: any) {
        setErrorChatAudio(error.message || "Error loading audio.");
        setChatAudioMessages([]);
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        )
          router.push("/login?sessionExpired=true");
      } finally {
        setIsLoadingChatAudio(false);
      }
    },
    [user?.id, refreshToken, router]
  );

  const handleRemoveMemberChatAPI = useCallback(
    async (groupId: string | number, memberId: string, leaderId: string) => {
      if (!groupId || !memberId || !leaderId || !user?.id) {
        toast.error("Thông tin không đầy đủ hoặc người dùng không hợp lệ.");
        return;
      }
      setIsProcessingChatAction(true);
      const tId = toast.loading("Đang xóa thành viên...");
      let token = localStorage.getItem("authToken");
      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) token = nt;
          else throw new Error("Auth required.");
        }
        const url = `http://localhost:8080/identity/api/events/group-chats/${groupId}/members/${memberId}?leaderId=${leaderId}`;
        let res = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            res = await fetch(url, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          } else throw new Error("Refresh token failed");
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || `Lỗi ${res.status}`);
        }
        toast.success("Đã xóa thành viên!", { id: tId });
        fetchGroupChatDetailsAPI(String(groupId));
      } catch (error: any) {
        toast.error(`Thất bại: ${error.message}`, { id: tId });
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        )
          router.push("/login?sessionExpired=true");
      } finally {
        setIsProcessingChatAction(false);
      }
    },
    [user?.id, refreshToken, router, fetchGroupChatDetailsAPI]
  );

  const handleLeaveGroupChatAPI = useCallback(
    async (groupId: string | number, memberId: string) => {
      if (!groupId || !memberId || !user?.id) {
        toast.error("Thông tin không đầy đủ hoặc người dùng không hợp lệ.");
        return;
      }
      setIsProcessingChatAction(true);
      const tId = toast.loading("Đang rời nhóm...");
      let token = localStorage.getItem("authToken");
      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) token = nt;
          else throw new Error("Auth required.");
        }
        const url = `http://localhost:8080/identity/api/events/group-chats/${groupId}/leave?memberId=${memberId}`;
        let res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            res = await fetch(url, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
          } else throw new Error("Refresh token failed");
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || `Lỗi ${res.status}`);
        }
        toast.success("Đã rời nhóm!", { id: tId });
        setChatConversations((prev) =>
          prev.filter((c) => String(c.id) !== String(groupId))
        );
        setSelectedChatConversation(null);
      } catch (error: any) {
        toast.error(`Thất bại: ${error.message}`, { id: tId });
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        )
          router.push("/login?sessionExpired=true");
      } finally {
        setIsProcessingChatAction(false);
      }
    },
    [user?.id, refreshToken, router]
  );

  const handleSendMessageChatAPI = useCallback(
    async (
      groupId: string,
      senderId: string,
      messageText: string,
      tempMessageId: string
    ): Promise<Message | null> => {
      if (!user?.id) {
        toast.error("Người dùng không hợp lệ.");
        return null;
      }
      setIsProcessingChatAction(true);
      let token = localStorage.getItem("authToken");
      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) token = nt;
          else throw new Error("Auth required.");
        }
        if (!groupId) throw new Error("Group ID không tồn tại.");
        const url = `http://localhost:8080/identity/api/events/${groupId}/messages`;
        const form = new FormData();
        form.append("senderId", senderId);
        form.append("content", messageText);
        let res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            res = await fetch(url, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: form,
            });
          } else throw new Error("Refresh token failed");
        }
        const data = await res.json();
        if (!res.ok || !(data.code === 1000 && data.result && data.result.id)) {
          throw new Error(
            data.message || `Lỗi ${res.status || "gửi tin nhắn"}`
          );
        }
        const actualMessageFromServer = {
          ...data.result,
          senderName: "Bạn",
        } as Message;

        setChatMessages((prevMessages) => {
          const filteredMessages = prevMessages.filter(
            (msg) =>
              msg.id !== tempMessageId && msg.id !== actualMessageFromServer.id
          );
          return [...filteredMessages, actualMessageFromServer].sort(
            (a, b) =>
              new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
          );
        });

        setChatConversations((prevList) => {
          const idx = prevList.findIndex(
            (c) => String(c.id) === String(groupId)
          );
          if (idx === -1) return prevList;
          const updatedConvo = {
            ...prevList[idx],
            message:
              actualMessageFromServer.content ??
              `Đã gửi: ${actualMessageFromServer.fileName || "File"}`,
            sentAt: actualMessageFromServer.sentAt,
            lastMessageSenderId: actualMessageFromServer.senderId,
            lastMessageSenderName: "Bạn",
          };
          const newList = prevList.filter(
            (c) => String(c.id) !== String(groupId)
          );
          newList.unshift(updatedConvo);
          return newList.sort(
            (a, b) =>
              new Date(b.sentAt || 0).getTime() -
              new Date(a.sentAt || 0).getTime()
          );
        });
        return actualMessageFromServer;
      } catch (error: any) {
        toast.error(`Gửi thất bại: ${error.message}`);
        if (tempMessageId) {
          setChatMessages((prev) => prev.filter((m) => m.id !== tempMessageId));
        }
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        )
          router.push("/login?sessionExpired=true");
        return null;
      } finally {
        setIsProcessingChatAction(false);
      }
    },
    [user?.id, refreshToken, router]
  );

  const handleSendFileChatAPI = useCallback(
    async (
      groupId: string,
      senderId: string,
      file: File
    ): Promise<Message | null> => {
      if (!user?.id) {
        toast.error("Người dùng không hợp lệ.");
        return null;
      }
      setIsProcessingChatAction(true);
      const tId = toast.loading(`Đang tải lên ${file.name}...`);
      let token = localStorage.getItem("authToken");

      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            localStorage.setItem("authToken", token);
          } else {
            throw new Error("Auth required.");
          }
        }
        const url = `http://localhost:8080/identity/api/events/${groupId}/messages`;
        const form = new FormData();
        form.append("senderId", senderId);
        form.append("file", file);
        let res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            localStorage.setItem("authToken", token);
            res = await fetch(url, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: form,
            });
          } else {
            throw new Error("Refresh token failed");
          }
        }
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.message || `Lỗi ${res.status}`);
        }
        const data = await res.json();
        if (data.code === 1000 && data.result) {
          toast.success(`Đã gửi ${file.name}!`, { id: tId });
          const sentMessage = { ...data.result, senderName: "Bạn" } as Message;
          setChatMessages((prevMessages) => {
            const filteredMessages = prevMessages.filter(
              (msg) => msg.id !== sentMessage.id
            );
            return [...filteredMessages, sentMessage].sort(
              (a, b) =>
                new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
            );
          });
          setChatConversations((prevList) => {
            const idx = prevList.findIndex(
              (c) => String(c.id) === String(groupId)
            );
            if (idx === -1) return prevList;
            const updatedConvo = {
              ...prevList[idx],
              message: `Đã gửi: ${sentMessage.fileName || "File"}`,
              sentAt: sentMessage.sentAt,
              lastMessageSenderId: sentMessage.senderId,
              lastMessageSenderName: "Bạn",
            };
            const newList = prevList.filter(
              (c) => String(c.id) !== String(groupId)
            );
            newList.unshift(updatedConvo);
            return newList.sort(
              (a, b) =>
                new Date(b.sentAt || 0).getTime() -
                new Date(a.sentAt || 0).getTime()
            );
          });
          return sentMessage;
        } else {
          throw new Error(data.message || `Gửi thất bại ${file.name}.`);
        }
      } catch (error: any) {
        toast.error(`Gửi thất bại: ${error.message}`, { id: tId });
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        ) {
          router.push("/login?sessionExpired=true");
        }
        return null;
      } finally {
        setIsProcessingChatAction(false);
      }
    },
    [user?.id, refreshToken, router]
  );

  const handleDeleteMessageChatAPI = useCallback(
    async (
      messageId: string,
      userIdParam: string,
      currentGroupId: string | number
    ): Promise<boolean> => {
      if (!user?.id || userIdParam !== user.id) {
        toast.error("Không có quyền xóa hoặc người dùng không hợp lệ.");
        return false;
      }
      setIsProcessingChatAction(true);
      const toastId = toast.loading("Đang xóa tin nhắn...");
      let token = localStorage.getItem("authToken");
      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) token = nt;
          else throw new Error("Auth required.");
        }
        const url = `http://localhost:8080/identity/api/events/messages/${messageId}?userId=${userIdParam}`;
        let response = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.status === 401 || response.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            response = await fetch(url, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
          } else throw new Error("Refresh token failed");
        }
        const responseText = await response.text();
        let responseData;
        try {
          responseData = responseText
            ? JSON.parse(responseText)
            : { code: response.ok ? 1000 : 0 };
        } catch (e) {
          if (response.ok && !responseText) responseData = { code: 1000 };
          else throw new Error("Phản hồi xóa không hợp lệ.");
        }
        if (!response.ok && responseData.code !== 1000)
          throw new Error(responseData.message || `Lỗi ${response.status}`);
        toast.success("Đã xóa tin nhắn!", { id: toastId });

        let newLastMessage: Message | null = null;
        setChatMessages((prevMessages) => {
          const remaining = prevMessages.filter((msg) => msg.id !== messageId);
          if (remaining.length > 0)
            newLastMessage = remaining[remaining.length - 1];
          return remaining;
        });
        setChatConversations((prevList) => {
          const idx = prevList.findIndex(
            (c) => String(c.id) === String(currentGroupId)
          );
          if (idx === -1) return prevList;
          const senderDetails =
            selectedChatConversation?.participants?.find(
              (p) => p.id === newLastMessage?.senderId
            ) ||
            (newLastMessage ? chatUserCache[newLastMessage.senderId] : null);
          const senderName = newLastMessage
            ? newLastMessage.senderId === user?.id
              ? "Bạn"
              : getChatDisplayName(senderDetails, newLastMessage.senderName)
            : undefined;
          const updatedConvo = {
            ...prevList[idx],
            message: newLastMessage
              ? newLastMessage.content ??
                `Đã gửi: ${newLastMessage.fileName || "File"}`
              : "Chưa có tin nhắn",
            sentAt: newLastMessage?.sentAt,
            lastMessageSenderId: newLastMessage?.senderId,
            lastMessageSenderName: senderName,
          };
          const newList = prevList.filter(
            (c) => String(c.id) !== String(currentGroupId)
          );
          newList.unshift(updatedConvo);
          return newList.sort(
            (a, b) =>
              new Date(b.sentAt || 0).getTime() -
              new Date(a.sentAt || 0).getTime()
          );
        });
        return true;
      } catch (error: any) {
        toast.error(`Xóa thất bại: ${error.message}`, { id: toastId });
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        )
          router.push("/login?sessionExpired=true");
        return false;
      } finally {
        setIsProcessingChatAction(false);
      }
    },
    [
      user?.id,
      refreshToken,
      router,
      selectedChatConversation?.participants,
      chatUserCache,
      getChatDisplayName,
    ]
  );

  const handleDownloadFileChatAPI = useCallback(
    async (messageId: string, fileName?: string | null) => {
      if (!messageId || !user?.id) {
        toast.error("Thông tin không hợp lệ.");
        return;
      }
      setDownloadingChatFileId(messageId);
      const tId = toast.loading(`Đang tải ${fileName || "tệp"}...`);
      let token = localStorage.getItem("authToken");
      try {
        if (!token) {
          const nt = await refreshToken();
          if (nt) token = nt;
          else throw new Error("Auth required.");
        }
        const url = `http://localhost:8080/identity/api/events/messages/${messageId}/download`;
        let res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          const nt = await refreshToken();
          if (nt) {
            token = nt;
            res = await fetch(url, {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            });
          } else throw new Error("Refresh token failed");
        }
        if (!res.ok) {
          const e = await res
            .json()
            .catch(() => ({ message: `Lỗi tải xuống: ${res.status}` }));
          throw new Error(e.message || `Lỗi tải xuống: ${res.status}`);
        }
        const disposition = res.headers.get("content-disposition");
        let finalFName = fileName || "downloaded_file";
        if (disposition) {
          const m = disposition.match(/filename\*?=['"]?([^'";]+)['"]?/i);
          if (m && m[1]) {
            const encoded = m[1];
            if (encoded.toLowerCase().startsWith("utf-8''"))
              finalFName = decodeURIComponent(encoded.substring(7));
            else {
              try {
                finalFName = decodeURIComponent(escape(encoded));
              } catch (e) {
                finalFName = encoded;
              }
            }
          }
        }
        const blob = await res.blob();
        const dlUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = dlUrl;
        a.download = finalFName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(dlUrl);
        a.remove();
        toast.success(`Đã tải ${finalFName}!`, { id: tId });
      } catch (error: any) {
        toast.error(`Tải thất bại: ${error.message || "Lỗi không xác định"}`, {
          id: tId,
        });
        if (
          error.message?.includes("Auth required") ||
          error.message?.includes("Refresh token failed")
        )
          router.push("/login?sessionExpired=true");
      } finally {
        setDownloadingChatFileId(null);
      }
    },
    [user?.id, refreshToken, router]
  );

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
        } else {
          console.warn("Token refresh failed while fetching news (HomeGuest)");
        }
      }
      if (!res.ok) {
        const status = res.status;
        let msg = `HTTP ${status} news fetch`;
        try {
          const errText = await res.text();
          const err = errText ? JSON.parse(errText) : {};
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
        if (activeTab === "news") toast.success("Đã làm mới bảng tin!");
      } else {
        throw new Error(d.message || "Lỗi định dạng dữ liệu tin tức");
      }
    } catch (e: any) {
      console.error("Lỗi fetchNews (HomeGuest):", e);
      setErrorNews(e.message || "Lỗi tải tin tức.");
      setNewsItems([]);
      if (activeTab === "news")
        toast.error(
          `Làm mới bảng tin thất bại: ${e.message || "Lỗi không xác định"}`
        );
    } finally {
      setIsLoadingNews(false);
    }
  }, [refreshToken, activeTab]);

  const fetchAllEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setErrorEvents(null);
    let currentToken = localStorage.getItem("authToken");
    try {
      let headers: HeadersInit = {};
      if (currentToken) headers["Authorization"] = `Bearer ${currentToken}`;
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
      let res = await fetch(url, { headers: headers, cache: "no-store" });
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
          res = await fetch(url, { headers: headers, cache: "no-store" });
        } else {
          console.warn("Token refresh failed during event fetch (HomeGuest)");
        }
      }
      if (!res.ok) {
        const status = res.status;
        let msg = `HTTP ${status}`;
        try {
          const errText = await res.text();
          const err = errText ? JSON.parse(errText) : {};
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
            progressStatus: e.progressStatus,
            avatarUrl: e.avatarUrl || null,
            status: e.status,
            createdBy: e.createdBy,
            organizers: e.organizers || [],
            participants: e.participants || [],
            attendees: e.attendees || [],
            maxAttendees: e.maxAttendees || 0,
            event: e.event,
          }));
        setAllEvents(fmt);
        if (activeTab === "home")
          console.log("HomeGuest mounted. Attempting a test toast.");

        toast.success("Đã làm mới danh sách sự kiện!");
      } else {
        throw new Error(d.message || "Lỗi định dạng dữ liệu sự kiện");
      }
    } catch (e: any) {
      console.error("Lỗi fetchAllEvents (HomeGuest):", e);
      setErrorEvents(e.message || "Lỗi tải sự kiện.");
      if (activeTab === "home")
        toast.error(
          `Làm mới sự kiện thất bại: ${e.message || "Lỗi không xác định"}`
        );
    } finally {
      setIsLoadingEvents(false);
    }
  }, [refreshToken, activeTab]);

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
        let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
        let res = await fetch(url, { headers: headers, cache: "no-store" });
        if ((res.status === 401 || res.status === 403) && refreshToken) {
          const nt = await refreshToken();
          if (nt) {
            currentToken = nt;
            localStorage.setItem("authToken", nt);
            headers["Authorization"] = `Bearer ${currentToken}`;
            res = await fetch(url, { headers: headers, cache: "no-store" });
          } else {
            throw new Error("Unauthorized or Refresh Failed");
          }
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          setRegisteredEventIds(
            new Set(data.result.map((event: any) => event.id))
          );
        } else {
          setRegisteredEventIds(new Set());
        }
      } catch (err: any) {
        console.error("Lỗi tải ID sự kiện đã đăng ký (HomeGuest):", err);
        setRegisteredEventIds(new Set());
        if (
          err.message?.includes("Unauthorized") ||
          err.message?.includes("Refresh Failed")
        ) {
          router.push("/login?sessionExpired=true");
        }
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
        let headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
        let res = await fetch(url, { headers: headers, cache: "no-store" });
        if ((res.status === 401 || res.status === 403) && refreshToken) {
          const nt = await refreshToken();
          if (nt) {
            currentToken = nt;
            localStorage.setItem("authToken", nt);
            headers["Authorization"] = `Bearer ${currentToken}`;
            res = await fetch(url, { headers: headers, cache: "no-store" });
          } else {
            throw new Error("Unauthorized or Refresh Failed");
          }
        }
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          setCreatedEventIds(
            new Set(data.result.map((event: any) => event.id))
          );
        } else {
          setCreatedEventIds(new Set());
        }
      } catch (err: any) {
        console.error("Lỗi tải ID sự kiện đã tạo (HomeGuest):", err);
        setCreatedEventIds(new Set());
        if (
          err.message?.includes("Unauthorized") ||
          err.message?.includes("Refresh Failed")
        ) {
          router.push("/login?sessionExpired=true");
        }
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
        setIsLoadingNotifications(false);
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
        if ((res.status === 401 || res.status === 403) && refreshToken) {
          const newToken = await refreshToken();
          if (newToken) {
            currentToken = newToken;
            localStorage.setItem("authToken", newToken);
            headers["Authorization"] = `Bearer ${newToken}`;
            res = await fetch(url, { headers, cache: "no-store" });
          } else {
            throw new Error("Unauthorized or Refresh Failed");
          }
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
        } else {
          throw new Error(data.message || "Lỗi định dạng dữ liệu thông báo");
        }
      } catch (error: any) {
        console.error("Lỗi fetchNotifications (HomeGuest):", error);
        setErrorNotifications(error.message || "Lỗi tải thông báo.");
        setNotifications([]);
        if (
          error.message?.includes("Unauthorized") ||
          error.message?.includes("Refresh Failed")
        ) {
          router.push("/login?sessionExpired=true");
        }
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
      setIsLoadingNews(true);
      setIsLoadingRegisteredIds(true);
      setIsLoadingCreatedEventIds(true);
      setIsLoadingNotifications(true);
      setIsLoadingChatConversations(true);

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
              throw new Error(
                "Unauthorized or Refresh Failed during user fetch"
              );
            }
          }

          if (!userRes.ok) {
            const errorText = await userRes.text();
            const errorJson = errorText ? JSON.parse(errorText) : {};
            throw new Error(
              errorJson.message ||
                `Workspace user info failed: ${userRes.status}`
            );
          }

          const userData = await userRes.json();
          if (userData.code === 1000 && userData.result?.id) {
            const fetchedUser: User = userData.result;
            userIdForFetches = fetchedUser.id;
            setUser(fetchedUser);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error: any) {
        console.error("Lỗi fetch user info (HomeGuest):", error.message);
        setUser(null);
        userIdForFetches = null;
        tokenForSubFetches = null;
        if (
          error.message?.includes("Unauthorized or Refresh Failed") ||
          error.message?.includes("Workspace user info failed")
        ) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("refreshToken");
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
        fetchChatConversationsAPI(); // Called after user is set and other initial data is fetched
      } else {
        setIsLoadingRegisteredIds(false);
        setIsLoadingCreatedEventIds(false);
        setNotifications([]);
        setIsLoadingNotifications(false);
        setChatConversations([]);
        setIsLoadingChatConversations(false);
      }
    };
    loadInitialData();
  }, [
    fetchAllEvents,
    fetchRegisteredEventIds,
    fetchUserCreatedEvents,
    fetchNews,
    fetchNotifications,
    fetchChatConversationsAPI, // Keep as dependency if its stability is ensured
    refreshToken,
    router,
  ]);

  useEffect(() => {
    if (!user?.id) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (!socketRef.current) {
      const socket = io(`ws://localhost:9099`, {
        path: "/socket.io",
        query: { userId: user.id },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("SOCKET (HomeGuest): Đã kết nối - ID:", socket.id);
      });

      socket.on("disconnect", (reason) => {
        console.log("SOCKET (HomeGuest): Đã ngắt kết nối - Lý do:", reason);
        if (reason === "io server disconnect") {
          toast.error("Mất kết nối máy chủ thông báo.", {
            id: "socket-disconnect",
          });
        }
      });

      socket.on("connect_error", (error) => {
        console.error("SOCKET (HomeGuest): Lỗi kết nối:", error);
        toast.error("Không thể kết nối máy chủ thông báo.", {
          id: "socket-error",
        });
      });

      socket.on("notification", (data: any) => {
        if (data && typeof data === "object") {
          toast(`🔔 ${data.title || "Bạn có thông báo mới!"}`, {
            duration: 5000,
          });
          const newNotification: NotificationItem = {
            id: data.id || `socket-guest-${Date.now()}`,
            title: data.title || "Thông báo",
            content: data.content || "",
            type: data.type || "SYSTEM",
            read: data.read !== undefined ? data.read : false,
            createdAt: data.createdAt || new Date().toISOString(),
            relatedId: data.relatedId,
            userId: data.userId || user.id,
          };
          setNotifications((prevNotifications) =>
            [newNotification, ...prevNotifications].slice(0, 15)
          );
        } else {
          console.warn(
            "SOCKET (HomeGuest): Dữ liệu thông báo không hợp lệ:",
            data
          );
        }
      });

      socket.on(
        "global_chat_notification",
        (payload: ChatMessageNotificationPayload) => {
          if (!user) return;
          setGlobalChatPayloadForTab(payload);

          if (payload.senderId !== user.id) {
            let notificationDisplayContent =
              payload.actualMessageContent ||
              payload.messageContentPreview ||
              "Có tin nhắn mới";
            if (payload.messageType === "FILE" && payload.fileName) {
              notificationDisplayContent = `Đã gửi một tệp: ${payload.fileName}`;
            } else if (payload.messageType === "IMAGE") {
              notificationDisplayContent = "Đã gửi một hình ảnh.";
            } else if (payload.messageType === "VIDEO") {
              notificationDisplayContent = "Đã gửi một video.";
            } else if (payload.messageType === "AUDIO") {
              notificationDisplayContent = "Đã gửi một đoạn âm thanh.";
            }
            toast(
              `💬 ${payload.senderName}: ${notificationDisplayContent.substring(
                0,
                50
              )}${notificationDisplayContent.length > 50 ? "..." : ""}`,
              { duration: 4000 }
            );
            const chatNotification: NotificationItem = {
              id: `chat-${payload.messageId}-${Date.now()}`,
              title: `Tin nhắn mới từ ${payload.senderName} (Nhóm: ${payload.groupName})`,
              content:
                notificationDisplayContent.substring(0, 150) +
                (notificationDisplayContent.length > 150 ? "..." : ""),
              type: "NEW_CHAT_MESSAGE",
              read: false,
              createdAt: payload.sentAt || new Date().toISOString(),
              relatedId: payload.groupId,
              userId: user.id,
            };
            setNotifications((prevNotifications) =>
              [chatNotification, ...prevNotifications].slice(0, 15)
            );
          }

          if (
            selectedChatConversation &&
            String(selectedChatConversation.id) === String(payload.groupId)
          ) {
            const newMessageFromServer: Message = {
              id: payload.messageId,
              content: payload.actualMessageContent,
              senderId: payload.senderId,
              senderName: payload.senderName,
              sentAt: payload.sentAt,
              groupId: payload.groupId,
              fileName: payload.fileName,
              fileUrl: payload.fileUrl,
              fileSize: payload.fileSize,
              type: payload.messageType || "TEXT",
            };
            setChatMessages((prevMessages) => {
              const existingMessageIndex = prevMessages.findIndex(
                (msg) => msg.id === newMessageFromServer.id
              );
              if (existingMessageIndex > -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[existingMessageIndex] = {
                  ...updatedMessages[existingMessageIndex],
                  ...newMessageFromServer,
                };
                return updatedMessages.sort(
                  (a, b) =>
                    new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
                );
              } else {
                return [...prevMessages, newMessageFromServer].sort(
                  (a, b) =>
                    new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
                );
              }
            });
          }
          setChatConversations((prevList) => {
            const idx = prevList.findIndex(
              (c) => String(c.id) === String(payload.groupId)
            );
            if (idx === -1) {
              fetchChatConversationsAPI();
              return prevList;
            }

            let lastMessageDisplay =
              payload.actualMessageContent ||
              payload.messageContentPreview ||
              "Có tin nhắn mới";
            if (payload.messageType === "FILE" && payload.fileName)
              lastMessageDisplay = `Đã gửi tệp: ${payload.fileName}`;
            else if (payload.messageType === "IMAGE")
              lastMessageDisplay = "Đã gửi hình ảnh.";
            else if (payload.messageType === "VIDEO")
              lastMessageDisplay = "Đã gửi video.";
            else if (payload.messageType === "AUDIO")
              lastMessageDisplay = "Đã gửi đoạn âm thanh.";

            const updatedConvo = {
              ...prevList[idx],
              message: lastMessageDisplay,
              sentAt: payload.sentAt,
              lastMessageSenderId: payload.senderId,
              lastMessageSenderName: payload.senderName,
            };
            const newList = prevList.filter(
              (c) => String(c.id) !== String(payload.groupId)
            );
            newList.unshift(updatedConvo);
            return newList.sort(
              (a, b) =>
                new Date(b.sentAt || 0).getTime() -
                new Date(a.sentAt || 0).getTime()
            );
          });
        }
      );
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect");
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("notification");
        socketRef.current.off("global_chat_notification");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [
    user,
    toast,
    selectedChatConversation,
    fetchChatConversationsAPI,
    setGlobalChatPayloadForTab,
    setNotifications,
    getChatDisplayName,
    chatUserCache,
  ]); // Added getChatDisplayName and chatUserCache if used by senderName logic

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

  const handleLogout = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        await fetch(`http://localhost:8080/identity/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token }),
        });
      }
    } catch (error) {
      console.error("Lỗi logout:", error);
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

  const executeRegistration = async (event: EventDisplayInfo) => {
    if (!user || !user.id || isRegistering) return;
    setIsRegistering(event.id);
    let token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsRegistering(null);
      router.push("/login");
      return;
    }
    let currentToken = token;
    try {
      const url = `http://localhost:8080/identity/api/events/${event.id}/attendees?userId=${user.id}`;
      let res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if ((res.status === 401 || res.status === 403) && refreshToken) {
        const nt = await refreshToken();
        if (nt) {
          currentToken = nt;
          localStorage.setItem("authToken", nt);
          res = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${currentToken}` },
          });
        } else {
          throw new Error("Không thể làm mới phiên đăng nhập.");
        }
      }
      if (!res.ok) {
        let m = "Đăng ký thất bại";
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        if (res.status === 403) m = "Bạn không có quyền đăng ký.";
        else if (res.status === 409) m = "Bạn đã đăng ký sự kiện này rồi.";
        else if (res.status === 401)
          m = "Phiên đăng nhập hết hạn hoặc không hợp lệ.";
        throw new Error(m);
      }
      const data = await res.json();
      if (data.code === 1000) {
        toast.success(`Đã đăng ký "${event.title}"!`);
        setRegisteredEventIds((prev) => new Set(prev).add(event.id));
        fetchChatConversationsAPI();
      } else {
        throw new Error(data.message || "Lỗi đăng ký từ server.");
      }
    } catch (err: any) {
      console.error("Lỗi đăng ký:", err);
      toast.error(`${err.message || "Đăng ký thất bại."}`);
      if (
        err.message?.includes("Unauthorized") ||
        err.message?.includes("Không thể làm mới")
      ) {
        router.push("/login?sessionExpired=true");
      }
    } finally {
      setIsRegistering(null);
    }
  };

  const handleRegister = (event: EventDisplayInfo) => {
    if (!user || !user.id) {
      toast(
        (t) => (
          <div className="flex flex-col items-center gap-3">
            <span className="text-center">
              🔒 Vui lòng đăng nhập để đăng ký sự kiện{" "}
              <strong>"{event.title}"</strong>.
            </span>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  router.push("/login");
                }}
                className="flex-1 px-3 py-1.5 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex-1 px-3 py-1.5 rounded bg-gray-200 text-gray-700 text-sm hover:bg-gray-300"
              >
                Để sau
              </button>
            </div>
          </div>
        ),
        { duration: 8000 }
      );
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
    const isEventUpcomingOrOngoing =
      new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0));
    if (!isEventUpcomingOrOngoing) {
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
      fetchChatConversationsAPI();
    },
    [fetchChatConversationsAPI]
  );

  const handleEventClick = (event: EventDisplayInfo) => setSelectedEvent(event);
  const handleBackToList = () => setSelectedEvent(null);

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
      if ((res.status === 401 || res.status === 403) && refreshToken) {
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
      console.error("Lỗi đánh dấu thông báo đã đọc:", error);
      toast.error(`Lỗi: ${error.message || "Không thể đánh dấu đã đọc."}`);
      if (
        error.message?.includes("Unauthorized") ||
        error.message?.includes("Không thể làm mới")
      ) {
        router.push("/login?sessionExpired=true");
      }
    }
  };
  const handleOpenCreateNewsModalForGuest = () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để tạo tin tức.");
      router.push("/login");
      return;
    }

    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">Thông báo</p>
                <p className="mt-1 text-sm text-gray-500">
                  Chức năng tạo tin tức không có sẵn ở giao diện này. Vui lòng
                  sử dụng trang quản lý (nếu có quyền).
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Đóng
            </button>
          </div>
        </div>
      ),
      { duration: 6000 }
    );
  };

  const handleOpenEditNewsModalForGuest = (newsItem: NewsItem) => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để chỉnh sửa tin tức.");
      router.push("/login");
      return;
    }
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-enter" : "animate-leave"
          } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">Thông báo</p>
                <p className="mt-1 text-sm text-gray-500">
                  Chức năng chỉnh sửa tin tức "{newsItem.title}" không có sẵn ở
                  giao diện này. Vui lòng sử dụng trang quản lý (nếu có quyền).
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Đóng
            </button>
          </div>
        </div>
      ),
      { duration: 8000 }
    );
  };

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const isPageLoading = !initializedRef.current || isLoadingUser;

  const getTabButtonClasses = (tabName: ActiveTab): string => {
    const base =
      "cursor-pointer px-4 py-2 text-xs sm:text-sm font-semibold rounded-full shadow-sm transition";
    const active = "text-white";
    const inactive = "hover:bg-opacity-80";
    let bg = "",
      txt = "",
      hoverBg = "";
    switch (tabName) {
      case "home":
        bg = activeTab === tabName ? "bg-indigo-600" : "bg-indigo-100";
        txt = activeTab === tabName ? "" : "text-indigo-800";
        hoverBg =
          activeTab === tabName ? "hover:bg-indigo-700" : "hover:bg-indigo-200";
        break;
      case "news":
        bg = activeTab === tabName ? "bg-green-600" : "bg-green-100";
        txt = activeTab === tabName ? "" : "text-green-800";
        hoverBg =
          activeTab === tabName ? "hover:bg-green-700" : "hover:bg-green-200";
        break;
      case "registeredEvents":
        bg = activeTab === tabName ? "bg-blue-600" : "bg-blue-100";
        txt = activeTab === tabName ? "" : "text-blue-800";
        hoverBg =
          activeTab === tabName ? "hover:bg-blue-700" : "hover:bg-blue-200";
        break;
      case "members":
        bg = activeTab === tabName ? "bg-pink-600" : "bg-pink-100";
        txt = activeTab === tabName ? "" : "text-pink-800";
        hoverBg =
          activeTab === tabName ? "hover:bg-pink-700" : "hover:bg-pink-200";
        break;
      case "chatList":
        bg = activeTab === tabName ? "bg-purple-600" : "bg-purple-100";
        txt = activeTab === tabName ? "" : "text-purple-800";
        hoverBg =
          activeTab === tabName ? "hover:bg-purple-700" : "hover:bg-purple-200";
        break;
      default:
        bg = "bg-gray-100";
        txt = "text-gray-800";
        hoverBg = "hover:bg-gray-200";
    }
    return `${base} ${bg} ${activeTab === tabName ? active : txt} ${
      activeTab !== tabName ? inactive : ""
    } ${hoverBg}`;
  };
  const getActiveIndicatorColor = (tabName: ActiveTab): string => {
    switch (tabName) {
      case "home":
        return "border-t-indigo-600";
      case "news":
        return "border-t-green-600";
      case "registeredEvents":
        return "border-t-blue-600";
      case "members":
        return "border-t-pink-600";
      case "chatList":
        return "border-t-purple-600";
      default:
        return "border-t-gray-400";
    }
  };

  const tabs = [
    { id: "home", label: "🎉 Trang chủ", requiresAuth: false },
    { id: "news", label: "📰 Bảng tin ", requiresAuth: false },
    {
      id: "registeredEvents",
      label: "📋 Sự kiện tham gia",
      requiresAuth: true,
    },
    { id: "members", label: "👥 Thành viên CLB", requiresAuth: true },
    { id: "chatList", label: "💬 Trò chuyện", requiresAuth: true },
  ];
  const totalOtherTabPages = Math.ceil(tabs.length / TABS_PER_PAGE);

  const currentVisibleOtherTabs = useMemo(() => {
    const adjustedCurrentPage = Math.min(
      currentTabSetPage,
      Math.max(0, totalOtherTabPages - 1)
    );
    if (currentTabSetPage !== adjustedCurrentPage) {
      setCurrentTabSetPage(adjustedCurrentPage);
    }

    const startIndex = adjustedCurrentPage * TABS_PER_PAGE;
    const endIndex = startIndex + TABS_PER_PAGE;
    return tabs.slice(startIndex, endIndex);
  }, [tabs, currentTabSetPage, TABS_PER_PAGE, totalOtherTabPages]);

  useEffect(() => {
    const newTotalPages = Math.ceil(tabs.length / TABS_PER_PAGE);
    if (currentTabSetPage >= newTotalPages && newTotalPages > 0) {
      setCurrentTabSetPage(newTotalPages - 1);
    } else if (newTotalPages === 0 && currentTabSetPage !== 0) {
      setCurrentTabSetPage(0);
    }
  }, [TABS_PER_PAGE, tabs.length, currentTabSetPage]);

  const handleNextTabs = () => {
    setCurrentTabSetPage((prevPage) =>
      Math.min(prevPage + 1, totalOtherTabPages - 1)
    );
  };

  const handlePrevTabs = () => {
    setCurrentTabSetPage((prevPage) => Math.max(prevPage - 1, 0));
  };

  const showPrevButton = currentTabSetPage > 0 && tabs.length > TABS_PER_PAGE;
  const showNextButton =
    currentTabSetPage < totalOtherTabPages - 1 && tabs.length > TABS_PER_PAGE;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 relative">
      <Toaster toastOptions={{ duration: 4000 }} position="top-center" />
      <nav className="bg-white text-gray-800 px-4 py-4 shadow-md mb-6 sticky top-0 z-40 ">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Image
              src="https://icc.iuh.edu.vn/web/wp-content/uploads/2024/09/iuh_logo-rut-gon-1024x577.png"
              alt="Logo IUH"
              width={70}
              height={40}
              className="h-10 w-auto"
              priority
            />
            <span className={`font-bold text-xl ml-3 ${playfair.className}`}>
              IUH TSE
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base">
            <span
              className="cursor-pointer hover:text-indigo-600 transition-colors"
              onClick={() => setShowAboutModal(true)}
            >
              Giới thiệu
            </span>
            <span
              className="cursor-pointer hover:text-indigo-600"
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

      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mb-6 border border-gray-200 sticky top-20 z-30">
        <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-5 justify-center pb-3">
          {tabs.length > 0 && (
            <div className="flex items-center grow justify-center min-w-0">
              {showPrevButton && (
                <button
                  onClick={handlePrevTabs}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors shrink-0 cursor-pointer"
                  aria-label="Các tab trước"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
              )}
              {!showPrevButton && tabs.length > TABS_PER_PAGE && (
                <div className="w-[36px] h-[36px] shrink-0"></div> // Placeholder để giữ layout
              )}

              <div
                className={`flex flex-nowrap gap-x-1 sm:gap-x-2 justify-center overflow-visible ${
                  !showPrevButton &&
                  !showNextButton &&
                  tabs.length > TABS_PER_PAGE
                    ? "mx-auto"
                    : ""
                } ${
                  (showPrevButton && !showNextButton) ||
                  (!showPrevButton && showNextButton)
                    ? "flex-grow justify-center"
                    : ""
                }`}
              >
                {currentVisibleOtherTabs.map((tab) => (
                  <div
                    key={tab.id}
                    className="relative flex flex-col items-center"
                  >
                    <button
                      onClick={() => setActiveTab(tab.id as ActiveTab)}
                      className={`${getTabButtonClasses(tab.id as ActiveTab)} ${
                        isMobileView ? "px-2 text-[11px]" : ""
                      }`}
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
                ))}
              </div>

              {showNextButton && (
                <button
                  onClick={handleNextTabs}
                  className="p-2 rounded-full hover:bg-gray-200 transition-colors shrink-0 cursor-pointer"
                  aria-label="Các tab kế tiếp"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
              )}
              {!showNextButton && tabs.length > TABS_PER_PAGE && (
                <div className="w-[36px] h-[36px] shrink-0"></div> // Placeholder
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 min-h-[400px]">
        {isLoadingUser &&
        (activeTab === "registeredEvents" ||
          activeTab === "members" ||
          activeTab === "chatList") ? (
          <p className="text-center text-gray-500 italic py-6">
            Đang tải thông tin người dùng...
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
                onNewsDeleted={refreshNewsList}
                refreshToken={refreshToken}
                onRefreshNews={fetchNews}
                allEvents={allEvents}
                registeredEventIds={registeredEventIds}
                createdEventIdsForEvents={createdEventIds}
                onRegisterForEvent={handleRegister}
                isRegisteringForEventId={isRegistering}
              />
            )}

            {user && activeTab === "registeredEvents" && (
              <RegisteredEventsTabContent
                currentUserId={user.id}
                isLoadingUserId={false}
                registeredEventIds={registeredEventIds}
                createdEventIds={createdEventIds}
                onRegistrationChange={handleRegistrationChange}
              />
            )}

            {user && activeTab === "members" && (
              <MembersTabContent
                user={user}
                userRole={user.roles?.[0]?.name?.toUpperCase() || "GUEST"}
                currentUserEmail={user.email || null}
                onSessionExpired={() =>
                  router.push("/login?sessionExpired=true")
                }
                refreshToken={refreshToken}
              />
            )}

            {user && activeTab === "chatList" && (
              <>
                {isLoadingChatConversations &&
                  chatConversations.length === 0 &&
                  !errorChatConversations && (
                    <p className="text-center text-gray-500 italic py-6">
                      Đang tải danh sách trò chuyện...
                    </p>
                  )}
                {errorChatConversations && chatConversations.length === 0 && (
                  <p className="text-center text-red-500 italic py-6">
                    {errorChatConversations}
                  </p>
                )}
                {(!isLoadingChatConversations ||
                  chatConversations.length > 0 ||
                  errorChatConversations) && (
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
              </>
            )}

            {tabs.find((t) => t.id === activeTab)?.requiresAuth && !user && (
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
          setConfirmationState((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => {
          if (confirmationState.onCancel) confirmationState.onCancel();
          else setConfirmationState((prev) => ({ ...prev, isOpen: false }));
        }}
      />
      {showContactModal && (
        <ContactModal onClose={() => setShowContactModal(false)} />
      )}

      {showAboutModal && (
        <AboutModal onClose={() => setShowAboutModal(false)} />
      )}
    </div>
  );
}
