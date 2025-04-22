"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast, Toaster } from "react-hot-toast";
import BTCSection from "./BTCSection"; // Đảm bảo tên file đúng
import ParticipantSection from "./ParticipantSection"; // Đảm bảo tên file đúng
import EventList from "./ListEvenUser"; // Đảm bảo tên file đúng

// --- Types ---
type ApiUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  role?: string;
};

type EventMemberInput = {
  userId: string;
  roleId: string;
  positionId: string;
};

// Kiểu dữ liệu cho Event (nhận từ API và quản lý trong state)
// Đảm bảo nó khớp với cấu trúc API của bạn
type EventData = {
  id?: string;
  name: string;
  purpose: string;
  time: string;
  location: string;
  content: string;
  createdBy?: string; // ID người tạo
  organizers: EventMemberInput[];
  participants: EventMemberInput[];
  permissions: string[]; // Vẫn giữ lại permissions nếu API còn dùng
  status?: "PENDING" | "APPROVED" | "REJECTED";
  // Thêm các trường khác nếu cần (vd: rejectReason)
};

// State khởi tạo cho form
const INITIAL_EVENT_STATE: EventData = {
  name: "",
  purpose: "",
  time: "",
  location: "",
  content: "",
  organizers: [],
  participants: [],
  permissions: [], // Khởi tạo permissions rỗng
};

