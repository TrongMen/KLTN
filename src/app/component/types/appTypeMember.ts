

export interface LockedByInfo {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
}

export interface Role { 
    id?: string;
    name: string;
    description?: string;
    permissions?: any[];
}

export interface Position {
    id: string;
    name: string;
}

export interface OrganizerRole {
    id: string;
    name: string;
}

export interface FullApiUser {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  avatar?: string | null;
  roles?: Role[];
  position?: Position | null;
  organizerRole?: OrganizerRole | null;
  locked: boolean;
  lockedAt?: string | null;
  lockReason?: string | null;
  lockedBy?: LockedByInfo | null;
  dob?: string | null;
  gender?: boolean | null;
  qrCodeUrl?: string | null;
  joinedDate?: string | null;
  userCode?: string;
  facultyId?: string;
  majorId?: string;
  status?: number; 
  violationNote?: string;
}


export interface User { // Ví dụ MainUserType của bạn
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string | null;
  username?: string;
  roles?: Role[];
}