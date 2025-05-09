import React, { useEffect, useState } from 'react';
import { toast } from "react-hot-toast"; 

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void; 
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  requiresReason?: boolean;
  onConfirmWithReason?: (reason: string) => void;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  confirmButtonClass?: string;
}

const ConfirmDialogDelete: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  requiresReason = false,
  onConfirmWithReason,
  reasonLabel = "Lý do:",
  reasonPlaceholder = "Nhập lý do...",
  confirmButtonClass = "bg-red-500 hover:bg-red-600", 
}) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
        setReason(""); 
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (requiresReason && onConfirmWithReason) {
      if (!reason.trim()) {
        toast.error("Vui lòng nhập lý do.");
        return;
      }
      onConfirmWithReason(reason.trim());
    } else if (onConfirm) { 
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 bg-opacity-50 z-[80] flex justify-center items-center p-4" 
    >
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full" 
      // onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {title}
        </h2>
        <p className="text-gray-600 mb-4 whitespace-pre-line">{message}</p>
        {requiresReason && (
          <div className="mb-4">
            <label
              htmlFor="confirm-reason-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {reasonLabel}
            </label>
            <textarea
              id="confirm-reason-input"
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500 shadow-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
            />
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 cursor-pointer bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={requiresReason && !reason.trim()} // Disable nếu yêu cầu lý do mà lý do trống
            className={`px-4 py-2 cursor-pointer text-white rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialogDelete; // Thêm export default nếu bạn muốn dùng theo cách đó