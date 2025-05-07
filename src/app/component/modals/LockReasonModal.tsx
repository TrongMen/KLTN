"use client";

import React, { useState } from 'react';
import { Cross1Icon, LockClosedIcon, ReloadIcon } from '@radix-ui/react-icons';
import { toast } from 'react-hot-toast';

interface LockReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  memberName: string;
  isSubmittingLock: boolean;
}

const LockReasonModal: React.FC<LockReasonModalProps> = ({ isOpen, onClose, onSubmit, memberName, isSubmittingLock }) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Vui lòng nhập lý do khóa tài khoản.");
      return;
    }
    onSubmit(reason);
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Lý do khóa tài khoản "{memberName}"</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 p-1 rounded-full transition-colors">
            <Cross1Icon className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do khóa..."
            rows={4}
            className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent shadow-sm"
            disabled={isSubmittingLock}
          />
        </div>
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isSubmittingLock}
            className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium transition-colors shadow-sm disabled:opacity-70"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmittingLock || !reason.trim()}
            className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors shadow-sm disabled:opacity-70 disabled:bg-red-300 flex items-center justify-center gap-2"
          >
            {isSubmittingLock ? <ReloadIcon className="w-4 h-4 animate-spin"/> : <LockClosedIcon className="w-4 h-4"/>}
            {isSubmittingLock ? "Đang xử lý..." : "Xác nhận khóa"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockReasonModal;