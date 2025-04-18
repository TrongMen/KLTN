  // trang localhost:3000/admin

  "use client";
  import React, { useState, useEffect } from "react";
  import { useRouter } from "next/navigation";
  import Link from "next/link";
  import UserMenu from "./menu";
  import ModalMember from "./ModalMember";
  import ModalOrganizer from "./ModalOrganizer";
  import ModalRole from "./ModalRole";
  import ContactModal from "./contact";
  import ModalChat from "./ModalChat";
  import MiniChatBox from "./MiniChat";
  import ModalApproval from "./ModalApproval";
  import { useRefreshToken } from "../../hooks/useRefreshToken";

  const events = [
    {
      id: 1,
      title: "Hội thảo Công nghệ AI",
      date: "2025-05-30",
      location: "Hội trường A",
      description: "Hội thảo về công nghệ AI và ứng dụng trong thực tế.",
      speaker: "TS. Nguyễn Văn A",
      image: "/image/1.png",
    },
    {
      id: 2,
      title: "Giao lưu CLB Lập trình",
      date: "2025-06-25",
      location: "Phòng 202",
      description: "Buổi giao lưu, chia sẻ kinh nghiệm lập trình.",
      speaker: "CLB Lập trình",
      image: "./image/2.jpg",
    },
    {
      id: 3,
      title: "Workshop React Native",
      date: "2025-07-26",
      location: "Online",
      description: "Hướng dẫn lập trình ứng dụng di động với React Native.",
      speaker: "Chuyên gia React Native",
      image: "/image/3.jpg",
    },
    {
      id: 4,
      title: "Workshop React Native",
      date: "2025-07-26",
      location: "Online",
      description: "Hướng dẫn lập trình ứng dụng di động với React Native.",
      speaker: "Chuyên gia React Native",
      image: "/image/3.jpg",
    },
    {
      id: 5,
      title: "Workshop React Native",
      date: "2025-07-26",
      location: "Online",
      description: "Hướng dẫn lập trình ứng dụng di động với React Native.",
      speaker: "Chuyên gia React Native",
      image: "/image/3.jpg",
    },
  ];

  export default function HomeAdmin() {
    const [search, setSearch] = useState("");
    const [registeredEvents, setRegisteredEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [user, setUser] = useState(null);
    const router = useRouter();
    const today = new Date().toISOString().split("T")[0];
    const [showContactModal, setShowContactModal] = useState(false);
    const [showModalMember, setShowModalMember] = useState(false);
    const [showModalChat, setShowModalChat] = useState(false);
    const [showModalRole, setShowModalRole] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [showModalApproval, setShowModalApproval] = useState(false);

    const { refreshToken, refreshing } = useRefreshToken();

    useEffect(() => {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (storedUser) setUser(storedUser);

      // Example: refresh token on component mount
      refreshToken();
    }, []);



    const roles = [
      { name: "Nguyễn Văn A", email: "a@example.com", rolez: "Trưởng nhóm" },
      {
        name: "Nguyễn Văn B",
        email: "b@example.com",
        rolez: "Thành viên nòng cốt",
      },
      {
        name: "Nguyễn Văn C",
        email: "c@example.com",
        rolez: "Thành viên vãng lai",
      },
    ];

    const handleLogout = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("role");
      localStorage.removeItem("user");

      setUser(null);
      router.push("/login");
    };

    const handleSelectConversation = (conversation) => {
      setSelectedConversation(conversation);
      setShowModalChat(false); // nếu muốn ẩn danh sách khi chọn xong
    };

    const handleEvent = (event) => setSelectedEvent(event);

    const filteredEvents = events.filter((event) =>
      event.title.toLowerCase().includes(search.toLowerCase())
    );

    const upEvents = filteredEvents.filter((event) => event.date >= today);

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
              <UserMenu user={user} onLogout={handleLogout} />
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mt-4 flex justify-center gap-8 border border-gray-200">
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <button
              onClick={() => setShowModalApproval(true)}
              className="px-4 cursor-pointer py-2 bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-semibold rounded-full shadow-sm transition"
            >
              📅 Phê duyệt sự kiện
            </button>

            <button
              onClick={() => setShowModalMember(true)}
              className="px-4 cursor-pointer py-2 bg-pink-100 text-pink-800 hover:bg-pink-200 font-semibold rounded-full shadow-sm transition"
            >
              👥 Thành viên CLB
            </button>

            <button
              onClick={() => setShowModalRole(true)}
              className="px-4 cursor-pointer py-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-semibold rounded-full shadow-sm transition"
            >
              📌 Quản lý chức vụ
            </button>

            <button
              onClick={() => setShowModalChat(true)}
              className="cursor-pointer px-4 py-2 bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold rounded-full shadow-sm transition"
            >
              💬 Danh sách chat
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto bg-white shadow-lg rounded-xl p-4 mt-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-blue-600">🎉 Trang chủ</h1>
          </div>
          <div className="relative w-full max-w-7x1 mb-6">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              className="w-full p-3 pl-12 pr-4 border border-gray-300 rounded-lg shadow-sm bg-gray-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {selectedEvent ? (
            <div className="p-6 border rounded-lg shadow-lg bg-white">
              <h2 className="text-xl font-semibold text-gray-800">
                {selectedEvent.title}
              </h2>
              <p className="text-gray-600">📅 Ngày: {selectedEvent.date}</p>
              <p className="text-gray-600">
                📍 Địa điểm: {selectedEvent.location}
              </p>
              <p className="text-gray-600">
                🎤 Diễn giả: {selectedEvent.speaker}
              </p>
              <p className="text-gray-600">
                📜 Mô tả: {selectedEvent.description}
              </p>
              <button
                onClick={() => setSelectedEvent(null)}
                className="cursor-pointer mt-4 px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {upEvents.length > 0 ? (
                upEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-6 bg-white shadow-lg rounded-xl cursor-pointer transform transition hover:scale-105 hover:shadow-xl"
                    onClick={() => handleEvent(event)}
                  >
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
                ))
              ) : (
                <p className="text-gray-500 text-center col-span-2">
                  🚀 Không có sự kiện nào sắp diễn ra.
                </p>
              )}
            </div>
          )}
        </div>
        {showContactModal && (
          <ContactModal onClose={() => setShowContactModal(false)} />
        )}
        {showModalMember && (
          <ModalMember onClose={() => setShowModalMember(false)} />
        )}
        {showModalChat && (
          <ModalChat
            onClose={() => setShowModalChat(false)}
            onSelectConversation={handleSelectConversation}
          />
        )}
        {showModalRole && (
          <ModalRole onClose={() => setShowModalRole(false)} roles={roles} />
        )}
        {selectedConversation && (
          <MiniChatBox
            conversation={selectedConversation}
            onClose={() => setSelectedConversation(null)}
          />
        )}
        {showModalApproval && (
          <ModalApproval onClose={() => setShowModalApproval(false)} />
        )}
      </div>
    );
  }
