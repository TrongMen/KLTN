"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminApprovalPage() {
  const [events, setEvents] = useState([]);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser?.role !== "admin") {
      router.push("/"); // Nếu không phải admin, điều hướng về trang chủ
    } else {
      setUser(storedUser);
    }

    const storedEvents = JSON.parse(localStorage.getItem("events")) || [];
    setEvents(storedEvents);
  }, []);
  // useEffect(() => {
  //   localStorage.setItem("events", JSON.stringify(events));
  // }, [events]);

  // Xử lý khi Admin duyệt hoặc từ chối sự kiện
  const handleApproveEvent = (eventId, isApproved) => {
    const updatedEvents = events.map((event) => {
      if (event.id === eventId) {
        return { ...event, approved: isApproved };
      }
      return event;
    });

    setEvents(updatedEvents);
    localStorage.setItem("events", JSON.stringify(updatedEvents));

    alert(isApproved ? "Sự kiện đã được duyệt!" : "Sự kiện đã bị từ chối!");
  };

  // Lọc danh sách sự kiện chờ duyệt (approved: false)
  const pendingEvents = events.filter((event) => !event.approved);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Duyệt Sự Kiện</h1>
      <button onClick={() => router.push("/")} className="mb-4 px-4 py-2 bg-gray-500 hover:bg-gray-700 text-white rounded">
        Quay lại
      </button>
        
       
      {pendingEvents.length > 0 ? (
        pendingEvents.map((event) => (
          <div key={event.id} className="p-4 border rounded-lg shadow-md bg-white mb-4">
            <h3 className="text-lg font-semibold">{event.title}</h3>
            <p className="text-gray-600">Ngày: {event.date}</p>
            <p className="text-gray-600">Địa điểm: {event.location}</p>
            <p className="text-gray-600">Người tạo: {event.createdBy}</p>
            <p className="text-gray-600">Mô tả: {event.description}</p>
            <div className="flex mt-2 space-x-2">
              <button 
                onClick={() => handleApproveEvent(event.id, true)} 
                className="px-4 py-2 bg-green-500 hover:bg-green-700 text-white rounded">
                Duyệt
              </button>
              <button 
                onClick={() => handleApproveEvent(event.id, false)} 
                className="px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded">
                Từ chối
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500">Không có đơn phê duyệt nào.</p>
      )}
    </div>
  );
}
