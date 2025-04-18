"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
const mockPendingEvents = [
  {
    id: 101,
    title: "Talkshow UI/UX",
    date: "2025-05-20",
    location: "Hội trường B",
    description: "Chia sẻ về thiết kế giao diện người dùng hiện đại.",
    speaker: "Designer Dũng",
  },
  {
    id: 102,
    title: "Giới thiệu ngành Blockchain",
    date: "2025-06-10",
    location: "Phòng Lab 5",
    description: "Kiến thức nền tảng về công nghệ Blockchain.",
    speaker: "Chuyên gia Hòa",
  },
];

type Event = typeof mockPendingEvents[number];

export default function ModalApproval({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [pendingEvents, setPendingEvents] = useState<Event[]>(mockPendingEvents);
  const [approvedEvents, setApprovedEvents] = useState<Event[]>([]);
  const [rejectedEvents, setRejectedEvents] = useState<Event[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (event: Event) => {
    setPendingEvents(pendingEvents.filter((e) => e.id !== event.id));
    setApprovedEvents([...approvedEvents, event]);
    toast("✅ Đã phê duyệt sự kiện!");
  };

  const openRejectModal = (event: Event) => {
    setCurrentEvent(event);
    setShowRejectModal(true);
  };

  const handleReject = () => {
    if (!currentEvent) return;
    
    if (!rejectReason.trim()) {
      alert("Vui lòng nhập lý do từ chối!");
      return;
    }

    setPendingEvents(pendingEvents.filter((e) => e.id !== currentEvent.id));
    setRejectedEvents([...rejectedEvents, {
      ...currentEvent,
      rejectReason // Lưu lý do từ chối vào sự kiện
    }]);
    
    alert(`❌ Đã từ chối sự kiện. Lý do: ${rejectReason}`);
    setShowRejectModal(false);
    setRejectReason("");
    setCurrentEvent(null);
  };

  const renderEventList = (events: Event[], showActions = false) => {
    if (events.length === 0) {
      return <p className="text-center text-gray-600">Không có sự kiện nào.</p>;
    }

    return (
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {events.map((event) => (
          <div
            key={event.id}
            className="border p-4 rounded-lg shadow-sm bg-gray-50 hover:bg-gray-100 transition"
          >
            <h3 className="font-semibold text-lg">{event.title}</h3>
            <p className="text-sm text-gray-600">📅 {event.date}</p>
            <p className="text-sm text-gray-600">📍 {event.location}</p>
            <p className="text-sm text-gray-600">🎤 {event.speaker}</p>
            <p className="text-sm text-gray-600">📜 {event.description}</p>
            {'rejectReason' in event && (
              <p className="text-sm text-red-600 mt-2">
                <span className="font-medium">Lý do từ chối:</span> {event.rejectReason}
              </p>
            )}
            {showActions && (
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => openRejectModal(event)}
                  className="px-3 cursor-pointer py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Từ chối
                </button>
                <button
                  onClick={() => handleApprove(event)}
                  className="px-3 cursor-pointer py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Phê duyệt
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
        <div className="bg-white w-full max-w-3xl p-6 rounded-xl shadow-xl relative">
          <h2 className="text-2xl font-bold mb-4 text-blue-700">📅 Phê duyệt sự kiện</h2>
          <button
            onClick={onClose}
            className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-red-600 text-xl"
          >
            ✕
          </button>

          <div className="flex justify-center mb-4 gap-3">
            <button
              onClick={() => setTab("pending")}
              className={`px-4 py-2 rounded-lg font-medium cursor-pointer ${
                tab === "pending" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Đang chờ duyệt
            </button>
            <button
              onClick={() => setTab("approved")}
              className={`px-4 py-2 rounded-lg font-medium cursor-pointer ${
                tab === "approved" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Đã phê duyệt
            </button>
            <button
              onClick={() => setTab("rejected")}
              className={`px-4 py-2 rounded-lg font-medium cursor-pointer ${
                tab === "rejected" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-700"
              }`}
            >
              Đã từ chối
            </button>
          </div>

          {tab === "pending" && renderEventList(pendingEvents, true)}
          {tab === "approved" && renderEventList(approvedEvents)}
          {tab === "rejected" && renderEventList(rejectedEvents)}
        </div>
      </div>

      {/* Modal nhập lý do từ chối */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-md p-6 rounded-xl shadow-xl relative">
            <h3 className="text-xl font-bold mb-4 text-red-600">Nhập lý do từ chối</h3>
            <button
              onClick={() => {
                setShowRejectModal(false);
                setRejectReason("");
              }}
              className="absolute cursor-pointer top-3 right-3 text-gray-500 hover:text-red-600 text-xl"
            >
              ✕
            </button>

            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Lý do từ chối:</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-500"
                rows={4}
                placeholder="Nhập lý do từ chối sự kiện này..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}