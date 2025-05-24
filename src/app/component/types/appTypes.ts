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
  joinedDate?: string;
}
export type EventMember = {
  userId: string;
  roleId?: string;       
  positionId?: string;   
  roleName?: string;    
  positionName?: string; 
};
export type Event = {
  id: string;
  name: string;
  purpose: string;
  time: string;
  location: string;
  content: string;
  createdBy?: string;
  organizers: EventMember[];
  participants: EventMember[];
  status?: "PENDING" | "APPROVED" | "REJECTED";
  image?: string; 
  avatarUrl?: string | null;
  attendees?: any[]; 
  rejectionReason?: string | null;
  createdAt?: string; 
  deleted?: boolean;
  deletedAt?: string | null; 
  deletedBy?: string | null; 
  progressStatus?: "UPCOMING" | "ONGOING" | "COMPLETED" | string;

  qrCodeUrl?: string | null;
  maxAttendees?: number | null;
  
};

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
  progressStatus?: "UPCOMING" | "ONGOING" | "COMPLETED" | string;
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
  progressStatus?: "UPCOMING" | "ONGOING" | "COMPLETED" | string;

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
  maxAttendees?: number|null ;
  progressStatus?: "UPCOMING" | "ONGOING" | "COMPLETED" | string;
  
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
  maxAttendees?: number | null;
}

//////////////////////////////////



export type DetailUser = {
  id: string;
  username?: string | null;
  email?: string | null;
  role?: string; 
};

export interface UserRoleDetail { 
  name: string;
  description?: string;

}


export type ApiRole = {
  id: string;
  name: string;
  description?: string;
};
export type ApiPosition = {
  id: string;
  name: string;
  description?: string;
};

export interface DetailedApiUser extends DetailUser {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  position?: ApiPosition | null;
  organizerRole?: ApiRole | null; 
  roles?: UserRoleDetail[];
}

export interface OrganizerInput {
  userId: string;
  roleId: string;
  positionId: string;
  name?: string;
  roleName?: string;
}

export interface ParticipantInput {
  
  userId: string;
  roleId: string;
  positionId: string;
  name?: string;
  roleName?: string;

}


export interface EventDataForForm {
  id: string; 
  name: string;
  purpose: string;
  time: string; 
  location: string;
  content: string;
  organizers: OrganizerInput[];
  participants: ParticipantInput[];
  status?: "PENDING" | "APPROVED" | "REJECTED"; 
  createdBy?: string; 
  avatarUrl?: string | null;
   maxAttendees: number | null ; 
  progressStatus?: "UPCOMING" | "ONGOING" | "COMPLETED" | string;

}

