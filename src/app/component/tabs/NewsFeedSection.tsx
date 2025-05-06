// "use client";

// import React, { useState, useMemo } from "react";
// import Image from "next/image";
// import { toast } from "react-hot-toast";
// import { NewsItem, User } from "../homeuser";
// import { ConfirmationDialog } from "../../../utils/ConfirmationDialog";

// import { Pencil1Icon, TrashIcon, ReloadIcon, PersonIcon, MagnifyingGlassIcon } from '@radix-ui/react-icons';

// interface NewsFeedSectionProps {
//   newsItems: NewsItem[];
//   isLoading: boolean;
//   error: string | null;
//   user: User | null;
//   onOpenCreateModal: () => void;
//   onOpenEditModal: (item: NewsItem) => void;
//   onNewsDeleted: () => void;
//   refreshToken?: () => Promise<string | null>;
// }

// const getCreatorName = (creator: NewsItem['createdBy']): string => {
//     if (!creator) return 'Người tạo ẩn danh';
//     const fullName = `${creator.lastName || ''} ${creator.firstName || ''}`.trim();
//     return fullName || creator.username || 'Người tạo ẩn danh';
// };

// const NewsFeedSection: React.FC<NewsFeedSectionProps> = ({
//   newsItems,
//   isLoading,
//   error,
//   user,
//   onOpenCreateModal,
//   onOpenEditModal,
//   onNewsDeleted,
//   refreshToken,
// }) => {
//   const [isDeleting, setIsDeleting] = useState<string | null>(null);
//   const [confirmationState, setConfirmationState] = useState<{
//     isOpen: boolean;
//     newsItemToDelete: NewsItem | null;
//   }>({ isOpen: false, newsItemToDelete: null });
//   const [searchTerm, setSearchTerm] = useState<string>("");
//   const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
//   const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);

//   const handleOpenDetailModal = (item: NewsItem) => {
//       setSelectedNewsItem(item);
//       setIsDetailModalOpen(true);
//   };

//   const handleCloseDetailModal = () => {
//       setIsDetailModalOpen(false);
//       setSelectedNewsItem(null);
//   };

//   const handleDeleteClick = (newsItem: NewsItem) => {
//      if (!user) {
//        toast.error("Vui lòng đăng nhập.");
//        return;
//      }
//      const isAdmin = user?.roles?.some((role) => role.name === "ADMIN" || role.name === "USER");
//      if (!isAdmin) {
//        toast.error("Bạn không có quyền xóa tin tức này.");
//        return;
//      }
//      setConfirmationState({ isOpen: true, newsItemToDelete: newsItem });
//   };

//   const handleConfirmDelete = async () => {
//      const newsItem = confirmationState.newsItemToDelete;
//      if (!newsItem || !user || !user.id) {
//        setConfirmationState({ isOpen: false, newsItemToDelete: null });
//        return;
//      }
//      setIsDeleting(newsItem.id);
//      setConfirmationState({ isOpen: false, newsItemToDelete: null });
//      let token = localStorage.getItem("authToken");

//      if (!token) {
//        toast.error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
//        setIsDeleting(null);
//        return;
//      }

//      const API_URL = `http://localhost:8080/identity/api/news/${newsItem.id}?deletedById=${user.id}`;

//      try {
//        let response = await fetch(API_URL, {
//          method: "DELETE",
//          headers: { Authorization: `Bearer ${token}` },
//        });

//        if ((response.status === 401 || response.status === 403) && refreshToken) {
//          console.log("Attempting token refresh...");
//          const newToken = await refreshToken();
//          if (newToken) {
//            token = newToken;
//            localStorage.setItem('authToken', newToken);
//            console.log("Token refreshed. Retrying delete request...");
//            response = await fetch(API_URL, {
//              method: "DELETE",
//              headers: { Authorization: `Bearer ${token}` },
//            });
//          } else {
//            throw new Error("Không thể làm mới phiên đăng nhập.");
//          }
//        }

