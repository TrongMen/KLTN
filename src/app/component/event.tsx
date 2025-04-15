"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function EventManagementPage() {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", location: "", description: "" });
  const [editingEvent, setEditingEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dropdown = useRef(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser?.role === "organizer" || storedUser?.role === "admin") {
      setUser(storedUser);
    } else {
      router.push("/");
    }

    const storedEvents = JSON.parse(localStorage.getItem("events")) || [];
    setEvents(storedEvents);
  }, []);

  const handleInputChange = (e) => {
    setNewEvent({ ...newEvent, [e.target.name]: e.target.value });
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.location || !newEvent.description) {
      alert("Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    setLoading(true);
    const eventToAdd = {
      id: Date.now(),
      ...newEvent,
      approved: false,
      createdBy: user?.username,
    };

    const updatedEvents = [...events, eventToAdd];
    setEvents(updatedEvents);
    localStorage.setItem("events", JSON.stringify(updatedEvents));

    setTimeout(() => {
      setNewEvent({ title: "", date: "", location: "", description: "" });
      setLoading(false);
      console.log("Sự kiện đã được gửi để duyệt!");
    }, 1500);
  };

  const handleUpdateEvent = () => {
    setLoading(true);
    const updatedEvents = events.map((event) =>
      event.id === editingEvent.id ? editingEvent : event
    );
    setEvents(updatedEvents);
    localStorage.setItem("events", JSON.stringify(updatedEvents));

    setTimeout(() => {
      setEditingEvent(null);
      setLoading(false);
      console.log("Cập nhật sự kiện thành công!");
    }, 1500);
  };

  const handleDeleteEvent = (eventId) => {
    if (confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) {
      const updatedEvents = events.filter((event) => event.id !== eventId);
      setEvents(updatedEvents);
      localStorage.setItem("events", JSON.stringify(updatedEvents));
      console.log("Sự kiện đã bị xóa!");
    }
  };

  const handleApproveEvent = (eventId, approve) => {
    const updatedEvents = events.map((event) => {
      if (event.id === eventId) {
        if (approve) {
          console.log(`Sự kiện "${event.title}" đã được duyệt!`);
        } else {
          console.log(`Sự kiện "${event.title}" không được duyệt!`);
        }
        return { ...event, approved: approve };
      }
      return event;
    });

    setEvents(updatedEvents);
    localStorage.setItem("events", JSON.stringify(updatedEvents));
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsMemberMenuOpen(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">🎉 Quản lý Sự kiện</h1>
        <button onClick={() => router.back()} className="cursor-pointer p-2 bg-gray-300 rounded-full hover:bg-gray-500">
          🔙
        </button>
      </div>

      <div className="mb-6 p-4 border rounded-lg shadow-md bg-white">
        
        <h2 className="text-2xl font-semibold">{editingEvent ? "✏️ Chỉnh sửa Sự kiện" : "➕ Thêm Sự kiện"}</h2>
        <div className="relative w-full max-w-7x1 mb-4">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
        📛 
          </span>
        <input
          type="text"
          name="title"
          placeholder="Tên sự kiện"
          value={editingEvent ? editingEvent.title : newEvent.title}
          onChange={(e) => (editingEvent ? setEditingEvent({ ...editingEvent, title: e.target.value }) : handleInputChange(e))}
          className="w-full p-2 pl-12 border rounded mt-1"
        />
        </div>
        <div className="relative w-full max-w-7x1 mb-4">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
        🗓
          </span>
        <input
          type="date"
          name="date"
          value={editingEvent ? editingEvent.date : newEvent.date}
          onChange={(e) => (editingEvent ? setEditingEvent({ ...editingEvent, date: e.target.value }) : handleInputChange(e))}
          className=" w-full p-2 pl-12 border rounded mt-1"
        />
        </div>
        <div className=" relative w-full max-w-7x1 mb-4">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
        📍 
          </span>
        <input
          type="text"
          name="location"
          placeholder="Địa điểm"
          value={editingEvent ? editingEvent.location : newEvent.location}
          onChange={(e) => (editingEvent ? setEditingEvent({ ...editingEvent, location: e.target.value }) : handleInputChange(e))}
          className=" w-full p-2 pl-12 border rounded mt-1"
        />
        </div>
        <div className="relative w-full max-w-7x1 mb-5">
        <span className="absolute left-3 top-1/3 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">
        📝 
          </span>
        <textarea
          name="description"
          placeholder="Mô tả sự kiện"
          value={editingEvent ? editingEvent.description : newEvent.description}
          onChange={(e) => (editingEvent ? setEditingEvent({ ...editingEvent, description: e.target.value }) : handleInputChange(e))}
          className="w-full p-2 pl-12 border rounded mt-1"
        />
        </div>

        <button
          onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
          className={`mt-4 px-4 py-2 text-white font-semibold rounded-lg ${
            loading ? "bg-gray-400" : "cursor-pointer bg-blue-500 hover:bg-blue-700"
          }`}
          disabled={loading}
        >
          {loading ? "⏳ Đang xử lý..." : editingEvent ? "✅ Cập nhật" : "➕ Thêm"}
        </button>
      </div>

      <h2 className="text-2xl font-semibold mt-6">📅 Danh sách Sự kiện</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
        {events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} className="p-4 border rounded-lg shadow-md bg-white">
              <img src={`https://picsum.photos/seed/${event.id}/300/200`} alt="Event" className="w-full rounded mb-2" />
              <h3 className="text-lg font-semibold">{event.title}</h3>
              <p className="text-gray-600">📅 {event.date}</p>
              <p className="text-gray-600">📍 {event.location}</p>
              <p className="text-gray-600">📝 {event.description}</p>
              <div className="flex justify-between mt-2">
                {user?.role === "admin" && !event.approved && (
                  <>
                    <button onClick={() => handleApproveEvent(event.id, true)} className="px-3 py-1 bg-green-500 text-white rounded">Duyệt</button>
                    <button onClick={() => handleApproveEvent(event.id, false)} className="px-3 py-1 bg-red-500 text-white rounded">Từ chối</button>
                  </>
                )}
                <button onClick={() => handleDeleteEvent(event.id)} className="cursor-pointer px-3 py-1 bg-red-500 text-white rounded">Xóa</button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-500">Chưa có sự kiện nào.</p>
        )}
      </div>
    </div>
  );
}
