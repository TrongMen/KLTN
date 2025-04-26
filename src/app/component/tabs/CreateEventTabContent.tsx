"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { BTCSection, type BTCSectionHandle } from "../BTCSection"; // Adjust path
import {
  ParticipantSection,
  type ParticipantSectionHandle,
} from "../ParticipantSection"; // Adjust path
import EventList from "../ListEvenUser"; // Adjust path, ensure it's exported correctly
import { User as MainUserType } from "../homeuser"; // User type from UserHome

// --- START: Định nghĩa Types (Copied/Adapted from EventManagementPage) ---
export type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  role?: string;
};
export type ApiRole = { id: string; name: string };
export type ApiPosition = { id: string; name: string };

// Kiểu EventMember dùng khi GET và trong List
export type EventMember = {
  userId: string;
  roleId?: string;
  positionId?: string;
  roleName?: string;
  positionName?: string;
};

// Kiểu Event chính, dùng cho state và props EventList
export type Event = {
  id?: string;
  name: string;
  purpose: string;
  time: string; // String for form input, ensure conversion if needed
  location: string;
  content: string;
  createdBy?: string;
  organizers: EventMember[]; // API GET might return this structure with names
  participants: EventMember[]; // API GET might return this structure with names
  permissions: string[];
  status?: "PENDING" | "APPROVED" | "REJECTED";
  image?: string;
  attendees?: any[];
  rejectionReason?: string | null;
  createdAt?: string;
};

// Kiểu EventMemberInput dùng khi POST/PUT
export type EventMemberInput = {
  userId: string;
  roleId: string;
  positionId: string;
};
// --- END: Định nghĩa Types ---

// State khởi tạo dùng Type Event đầy đủ
const INITIAL_EVENT_STATE: Event = {
  name: "",
  purpose: "",
  time: "",
  location: "",
  content: "",
  organizers: [],
  participants: [],
  permissions: [],
  // Các trường khác có thể là undefined hoặc null ban đầu
};

interface CreateEventTabContentProps {
  user: MainUserType | null; // User from UserHome is MainUserType
  onEventCreated: () => void; // Callback can be used for both create/update feedback if needed
}