//        if (response.ok) {
//          const result = await response.json();
//          if (result.code === 1000) {
//            toast.success(result.message || "Xóa tin tức thành công!");
//            onNewsDeleted();
//          } else {
//            throw new Error(result.message || "Xóa thất bại.");
//          }
//        } else {
//          let errorMsg = `Lỗi ${response.status}`;
//          try {
//            const errData = await response.json();
//            errorMsg = errData.message || errorMsg;
//          } catch (e) {
//            console.error("Could not parse error response:", e);
//          }
//          if (response.status === 401 || response.status === 403) {
//             errorMsg = "Bạn không có quyền thực hiện hành động này hoặc phiên đăng nhập đã hết hạn.";
//          }
//          throw new Error(errorMsg);
//        }
//      } catch (error: any) {
//        console.error("Error deleting news item:", error);
//        toast.error(`Xóa thất bại: ${error.message}`);
//      } finally {
//        setIsDeleting(null);
//      }
//   };

//   const handleCancelDelete = () => {
//     setConfirmationState({ isOpen: false, newsItemToDelete: null });
//   };

//   if (isLoading) {
//     return <p className="text-center text-gray-500 italic py-6">Đang tải bảng tin...</p>;
//   }
//   if (error) {
//     return <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200 mt-6">Lỗi tải bảng tin: {error}</p>;
//   }

//   const safeNewsItems = useMemo(() => Array.isArray(newsItems) ? newsItems : [], [newsItems]);

//   const sortedNews = useMemo(() => {
//       return [...safeNewsItems].sort(
//         (a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
//       );
//   }, [safeNewsItems]);

//   const filteredNews = useMemo(() => {
//       if (!searchTerm.trim()) {
//           return sortedNews;
//       }
//       const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
//       return sortedNews.filter(item => {
//           const creatorName = getCreatorName(item.createdBy).toLowerCase();
//           const title = item.title?.toLowerCase() || '';
//           const summary = item.summary?.toLowerCase() || '';
//           const content = (item as any).content?.toLowerCase() || '';

//           return title.includes(lowerCaseSearchTerm) ||
//                  summary.includes(lowerCaseSearchTerm) ||
//                  creatorName.includes(lowerCaseSearchTerm) ||
//                  content.includes(lowerCaseSearchTerm);
//       });
//   }, [sortedNews, searchTerm]);

//   return (
//     <div className="mt-10 pt-6 border-t border-gray-200">
//       <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
//         <h2 className="text-2xl font-bold text-green-600">📰 Bảng tin</h2>
//         <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
//             <div className="relative w-full sm:w-90">
//                 <input
//                     type="text"
//                     placeholder="Tìm theo tiêu đề, nội dung, người tạo..."
//                     value={searchTerm}
//                     onChange={(e) => setSearchTerm(e.target.value)}
//                     className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm"
//                 />
//                 <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
//             </div>
//             {user && (
//              <button
//                  onClick={onOpenCreateModal}
//                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 flex items-center gap-1 w-full sm:w-auto justify-center"
//              >
//                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
//                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
//                  </svg>
//                  Tạo Bảng Tin
//              </button>
//              )}
//          </div>
//       </div>

//       {filteredNews.length > 0 ? (
//         <div className="flex flex-wrap justify-start gap-5">
//           {filteredNews.map((item) => {
//             const canDelete = user?.roles?.some(role => role.name === "ADMIN" || role.name === "USER");
//             const canUpdate = user?.id === item.createdBy?.id && item.status === "APPROVED";
//             const creatorName = getCreatorName(item.createdBy);

//             return (
//               <div
//                 key={item.id}
//                 className="w-full md:w-[calc(50%-1.25rem/2)] lg:w-[calc(33.33%-2.5rem/3)] bg-white rounded-xl shadow-md hover:shadow-xl border border-gray-100 transition-all duration-300 group flex flex-col overflow-hidden"
//               >
//                  {item.imageUrl ? (
//                    <div
//                      onClick={() => handleOpenDetailModal(item)}
//                      className="flex-shrink-0 w-full h-48 relative bg-gray-200 cursor-pointer overflow-hidden"
//                    >
//                      <Image
//                        src={item.imageUrl}
//                        alt={item.title || 'Hình ảnh tin tức'}
//                        layout="fill"
//                        objectFit="cover"
//                        className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
//                        onError={(e) => {
//                            (e.target as HTMLImageElement).style.display = 'none';
//                            const parent = (e.target as HTMLImageElement).parentElement;
//                            if (parent && !parent.querySelector('.error-placeholder')) {
//                                 const placeholder = document.createElement('div');
//                                 placeholder.className = 'error-placeholder w-full h-full flex items-center justify-center text-gray-400 text-sm italic';
//                                 placeholder.textContent = 'Không thể tải ảnh';
//                                 parent.appendChild(placeholder);
//                            }
//                        }}
//                      />
//                    </div>
//                  ) : (
//                     <div onClick={() => handleOpenDetailModal(item)} className="flex-shrink-0 w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400 italic cursor-pointer">
//                         (Không có ảnh)
//                     </div>
//                  )}

