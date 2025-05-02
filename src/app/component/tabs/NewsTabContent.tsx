"use client";

import React from "react";
import Image from "next/image";
import { NewsItem } from "../homeuser";
import { ReloadIcon, PersonIcon, CalendarIcon } from "@radix-ui/react-icons";

interface NewsTabContentProps {
  newsItems: NewsItem[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "N/A";
  }
};

const NewsTabContent: React.FC<NewsTabContentProps> = ({
  newsItems,
  isLoading,
  error,
  onRefresh,
}) => {
  const renderNewsItem = (item: NewsItem) => (
    <div
      key={item.id}
      className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-150 flex flex-col"
    >
      {item.imageUrl && (
        <div className="relative w-full h-48">
          <Image
            src={item.imageUrl}
            alt={item.title}
            layout="fill"
            objectFit="cover"
            className="bg-gray-100"
           
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
          {item.title}
        </h3>
        {item.summary && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-3 flex-grow">
            {item.summary}
          </p>
        )}
        <div className="mt-auto text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-100">
          <p className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
            <span>{formatDate(item.publishedAt || item.createdAt)}</span>
          </p>
          {item.createdBy && (
            <p className="flex items-center gap-1.5">
              <PersonIcon className="w-3.5 h-3.5 opacity-70" />
              <span>
                {item.createdBy.lastName} {item.createdBy.firstName} (
                {item.createdBy.username})
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-1">
      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-200">
        <h2 className="text-xl md:text-2xl font-bold text-orange-600">
          Tin tức & Thông báo
        </h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Làm mới danh sách"
          className={`p-2 rounded-md border transition duration-150 ease-in-out ${
            isLoading
              ? "cursor-not-allowed opacity-50"
              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-400"
          }`}
        >
          <ReloadIcon
            className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {isLoading && (
        <p className="text-center text-gray-500 italic py-5">
          Đang tải tin tức...
        </p>
      )}
      {error && (
        <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
          {error}
        </p>
      )}

      {!isLoading && !error && newsItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {newsItems.map(renderNewsItem)}
        </div>
      )}

      {!isLoading && !error && newsItems.length === 0 && (
        <p className="text-center text-gray-500 italic py-5">
          Chưa có tin tức nào.
        </p>
      )}
    </div>
  );
};

export default NewsTabContent;
