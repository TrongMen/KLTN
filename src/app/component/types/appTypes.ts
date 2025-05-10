// src/types/appTypes.ts

export interface Role {
  name: string;
  description?: string;
  permissions?: any[];
}

export interface User {
  id: string;
  roles?: Role[];
  firstName?: string;
  lastName?: string;
  username?: string;
  dob?: string;
  avatar?: string;
  email?: string;
  gender?: boolean;
}

export interface EventDisplayInfo {
  id: string;
  title: string;
  name?: string;
  date: string;
  time?: string;
  location: string;
  description: string;
  content?: string;
  purpose?: string;
  speaker?: string;
  image?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  createdBy?: string;
  organizers?: OrganizerInfo[];
  participants?: ParticipantInfo[];
  attendees?: {
    userId: string;
    fullName?: string;
    studentCode?: string;
    checkedInAt?: string | null;
    attending?: boolean;
  }[];
  maxAttendees?: number | null;
  currentAttendeesCount?: number;
}

export interface EventDisplayInfoGuest {
  id: string;
  title: string;
  name: string;
  date: string;
  time?: string;
  location: string;
  description: string;
  content?: string;
  purpose?: string;
  speaker?: string;
  image?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | string;
  createdBy?: string;
  organizers?: PersonDetail[];
  participants?: PersonDetail[];
  attendees?: {
    userId: string;
    fullName?: string;
    studentCode?: string;
    checkedInAt?: string | null;
    attending?: boolean;
  }[];
  maxAttendees?: number | null;
  currentAttendeesCount?: number;
}

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  date?: string;
  createdAt?: string;
  publishedAt?: string | null;
  imageUrl?: string;
  content?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  createdBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
  };
  event?: { id: string; name?: string } | null;
  coverImageUrl?: string;
  rejectionReason?: string | null;
}

export interface Participant {
  id: string | number;
  name: string;
  avatar?: string;
}
export interface Conversation {
  id: number | string;
  name: string;
  isGroup: boolean;
  participants?: Participant[];
  message: string;
  avatar?: string;
}


export interface EventInfo {
  id: string;
  name: string;
  time?: string;
  location?: string;
  description?: string;
  content?: string;
  status?: string;
  purpose?: string;
  createdBy?: string;
  createdAt?: string;
  attendees?: any[];
  organizers?: any[];
  participants?: any[];
  permissions?: string[];
  rejectionReason?: string | null;
  avatarUrl?: string | null;
}

export interface Attendee {
  id?: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roleName?: string;
  positionName?: string;
  attending?: boolean;
  studentCode?: string;
  avatar?: string | null;
}


interface OrganizerInfo {
  userId: string;
  roleName?: string;
  positionName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

interface ParticipantInfo {
  userId: string;
  roleId?: string;
  roleName?: string;
  positionName?: string;
  fullName?: string;
  lastName?: string;
  firstName?: string;
}


export interface PersonDetail {
  id: string;           // ID chính của người dùng từ API /users (ví dụ: FetchedPersonAPIResponse.id)
  userId: string;       // userId gốc từ danh sách organizers/participants, đảm bảo là string
  name?: string;         // Tên hiển thị đầy đủ (ví dụ: "Hồ Trọng Mến")
  username?: string;
  firstName?: string;
  lastName?: string;
  
  // Vị trí/vai trò CHUNG của người dùng từ profile của họ (qua fetchPersonDetailAPI)
  profilePositionName?: string; 
  profileRoleName?: string;     

  // Vị trí/vai trò CỤ THỂ của người này TRONG SỰ KIỆN ĐANG XEM
  // (Lấy từ initialInfo trong enrichPeopleArray, tức là từ BackendOrganizerOrParticipant)
  eventSpecificRoleName?: string;
  eventSpecificPositionName?: string;
}