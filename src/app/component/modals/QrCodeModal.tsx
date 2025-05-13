"use client";

import React from "react";

export interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  isLoading: boolean;
  eventName?: string;
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose, imageUrl, isLoading, eventName }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 pt-5 rounded-lg shadow-xl max-w-xs w-full transform transition-all duration-300 ease-in-out scale-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 truncate" title={eventName ? `Mã QR cho: ${eventName}` : 'Mã QR Sự kiện'}>
            {eventName ? `Mã QR: ${eventName}` : 'Mã QR Sự kiện'}
            </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Đóng modal"
          >
            &times;
          </button>
        </div>
        <div className="flex justify-center items-center min-h-[256px] w-[256px] mx-auto bg-gray-100 rounded">
          {isLoading ? (
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Đang tải mã QR...</p>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={`Mã QR cho ${eventName || 'sự kiện'}`} className="max-w-full h-auto object-contain" />
          ) : (
            <p className="text-red-500 text-center">Không thể hiển thị mã QR. <br/> Vui lòng thử lại.</p>
          )}
        </div>
        <div className="mt-6 text-right">
            <button
                onClick={onClose}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};

export default QrCodeModal;