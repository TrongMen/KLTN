import React from "react";

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  imageUrl?: string;
}

interface NewsFeedSectionProps {
  newsItems: NewsItem[];
  isLoading: boolean;
  error: string | null;
  onOpenCreateModal: () => void;
}

const NewsFeedSection: React.FC<NewsFeedSectionProps> = ({
  newsItems,
  isLoading,
  error,
  onOpenCreateModal,
}) => {
  if (isLoading) {
    return (
      <p className="text-center text-gray-500 italic py-6">
        Đang tải bảng tin...
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200 mt-6">
        {error}
      </p>
    );
  }

  const safeNewsItems = Array.isArray(newsItems) ? newsItems : [];
  const sortedNews = [...safeNewsItems].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="mt-10 pt-6 border-t border-gray-200">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-green-600">📰 Bảng tin</h2>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 transition duration-150"
        >
          + Tạo Bảng Tin
        </button>
      </div>

      {sortedNews.length > 0 ? (
        <div className="space-y-4">
          {sortedNews.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white shadow rounded-lg border border-gray-100 hover:shadow-md transition-shadow duration-150"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-32 object-cover rounded mb-3"
                />
              )}
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{item.summary}</p>
              <p className="text-xs text-gray-400">
                {new Date(item.date).toLocaleDateString("vi-VN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4 italic">
          Không có tin tức nào để hiển thị.
        </p>
      )}
    </div>
  );
};

export default NewsFeedSection;
export type { NewsItem };