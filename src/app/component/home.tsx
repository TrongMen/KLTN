import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UserMenu from "./menu";
import ContactModal from "./contact";
import ModalEvent from "./ModalEvent";
import ModalAttendees from "./ModalAttende";
import ModalMember from "./ModalMember";
import ModalEventRegister from "./ModalEventRegister";
import ModalOrganizer from "./ModalOrganizer";
const events = [
  // {
  //   id: 1,
  //   title: "Hội thảo Công nghệ AI",
  //   date: "2025-03-30",
  //   location: "Hội trường A",
  //   description: "Hội thảo về công nghệ AI và ứng dụng trong thực tế.",
  //   speaker: "TS. Nguyễn Văn A",
  // },
  // {
  //   id: 2,
  //   title: "Giao lưu CLB Lập trình",
  //   date: "2025-03-25",
  //   location: "Phòng 202",
  //   description: "Buổi giao lưu, chia sẻ kinh nghiệm lập trình.",
  //   speaker: "CLB Lập trình",
  // },
  // {
  //   id: 3,
  //   title: "Workshop React Native",
  //   date: "2025-03-26",
  //   location: "Online",
  //   description: "Hướng dẫn lập trình ứng dụng di động với React Native.",
  //   speaker: "Chuyên gia React Native",
  // },
];

export default function Home() {
  const [search, setSearch] = useState("");
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [showContactModal, setShowContactModal] = useState(false);
  const [showModalEvent, setShowModalEvent] = useState(false);
  const [showModalAttendees, setShowModalAttendees] = useState(false);
  const [showModalMember, setShowModalMember] = useState(false);
  const [showModalEventRegister, setShowModalEventRegister] = useState(false);
  const [showModalOrganizer, setShowModalOrganizer] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) setUser(storedUser);
  }, []);

  const handleLogin = () => router.push("/login");

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  const handleRegister = (eventId) => {
    if (!registeredEvents.includes(eventId)) {
      setRegisteredEvents([...registeredEvents, eventId]);
      alert("Đăng ký thành công!");
    }
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

            {/* Tài khoản - Đặt tại đây */}
            {user ? (
              <UserMenu user={user} onLogout={handleLogout} />
            ) : (
              <div className="flex gap-2">
                <Link href="/login">
                  <button className="px-3 py-1 bg-blue-500 hover:bg-blue-700 text-white rounded-md text-sm">
                    Đăng nhập
                  </button>
                </Link>
                <Link href="/register">
                  <button className="px-3 py-1 bg-green-500 hover:bg-green-700 text-white rounded-md text-sm">
                    Đăng ký
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto bg-white shadow-md rounded-xl p-4 mt-4 flex justify-center gap-8 border border-gray-200">
        {user?.role === "admin" && (
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <Link href="/admin/events">
              <button className="px-4 cursor-pointer py-2 bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-semibold rounded-full shadow-sm transition">
                📅 Quản lý sự kiện
              </button>
            </Link>
            <button
            onClick={() => setShowModalMember(true)} className="px-4 cursor-pointer py-2 bg-pink-100 text-pink-800 hover:bg-pink-200 font-semibold rounded-full shadow-sm transition">
                👥 Thành viên CLB
              </button>
            
            <Link href="/admin/roles">
              <button className="px-4 cursor-pointer py-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-semibold rounded-full shadow-sm transition">
                📌 Quản lý chức vụ
              </button>
            </Link>
            
              <button
              onClick={() => setShowModalOrganizer(true)} className="cursor-pointer px-4 py-2 bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold rounded-full shadow-sm transition">
                📖 Thành viên Ban tổ chức
              </button>
            
          </div>
        )}

        {user?.role === "organizer" && (
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            <button
              onClick={() => setShowModalEvent(true)}
              className=" cursor-pointer px-4 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 font-semibold rounded-full shadow-sm transition"
            >
              🛠 Sự kiện của tôi
            </button>

            <button
              onClick={() => setShowModalAttendees(true)}
              className="cursor-pointer px-4 py-2 bg-teal-100 text-teal-800 hover:bg-teal-200 font-semibold rounded-full shadow-sm transition"
            >
              ✅ Người tham gia
            </button>

            <button
              onClick={() => setShowModalMember(true)}
              className="px-4 cursor-pointer py-2 bg-pink-100 text-pink-800 hover:bg-pink-200 font-semibold rounded-full shadow-sm transition">
                👥 Thành viên CLB
              </button>
              <button
              
              className="px-4 cursor-pointer py-2 bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold rounded-full shadow-sm transition">
                📖 Thành viên Ban tổ chức
              </button>
            
          </div>
        )}

        {user?.role === "student" && (
          <div className="flex flex-wrap gap-4 justify-center mt-6">
            
            
              <button
              onClick={() => setShowModalEventRegister(true)}
              className="px-4 cursor-pointer py-2 bg-green-100 text-green-800 hover:bg-green-200 font-semibold rounded-full shadow-sm transition">
                📋 Sự kiện đã đăng ký
              </button>
              <button
              onClick={() => setShowModalMember(true)}
              className="px-4 cursor-pointer py-2 bg-pink-100 text-pink-800 hover:bg-pink-200 font-semibold rounded-full shadow-sm transition">
                👥 Thành viên CLB
              </button>
            <button
               className="px-4 cursor-pointer py-2 bg-purple-100 text-purple-800 hover:bg-purple-200 font-semibold rounded-full shadow-sm transition">
                📖 Thành viên Ban tổ chức
              </button>
            
          </div>
        )}
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
        {/* <input
          type="text"
          placeholder="🔍 Tìm kiếm sự kiện..."
          className="w-full p-3 border rounded-lg mb-6 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        /> */}
        {user?.role === "organizer" && (
          <Link href="/event">
            <button className="cursor-pointer mb-4 px-5 py-2 bg-gradient-to-r from-green-400 to-green-600 hover:to-green-700 text-white rounded-lg transition shadow-md">
              + Tạo sự kiện
            </button>
          </Link>
        )}

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
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg transition"
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
                  <h2 className="text-lg font-semibold text-gray-800">
                    {event.title}
                  </h2>
                  <p className="text-gray-600">📅 {event.date}</p>
                  <p className="text-gray-600">📍 {event.location}</p>
                  {user?.role === "student" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegister(event.id);
                      }}
                      className={`mt-3 px-4 py-2 rounded-lg text-white shadow-md transition ${
                        registeredEvents.includes(event.id)
                          ? "bg-gray-400"
                          : "bg-blue-500 hover:bg-blue-700"
                      }`}
                      disabled={registeredEvents.includes(event.id)}
                    >
                      {registeredEvents.includes(event.id)
                        ? "✅ Đã đăng ký"
                        : "📝 Đăng ký"}
                    </button>
                  )}
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
      {showModalEvent && (
        <ModalEvent onClose={() => setShowModalEvent(false)} />
      )}
      {showModalAttendees && (
        <ModalAttendees
          onClose={() => setShowModalAttendees(false)}
          attendees={[
            { name: "Nguyễn Văn A", role: "Sinh viên" },
            { name: "Trần Thị B", role: "Giảng viên" },
          ]}
        />
      )}
      {showModalMember && (
        <ModalMember onClose={() => setShowModalMember(false)} />
      )}
      {showModalEventRegister && (
        <ModalEventRegister onClose={() => setShowModalEventRegister(false)} />
      )}

    {showModalOrganizer && (
        <ModalOrganizer onClose={() => setShowModalOrganizer(false)} />
      )}
    </div>
  );
}
