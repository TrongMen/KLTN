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
  FaceIcon, // Icon này sẽ dùng để mở picker
  Link2Icon,
  PersonIcon,
  TrashIcon,
  PlusIcon,
  ExitIcon,
  FileTextIcon,
  ImageIcon,
  SpeakerLoudIcon,
} from "@radix-ui/react-icons";
// Import thư viện emoji picker
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react'; // Thêm EmojiClickData và Theme nếu cần

import {
  User as MainUserType,
  Conversation as MainConversationType,
  Role,
  Participant,
} from "../homeuser";

// ... (Các interfaces không thay đổi) ...
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

// --- ConfirmationDialog Component (Không thay đổi) ---
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


// --- ChatTabContent Component ---
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null); // Ref cho input field
  const emojiPickerRef = useRef<HTMLDivElement>(null); // Ref cho container của picker
  const emojiButtonRef = useRef<HTMLButtonElement>(null); // Ref cho nút mở picker


  // --- State for Emoji Picker ---
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Effect to close Emoji Picker on outside click ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the picker container AND outside the trigger button
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

    // Add listener if picker is open
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]); // Re-run this effect when showEmojiPicker changes

  // --- Fetch Functions (Không thay đổi) ---
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
        let errorMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.code === 1000 && Array.isArray(data.result)) {
        const sortedMessages = data.result.sort(
          (a: Message, b: Message) =>
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
        setMessages(sortedMessages);
      } else {
        if (
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
      setIsLoadingDetails(true);
      setParticipantSearchTerm("");
      const currentSummary = conversations.find((c) => c.id === groupId);
      setSelectedConversation(prev => ({
         ...(prev || {} as MainConversationType),
         ...(currentSummary || {}),
         id: groupId,
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
          avatar: prev?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(groupDetails!.name)}&background=random&font-size=0.4`,
        }));
      } catch (error: any) {
        console.error(`Lỗi tải chi tiết nhóm chat ${groupId}:`, error);
        toast.error(`Lỗi tải chi tiết nhóm: ${error.message}`);
         setSelectedConversation(prev => ({ ...(currentSummary || {} as MainConversationType), id: groupId, participants: prev?.participants || [] }));
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
    setMediaMessages([]);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Yêu cầu xác thực.");
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/media`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
          let errorMsg = `Lỗi tải media ${response.status}`;
          try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch (e) {}
          throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setMediaMessages(data.result);
      } else {
         if (data.code === 1000 && Array.isArray(data.result) && data.result.length === 0) {
             setMediaMessages([]);
         } else {
            throw new Error(data.message || "Không thể tải danh sách media.");
         }
      }
    } catch (error: any) {
      console.error(`Lỗi tải media cho nhóm ${groupId}:`, error);
      setErrorMedia(error.message || "Lỗi tải media.");
      // toast.error(`Lỗi tải media: ${error.message}`); // Maybe too noisy
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  const fetchFileMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setIsLoadingFiles(true);
    setErrorFiles(null);
    setFileMessages([]);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Yêu cầu xác thực.");
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/files`;
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
       if (!response.ok) {
          let errorMsg = `Lỗi tải file ${response.status}`;
          try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch (e) {}
          throw new Error(errorMsg);
      }
      const data = await response.json();
       if (data.code === 1000 && Array.isArray(data.result)) {
        setFileMessages(data.result);
      } else {
          if (data.code === 1000 && Array.isArray(data.result) && data.result.length === 0) {
             setFileMessages([]);
         } else {
            throw new Error(data.message || "Không thể tải danh sách file.");
         }
      }
    } catch (error: any) {
      console.error(`Lỗi tải file cho nhóm ${groupId}:`, error);
      setErrorFiles(error.message || "Lỗi tải file.");
      // toast.error(`Lỗi tải file: ${error.message}`);
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  const fetchAudioMessages = useCallback(async (groupId: string) => {
    if (!groupId) return;
    setIsLoadingAudio(true);
    setErrorAudio(null);
    setAudioMessages([]);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Yêu cầu xác thực.");
      const url = `http://localhost:8080/identity/api/events/${groupId}/messages/audio`; // Placeholder URL
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
       if (!response.ok) {
          let errorMsg = `Lỗi tải audio ${response.status}`;
          try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch (e) {}
          throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setAudioMessages(data.result);
      } else {
          if (data.code === 1000 && Array.isArray(data.result) && data.result.length === 0) {
             setAudioMessages([]);
         } else {
             throw new Error(data.message || "Không thể tải danh sách audio.");
         }
      }
    } catch (error: any) {
      console.error(`Lỗi tải audio cho nhóm ${groupId}:`, error);
      setErrorAudio(error.message || "Lỗi tải audio.");
      // toast.error(`Lỗi tải audio: ${error.message}`);
    } finally {
      setIsLoadingAudio(false);
    }
  }, []);

  // --- Action Handlers (Không thay đổi) ---
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
      const loadingToastId = toast.loading("Đang xóa thành viên...");

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

        toast.success("Xóa thành viên thành công!", { id: loadingToastId });

        setSelectedConversation((prev) => {
          if (!prev || !prev.participants) return prev;
          return {
            ...prev,
            participants: prev.participants.filter(
              (p) => p.id !== memberIdToRemove
            ),
          };
        });

        setRemoveConfirmationState({
          isOpen: false,
          memberToRemove: null,
          onConfirm: null,
          onCancel: () => {},
        });
      } catch (error: any) {
        console.error("Lỗi xóa thành viên:", error);
        toast.error(`Xóa thất bại: ${error.message}`, { id: loadingToastId });
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

  const handleGoBackToList = useCallback(() => {
    setViewMode("list");
    setSelectedConversation(null);
  }, []);

  const handleLeaveGroup = useCallback(
    async (groupId: string | number, memberId: string) => {
      if (!groupId || !memberId) {
        toast.error("Thiếu thông tin để rời nhóm.");
        return;
      }
      setIsProcessingAction(true);
      const loadingToastId = toast.loading("Đang rời khỏi nhóm...");

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

        toast.success("Rời khỏi nhóm thành công!", { id: loadingToastId });

        setConversations((prev) => prev.filter((c) => c.id !== groupId));
        handleGoBackToList();
      } catch (error: any) {
        console.error("Lỗi rời khỏi nhóm:", error);
        toast.error(`Rời nhóm thất bại: ${error.message}`, {
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
    const groupId = selectedConversation.id;
    const memberId = currentUser.id;

    setLeaveConfirmationState({
      isOpen: true,
      onConfirm: () => handleLeaveGroup(groupId, memberId),
      onCancel: closeLeaveConfirmationDialog,
    });
  };

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation?.id || !currentUser?.id) {
      return;
    }
    setIsSendingMessage(true);
    const messageContent = messageInput;
    const groupId = selectedConversation.id;
    const senderId = currentUser.id;
    setMessageInput("");
    setShowEmojiPicker(false); // Close picker when sending

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Yêu cầu xác thực.");

      const url = `http://localhost:8080/identity/api/events/${groupId}/messages`;

      const formData = new FormData();
      formData.append("senderId", senderId);
      formData.append("content", messageContent);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorMsg = `Lỗi ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.message || errorMsg;
        } catch (e) {
          console.log(
            "Response error body is not JSON:",
            await response.text()
          );
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      if (data.code === 1000 && data.result) {
        const newMessage: Message = data.result;
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setConversations((prevConvos) =>
          prevConvos.map((convo) =>
            convo.id === groupId
              ? {
                  ...convo,
                  message:
                    newMessage.content ??
                    `Đã gửi: ${newMessage.fileName || "File"}`,
                }
              : convo
          )
        );
      } else {
        throw new Error(data.message || "Gửi tin nhắn không thành công.");
      }
    } catch (error: any) {
      console.error("Lỗi gửi tin nhắn:", error);
      toast.error(`Gửi thất bại: ${error.message}`);
      setMessageInput(messageContent); // Restore input on error
    } finally {
      setIsSendingMessage(false);
    }
  }, [messageInput, selectedConversation, currentUser, setConversations]);

  const handleSendFile = useCallback(
    async (file: File) => {
      if (!file || !selectedConversation?.id || !currentUser?.id) {
        return;
      }
      setIsSendingMessage(true); // Use same sending state
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
          const newMessage: Message = data.result;
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          setConversations((prevConvos) =>
            prevConvos.map((convo) =>
              convo.id === groupId
                ? {
                    ...convo,
                    message: `Đã gửi: ${newMessage.fileName || "File"}`,
                  }
                : convo
            )
          );
           // Refetch info panel data after successful upload
           if (showInfoPanel && selectedConversation?.id) {
              if (newMessage.type === 'IMAGE' || newMessage.type === 'VIDEO') fetchMediaMessages(selectedConversation.id);
              else if (newMessage.type === 'FILE') fetchFileMessages(selectedConversation.id);
              else if (newMessage.type === 'AUDIO') fetchAudioMessages(selectedConversation.id);
           }

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
    [selectedConversation, currentUser, setConversations, showInfoPanel, fetchMediaMessages, fetchFileMessages, fetchAudioMessages] // Added dependencies
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

  // --- Emoji Picker Handler ---
  const onEmojiClick = (emojiData: EmojiClickData, event: MouseEvent) => {
    setMessageInput(prevInput => prevInput + emojiData.emoji);
    // Keep picker open after selection, user can manually close or click outside
    // setShowEmojiPicker(false);
    inputRef.current?.focus(); // Focus input after adding emoji
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
      setViewMode("detail");
      setShowInfoPanel(false);
      setShowEmojiPicker(false); // Close emoji picker when changing convo
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

      if (conversation.isGroup && typeof conversation.id === "string") {
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


  const getParticipantInfo = (conversation: MainConversationType | null) => {
    if (!conversation?.isGroup) return null;
    if (
      isLoadingDetails &&
      (!conversation.participants || conversation.participants.length === 0)
    ) {
      return (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          Đang tải thành viên...
        </p>
      );
    }
    if (!conversation.participants || conversation.participants.length === 0) {
      return (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          (Chưa có thông tin thành viên)
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
        }}
      >
        {count} thành viên: {namesToShow}
        {remainingCount > 0 && ` và ${remainingCount} người khác`}
      </p>
    );
  };


  useEffect(() => {
    if (showInfoPanel && selectedConversation?.id && selectedConversation.isGroup) {
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
      isLoadingMedia, isLoadingFiles, isLoadingAudio,
      errorMedia, errorFiles, errorAudio
    ]);


  const renderListView = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
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
      <div className="flex-1 flex flex-col overflow-hidden relative h-150">
        <div className="flex justify-between items-center p-3 md:p-4 border-b bg-gray-50 flex-shrink-0">
           {/* Header content */}
           <div className="flex items-center gap-2 md:gap-3 min-w-0">
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
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {conversation.isGroup && (
              <button
                onClick={() => {
                  setShowInfoPanel(!showInfoPanel);
                  setParticipantSearchTerm("");
                   if (!showInfoPanel) { // Fetch data only when opening panel
                        setShowEmojiPicker(false); // Close emoji picker if open
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
              {/* Message rendering */}
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
                    className={`flex items-end gap-2 ${
                      msg.senderId === currentUser?.id
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
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
                            {selectedConversation?.participants?.find(
                              (p) => p.id === msg.senderId
                            )?.name ||
                              msg.senderName ||
                              "Unknown User"}
                          </span>
                        )}

                      {msg.type === "TEXT" && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}
                      {msg.type === "IMAGE" && msg.fileUrl && (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={msg.fileName || "Xem ảnh"}
                        >
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName || "Hình ảnh đã gửi"}
                            className="max-w-xs max-h-48 rounded object-contain cursor-pointer"
                          />
                        </a>
                      )}
                      {msg.type === "FILE" && msg.fileUrl && (
                         <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={msg.fileName || "file"}
                          className="flex items-center gap-2 p-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                         >
                          <FileTextIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {msg.fileName || "Tệp đính kèm"}
                          </span>
                         </a>
                      )}
                       {msg.type === "VIDEO" && msg.fileUrl && (
                           <div>
                               <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                   Video: {msg.fileName || "Xem video"}
                               </a>
                           </div>
                       )}
                       {msg.type === "AUDIO" && msg.fileUrl && (
                           <div>
                               <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                   Audio: {msg.fileName || "Nghe audio"}
                               </a>
                           </div>
                       )}


                      <span
                        className={`text-xs mt-1 block text-left ${
                          msg.senderId === currentUser?.id
                            ? "text-blue-100 opacity-75"
                            : "text-gray-500 opacity-75"
                        }`}
                      >
                        {new Date(msg.sentAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Added Emoji Picker */}
            <div className="p-3 md:p-4 border-t bg-gray-50 flex-shrink-0 relative"> {/* Added relative positioning */}
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
                  ref={inputRef} // Added ref
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && messageInput.trim() && !isSendingMessage) {
                      handleSendMessage();
                    }
                  }}
                  disabled={isSendingMessage}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
                {/* Emoji Button */}
                <button
                   ref={emojiButtonRef} // Added ref
                   onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                   className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer"
                >
                  <FaceIcon width="20" height="20" />
                </button>
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
                  {isSendingMessage ? (
                    <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full"></span>
                  ) : (
                    <PaperPlaneIcon width="20" height="20" />
                  )}
                </button>
              </div>

              {/* Emoji Picker Container */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef} // Added ref
                  className="absolute bottom-full right-0 mb-2 z-50" // Positioned above and to the right
                >
                   <EmojiPicker
                      onEmojiClick={onEmojiClick}
                      autoFocusSearch={false}
                      theme={Theme.AUTO} // Or Theme.LIGHT / Theme.DARK
                      lazyLoadEmojis={true}
                      // width={350} // Optional: Adjust width/height
                      // height={450}
                   />
                </div>
              )}
            </div>
          </div>

          {/* Info Panel (Đã cập nhật ở câu trả lời trước) */}
           {conversation.isGroup && (
            <div
              className={`absolute top-0 right-0 h-full bg-white border-l shadow-lg transition-transform duration-300 transform ${
                showInfoPanel ? "translate-x-0" : "translate-x-full"
              } w-full md:w-[350px] flex flex-col`}
            >
              <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                <h3 className="text-base font-semibold">Thông tin</h3>
                <button
                  onClick={() => setShowInfoPanel(false)}
                  aria-label="Đóng"
                  className="text-gray-400 cursor-pointer hover:text-gray-600 p-1 rounded-full hover:bg-gray-200"
                >
                  <Cross2Icon width="20" height="20" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5 flex flex-col">
                 {isLoadingDetails ? (
                   <div className="flex justify-center items-center py-10 text-gray-500">
                     <span className="animate-spin mr-2">⏳</span> Đang tải...
                   </div>
                 ) : (
                   <>
                     {/* Participants Section */}
                     <div className="pb-4 border-b">
                       <div className="flex justify-between items-center mb-2">
                         <h4 className="text-sm font-semibold text-gray-600">
                           <PersonIcon className="inline mr-1 mb-0.5" />
                           {filteredParticipants?.length || 0} Thành viên
                         </h4>
                       </div>
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
                       </div>
                       <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                         {filteredParticipants.length > 0 ? (
                           filteredParticipants.map((p) => (
                             <li
                               key={p.id}
                               className="flex items-center justify-between group"
                             >
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
                           <li className="text-center text-xs text-gray-400 italic py-4">
                             Không tìm thấy thành viên.
                           </li>
                         )}
                       </ul>
                       {isLeader && (
                         <button
                           onClick={() =>
                             toast.error(
                               "Chức năng thêm thành viên chưa được cài đặt."
                             )
                           }
                           className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 cursor-pointer"
                         >
                           <PlusIcon /> Thêm thành viên
                         </button>
                       )}
                     </div>

                     {/* Media Section */}
                     <div className="pb-4 border-b">
                       <h4 className="text-sm font-semibold text-gray-600 mb-2">
                         <ImageIcon className="inline mr-1 mb-0.5" /> Media ({mediaMessages.length})
                       </h4>
                       {isLoadingMedia ? (
                           <p className="text-xs text-gray-500 italic">Đang tải media...</p>
                       ) : errorMedia ? (
                           <p className="text-xs text-red-500">{errorMedia}</p>
                       ) : mediaMessages.length > 0 ? (
                           <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                               {mediaMessages.map(msg => (
                                   <a key={msg.id} href={msg.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="aspect-square bg-gray-100 rounded overflow-hidden hover:opacity-80">
                                      {msg.type === 'IMAGE' && msg.fileUrl && (
                                          <img src={msg.fileUrl} alt={msg.fileName || 'media'} className="w-full h-full object-cover"/>
                                      )}
                                       {msg.type === 'VIDEO' && (
                                           <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-xs p-1">
                                                <span>{msg.fileName || 'Video'}</span>
                                           </div>
                                       )}
                                   </a>
                               ))}
                           </div>
                       ) : (
                           <p className="text-xs text-gray-400 italic">Không có hình ảnh/video.</p>
                       )}
                     </div>

                     {/* Files Section */}
                     <div className="pb-4 border-b">
                       <h4 className="text-sm font-semibold text-gray-600 mb-2">
                          <FileTextIcon className="inline mr-1 mb-0.5" /> Files ({fileMessages.length})
                       </h4>
                       {isLoadingFiles ? (
                           <p className="text-xs text-gray-500 italic">Đang tải file...</p>
                       ) : errorFiles ? (
                            <p className="text-xs text-red-500">{errorFiles}</p>
                       ) : fileMessages.length > 0 ? (
                           <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {fileMessages.map(msg => (
                                  <li key={msg.id}>
                                      <a href={msg.fileUrl || '#'} target="_blank" rel="noopener noreferrer" download={msg.fileName || 'file'}
                                         className="flex items-center gap-2 text-xs text-blue-600 hover:underline p-1 hover:bg-gray-100 rounded">
                                          <FileTextIcon className="w-3 h-3 flex-shrink-0"/>
                                          <span className="truncate">{msg.fileName || 'Tài liệu không tên'}</span>
                                      </a>
                                  </li>
                              ))}
                           </ul>
                       ) : (
                           <p className="text-xs text-gray-400 italic">Không có file nào.</p>
                       )}
                     </div>

                     {/* Audio Section */}
                      <div className="pb-4 border-b">
                       <h4 className="text-sm font-semibold text-gray-600 mb-2">
                           <SpeakerLoudIcon className="inline mr-1 mb-0.5" /> Âm thanh ({audioMessages.length})
                       </h4>
                       {isLoadingAudio ? (
                            <p className="text-xs text-gray-500 italic">Đang tải âm thanh...</p>
                       ) : errorAudio ? (
                            <p className="text-xs text-red-500">{errorAudio}</p>
                       ) : audioMessages.length > 0 ? (
                           <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                               {audioMessages.map(msg => (
                                  <li key={msg.id}>
                                       <a href={msg.fileUrl || '#'} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-2 text-xs text-blue-600 hover:underline p-1 hover:bg-gray-100 rounded">
                                          <SpeakerLoudIcon className="w-3 h-3 flex-shrink-0"/>
                                           <span className="truncate">{msg.fileName || 'Audio không tên'}</span>
                                       </a>
                                   </li>
                               ))}
                           </ul>
                       ) : (
                            <p className="text-xs text-gray-400 italic">Không có file âm thanh.</p>
                       )}
                     </div>

                     {/* Actions Section */}
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