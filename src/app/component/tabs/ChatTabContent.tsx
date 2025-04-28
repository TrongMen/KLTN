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
import { useRouter } from "next/navigation"; // Import useRouter

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
interface Message {
  id: string;
  content?: string | null;
  senderId?: string;
  senderName?: string;
  sentAt: string | number;
  type: "TEXT" | "FILE" | "IMAGE" | "VIDEO" | "AUDIO" | "EVENT";
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  deleted?: boolean;
  downloadUrl?: string | null;
  event?:
    | "new_message"
    | "message_deleted"
    | "group_deactivated"
    | "member_removed"
    | "member_left";
  targetMessageId?: string;
  userId?: string;
  groupId?: string;
}
interface WebSocketEventPayload extends Partial<Message> {}
interface WebSocketEvent {
  event:
    | "new_message"
    | "message_deleted"
    | "group_deactivated"
    | "member_removed"
    | "member_left";
  payload: WebSocketEventPayload;
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
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 ease-out scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="dialog-title"
          className={`text-lg font-bold mb-3 ${
            confirmVariant === "danger" ? "text-red-700" : "text-gray-800"
          }`}
        >
          {title}
        </h3>
        <div className="text-sm text-gray-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel} className={cancelButtonClasses}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={confirmButtonClasses}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

const ChatTabContent: React.FC<ChatTabContentProps> = ({ currentUser }) => {
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  const websocketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [websocketError, setWebsocketError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter(); // Instantiate router

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

  const handleGoBackToList = useCallback(() => {
    setViewMode("list");
    setSelectedConversation(null);
    if (websocketRef.current) {
      websocketRef.current.close(1000, "Navigating back to list");
      websocketRef.current = null;
      setIsConnected(false);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setWebsocketError(null);
  }, []);

  const fetchConversations = useCallback(async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setErrorConversations("Yêu cầu xác thực.");
      setIsLoadingConversations(false);
      setConversations([]);
      return;
    }
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
      const url = `http://localhost:8080/identity/api/events/group-chats/user/${userId}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let errorMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {}
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
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              group.name
            )}&background=random&font-size=0.4`,
            participants: [],
          })
        );
        setConversations(groupChats);
      } else {
        throw new Error(
          data.message || "Định dạng dữ liệu danh sách không hợp lệ"
        );
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
  const fetchMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    const token = localStorage.getItem("authToken");
    if (!token) {
      setErrorMessages("Yêu cầu xác thực.");
      setIsLoadingMessages(false);
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    setErrorMessages(null);
    setMessages([]);
    try {
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let errorMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        const sortedMessages = data.result
          .map((m) => ({ ...m, sentAt: new Date(m.sentAt).toISOString() }))
          .sort(
            (a: Message, b: Message) =>
              new Date(a.sentAt as string).getTime() -
              new Date(b.sentAt as string).getTime()
          );
        setMessages(sortedMessages);
      } else if (
        data.code === 1000 &&
        Array.isArray(data.result) &&
        data.result.length === 0
      ) {
        setMessages([]);
      } else {
        throw new Error(
          data.message || "Định dạng dữ liệu tin nhắn không hợp lệ"
        );
      }
    } catch (error: any) {
      console.error(`Lỗi tải tin nhắn cho nhóm ${groupId}:`, error);
      setErrorMessages(error.message || "Lỗi tải tin nhắn.");
      toast.error(`Lỗi tải tin nhắn: ${error.message}`);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);
  const fetchGroupChatDetails = useCallback(
    async (groupId: string) => {
      if (!groupId || !currentUser?.id) return;
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Yêu cầu xác thực để tải chi tiết nhóm.");
        return;
      }
      setIsLoadingDetails(true);
      setParticipantSearchTerm("");
      const currentSummary = conversations.find((c) => c.id === groupId);
      setSelectedConversation((prev) => ({
        ...(prev || ({} as MainConversationType)),
        ...(currentSummary || {}),
        id: groupId,
      }));
      let groupDetails: ApiGroupChatDetail | null = null;
      const userDetailsMap = new Map<string, ApiUserDetail>();
      try {
        const groupUrl = `http://localhost:8080/identity/api/events/group-chats/${groupId}`;
        const groupResponse = await fetch(groupUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!groupResponse.ok) {
          let errorMsg = `Lỗi lấy chi tiết nhóm (${groupResponse.status})`;
          try {
            const errData = await groupResponse.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }
        const groupData = await groupResponse.json();
        if (groupData.code !== 1000 || !groupData.result) {
          throw new Error(
            groupData.message || "Không lấy được chi tiết nhóm chat."
          );
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
                    `Dữ liệu không hợp lệ cho user ${userId}:`,
                    userData.message || `code ${userData.code}`
                  );
                  return {
                    status: "rejected",
                    reason: `Invalid data for user ${userId}`,
                  };
                }
              } else {
                console.warn(
                  `Lỗi ${userResponse.status} khi fetch user ${userId}`
                );
                return {
                  status: "rejected",
                  reason: `Failed to fetch user ${userId}`,
                };
              }
            } catch (err) {
              console.error(`Lỗi nghiêm trọng khi fetch user ${userId}:`, err);
              return {
                status: "rejected",
                reason: `Error fetching user ${userId}`,
              };
            }
          }
        );
        const results = await Promise.allSettled(participantPromises);
        results.forEach((result) => {
          if (
            result.status === "fulfilled" &&
            result.value.status === "fulfilled"
          ) {
            userDetailsMap.set(result.value.value.id, result.value.value);
          } else if (
            result.status === "fulfilled" &&
            result.value.status === "rejected"
          ) {
            console.warn(
              `Workspace rejected for a user: ${result.value.reason}`
            );
          } else if (result.status === "rejected") {
            console.error(
              `Promise rejected for a user fetch: ${result.reason}`
            );
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
              }`.trim() || `Bạn (${currentUser.id.substring(0, 4)}...)`;
            participantAvatar =
              currentUser.avatar ||
              userDetail?.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                currentUser.firstName || "?"
              )}&background=random&size=32`;
          } else if (userDetail) {
            const fetchedName = `${userDetail.lastName || ""} ${
              userDetail.firstName || ""
            }`.trim();
            participantName =
              fetchedName ||
              userDetail.username ||
              `User (${userId.substring(0, 4)}...)`;
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
        setSelectedConversation((prev) => ({
          ...(prev || ({} as MainConversationType)),
          id: groupDetails!.id,
          name: groupDetails!.name,
          isGroup: true,
          groupLeaderId: groupDetails!.groupLeaderId,
          participants: finalParticipantList,
          message: prev?.message || "...",
          avatar:
            prev?.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              groupDetails!.name
            )}&background=random&font-size=0.4`,
        }));
      } catch (error: any) {
        console.error(`Lỗi tải chi tiết nhóm chat ${groupId}:`, error);
        toast.error(`Lỗi tải chi tiết nhóm: ${error.message}`);
        setSelectedConversation((prev) => ({
          ...(currentSummary || ({} as MainConversationType)),
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
    const token = localStorage.getItem("authToken");
    if (!token) {
      setErrorMedia("Yêu cầu xác thực.");
      setIsLoadingMedia(false);
      setMediaMessages([]);
      return;
    }
    setIsLoadingMedia(true);
    setErrorMedia(null);
    setMediaMessages([]);
    try {
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/media`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let errorMsg = `Lỗi tải media ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setMediaMessages(data.result);
      } else if (
        data.code === 1000 &&
        Array.isArray(data.result) &&
        data.result.length === 0
      ) {
        setMediaMessages([]);
      } else {
        throw new Error(data.message || "Không thể tải danh sách media.");
      }
    } catch (error: any) {
      console.error(`Lỗi tải media cho nhóm ${groupId}:`, error);
      setErrorMedia(error.message || "Lỗi tải media.");
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);
  const fetchFileMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    const token = localStorage.getItem("authToken");
    if (!token) {
      setErrorFiles("Yêu cầu xác thực.");
      setIsLoadingFiles(false);
      setFileMessages([]);
      return;
    }
    setIsLoadingFiles(true);
    setErrorFiles(null);
    setFileMessages([]);
    try {
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/files`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let errorMsg = `Lỗi tải file ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setFileMessages(data.result);
      } else if (
        data.code === 1000 &&
        Array.isArray(data.result) &&
        data.result.length === 0
      ) {
        setFileMessages([]);
      } else {
        throw new Error(data.message || "Không thể tải danh sách file.");
      }
    } catch (error: any) {
      console.error(`Lỗi tải file cho nhóm ${groupId}:`, error);
      setErrorFiles(error.message || "Lỗi tải file.");
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);
  const fetchAudioMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    const token = localStorage.getItem("authToken");
    if (!token) {
      setErrorAudio("Yêu cầu xác thực.");
      setIsLoadingAudio(false);
      setAudioMessages([]);
      return;
    }
    setIsLoadingAudio(true);
    setErrorAudio(null);
    setAudioMessages([]);
    try {
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/audios`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        let errorMsg = `Lỗi tải audio ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setAudioMessages(data.result);
      } else if (
        data.code === 1000 &&
        Array.isArray(data.result) &&
        data.result.length === 0
      ) {
        setAudioMessages([]);
      } else {
        throw new Error(data.message || "Không thể tải danh sách audio.");
      }
    } catch (error: any) {
      console.error(`Lỗi tải audio cho nhóm ${groupId}:`, error);
      setErrorAudio(error.message || "Lỗi tải audio.");
    } finally {
      setIsLoadingAudio(false);
    }
  }, []);

  // --- Các hàm xử lý hành động ---
  const handleRemoveMember = useCallback(
    async (
      groupId: string | number,
      memberIdToRemove: string,
      leaderId: string
    ) => {
      if (!groupId || !memberIdToRemove || !leaderId) {
        toast.error("Thiếu thông tin để xóa thành viên.");
        return;
      }
      setIsProcessingAction(true);
      const loadingToastId = toast.loading("Đang yêu cầu xóa thành viên...");
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Yêu cầu xác thực.");
        const url = `http://localhost:8080/identity/api/events/group-chats/${groupId}/members/${memberIdToRemove}?leaderId=${leaderId}`;
        const response = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          let errorMsg = `Lỗi ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }
        toast.success("Yêu cầu xóa thành công! Chờ cập nhật...", {
          id: loadingToastId,
        });
        setRemoveConfirmationState({
          isOpen: false,
          memberToRemove: null,
          onConfirm: null,
          onCancel: () => {},
        });
      } catch (error: any) {
        console.error("Lỗi xóa thành viên:", error);
        toast.error(`Yêu cầu xóa thất bại: ${error.message}`, {
          id: loadingToastId,
        });
      } finally {
        setIsProcessingAction(false);
      }
    },
    []
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
    const groupId = selectedConversation.id;
    const leaderId = currentUser.id;
    setRemoveConfirmationState({
      isOpen: true,
      memberToRemove: member,
      onConfirm: () => handleRemoveMember(groupId, member.id, leaderId),
      onCancel: closeRemoveConfirmationDialog,
    });
  };
  const handleLeaveGroup = useCallback(
    async (groupId: string | number, memberId: string) => {
      if (!groupId || !memberId) {
        toast.error("Thiếu thông tin để rời nhóm.");
        return;
      }
      setIsProcessingAction(true);
      const loadingToastId = toast.loading("Đang yêu cầu rời khỏi nhóm...");
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Yêu cầu xác thực.");
        const url = `http://localhost:8080/identity/api/events/group-chats/${groupId}/leave?memberId=${memberId}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          let errorMsg = `Lỗi ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }
        toast.success("Yêu cầu rời nhóm thành công! Chờ cập nhật...", {
          id: loadingToastId,
        });
      } catch (error: any) {
        console.error("Lỗi rời khỏi nhóm:", error);
        toast.error(`Yêu cầu rời nhóm thất bại: ${error.message}`, {
          id: loadingToastId,
        });
      } finally {
        setLeaveConfirmationState({
          isOpen: false,
          onConfirm: null,
          onCancel: () => {},
        });
        setIsProcessingAction(false);
      }
    },
    []
  ); // Bỏ handleGoBackToList vì WebSocket sẽ xử lý
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
    const groupId = selectedConversation.id;
    const memberId = currentUser.id;
    setLeaveConfirmationState({
      isOpen: true,
      onConfirm: () => handleLeaveGroup(groupId, memberId),
      onCancel: closeLeaveConfirmationDialog,
    });
  };
  const handleDownloadFile = useCallback(
    async (messageId: string, fileName?: string | null) => {
      if (!messageId) return;
      setDownloadingFileId(messageId);
      const toastId = toast.loading(`Đang tải ${fileName || "file"}...`);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Yêu cầu xác thực không thành công.");
        const url = `http://localhost:8080/identity/api/events/messages/${messageId}/download`;
        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          let errorMsg = `Lỗi tải file: ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) {
            errorMsg = `Lỗi ${response.status}: ${
              response.statusText || "Không thể tải file"
            }`;
          }
          throw new Error(errorMsg);
        }
        const disposition = response.headers.get("content-disposition");
        let finalFileName = fileName || "downloaded_file";
        if (disposition) {
          const filenameMatch = disposition.match(/filename="?(.+)"?/i);
          if (filenameMatch && filenameMatch[1]) {
            finalFileName = decodeURIComponent(filenameMatch[1]);
          }
        }
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = downloadUrl;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
        toast.success(`Đã tải ${finalFileName} thành công!`, { id: toastId });
      } catch (error: any) {
        console.error("Lỗi tải file:", error);
        toast.error(
          `Tải file thất bại: ${error.message || "Lỗi không xác định"}`,
          { id: toastId }
        );
      } finally {
        setDownloadingFileId(null);
      }
    },
    []
  );
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!messageId || !currentUser?.id) {
        toast.error("Không thể xóa tin nhắn.");
        return;
      }
      const userId = currentUser.id;
      setIsProcessingAction(true);
      const loadingToastId = toast.loading("Đang yêu cầu xóa tin nhắn...");
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Yêu cầu xác thực không thành công.");
        const url = `http://localhost:8080/identity/api/events/messages/${messageId}?userId=${userId}`;
        const response = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          let errorMsg = `Lỗi ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) {
            errorMsg = `Lỗi ${response.status}: ${
              response.statusText || "Không thể xóa tin nhắn"
            }`;
          }
          throw new Error(errorMsg);
        }
        const responseText = await response.text();
        let data;
        try {
          data = responseText ? JSON.parse(responseText) : { code: 1000 };
        } catch (e) {
          if (response.ok) data = { code: 1000 };
          else throw new Error("Phản hồi xóa tin nhắn không hợp lệ.");
        }
        if (data.code === 1000) {
          toast.success("Yêu cầu xóa thành công! Chờ cập nhật...", {
            id: loadingToastId,
          });
        } else {
          throw new Error(data.message || "Xóa tin nhắn không thành công.");
        }
      } catch (error: any) {
        console.error("Lỗi xóa tin nhắn:", error);
        toast.error(`Yêu cầu xóa thất bại: ${error.message}`, {
          id: loadingToastId,
        });
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
    [currentUser]
  );
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

  const handleSendMessage = useCallback(() => {
    const messageContent = messageInput.trim();
    if (!messageContent || !selectedConversation?.id || !currentUser?.id) {
      return;
    }
    if (
      !websocketRef.current ||
      websocketRef.current.readyState !== WebSocket.OPEN
    ) {
      toast.error("Chưa kết nối với máy chủ chat.");
      return;
    }

    const messagePayload: WebSocketEvent = {
      event: "new_message",
      payload: {
        content: messageContent,
        senderId: currentUser.id,
        senderName:
          `${currentUser.firstName || ""} ${
            currentUser.lastName || ""
          }`.trim() || currentUser.username,
        groupId: selectedConversation.id,
        type: "TEXT",
        sentAt: Date.now(), // Gửi timestamp
      },
    };

    try {
      console.log("Sending message via WebSocket:", messagePayload);
      websocketRef.current.send(JSON.stringify(messagePayload));
      setMessageInput("");
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Lỗi gửi tin nhắn WebSocket:", error);
      toast.error("Gửi tin nhắn thất bại. Vui lòng thử lại.");
    }
  }, [messageInput, selectedConversation, currentUser]);

  const handleSendFile = useCallback(
    async (file: File) => {
      if (!file || !selectedConversation?.id || !currentUser?.id) {
        return;
      }
      setIsSendingMessage(true);
      const groupId = selectedConversation.id;
      const senderId = currentUser.id;
      const loadingToastId = toast.loading(`Đang tải lên ${file.name}...`);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Yêu cầu xác thực.");
        const url = `http://localhost:8080/identity/api/events/${groupId}/messages`;
        const formData = new FormData();
        formData.append("senderId", senderId);
        formData.append("file", file);
        const response = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!response.ok) {
          let errorMsg = `Lỗi ${response.status}`;
          try {
            const errData = await response.json();
            errorMsg = errData.message || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }
        const data = await response.json();
        if (data.code === 1000 && data.result) {
          toast.success(`Đã gửi ${file.name} thành công!`, {
            id: loadingToastId,
          });
          // Backend sẽ gửi new_message qua WebSocket
        } else {
          throw new Error(
            data.message || `Gửi file ${file.name} không thành công.`
          );
        }
      } catch (error: any) {
        console.error("Lỗi gửi file:", error);
        toast.error(`Gửi file thất bại: ${error.message}`, {
          id: loadingToastId,
        });
      } finally {
        setIsSendingMessage(false);
      }
    },
    [selectedConversation, currentUser] // Loại bỏ các hàm fetch khỏi deps
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
    setMessageInput((prevInput) => prevInput + emojiData.emoji);
    inputRef.current?.focus();
  };

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return conversations.filter((conv) =>
      conv.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [searchTerm, conversations]);
  const filteredParticipants = useMemo(() => {
    if (!selectedConversation?.participants) return [];
    if (!participantSearchTerm.trim()) {
      return selectedConversation.participants;
    }
    const lowerCaseSearch = participantSearchTerm.toLowerCase();
    return selectedConversation.participants.filter((p) =>
      p.name?.toLowerCase().includes(lowerCaseSearch)
    );
  }, [selectedConversation?.participants, participantSearchTerm]);
  const handleSelectConversation = useCallback(
    (conversation: MainConversationType) => {
      if (websocketRef.current) {
        websocketRef.current.close(1000, "Conversation change");
        websocketRef.current = null;
        setIsConnected(false);
        setWebsocketError(null);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      }
      setViewMode("detail");
      setSelectedConversation(conversation);
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
      setSelectedFile(null);
      setActiveInfoTab("media");
      if (conversation.isGroup && typeof conversation.id === "string") {
        fetchGroupChatDetails(conversation.id);
        fetchMessages(conversation.id);
      } else {
        setIsLoadingDetails(false);
        setIsLoadingMessages(false);
      }
    },
    [fetchGroupChatDetails, fetchMessages]
  );
  const getParticipantInfo = (conversation: MainConversationType | null) => {
    if (!conversation?.isGroup) return null;
    if (
      isLoadingDetails &&
      (!conversation.participants || conversation.participants.length === 0)
    ) {
      return (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {" "}
          Đang tải thành viên...{" "}
        </p>
      );
    }
    if (!conversation.participants || conversation.participants.length === 0) {
      return (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {" "}
          (Chưa có thông tin thành viên){" "}
        </p>
      );
    }
    const count = conversation.participants.length;
    const namesToShow = conversation.participants
      .slice(0, 3)
      .map((p) => p.name)
      .join(", ");
    const remainingCount = count - 3;
    return (
      <p
        className="text-xs text-gray-500 truncate mt-0.5 cursor-pointer hover:underline"
        onClick={() => {
          setShowInfoPanel(true);
          setParticipantSearchTerm("");
          setActiveInfoTab("media");
        }}
      >
        {" "}
        {count} thành viên: {namesToShow}{" "}
        {remainingCount > 0 && ` và ${remainingCount} người khác`}{" "}
      </p>
    );
  };
  useEffect(() => {
    if (
      showInfoPanel &&
      selectedConversation?.id &&
      selectedConversation.isGroup
    ) {
      if (mediaMessages.length === 0 && !isLoadingMedia && !errorMedia) {
        fetchMediaMessages(selectedConversation.id);
      }
      if (fileMessages.length === 0 && !isLoadingFiles && !errorFiles) {
        fetchFileMessages(selectedConversation.id);
      }
      if (audioMessages.length === 0 && !isLoadingAudio && !errorAudio) {
        fetchAudioMessages(selectedConversation.id);
      }
    }
  }, [
    showInfoPanel,
    selectedConversation?.id,
    selectedConversation?.isGroup,
    fetchMediaMessages,
    fetchFileMessages,
    fetchAudioMessages,
    mediaMessages.length,
    fileMessages.length,
    audioMessages.length,
    isLoadingMedia,
    isLoadingFiles,
    isLoadingAudio,
    errorMedia,
    errorFiles,
    errorAudio,
  ]);

  const renderListView = () => (
    <div className="flex flex-col h-full">
      {" "}
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        {" "}
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <MagnifyingGlassIcon width="16" height="16" />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên nhóm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <ul className="space-y-1 p-3 overflow-y-auto flex-1 bg-gray-50">
        {isLoadingConversations ? (
          <p className="text-center text-gray-500 py-6 italic">
            Đang tải danh sách...
          </p>
        ) : errorConversations ? (
          <p className="text-center text-red-500 py-6">{errorConversations}</p>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => (
            <li
              key={conv.id}
              onClick={() => handleSelectConversation(conv)}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  handleSelectConversation(conv);
              }}
            >
              <img
                src={
                  conv.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    conv.name
                  )}&background=random`
                }
                alt={`Avatar của ${conv.name}`}
                className="w-11 h-11 rounded-full object-cover flex-shrink-0 border"
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
          <p className="text-center text-gray-500 py-6 italic">
            {searchTerm
              ? "Không tìm thấy nhóm chat nào."
              : "Không có nhóm chat nào."}
          </p>
        )}
      </ul>
    </div>
  );
  const renderDetailView = (conversation: MainConversationType) => {
    const isLeader =
      conversation.isGroup && currentUser?.id === conversation.groupLeaderId;
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
              <ChevronLeftIcon width="24" height="24" />
            </button>
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
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-semibold truncate">
                {conversation.name}
              </h2>
              {conversation.isGroup && getParticipantInfo(conversation)}
              <div className="text-xs mt-0.5 flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                ></span>
                <span
                  className={`${
                    isConnected ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isConnected
                    ? "Đã kết nối"
                    : websocketError
                    ? websocketError
                    : "Đang kết nối..."}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {conversation.isGroup && (
              <button
                onClick={() => {
                  setShowInfoPanel(!showInfoPanel);
                  setParticipantSearchTerm("");
                  setActiveInfoTab("media");
                  if (!showInfoPanel) {
                    setShowEmojiPicker(false);
                  }
                }}
                aria-label="Thông tin"
                className="text-gray-500 hover:text-blue-600 p-1 rounded-full hover:bg-gray-200 cursor-pointer"
              >
                <InfoCircledIcon width="22" height="22" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div
            className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
              showInfoPanel ? "w-full md:w-[calc(100%-350px)]" : "w-full"
            }`}
          >
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
              {isLoadingMessages && (
                <div className="flex justify-center items-center h-full text-gray-500 italic">
                  Đang tải tin nhắn...
                </div>
              )}
              {!isLoadingMessages && errorMessages && (
                <div className="flex justify-center items-center h-full text-red-500">
                  {errorMessages}
                </div>
              )}
              {!isLoadingMessages &&
                !errorMessages &&
                messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 italic">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-gray-300 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                    Chưa có tin nhắn nào. <br /> Bắt đầu cuộc trò chuyện!
                  </div>
                )}
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
                    {msg.senderId === currentUser?.id && (
                      <button
                        onClick={() => confirmDeleteMessage(msg)}
                        disabled={isProcessingAction}
                        aria-label="Xóa tin nhắn"
                        className="relative cursor-pointer top-1/2 left-0 -translate-x-8 -translate-y-1/2 p-2 rounded-full bg-white shadow hover:bg-red-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out focus:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <TrashIcon width={14} height={14} />
                      </button>
                    )}
                    {msg.senderId !== currentUser?.id && (
                      <img
                        src={
                          selectedConversation?.participants?.find(
                            (p) => p.id === msg.senderId
                          )?.avatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            msg.senderName || "?"
                          )}&background=random`
                        }
                        className="w-10 h-10 rounded-full object-cover border self-end mb-1 flex-shrink-0"
                        alt={msg.senderName || "Sender"}
                      />
                    )}
                    <div
                      className={`${
                        msg.senderId === currentUser?.id
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-800"
                      } p-2 md:p-3 rounded-lg max-w-[70%]`}
                    >
                      {conversation.isGroup &&
                        msg.senderId !== currentUser?.id && (
                          <span className="text-xs font-semibold text-purple-700 block mb-1">
                            {" "}
                            {selectedConversation?.participants?.find(
                              (p) => p.id === msg.senderId
                            )?.name ||
                              msg.senderName ||
                              "Unknown User"}{" "}
                          </span>
                        )}
                      {msg.type === "TEXT" && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {" "}
                          {msg.content}{" "}
                        </p>
                      )}
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
                              <DownloadIcon className="w-4 h-4  " />
                            )}{" "}
                          </button>{" "}
                        </div>
                      )}
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
                      )}
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
                            {msg.fileName || "Video"}
                          </span>
                        </div>
                      )}
                      {msg.type === "AUDIO" && msg.fileUrl && (
                        <div className="flex items-center gap-2 p-2 bg-gray-200 rounded">
                          <audio
                            controls
                            src={msg.fileUrl}
                            className="flex-1 h-8"
                          >
                            Your browser does not support the audio element.
                          </audio>
                          <button
                            onClick={() =>
                              handleDownloadFile(msg.id, msg.fileName)
                            }
                            disabled={downloadingFileId === msg.id}
                            aria-label={`Tải ${msg.fileName || "audio"}`}
                            className="text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-wait"
                          >
                            {downloadingFileId === msg.id ? (
                              <UpdateIcon className="w-4 h-4 animate-spin" />
                            ) : (
                              <DownloadIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                      <span
                        className={`text-xs mt-1 block text-left ${
                          msg.senderId === currentUser?.id
                            ? "text-blue-100 opacity-75"
                            : "text-gray-500 opacity-75"
                        }`}
                      >
                        {new Date(msg.sentAt as string).toLocaleTimeString(
                          "vi-VN",
                          { hour: "2-digit", minute: "2-digit", hour12: false }
                        )}
                      </span>
                    </div>
                  </div>
                ))}{" "}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 md:p-4 border-t bg-gray-50 flex-shrink-0 relative">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                />
                <button
                  onClick={triggerFileInput}
                  disabled={isSendingMessage}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer disabled:opacity-50"
                >
                  <Link2Icon width="20" height="20" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    isConnected ? "Nhập tin nhắn..." : "Đang kết nối lại..."
                  }
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      messageInput.trim() &&
                      !isSendingMessage &&
                      isConnected
                    ) {
                      handleSendMessage();
                    } else if (e.key === "Enter" && !isConnected) {
                      toast.error("Chưa kết nối với máy chủ chat.");
                    }
                  }}
                  disabled={!isConnected}
                  className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    !isConnected ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                />
                <button
                  ref={emojiButtonRef}
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer"
                >
                  <FaceIcon width="20" height="20" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !isConnected}
                  className={`p-2 rounded-full ${
                    messageInput.trim() && isConnected
                      ? "bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  aria-label="Gửi tin nhắn"
                >
                  <PaperPlaneIcon width="20" height="20" />
                </button>
              </div>
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full right-0 mb-2 z-50"
                >
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    autoFocusSearch={false}
                    theme={Theme.AUTO}
                    lazyLoadEmojis={true}
                  />
                </div>
              )}
            </div>
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
                  <Cross2Icon width="20" height="20" />
                </button>{" "}
              </div>{" "}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col">
                {" "}
                {isLoadingDetails ? (
                  <div className="flex justify-center items-center py-10 text-gray-500">
                    <span className="animate-spin mr-2">⏳</span> Đang tải...
                  </div>
                ) : (
                  <>
                    {" "}
                    <div className="pb-4 border-b">
                      {" "}
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-gray-600">
                          <PersonIcon className="inline mr-1 mb-0.5" />
                          {filteredParticipants?.length || 0} Thành viên
                        </h4>
                      </div>{" "}
                      <div className="relative mb-3">
                        <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400">
                          <MagnifyingGlassIcon width="14" height="14" />
                        </span>
                        <input
                          type="text"
                          placeholder="Tìm thành viên..."
                          value={participantSearchTerm}
                          onChange={(e) =>
                            setParticipantSearchTerm(e.target.value)
                          }
                          className="w-full pl-8 pr-2 py-1 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 shadow-sm"
                        />
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
                                <img
                                  src={
                                    p.avatar ||
                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                      p.name
                                    )}&background=random&size=32`
                                  }
                                  alt={p.name}
                                  className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                                />
                                <span className="text-sm text-gray-700 truncate">
                                  {getParticipantDisplayName(p)}
                                </span>
                              </div>{" "}
                              {isLeader && p.id !== currentUser?.id && (
                                <button
                                  onClick={() => confirmRemoveMember(p)}
                                  disabled={isProcessingAction}
                                  aria-label={`Xóa ${p.name}`}
                                  className={`p-1 text-gray-400 cursor-pointer hover:text-red-600 opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0`}
                                >
                                  <TrashIcon width="16" height="16" />
                                </button>
                              )}{" "}
                            </li>
                          ))
                        ) : (
                          <li className="text-center text-xs text-gray-400 italic py-4">
                            Không tìm thấy thành viên.
                          </li>
                        )}{" "}
                      </ul>
                    </div>{" "}
                    <div className="flex flex-col flex-1 min-h-0">
                      {" "}
                      <div className="border-b border-gray-200 flex-shrink-0">
                        <nav
                          className="-mb-px flex space-x-4"
                          aria-label="Tabs"
                        >
                          <button
                            onClick={() => setActiveInfoTab("media")}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${
                              activeInfoTab === "media"
                                ? "border-purple-500 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <ImageIcon className="h-4 w-4" /> Media (
                            {mediaMessages.length})
                          </button>
                          <button
                            onClick={() => setActiveInfoTab("files")}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${
                              activeInfoTab === "files"
                                ? "border-purple-500 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <FileTextIcon className="h-4 w-4" /> Files (
                            {fileMessages.length})
                          </button>
                          <button
                            onClick={() => setActiveInfoTab("audio")}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-1 ${
                              activeInfoTab === "audio"
                                ? "border-purple-500 text-purple-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <SpeakerLoudIcon className="h-4 w-4" /> Âm thanh (
                            {audioMessages.length})
                          </button>
                        </nav>
                      </div>{" "}
                      <div className="pt-4 flex-1 overflow-y-auto">
                        {" "}
                        {activeInfoTab === "media" && (
                          <div className="space-y-2">
                            {" "}
                            {isLoadingMedia ? (
                              <p className="text-xs text-gray-500 italic text-center py-4">
                                Đang tải media...
                              </p>
                            ) : errorMedia ? (
                              <p className="text-xs text-red-500 text-center py-4">
                                {errorMedia}
                              </p>
                            ) : mediaMessages.length > 0 ? (
                              <div className="grid grid-cols-3 gap-2">
                                {" "}
                                {mediaMessages.map((msg) => (
                                  <a
                                    key={msg.id}
                                    href={msg.fileUrl || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative group aspect-square bg-gray-100 rounded overflow-hidden hover:opacity-80"
                                  >
                                    {" "}
                                    {msg.type === "IMAGE" && msg.fileUrl && (
                                      <img
                                        src={msg.fileUrl}
                                        alt={msg.fileName || "media"}
                                        className="w-full h-full object-cover"
                                      />
                                    )}{" "}
                                    {msg.type === "VIDEO" && (
                                      <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-xs p-1">
                                        <svg
                                          className="w-6 h-6 text-gray-300"
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M2.94 15.06a.5.5 0 0 0 .7.7L7.5 12.07V14a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-1.93l3.86 3.69a.5.5 0 0 0 .7-.7L12.93 10l3.63-3.63a.5.5 0 0 0-.7-.7L12 9.93V8a.5.5 0 0 0-.5-.5h-4A.5.5 0 0 0 7 8v1.93L3.14 6.37a.5.5 0 0 0-.7.7L6.07 10 2.44 13.63z"></path>
                                        </svg>
                                      </div>
                                    )}{" "}
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDownloadFile(
                                          msg.id,
                                          msg.fileName
                                        );
                                      }}
                                      disabled={downloadingFileId === msg.id}
                                      aria-label={`Tải ${
                                        msg.fileName || "media"
                                      }`}
                                      className={`absolute top-1 right-1 cursor-pointer bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none disabled:opacity-50 disabled:cursor-wait`}
                                    >
                                      {downloadingFileId === msg.id ? (
                                        <UpdateIcon className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <DownloadIcon className="w-3 h-3" />
                                      )}
                                    </button>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center py-4">
                                Không có hình ảnh/video.
                              </p>
                            )}
                          </div>
                        )}
                        {activeInfoTab === "files" && (
                          <div className="space-y-1">
                            {isLoadingFiles ? (
                              <p className="text-xs text-gray-500 italic text-center py-4">
                                Đang tải file...
                              </p>
                            ) : errorFiles ? (
                              <p className="text-xs text-red-500 text-center py-4">
                                {errorFiles}
                              </p>
                            ) : fileMessages.length > 0 ? (
                              <ul className="space-y-1">
                                {fileMessages.map((msg) => (
                                  <li key={msg.id}>
                                    <button
                                      onClick={() =>
                                        handleDownloadFile(msg.id, msg.fileName)
                                      }
                                      disabled={downloadingFileId === msg.id}
                                      className="flex w-full items-center cursor-pointer gap-2 text-xs text-blue-600 hover:underline p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-wait"
                                    >
                                      {downloadingFileId === msg.id ? (
                                        <UpdateIcon className="w-3 h-3 flex-shrink-0 animate-spin" />
                                      ) : (
                                        <DownloadIcon className="w-3 h-3 flex-shrink-0" />
                                      )}
                                      <span className="truncate text-left">
                                        {msg.fileName || "Tài liệu không tên"}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center py-4">
                                Không có file nào.
                              </p>
                            )}
                          </div>
                        )}
                        {activeInfoTab === "audio" && (
                          <div className="space-y-1">
                            {isLoadingAudio ? (
                              <p className="text-xs text-gray-500 italic text-center py-4">
                                Đang tải âm thanh...
                              </p>
                            ) : errorAudio ? (
                              <p className="text-xs text-red-500 text-center py-4">
                                {errorAudio}
                              </p>
                            ) : audioMessages.length > 0 ? (
                              <ul className="space-y-1">
                                {audioMessages.map((msg) => (
                                  <li key={msg.id}>
                                    <button
                                      onClick={() =>
                                        handleDownloadFile(msg.id, msg.fileName)
                                      }
                                      disabled={downloadingFileId === msg.id}
                                      className="flex w-full items-center cursor-pointer gap-2 text-xs text-blue-600 hover:underline p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-wait"
                                    >
                                      {downloadingFileId === msg.id ? (
                                        <UpdateIcon className="w-3 h-3 flex-shrink-0 animate-spin" />
                                      ) : (
                                        <DownloadIcon className="w-3 h-3 flex-shrink-0" />
                                      )}
                                      <span className="truncate text-left">
                                        {msg.fileName || "Audio không tên"}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center py-4">
                                Không có file âm thanh.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>{" "}
                    <div className="mt-auto pt-4">
                      {!isLeader && conversation.isGroup && currentUser && (
                        <button
                          onClick={confirmLeaveGroup}
                          disabled={isProcessingAction}
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 font-medium mb-3 cursor-pointer disabled:opacity-50"
                        >
                          <ExitIcon /> Rời khỏi nhóm
                        </button>
                      )}
                      {isLeader && (
                        <button
                          onClick={() =>
                            toast.error(
                              "Chức năng giải tán nhóm chưa được cài đặt."
                            )
                          }
                          className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded border border-red-700 font-medium cursor-pointer"
                        >
                          <TrashIcon /> Giải tán nhóm
                        </button>
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
              Bạn có chắc chắn muốn xóa thành viên{" "}
              <strong>{removeConfirmationState.memberToRemove?.name}</strong>{" "}
              khỏi nhóm chat này không?
            </>
          }
          confirmText="Xóa"
          cancelText="Hủy bỏ"
          confirmVariant="danger"
          onConfirm={removeConfirmationState.onConfirm || (() => {})}
          onCancel={removeConfirmationState.onCancel}
        />
        <ConfirmationDialog
          isOpen={leaveConfirmationState.isOpen}
          title="Xác nhận rời nhóm"
          message="Bạn có chắc chắn muốn rời khỏi nhóm chat này không?"
          confirmText="Rời nhóm"
          cancelText="Hủy bỏ"
          confirmVariant="danger"
          onConfirm={leaveConfirmationState.onConfirm || (() => {})}
          onCancel={leaveConfirmationState.onCancel}
        />
        <ConfirmationDialog
          isOpen={deleteMessageConfirmationState.isOpen}
          title="Xác nhận xóa tin nhắn"
          message="Bạn có chắc chắn muốn xóa tin nhắn này không? Hành động này không thể hoàn tác."
          confirmText="Xóa tin nhắn"
          cancelText="Hủy bỏ"
          confirmVariant="danger"
          onConfirm={deleteMessageConfirmationState.onConfirm || (() => {})}
          onCancel={deleteMessageConfirmationState.onCancel}
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
