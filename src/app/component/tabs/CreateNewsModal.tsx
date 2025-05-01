"use client";

import React, { useState, useEffect, ChangeEvent, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import MyTiptapEditor from '../../../utils/MyTiptapEditor'; // Kiểm tra lại đường dẫn này

export interface NewsFormData {
    title: string;
    content: string;
    imageFile?: File | null;
}

interface CreateNewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: NewsFormData) => Promise<void>;
    isSubmitting?: boolean;
}

const CreateNewsModal: React.FC<CreateNewsModalProps> = ({ isOpen, onClose, onSubmit, isSubmitting = false }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setContent('');
            setSelectedFile(null);
            const currentPreviewUrl = imagePreviewUrl; // Lưu lại để cleanup
            setImagePreviewUrl(null); // Reset trước
            if (currentPreviewUrl) {
                 URL.revokeObjectURL(currentPreviewUrl);
            }
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    }, [isOpen]); // Chỉ phụ thuộc isOpen

    useEffect(() => {
        // Cleanup URL khi component unmount hoặc URL thay đổi
        const currentUrl = imagePreviewUrl;
        return () => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }
        };
    }, [imagePreviewUrl]);

    const isTiptapEmpty = (htmlContent: string): boolean => {
        if (!htmlContent || htmlContent.trim() === '' || htmlContent === '<p></p>') {
            return true;
        }
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        return tempDiv.textContent?.trim() === '';
    };

    const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        let newPreviewUrl: string | null = null;
        let fileToSet: File | null = null;

        if (files && files[0]) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chỉ chọn file hình ảnh.');
            } else {
                fileToSet = file;
                newPreviewUrl = URL.createObjectURL(file);
            }
        }

        setSelectedFile(fileToSet);
        setImagePreviewUrl(newPreviewUrl); // Cập nhật URL xem trước

        // Reset input để có thể chọn lại cùng file
        if(event.target) event.target.value = "";
    }, []);

    const handleRemoveImage = useCallback(() => {
        setSelectedFile(null);
        setImagePreviewUrl(null); // Revoke sẽ tự động chạy bởi useEffect cleanup
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, []);

    const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!title.trim() || isTiptapEmpty(content)) {
            toast.error('Vui lòng nhập Tiêu đề và Nội dung.');
            return;
        }
        const formData: NewsFormData = {
            title: title.trim(),
            content: content,
            imageFile: selectedFile,
        };
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error("Error calling onSubmit prop:", error);
        }
    }, [title, content, selectedFile, onSubmit]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-40 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl relative max-h-[90vh] flex flex-col">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold z-10 disabled:opacity-50"
                    aria-label="Đóng"
                    disabled={isSubmitting}
                >
                    &times;
                </button>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 flex-shrink-0">Tạo Bảng Tin Mới</h2>

                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-grow pr-2">
                    <div>
                        <label htmlFor="newsTitle" className="block text-sm font-medium text-gray-700 mb-1">
                            Tiêu đề <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="newsTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nội dung <span className="text-red-500">*</span>
                        </label>
                        <MyTiptapEditor
                            initialContent={content || '<p></p>'}
                            onContentChange={setContent}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hình ảnh (Tùy chọn)
                        </label>
                        <div className="mt-1 flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                disabled={isSubmitting}
                            >
                                Chọn ảnh
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept="image/*"
                                disabled={isSubmitting}
                            />
                            {imagePreviewUrl && (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={imagePreviewUrl}
                                        alt="Xem trước ảnh"
                                        className="h-16 w-auto object-cover rounded border border-gray-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                                        disabled={isSubmitting}
                                        title="Xóa ảnh"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            {!imagePreviewUrl && selectedFile && (
                                <span className="text-sm text-gray-500">{selectedFile.name}</span>
                            )}
                        </div>
                    </div>
                </form>

                <div className="flex justify-end gap-3 pt-4 mt-auto border-t border-gray-200 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                             const formElement = document.querySelector<HTMLFormElement>('.max-w-3xl form');
                             if (formElement) {
                                if (formElement.checkValidity()) {
                                     formElement.requestSubmit();
                                } else {
                                     formElement.reportValidity();
                                     toast.error('Vui lòng điền đầy đủ thông tin bắt buộc.');
                                }
                            }
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px] transition-colors duration-150"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang tạo...
                            </>
                        ) : (
                            'Tạo Bảng Tin'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateNewsModal;