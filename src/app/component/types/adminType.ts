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
  maxAttendees?: number | null ;
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

export interface ApiUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  dob?: string | null; // Ngày sinh
  roles?: { id?: string; name: string; description?: string; permissions?: any[] }[];
  avatar?: string | null;
  email?: string;
  gender?: boolean | null;
  position?: { id: string; name: string } | null;
  organizerRole?: { id: string; name: string } | null;
  locked?: boolean;
  lockedAt?: string | null;
  lockedBy?: string | null;
  lockReason?: string | null;
  qrCodeUrl?: string | null;
  joinedDate?: string | null;
}

interface OrganizerInfo {
  userId: string;
  roleName?: string;
  positionName?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  resolvedName?: string;
}

interface ParticipantInfo {
  userId: string;
  roleId?: string;
  roleName?: string;
  positionName?: string;
  fullName?: string;
  lastName?: string;
  firstName?: string;
  resolvedName?: string;
}


export interface PersonDetail {
  id: string;           
  userId: string;       
  name?: string;         
  username?: string;
  firstName?: string;
  lastName?: string;
  profilePositionName?: string; 
  profileRoleName?: string;     
  eventSpecificRoleName?: string;
  eventSpecificPositionName?: string;
}