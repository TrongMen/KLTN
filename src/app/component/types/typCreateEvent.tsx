// src/app/types/appTypes.ts

// User type used by the application, potentially from authentication context
export type User = {
  id: string;
  username?: string | null;
  email?: string | null;
  // Add other properties your MainUserType might have
  role?: string; // Example: 'ADMIN', 'USER'
};

export interface UserRoleDetail { // Hoặc một tên phù hợp khác
  name: string;
  description?: string;

}
export type ApiUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  email?: string;
  role?: string; // User's general role in the system
  position?: { id: string; name: string } | null; // User's position in a club/org
  organizerRole?: { id: string; name: string } | null; // User's predefined role for event organization (from profile)
 
  dob?: string;
  avatar?: string;
  gender?: boolean;
};

// Role for event organization or participation
export type ApiRole = {
  id: string;
  name: string;
  description?: string;
};

// Position of a user in an organization/club
export type ApiPosition = {
  id: string;
  name: string;
  description?: string;
};

// Member of an event (organizer or participant)
export type EventMember = {
  userId: string;
  roleId?: string;       // Event-specific Role ID (e.g., Organizer Role ID, Participant Role ID)
  positionId?: string;   // User's Position ID at the time of adding
  roleName?: string;     // Event-specific Role Name
  positionName?: string; // User's Position Name
};

// Main Event type
export type Event = {
  id: string;
  name: string;
  purpose: string;
  time: string; // Should be ISO string or Date object, handle appropriately
  location: string;
  content: string;
  createdBy?: string; // User ID of the creator
  organizers: EventMember[];
  participants: EventMember[];
  status?: "PENDING" | "APPROVED" | "REJECTED";
  image?: string; // URL or path to a general event image
  avatarUrl?: string | null; // URL to event's specific avatar/poster
  attendees?: any[]; // Consider a more specific type if structure is known
  rejectionReason?: string | null;
  createdAt?: string; // Should be ISO string or Date
  deleted?: boolean;
  deletedAt?: string | null; // Should be ISO string or Date
  deletedBy?: string | null; // User ID
  progressStatus?: string;
  qrCodeUrl?: string | null;
  maxAttendees?: number | null;
};

// Types for data structures passed between components or to/from API for specific sections
export type OrganizerData = { userId: string; roleId: string; positionId: string };
export type ParticipantData = { userId: string; roleId: string; positionId: string };



// User chi tiết, bao gồm cả position
export interface DetailedApiUser extends User {
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  position?: ApiPosition | null;
  organizerRole?: ApiRole | null; 
  roles?: UserRoleDetail[];
}


export interface OrganizerParticipantInput {
  userId: string;
  roleId: string;
  positionId: string;
  name?: string;
  roleName?: string;

}

// Type cho dữ liệu sự kiện nhận từ API hoặc để điền form khi edit
export interface EventDataForForm {
  id: string; // Bắt buộc khi edit
  name: string;
  purpose: string;
  time: string; // Sẽ cần xử lý định dạng giữa API (ISO) và input (datetime-local)
  location: string;
  content: string;
  organizers: OrganizerParticipantInput[];
  participants: OrganizerParticipantInput[];
  maxAttendees: number | null ; 
  status?: "PENDING" | "APPROVED" | "REJECTED"; // Trạng thái của sự kiện
  createdBy?: string;
  // Thêm các trường khác nếu API trả về và bạn muốn hiển thị/sử dụng
  // attendees?: any[]; // Giữ nguyên như hiện tại
  avatarUrl?: string | null;
}