// src/components/modals/QRScannerModalStyled.tsx (Hoặc đường dẫn của bạn)
'use client';

import React, { useEffect, useState } from 'react';
import QRScanner from './QRScanner'; // Đường dẫn đến QRScanner đã chỉnh sửa
import { Cross2Icon, UpdateIcon } from '@radix-ui/react-icons'; // Giả sử bạn muốn giữ nút đổi camera (mặc dù Html5QrcodeScanner có thể tự xử lý)

interface QRScannerModalStyledProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void; // Được gọi khi quét thành công
  eventName?: string;
  eventId?: string | null; // Truyền eventId nếu cần cho logic sau khi quét
  // Các props khác nếu cần cho QRScanner (ví dụ: qrbox, fps)
}

const SCANNER_ELEMENT_ID_IN_MODAL = 'qr-scanner-modal-area';

export default function QRScannerModalStyled({
  isOpen,
  onClose,
  onScanSuccess,
  eventName = 'Sự kiện không tên',
  eventId,
}: QRScannerModalStyledProps) {
  const [statusMessage, setStatusMessage] = useState<string | null>('Đang khởi tạo camera...');
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset trạng thái khi modal mở
      setStatusMessage('Di chuyển camera vào mã QR...');
      setScanError(null);
    }
  }, [isOpen]);

  const handleInternalScanSuccess = (decodedText: string) => {
    setStatusMessage('Đã quét! Đang xử lý...');
    onScanSuccess(decodedText); // Truyền kết quả lên cha
    // Quyết định đóng modal nên ở component cha sau khi xử lý API
  };

  const handleInternalScanError = (errorMessage: string) => {
    setScanError(`Lỗi quét: ${errorMessage.substring(0,100)}`); // Giới hạn độ dài thông báo lỗi
    setStatusMessage(null); // Xóa thông báo trạng thái khác
  };

  // Html5QrcodeScanner thường tự động cung cấp dropdown để chọn camera nếu có nhiều camera.
  // Nút switch camera thủ công có thể không cần thiết hoặc khó tích hợp trực tiếp
  // với Html5QrcodeScanner mà không can thiệp sâu.
  // Nếu bạn thực sự cần nút này, bạn có thể phải xem xét lại việc dùng Html5Qrcode API cấp thấp hơn.
  // const handleSwitchCamera = () => {
  //   // Logic chuyển camera với Html5QrcodeScanner phức tạp hơn,
  //   // vì nó quản lý UI của chính nó.
  //   console.log("Switching camera (not implemented for Html5QrcodeScanner wrapper)");
  // };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose} // Đóng khi click ra ngoài (overlay)
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()} // Ngăn click bên trong modal đóng modal
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 text-center">Quét mã QR điểm danh</h3>
          {eventName && (
            <p className="text-sm text-gray-600 truncate text-center mt-1">{eventName}</p>
          )}
        </div>

        {/* Scanner container */}
        <div className="relative w-full aspect-square bg-gray-900">
          {/* Đây là nơi QRScanner sẽ render vào */}
          <div id={SCANNER_ELEMENT_ID_IN_MODAL} className="w-full h-full">
            {/* QRScanner component sẽ được render ở đây nếu isOpen,
                và nó sẽ tự gắn vào div này.
                Tuy nhiên, chúng ta sẽ render QRScanner có điều kiện BÊN TRONG div này
                để đảm bảo div luôn tồn tại khi QRScanner cố gắng tìm nó.
            */}
          </div>
          {isOpen && ( // Chỉ render QRScanner khi modal thực sự mở để nó có thể tìm thấy elementId
             <QRScanner
                elementId={SCANNER_ELEMENT_ID_IN_MODAL}
                onScanSuccess={handleInternalScanSuccess}
                onScanError={handleInternalScanError}
                // Bạn có thể truyền qrbox và fps tùy chỉnh ở đây nếu muốn
                qrbox={{ width: Math.min(300, window.innerWidth - 80), height: Math.min(300, window.innerWidth - 80) }} //Responsive qrbox
                fps={5}
            />
          )}


          {/* Overlay cho trạng thái và lỗi */}
          {(scanError || statusMessage) && !internalErrorFromScanner && ( // internalErrorFromScanner là một biến ví dụ nếu QRScanner tự báo lỗi
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-white text-center pointer-events-none transition-opacity duration-300
                ${scanError ? 'bg-red-600/90' : 'bg-black/75'}`}
            >
              {scanError && <p className="font-semibold text-lg mb-1">Lỗi!</p>}
              <p className="text-sm">{scanError || statusMessage}</p>
            </div>
          )}

          {/* Nút đóng X ở góc phải trên của vùng scanner (thay vì của cả modal) */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white bg-black/30 hover:bg-black/60 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white z-20"
            aria-label="Đóng trình quét"
          >
            <Cross2Icon className="w-5 h-5" />
          </button>

           {/* Nút chuyển camera - Html5QrcodeScanner thường có UI riêng cho việc này */}
           {/* {cameras.length > 1 && (
             <button
               onClick={handleSwitchCamera}
               disabled={isProcessing} // isProcessing là state của modal này nếu có
               className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/30 hover:bg-black/60 text-white text-xs rounded-full disabled:opacity-50 z-20"
             >
               <UpdateIcon className="w-4 h-4"/>
               Đổi
             </button>
           )} */}
        </div>

        {/* Footer / Nút đóng chính */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-center">
          <button
            onClick={onClose}
            // disabled={isProcessing} // Nếu có state isProcessing để chặn đóng khi đang gọi API
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
// Biến internalErrorFromScanner không tồn tại, cần sửa nếu muốn dùng.
// Hiện tại, QRScanner sẽ hiển thị lỗi của nó bên trong div của nó.
const internalErrorFromScanner = false; // Placeholder