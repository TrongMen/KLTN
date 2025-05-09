"use client";

import React from "react";
import { NewsItem, User } from "../homeuser"; // Điều chỉnh đường dẫn nếu cần
import { Cross1Icon, Pencil1Icon, TrashIcon } from "@radix-ui/react-icons";
import Image from "next/image";

interface NewsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: NewsItem | null;
  user: User | null;
  onTriggerEdit: (item: NewsItem) => void;
  onTriggerDelete: (item: NewsItem) => void;
}

const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  user,
  onTriggerEdit,
  onTriggerDelete,
}) => {
  if (!isOpen || !item) return null;

  const isCreator = user?.id === item.createdBy?.id;
  const isAdmin = user?.roles?.some((role) => role.name === "ADMIN");

  const canUpdate = isCreator && item.status === "APPROVED";
  const canDelete = isAdmin || isCreator;

  const handleEdit = () => {
    if (canUpdate) {
      onTriggerEdit(item);
    }
  };

  const handleDelete = () => {
    if (canDelete) {
      onTriggerDelete(item);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-0 flex flex-col max-h-[90vh] transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
          <h2
            className="text-xl font-semibold text-gray-800 truncate pr-4"
            title={item.title || "Chi tiết tin tức"}
          >
            {item.title || "Chi tiết tin tức"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 cursor-pointer hover:text-red-600 transition-colors p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Cross1Icon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {item.imageUrl && (
            <div className="mb-4 relative w-full aspect-video rounded overflow-hidden bg-gray-100 max-h-[400px]">
              <Image
                src={item.imageUrl}
                alt={item.title || "Hình ảnh tin tức"}
                layout="fill"
                objectFit="contain"
                className="bg-gray-100"
              />
            </div>
          )}
          <div className="text-xs text-gray-500">
            <span>
              Ngày đăng:{" "}
              {new Date(
                item.date || item.createdAt || Date.now()
              ).toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {item.createdBy && (
              <span className="ml-2">
                | Người tạo:{" "}
                {`${item.createdBy.lastName || ""} ${
                  item.createdBy.firstName || ""
                }`.trim() || item.createdBy.username}
              </span>
            )}
          </div>

          <div
            className="prose prose-sm sm:prose lg:prose-lg max-w-none tiptap-rendered-content"
            dangerouslySetInnerHTML={{ __html: item.content || "" }}
          />
        </div>

        <div className="px-6 py-4 border-t flex justify-end items-center gap-3 sticky bottom-0 bg-white z-10 rounded-b-lg">
          {user && canUpdate && (
            <button
              onClick={handleEdit}
              className="px-5 cursor-pointer py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition text-sm font-medium flex items-center gap-1.5"
            >
              <Pencil1Icon className="h-4 w-4" />
              Sửa
            </button>
          )}
          {user && canDelete && (
            <button
              onClick={handleDelete}
              className="px-5 cursor-pointer py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition text-sm font-medium flex items-center gap-1.5"
            >
              <TrashIcon className="h-4 w-4" />
              Xóa
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 cursor-pointer py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm transition text-sm font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsDetailModal;
