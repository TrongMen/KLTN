"use client";

import React from 'react';
import { EventDisplayInfo as MainEventInfo, NewsItem as MainNewsItem, User } from "../types/appTypes"; // Adjust paths


type EventType = MainEventInfo & { status?: string; rejectionReason?: string | null; createdBy?: string; content?: string; purpose?: string; time?: string };
type NewsItemType = MainNewsItem & { status?: string; rejectionReason?: string | null; createdBy?: { id: string; firstName?: string; lastName?: string; avatar?: string }; content?: string; coverImageUrl?: string; createdAt?: string; publishedAt?: string | null; event?: { id: string; name?: string } | null };

interface ApprovalItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: EventType | NewsItemType | null;
}


function isEvent(item: EventType | NewsItemType | null): item is EventType {
    
    return item !== null && 'name' in item;
}


const RenderHtmlContent: React.FC<{ htmlString?: string }> = ({ htmlString }) => {
    if (!htmlString) return <p className="text-gray-500 italic">Không có nội dung.</p>;
    
    return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: htmlString }} />;
};

const ApprovalItemDetailModal: React.FC<ApprovalItemDetailModalProps> = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null;

    const isEventItem = isEvent(item);
    const title = isEventItem ? item.name : item.title;
    const status = item.status;
    const rejectionReason = item.rejectionReason;
    const createdAt = isEventItem ? (item as any).createdAt : item.createdAt;
    const createdBy = isEventItem ? (item as any).createdBy : item.createdBy; 

    const formatDetailDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
        } catch {
            return 'Ngày không hợp lệ';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800">Chi tiết {isEventItem ? 'Sự kiện' : 'Bảng tin'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>

                <div className="p-5 overflow-y-auto flex-grow">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>

                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4 border-b pb-3">
                        <p><strong className="text-gray-600">ID:</strong> <span className="text-gray-800 break-all">{item.id}</span></p>
                        <p><strong className="text-gray-600">Trạng thái:</strong>
                            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status === 'APPROVED' ? 'bg-green-100 text-green-800' : status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {status || 'N/A'}
                            </span>
                        </p>
                        <p><strong className="text-gray-600">Ngày tạo:</strong> <span className="text-gray-800">{formatDetailDate(createdAt)}</span></p>
                        {status === 'REJECTED' && rejectionReason && (
                             <p className="sm:col-span-2"><strong className="text-red-600">Lý do từ chối:</strong> <span className="text-red-700">{rejectionReason}</span></p>
                        )}
                        {!isEventItem && item.publishedAt && (
                             <p><strong className="text-gray-600">Ngày đăng:</strong> <span className="text-gray-800">{formatDetailDate(item.publishedAt)}</span></p>
                        )}
                        
                         <div className="sm:col-span-2 pt-2 mt-2 border-t border-dashed">
                            <strong className="text-gray-600 block mb-1">Người tạo:</strong>
                            {typeof createdBy === 'string' ? (
                                <span className="text-gray-700 italic">(ID: {createdBy})</span> // For Events, only ID is available directly
                            ) : createdBy ? (
                                <div className="flex items-center gap-2">
                                    <img src={createdBy.avatar || '/default-avatar.png'} alt="Avatar" className="w-6 h-6 rounded-full object-cover"/>
                                    <span className="text-gray-800">{createdBy.firstName || ''} {createdBy.lastName || ''} ({createdBy.username || 'N/A'})</span>
                                </div>
                            ) : (
                                <span className="text-gray-500 italic">Không rõ</span>
                            )}
                         </div>
                    </div>


                    
                    {isEventItem && (
                        <div className="space-y-2 text-sm mb-4">
                             {item.time && <p><strong className="text-gray-600">Thời gian:</strong> <span className="text-gray-800">{formatDetailDate(item.time)}</span></p>}
                             {item.location && <p><strong className="text-gray-600">Địa điểm:</strong> <span className="text-gray-800">{item.location}</span></p>}
                             {item.purpose && <p><strong className="text-gray-600">Mục đích:</strong> <span className="text-gray-800">{item.purpose}</span></p>}
                             {item.content && (
                                 <div>
                                     <strong className="text-gray-600 block mb-1">Nội dung/Mô tả:</strong>
                                     <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                         <RenderHtmlContent htmlString={item.content} />
                                     </div>
                                 </div>
                             )}
                             {/* Add attendees/organizers count or list if needed */}
                        </div>
                    )}

                    {/* News Specific Details */}
                    {!isEventItem && (
                        <div className="space-y-3 text-sm">
                            {item.coverImageUrl && (
                                <div>
                                    <strong className="text-gray-600 block mb-1">Ảnh bìa:</strong>
                                    <img src={item.coverImageUrl} alt={`Ảnh bìa cho ${title}`} className="max-w-full h-auto rounded border border-gray-200"/>
                                </div>
                            )}
                             {item.event && (
                                <p><strong className="text-gray-600">Sự kiện liên quan:</strong> <span className="text-blue-600 font-medium">{item.event.name || `(ID: ${item.event.id})`}</span></p>
                             )}
                             {item.content && (
                                 <div>
                                     <strong className="text-gray-600 block mb-1">Nội dung chi tiết:</strong>
                                      <div className="p-3 bg-gray-50 rounded border border-gray-200">
                                          <RenderHtmlContent htmlString={item.content} />
                                     </div>
                                 </div>
                             )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 text-right flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApprovalItemDetailModal;