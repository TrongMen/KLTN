import React, 'react';
import { useState, useEffect } from 'react';
import ApproveItem from './ApproveItem'; // Đảm bảo đường dẫn đúng
import styles from './ApproveList.module.css'; // Optional: CSS Modules cho styling

const API_BASE_URL = 'http://localhost:8080/identity/api'; // Định nghĩa URL gốc

function ApproveList() {
    const [newsList, setNewsList] = useState([]); // Lưu danh sách tin tức
    const [loading, setLoading] = useState(true); // Trạng thái loading
    const [error, setError] = useState(null); // Lưu lỗi nếu có
    const [currentPage, setCurrentPage] = useState(0); // Trang hiện tại (bắt đầu từ 0)
    const [totalPages, setTotalPages] = useState(0); // Tổng số trang
    const [currentStatus, setCurrentStatus] = useState('PENDING'); // Trạng thái mặc định
    const pageSize = 10; // Số lượng item mỗi trang

    // Hàm gọi API
    const fetchNews = async (status, page, size) => {
        setLoading(true); // Bắt đầu loading
        setError(null); // Reset lỗi
        try {
            // Xây dựng URL với các tham số query
            const url = `${API_BASE_URL}/news/status/paged?status=${status}&page=${page}&size=${size}`;
            console.log(`Workspaceing data from: ${url}`); // Log URL để kiểm tra

            const response = await fetch(url);

            if (!response.ok) {
                // Nếu response không thành công (VD: lỗi 4xx, 5xx)
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.code === 1000 && data.result) {
                // Cập nhật state với dữ liệu từ API
                setNewsList(data.result.content || []); // Lấy danh sách tin tức
                setTotalPages(data.result.totalPages || 0); // Lấy tổng số trang
                setCurrentPage(data.result.number || 0); // Cập nhật trang hiện tại từ response (đảm bảo đồng bộ)
                 console.log("Fetched data:", data.result); // Log dữ liệu nhận được
            } else {
                // Nếu API trả về code lỗi hoặc không có result
                throw new Error(data.message || 'Lỗi không xác định từ API');
            }
        } catch (err) {
            console.error("Lỗi khi fetch dữ liệu:", err);
            setError(err.message); // Lưu thông báo lỗi
            setNewsList([]); // Xóa danh sách cũ khi có lỗi
            setTotalPages(0);
        } finally {
            setLoading(false); // Kết thúc loading dù thành công hay thất bại
        }
    };

    // useEffect để gọi API khi component mount hoặc khi trang/status thay đổi
    useEffect(() => {
        fetchNews(currentStatus, currentPage, pageSize);
    }, [currentStatus, currentPage]); // Dependencies: chạy lại khi status hoặc page thay đổi

    // Hàm xử lý chuyển trang tiếp theo
    const handleNextPage = () => {
        // Chỉ tăng nếu trang hiện tại nhỏ hơn trang cuối cùng
        if (currentPage < totalPages - 1) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    // Hàm xử lý chuyển trang trước đó
    const handlePrevPage = () => {
        // Chỉ giảm nếu trang hiện tại lớn hơn 0
        if (currentPage > 0) {
            setCurrentPage(prevPage => prevPage - 1);
        }
    };

    // Hàm xử lý thay đổi trạng thái (ví dụ: thêm các nút PENDING, APPROVED, REJECTED)
    const handleStatusChange = (newStatus) => {
        setCurrentStatus(newStatus);
        setCurrentPage(0); // Reset về trang đầu tiên khi đổi trạng thái
    };

    // --- Render UI ---
    if (loading) {
        return <div className={styles.loading}>Đang tải dữ liệu...</div>;
    }

    if (error) {
        return <div className={styles.error}>Lỗi: {error}</div>;
    }

    return (
        <div className={styles.approveListContainer}>
            {/* (Optional) Thêm các nút để đổi trạng thái */}
             <div className={styles.statusFilter}>
                <button onClick={() => handleStatusChange('PENDING')} disabled={currentStatus === 'PENDING'}>Chờ duyệt</button>
                <button onClick={() => handleStatusChange('APPROVED')} disabled={currentStatus === 'APPROVED'}>Đã duyệt</button>
                <button onClick={() => handleStatusChange('REJECTED')} disabled={currentStatus === 'REJECTED'}>Đã từ chối</button>
             </div>


            <h1>Danh sách tin tức ({currentStatus}) - Trang {currentPage + 1}/{totalPages}</h1>

            {newsList.length === 0 ? (
                <p>Không có tin tức nào.</p>
            ) : (
                <ul className={styles.list}>
                    {newsList.map((newsItem) => (
                        <ApproveItem
                            key={newsItem.id} // Key là bắt buộc và phải là duy nhất
                            news={newsItem}   // Truyền toàn bộ object newsItem xuống
                            // Bạn cũng có thể truyền các hàm xử lý (Approve, Reject) nếu cần
                            // onApprove={() => handleApprove(newsItem.id)}
                            // onReject={() => handleReject(newsItem.id)}
                        />
                    ))}
                </ul>
            )}

            {/* Phần điều khiển phân trang */}
            <div className={styles.pagination}>
                <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 0} // Disable nếu đang ở trang đầu
                >
                    Trang trước
                </button>
                <span> Trang {currentPage + 1} / {totalPages} </span>
                <button
                    onClick={handleNextPage}
                    disabled={currentPage >= totalPages - 1} // Disable nếu đang ở trang cuối
                >
                    Trang sau
                </button>
            </div>
        </div>
    );
}

export default ApproveList;