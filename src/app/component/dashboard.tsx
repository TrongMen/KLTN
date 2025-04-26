import React, { useState, useEffect, useMemo } from "react"; // Đã thêm useMemo
import { useRouter } from "next/navigation";
import Link from "next/link";
// import ContactModal from "./contact"; // Giả sử component này tồn tại

// --- Placeholder for ContactModal if not imported ---
function ContactModal({ onClose }) {
    const handleDialogClick = (e) => e.stopPropagation();
    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={handleDialogClick}>
                <h2 className="text-xl font-semibold mb-4">Thông tin liên hệ</h2>
                <p className="text-gray-700 mb-4">
                    Vui lòng liên hệ qua email: support@example.com hoặc số điện thoại: 0123 456 789.
                </p>
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
// --- End Placeholder ---


interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
}

// Confirmation Dialog Component (Giữ nguyên từ code của bạn)
function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  confirmVariant = "primary",
}: ConfirmationDialogProps) {
  if (!isOpen) return null;
  const confirmButtonClasses = useMemo(() => {
    let base =
      "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ";
    if (confirmVariant === "danger") {
      base +=
        "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 cursor-pointer";
    } else {
      base +=
        "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 cursor-pointer";
    }
    return base;
  }, [confirmVariant]);
  const cancelButtonClasses =
    "flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity duration-300 ease-out"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all duration-300 ease-out scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="dialog-title"
          className={`text-lg font-bold mb-3 ${
            confirmVariant === "danger" ? "text-red-700" : "text-gray-800"
          }`}
        >
          {title}
        </h3>
        <div className="text-sm text-gray-600 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel} className={cancelButtonClasses}>
            {cancelText}
          </button>
          <button onClick={onConfirm} className={confirmButtonClasses}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Dashboard Component (Sửa đổi) ---
export default function Dashboard() {
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [showContactModal, setShowContactModal] = useState(false);
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger";
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("http://localhost:8080/identity/api/events/status/notoken?status=APPROVED");

        if (!response.ok) {
          let errorMessage = `Lỗi HTTP: ${response.status} - ${response.statusText}`;
          try {
            const errorBody = await response.json();
            errorMessage = errorBody.message || errorMessage;
          } catch (parseError) {
             // Ignore
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data && data.code === 1000 && Array.isArray(data.result)) {
          const formattedEvents = data.result.map((event, index) => ({
            id: event.id,
            title: event.name,
            date: event.time ? event.time.split("T")[0] : 'N/A',
            location: event.location,
            description: event.content,
            speaker: event.organizers && event.organizers.length > 0
                       ? event.organizers.map(o => `${o.roleName} - ${o.positionName}`).join(', ')
                       : "Chưa có thông tin",
            image: `/image/${(index % 3) + 1}.png`,
            purpose: event.purpose,
            attendees: event.attendees,
            organizers: event.organizers,
            status: event.status,
            createdAt: event.createdAt,
            createdBy: event.createdBy
          }));
          setEvents(formattedEvents);
        } else {
          setError(data.message || "Không thể lấy dữ liệu sự kiện hoặc định dạng dữ liệu không đúng.");
          setEvents([]);
        }
      } catch (err) {
        console.error("Lỗi khi gọi API bằng fetch:", err);
        setError(err instanceof Error ? err.message : String(err));
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();

    
  }, []);

  // *** SỬA ĐỔI TẠI ĐÂY ***
  // Tạo hàm mới để xử lý logic khi nhấn nút đăng ký
  const handleAttemptRegister = (event) => {
      event.stopPropagation(); // Ngăn click lan ra thẻ cha
      const eventId = event.target.dataset.eventId;
      if (!eventId) return;

      if (user) {
          // User đã đăng nhập
          if (!registeredEvents.includes(eventId)) {
              // TODO: Thay thế bằng lời gọi API đăng ký thực tế
              setRegisteredEvents([...registeredEvents, eventId]);
              alert("Đăng ký thành công!"); // Hoặc dùng dialog thông báo khác
          } else {
              alert("Bạn đã đăng ký sự kiện này rồi.");
          }
      } else {
          // User chưa đăng nhập -> Cấu hình và mở ConfirmationDialog
          setConfirmationState({
              isOpen: true,
              title: "Yêu cầu đăng nhập",
              message: "Vui lòng đăng nhập để đăng ký sự kiện.",
              onConfirm: () => { // Hành động khi nhấn "Đăng nhập"
                  // Dialog sẽ tự đóng khi nhấn nút nhờ vào wrapper trong JSX
                  router.push('/login');
              },
              confirmVariant: "primary", // Màu xanh mặc định
              confirmText: "Đăng nhập",  // Text nút xác nhận
              cancelText: "Hủy bỏ",    // Text nút hủy
          });
      }
  };

  // Hàm handleLoginRedirect không còn cần thiết với logic này
  // const handleLoginRedirect = () => { ... } // Có thể xóa hoặc comment lại


  const handleEvent = (event) => setSelectedEvent(event);

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(search.toLowerCase())
  );

  const upEvents = filteredEvents.filter((event) => event.date >= today);

  const renderEventContent = () => {
    if (isLoading) {
      return <p className="text-center text-gray-500 col-span-full">Đang tải dữ liệu sự kiện...</p>;
    }

    if (error) {
      return <p className="text-center text-red-500 col-span-full">Lỗi: {error}</p>;
    }

    if (selectedEvent) {
      return (
        <div className="p-6 border rounded-lg shadow-lg bg-white col-span-full">
          <h2 className="text-xl font-semibold text-gray-800">
            {selectedEvent.title}
          </h2>
          <p className="text-gray-600">📅 Ngày: {selectedEvent.date}</p>
          <p className="text-gray-600">📍 Địa điểm: {selectedEvent.location}</p>
          <p className="text-gray-600">🎤 Tổ chức/Diễn giả: {selectedEvent.speaker}</p>
          <p className="text-gray-600">📜 Mục đích: {selectedEvent.purpose}</p>
          <p className="text-gray-600">📝 Nội dung: {selectedEvent.description}</p>
           {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
             <div className="mt-2">
               <p className="font-semibold text-gray-700">Người tham dự đã đăng ký:</p>
               <ul className="list-disc list-inside text-gray-600">
                 {selectedEvent.attendees.map(attendee => (
                   <li key={attendee.userId}>{attendee.fullName} ({attendee.studentCode}) - {attendee.attending ? 'Tham gia' : 'Chưa xác nhận'}</li>
                 ))}
               </ul>
             </div>
           )}
          <button
            onClick={() => setSelectedEvent(null)}
            className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {upEvents.length > 0 ? (
          upEvents.map((event) => {
            const isRegistered = registeredEvents.includes(event.id);
            return (
              <div
                key={event.id}
                className="p-6 bg-white shadow-lg rounded-xl cursor-pointer transform transition hover:scale-105 hover:shadow-xl flex flex-col justify-between"
                onClick={() => handleEvent(event)}
              >
                <div>
                  {event.image && (
                    <img
                      src={event.image}
                      alt={event.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h2 className="text-lg font-semibold text-gray-800">
                    {event.title}
                  </h2>
                  <p className="text-gray-600">📅 {event.date}</p>
                  <p className="text-gray-600">📍 {event.location}</p>
                </div>

                <button
                  data-event-id={event.id}
                  
                  onClick={handleAttemptRegister}
                  disabled={isRegistered}
                  className={`mt-4 w-full px-4 py-2 text-sm rounded-lg transition ${
                    isRegistered
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  {/* Giữ nguyên text nút */}
                  {isRegistered ? 'Đã đăng ký' : 'Đăng ký tham gia'}
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-gray-500 text-center col-span-full">
            🚀 Không có sự kiện nào sắp diễn ra hoặc phù hợp với tìm kiếm của bạn.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
       <nav className="bg-gray-900 text-white px-4 py-4 shadow-md">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-xl font-bold">Quản lý sự kiện</div>
            <div className="flex items-center gap-6">
              <Link href="/about">
                <span className="cursor-pointer hover:text-gray-300">
                  Giới thiệu
                </span>
              </Link>
              <span
                className="cursor-pointer hover:text-gray-300"
                onClick={() => setShowContactModal(true)}
              >
                Liên hệ
              </span>
              {user ? (
                 <div className="flex items-center gap-2">
                     <span className="text-sm">Chào, {user.firstName || user.username}!</span>
                 </div>
              ) : (
                 <div className="flex gap-2">
                     <Link href="/login">
                         <button className="cursor-pointer px-3 py-1 bg-blue-500 hover:bg-blue-700 text-white rounded-md text-sm">
                             Đăng nhập
                         </button>
                     </Link>
                     <Link href="/register">
                         <button className="px-3 cursor-pointer py-1 bg-green-500 hover:bg-green-700 text-white rounded-md text-sm">
                             Đăng ký
                         </button>
                     </Link>
                 </div>
              )}
            </div>
          </div>
        </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 mt-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600">🎉 Trang chủ sự kiện</h1>
        </div>
         <div className="relative w-full max-w-7xl mb-6">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện theo tên..."
              className="w-full p-3 pl-12 pr-4 border border-gray-300 rounded-lg shadow-sm bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

        {renderEventContent()}
      </div>

      {/* Contact Modal giữ nguyên */}
      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} />}

      {/* Confirmation Dialog giữ nguyên cách render */}
      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmVariant={confirmationState.confirmVariant}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={() => {
          if (confirmationState.onConfirm) confirmationState.onConfirm();
          setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null });
        }}
        onCancel={() =>
          setConfirmationState({ isOpen: false, title: "", message: "", onConfirm: null })
        }
      />
    </div>
  );
}