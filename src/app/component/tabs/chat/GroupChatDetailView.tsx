"use client";

import React, { RefObject } from "react";
import {
  ChevronLeftIcon,
  Cross2Icon,
  InfoCircledIcon,
  PaperPlaneIcon,
  FaceIcon,
  Link2Icon,
  PersonIcon,
  TrashIcon,
  ExitIcon,
  FileTextIcon,
  ImageIcon,
  SpeakerLoudIcon,
  DownloadIcon,
  UpdateIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import ConfirmationDialog from "../../../../utils/ConfirmationDialog";
import { User as MainUserType, Participant } from "../../types/appTypes";
import { MainConversationType, Message } from "./ChatTabContentTypes";
import Image from 'next/image';

export interface GroupChatDetailViewProps {
  conversation: MainConversationType;
  currentUser: MainUserType | null;
  showInfoPanel: boolean;
  setShowInfoPanel: (show: boolean) => void;
  messages: Message[];
  isLoadingMessages: boolean;
  errorMessages: string | null;
  messageInput: string;
  setMessageInput: (input: string) => void;
  participantSearchTerm: string;
  setParticipantSearchTerm: (term: string) => void;
  handleGoBackToList: () => void;
  getParticipantInfo: (
    conversation: MainConversationType | null
  ) => React.ReactNode;
  fetchMediaMessages: (groupId: string) => Promise<void>;
  fetchFileMessages: (groupId: string) => Promise<void>;
  fetchAudioMessages: (groupId: string) => Promise<void>;
  mediaMessages: Message[];
  fileMessages: Message[];
  audioMessages: Message[];
  isLoadingMedia: boolean;
  isLoadingFiles: boolean;
  isLoadingAudio: boolean;
  errorMedia: string | null;
  errorFiles: string | null;
  errorAudio: string | null;
  activeInfoTab: "media" | "files" | "audio";
  setActiveInfoTab: (tab: "media" | "files" | "audio") => void;
  filteredParticipants: Participant[];
  confirmRemoveMember: (member: Participant) => void;
  confirmLeaveGroup: () => void;
  confirmDisbandGroup: () => void;
  handleSendMessage: () => Promise<void>;
  triggerFileInput: () => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownloadFile: (
    messageId: string,
    fileName?: string | null
  ) => Promise<void>;
  downloadingFileId: string | null;
  confirmDeleteMessage: (message: Message) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  onEmojiClick: (emojiData: EmojiClickData, event: MouseEvent) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  emojiPickerRef: RefObject<HTMLDivElement | null>;
  emojiButtonRef: RefObject<HTMLButtonElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  isProcessingAction: boolean;
  isSendingMessage: boolean;
  isLoadingDetails: boolean;
  removeConfirmationState: {
    isOpen: boolean;
    memberToRemove: Participant | null;
    onConfirm: (() => void) | null;
    onCancel: () => void;
  };
  leaveConfirmationState: {
    isOpen: boolean;
    onConfirm: (() => void) | null;
    onCancel: () => void;
  };
  disbandConfirmationState: {
    isOpen: boolean;
    onConfirm: (() => void) | null;
    onCancel: () => void;
  };
  deleteMessageConfirmationState: {
    isOpen: boolean;
    messageIdToDelete: string | null;
    onConfirm: (() => void) | null;
    onCancel: () => void;
  };
}

const GroupChatDetailView: React.FC<GroupChatDetailViewProps> = ({
  conversation,
  currentUser,
  showInfoPanel,
  setShowInfoPanel,
  messages,
  isLoadingMessages,
  errorMessages,
  messageInput,
  setMessageInput,
  participantSearchTerm,
  setParticipantSearchTerm,
  handleGoBackToList,
  getParticipantInfo,
  fetchMediaMessages,
  fetchFileMessages,
  fetchAudioMessages,
  mediaMessages,
  fileMessages,
  audioMessages,
  isLoadingMedia,
  isLoadingFiles,
  isLoadingAudio,
  errorMedia,
  errorFiles,
  errorAudio,
  activeInfoTab,
  setActiveInfoTab,
  filteredParticipants,
  confirmRemoveMember,
  confirmLeaveGroup,
  confirmDisbandGroup,
  handleSendMessage,
  triggerFileInput,
  handleFileChange,
  handleDownloadFile,
  downloadingFileId,
  confirmDeleteMessage,
  showEmojiPicker,
  setShowEmojiPicker,
  onEmojiClick,
  inputRef,
  fileInputRef,
  emojiPickerRef,
  emojiButtonRef,
  messagesEndRef,
  isProcessingAction,
  isSendingMessage,
  isLoadingDetails,
  removeConfirmationState,
  leaveConfirmationState,
  disbandConfirmationState,
  deleteMessageConfirmationState,
}) => {
  const isLeader =
    conversation.isGroup && currentUser?.id === conversation.groupLeaderId;

  const getParticipantDisplayName = (participant: Participant) => {
    const isCurrentUser = participant.id === currentUser?.id;
    const isGroupLeader = participant.id === conversation.groupLeaderId;
    let displayName =
      participant.name || `User (${String(participant.id).substring(0, 4)}...)`;
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

 const getFileIcon = (fileName?: string | null): React.ReactNode => {
  if (!fileName) return <FileTextIcon className="w-5 h-5 flex-shrink-0 text-gray-500" />;
  const extension = fileName.split('.').pop()?.toLowerCase();
  const imageIconSize = 100;
  const radixIconClasses = "w-5 h-5 flex-shrink-0";

  switch (extension) {
    case 'doc':
    case 'docx':
      return (
        <Image
          src="/icons/word.png" 
          alt="Word document icon"
          width={imageIconSize}
          height={imageIconSize}
          className="flex-shrink-0 object-contain"
        />
      );
    case 'xls':
    case 'xlsx':
      return (
        <Image
          src="/icons/excel.jpg" 
          alt="Excel spreadsheet icon"
          width={imageIconSize}
          height={imageIconSize}
          className="flex-shrink-0 object-contain"
        />
      );
    case 'ppt':
    case 'pptx':
      return (
        <Image
          src="/icons/pp.jpg" 
          alt="PowerPoint presentation icon"
          width={imageIconSize}
          height={imageIconSize}
          className="flex-shrink-0 object-contain"
        />
      );
    case 'pdf':
      return (
        <Image
          src="/icons/pdf.png" 
          alt="PDF document icon"
          width={imageIconSize}
          height={imageIconSize}
          className="flex-shrink-0 object-contain"
        />
      );
    case 'txt': 
      return (
        <Image
          src="/icons/txt.png" // 
          alt="Text document icon"
          width={imageIconSize}
          height={imageIconSize}
          className="flex-shrink-0 object-contain"
        />
      );
    case 'zip':
    case 'rar':
      return <FileTextIcon className={`${radixIconClasses} text-purple-600`} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'bmp':
    case 'webp':
      return <ImageIcon className={`${radixIconClasses} text-indigo-600`} />;
    default:
      return <FileTextIcon className={`${radixIconClasses} text-gray-500`} />;
  }
};

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative h-150">
      <div className="flex justify-between items-center p-3 md:p-4 border-b bg-gray-50 flex-shrink-0">
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
                setActiveInfoTab("media");
                if (
                  !showInfoPanel &&
                  conversation?.id &&
                  typeof conversation.id === "string"
                ) {
                  setShowEmojiPicker(false);
                  if (
                    !isLoadingMedia &&
                    mediaMessages.length === 0 &&
                    !errorMedia
                  )
                    fetchMediaMessages(conversation.id);
                  if (
                    !isLoadingFiles &&
                    fileMessages.length === 0 &&
                    !errorFiles
                  )
                    fetchFileMessages(conversation.id);
                  if (
                    !isLoadingAudio &&
                    audioMessages.length === 0 &&
                    !errorAudio
                  )
                    fetchAudioMessages(conversation.id);
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
            {isLoadingMessages && messages.length === 0 && (
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
              messages
                .filter(msg => msg.content !== "Tin nhắn đã bị xóa")
                .map((msg) => (
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
                        conversation?.participants?.find(
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
                          {msg.senderName || "Unknown User"}
                        </span>
                      )}
                    {msg.type === "TEXT" && (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                    )}
                    {msg.type === "IMAGE" && msg.fileUrl && (
                       <div className="relative group/image">
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
                         <button
                           onClick={() =>
                             handleDownloadFile(msg.id, msg.fileName)
                           }
                           disabled={downloadingFileId === msg.id}
                           aria-label={`Tải ${msg.fileName || "ảnh"}`}
                           className={`absolute top-1 right-1 cursor-pointer bg-black/50 text-white p-1 rounded-full hover:bg-black/75 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-wait`}
                         >
                           {downloadingFileId === msg.id ? (
                             <UpdateIcon className="w-4 h-4 animate-spin" />
                           ) : (
                             <DownloadIcon className="w-4 h-4" />
                           )}
                         </button>
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
                        {downloadingFileId === msg.id ? (
                          <UpdateIcon className="w-5 h-5 flex-shrink-0 animate-spin" />
                        ) : (
                          getFileIcon(msg.fileName)
                        )}
                        <span className="text-sm font-medium truncate">
                          {msg.fileName || "Tệp đính kèm"}
                        </span>
                      </button>
                    )}
                    {msg.type === "VIDEO" && msg.fileUrl && (
                      <div className="relative group/video">
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={msg.fileName || "Xem video"}
                          className="block aspect-video max-w-xs bg-black rounded overflow-hidden"
                        >
                          <video
                            src={msg.fileUrl}
                            className="w-full h-full object-contain"
                            controls={false}
                          />
                        </a>
                         <button
                           onClick={() =>
                             handleDownloadFile(msg.id, msg.fileName)
                           }
                           disabled={downloadingFileId === msg.id}
                           aria-label={`Tải ${msg.fileName || "video"}`}
                           className={`absolute top-1 right-1 cursor-pointer bg-black/50 text-white p-1 rounded-full hover:bg-black/75 transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-wait`}
                         >
                           {downloadingFileId === msg.id ? (
                             <UpdateIcon className="w-4 h-4 animate-spin" />
                           ) : (
                             <DownloadIcon className="w-4 h-4" />
                           )}
                         </button>
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
          <div className="p-3 md:p-4 border-t bg-gray-50 flex-shrink-0 relative">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
              />
              <button
                onClick={triggerFileInput}
                disabled={isSendingMessage}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer disabled:opacity-50"
                aria-label="Đính kèm file"
              >
                <Link2Icon width="20" height="20" />
              </button>
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
              />
              <button
                ref={emojiButtonRef}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-200 rounded-full cursor-pointer"
                aria-label="Chọn emoji"
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
        </div>
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
              {isLoadingDetails && !conversation.participants?.length ? (
                <div className="flex justify-center items-center py-10 text-gray-500">
                  <span className="animate-spin mr-2">⏳</span> Đang tải chi
                  tiết...
                </div>
              ) : (
                <>
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
                                    p.name || "?"
                                  )}&background=random&size=32`
                                }
                                alt={p.name || "Participant"}
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
                          {participantSearchTerm
                            ? "Không tìm thấy thành viên."
                            : "(Chưa có thành viên nào)"}
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="flex flex-col flex-1 min-h-0">
                    <div className="border-b border-gray-200 flex-shrink-0">
                      <nav
                        className="-mb-px flex space-x-4"
                        aria-label="Tabs"
                      >
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
                          <ImageIcon className="h-4 w-4" /> Media (
                          {isLoadingMedia ? "..." : mediaMessages.length})
                        </button>
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
                          <FileTextIcon className="h-4 w-4" /> Files (
                          {isLoadingFiles ? "..." : fileMessages.length})
                        </button>
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
                          <SpeakerLoudIcon className="h-4 w-4" /> Âm thanh (
                          {isLoadingAudio ? "..." : audioMessages.length})
                        </button>
                      </nav>
                    </div>
                    <div className="pt-4 flex-1 overflow-y-auto">
                      {activeInfoTab === "media" && (
                        <div className="space-y-2">
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
                                  {m.type === "IMAGE" && m.fileUrl && (
                                    <img
                                      src={m.fileUrl}
                                      alt={m.fileName || "media"}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  {m.type === "VIDEO" && (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-xs p-1">
                                      <svg
                                        className="w-6 h-6 text-gray-300"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path d="M2.94 15.06a.5.5 0 0 0 .7.7L7.5 12.07V14a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-1.93l3.86 3.69a.5.5 0 0 0 .7-.7L12.93 10l3.63-3.63a.5.5 0 0 0-.7-.7L12 9.93V8a.5.5 0 0 0-.5-.5h-4A.5.5 0 0 0 7 8v1.93L3.14 6.37a.5.5 0 0 0-.7.7L6.07 10 2.44 13.63z"></path>
                                      </svg>
                                    </div>
                                  )}
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
                                    {downloadingFileId === m.id ? (
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
                              Không có media.
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
                              {fileMessages.map((m) => (
                                <li key={m.id}>
                                  <button
                                    onClick={() =>
                                      handleDownloadFile(m.id, m.fileName)
                                    }
                                    disabled={downloadingFileId === m.id}
                                    className="flex w-full items-center cursor-pointer gap-2 text-xs text-blue-600 hover:underline p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-wait"
                                  >
                                    {downloadingFileId === m.id ? (
                                      <UpdateIcon className="w-3 h-3 flex-shrink-0 animate-spin" />
                                    ) : (
                                      <DownloadIcon className="w-3 h-3 flex-shrink-0" />
                                    )}
                                    <span className="truncate text-left">
                                      {m.fileName ||
                                        "Tài liệu không tên"}
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
                              {audioMessages.map((m) => (
                                <li key={m.id}>
                                  <button
                                    onClick={() =>
                                      handleDownloadFile(m.id, m.fileName)
                                    }
                                    disabled={downloadingFileId === m.id}
                                    className="flex w-full items-center cursor-pointer gap-2 text-xs text-blue-600 hover:underline p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-wait"
                                  >
                                    {downloadingFileId === m.id ? (
                                      <UpdateIcon className="w-3 h-3 flex-shrink-0 animate-spin" />
                                    ) : (
                                      <DownloadIcon className="w-3 h-3 flex-shrink-0" />
                                    )}
                                    <span className="truncate text-left">
                                      {m.fileName || "Audio không tên"}
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
                  </div>
                  <div className="mt-auto pt-4">
                    {conversation.isGroup && currentUser && (
                        <>
                            {isLeader ? (
                                <button
                                    onClick={confirmDisbandGroup}
                                    disabled={isProcessingAction}
                                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded border border-red-700 font-medium mb-3 cursor-pointer disabled:opacity-50"
                                >
                                    <TrashIcon /> Giải tán nhóm
                                </button>
                            ) : (
                                <button
                                    onClick={confirmLeaveGroup}
                                    disabled={isProcessingAction}
                                    className="w-full flex items-center justify-center gap-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-200 font-medium mb-3 cursor-pointer disabled:opacity-50"
                                >
                                    <ExitIcon /> Rời khỏi nhóm
                                </button>
                            )}
                        </>
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
            <strong>
              {removeConfirmationState.memberToRemove?.name}
            </strong>{" "}
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
        isOpen={disbandConfirmationState.isOpen}
        title="Xác nhận giải tán nhóm"
        message={<>Bạn có chắc chắn muốn giải tán nhóm chat <strong>"{conversation.name}"</strong> không? <br/> Hành động này không thể hoàn tác và sẽ xóa toàn bộ lịch sử chat.</>}
        confirmText="Giải tán nhóm"
        cancelText="Hủy bỏ"
        confirmVariant="danger"
        onConfirm={disbandConfirmationState.onConfirm || (() => {})}
        onCancel={disbandConfirmationState.onCancel}
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

export default GroupChatDetailView;