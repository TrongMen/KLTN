"use client";

import React from "react";

interface AboutModalProps {
  onClose: () => void;
}

export default function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 bg-opacity-40">
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-green-600">🌐 Giới thiệu</h2>
          <button
            className="text-gray-600 hover:text-red-500 text-2xl cursor-pointer"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <p className="text-gray-700 mb-4">
          Chào mừng bạn đến với nền tảng <span className="font-semibold text-blue-600">Quản lý Sự kiện Câu lạc bộ</span>! Đây là trang web được xây dựng nhằm hỗ trợ việc tổ chức, quản lý và tham gia các sự kiện trong các câu lạc bộ, đặc biệt tại môi trường đại học.
        </p>
        <ul className="space-y-3 text-gray-600">
          <li>
            ✅ Tạo, chỉnh sửa và phê duyệt sự kiện một cách dễ dàng.
          </li>
          <li>
            ✅ Quản lý thành viên, ban tổ chức và vai trò rõ ràng.
          </li>
          <li>
            ✅ Đăng ký tham gia sự kiện nhanh chóng, tiện lợi.
          </li>
          <li>
            ✅ Hiển thị sự kiện nổi bật lên bảng tin chung cho sinh viên và giảng viên.
          </li>
        </ul>
        <p className="text-gray-700 mt-4">
          Với giao diện thân thiện và chức năng linh hoạt, nền tảng này mong muốn nâng cao hiệu quả hoạt động câu lạc bộ và kết nối cộng đồng sinh viên.
        </p>
      </div>
    </div>
  );
}
