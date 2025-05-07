"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { NewsItem } from "../homeuser";
import { Cross1Icon, ImageIcon, PaperPlaneIcon, ReloadIcon } from "@radix-ui/react-icons";
import TiptapEditor from "../../../tiptap/MyTiptapEditor";

export interface NewsFormData {
  title: string;
  content: string;
  imageFile?: File | null;
  eventId?: string | null;
}

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
  isOpen, onClose, onSubmit, isSubmitting, editMode, initialData,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventsForSelect, setEventsForSelect] = useState<EventForSelect[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const fetchEventsForDropdown = async () => {
        setIsLoadingEvents(true);
        try {
            const token = localStorage.getItem("authToken");
            const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
            const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
            const res = await fetch(url, { headers, cache: "no-store" });
            if (!res.ok) throw new Error('Lỗi tải danh sách sự kiện');
            const data = await res.json();
            if (data.code === 1000 && Array.isArray(data.result)) {
                setEventsForSelect(data.result.map((e: any) => ({ id: e.id, name: e.name })));
            } else { throw new Error(data.message || 'Dữ liệu sự kiện không hợp lệ'); }
        } catch (error: any) {
            console.error("Error fetching events for select:", error);
            toast.error("Lỗi tải danh sách sự kiện.");
            setEventsForSelect([]);
        } finally { setIsLoadingEvents(false); }
    };
    fetchEventsForDropdown();
  }, [isOpen]);

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
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }
  }, [isOpen, editMode, initialData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) { toast.error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp).'); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error('Kích thước ảnh không được vượt quá 5MB.'); return; }
        setImageFile(file);
        const currentPreview = imagePreview;
        if (currentPreview && currentPreview.startsWith('blob:')) {
            URL.revokeObjectURL(currentPreview);
        }
        setImagePreview(URL.createObjectURL(file));
    } else {
       setImageFile(null);
       if (imagePreview && imagePreview.startsWith('blob:')) {
         URL.revokeObjectURL(imagePreview);
       }
       setImagePreview(editMode && initialData?.imageUrl ? initialData.imageUrl : null);
    }
  };

  useEffect(() => {
   const currentPreview = imagePreview;
   if (currentPreview && currentPreview.startsWith('blob:')) {
     return () => { URL.revokeObjectURL(currentPreview); };
   }
   return () => {};
  }, [imagePreview]);

  const clearImageSelection = () => {
   if (imagePreview && imagePreview.startsWith('blob:')) {
     URL.revokeObjectURL(imagePreview);
   }
   setImageFile(null);
   setImagePreview(editMode && initialData?.imageUrl ? initialData.imageUrl : null);
   if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleContentChange = (reason: string) => {
    setContent(reason);
  };

  // Di chuyển hàm handleSubmit ra ngoài return nhưng vẫn trong component
  const handleFormSubmitInternal = (e: React.FormEvent) => {
    e.preventDefault();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const hasTextContent = tempDiv.textContent?.trim() || tempDiv.querySelector('img') !== null;

    if (!title || !hasTextContent) {
      toast.error("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }
    const formData: NewsFormData = { title, content, imageFile, eventId };
    onSubmit(formData, editMode && initialData ? initialData.id : undefined);
  };

  if (!isOpen) {
    return null;
  }

  // Đảm bảo return statement và JSX không có ký tự lạ
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-0 flex flex-col max-h-[90vh] transition-all duration-300 ease-out">
        <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">{editMode ? "Chỉnh sửa Bảng Tin" : "Tạo Bảng Tin Mới"}</h2>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-500 hover:text-red-600 transition-colors p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
            <Cross1Icon className="h-5 w-5" />
          </button>
        </div>

        {/* Sử dụng onSubmit trên form */}
        <form onSubmit={handleFormSubmitInternal} className="overflow-y-auto flex-grow p-6 space-y-6">
          <div>
            <label htmlFor="newsTitle" className="block text-sm font-medium text-gray-700 mb-1.5">Tiêu đề <span className="text-red-500">*</span></label>
            <input id="newsTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition duration-150 ease-in-out"/>
          </div>

          <div>
            <label htmlFor="newsContentEditor" className="block text-sm font-medium text-gray-700 mb-1.5">Nội dung <span className="text-red-500">*</span></label>
            <TiptapEditor
              content={content}
              onContentChange={handleContentChange}
              placeholder="Nhập nội dung chi tiết cho bảng tin..."
            />
          </div>

          <div>
            <label htmlFor="newsEvent" className="block text-sm font-medium text-gray-700 mb-1.5">Sự kiện liên quan (Tùy chọn)</label>
            <select id="newsEvent" value={eventId ?? ''} onChange={(e) => setEventId(e.target.value || null)} disabled={isLoadingEvents} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white appearance-none pr-8 disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 ease-in-out" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.7rem center', backgroundSize: '1.25em 1.25em' }}>
                <option value="">-- Không chọn --</option>
                {isLoadingEvents ? ( <option disabled>Đang tải sự kiện...</option> ) : (
                   eventsForSelect.map(event => (<option key={event.id} value={event.id}>{event.name}</option> ))
                )}
            </select>
          </div>

          <div>
            <label htmlFor="newsImage" className="block text-sm font-medium text-gray-700 mb-1.5">Ảnh bìa (Tùy chọn)</label>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex-grow cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 transition duration-150 ease-in-out">
                    <span className="truncate">{imageFile ? imageFile.name : "Chọn ảnh (tối đa 5MB)"}</span>
                    <input id="newsImage" name="newsImage" type="file" className="sr-only" accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleImageChange} ref={fileInputRef}/>
              </label>
              {imagePreview && <button type="button" onClick={clearImageSelection} className="text-sm text-red-600 hover:text-red-800 transition duration-150 ease-in-out flex-shrink-0">Xóa ảnh</button>}
            </div>

            {imagePreview && (
              <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 max-w-sm overflow-hidden mx-auto sm:mx-0">
                <Image
                   src={imagePreview}
                   alt="Xem trước ảnh bìa"
                   width={400}
                   height={225}
                   style={{
                     display: 'block',
                     maxWidth: '100%',
                     maxHeight: '250px',
                     width: 'auto',
                     height: 'auto',
                     objectFit: 'contain',
                     margin: '0 auto'
                   }}
                />
              </div>
            )}
          </div>
          {/* Nút submit giờ nằm trong form */}
          <div className="flex justify-end items-center gap-3 pt-5 border-t mt-auto">
             {/* Bỏ sticky footer, để nút trong form */}
             <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">Hủy bỏ</button>
             <button
               type="submit"
               disabled={isSubmitting}
               className={`px-5 py-2 text-white rounded-lg shadow-sm transition text-sm font-medium flex items-center justify-center min-w-[120px] ${ isSubmitting ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" }`}
             >
               {isSubmitting ? ( <><ReloadIcon className="mr-2 h-4 w-4 animate-spin"/> Đang xử lý...</> ) : ( <><PaperPlaneIcon className="mr-2 h-4 w-4" />{editMode ? 'Cập nhật' : 'Tạo tin'}</> )}
             </button>
           </div>
        </form>
        {/* Footer không còn ở đây nữa */}
      </div>
    </div>
  );
}

export default CreateNewsModal;