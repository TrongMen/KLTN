"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  FormEvent,
} from "react";
import { toast } from "react-hot-toast";
import Image from "next/image";
import { NewsItem, User } from "../types/appTypes";
import {
  Cross1Icon,
  ImageIcon,
  PaperPlaneIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
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
  date?: string;
  createdBy?: string; 
}

interface CreateNewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActionSuccess: (updatedNewsItem?: NewsItem, wasEditMode?: boolean) => void;
  editMode: boolean;
  initialData: NewsItem | null;
  user: User | null;
  refreshToken?: () => Promise<string | null>;
}

type TemporalEventStatus = "upcoming" | "ongoing" | "ended";

const getEventTemporalStatus = (eventDateStr: string | undefined): TemporalEventStatus => {
  if (!eventDateStr) return "upcoming"; 
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) return "upcoming";
    
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (eventDateOnly < todayStart) return "ended";
    else if (eventDateOnly > todayStart) return "upcoming";
    else return "ongoing"; 
  } catch (e) {
    console.error("Error parsing event date for status:", e);
    return "upcoming"; 
  }
};


const CreateNewsModal: React.FC<CreateNewsModalProps> = ({
  isOpen,
  onClose,
  onActionSuccess,
  editMode,
  initialData,
  user, // user prop đã có
  refreshToken,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventsForSelect, setEventsForSelect] = useState<EventForSelect[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editorKey = useMemo(() => {
    if (editMode && initialData?.id) {
      return `tiptap-editor-${initialData.id}`;
    }
    return `tiptap-editor-new-${Date.now()}`;
  }, [editMode, initialData]);

  useEffect(() => {
    if (!isOpen) {
      setEventsForSelect([]); 
      return;
    }
    const fetchEventsForDropdown = async () => {
      setIsLoadingEvents(true);
      try {
        const token = localStorage.getItem("authToken");
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};
        const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
        const res = await fetch(url, { headers, cache: "no-store" });
        if (!res.ok) throw new Error("Lỗi tải danh sách sự kiện");
        const data = await res.json();
        if (data.code === 1000 && Array.isArray(data.result)) {
          const approvedEventsFromApi: EventForSelect[] = data.result.map((e: any) => ({
            id: e.id,
            name: e.name,
            date: e.time || e.date || e.startDate || e.eventDate || e.createdAt, 
            createdBy: e.createdBy, 
          }));

          let temporallyFilteredEvents = approvedEventsFromApi.filter(event => {
            const status = getEventTemporalStatus(event.date);
            return status === "upcoming" || status === "ongoing";
          });

          if (user && user.id) {
            const userSpecificEvents = temporallyFilteredEvents.filter(event => event.createdBy === user.id);
            setEventsForSelect(userSpecificEvents);
          } else {
            setEventsForSelect([]); 
          }

        } else {
          throw new Error(data.message || "Dữ liệu sự kiện không hợp lệ");
        }
      } catch (error: any) {
        console.error("Error fetching events for select:", error);
        toast.error("Lỗi tải danh sách sự kiện.");
        setEventsForSelect([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };
    
    if (user?.id) { 
        fetchEventsForDropdown();
    } else {
        setEventsForSelect([]);
        setIsLoadingEvents(false);
    }

  }, [isOpen, user]); 

  useEffect(() => {
    if (isOpen) {
      if (editMode && initialData) {
        setTitle(initialData.title || "");
        setContent(initialData.content || "");
        setImageFile(null);
        setImagePreview(
          initialData.imageUrl || initialData.coverImageUrl || null
        );
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
      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast.error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp).");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Kích thước ảnh không được vượt quá 5MB.");
        return;
      }
      setImageFile(file);
      const currentPreview = imagePreview;
      if (currentPreview && currentPreview.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(
        editMode && (initialData?.imageUrl || initialData?.coverImageUrl)
          ? initialData.imageUrl || initialData.coverImageUrl
          : null
      );
    }
  };

  useEffect(() => {
    const currentPreview = imagePreview;
    if (currentPreview && currentPreview.startsWith("blob:")) {
      return () => {
        URL.revokeObjectURL(currentPreview);
      };
    }
    return () => {};
  }, [imagePreview]);

  const clearImageSelection = () => {
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  const handleFormSubmitInternal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user || !user.id) {
      toast.error("Vui lòng đăng nhập để thực hiện hành động này.");
      return;
    }

    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;
    const textFromContent = (tempDiv.textContent || "").trim();
    const hasActualText = textFromContent.length > 0;
    const hasImages = tempDiv.querySelector("img") !== null;
    const trimmedTitle = (title || "").trim();

    if (!trimmedTitle) {
      toast.error("Vui lòng nhập tiêu đề.");
      return;
    }
    if (!hasActualText && !hasImages) {
      toast.error("Vui lòng nhập nội dung.");
      return;
    }

    setInternalIsSubmitting(true);
    const currentEditMode = editMode; 
    const toastMessage = currentEditMode ? "Đang cập nhật bảng tin..." : "Đang tạo bảng tin mới...";
    const toastId = toast.loading(toastMessage);

    const apiFormData = new FormData();
    apiFormData.append("title", trimmedTitle);
    apiFormData.append("content", content);

    if (eventId) {
      apiFormData.append("eventId", eventId);
    }
    if (imageFile) {
      apiFormData.append("coverImage", imageFile);
    }

    let apiUrl: string;
    let method: string;

    if (currentEditMode && initialData?.id) {
      apiUrl = `http://localhost:8080/identity/api/news/${initialData.id}?UserId=${user.id}`;
      method = "PUT";
      apiFormData.append("status", "PENDING");
    } else {
      apiUrl = `http://localhost:8080/identity/api/news`;
      method = "POST";
      apiFormData.append("createdById", user.id);
      apiFormData.append("type", "NEWS");
      apiFormData.append("featured", "false");
      apiFormData.append("pinned", "false");
    }

    let currentToken = localStorage.getItem("authToken");

    try {
      const makeApiCall = async (token: string | null): Promise<Response> => {
        if (!token) {
          throw new Error("Không tìm thấy token xác thực.");
        }
        const headers: HeadersInit = {
          Authorization: `Bearer ${token}`,
        };
        
        return await fetch(apiUrl, {
          method: method,
          headers: headers,
          body: apiFormData,
        });
      };

      let response = await makeApiCall(currentToken);

      if ((response.status === 401 || response.status === 403) && refreshToken && typeof refreshToken === 'function') {
        const newToken = await refreshToken();
        if (newToken) {
          localStorage.setItem("authToken", newToken);
          currentToken = newToken;
          response = await makeApiCall(newToken); 
        } else {
          throw new Error("Không thể làm mới phiên đăng nhập. Vui lòng đăng nhập lại.");
        }
      }
      
      const responseData = await response.json();

      if (response.ok && responseData.code === 1000) {
        toast.success(responseData.message || (currentEditMode ? "Cập nhật thành công! Tin tức đã được chuyển sang trạng thái chờ duyệt." : "Tạo mới thành công! Tin tức đã được chuyển sang trạng thái chờ duyệt."), {
          id: toastId,
        });
        onActionSuccess(responseData.result, currentEditMode);
        onClose();
      } else {
        let errorMsg = responseData.message || `Lỗi ${response.status}`;
        if (response.status === 401 || response.status === 403) {
          errorMsg = "Không có quyền hoặc phiên đăng nhập hết hạn.";
        }
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      toast.error(
        `${currentEditMode ? "Cập nhật" : "Tạo mới"} thất bại: ${error.message || "Lỗi không xác định"}`,
        { id: toastId }
      );
    } finally {
      setInternalIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-0 flex flex-col max-h-[90vh] transition-all duration-300 ease-out">
        <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-800">
            {editMode ? "Chỉnh sửa Bảng Tin" : "Tạo bảng Tin Mới"}
          </h2>
          <button
            onClick={onClose}
            disabled={internalIsSubmitting}
            className="text-gray-500 cursor-pointer hover:text-red-600 transition-colors p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Cross1Icon className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleFormSubmitInternal}
          className="overflow-y-auto flex-grow p-6 space-y-6"
        >
          <div>
            <label
              htmlFor="newsTitle"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              id="newsTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={internalIsSubmitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition duration-150 ease-in-out"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <TiptapEditor
              key={editorKey}
              initialContent={content}
              onContentChange={handleContentChange}
              placeholder="Nhập nội dung chi tiết cho bảng tin..."
              disabled={internalIsSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="newsEvent"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Sự kiện liên quan (Tùy chọn)
            </label>
            <select
              id="newsEvent"
              value={eventId ?? ""}
              onChange={(e) => setEventId(e.target.value || null)}
              disabled={isLoadingEvents || internalIsSubmitting || !user}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm bg-white appearance-none pr-8 disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-150 ease-in-out"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.7rem center",
                backgroundSize: "1.25em 1.25em",
              }}
            >
              <option value="">-- Không chọn --</option>
              {isLoadingEvents ? (
                <option disabled>Đang tải sự kiện...</option>
              ) : eventsForSelect.length === 0 && user ? (
                 <option disabled>Không có sự kiện nào của bạn đang hoặc sắp diễn ra.</option>
              ) : !user ? (
                <option disabled>Vui lòng đăng nhập để chọn sự kiện.</option>
              ) : (
                eventsForSelect.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ảnh bìa (Tùy chọn, tối đa 5MB)
            </label>
            <div className="flex items-center space-x-3 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={internalIsSubmitting}
                className="flex-grow cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 transition duration-150 ease-in-out text-left"
              >
                <div className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0" />
                  <span className="truncate">
                    {imageFile
                      ? imageFile.name
                      : imagePreview &&
                        !imageFile &&
                        editMode &&
                        (initialData?.imageUrl || initialData?.coverImageUrl)
                      ? "Ảnh hiện tại được giữ lại"
                      : "Chọn ảnh"}
                  </span>
                </div>
              </button>
              <input
                id="newsImageInput"
                name="newsImageInput"
                type="file"
                className="sr-only"
                accept="image/png, image/jpeg, image/gif, image/webp"
                onChange={handleImageChange}
                ref={fileInputRef}
                disabled={internalIsSubmitting}
              />
              {imagePreview && (
                <button
                  type="button"
                  onClick={clearImageSelection}
                  disabled={internalIsSubmitting}
                  className="px-3 py-2 cursor-pointer border border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition duration-150 ease-in-out text-sm flex-shrink-0"
                >
                  Xóa ảnh
                </button>
              )}
            </div>

            {imagePreview && (
              <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 max-w-sm overflow-hidden mx-auto sm:mx-0">
                <Image
                  src={imagePreview}
                  alt="Xem trước ảnh bìa"
                  width={400}
                  height={225}
                  style={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: "250px",
                    width: "auto",
                    height: "auto",
                    objectFit: "contain",
                    margin: "0 auto",
                  }}
                  className="rounded"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end items-center gap-3 pt-5 border-t mt-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={internalIsSubmitting}
              className="px-5 cursor-pointer py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={internalIsSubmitting}
              className={`px-5 cursor-pointer py-2 text-white rounded-lg shadow-sm transition text-sm font-medium flex items-center justify-center min-w-[120px] ${
                internalIsSubmitting
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              }`}
            >
              {internalIsSubmitting ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" /> Đang xử
                  lý...
                </>
              ) : (
                <>
                  <PaperPlaneIcon className="mr-2 h-4 w-4" />
                  {editMode ? "Cập nhật" : "Tạo tin"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNewsModal;