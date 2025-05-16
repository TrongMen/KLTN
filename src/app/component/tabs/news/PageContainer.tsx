// Ví dụ: src/app/admin/news/PageContainer.tsx (hoặc tên tương tự)
"use client";

import React, { useState, useEffect, useCallback } from "react";
import NewsTabContent from "../../tabs/NewsTabContent"; // Giả sử đường dẫn này
import CreateNewsModal from "../../modals/CreateNewsModal"; // Giả sử đường dẫn này
import { NewsItem, User } from "../../types/appTypes"; // Giả sử đường dẫn này
import { toast } from "react-hot-toast";

// Hàm giả lập lấy thông tin người dùng hiện tại
const fetchCurrentUser = async (): Promise<User | null> => {
  // Trong ứng dụng thực tế, bạn sẽ gọi API hoặc lấy từ context/localStorage
  // Ví dụ: lấy từ localStorage
  const storedUser = localStorage.getItem("currentUserData"); // Thay "currentUserData" bằng key bạn dùng
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser) as User;
      if (parsedUser && parsedUser.id) return parsedUser;
    } catch (e) {
      console.error("Lỗi parse user từ localStorage", e);
    }
  }
  // Hoặc gọi API:
  // const token = localStorage.getItem("authToken");
  // if (token) {
  //   const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}`}});
  //   if (response.ok) return await response.json();
  // }
  return null; 
};

// Hàm giả lập làm mới token
const exampleRefreshToken = async (): Promise<string | null> => {
  // Logic thực tế để gọi API làm mới token
  // Ví dụ:
  // const response = await fetch('/api/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') }) });
  // if (response.ok) {
  //   const { accessToken } = await response.json();
  //   localStorage.setItem('authToken', accessToken);
  //   return accessToken;
  // }
  // toast.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.");
  return null;
};


const PageContainer = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null); // State cho user hiện tại

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch current user khi component được mount
  useEffect(() => {
    const loadUser = async () => {
      const user = await fetchCurrentUser();
      if (user) {
        setCurrentUser(user);
      } else {
        // Xử lý trường hợp không có user (ví dụ: chuyển hướng đến trang đăng nhập)
        // Hoặc nếu ứng dụng cho phép xem không cần đăng nhập, currentUser sẽ là null
        console.warn("Không có người dùng nào được đăng nhập.");
      }
    };
    loadUser();
  }, []);

  // Hàm fetch danh sách tin tức (ví dụ)
  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Thay thế bằng API call thực tế của bạn
      const response = await fetch("http://localhost:8080/identity/api/news/status?status=APPROVED");
      if (!response.ok) throw new Error("Lỗi tải danh sách tin tức");
      const data = await response.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setNewsItems(data.result);
      } else {
        throw new Error(data.message || "Dữ liệu không hợp lệ");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);


  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: NewsItem) => {
    setEditingItem(item);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleActionSuccess = (updatedOrCreatedItem?: NewsItem) => {
    // Sau khi tạo/sửa thành công, làm mới danh sách tin tức
    fetchNews(); 
    // Có thể bạn muốn cập nhật state newsItems trực tiếp với updatedOrCreatedItem
    // để giao diện cập nhật nhanh hơn thay vì fetch lại toàn bộ.
  };

  const handleNewsDeleted = () => {
    fetchNews(); // Làm mới danh sách sau khi xóa
  };

  return (
    <div>
      <NewsTabContent
        newsItems={newsItems}
        isLoading={isLoading}
        error={error}
        user={currentUser} // <<<< Truyền currentUser xuống NewsTabContent
        onOpenCreateModal={handleOpenCreateModal}
        onOpenEditModal={handleOpenEditModal}
        onNewsDeleted={handleNewsDeleted}
        refreshToken={exampleRefreshToken}
        onRefreshNews={fetchNews}
      />

      {isModalOpen && (
        <CreateNewsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onActionSuccess={handleActionSuccess}
          editMode={isEditMode}
          initialData={editingItem}
          user={currentUser} // <<<< QUAN TRỌNG: Truyền currentUser xuống CreateNewsModal
          refreshToken={exampleRefreshToken}
        />
      )}
    </div>
  );
};

export default PageContainer;