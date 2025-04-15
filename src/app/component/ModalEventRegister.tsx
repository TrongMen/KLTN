// components/ModalRegisteredEvents.tsx
import React from "react";

export default function ModalEventRegister({ onClose, events = [] }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 bg-opacity-40">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl relative">
        <h2 className="text-2xl font-bold text-blue-600 mb-4">
          📋 Sự kiện đã đăng ký
        </h2>

        {events.length > 0 ? (
          <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {events.map((event) => (
              <li
                key={event.id}
                className="border border-gray-200 p-4 rounded-lg shadow-sm bg-gray-50"
              >
                <h3 className="text-lg font-semibold text-gray-800">
                  {event.title}
                </h3>
                <p className="text-gray-600">📅 {event.date}</p>
                <p className="text-gray-600">📍 {event.location}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Bạn chưa đăng ký sự kiện nào.</p>
        )}

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xl"
        >
          ✖
        </button>
      </div>
    </div>
  );
}
