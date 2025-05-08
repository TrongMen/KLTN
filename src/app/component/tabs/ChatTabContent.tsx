"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  FileTextIcon,
  ImageIcon,
  SpeakerLoudIcon,
  DownloadIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { io, Socket } from "socket.io-client";

import { User as MainUserType, Role, Participant } from "../homeuser";

// --- Interfaces ---
interface MainConversationType {
  id: string | number;
  name: string;
  isGroup: boolean;
  message: string;
  avatar?: string | null;
  participants?: Participant[];
  groupLeaderId?: string | null;
  sentAt?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
}

interface ApiGroupChatListItem {
  id: string;
  name: string;
  eventId: string | null;
  groupLeaderId: string | null;
  memberIds: string[] | null;
  status: string | null;
  message?: string | null;
  sentAt?: string | null;
  lastMessageSenderId?: string | null;
  lastMessageSenderName?: string | null;
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

interface Message {
  id: string;
  content: string | null;
  senderId: string;
  senderName?: string;
  sentAt: string;
  type: "TEXT" | "FILE" | "IMAGE" | "VIDEO" | "AUDIO";
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  deleted?: boolean;
  downloadUrl?: string | null;
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

// ConfirmationDialog Component
function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  confirmVariant = "primary",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;
  const confirmButtonClasses = useMemo(() => {
    let base =
      "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger") {
      base +=
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    } else {
      base +=
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
    }
    return base;
  }, [confirmVariant]);
  const cancelButtonClasses =
    "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300 ease-out"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {" "}
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 ease-out scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        <h3
          id="dialog-title"
          className={`text-lg font-bold mb-3 ${
            confirmVariant === "danger" ? "text-red-700" : "text-gray-800"
          }`}
        >
          {" "}
          {title}{" "}
        </h3>{" "}
        <div className="text-sm text-gray-600 mb-5">{message}</div>{" "}
        <div className="flex gap-3">
          {" "}
          <button onClick={onCancel} className={cancelButtonClasses}>
            {" "}
            {cancelText}{" "}
          </button>{" "}
          <button onClick={onConfirm} className={confirmButtonClasses}>
            {" "}
            {confirmText}{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}

const ChatTabContent: React.FC<ChatTabContentProps> = ({ currentUser }) => {
  // States
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [selectedConversation, setSelectedConversation] =
    useState<MainConversationType | null>(null);
  const [conversations, setConversations] = useState<MainConversationType[]>(
    []
  );
  const [isLoadingConversations, setIsLoadingConversations] =
    useState<boolean>(true);
  const [errorConversations, setErrorConversations] = useState<string | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isProcessingAction, setIsProcessingAction] = useState<boolean>(false);
  const [participantSearchTerm, setParticipantSearchTerm] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [errorMessages, setErrorMessages] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mediaMessages, setMediaMessages] = useState<Message[]>([]);
  const [fileMessages, setFileMessages] = useState<Message[]>([]);
  const [audioMessages, setAudioMessages] = useState<Message[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [errorMedia, setErrorMedia] = useState<string | null>(null);
  const [errorFiles, setErrorFiles] = useState<string | null>(null);
  const [errorAudio, setErrorAudio] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null
  );
  const [activeInfoTab, setActiveInfoTab] = useState<
    "media" | "files" | "audio"
  >("media");
  const [removeConfirmationState, setRemoveConfirmationState] = useState<{
    isOpen: boolean;
    memberToRemove: Participant | null;
    onConfirm: (() => void) | null;
    onCancel: () => void;
  }>({
    isOpen: false,
    memberToRemove: null,
    onConfirm: null,
    onCancel: () => {},
  });
  const [leaveConfirmationState, setLeaveConfirmationState] = useState<{
    isOpen: boolean;
    onConfirm: (() => void) | null;
    onCancel: () => void;
  }>({ isOpen: false, onConfirm: null, onCancel: () => {} });
  const [deleteMessageConfirmationState, setDeleteMessageConfirmationState] =
    useState<{
      isOpen: boolean;
      messageIdToDelete: string | null;
      onConfirm: (() => void) | null;
      onCancel: () => void;
    }>({
      isOpen: false,
      messageIdToDelete: null,
      onConfirm: null,
      onCancel: () => {},
    });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const groupSocket = useRef<Socket | null>(null);

  // Utils
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  // --- Data Fetching ---
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
        id: string;
        name: string;
        groupLeaderId: string | null;
        avatar: string;
      }[] = listData.result.map((g: ApiGroupChatListItem) => ({
        id: g.id,
        name: g.name,
        groupLeaderId: g.groupLeaderId,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          g.name
        )}&background=random&font-size=0.4`,
      }));
      if (groupBaseInfo.length === 0) {
        setConversations([]);
        setIsLoadingConversations(false);
        return;
      }

      console.log("Fetching latest message and sender name for each group...");
      const conversationPromises = groupBaseInfo.map(async (groupInfo) => {
        let lastMessage: Message | null = null;
        let lastMessageText = "Chưa có tin nhắn";
        let sentAt: string | undefined = undefined;
        let lastMessageSenderId: string | undefined = undefined;
        let lastMessageSenderName: string | undefined = undefined;
        try {
          const messagesUrl = `http://localhost:8080/identity/api/events/${groupInfo.id}/messages?page=0&size=1&sort=sentAt,desc`;
          const messagesResponse = await fetch(messagesUrl, {
            headers: { Authorization: `Bearer ${token}` },
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
              lastMessage = messagesResult[0] as Message;
              lastMessageText =
                lastMessage.content ??
                `Đã gửi: ${lastMessage.fileName || "File"}`;
              sentAt = lastMessage.sentAt;
              lastMessageSenderId = lastMessage.senderId;
              if (lastMessage.senderId === currentUser.id) {
                lastMessageSenderName = "Bạn";
              } else if (lastMessage.senderName) {
                if (lastMessage.senderName.includes(" ")) {
                  lastMessageSenderName = lastMessage.senderName;
                } else {
                  try {
                    const userUrl = `http://localhost:8080/identity/users/notoken/${lastMessage.senderId}`;
                    const userRes = await fetch(userUrl);
                    if (userRes.ok) {
                      const userData = await userRes.json();
                      if (userData.code === 1000 && userData.result) {
                        const userDetail = userData.result as ApiUserDetail;
                        lastMessageSenderName =
                          `${userDetail.lastName || ""} ${
                            userDetail.firstName || ""
                          }`.trim() ||
                          userDetail.username ||
                          lastMessage.senderName;
                      } else {
                        lastMessageSenderName = lastMessage.senderName;
                      }
                    } else {
                      lastMessageSenderName = lastMessage.senderName;
                    }
                  } catch (userErr) {
                    console.error(
                      `Lỗi fetch tên user ${lastMessage.senderId}:`,
                      userErr
                    );
                    lastMessageSenderName = lastMessage.senderName;
                  }
                }
              } else {
                try {
                  const userUrl = `http://localhost:8080/identity/users/notoken/${lastMessage.senderId}`;
                  const userRes = await fetch(userUrl);
                  if (userRes.ok) {
                    const userData = await userRes.json();
                    if (userData.code === 1000 && userData.result) {
                      const userDetail = userData.result as ApiUserDetail;
                      lastMessageSenderName =
                        `${userDetail.lastName || ""} ${
                          userDetail.firstName || ""
                        }`.trim() ||
                        userDetail.username ||
                        undefined;
                    }
                  }
                } catch (userErr) {
                  console.error(
                    `Lỗi fetch tên user ${lastMessage.senderId}:`,
                    userErr
                  );
                }
              }
            }
          } else {
            console.error(
              `Workspace msg lỗi ${messagesResponse.status} cho group ${groupInfo.id}`
            );
            lastMessageText = "Lỗi tải tin nhắn";
          }
        } catch (err) {
          console.error(`Workspace msg error cho group ${groupInfo.id}:`, err);
          lastMessageText = "Lỗi tải tin nhắn";
        }
        return {
          id: groupInfo.id,
          name: groupInfo.name,
          isGroup: true,
          groupLeaderId: groupInfo.groupLeaderId,
          avatar: groupInfo.avatar,
          participants: [],
          message: lastMessageText,
          sentAt: sentAt,
          lastMessageSenderId: lastMessageSenderId,
          lastMessageSenderName: lastMessageSenderName,
        };
      });
      const resolvedConversations = await Promise.all(conversationPromises);
      const sortedChats = resolvedConversations.sort(
        (a, b) =>
          (b.sentAt ? new Date(b.sentAt).getTime() : 0) -
          (a.sentAt ? new Date(a.sentAt).getTime() : 0)
      );
      console.log(
        "Final conversations state after fetching all latest messages:",
        sortedChats
      );
      setConversations(sortedChats);
    } catch (error: any) {
      console.error("Lỗi fetchConversations:", error);
      setErrorConversations(error.message || "Lỗi tải danh sách.");
      toast.error(error.message || "Lỗi tải danh sách.");
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setIsLoadingMessages(true);
    setErrorMessages(null);
    setMessages([]);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Yêu cầu xác thực.");
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let e = `Lỗi ${response.status}`;
        try {
          const d = await response.json();
          e = d.message || e;
        } catch {}
        throw new Error(e);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const sortedMessages = data.result.sort(
          (a: Message, b: Message) =>
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
        setMessages(sortedMessages);
      } else if (
        data.code === 1000 &&
        Array.isArray(data.result) &&
        data.result.length === 0
      ) {
        setMessages([]);
      } else {
        throw new Error(data.message || "Định dạng dữ liệu không hợp lệ");
      }
    } catch (error: any) {
      console.error(`Lỗi tải messages ${groupId}:`, error);
      setErrorMessages(error.message || "Lỗi tải tin.");
      toast.error(`Lỗi tải tin nhắn: ${error.message}`);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);
  const fetchGroupChatDetails = useCallback(
    async (groupId: string) => {
      if (!groupId || !currentUser?.id) return;
      setIsLoadingDetails(true);
      setParticipantSearchTerm("");
      const currentSummary = conversations.find(
        (c) => String(c.id) === groupId
      );
      setSelectedConversation((prev) => ({
        ...(prev || ({} as MainConversationType)),
        ...(currentSummary || { id: groupId, name: "Loading..." }),
        id: groupId,
        participants: prev?.participants || [],
      }));
      let groupDetails: ApiGroupChatDetail | null = null;
      const userDetailsMap = new Map<string, ApiUserDetail>();
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Yêu cầu xác thực.");
        const groupUrl = `http://localhost:8080/identity/api/events/group-chats/${groupId}`;
        const groupResponse = await fetch(groupUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!groupResponse.ok) {
          let e = `Lỗi ${groupResponse.status}`;
          try {
            const d = await groupResponse.json();
            e = d.message || e;
          } catch {}
          throw new Error(e);
        }
        const groupData = await groupResponse.json();
        if (groupData.code !== 1000 || !groupData.result) {
          throw new Error(groupData.message || "Không lấy được chi tiết nhóm.");
        }
        groupDetails = groupData.result;
        const allParticipantIds = new Set<string>(groupDetails.memberIds || []);
        if (groupDetails.groupLeaderId) {
          allParticipantIds.add(groupDetails.groupLeaderId);
        }
        const participantPromises = Array.from(allParticipantIds).map(
          async (userId) => {
            try {
              const userUrl = `http://localhost:8080/identity/users/notoken/${userId}`;
              const userResponse = await fetch(userUrl);
              if (userResponse.ok) {
                const userData = await userResponse.json();
                if (userData.code === 1000 && userData.result) {
                  return {
                    status: "fulfilled",
                    value: userData.result as ApiUserDetail,
                  };
                } else {
                  console.warn(
                    `Invalid data user ${userId}:`,
                    userData.message || `code ${userData.code}`
                  );
                  return {
                    status: "rejected",
                    reason: `Invalid data user ${userId}`,
                  };
                }
              } else {
                console.warn(`Lỗi ${userResponse.status} fetch user ${userId}`);
                return {
                  status: "rejected",
                  reason: `Failed fetch user ${userId}`,
                };
              }
            } catch (err) {
              console.error(`Error fetch user ${userId}:`, err);
              return {
                status: "rejected",
                reason: `Error fetch user ${userId}`,
              };
            }
          }
        );
        const results = await Promise.allSettled(participantPromises);
        results.forEach((r) => {
          if (r.status === "fulfilled" && r.value.status === "fulfilled") {
            userDetailsMap.set(r.value.value.id, r.value.value);
          } else if (
            r.status === "fulfilled" &&
            r.value.status === "rejected"
          ) {
            console.warn(`API rejected user: ${r.value.reason}`);
          } else if (r.status === "rejected") {
            console.error(`Promise rejected user fetch: ${r.reason}`);
          }
        });
        const finalParticipantList: Participant[] = [];
        allParticipantIds.forEach((userId) => {
          const userDetail = userDetailsMap.get(userId);
          let participantName: string;
          let participantAvatar: string | null = null;
          if (userId === currentUser.id) {
            participantName =
              `${currentUser.lastName || ""} ${
                currentUser.firstName || ""
              }`.trim() || "Bạn";
            participantAvatar = currentUser.avatar || userDetail?.avatar;
          } else if (userDetail) {
            participantName = `${userDetail.lastName || ""} ${
              userDetail.firstName || ""
            }`.trim();
            if (!participantName) {
              participantName =
                userDetail.username || `User (${userId.substring(0, 4)}...)`;
            }
            participantAvatar = userDetail.avatar;
          } else {
            participantName = `User (${userId.substring(0, 4)}...)`;
          }
          if (!participantAvatar) {
            participantAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              participantName.charAt(0) || "?"
            )}&background=random&size=32`;
          }
          finalParticipantList.push({
            id: userId,
            name: participantName,
            avatar: participantAvatar,
          });
        });
        setSelectedConversation((prev) => ({
          ...(prev || ({} as MainConversationType)),
          id: groupDetails!.id,
          name: groupDetails!.name,
          isGroup: true,
          groupLeaderId: groupDetails!.groupLeaderId,
          participants: finalParticipantList,
          avatar:
            prev?.avatar ||
            currentSummary?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              groupDetails!.name
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
        console.error(`Lỗi tải details ${groupId}:`, error);
        toast.error(`Lỗi tải details: ${error.message}`);
        setSelectedConversation((prev) => ({
          ...(prev || ({} as MainConversationType)),
          id: groupId,
          participants: prev?.participants || [],
        }));
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [conversations, currentUser]
  );
  const fetchMediaMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setIsLoadingMedia(true);
    setErrorMedia(null);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Auth required.");
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/media`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let e = `Lỗi ${res.status}`;
        try {
          const d = await res.json();
          e = d.message || e;
        } catch {}
        throw new Error(e);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setMediaMessages(data.result);
      } else if (
        data.code === 1000 &&
        Array.isArray(data.result) &&
        data.result.length === 0
      ) {
        setMediaMessages([]);
      } else {
        throw new Error(data.message || "Cannot load media list.");
      }
    } catch (error: any) {
      console.error(`Error loading media ${groupId}:`, error);
      setErrorMedia(error.message || "Error loading media.");
      setMediaMessages([]);
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);
  const fetchFileMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setIsLoadingFiles(true);
    setErrorFiles(null);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Auth required.");
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/files`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let e = `Lỗi ${res.status}`;
        try {
          const d = await res.json();
          e = d.message || e;
        } catch {}
        throw new Error(e);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setFileMessages(data.result);
      } else if (
        data.code === 1000 &&
        Array.isArray(data.result) &&
        data.result.length === 0
      ) {
        setFileMessages([]);
      } else {
        throw new Error(data.message || "Cannot load file list.");
      }
    } catch (error: any) {
      console.error(`Error loading files ${groupId}:`, error);
      setErrorFiles(error.message || "Error loading files.");
      setFileMessages([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);
  const fetchAudioMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setIsLoadingAudio(true);
    setErrorAudio(null);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Auth required.");
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/audios`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        let e = `Lỗi ${res.status}`;
        try {
          const d = await res.json();
          e = d.message || e;
        } catch {}
        throw new Error(e);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setAudioMessages(data.result);
      } else if (
        data.code === 1000 &&
        Array.isArray(data.result) &&
        data.result.length === 0
      ) {
        setAudioMessages([]);
      } else {
        throw new Error(data.message || "Cannot load audio list.");
      }
    } catch (error: any) {
      console.error(`Error loading audio ${groupId}:`, error);
      setErrorAudio(error.message || "Error loading audio.");
      setAudioMessages([]);
    } finally {
      setIsLoadingAudio(false);
    }
  }, []);

  // Action Handlers
  const handleRemoveMember = useCallback(
    async (gId: string | number, mId: string, lId: string) => {
      if (!gId || !mId || !lId) {
        toast.error("Missing info.");
        return;
      }
      setIsProcessingAction(true);
      const tId = toast.loading("Removing...");
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Auth required.");
        const url = `http://localhost:8080/identity/api/events/group-chats/${gId}/members/${mId}?leaderId=${lId}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let e = `Lỗi ${res.status}`;
          try {
            const d = await res.json();
            e = d.message || e;
          } catch {}
          throw new Error(e);
        }
        toast.success("Removed!", { id: tId });
        setRemoveConfirmationState({
          isOpen: false,
          memberToRemove: null,
          onConfirm: null,
          onCancel: () => {},
        });
        fetchGroupChatDetails(String(gId));
      } catch (error: any) {
        console.error("Remove member error:", error);
        toast.error(`Failed: ${error.message}`, { id: tId });
      } finally {
        setIsProcessingAction(false);
      }
    },
    [fetchGroupChatDetails]
  );
  const closeRemoveConfirmationDialog = useCallback(() => {
    setRemoveConfirmationState({
      isOpen: false,
      memberToRemove: null,
      onConfirm: null,
      onCancel: () => {},
    });
  }, []);
  const confirmRemoveMember = (member: Participant) => {
    if (
      !selectedConversation ||
      !currentUser ||
      typeof selectedConversation.id !== "string"
    )
      return;
    const gId = selectedConversation.id;
    const lId = currentUser.id;
    setRemoveConfirmationState({
      isOpen: true,
      memberToRemove: member,
      onConfirm: () => handleRemoveMember(gId, member.id, lId),
      onCancel: closeRemoveConfirmationDialog,
    });
  };
  const handleGoBackToList = useCallback(() => {
    setViewMode("list");
    setSelectedConversation(null); /* Không ngắt socket ở đây */
  }, []);
  const handleLeaveGroup = useCallback(
    async (groupId: string | number, memberId: string) => {
      if (!groupId || !memberId) {
        toast.error("Missing info.");
        return;
      }
      setIsProcessingAction(true);
      const tId = toast.loading("Leaving...");
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Auth required.");
        const url = `http://localhost:8080/identity/api/events/group-chats/${groupId}/leave?memberId=${memberId}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let e = `Lỗi ${res.status}`;
          try {
            const d = await res.json();
            e = d.message || e;
          } catch {}
          throw new Error(e);
        }
        toast.success("Left group!", { id: tId });
        setConversations((prev) =>
          prev.filter((c) => String(c.id) !== String(groupId))
        );
        handleGoBackToList();
      } catch (error: any) {
        console.error("Leave group error:", error);
        toast.error(`Failed: ${error.message}`, { id: tId });
      } finally {
        setLeaveConfirmationState({
          isOpen: false,
          onConfirm: null,
          onCancel: () => {},
        });
        setIsProcessingAction(false);
      }
    },
    [handleGoBackToList]
  );
  const closeLeaveConfirmationDialog = useCallback(() => {
    setLeaveConfirmationState({
      isOpen: false,
      onConfirm: null,
      onCancel: () => {},
    });
  }, []);
  const confirmLeaveGroup = () => {
    if (
      !selectedConversation ||
      !currentUser ||
      typeof selectedConversation.id !== "string"
    )
      return;
    const gId = selectedConversation.id;
    const mId = currentUser.id;
    setLeaveConfirmationState({
      isOpen: true,
      onConfirm: () => handleLeaveGroup(gId, mId),
      onCancel: closeLeaveConfirmationDialog,
    });
  };
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation?.id || !currentUser?.id) {
      return;
    }
    setIsSendingMessage(true);
    const msg = messageInput;
    const gId = selectedConversation.id;
    const sId = currentUser.id;
    setMessageInput("");
    setShowEmojiPicker(false);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Auth required.");
      const url = `http://localhost:8080/identity/api/events/${gId}/messages`;
      const form = new FormData();
      form.append("senderId", sId);
      form.append("content", msg);
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) {
        let e = `Lỗi ${res.status}`;
        try {
          const d = await res.json();
          e = d.message || e;
        } catch {}
        throw new Error(e);
      }
      const data = await res.json();
      if (!(data.code === 1000 && data.result)) {
        throw new Error(data.message || "Send failed.");
      }
    } catch (error: any) {
      console.error("Send message error:", error);
      toast.error(`Send failed: ${error.message}`);
      setMessageInput(msg);
    } finally {
      setIsSendingMessage(false);
    }
  }, [messageInput, selectedConversation, currentUser]);
  const handleSendFile = useCallback(
    async (file: File) => {
      if (!file || !selectedConversation?.id || !currentUser?.id) return;
      setIsSendingMessage(true);
      const gId = selectedConversation.id;
      const sId = currentUser.id;
      const tId = toast.loading(`Uploading ${file.name}...`);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Auth required.");
        const url = `http://localhost:8080/identity/api/events/${gId}/messages`;
        const form = new FormData();
        form.append("senderId", sId);
        form.append("file", file);
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        if (!res.ok) {
          let e = `Lỗi ${res.status}`;
          try {
            const d = await res.json();
            e = d.message || e;
          } catch {}
          throw new Error(e);
        }
        const data = await res.json();
        if (data.code === 1000 && data.result) {
          toast.success(`Sent ${file.name}!`, { id: tId });
        } else {
          throw new Error(data.message || `Send failed ${file.name}.`);
        }
      } catch (error: any) {
        console.error("Send file error:", error);
        toast.error(`Send failed: ${error.message}`, { id: tId });
      } finally {
        setIsSendingMessage(false);
      }
    },
    [selectedConversation, currentUser]
  );
  const handleDownloadFile = useCallback(
    async (mId: string, fName?: string | null) => {
      if (!mId) return;
      setDownloadingFileId(mId);
      const tId = toast.loading(`Downloading ${fName || "file"}...`);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Auth required.");
        const url = `http://localhost:8080/identity/api/events/messages/${mId}/download`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let e = `Download error: ${res.status}`;
          try {
            const d = await res.json();
            e = d.message || e;
          } catch {
            e = `Error ${res.status}: ${res.statusText || "Download failed"}`;
          }
          throw new Error(e);
        }
        const disposition = res.headers.get("content-disposition");
        let finalFName = fName || "downloaded_file";
        if (disposition) {
          const m = disposition.match(/filename\*?=['"]?([^'";]+)['"]?/i);
          if (m && m[1]) {
            const encoded = m[1];
            if (encoded.toLowerCase().startsWith("utf-8''")) {
              finalFName = decodeURIComponent(encoded.substring(7));
            } else {
              try {
                finalFName = decodeURIComponent(escape(encoded));
              } catch (e) {
                finalFName = encoded;
                console.warn("Decode failed:", encoded, e);
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
        toast.success(`Downloaded ${finalFName}!`, { id: tId });
      } catch (error: any) {
        console.error("Download error:", error);
        toast.error(`Download failed: ${error.message || "Unknown error"}`, {
          id: tId,
        });
      } finally {
        setDownloadingFileId(null);
      }
    },
    []
  );
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!messageId || !currentUser?.id) {
        toast.error("Cannot delete.");
        return;
      }
      const userId = currentUser.id;
      setIsProcessingAction(true);
      const tId = toast.loading("Deleting...");
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Auth required.");
        const url = `http://localhost:8080/identity/api/events/messages/${messageId}?userId=${userId}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let e = `Lỗi ${res.status}`;
          try {
            const d = await res.json();
            e = d.message || e;
          } catch {
            e = `Error ${res.status}: ${res.statusText || "Delete failed"}`;
          }
          throw new Error(e);
        }
        const resText = await res.text();
        let data;
        try {
          data = resText ? JSON.parse(resText) : { code: 1000 };
        } catch {
          if (res.ok && !resText) data = { code: 1000 };
          else throw new Error("Invalid delete response.");
        }
        if (data.code === 1000 || res.ok) {
          toast.success("Deleted!", { id: tId });
          const groupId = selectedConversation?.id;
          let updatedMessagesState: Message[] = [];
          setMessages((prev) => {
            updatedMessagesState = prev.filter((msg) => msg.id !== messageId);
            return updatedMessagesState;
          });
          if (groupId) {
            const newLastMessage =
              updatedMessagesState.length > 0
                ? updatedMessagesState[updatedMessagesState.length - 1]
                : null;
            const sender = selectedConversation?.participants?.find(
              (p) => p.id === newLastMessage?.senderId
            );
            const senderName =
              newLastMessage?.senderId === currentUser?.id
                ? "Bạn"
                : sender?.name || newLastMessage?.senderName || undefined;
            setConversations((prevList) => {
              const idx = prevList.findIndex(
                (c) => String(c.id) === String(groupId)
              );
              if (idx === -1) return prevList;
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
              let newList = [...prevList];
              newList.splice(idx, 1);
              newList.unshift(updatedConvo);
              return newList;
            });
          }
        } else {
          throw new Error(data.message || "Delete failed.");
        }
      } catch (error: any) {
        console.error("Delete error:", error);
        toast.error(`Delete failed: ${error.message}`, { id: tId });
      } finally {
        setDeleteMessageConfirmationState({
          isOpen: false,
          messageIdToDelete: null,
          onConfirm: null,
          onCancel: () => {},
        });
        setIsProcessingAction(false);
      }
    },
    [currentUser, selectedConversation?.id, selectedConversation?.participants]
  ); // Bỏ messages khỏi dependency
  const confirmDeleteMessage = useCallback(
    (message: Message) => {
      if (!message || !currentUser || message.senderId !== currentUser.id)
        return;
      setDeleteMessageConfirmationState({
        isOpen: true,
        messageIdToDelete: message.id,
        onConfirm: () => handleDeleteMessage(message.id),
        onCancel: () =>
          setDeleteMessageConfirmationState({
            isOpen: false,
            messageIdToDelete: null,
            onConfirm: null,
            onCancel: () => {},
          }),
      });
    },
    [currentUser, handleDeleteMessage]
  );
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleSendFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  const onEmojiClick = (emojiData: EmojiClickData, event: MouseEvent) => {
    setMessageInput((p) => p + emojiData.emoji);
    inputRef.current?.focus();
  };

  // Memos
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const lower = searchTerm.toLowerCase();
    return conversations.filter((c) => c.name.toLowerCase().includes(lower));
  }, [searchTerm, conversations]);
  const filteredParticipants = useMemo(() => {
    if (!selectedConversation?.participants) return [];
    if (!participantSearchTerm.trim()) return selectedConversation.participants;
    const lower = participantSearchTerm.toLowerCase();
    return selectedConversation.participants.filter((p) =>
      p.name?.toLowerCase().includes(lower)
    );
  }, [selectedConversation?.participants, participantSearchTerm]);

  // Navigation
  const handleSelectConversation = useCallback(
    (conversation: MainConversationType) => {
      setViewMode("detail");
      setShowInfoPanel(false);
      setShowEmojiPicker(false);
      setMessageInput("");
      setParticipantSearchTerm("");
      setMessages([]);
      setMediaMessages([]);
      setFileMessages([]);
      setAudioMessages([]);
      setErrorMedia(null);
      setErrorFiles(null);
      setErrorAudio(null);
      setActiveInfoTab("media");
      if (conversation.isGroup && typeof conversation.id === "string") {
        setSelectedConversation({
          ...conversation,
          participants: conversation.participants?.length
            ? conversation.participants
            : [],
        });
        fetchGroupChatDetails(conversation.id);
        fetchMessages(conversation.id);
      } else {
        setSelectedConversation(conversation);
        setIsLoadingDetails(false);
        setIsLoadingMessages(false);
      }
    },
    [fetchGroupChatDetails, fetchMessages]
  );

  // useEffect để map senderName
  useEffect(() => {
    if (
      selectedConversation?.participants &&
      selectedConversation.participants.length > 0 &&
      messages.length > 0 &&
      viewMode === "detail"
    ) {
      const needsUpdate = messages.some(
        (msg) => !msg.senderName && msg.senderId !== currentUser?.id
      );
      if (needsUpdate) {
        console.log(
          "Mapping sender names to messages after participants load..."
        );
        setMessages((currentMessages) =>
          currentMessages.map((msg) => {
            if (msg.senderName || msg.senderId === currentUser?.id) {
              return msg;
            }
            const sender = selectedConversation.participants?.find(
              (p) => p.id === msg.senderId
            );
            return { ...msg, senderName: sender?.name || "Unknown User" };
          })
        );
      }
    }
  }, [selectedConversation?.participants, messages, currentUser?.id, viewMode]);

  // --- Socket Effect (Chỉ dùng groupSocket) ---
  useEffect(() => {
    if (
      selectedConversation?.isGroup &&
      typeof selectedConversation.id === "string" &&
      viewMode === "detail"
    ) {
      const groupId = selectedConversation.id;
      const SOCKET_URL = "http://localhost:9099";

      if (
        groupSocket.current?.connected &&
        groupSocket.current.io.opts.query?.groupId === groupId
      ) {
        console.log(
          `GROUP_SOCKET: Already connected to ${groupId}.`
        ); /* Vẫn gắn lại listener bên dưới */
      } else {
        console.log(`GROUP_SOCKET: Connecting for group ${groupId}`);
        groupSocket.current?.disconnect();
        groupSocket.current = io(SOCKET_URL, {
          path: "/socket.io",
          query: { groupId: groupId },
          transports: ["websocket"],
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
        });
      }

      const currentGroupSocket = groupSocket.current;

      const handleConnect = () =>
        console.log(
          `GROUP_SOCKET: Connected ${groupId}. Socket ID: ${currentGroupSocket.id}`
        );
      const handleDisconnect = (reason: Socket.DisconnectReason) => {
        console.log(`GROUP_SOCKET: Disconnected ${groupId}. R: ${reason}`);
        if (
          reason !== "io client disconnect" &&
          viewMode === "detail" &&
          selectedConversation?.id === groupId
        )
          toast.error(`Chat disconnect (${reason})`);
      };
      const handleConnectError = (error: Error) => {
        console.error(`GROUP_SOCKET: Conn Error ${groupId}:`, error);
        if (viewMode === "detail" && selectedConversation?.id === groupId)
          toast.error(`Chat conn error: ${error.message}`);
      };

      const handleNewMessage = (newMessage: Message) => {
        console.log(
          `GROUP_SOCKET: Received new_message for ${groupId}`,
          newMessage
        );
        // Cập nhật messages state (chỉ khi đang xem đúng group)
        if (selectedConversation?.id === groupId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            const sender = selectedConversation?.participants?.find(
              (p) => p.id === newMessage.senderId
            );
            const msgWithName = {
              ...newMessage,
              senderName: sender?.name || newMessage.senderName || "Unknown",
            };
            const updated = [...prev, msgWithName];
            updated.sort(
              (a, b) =>
                new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
            );
            return updated;
          });
          if (showInfoPanel) {
            if (newMessage.type === "IMAGE" || newMessage.type === "VIDEO")
              fetchMediaMessages(groupId);
            else if (newMessage.type === "FILE") fetchFileMessages(groupId);
            else if (newMessage.type === "AUDIO") fetchAudioMessages(groupId);
          }
        }
        // Cập nhật conversations state (cho list view) LUÔN LUÔN KHI SOCKET NHẬN ĐƯỢC
        setConversations((prevList) => {
          const idx = prevList.findIndex((c) => String(c.id) === groupId); // So sánh string để chắc chắn
          if (idx === -1) {
            console.warn(`Convo ${groupId} not found in list for new_message`);
            return prevList;
          }
          // Lấy tên người gửi từ participants nếu có, nếu không thì từ payload, cuối cùng là undefined
          const sender = selectedConversation?.participants?.find(
            (p) => p.id === newMessage.senderId
          ); // Dùng participants hiện tại nếu có
          const senderName =
            newMessage.senderId === currentUser?.id
              ? "Bạn"
              : sender?.name || newMessage.senderName || undefined;
          const updatedConvo = {
            ...prevList[idx],
            message:
              newMessage.content ?? `Đã gửi: ${newMessage.fileName || "File"}`,
            sentAt: newMessage.sentAt,
            lastMessageSenderId: newMessage.senderId,
            lastMessageSenderName: senderName,
          };
          let newList = [...prevList];
          newList.splice(idx, 1); // Xóa khỏi vị trí cũ
          newList.unshift(updatedConvo); // Thêm vào đầu
          return newList; // Trả về danh sách đã sắp xếp lại
        });
      };

      const handleMessageDeleted = (data: { messageId: string }) => {
        console.log("GROUP_SOCKET: Received message_deleted", data);
        if (data?.messageId && selectedConversation?.id === groupId) {
          let newLastMessage: Message | null = null;
          setMessages((prev) => {
            const remaining = prev.filter((m) => m.id !== data.messageId);
            if (remaining.length > 0) {
              newLastMessage = remaining[remaining.length - 1];
            }
            return remaining;
          });
          setConversations((prevList) => {
            const idx = prevList.findIndex((c) => String(c.id) === groupId);
            if (idx === -1) return prevList;
            const sender = selectedConversation?.participants?.find(
              (p) => p.id === newLastMessage?.senderId
            );
            const senderName =
              newLastMessage?.senderId === currentUser?.id
                ? "Bạn"
                : sender?.name || newLastMessage?.senderName || undefined;
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
            let newList = [...prevList];
            newList.splice(idx, 1);
            newList.unshift(updatedConvo);
            return newList;
          });
          if (showInfoPanel) {
            fetchMediaMessages(groupId);
            fetchFileMessages(groupId);
            fetchAudioMessages(groupId);
          }
        }
        // Cập nhật list ngay cả khi không ở detail view (nếu socket vẫn kết nối)
        else if (data?.messageId) {
          setConversations((prevList) => {
            const idx = prevList.findIndex((c) => String(c.id) === groupId);
            if (idx === -1) return prevList;
            // Cần fetch lại tin nhắn cuối cùng cho group này vì không có context 'messages'
            // Hoặc đơn giản là hiển thị "..." hoặc không làm gì cả nếu phức tạp
            console.warn(
              "Received message_deleted for non-active group, list update might be inaccurate without fetching last message."
            );
            // Tạm thời chỉ đưa lên đầu nếu muốn, không cập nhật message
            let newList = [...prevList];
            const currentConvo = newList.splice(idx, 1)[0];
            if (currentConvo) newList.unshift(currentConvo); // Đưa lên đầu mà không đổi message
            return newList;
          });
        }
      };
      const handleMemberRemoved = (data: { removedUserId?: string }) => {
        console.log("GROUP_SOCKET: member_removed", data);
        if (selectedConversation?.id === groupId) {
          toast.info("Thành viên đã bị xóa.");
          fetchGroupChatDetails(groupId);
          if (data?.removedUserId === currentUser?.id) {
            toast.warn("Bạn đã bị xóa.");
            handleGoBackToList();
          }
        } else {
          fetchConversations(); /* Cập nhật lại cả list nếu không ở detail view */
        }
      };
      const handleMemberLeft = (data: { userId?: string }) => {
        console.log("GROUP_SOCKET: member_left", data);
        if (selectedConversation?.id === groupId) {
          toast.info("Thành viên đã rời đi.");
          fetchGroupChatDetails(groupId);
        } else {
          fetchConversations(); /* Cập nhật lại cả list */
        }
      };
      const handleGroupDeactivated = () => {
        const groupName = selectedConversation?.name || groupId;
        console.log("GROUP_SOCKET: group_deactivated");
        if (selectedConversation?.id === groupId) {
          toast.warn(`Nhóm ${groupName} đã bị giải tán.`);
          handleGoBackToList();
        }
        setConversations((prev) =>
          prev.filter((c) => String(c.id) !== groupId)
        );
      };

      // Gắn listeners
      currentGroupSocket.on("connect", handleConnect);
      currentGroupSocket.on("disconnect", handleDisconnect);
      currentGroupSocket.on("connect_error", handleConnectError);
      currentGroupSocket.on("new_message", handleNewMessage);
      currentGroupSocket.on("message_deleted", handleMessageDeleted);
      currentGroupSocket.on("member_removed", handleMemberRemoved);
      currentGroupSocket.on("member_left", handleMemberLeft);
      currentGroupSocket.on("group_deactivated", handleGroupDeactivated);

      // Cleanup Function
      return () => {
        if (currentGroupSocket) {
          console.log(`GROUP_SOCKET: Cleaning up listeners for ${groupId}`);
          currentGroupSocket.off("connect", handleConnect);
          currentGroupSocket.off("disconnect", handleDisconnect);
          currentGroupSocket.off("connect_error", handleConnectError);
          currentGroupSocket.off("new_message", handleNewMessage);
          currentGroupSocket.off("message_deleted", handleMessageDeleted);
          currentGroupSocket.off("member_removed", handleMemberRemoved);
          currentGroupSocket.off("member_left", handleMemberLeft);
          currentGroupSocket.off(
            "group_deactivated",
            handleGroupDeactivated
          ); /* Không ngắt kết nối ở đây vội */
        }
      };
    } else {
      if (groupSocket.current) {
        console.log(
          "GROUP_SOCKET: Disconnecting (view changed or no selection)..."
        );
        groupSocket.current.disconnect();
        groupSocket.current = null;
      }
    }
  }, [
    selectedConversation?.id,
    viewMode,
    currentUser?.id,
    showInfoPanel,
    selectedConversation?.participants,
    fetchGroupChatDetails,
    fetchMediaMessages,
    fetchFileMessages,
    fetchAudioMessages,
    handleGoBackToList,
    /* Thêm setConversations vào dependency list của useEffect này */ setConversations,
  ]);

  // --- Rendering Functions ---
  const getParticipantInfo = (conversation: MainConversationType | null) => {
    if (!conversation?.isGroup) return null;
    const participantCount = conversation.participants?.length;
    if (isLoadingDetails && !participantCount) {
      return (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {" "}
          Đang tải thành viên...{" "}
        </p>
      );
    }
    if (!participantCount) {
      return (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {" "}
          (Chưa có thông tin){" "}
        </p>
      );
    }
    const count = participantCount;
    const namesToShow = conversation.participants
      .slice(0, 3)
      .map((p) => p.name || `User (${p.id.substring(0, 4)})`)
      .join(", ");
    const remainingCount = count > 3 ? count - 3 : 0;
    return (
      <p
        className="text-xs text-gray-500 truncate mt-0.5 cursor-pointer hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          setShowInfoPanel(true);
          setParticipantSearchTerm("");
          setActiveInfoTab("media");
          if (selectedConversation?.id) {
            if (!isLoadingMedia && mediaMessages.length === 0 && !errorMedia)
              fetchMediaMessages(selectedConversation.id);
            if (!isLoadingFiles && fileMessages.length === 0 && !errorFiles)
              fetchFileMessages(selectedConversation.id);
            if (!isLoadingAudio && audioMessages.length === 0 && !errorAudio)
              fetchAudioMessages(selectedConversation.id);
          }
        }}
        title={`${count} thành viên`}
      >
        {" "}
        {count} thành viên{count > 0 ? ":" : ""} {namesToShow}{" "}
        {remainingCount > 0 && ` và ${remainingCount} người khác`}{" "}
      </p>
    );
  };

  const renderListView = () => (
    <div className="flex flex-col h-full">
      {" "}
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        {" "}
        <div className="relative">
          {" "}
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {" "}
            <MagnifyingGlassIcon width="16" height="16" />{" "}
          </span>{" "}
          <input
            type="text"
            placeholder="Tìm kiếm theo tên nhóm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />{" "}
        </div>{" "}
      </div>{" "}
      <ul className="space-y-1 p-3 overflow-y-auto flex-1 bg-gray-50">
        {" "}
        {isLoadingConversations && conversations.length === 0 ? (
          <p className="text-center text-gray-500 py-6 italic">
            {" "}
            Đang tải danh sách...{" "}
          </p>
        ) : errorConversations ? (
          <p className="text-center text-red-500 py-6">{errorConversations}</p>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => (
            <li
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group ${
                selectedConversation?.id === conv.id ? "bg-blue-100" : ""
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  handleSelectConversation(conv);
              }}
            >
              {" "}
              <img
                src={
                  conv.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    conv.name
                  )}&background=random`
                }
                alt={`Avatar của ${conv.name}`}
                className="w-11 h-11 rounded-full object-cover flex-shrink-0 border"
              />{" "}
              <div className="flex-1 overflow-hidden">
                {" "}
                <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-blue-700">
                  {" "}
                  {conv.name}{" "}
                </p>{" "}
                <p className="text-xs text-gray-500 truncate group-hover:text-gray-700">
                  {" "}
                  {conv.lastMessageSenderId && (
                    <span className="font-medium">
                      {" "}
                      {conv.lastMessageSenderName
                        ? `${conv.lastMessageSenderName}: `
                        : ""}{" "}
                    </span>
                  )}{" "}
                  {/* Thêm log message cho tôi */}

                  {console.log("Message",conv.message )}
                  
                  
                  {conv.message || "..."}{" "}
                </p>{" "}
              </div>{" "}
              {conv.sentAt && (
                <span className="text-xs text-gray-400 self-start flex-shrink-0 ml-2">
                  {" "}
                  {new Date(conv.sentAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                </span>
              )}{" "}
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500 py-6 italic">
            {" "}
            {searchTerm
              ? "Không tìm thấy nhóm chat nào."
              : "Không có nhóm chat nào."}{" "}
          </p>
        )}{" "}
      </ul>{" "}
    </div>
  );
  const renderDetailView = (conversation: MainConversationType) => {
    const isLeader =
      conversation.isGroup && currentUser?.id === conversation.groupLeaderId;
    const getParticipantDisplayName = (participant: Participant) => {
      const isCurrentUser = participant.id === currentUser?.id;
      const isGroupLeader = participant.id === conversation.groupLeaderId;
      let displayName =
        participant.name || `User (${participant.id.substring(0, 4)}...)`;
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
      <div className="flex-1 flex flex-col overflow-hidden relative h-150">
        {" "}
        <div className="flex justify-between items-center p-3 md:p-4 border-b bg-gray-50 flex-shrink-0">
          {" "}
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {" "}
            <button
              onClick={handleGoBackToList}
              aria-label="Quay lại"
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
            >
              {" "}
              <ChevronLeftIcon width="24" height="24" />{" "}
            </button>{" "}
            <img
              src={
                conversation.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  conversation.name
                )}&background=random${
                  conversation.isGroup ? "&font-size=0.4" : ""
                }`
              }
              alt={conversation.name}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover border flex-shrink-0"
            />{" "}
            <div className="flex-1 min-w-0">
              {" "}
              <h2 className="text-base md:text-lg font-semibold truncate">
                {" "}
                {conversation.name}{" "}
              </h2>{" "}
              {conversation.isGroup && getParticipantInfo(conversation)}{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center gap-1 md:gap-2">
            {" "}
            {conversation.isGroup && (
              <button
                onClick={() => {
                  setShowInfoPanel(!showInfoPanel);
                  setParticipantSearchTerm("");
                  setActiveInfoTab("media");
                  if (!showInfoPanel && selectedConversation?.id) {
                    setShowEmojiPicker(false);
                    if (
                      !isLoadingMedia &&
                      mediaMessages.length === 0 &&
                      !errorMedia
                    )
                      fetchMediaMessages(selectedConversation.id);
                    if (
                      !isLoadingFiles &&
                      fileMessages.length === 0 &&
                      !errorFiles
                    )
                      fetchFileMessages(selectedConversation.id);
                    if (
                      !isLoadingAudio &&
                      audioMessages.length === 0 &&
                      !errorAudio
                    )
                      fetchAudioMessages(selectedConversation.id);
                  }
                }}
                aria-label="Thông tin"
                className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
              >
                {" "}
                <InfoCircledIcon width="22" height="22" />{" "}
              </button>
            )}{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex-1 flex overflow-hidden">
          {" "}
          <div
            className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
              showInfoPanel ? "w-full md:w-[calc(100%-350px)]" : "w-full"
            }`}
          >
            {" "}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
              {" "}
              {isLoadingMessages && messages.length === 0 && (
                <div className="flex justify-center items-center h-full text-gray-500 italic">
                  {" "}
                  Đang tải tin nhắn...{" "}
                </div>
              )}{" "}
              {!isLoadingMessages && errorMessages && (
                <div className="flex justify-center items-center h-full text-red-500">
                  {" "}
                  {errorMessages}{" "}
                </div>
              )}{" "}
              {!isLoadingMessages &&
                !errorMessages &&
                messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 italic">
                    {" "}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-gray-300 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      {" "}
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />{" "}
                    </svg>{" "}
                    Chưa có tin nhắn nào. <br /> Bắt đầu cuộc trò chuyện!{" "}
                  </div>
                )}{" "}
              {!isLoadingMessages &&
                !errorMessages &&
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 group relative ${
                      msg.senderId === currentUser?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    {" "}
                    {msg.senderId === currentUser?.id && (
                      <button
                        onClick={() => confirmDeleteMessage(msg)}
                        disabled={isProcessingAction}
                        aria-label="Xóa tin nhắn"
                        className="relative cursor-pointer top-1/2 left-0 -translate-x-8 -translate-y-1/2 p-2 rounded-full bg-white shadow hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {" "}
                        <TrashIcon width={14} height={14} />{" "}
                      </button>
                    )}{" "}
                    {msg.senderId !== currentUser?.id && (
                      <img
                        src={
                          selectedConversation?.participants?.find(
                            (p) => p.id === msg.senderId
                          )?.avatar ||
                          (msg.senderName &&
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              msg.senderName.charAt(0)
                            )}&background=random`) ||
                          `https://ui-avatars.com/api/?name=?&background=random`
                        }
                        className="w-10 h-10 rounded-full object-cover border self-end mb-1 flex-shrink-0"
                        alt={msg.senderName || "Sender"}
                      />
                    )}{" "}
                    <div
                      className={`${
                        msg.senderId === currentUser?.id
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-800"
                      } p-2 md:p-3 rounded-lg max-w-[70%]`}
                    >
                      {" "}
                      {conversation.isGroup &&
                        msg.senderId !== currentUser?.id && (
                          <span className="text-xs font-semibold text-purple-700 block mb-1">
                            {" "}
                            {msg.senderName || "Unknown User"}{" "}
                          </span>
                        )}{" "}
                      {msg.type === "TEXT" && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {" "}
                          {msg.content}{" "}
                        </p>
                      )}{" "}
                      {msg.type === "IMAGE" && msg.fileUrl && (
                        <div className="relative group/image">
                          {" "}
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={msg.fileName || "Xem ảnh"}
                          >
                            {" "}
                            <img
                              src={msg.fileUrl}
                              alt={msg.fileName || "Hình ảnh đã gửi"}
                              className="max-w-xs max-h-48 rounded object-contain cursor-pointer"
                            />{" "}
                          </a>{" "}
                          <button
                            onClick={() =>
                              handleDownloadFile(msg.id, msg.fileName)
                            }
                            disabled={downloadingFileId === msg.id}
                            aria-label={`Tải ${msg.fileName || "ảnh"}`}
                            className={`absolute top-1 right-1 cursor-pointer bg-black/50 text-white p-1 rounded-full hover:bg-black/75 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-wait`}
                          >
                            {" "}
                            {downloadingFileId === msg.id ? (
                              <UpdateIcon className="w-4 h-4 animate-spin" />
                            ) : (
                              <DownloadIcon className="w-4 h-4" />
                            )}{" "}
                          </button>{" "}
                        </div>
                      )}{" "}
                      {msg.type === "FILE" && (
                        <button
                          onClick={() =>
                            handleDownloadFile(msg.id, msg.fileName)
                          }
                          disabled={downloadingFileId === msg.id}
                          className="flex items-center gap-2 cursor-pointer p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                          {" "}
                          {downloadingFileId === msg.id ? (
                            <UpdateIcon className="w-4 h-4 flex-shrink-0 animate-spin" />
                          ) : (
                            <DownloadIcon className="w-4 h-4 flex-shrink-0 cursor-pointer" />
                          )}{" "}
                          <span className="text-sm font-medium truncate">
                            {" "}
                            {msg.fileName || "Tệp đính kèm"}{" "}
                          </span>{" "}
                        </button>
                      )}{" "}
                      {msg.type === "VIDEO" && msg.fileUrl && (
                        <div className="relative group/video">
                          {" "}
                          <a
                            href={msg.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={msg.fileName || "Xem video"}
                            className="block aspect-video max-w-xs bg-black rounded overflow-hidden"
                          >
                            {" "}
                            <video
                              src={msg.fileUrl}
                              className="w-full h-full object-contain"
                              controls={false}
                            />{" "}
                          </a>{" "}
                          <button
                            onClick={() =>
                              handleDownloadFile(msg.id, msg.fileName)
                            }
                            disabled={downloadingFileId === msg.id}
                            aria-label={`Tải ${msg.fileName || "video"}`}
                            className={`absolute top-1 right-1 cursor-pointer bg-black/50 text-white p-1 rounded-full hover:bg-black/75 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-wait`}
                          >
                            {" "}
                            {downloadingFileId === msg.id ? (
                              <UpdateIcon className="w-4 h-4 animate-spin" />
                            ) : (
                              <DownloadIcon className="w-4 h-4" />
                            )}{" "}
                          </button>{" "}
                          <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                            {" "}
                            {msg.fileName || "Video"}{" "}
                          </span>{" "}
                        </div>
                      )}{" "}
                      {msg.type === "AUDIO" && msg.fileUrl && (
                        <div className="flex items-center gap-2 p-2 bg-gray-200 rounded">
                          {" "}
                          <audio
                            controls
                            src={msg.fileUrl}
                            className="flex-1 h-8"
                          >
                            {" "}
                            Your browser does not support the audio element.{" "}
                          </audio>{" "}
                          <button
                            onClick={() =>
                              handleDownloadFile(msg.id, msg.fileName)
                            }
                            disabled={downloadingFileId === msg.id}
                            aria-label={`Tải ${msg.fileName || "audio"}`}
                            className="text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-wait"
                          >
                            {" "}
                            {downloadingFileId === msg.id ? (
                              <UpdateIcon className="w-4 h-4 animate-spin" />
                            ) : (
                              <DownloadIcon className="w-4 h-4" />
                            )}{" "}
                          </button>{" "}
                        </div>
                      )}{" "}
                      <span
                        className={`text-xs mt-1 block text-right ${
                          msg.senderId === currentUser?.id
                            ? "text-blue-100 opacity-75"
                            : "text-gray-500 opacity-75"
                        }`}
                      >
                        {" "}
                        {new Date(msg.sentAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}{" "}
                      </span>{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              <div ref={messagesEndRef} />{" "}
            </div>{" "}
            <div className="p-3 md:p-4 border-t bg-gray-50 flex-shrink-0 relative">
              {" "}
              <div className="flex items-center gap-2">
                {" "}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                />{" "}
                <button
                  onClick={triggerFileInput}
                  disabled={isSendingMessage}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer disabled:opacity-50"
                  aria-label="Đính kèm file"
                >
                  {" "}
                  <Link2Icon width="20" height="20" />{" "}
                </button>{" "}
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      messageInput.trim() &&
                      !isSendingMessage
                    ) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isSendingMessage}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />{" "}
                <button
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer"
                  aria-label="Chọn emoji"
                >
                  {" "}
                  <FaceIcon width="20" height="20" />{" "}
                </button>{" "}
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || isSendingMessage}
                  className={`p-2 rounded-full ${
                    messageInput.trim() && !isSendingMessage
                      ? "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  aria-label="Gửi tin nhắn"
                >
                  {" "}
                  {isSendingMessage ? (
                    <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                  ) : (
                    <PaperPlaneIcon width="20" height="20" />
                  )}{" "}
                </button>{" "}
              </div>{" "}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full right-0 mb-2 z-50"
                >
                  {" "}
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    autoFocusSearch={false}
                    theme={Theme.AUTO}
                    lazyLoadEmojis={true}
                  />{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>{" "}
          {conversation.isGroup && (
            <div
              className={`absolute top-0 right-0 h-full bg-white border-l shadow-lg transition-transform duration-300 transform ${
                showInfoPanel ? "translate-x-0" : "translate-x-full"
              } w-full md:w-[350px] flex flex-col`}
            >
              {" "}
              <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                {" "}
                <h3 className="text-base font-semibold">Thông tin</h3>{" "}
                <button
                  onClick={() => setShowInfoPanel(false)}
                  aria-label="Đóng"
                  className="text-gray-400 cursor-pointer hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"
                >
                  {" "}
                  <Cross2Icon width="20" height="20" />{" "}
                </button>{" "}
              </div>{" "}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col">
                {" "}
                {isLoadingDetails && !conversation.participants?.length ? (
                  <div className="flex justify-center items-center py-10 text-gray-500">
                    {" "}
                    <span className="animate-spin mr-2">⏳</span> Đang tải chi
                    tiết...{" "}
                  </div>
                ) : (
                  <>
                    {" "}
                    <div className="pb-4 border-b">
                      {" "}
                      <div className="flex justify-between items-center mb-2">
                        {" "}
                        <h4 className="text-sm font-semibold text-gray-600">
                          {" "}
                          <PersonIcon className="inline mr-1 mb-0.5" />{" "}
                          {filteredParticipants?.length || 0} Thành viên{" "}
                        </h4>{" "}
                      </div>{" "}
                      <div className="relative mb-3">
                        {" "}
                        <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
                          {" "}
                          <MagnifyingGlassIcon width="14" height="14" />{" "}
                        </span>{" "}
                        <input
                          type="text"
                          placeholder="Tìm thành viên..."
                          value={participantSearchTerm}
                          onChange={(e) =>
                            setParticipantSearchTerm(e.target.value)
                          }
                          className="w-full pl-8 pr-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-sm"
                        />{" "}
                      </div>{" "}
                      <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {" "}
                        {filteredParticipants.length > 0 ? (
                          filteredParticipants.map((p) => (
                            <li
                              key={p.id}
                              className="flex items-center justify-between group"
                            >
                              {" "}
                              <div className="flex items-center gap-2 min-w-0">
                                {" "}
                                <img
                                  src={
                                    p.avatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      p.name || "?"
                                    )}&background=random&size=32`
                                  }
                                  alt={p.name || "Participant"}
                                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                />{" "}
                                <span className="text-sm text-gray-700 truncate">
                                  {" "}
                                  {getParticipantDisplayName(p)}{" "}
                                </span>{" "}
                              </div>{" "}
                              {isLeader && p.id !== currentUser?.id && (
                                <button
                                  onClick={() => confirmRemoveMember(p)}
                                  disabled={isProcessingAction}
                                  aria-label={`Xóa ${p.name}`}
                                  className={`p-1 text-gray-400 cursor-pointer hover:text-red-600 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                                >
                                  {" "}
                                  <TrashIcon width="16" height="16" />{" "}
                                </button>
                              )}{" "}
                            </li>
                          ))
                        ) : (
                          <li className="text-center text-xs text-gray-400 italic py-4">
                            {" "}
                            {participantSearchTerm
                              ? "Không tìm thấy thành viên."
                              : "(Chưa có thành viên nào)"}{" "}
                          </li>
                        )}{" "}
                      </ul>{" "}
                    </div>{" "}
                    <div className="flex flex-col flex-1 min-h-0">
                      {" "}
                      <div className="border-b border-gray-200 flex-shrink-0">
                        {" "}
                        <nav
                          className="-mb-px flex space-x-4"
                          aria-label="Tabs"
                        >
                          {" "}
                          <button
                            onClick={() => setActiveInfoTab("media")}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 cursor-pointer ${
                              activeInfoTab === "media"
                                ? "border-purple-500 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                            aria-current={
                              activeInfoTab === "media" ? "page" : undefined
                            }
                          >
                            {" "}
                            <ImageIcon className="h-4 w-4" /> Media (
                            {isLoadingMedia ? "..." : mediaMessages.length}){" "}
                          </button>{" "}
                          <button
                            onClick={() => setActiveInfoTab("files")}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1  cursor-pointer ${
                              activeInfoTab === "files"
                                ? "border-purple-500 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                            aria-current={
                              activeInfoTab === "files" ? "page" : undefined
                            }
                          >
                            {" "}
                            <FileTextIcon className="h-4 w-4" /> Files (
                            {isLoadingFiles ? "..." : fileMessages.length}){" "}
                          </button>{" "}
                          <button
                            onClick={() => setActiveInfoTab("audio")}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 cursor-pointer ${
                              activeInfoTab === "audio"
                                ? "border-purple-500 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                            aria-current={
                              activeInfoTab === "audio" ? "page" : undefined
                            }
                          >
                            {" "}
                            <SpeakerLoudIcon className="h-4 w-4" /> Âm thanh (
                            {isLoadingAudio ? "..." : audioMessages.length}){" "}
                          </button>{" "}
                        </nav>{" "}
                      </div>{" "}
                      <div className="pt-4 flex-1 overflow-y-auto">
                        {" "}
                        {activeInfoTab === "media" && (
                          <div className="space-y-2">
                            {" "}
                            {isLoadingMedia ? (
                              <p className="text-xs text-gray-500 italic text-center py-4">
                                {" "}
                                Đang tải media...{" "}
                              </p>
                            ) : errorMedia ? (
                              <p className="text-xs text-red-500 text-center py-4">
                                {" "}
                                {errorMedia}{" "}
                              </p>
                            ) : mediaMessages.length > 0 ? (
                              <div className="grid grid-cols-3 gap-2">
                                {" "}
                                {mediaMessages.map((m) => (
                                  <a
                                    key={m.id}
                                    href={m.fileUrl || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative group aspect-square bg-gray-100 rounded overflow-hidden hover:opacity-80"
                                    title={
                                      m.fileName ||
                                      (m.type === "IMAGE" ? "Ảnh" : "Video")
                                    }
                                  >
                                    {" "}
                                    {m.type === "IMAGE" && m.fileUrl && (
                                      <img
                                        src={m.fileUrl}
                                        alt={m.fileName || "media"}
                                        className="w-full h-full object-cover"
                                      />
                                    )}{" "}
                                    {m.type === "VIDEO" && (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-xs p-1">
                                        {" "}
                                        <svg
                                          className="w-6 h-6 text-gray-300"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          {" "}
                                          <path d="M2.94 15.06a.5.5 0 0 0 .7.7L7.5 12.07V14a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-1.93l3.86 3.69a.5.5 0 0 0 .7-.7L12.93 10l3.63-3.63a.5.5 0 0 0-.7-.7L12 9.93V8a.5.5 0 0 0-.5-.5h-4A.5.5 0 0 0 7 8v1.93L3.14 6.37a.5.5 0 0 0-.7.7L6.07 10 2.44 13.63z"></path>{" "}
                                        </svg>{" "}
                                      </div>
                                    )}{" "}
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDownloadFile(m.id, m.fileName);
                                      }}
                                      disabled={downloadingFileId === m.id}
                                      aria-label={`Tải ${
                                        m.fileName || "media"
                                      }`}
                                      className={`absolute top-1 right-1 cursor-pointer bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none disabled:opacity-50 disabled:cursor-wait`}
                                    >
                                      {" "}
                                      {downloadingFileId === m.id ? (
                                        <UpdateIcon className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <DownloadIcon className="w-3 h-3" />
                                      )}{" "}
                                    </button>{" "}
                                  </a>
                                ))}{" "}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center py-4">
                                {" "}
                                Không có media.{" "}
                              </p>
                            )}{" "}
                          </div>
                        )}{" "}
                        {activeInfoTab === "files" && (
                          <div className="space-y-1">
                            {" "}
                            {isLoadingFiles ? (
                              <p className="text-xs text-gray-500 italic text-center py-4">
                                {" "}
                                Đang tải file...{" "}
                              </p>
                            ) : errorFiles ? (
                              <p className="text-xs text-red-500 text-center py-4">
                                {" "}
                                {errorFiles}{" "}
                              </p>
                            ) : fileMessages.length > 0 ? (
                              <ul className="space-y-1">
                                {" "}
                                {fileMessages.map((m) => (
                                  <li key={m.id}>
                                    {" "}
                                    <button
                                      onClick={() =>
                                        handleDownloadFile(m.id, m.fileName)
                                      }
                                      disabled={downloadingFileId === m.id}
                                      className="flex w-full items-center cursor-pointer gap-2 text-xs text-blue-600 hover:underline p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-wait"
                                    >
                                      {" "}
                                      {downloadingFileId === m.id ? (
                                        <UpdateIcon className="w-3 h-3 flex-shrink-0 animate-spin" />
                                      ) : (
                                        <DownloadIcon className="w-3 h-3 flex-shrink-0" />
                                      )}{" "}
                                      <span className="truncate text-left">
                                        {" "}
                                        {m.fileName ||
                                          "Tài liệu không tên"}{" "}
                                      </span>{" "}
                                    </button>{" "}
                                  </li>
                                ))}{" "}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center py-4">
                                {" "}
                                Không có file nào.{" "}
                              </p>
                            )}{" "}
                          </div>
                        )}{" "}
                        {activeInfoTab === "audio" && (
                          <div className="space-y-1">
                            {" "}
                            {isLoadingAudio ? (
                              <p className="text-xs text-gray-500 italic text-center py-4">
                                {" "}
                                Đang tải âm thanh...{" "}
                              </p>
                            ) : errorAudio ? (
                              <p className="text-xs text-red-500 text-center py-4">
                                {" "}
                                {errorAudio}{" "}
                              </p>
                            ) : audioMessages.length > 0 ? (
                              <ul className="space-y-1">
                                {" "}
                                {audioMessages.map((m) => (
                                  <li key={m.id}>
                                    {" "}
                                    <button
                                      onClick={() =>
                                        handleDownloadFile(m.id, m.fileName)
                                      }
                                      disabled={downloadingFileId === m.id}
                                      className="flex w-full items-center cursor-pointer gap-2 text-xs text-blue-600 hover:underline p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-wait"
                                    >
                                      {" "}
                                      {downloadingFileId === m.id ? (
                                        <UpdateIcon className="w-3 h-3 flex-shrink-0 animate-spin" />
                                      ) : (
                                        <DownloadIcon className="w-3 h-3 flex-shrink-0" />
                                      )}{" "}
                                      <span className="truncate text-left">
                                        {" "}
                                        {m.fileName || "Audio không tên"}{" "}
                                      </span>{" "}
                                    </button>{" "}
                                  </li>
                                ))}{" "}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center py-4">
                                {" "}
                                Không có file âm thanh.{" "}
                              </p>
                            )}{" "}
                          </div>
                        )}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="mt-auto pt-4">
                      {" "}
                      {!isLeader && conversation.isGroup && currentUser && (
                        <button
                          onClick={confirmLeaveGroup}
                          disabled={isProcessingAction}
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 font-medium mb-3 cursor-pointer disabled:opacity-50"
                        >
                          {" "}
                          <ExitIcon /> Rời khỏi nhóm{" "}
                        </button>
                      )}{" "}
                    </div>{" "}
                  </>
                )}{" "}
              </div>{" "}
            </div>
          )}{" "}
        </div>{" "}
        <ConfirmationDialog
          isOpen={removeConfirmationState.isOpen}
          title="Xác nhận xóa thành viên"
          message={
            <>
              {" "}
              Bạn có chắc chắn muốn xóa thành viên{" "}
              <strong>
                {" "}
                {removeConfirmationState.memberToRemove?.name}{" "}
              </strong>{" "}
              khỏi nhóm chat này không?{" "}
            </>
          }
          confirmText="Xóa"
          cancelText="Hủy bỏ"
          confirmVariant="danger"
          onConfirm={removeConfirmationState.onConfirm || (() => {})}
          onCancel={removeConfirmationState.onCancel}
        />{" "}
        <ConfirmationDialog
          isOpen={leaveConfirmationState.isOpen}
          title="Xác nhận rời nhóm"
          message="Bạn có chắc chắn muốn rời khỏi nhóm chat này không?"
          confirmText="Rời nhóm"
          cancelText="Hủy bỏ"
          confirmVariant="danger"
          onConfirm={leaveConfirmationState.onConfirm || (() => {})}
          onCancel={leaveConfirmationState.onCancel}
        />{" "}
        <ConfirmationDialog
          isOpen={deleteMessageConfirmationState.isOpen}
          title="Xác nhận xóa tin nhắn"
          message="Bạn có chắc chắn muốn xóa tin nhắn này không? Hành động này không thể hoàn tác."
          confirmText="Xóa tin nhắn"
          cancelText="Hủy bỏ"
          confirmVariant="danger"
          onConfirm={deleteMessageConfirmationState.onConfirm || (() => {})}
          onCancel={deleteMessageConfirmationState.onCancel}
        />{" "}
      </div>
    );
  };

  // Main Return
  return (
    <div className="flex flex-col h-180 bg-white rounded-lg shadow overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-purple-600">
          {" "}
          Danh sách Chat{" "}
        </h2>
      </div>
      <div className="flex-1 overflow-hidden border-t md:border-t-0 md:border-l">
        {viewMode === "list"
          ? renderListView()
          : selectedConversation
          ? renderDetailView(selectedConversation)
          : renderListView()}
      </div>
    </div>
  );
};

export default ChatTabContent;
