import React from 'react';
import styles from './ApproveItem.module.css'; // Optional: CSS Modules

// Hàm tiện ích để định dạng ngày tháng (có thể đặt ở file riêng)
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
         // Ví dụ định dạng: Ngày/Tháng/Năm Giờ:Phút
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return dateString; // Trả về chuỗi gốc nếu lỗi
    }
};


function ApproveItem({ news /*, onApprove, onReject */ }) {
    // Kiểm tra xem prop news có tồn tại không
    if (!news) {
        return <li className={styles.errorItem}>Dữ liệu tin tức không hợp lệ</li>;
    }

    // Destructure các trường cần thiết từ news object
    const {
        id,
        title,
        coverImageUrl,
        createdAt,
        status,
        createdBy, // Đây là một object
        event,     // Cũng là một object, có thể là null
        rejectionReason // Lý do từ chối, có thể là null
    } = news;

    // Lấy thông tin người tạo (nếu có)
    const creatorName = createdBy ? `${createdBy.lastName || ''} ${createdBy.firstName || ''}`.trim() || createdBy.username || 'Không rõ' : 'Không rõ';
    const creatorAvatar = createdBy?.avatar; // Lấy avatar nếu có

    // Lấy thông tin sự kiện (nếu có)
    const eventInfo = event ? `${event.name} (${formatDate(event.time)} tại ${event.location})` : 'Không thuộc sự kiện nào';

    return (
        <li className={`${styles.approveItem} ${styles[`status${status}`]}`}> {/* Thêm class theo status */}
            <div className={styles.itemContent}>
                {coverImageUrl && (
                    <img src={coverImageUrl} alt={`Ảnh bìa cho ${title}`} className={styles.coverImage} />
                )}
                <div className={styles.details}>
                    <h3 className={styles.title}>{title || 'Không có tiêu đề'}</h3>
                    <p className={styles.meta}>
                        <span className={styles.statusBadge}>{status}</span> - Tạo lúc: {formatDate(createdAt)}
                    </p>
                    <p className={styles.meta}>
                        Người tạo: {creatorName}
                        {creatorAvatar && <img src={creatorAvatar} alt={`Avatar của ${creatorName}`} className={styles.avatar} />}
                    </p>
                    <p className={styles.meta}>Sự kiện: {eventInfo}</p>
                     {/* Hiển thị lý do từ chối nếu có */}
                     {status === 'REJECTED' && rejectionReason && (
                         <p className={styles.rejection}>Lý do từ chối: {rejectionReason}</p>
                     )}

                     {/* Thêm các nút hành động nếu cần */}
                     {status === 'PENDING' && (
                         <div className={styles.actions}>
                             {/* <button onClick={() => onApprove(id)} className={styles.approveButton}>Duyệt</button> */}
                             {/* <button onClick={() => onReject(id)} className={styles.rejectButton}>Từ chối</button> */}
                             <button className={styles.actionButton}>Duyệt</button> {/* Placeholder */}
                              <button className={styles.actionButton}>Từ chối</button> {/* Placeholder */}
                         </div>
                     )}
                </div>
            </div>
        </li>
    );
}

export default ApproveItem;