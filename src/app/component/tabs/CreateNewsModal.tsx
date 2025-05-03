"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { NewsItem } from "../homeuser"; // Assuming NewsItem is exported from homeuser
import { Cross1Icon, ImageIcon, PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";

// Data structure expected by the onSubmit prop
export interface NewsFormData {
  title: string;
  content: string;
  imageFile?: File | null;
  eventId?: string | null; // Made optional
}

// Event structure specifically for the dropdown
interface EventForSelect {
    id: string;
    name: string;
}


interface CreateNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: NewsFormData, newsId?: string) => void;
  isSubmitting: boolean;
  editMode: boolean;
  initialData: NewsItem | null;
}

const CreateNewsModal: React.FC<CreateNewsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  editMode,
  initialData,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null); // State for selected event ID
  const [eventsForSelect, setEventsForSelect] = useState<EventForSelect[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Fetch events for the dropdown when the modal opens
   useEffect(() => {
     if (!isOpen) return;

     const fetchEventsForDropdown = async () => {
         setIsLoadingEvents(true);
         try {
             const token = localStorage.getItem("authToken");
             const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
             const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`; // Fetch only approved events
             const res = await fetch(url, { headers });
             if (!res.ok) throw new Error('Lỗi tải danh sách sự kiện');
             const data = await res.json();
             if (data.code === 1000 && Array.isArray(data.result)) {
                 setEventsForSelect(data.result.map((e: any) => ({ id: e.id, name: e.name })));
             } else { throw new Error(data.message || 'Dữ liệu sự kiện không hợp lệ'); }
         } catch (error: any) {
             console.error("Error fetching events for select:", error);
             toast.error("Lỗi tải danh sách sự kiện.");
             setEventsForSelect([]); // Clear on error
         } finally {
             setIsLoadingEvents(false);
         }
     };
     fetchEventsForDropdown();
   }, [isOpen]); // Dependency is isOpen


  useEffect(() => {
    if (isOpen) {
        if (editMode && initialData) {
            setTitle(initialData.title || "");
            setContent(initialData.content || "");
            setImageFile(null);
            setImagePreview(initialData.imageUrl || initialData.coverImageUrl || null);
            setEventId(initialData.event?.id || null);
        } else {
            setTitle("");
            setContent("");
            setImageFile(null);
            setImagePreview(null);
            setEventId(null);
            if (fileInputRef.current) {
                 fileInputRef.current.value = ""; // Reset file input visually
             }
        }
    }
  }, [isOpen, editMode, initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Simple validation (optional)
       const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp).');
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit example
            toast.error('Kích thước ảnh không được vượt quá 5MB.');
            return;
        }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
        // Clear preview if user deselects file, keep imageFile null
         setImageFile(null);
         // If editing, revert preview to initial image if user deselects
         setImagePreview(editMode && initialData?.imageUrl ? initialData.imageUrl : null);
    }
  };

  const clearImageSelection = () => {
     setImageFile(null);
     setImagePreview(editMode && initialData?.imageUrl ? initialData.imageUrl : null); // Revert to initial or null
      if (fileInputRef.current) {
         fileInputRef.current.value = "";
     }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
        toast.error("Vui lòng nhập tiêu đề và nội dung.");
        return;
    }
    const formData: NewsFormData = { title, content, imageFile, eventId };
    onSubmit(formData, editMode && initialData ? initialData.id : undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-0 flex flex-col max-h-[90vh]">
         <div className="flex justify-between items-center p-4 md:p-5 border-b sticky top-0 bg-white z-10">
           <h2 className="text-lg md:text-xl font-bold text-gray-800">
             {editMode ? "Chỉnh sửa Bảng Tin" : "Tạo Bảng Tin Mới"}
           </h2>
           <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full">
             <Cross1Icon className="h-5 w-5" />
           </button>
         </div>

         <form onSubmit={handleSubmit} className="overflow-y-auto flex-grow p-4 md:p-6 space-y-5">
             <div>
                 <label htmlFor="newsTitle" className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề <span className="text-red-500">*</span></label>
                 <input id="newsTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"/>
             </div>

             <div>
                 <label htmlFor="newsContent" className="block text-sm font-medium text-gray-700 mb-1">Nội dung <span className="text-red-500">*</span></label>
                 <textarea id="newsContent" rows={8} value={content} onChange={(e) => setContent(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm resize-y"/>
             </div>

             <div>
                 <label htmlFor="newsEvent" className="block text-sm font-medium text-gray-700 mb-1">Sự kiện liên quan (Tùy chọn)</label>
                 <select id="newsEvent" value={eventId ?? ''} onChange={(e) => setEventId(e.target.value || null)} disabled={isLoadingEvents} className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white appearance-none pr-8 disabled:bg-gray-100" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}>
                     <option value="">-- Không chọn --</option>
                     {isLoadingEvents ? ( <option disabled>Đang tải sự kiện...</option> ) : (
                         eventsForSelect.map(event => (<option key={event.id} value={event.id}>{event.name}</option> ))
                     )}
                 </select>
             </div>

             <div>
                 <label htmlFor="newsImage" className="block text-sm font-medium text-gray-700 mb-1">Ảnh bìa (Tùy chọn)</label>
                 <div className="flex items-center gap-4">
                      <input id="newsImage" type="file" accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleImageChange} ref={fileInputRef} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>
                      {imagePreview && <button type="button" onClick={clearImageSelection} className="text-xs text-red-600 hover:underline">Xóa ảnh</button>}
                 </div>
                  {imagePreview && (
                     <div className="mt-3 border rounded-md p-2 inline-block bg-gray-50 max-w-xs">
                         <Image src={imagePreview} alt="Xem trước ảnh bìa" width={150} height={150} objectFit="contain" className="max-h-36 w-auto"/>
                     </div>
                  )}
             </div>

              <div className="flex justify-end gap-3 pt-5 border-t sticky bottom-0 bg-white py-4 px-6 -mx-6">
                 <button type="button" onClick={onClose} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm transition text-sm font-medium">Hủy bỏ</button>
                 <button type="submit" disabled={isSubmitting} className={`px-5 py-2 text-white rounded-lg shadow-sm transition text-sm font-medium flex items-center justify-center ${ isSubmitting ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700" }`}>
                      {isSubmitting ? ( <><ReloadIcon className="mr-2 h-4 w-4 animate-spin"/> Đang {editMode ? 'cập nhật' : 'tạo'}...</> ) : ( <><PaperPlaneIcon className="mr-2 h-4 w-4" />{editMode ? 'Cập nhật tin tức' : 'Tạo tin tức'}</> )}
                 </button>
             </div>
         </form>
      </div>
    </div>
  );
}

export default CreateNewsModal;
