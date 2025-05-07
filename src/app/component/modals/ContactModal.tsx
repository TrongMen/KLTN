"use client";

import React from "react";

interface ContactModalProps {
  onClose: () => void;
}

export default function ContactModal({ onClose }: ContactModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 bg-opacity-40">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-600">📞 Liên hệ</h2>
          <button
            className="text-gray-600 hover:text-red-500 text-2xl cursor-pointer"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <p className="text-gray-700 mb-4">
          Nếu bạn có thắc mắc hoặc cần hỗ trợ, vui lòng liên hệ qua thông tin
          dưới đây:
        </p>
        <ul className="space-y-3 text-gray-600">
          <li>
            <span className="font-semibold">📧 Email:</span>{" "}
            htm2810002@gmail.com || nguyenvietmanh@gmail.com
          </li>
          <li>
            <span className="font-semibold">📱 Điện thoại:</span> 0123 456 789
            hoặc 0789 456 123
          </li>
          <li>
            <span className="font-semibold">🏫 Địa chỉ:</span>   51 Nguyễn Văn
            Bảo, phường 1, quận Gò Vấp, TPHCM
          </li>
          <li>
            <span className="font-semibold">🏫 Văn phòng:</span> Tòa nhà A,
            Trường Đại học Công Nghiệp TPHCM
          </li>
        </ul>
      </div>
    </div>
  );
}