export default function EventManagementPage() {
  // --- State Definitions ---
  const [events, setEvents] = useState<EventData[]>([]); // Danh sách sự kiện (của user)
  const [currentEventData, setCurrentEventData] = useState<EventData>(INITIAL_EVENT_STATE); // Dữ liệu form hiện tại
  const [editingEventId, setEditingEventId] = useState<string | null>(null); // ID của event đang sửa
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null); // User đang đăng nhập
  const [allUsers, setAllUsers] = useState<ApiUser[]>([]); // Danh sách tất cả user (cho việc hiển thị tên)
  const [isLoading, setIsLoading] = useState(false); // Loading cho submit form
  const [isFetchingEvents, setIsFetchingEvents] = useState(false); // Loading cho fetch events
  const [isFetchingInitialData, setIsFetchingInitialData] = useState(true); // Loading cho fetch user info + all users

  // Danh sách quyền truy cập có sẵn (có thể lấy từ API)
  const [availablePermissions] = useState(["Giảng viên", "Sinh viên", "Quản trị viên"]);

  const router = useRouter();

  // --- Helper Function ---
  // Hàm lấy tên đầy đủ từ user ID
  const getUserFullName = useCallback((userId: string, usersList: ApiUser[]): string => {
    const userFound = usersList.find((u) => u.id === userId);
    if (!userFound) return `(ID: ${userId ? userId.substring(0, 8) : 'N/A'}...)`;
    const fullName = `${userFound.lastName || ""} ${userFound.firstName || ""}`.trim();
    return fullName || userFound.username || `(ID: ${userId.substring(0, 8)}...)`;
  }, []);

  // --- Fetch User Info and All Users ---
  // Chạy một lần khi component mount để lấy dữ liệu cần thiết ban đầu
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsFetchingInitialData(true);
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Token không tồn tại. Vui lòng đăng nhập lại.");
        const headers = { Authorization: `Bearer ${token}` };

        // Fetch user info và all users song song
        const [userInfoRes, allUsersRes] = await Promise.all([
          fetch("http://localhost:8080/identity/users/myInfo", { headers }),
          fetch("http://localhost:8080/identity/users", { headers })
        ]);

        // Xử lý user info
        if (!userInfoRes.ok) {
            const errorData = await userInfoRes.json().catch(() => ({}));
            throw new Error(errorData.message || "Lấy thông tin người dùng thất bại");
        }
        const userInfoData = await userInfoRes.json();
        if (userInfoData.result) {
          setCurrentUser(userInfoData.result);
          // Set createdBy ngay lập tức nếu là form mới (khi editingEventId là null)
           if (!editingEventId) { // Chỉ set khi không ở chế độ edit
              setCurrentEventData(prev => ({ ...prev, createdBy: userInfoData.result.id }));
           }
        } else {
             throw new Error("Dữ liệu người dùng không hợp lệ");
        }

        // Xử lý all users
        if (!allUsersRes.ok) {
            const errorData = await allUsersRes.json().catch(() => ({}));
            throw new Error(errorData.message || "Lấy danh sách người dùng thất bại");
        }
        const allUsersData = await allUsersRes.json();
        setAllUsers(allUsersData?.result || []);

      } catch (error: any) {
        console.error("Lỗi khi tải dữ liệu khởi tạo:", error);
        toast.error(`Lỗi tải dữ liệu: ${error.message}`);
        // Có thể cần xử lý thêm, ví dụ chuyển hướng nếu lỗi token
        // if (error.message.includes("Token")) router.push('/login');
      } finally {
        setIsFetchingInitialData(false); // Kết thúc loading dữ liệu ban đầu
      }
    };
    fetchInitialData();
  }, []); // Chỉ chạy 1 lần


  // --- Fetch Events BY CREATOR ---
  // Hàm fetch sự kiện của user hiện tại
  const fetchEvents = useCallback(async () => {
    if (!currentUser?.id) {
       console.log("Chưa có thông tin người dùng để tải sự kiện.");
       setEvents([]); // Xóa danh sách cũ nếu không có user
      return;
    }

    console.log(`Workspaceing events for creator: ${currentUser.id}`);
    setIsFetchingEvents(true); // Bắt đầu loading fetch events
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const url = `http://localhost:8080/identity/api/events/creator/${currentUser.id}`; // URL mới
      const res = await fetch(url, { headers });

      if (!res.ok) {
        let errorMsg = `Failed to fetch events for creator ${currentUser.id}`;
        try { const errorData = await res.json(); errorMsg = errorData.message || errorMsg; } catch (_) {}
        throw new Error(errorMsg);
      }
      const data = await res.json();
      if (data.code === 1000 && data.result) {
        setEvents(Array.isArray(data.result) ? data.result : []);
      } else {
        throw new Error(data.message || "Failed to load events structure");
      }
    } catch (error: any) {
      toast.error(`Lỗi tải sự kiện: ${error.message}`);
      console.error("Fetch events error:", error);
      setEvents([]); // Đặt lại danh sách nếu lỗi
    } finally {
       setIsFetchingEvents(false); // Kết thúc loading fetch events
    }
  }, [currentUser]); // Phụ thuộc vào currentUser

  // Gọi fetchEvents khi currentUser có giá trị (sau khi fetchInitialData thành công)
  useEffect(() => {
    if (currentUser?.id) {
        fetchEvents();
    } else {
      // Nếu không có user (ví dụ: lỗi fetch user info), xóa danh sách events
      setEvents([]);
    }
  }, [currentUser, fetchEvents]); // Chạy lại khi currentUser hoặc hàm fetchEvents thay đổi


  // --- Form Handlers ---
  // Xử lý thay đổi input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentEventData({ ...currentEventData, [name]: value });
  };

  // Xử lý thay đổi quyền
  const handlePermissionChange = (permission: string) => {
    setCurrentEventData(prev => {
        const currentPermissions = prev.permissions || [];
        if (currentPermissions.includes(permission)) {
            return { ...prev, permissions: currentPermissions.filter(p => p !== permission) };
        } else {
            return { ...prev, permissions: [...currentPermissions, permission] };
        }
    });
  };

  // Xử lý thêm BTC
  const handleAddOrganizer = useCallback((organizerData: EventMemberInput) => {
    setCurrentEventData(prev => {
      const isExisting = prev.organizers.some(o => o.userId === organizerData.userId);
      if (isExisting) {
        toast.error(`Người dùng đã có trong Ban tổ chức.`);
        return prev;
      }
      return { ...prev, organizers: [...prev.organizers, organizerData] };
    });
  }, []);

  // Xử lý thêm người tham dự
  const handleAddParticipant = useCallback((participantData: EventMemberInput) => {
    setCurrentEventData(prev => {
      const isExisting = prev.participants.some(p => p.userId === participantData.userId);
      if (isExisting) {
        toast.error(`Người dùng đã có trong danh sách tham dự.`);
        return prev;
      }
      return { ...prev, participants: [...prev.participants, participantData] };
    });
  }, []);

  // Xử lý khi bắt đầu chỉnh sửa
  const handleSetEditingEvent = useCallback((eventToEdit: EventData | null) => {
      if (eventToEdit) {
          // Copy dữ liệu vào form, đảm bảo các mảng là array
          setCurrentEventData({
              ...INITIAL_EVENT_STATE, // Bắt đầu từ state sạch
              ...eventToEdit,
              organizers: eventToEdit.organizers ? [...eventToEdit.organizers] : [],
              participants: eventToEdit.participants ? [...eventToEdit.participants] : [],
              permissions: eventToEdit.permissions ? [...eventToEdit.permissions] : [],
          });
          setEditingEventId(eventToEdit.id || null);
      } else {
          // Reset form về trạng thái ban đầu
          setCurrentEventData({
              ...INITIAL_EVENT_STATE,
              createdBy: currentUser?.id || "" // Đặt lại createdBy
          });
          setEditingEventId(null);
      }
  }, [currentUser]); // Phụ thuộc currentUser để set createdBy khi reset

  // Hủy chỉnh sửa
  const cancelEdit = () => {
      handleSetEditingEvent(null); // Gọi hàm reset
  };

  // --- Form Submission ---
  const handleSubmitEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true); // Bắt đầu loading submit

    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập lại.");
      setIsLoading(false);
      return;
    }

    // Validation cơ bản
    const requiredFields: (keyof EventData)[] = ["name", "purpose", "time", "location", "content"];
    const missingFields = requiredFields.filter(field => !currentEventData[field]);
    if (missingFields.length > 0) {
      toast.error(`Vui lòng nhập: ${missingFields.join(", ")}`);
      setIsLoading(false);
      return;
    }
     if (!currentEventData.permissions || currentEventData.permissions.length === 0) {
        toast.error("Vui lòng chọn ít nhất một quyền truy cập.");
        setIsLoading(false);
        return;
     }

    // Xác định URL và Method (POST hoặc PUT)
    const isEditing = !!editingEventId;
    const url = isEditing
      ? `http://localhost:8080/identity/api/events/${editingEventId}`
      : "http://localhost:8080/identity/api/events";
    const method = isEditing ? "PUT" : "POST";

    // Chuẩn bị request body
    const requestBody: any = { ...currentEventData };
    if (!isEditing) {
      delete requestBody.id; // Không gửi ID khi tạo mới
      requestBody.createdBy = currentUser?.id; // Đảm bảo createdBy đúng
    } else {
      // Khi PUT, có thể cần loại bỏ một số trường không được phép cập nhật
      // delete requestBody.createdBy;
      // delete requestBody.status;
    }

    console.log(`[${method}] Request to ${url}`);
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = `${isEditing ? 'Cập nhật' : 'Thêm'} sự kiện thất bại (Status: ${response.status})`;
        let serverErrorData = null;
        try {
          serverErrorData = await response.json();
          errorMsg = serverErrorData.message || errorMsg;
          console.error("Server Error Response Body:", serverErrorData);
        } catch (parseError) {
           try{ const errorText = await response.text(); console.error("Server Error Response Text:", errorText); } catch(_){ console.error("Không thể đọc nội dung lỗi từ server."); }
        }
        throw new Error(errorMsg);
      }

      toast.success(`${isEditing ? 'Cập nhật' : 'Thêm'} sự kiện thành công!`);
      handleSetEditingEvent(null); // Reset form
      await fetchEvents(); // Tải lại danh sách sự kiện của user

    } catch (error: any) {
      console.error("Error submitting event:", error);
      toast.error(error.message || `Lỗi khi ${isEditing ? 'cập nhật' : 'thêm'} sự kiện`);
    } finally {
      setIsLoading(false); // Kết thúc loading submit
    }
  };


  // --- Render ---
  const isOverallLoading = isFetchingInitialData || isFetchingEvents; // Loading tổng thể

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Toaster toastOptions={{ duration: 3500 }}  />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          🎉 Quản lý sự kiện
        </h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors cursor-pointer text-sm text-gray-700 flex items-center"
          aria-label="Quay lại" title="Quay lại"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Quay lại
        </button>
      </div>

      {/* Event Form */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          {editingEventId ? "✏️ Chỉnh sửa Sự kiện" : "➕ Thêm Sự kiện Mới"}
        </h2>

        <form onSubmit={handleSubmitEvent}>
          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Tên sự kiện *</label>
              <input id="name" type="text" name="name" value={currentEventData.name} onChange={handleInputChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">Ngày và giờ diễn ra *</label>
              <input id="time" type="datetime-local" name="time" value={currentEventData.time} onChange={handleInputChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Địa điểm *</label>
              <input id="location" type="text" name="location" value={currentEventData.location} onChange={handleInputChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
            </div>
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Người tạo</label>
               <input type="text" value={ currentUser ? `${currentUser.lastName} ${currentUser.firstName}` : "..." } readOnly className="w-full p-2 border rounded bg-gray-100 cursor-not-allowed" />
            </div>
          </div>

          {/* Purpose */}
          <div className="mt-4">
            <label htmlFor="purpose" className="block text-sm font-medium text-gray-700 mb-1">Mục đích *</label>
            <textarea id="purpose" name="purpose" rows={3} value={currentEventData.purpose} onChange={handleInputChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
          </div>

          {/* Content */}
          <div className="mt-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Nội dung sự kiện *</label>
            <textarea id="content" name="content" rows={4} value={currentEventData.content} onChange={handleInputChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" required />
          </div>

          {/* Permissions Section */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Quyền truy cập *</label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {availablePermissions.map(permission => (
                <label key={permission} className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentEventData.permissions?.includes(permission)} // Thêm ?. để tránh lỗi nếu permissions là null/undefined ban đầu
                    onChange={() => handlePermissionChange(permission)}
                    className="form-checkbox h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-700">{permission}</span>
                </label>
              ))}
            </div>
             {currentEventData.permissions?.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Vui lòng chọn ít nhất một quyền.</p>
             )}
          </div>

           {/* Sections for Organizers and Participants */}
           <div className="mt-4 p-2 border rounded bg-gray-50">
               <h4 className="font-semibold text-sm">Ban tổ chức đã thêm: {currentEventData.organizers?.length || 0}</h4>
               {currentEventData.organizers && currentEventData.organizers.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-gray-600 pl-4">
                     {currentEventData.organizers.map(org => (
                         <li key={org.userId}>{getUserFullName(org.userId, allUsers)}</li>
                     ))}
                  </ul>
               )}
            </div>
           <BTCSection onAddOrganizer={handleAddOrganizer} />

           <div className="mt-4 p-2 border rounded bg-gray-50">
              <h4 className="font-semibold text-sm">Người tham dự đã thêm: {currentEventData.participants?.length || 0}</h4>
               {currentEventData.participants && currentEventData.participants.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-gray-600 pl-4">
                     {currentEventData.participants.map(par => (
                         <li key={par.userId}>{getUserFullName(par.userId, allUsers)}</li>
                     ))}
                  </ul>
               )}
            </div>
          <ParticipantSection onAddParticipant={handleAddParticipant} />

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            {editingEventId && (
              <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors cursor-pointer"> Hủy bỏ </button>
            )}
            <button type="submit" disabled={isLoading || isOverallLoading} className={`px-6 py-2 text-white rounded-md transition-colors ${ (isLoading || isOverallLoading) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700" }`} >
              {isLoading ? (
                <span className="flex items-center justify-center"> <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Đang xử lý... </span>
              ) : editingEventId ? ( "Cập nhật sự kiện" ) : ( "Thêm sự kiện" )}
            </button>
          </div>
        </form>
      </div>

      {/* Events List */}
      {isOverallLoading ? ( // Sử dụng loading tổng thể
           <div className="text-center py-10 text-gray-500">Đang tải dữ liệu...</div>
      ) : (
          <EventList
              // Truyền đúng props xuống EventList
              events={events}
              setEvents={setEvents} // Nếu EventList cần cập nhật state cha (ví dụ sau khi xóa)
              users={allUsers}
              currentUser={currentUser || undefined} // Đảm bảo currentUser không phải null
              setEditingEvent={handleSetEditingEvent} // Hàm để bắt đầu edit
          />
      )}
    </div>
  );
}