const CreateEventTabContent: React.FC<CreateEventTabContentProps> = ({
  user,
  onEventCreated, // Renaming this might be clearer e.g., onEventSubmitted
}) => {
  // State for the list of events created by the user
  const [events, setEvents] = useState<Event[]>([]);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);

  // State for the form (create or edit)
  const [currentEventData, setCurrentEventData] =
    useState<Event>(INITIAL_EVENT_STATE);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // State for supporting data
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const [isFetchingUsers, setIsFetchingUsers] = useState(true); // For fetching user list

  const [availablePermissions] = useState([
    "Giảng viên",
    "Sinh viên",
    "Quản trị viên",
  ]);
  const router = useRouter();

  const btcSectionRef = useRef<BTCSectionHandle>(null);
  const participantSectionRef = useRef<ParticipantSectionHandle>(null);

  // --- Helper Functions ---
   const getUserFullName = useCallback(
     (userId: string, usersList: ApiUser[]): string => {
         if (!usersList || usersList.length === 0) return `(Loading...)`;
         const userFound = usersList.find((u) => u.id === userId);
         if (!userFound) return `(ID: ${userId ? userId.substring(0, 8) : "N/A"}...)`;
         const fullName = `${userFound.lastName || ""} ${userFound.firstName || ""}`.trim();
         return fullName || userFound.username || `(ID: ${userId.substring(0, 8)}...)`;
     },
     []
   );

  // --- Data Fetching ---
  useEffect(() => {
    const fetchRequiredData = async () => {
      setIsFetchingUsers(true); // Use this state for loading indicator
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Token không tồn tại.");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch all users
        const auRes = await fetch("http://localhost:8080/identity/users", { headers });
        if (!auRes.ok) {
          const d = await auRes.json().catch(() => {});
          throw new Error(d?.message || "Lỗi lấy danh sách người dùng");
        }
        const auData = await auRes.json();
        setAllUsers(auData?.result || []);
        console.log("Fetched all users for Create Tab:", auData?.result?.length);

      } catch (error: any) {
        console.error("Lỗi tải dữ liệu cần thiết:", error);
        toast.error(`Lỗi tải dữ liệu: ${error.message}`);
        setAllUsers([]);
      } finally {
        setIsFetchingUsers(false);
      }
    };
    fetchRequiredData();
  }, []); // Fetch only once on mount

  // Fetch events created by the current user
  const fetchEvents = useCallback(async () => {
    if (!user?.id) {
      setEvents([]);
      return;
    }
    console.log(`Workspaceing events for user ${user.id}...`);
    setIsFetchingEvents(true);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const url = `http://localhost:8080/identity/api/events/creator/${user.id}`;
      const res = await fetch(url, { headers, cache: "no-store" }); // No cache to get fresh list
      if (!res.ok) {
        let m = `Lỗi tải sự kiện`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(m);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
         console.log("Fetched events data:", JSON.stringify(data.result.length, null, 2));
         setEvents(data.result); // Set state with fetched events
      } else {
        console.error("API events data error:", data);
        setEvents([]);
        // Don't throw error here maybe, just log it or show mild warning
        // throw new Error(data.message || "Lỗi cấu trúc events");
      }
    } catch (error: any) {
      toast.error(`Lỗi tải danh sách sự kiện: ${error.message}`);
      console.error("Fetch events error:", error);
      setEvents([]);
    } finally {
      setIsFetchingEvents(false);
    }
  }, [user]); // Depend on user

  // Fetch events list when user is available and initial users fetch is done
  useEffect(() => {
    if (user?.id && !isFetchingUsers) {
      fetchEvents();
    } else if (!user?.id) {
      setEvents([]); // Clear events if user logs out
    }
  }, [user, fetchEvents, isFetchingUsers]); // Rerun if user changes or fetch function ref changes

  // Set creator ID when user is loaded and not editing
  useEffect(() => {
    if (user && !editingEventId && !currentEventData.createdBy) {
        setCurrentEventData((prev) => ({ ...prev, createdBy: user.id }));
    }
  }, [user, editingEventId, currentEventData.createdBy]);


  // --- Form Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCurrentEventData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePermissionChange = (permission: string) => {
    setCurrentEventData((prev) => {
      const ps = prev.permissions || [];
      return {
        ...prev,
        permissions: ps.includes(permission)
          ? ps.filter((p) => p !== permission)
          : [...ps, permission],
      };
    });
  };

  // Function to populate form for editing
  const handleSetEditingEvent = useCallback(
    (eventToEdit: Event | null) => {
      if (eventToEdit) {
        // Format time correctly for datetime-local input
        const timeForInput = eventToEdit.time
          ? eventToEdit.time.slice(0, 16) // YYYY-MM-DDTHH:mm
          : "";

        const eventDataForForm: Event = {
          ...INITIAL_EVENT_STATE, // Start with initial state
          ...eventToEdit, // Spread fetched event data
          time: timeForInput, // Use formatted time
          // Ensure organizers/participants are arrays even if null/undefined from API
          organizers: eventToEdit.organizers || [],
          participants: eventToEdit.participants || [],
          permissions: eventToEdit.permissions || [],
        };
        setCurrentEventData(eventDataForForm);
        setEditingEventId(eventToEdit.id || null);
        // Reset child sections (they will receive new existing members via props)
        btcSectionRef.current?.resetForms();
        participantSectionRef.current?.resetForms();
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see form
      } else {
        // Reset to initial state for creating
        setCurrentEventData({
          ...INITIAL_EVENT_STATE,
          createdBy: user?.id || "", // Set current user as creator
        });
        setEditingEventId(null);
        btcSectionRef.current?.resetForms();
        participantSectionRef.current?.resetForms();
      }
    },
    [user] // Depend on user to set creator correctly when resetting
  );

  const cancelEdit = () => handleSetEditingEvent(null);

  // Handle form submission (Create or Update)
  const handleSubmitEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token || !user) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsLoading(false);
      return;
    }

    const organizersFromSection = btcSectionRef.current?.getMembersData() ?? [];
    const participantsFromSection =
      participantSectionRef.current?.getMembersData() ?? [];

    // --- Validation ---
     const requiredFields: (keyof Omit<
         Event, // Use the main Event type for validation checking
         | "id"
         | "createdBy"
         | "status"
         | "image"
         | "organizers" // Validated separately below
         | "participants" // Validated separately below
         | "attendees"
         | "rejectionReason"
         | "createdAt"
     >)[] = ["name", "purpose", "time", "location", "content", "permissions"];
     const missingFields = requiredFields.filter((field) => {
       if (field === "permissions")
         return (
           !currentEventData.permissions ||
           currentEventData.permissions.length === 0
         );
       const value = currentEventData[field as keyof typeof currentEventData]; // Type assertion
       return value === null || value === undefined || value === "";
     });
     if (missingFields.length > 0) {
         const fieldLabels: Record<string, string> = { name: "Tên", purpose: "Mục đích", time: "Ngày giờ", location: "Địa điểm", content: "Nội dung", permissions: "Quyền" };
        const names = missingFields.map(f => fieldLabels[f] || f).join(", ");
        toast.error(`Vui lòng nhập/chọn: ${names}`);
        setIsLoading(false);
        return;
     }
     if (organizersFromSection.length === 0) {
         toast.error("Vui lòng thêm ít nhất một người vào Ban Tổ Chức.");
         setIsLoading(false);
         return;
     }
    // --- End Validation ---

    const isEditing = !!editingEventId;
    const url = isEditing
      ? `http://localhost:8080/identity/api/events/${editingEventId}`
      : "http://localhost:8080/identity/api/events";
    const method = isEditing ? "PUT" : "POST";

    // --- Prepare Request Body ---
    // Convert EventMember[] from state/props to EventMemberInput[] for submission
    // Use data directly from sections which should be EventMemberInput[]
    const finalRequestBody = {
      ...currentEventData, // Spread current form data
      id: isEditing ? editingEventId : undefined, // Only include ID if editing
      createdBy: isEditing ? currentEventData.createdBy : user?.id, // Keep original creator on edit
      organizers: organizersFromSection, // Data from ref is already EventMemberInput[]
      participants: participantsFromSection, // Data from ref is already EventMemberInput[]
      // Remove fields not expected by backend API
      attendees: undefined,
      rejectionReason: undefined,
      createdAt: undefined,
      status: isEditing ? currentEventData.status : undefined, // Keep status if editing, else undefined
    };
    // Clean up potential undefined keys more robustly
     Object.keys(finalRequestBody).forEach(key => {
         if (finalRequestBody[key as keyof typeof finalRequestBody] === undefined) {
           delete finalRequestBody[key as keyof typeof finalRequestBody];
         }
     });


    console.log(`[${method}] Request to ${url}`);
    console.log("Request Body:", JSON.stringify(finalRequestBody, null, 2));
    // --- End Prepare Request Body ---

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finalRequestBody),
      });
      if (!response.ok) {
        let msg = `${isEditing ? "Cập nhật" : "Thêm"} lỗi (${response.status})`;
        let serverData = null;
        try {
          serverData = await response.json();
          msg = serverData?.message || msg;
          console.error("Server Error:", serverData);
        } catch (e) {
             try {
                 const t = await response.text();
                 console.error("Server Error Text:", t);
                 msg = `${msg}: ${t.slice(0, 100)}`;
             } catch (_) {}
        }
        throw new Error(msg);
      }

        const result = await response.json(); // Assuming API returns data on success too
         if (result.code === 1000) {
             toast.success(`${isEditing ? "Cập nhật" : "Thêm"} thành công!`);
             handleSetEditingEvent(null); // Reset form to create mode
             await fetchEvents(); // Refresh the list below the form
             onEventCreated(); // Call callback (maybe rename it)
         } else {
             throw new Error(result.message || `Lỗi khi ${isEditing ? "cập nhật" : "thêm"}`);
         }

    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || `Lỗi khi ${isEditing ? "cập nhật" : "thêm"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isPageLoading = isFetchingUsers; // Initial load depends on users

  return (
    <div>
       {/* Form Section */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
          {editingEventId ? "✏️ Chỉnh sửa Sự kiện" : "➕ Thêm Sự kiện Mới"}
        </h2>
        {isPageLoading ? (
           <div className="text-center py-10 text-gray-500">Đang tải dữ liệu cần thiết...</div>
        ): (
             <form onSubmit={handleSubmitEvent} className="space-y-6">
                 {/* --- Form Inputs --- */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                         <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1"> Tên sự kiện <span className="text-red-500">*</span></label>
                         <input id="name" type="text" name="name" value={currentEventData.name} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
                     </div>
                     <div>
                         <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Ngày giờ <span className="text-red-500">*</span></label>
                         <input id="time" type="datetime-local" name="time" value={currentEventData.time} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
                     </div>
                     <div>
                         <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Địa điểm <span className="text-red-500">*</span></label>
                         <input id="location" type="text" name="location" value={currentEventData.location} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
                     </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Người tạo</label>
                          <input type="text"
                             value={
                                 editingEventId && currentEventData.createdBy ? getUserFullName(currentEventData.createdBy, allUsers)
                                 : user ? `${user.lastName || ""} ${user.firstName || ""}`.trim() || user.username || "..."
                                 : "..."
                             }
                             readOnly className="w-full p-2 border border-gray-300 rounded bg-gray-100 cursor-not-allowed" />
                      </div>
                      <div className="md:col-span-2">
                         <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">Mục đích <span className="text-red-500">*</span></label>
                         <textarea id="purpose" name="purpose" rows={3} value={currentEventData.purpose} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
                      </div>
                      <div className="md:col-span-2">
                         <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Nội dung <span className="text-red-500">*</span></label>
                         <textarea id="content" name="content" rows={4} value={currentEventData.content} onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500" required />
                      </div>
                      <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Đối tượng tham gia <span className="text-red-500">*</span></label>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                              {availablePermissions.map((p) => (
                                  <label key={p} className="inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={currentEventData.permissions?.includes(p)} onChange={() => handlePermissionChange(p)} className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                      <span className="ml-2 text-sm text-gray-700">{p}</span>
                                  </label>
                              ))}
                          </div>
                           {(!currentEventData.permissions || currentEventData.permissions.length === 0) && (<p className="text-xs text-red-500 mt-1">Chọn ít nhất một đối tượng.</p>)}
                      </div>
                  </div>
                  {/* --- End Form Inputs --- */}

                 {/* Child Sections - Pass existing members only when editing */}
                  <BTCSection
                    ref={btcSectionRef}
                    allUsers={allUsers}
                    existingOrganizers={editingEventId ? currentEventData.organizers : []}
                  />
                  <ParticipantSection
                    ref={participantSectionRef}
                    allUsers={allUsers}
                    existingParticipants={editingEventId ? currentEventData.participants : []}
                  />

                 {/* --- Form Buttons --- */}
                  <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                      {editingEventId && (
                          <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer text-sm"> Hủy bỏ </button>
                      )}
                      <button type="submit" disabled={isLoading || isPageLoading}
                          className={`px-6 py-2 text-white rounded cursor-pointer text-sm font-medium ${isLoading || isPageLoading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`} >
                          {isLoading ? (
                              <span className="flex items-center"><svg className="animate-spin mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path></svg>Đang xử lý...</span>
                          ) : editingEventId ? ("Cập nhật sự kiện") : ("Gửi yêu cầu tạo")}
                      </button>
                  </div>
                  {/* --- End Form Buttons --- */}
             </form>
         )}
      </div>

      {/* Event List Section */}
      <div className="mt-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Danh sách sự kiện đã tạo</h2>
          {isFetchingEvents ? (
              <div className="text-center py-10 text-gray-500">Đang tải danh sách...</div>
          ) : (
               <EventList
                  events={events}
                  setEvents={setEvents} // Pass setter if EventList needs to modify parent state directly (e.g., after delete)
                  users={allUsers} // Pass allUsers for displaying names
                  currentUser={user || undefined} // Pass current user info
                  setEditingEvent={handleSetEditingEvent} // Pass handler to trigger edit mode
                 
                  refreshEvents={fetchEvents}
               />
          )}
       </div>

    </div>
  );
};

export default CreateEventTabContent;