//                  <div className="p-4 flex flex-col flex-grow">
//                    <h3
//                      onClick={() => handleOpenDetailModal(item)}
//                      className="text-lg font-bold text-gray-800 mb-2 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
//                    >
//                      {item.title || "Tiêu đề không có"}
//                    </h3>
//                    <p
//                     onClick={() => handleOpenDetailModal(item)}
//                     className="text-sm text-gray-600 mb-3 line-clamp-3 flex-grow cursor-pointer"
//                    >
//                     {item.summary || "Không có tóm tắt."}
//                    </p>

//                    <div className="mt-auto pt-3 border-t border-gray-100">
//                        <p className="text-xs text-gray-500 mb-1.5">
//                          {new Date(item.date || item.createdAt || Date.now()).toLocaleDateString("vi-VN", {
//                              year: "numeric", month: "long", day: "numeric",
//                              hour: "2-digit", minute: "2-digit",
//                          })}
//                        </p>
//                        {item.createdBy && (
//                          <div className="flex items-center">
//                              {item.createdBy.avatar ? (
//                              <Image
//                                  src={item.createdBy.avatar}
//                                  alt={creatorName}
//                                  width={20} height={20}
//                                  className="w-5 h-5 rounded-full mr-1.5 object-cover bg-gray-200"
//                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
//                              />
//                              ) : (
//                              <span className="inline-block h-5 w-5 rounded-full overflow-hidden bg-gray-200 mr-1.5 flex items-center justify-center">
//                                  <PersonIcon className="h-3 w-3 text-gray-500" />
//                              </span>
//                              )}
//                              <span className="text-xs text-gray-600 font-medium truncate" title={creatorName}>
//                                  {creatorName}
//                              </span>
//                          </div>
//                        )}
//                    </div>
//                  </div>

//                  {(canUpdate || canDelete) && (
//                      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
//                          onClick={(e) => e.stopPropagation()}
//                      >
//                      {canUpdate && (
//                          <button
//                              onClick={(e) => { e.stopPropagation(); onOpenEditModal(item); }}
//                              className="p-1.5 rounded-full bg-white/90 hover:bg-blue-100 text-gray-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-200 shadow"
//                              title="Chỉnh sửa tin tức"
//                          >
//                              <Pencil1Icon className="h-4 w-4" />
//                          </button>
//                      )}
//                      {canDelete && (
//                          <button
//                              onClick={(e) => { e.stopPropagation(); handleDeleteClick(item); }}
//                              disabled={isDeleting === item.id}
//                              className={`p-1.5 rounded-full bg-white/90 text-gray-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-400 transition-all duration-200 shadow ${
//                                  isDeleting === item.id ? "animate-pulse bg-red-50" : ""
//                              }`}
//                              title="Xóa tin tức"
//                          >
//                              {isDeleting === item.id ? (
//                                  <ReloadIcon className="animate-spin h-4 w-4 text-red-600" />
//                              ) : (
//                                  <TrashIcon className="h-4 w-4" />
//                              )}
//                          </button>
//                      )}
//                      </div>
//                  )}
//               </div>
//             );
//           })}
//         </div>
//       ) : (
//         <p className="text-gray-500 text-center py-10 italic">
//            {searchTerm ? `Không tìm thấy tin tức nào khớp với "${searchTerm}".` : "Không có tin tức nào để hiển thị."}
//         </p>
//       )}

//       <ConfirmationDialog
//           isOpen={confirmationState.isOpen}
//           title="Xác nhận xóa"
//           message={
//             <>
//               Bạn có chắc chắn muốn xóa tin tức: <br />
//               <strong className="text-red-600">
//                 "{confirmationState.newsItemToDelete?.title || 'này'}"
//               </strong>
//               ?<br /> Hành động này không thể hoàn tác.
//             </>
//           }
//           onConfirm={handleConfirmDelete}
//           onCancel={handleCancelDelete}
//           confirmText="Xác nhận xóa"
//           cancelText="Hủy"
//           confirmVariant="danger"
//       />

      

//     </div>
//  );
// };

// export default NewsFeedSection;