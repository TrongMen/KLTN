// components/MyEventsModal.tsx
import React, { useState } from "react";
import Link from "next/link";
export default function ModalEvent({ onClose }) {
  const [tab, setTab] = useState("approved");

  const events = {
    approved: [
      { title: "Sự kiện đã duyệt 1", date: "2025-04-10" },
      { title: "Sự kiện đã duyệt 2", date: "2025-04-12" },
    ],
    pending: [
      { title: "Sự kiện chờ duyệt 1", date: "2025-04-15" },
    ],
    rejected: [
      { title: "Sự kiện bị từ chối", date: "2025-04-08" },
    ],
  };

 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-3xl p-6 flex flex-col justify-between max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-600">Sự kiện của tôi</h2>
          <button
            onClick={onClose}
            className="text-red-500 text-xl font-bold cursor-pointer"
            title="Đóng"
          >
            ✖
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-4 border-b">
          <button
            onClick={() => setTab("approved")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "approved" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500"
            }`}
          >
            ✅ Đã duyệt
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "pending" ? "border-b-2 border-yellow-500 text-yellow-600" : "text-gray-500"
            }`}
          >
            ⏳ Chờ duyệt
          </button>
          <button
            onClick={() => setTab("rejected")}
            className={`pb-2 font-semibold cursor-pointer ${
              tab === "rejected" ? "border-b-2 border-red-500 text-red-600" : "text-gray-500"
            }`}
          >
            ❌ Không được duyệt
          </button>
        </div>

        {/* Events List */}
        <div className="space-y-2 overflow-y-auto flex-1 mb-6">
          {events[tab].map((event, idx) => (
            <div
              key={idx}
              className="p-4 bg-gray-100 rounded-md shadow-sm border border-gray-300"
            >
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-gray-600">📅 {event.date}</p>
            </div>
          ))}
          {events[tab].length === 0 && (
            <p className="text-gray-400 italic">Không có sự kiện nào.</p>
          )}
        </div>

        {/* Bottom buttons */}
        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md"
          >
            Đóng
          </button>
          <Link href="/event">
          <button
           
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md cursor-pointer"
          >
            + Tạo sự kiện
          </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
