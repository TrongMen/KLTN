// src/app/types/typCreateEvent.ts

export type User = {
  id: string;
  username?: string | null;
  email?: string | null;
  role?: string; 
};

export interface UserRoleDetail { 
  name: string;
  description?: string;

}
export type ApiUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email?: string;
  role?: string;
  position?: { id: string; name: string } | null; 
  organizerRole?: { id: string; name: string } | null; 
 
  dob?: string;
  avatar?: string;
  gender?: boolean;
};





export type ApiPosition = {
  id: string;
  name: string;
  description?: string;
};

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
  progressStatus?: string;
  qrCodeUrl?: string | null;
  maxAttendees?: number | null;
};


export type OrganizerData = { userId: string; roleId: string; positionId: string };
export type ParticipantData = { userId: string; roleId: string; positionId: string };






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


export type ApiRole = {
  id: string;
  name: string;
  description?: string;
};

export interface DetailedApiUser extends User {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  position?: ApiPosition | null;
  organizerRole?: ApiRole | null; 
  roles?: UserRoleDetail[];
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
}