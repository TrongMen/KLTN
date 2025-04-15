
import React from "react";
import { useState, useEffect } from "react";

interface Attendee {
  name: string;
  role: "Sinh viên" | "Giảng viên";
}

interface ModalAttendeesProps {
  onClose: () => void;
  attendees: Attendee[]; // danh sách truyền vào
}

export default function ModalAttendees({ onClose, attendees }: ModalAttendeesProps) {
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const toggleAttendance = (name: string) => {
    setAttendance((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60  bg-opacity-30 flex items-center justify-center">
      <div className="relative bg-white p-6 rounded-2xl shadow-xl w-[90%] max-w-4xl min-h-[300px] max-h-[90vh] overflow-y-auto">
      <div className="flex justify-end items-center mb-4">
          <button
            onClick={onClose}
            className="text-red-500 text-xl font-bold cursor-pointer"
            title="Đóng"
          >
            ✖
          </button>
        </div>
        <h2 className="text-2xl font-bold text-center text-blue-600 mb-4">
          👥 Người tham gia
        </h2>
        {/* Nội dung danh sách người tham gia */}
        {/* Danh sách người tham gia */}
        {attendees.length === 0 ? (
          <p className="text-center text-gray-500 italic">Chưa có người đăng ký.</p>
        ) : (
          <div className="space-y-4">
            {attendees.map((attendee, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm border"
              >
                <div>
                  <p className="font-semibold">{attendee.name}</p>
                  <p className="text-sm text-gray-500">🔖 {attendee.role}</p>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={attendance[attendee.name] || false}
                    onChange={() => toggleAttendance(attendee.name)}
                    className="w-5 h-5 text-green-500 focus:ring-green-400 rounded"
                  />
                  <span className="text-sm">Đã điểm danh</span>
                </label>
              </div>
            ))}
          </div>
        )}

       
        <div className="absolute bottom-4 right-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-500 hover:bg-red-700 text-white rounded-lg shadow transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

