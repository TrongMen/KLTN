import { User as MainUserType, Role } from '../../types/appTypes';

export type { MainUserType, Role };

export interface Participant {
 id: string | number;
 name: string;
 avatar?: string;
}

export interface MainConversationType {
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

export interface Message {
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
 groupId: string;
}

export interface ApiUserDetail extends MainUserType {
}


export interface ApiGroupChatListItem {
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
 avatarUrl?: string | null;
}

export interface ApiGroupChatDetail {
 id: string;
 name: string;
 eventId: string | null;
 groupLeaderId: string | null;
 memberIds: string[];
 status: string | null;
 avatarUrl?: string | null;
}

export interface ChatMessageNotificationPayload {
 groupId: string;
 groupName: string;
 senderId: string;
 senderName: string;
 messageContentPreview: string;
 actualMessageContent: string | null;
 messageType?: "TEXT" | "FILE" | "IMAGE" | "VIDEO" | "AUDIO";
 fileName?: string | null;
 fileUrl?: string;
 fileSize?: number;
 messageId: string;
 sentAt: string;
}

export interface ChatTabContentPropsFromUserHome {
 currentUser: MainUserType | null;
 globalChatMessagePayload?: ChatMessageNotificationPayload | null;
 conversations: MainConversationType[];
 isLoadingConversations: boolean;
 errorConversations: string | null;
 fetchConversations: () => Promise<void>;
 setConversations: React.Dispatch<React.SetStateAction<MainConversationType[]>>;
 selectedConversation: MainConversationType | null;
 setSelectedConversation: React.Dispatch<React.SetStateAction<MainConversationType | null>>;
 isLoadingDetails: boolean;
 fetchGroupChatDetails: (groupId: string) => Promise<void>;
 messages: Message[];
 isLoadingMessages: boolean;
 errorMessages: string | null;
 fetchMessages: (groupId: string) => Promise<void>;
 setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
 mediaMessages: Message[];
 fileMessages: Message[];
 audioMessages: Message[];
 isLoadingMedia: boolean;
 isLoadingFiles: boolean;
 isLoadingAudio: boolean;
 errorMedia: string | null;
 errorFiles: string | null;
 errorAudio: string | null;
 fetchMediaMessages: (groupId: string) => Promise<void>;
 fetchFileMessages: (groupId: string) => Promise<void>;
 fetchAudioMessages: (groupId: string) => Promise<void>;
 setMediaMessages: React.Dispatch<React.SetStateAction<Message[]>>;
 setFileMessages: React.Dispatch<React.SetStateAction<Message[]>>;
 setAudioMessages: React.Dispatch<React.SetStateAction<Message[]>>;
 userCache: Record<string, ApiUserDetail>;
 fetchUserDetailsWithCache: (userId: string, token: string | null) => Promise<ApiUserDetail | null>;
 getDisplayName: (userDetail: ApiUserDetail | Participant | null, fallbackName?: string) => string;
 handleRemoveMember: (groupId: string | number, memberId: string, leaderId: string) => Promise<void>;
 handleLeaveGroup: (groupId: string | number, memberId: string) => Promise<void>;
 handleSendMessageAPI: (groupId: string, senderId: string, messageText: string, tempMessageId: string) => Promise<Message | null>;
 handleSendFileAPI: (groupId: string, senderId: string, file: File) => Promise<Message | null>;
 handleDeleteMessageAPI: (messageId: string, userId: string, currentGroupId: string | number) => Promise<boolean>;
 handleDownloadFileAPI: (messageId: string, fileName?: string | null) => Promise<void>;
 handleDisbandGroupAPI: (groupId: string, leaderId: string) => Promise<void>; // << DÒNG NÀY ĐÃ ĐƯỢC THÊM
 isProcessingChatAction: boolean;
 downloadingFileId: string | null;
 setDownloadingFileId: React.Dispatch<React.SetStateAction<string | null>>;
}