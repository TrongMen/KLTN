
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { io, Socket } from "socket.io-client";

import {
  MainConversationType,
  Message,
  ApiUserDetail,
  ChatTabContentPropsFromUserHome,
  Participant,
  ChatMessageNotificationPayload,
} from "./chat/ChatTabContentTypes";
import GroupChatDetailView from "./chat/GroupChatDetailView";


const ChatTabContent: React.FC<ChatTabContentPropsFromUserHome> = ({
  currentUser,
  globalChatMessagePayload,
  conversations,
  isLoadingConversations,
  errorConversations,
  fetchConversations: fetchConversationsFromUserHome,
  setConversations: setConversationsInUserHome,
  selectedConversation,
  setSelectedConversation: setSelectedConversationInUserHome,
  isLoadingDetails,
  fetchGroupChatDetails: fetchGroupChatDetailsFromUserHome,
  messages,
  isLoadingMessages,
  errorMessages,
  fetchMessages: fetchMessagesFromUserHome,
  setMessages: setMessagesInUserHome,
  mediaMessages,
  fileMessages,
  audioMessages,
  isLoadingMedia,
  isLoadingFiles,
  isLoadingAudio,
  errorMedia,
  errorFiles,
  errorAudio,
  fetchMediaMessages: fetchMediaMessagesFromUserHome,
  fetchFileMessages: fetchFileMessagesFromUserHome,
  fetchAudioMessages: fetchAudioMessagesFromUserHome,
  setMediaMessages,
  setFileMessages,
  setAudioMessages,
  userCache,
  fetchUserDetailsWithCache,
  getDisplayName,
  handleRemoveMember: handleRemoveMemberAPI,
  handleLeaveGroup: handleLeaveGroupAPI,
  handleSendMessageAPI,
  handleSendFileAPI,
  handleDeleteMessageAPI,
  handleDownloadFileAPI,
  isProcessingChatAction,
  downloadingFileId,
  setDownloadingFileId,
}) => {
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [participantSearchTerm, setParticipantSearchTerm] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
  const groupSocket = useRef<Socket | null>(null);

  // console.log("ChatTabContent rendered. Conversations count:", conversations.length, "Payload:", globalChatMessagePayload);


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

  useEffect(() => {
    if (currentUser?.id && viewMode === "list") {
        fetchConversationsFromUserHome();
    }
  }, [currentUser?.id, fetchConversationsFromUserHome, viewMode]);

  useEffect(() => {
    // console.log("ChatTabContent: globalChatMessagePayload EFFECT CHECK. Payload:", globalChatMessagePayload);
    if (globalChatMessagePayload && currentUser && setConversationsInUserHome && userCache && getDisplayName) {
      console.log("ChatTabContent: Processing globalChatMessagePayload:", globalChatMessagePayload);
      const {
        groupId,
        groupName,
        senderId,
        sentAt,
        messageContentPreview,
      } = globalChatMessagePayload;

      const newActivityMessageText = messageContentPreview || "Có tin nhắn mới";

      setConversationsInUserHome((prevList) => {
        // console.log(`ChatTabContent: Updating conversations list via setConversationsInUserHome. GroupID: ${groupId}. Previous list size: ${prevList.length}`);
        const existingConvoIndex = prevList.findIndex((c) => String(c.id) === String(groupId));
        let newList: MainConversationType[];

        let displaySenderName = globalChatMessagePayload.senderName;
        if (senderId === currentUser.id) {
          displaySenderName = "Bạn";
        } else {
          const cachedSender = userCache[senderId];
          displaySenderName = getDisplayName(cachedSender || null, globalChatMessagePayload.senderName);
        }

        if (existingConvoIndex !== -1) {
          // console.log(`ChatTabContent: Updating existing conversation for group ${groupId}`);
          const updatedConvo: MainConversationType = {
            ...prevList[existingConvoIndex],
            message: newActivityMessageText,
            sentAt: sentAt,
            name: groupName,
            lastMessageSenderId: senderId,
            lastMessageSenderName: displaySenderName,
          };
          newList = prevList.filter((_, index) => index !== existingConvoIndex);
          newList.unshift(updatedConvo);
        } else {
          // console.log(`ChatTabContent: Adding new conversation for group ${groupId}`);
          const newConversation: MainConversationType = {
            id: groupId,
            name: groupName,
            isGroup: true,
            message: newActivityMessageText,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              groupName
            )}&background=random&font-size=0.4`,
            participants: [],
            groupLeaderId: null,
            sentAt: sentAt,
            lastMessageSenderId: senderId,
            lastMessageSenderName: displaySenderName,
          };
          newList = [newConversation, ...prevList];
        }
        
        const sortedList = newList.sort(
          (a, b) =>
            (new Date(b.sentAt || 0).getTime()) - (new Date(a.sentAt || 0).getTime())
        );
        // console.log(`ChatTabContent: New sorted list for conversations. New list size: ${sortedList.length}. First item message: ${sortedList[0]?.message}`);
        return sortedList;
      });
    }
  }, [globalChatMessagePayload, currentUser, setConversationsInUserHome, userCache, getDisplayName]);

  useEffect(() => {
    if (
      selectedConversation?.participants &&
      selectedConversation.participants.length > 0 &&
      messages.length > 0 &&
      viewMode === "detail" &&
      currentUser &&
      getDisplayName
    ) {
      const messagesNeedNameUpdate = messages.some(
        (msg) => (!msg.senderName || !msg.senderName.includes(" ") || msg.senderName.startsWith("User (")) && msg.senderId !== currentUser?.id
      );

      if (messagesNeedNameUpdate) {
        setMessagesInUserHome((currentMessages) =>
          currentMessages.map((msg) => {
            if (msg.senderId === currentUser?.id) {
              return { ...msg, senderName: "Bạn" };
            }
            if (msg.senderName && msg.senderName.includes(" ") && !msg.senderName.startsWith("User (")) {
              return msg;
            }
            const participantInfo = selectedConversation.participants?.find(
              (p) => p.id === msg.senderId
            );
            return { ...msg, senderName: getDisplayName(participantInfo || null, msg.senderName || `User (${String(msg.senderId).substring(0,4)})`) };
          })
        );
      }
    }
  }, [selectedConversation?.participants, messages, currentUser, viewMode, getDisplayName, setMessagesInUserHome]);

  const handleGoBackToList = useCallback(() => {
    setViewMode("list");
    setSelectedConversationInUserHome(null);
    if (groupSocket.current) {
      groupSocket.current.disconnect();
      groupSocket.current = null;
    }
  }, [setSelectedConversationInUserHome]);

  useEffect(() => {
    if (
      selectedConversation?.isGroup &&
      typeof selectedConversation.id === "string" &&
      viewMode === "detail" &&
      currentUser
    ) {
      const groupId = selectedConversation.id;
      const SOCKET_URL = `${process.env.NEXT_PUBLIC_SOCKET_URL}`;

      if (
        groupSocket.current?.connected &&
        groupSocket.current.io.opts.query?.groupId === groupId
      ) {
      } else {
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

      const handleConnect = () => {};
      const handleDisconnect = (reason: Socket.DisconnectReason) => {
        if (reason !== "io client disconnect" && viewMode === "detail" && selectedConversation?.id === groupId) {
        }
      };
      const handleConnectError = (error: Error) => {
         if (viewMode === "detail" && selectedConversation?.id === groupId) {
           toast.error(`Chat lỗi kết nối: ${error.message}`);
         }
      };

      const handleNewMessage = async (newMessage: Message) => {
        // console.log(`ChatTabContent: GroupSocket received new_message for group ${groupId}`, newMessage);
        if (selectedConversation?.id === groupId && currentUser && userCache && getDisplayName && fetchUserDetailsWithCache) {
          let finalMessage = { ...newMessage };
          if (newMessage.senderId === currentUser.id) {
            finalMessage.senderName = "Bạn";
          } else {
            let senderDetailToUse: ApiUserDetail | Participant | null = null;

            if (userCache[newMessage.senderId]) {
                senderDetailToUse = userCache[newMessage.senderId];
            } else {
                const foundParticipant = selectedConversation.participants?.find(p => p.id === newMessage.senderId) || null;
                if (foundParticipant) {
                    senderDetailToUse = foundParticipant;
                }
            }

            if (senderDetailToUse) {
               finalMessage.senderName = getDisplayName(senderDetailToUse, newMessage.senderName);
            } else {
               const fetchedDetail = await fetchUserDetailsWithCache(newMessage.senderId, localStorage.getItem("authToken"));
               finalMessage.senderName = getDisplayName(fetchedDetail, newMessage.senderName || `User (${String(newMessage.senderId).substring(0,4)})`);
            }
          }

          setMessagesInUserHome((prevMessages) => {
            if (prevMessages.some((m) => m.id === finalMessage.id)) return prevMessages;
            const updated = [...prevMessages, finalMessage];
            updated.sort(
              (a, b) =>
                new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
            );
            return updated;
          });

          setConversationsInUserHome((prevList) => {
            // console.log(`ChatTabContent: Updating conversations from groupSocket new_message. GroupID: ${groupId}`);
            const idx = prevList.findIndex((c) => String(c.id) === String(groupId));
            if (idx === -1) return prevList;

            const updatedConvo = {
              ...prevList[idx],
              message: newMessage.content ?? `Đã gửi: ${newMessage.fileName || "File"}`,
              sentAt: newMessage.sentAt,
              lastMessageSenderId: newMessage.senderId,
              lastMessageSenderName: finalMessage.senderName,
            };

            const newList = prevList.filter(c => String(c.id) !== String(groupId));
            newList.unshift(updatedConvo);
            return newList.sort(
                (a, b) =>
                  (new Date(b.sentAt || 0).getTime()) - (new Date(a.sentAt || 0).getTime())
              );
          });

          if (showInfoPanel) {
            if (newMessage.type === "IMAGE" || newMessage.type === "VIDEO") fetchMediaMessagesFromUserHome(groupId);
            else if (newMessage.type === "FILE") fetchFileMessagesFromUserHome(groupId);
            else if (newMessage.type === "AUDIO") fetchAudioMessagesFromUserHome(groupId);
          }
        }
      };

      const handleMessageDeleted = (data: { messageId: string }) => {
          // console.log(`ChatTabContent: GroupSocket received message_deleted for group ${groupId}`, data);
          if (data?.messageId && selectedConversation?.id === groupId && currentUser && userCache && getDisplayName) {
            let newLastMessageForPreview: Message | null = null;
            setMessagesInUserHome((prev) => {
                const remaining = prev.filter((m) => m.id !== data.messageId);
                if (remaining.length > 0) {
                    newLastMessageForPreview = remaining[remaining.length -1];
                }
                return remaining;
            });

            setConversationsInUserHome((prevList) => {
                // console.log(`ChatTabContent: Updating conversations from groupSocket message_deleted. GroupID: ${groupId}`);
                const idx = prevList.findIndex((c) => String(c.id) === groupId);
                if (idx === -1) return prevList;

                const participantFromList = newLastMessageForPreview ? selectedConversation.participants?.find(p => p.id === newLastMessageForPreview!.senderId) : undefined;
                const senderDetailForDisplayName: ApiUserDetail | Participant | null = newLastMessageForPreview
                    ? (userCache[newLastMessageForPreview.senderId] || participantFromList || null)
                    : null;

                const senderName = newLastMessageForPreview
                    ? (newLastMessageForPreview.senderId === currentUser.id ? "Bạn" : getDisplayName(senderDetailForDisplayName, newLastMessageForPreview.senderName))
                    : undefined;

                const updatedConvo = {
                    ...prevList[idx],
                    message: newLastMessageForPreview
                        ? (newLastMessageForPreview.content ?? `Đã gửi: ${newLastMessageForPreview.fileName || "File"}`)
                        : "Chưa có tin nhắn",
                    sentAt: newLastMessageForPreview?.sentAt,
                    lastMessageSenderId: newLastMessageForPreview?.senderId,
                    lastMessageSenderName: senderName,
                };
                const newList = prevList.filter(c => String(c.id) !== String(groupId));
                newList.unshift(updatedConvo);
                return newList.sort(
                    (a, b) =>
                      (new Date(b.sentAt || 0).getTime()) - (new Date(a.sentAt || 0).getTime())
                  );
            });

            if (showInfoPanel) {
                fetchMediaMessagesFromUserHome(groupId);
                fetchFileMessagesFromUserHome(groupId);
                fetchAudioMessagesFromUserHome(groupId);
            }
          }
      };

      const handleMemberRemoved = (data: { removedUserId?: string; groupId?: string }) => {
        if (data.groupId === groupId) {
          toast("Một thành viên đã bị xóa khỏi nhóm.");
          fetchGroupChatDetailsFromUserHome(groupId);
          if (currentUser && data.removedUserId === currentUser.id) {
            toast("Bạn đã bị xóa khỏi nhóm này!");
            handleGoBackToList();
          }
        } else if (data.groupId && data.removedUserId === currentUser?.id) {
          toast(`Bạn đã bị xóa khỏi nhóm ${data.groupId}.`);
          fetchConversationsFromUserHome();
        }
      };

      const handleMemberLeft = (data: { userId?: string; groupId?: string }) => {
            if (data.groupId === groupId) {
                toast("Một thành viên đã rời nhóm.");
                fetchGroupChatDetailsFromUserHome(groupId);
            } else if (data.groupId) {
                fetchConversationsFromUserHome();
            }
      };

      const handleGroupDeactivated = (data: { groupId?: string }) => {
            if (data.groupId === groupId) {
                const groupName = selectedConversation?.name || groupId;
                toast.error(`Nhóm "${groupName}" đã bị giải tán.`);
                handleGoBackToList();
            }
            setConversationsInUserHome((prev) => prev.filter((c) => String(c.id) !== data.groupId));
      };

      currentGroupSocket.on("connect", handleConnect);
      currentGroupSocket.on("disconnect", handleDisconnect);
      currentGroupSocket.on("connect_error", handleConnectError);
      currentGroupSocket.on("new_message", handleNewMessage);
      currentGroupSocket.on("message_deleted", handleMessageDeleted);
      currentGroupSocket.on("member_removed", handleMemberRemoved);
      currentGroupSocket.on("member_left", handleMemberLeft);
      currentGroupSocket.on("group_deactivated", handleGroupDeactivated);

      return () => {
        if (currentGroupSocket) {
          currentGroupSocket.off("connect", handleConnect);
          currentGroupSocket.off("disconnect", handleDisconnect);
          currentGroupSocket.off("connect_error", handleConnectError);
          currentGroupSocket.off("new_message", handleNewMessage);
          currentGroupSocket.off("message_deleted", handleMessageDeleted);
          currentGroupSocket.off("member_removed", handleMemberRemoved);
          currentGroupSocket.off("member_left", handleMemberLeft);
          currentGroupSocket.off("group_deactivated", handleGroupDeactivated);
        }
      };
    } else {
      if (groupSocket.current) {
        groupSocket.current.disconnect();
        groupSocket.current = null;
      }
    }
  }, [
    selectedConversation,
    viewMode,
    currentUser,
    showInfoPanel,
    fetchMediaMessagesFromUserHome,
    fetchFileMessagesFromUserHome,
    fetchAudioMessagesFromUserHome,
    fetchGroupChatDetailsFromUserHome,
    handleGoBackToList,
    fetchConversationsFromUserHome,
    setMessagesInUserHome,
    setConversationsInUserHome,
    getDisplayName,
    userCache,
    fetchUserDetailsWithCache
  ]);

  const handleSelectConversation = useCallback(
    (conversation: MainConversationType) => {
      setViewMode("detail");
      setShowInfoPanel(false);
      setShowEmojiPicker(false);
      setMessageInput("");
      setParticipantSearchTerm("");
      setMessagesInUserHome([]);
      setMediaMessages([]);
      setFileMessages([]);
      setAudioMessages([]);

      if (groupSocket.current) {
        groupSocket.current.disconnect();
        groupSocket.current = null;
      }

      if (conversation.isGroup && typeof conversation.id === "string") {
        setSelectedConversationInUserHome({
          ...conversation,
          participants: conversation.participants?.length
            ? conversation.participants
            : [],
        });
        fetchGroupChatDetailsFromUserHome(conversation.id);
        fetchMessagesFromUserHome(conversation.id);
      } else {
        setSelectedConversationInUserHome(conversation);
      }
    },
    [fetchGroupChatDetailsFromUserHome, fetchMessagesFromUserHome, setSelectedConversationInUserHome, setMessagesInUserHome, setMediaMessages, setFileMessages, setAudioMessages]
  );

  const handleActualRemoveMember = async (gId: string | number, mId: string, lId: string) => {
    await handleRemoveMemberAPI(gId, mId, lId);
    setRemoveConfirmationState({ isOpen: false, memberToRemove: null, onConfirm: null, onCancel: () => {} });
  };

  const closeRemoveConfirmationDialog = useCallback(() => {
    setRemoveConfirmationState({ isOpen: false, memberToRemove: null, onConfirm: null, onCancel: () => {} });
  }, []);

  const confirmRemoveMember = (member: Participant) => {
    if (!selectedConversation || !currentUser || typeof selectedConversation.id !== "string") return;
    const gId = selectedConversation.id;
    const lId = currentUser.id;
    setRemoveConfirmationState({
      isOpen: true,
      memberToRemove: member,
      onConfirm: () => handleActualRemoveMember(gId, member.id as string, lId),
      onCancel: closeRemoveConfirmationDialog,
    });
  };

  const handleActualLeaveGroup = async (groupId: string | number, memberId: string) => {
    await handleLeaveGroupAPI(groupId, memberId);
     setLeaveConfirmationState({ isOpen: false, onConfirm: null, onCancel: () => {} });
     handleGoBackToList();
  };

  const closeLeaveConfirmationDialog = useCallback(() => {
    setLeaveConfirmationState({ isOpen: false, onConfirm: null, onCancel: () => {} });
  }, []);

  const confirmLeaveGroup = () => {
    if (!selectedConversation || !currentUser || typeof selectedConversation.id !== "string") return;
    const gId = selectedConversation.id;
    const mId = currentUser.id;
    setLeaveConfirmationState({
      isOpen: true,
      onConfirm: () => handleActualLeaveGroup(gId, mId),
      onCancel: closeLeaveConfirmationDialog,
    });
  };

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedConversation?.id || !currentUser?.id) {
      return;
    }
    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempMessageId,
      content: messageInput,
      senderId: currentUser.id,
      senderName: "Bạn",
      sentAt: new Date().toISOString(),
      type: "TEXT",
    };

    if (selectedConversation && selectedConversation.id) {
      setMessagesInUserHome(prev => [...prev, optimisticMessage].sort((a,b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()));
    }

    const msgToSend = messageInput;
    const currentSelectedGroupId = selectedConversation.id;
    const sId = currentUser.id;

    setMessageInput("");
    setShowEmojiPicker(false);

    const actualMessageFromServer = await handleSendMessageAPI(String(currentSelectedGroupId), sId, msgToSend, tempMessageId);

    if (actualMessageFromServer) {
        setMessagesInUserHome(prevMessages => {
            const messageExistsByActualId = prevMessages.some(m => m.id === actualMessageFromServer.id);
            if (messageExistsByActualId) {
                return prevMessages.filter(m => m.id !== tempMessageId)
                                     .sort((a,b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
            } else {
                return prevMessages.map(m => m.id === tempMessageId ? actualMessageFromServer : m)
                                     .sort((a,b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
            }
        });
    } else {
        if (currentSelectedGroupId) {
            setMessagesInUserHome(prev => prev.filter(m => m.id !== tempMessageId));
            setMessageInput(msgToSend);
        }
    }
  }, [messageInput, selectedConversation, currentUser, handleSendMessageAPI, setMessagesInUserHome]);


  const handleSendFile = useCallback(async (file: File) => {
    if (!file || !selectedConversation?.id || !currentUser?.id) return;
    const gId = String(selectedConversation.id);
    const sId = currentUser.id;
    
    await handleSendFileAPI(gId, sId, file);

  }, [selectedConversation, currentUser, handleSendFileAPI]);


  const handleActualDeleteMessage = async (messageId: string) => {
    if (!currentUser?.id || !selectedConversation?.id) return;
    await handleDeleteMessageAPI(messageId, currentUser.id, selectedConversation.id);
    setDeleteMessageConfirmationState({ isOpen: false, messageIdToDelete: null, onConfirm: null, onCancel: () => {} });
  };

  const confirmDeleteMessage = useCallback(
    (message: Message) => {
      if (!message || !currentUser || message.senderId !== currentUser.id) return;
      setDeleteMessageConfirmationState({
        isOpen: true,
        messageIdToDelete: message.id,
        onConfirm: () => handleActualDeleteMessage(message.id),
        onCancel: () => setDeleteMessageConfirmationState({ isOpen: false, messageIdToDelete: null, onConfirm: null, onCancel: () => {} }),
      });
    },
    [currentUser, handleDeleteMessageAPI]
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

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessageInput((p) => p + emojiData.emoji);
    inputRef.current?.focus();
  };

  const filteredConversations = useMemo(() => {
    // console.log("ChatTabContent: Recalculating filteredConversations. Source conversations count:", conversations.length);
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

  const getParticipantInfo = (conversationToDisplay: MainConversationType | null) => {
    if (!conversationToDisplay?.isGroup) return null;
    const participantCount = conversationToDisplay.participants?.length;

    if (isLoadingDetails && !participantCount && selectedConversation?.id === conversationToDisplay.id) {
      return (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          Đang tải thành viên...
        </p>
      );
    }
    if (!participantCount && conversationToDisplay.participants?.length === 0) {
      return (
        <p className="text-xs text-gray-500 truncate mt-0.5">
          (Chưa có thông tin thành viên)
        </p>
      );
    }
    const count = participantCount || 0;
    const namesToShow = (conversationToDisplay.participants ?? [])
      .slice(0, 3)
      .map((p) => p.name || `User (${String(p.id).substring(0, 4)})`)
      .join(", ");
    const remainingCount = count > 3 ? count - 3 : 0;
    return (
      <p
        className="text-xs text-gray-500 truncate mt-0.5 cursor-pointer hover:underline"
        onClick={(e) => {
          e.stopPropagation();
          if (selectedConversation?.id !== conversationToDisplay.id) {
             handleSelectConversation(conversationToDisplay);
          }
          setShowInfoPanel(true);
          setParticipantSearchTerm("");
          setActiveInfoTab("media");
          if (
            conversationToDisplay?.id &&
            typeof conversationToDisplay.id === "string"
          ) {
            if (!isLoadingMedia && mediaMessages.length === 0 && !errorMedia)
              fetchMediaMessagesFromUserHome(conversationToDisplay.id);
            if (!isLoadingFiles && fileMessages.length === 0 && !errorFiles)
              fetchFileMessagesFromUserHome(conversationToDisplay.id);
            if (!isLoadingAudio && audioMessages.length === 0 && !errorAudio)
              fetchAudioMessagesFromUserHome(conversationToDisplay.id);
          }
        }}
        title={`${count} thành viên`}
      >
        {count} thành viên{count > 0 ? ":" : ""} {namesToShow}
        {remainingCount > 0 && ` và ${remainingCount} người khác`}
      </p>
    );
  };

  const renderListView = () => {
    // console.log("ChatTabContent: renderListView is rendering. Filtered conversations count:", filteredConversations.length);
    return (
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
            {isLoadingConversations && conversations.length === 0 ? (
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
                    {conv.lastMessageSenderName && (
                        <span className="font-medium">
                        {`${conv.lastMessageSenderName}: `}
                        </span>
                    )}
                    {conv.message || "..."}
                    </p>
                </div>
                {conv.sentAt && (
                    <span className="text-xs text-gray-400 self-start flex-shrink-0 ml-2">
                    {new Date(conv.sentAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                    })}
                    </span>
                )}
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
  }


  return (
    <div className="flex flex-col h-180 bg-white rounded-lg shadow overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
        <h2 className="text-xl md:text-2xl font-bold text-purple-600">
          Danh sách Chat
        </h2>
      </div>
      <div className="flex-1 overflow-hidden border-t md:border-t-0 md:border-l">
        {viewMode === "list" ? (
          renderListView()
        ) : selectedConversation && currentUser ? (
          <GroupChatDetailView
            conversation={selectedConversation}
            currentUser={currentUser}
            showInfoPanel={showInfoPanel}
            setShowInfoPanel={setShowInfoPanel}
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            errorMessages={errorMessages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            participantSearchTerm={participantSearchTerm}
            setParticipantSearchTerm={setParticipantSearchTerm}
            handleGoBackToList={handleGoBackToList}
            getParticipantInfo={getParticipantInfo}
            fetchMediaMessages={fetchMediaMessagesFromUserHome}
            fetchFileMessages={fetchFileMessagesFromUserHome}
            fetchAudioMessages={fetchAudioMessagesFromUserHome}
            mediaMessages={mediaMessages}
            fileMessages={fileMessages}
            audioMessages={audioMessages}
            isLoadingMedia={isLoadingMedia}
            isLoadingFiles={isLoadingFiles}
            isLoadingAudio={isLoadingAudio}
            errorMedia={errorMedia}
            errorFiles={errorFiles}
            errorAudio={errorAudio}
            activeInfoTab={activeInfoTab}
            setActiveInfoTab={setActiveInfoTab}
            filteredParticipants={filteredParticipants}
            confirmRemoveMember={confirmRemoveMember}
            confirmLeaveGroup={confirmLeaveGroup}
            handleSendMessage={handleSendMessage}
            triggerFileInput={triggerFileInput}
            handleFileChange={handleFileChange}
            handleDownloadFile={handleDownloadFileAPI}
            downloadingFileId={downloadingFileId}
            confirmDeleteMessage={confirmDeleteMessage}
            showEmojiPicker={showEmojiPicker}
            setShowEmojiPicker={setShowEmojiPicker}
            onEmojiClick={onEmojiClick}
            inputRef={inputRef}
            fileInputRef={fileInputRef}
            emojiPickerRef={emojiPickerRef}
            emojiButtonRef={emojiButtonRef}
            messagesEndRef={messagesEndRef}
            isProcessingAction={isProcessingChatAction}
            isSendingMessage={isProcessingChatAction}
            isLoadingDetails={isLoadingDetails}
            removeConfirmationState={removeConfirmationState}
            leaveConfirmationState={leaveConfirmationState}
            deleteMessageConfirmationState={deleteMessageConfirmationState}
          />
        ) : (
          renderListView()
        )}
      </div>
    </div>
  );
};

export default ChatTabContent;