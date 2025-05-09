'use client';

import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError: (errorMessage: string) => void;
}

export default function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        qrbox: { width: 300, height: 300 },
        fps: 10,
        disableFlip: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      },
      false
    );

    scannerRef.current = scanner;

    const successHandler = (decodedText: string) => {
      try {
        scanner.pause(); // Đơn giản gọi pause() mà không dùng .catch()
        onScanSuccess(decodedText);
      } catch (error) {
        console.error('Pause error:', error);
        // Vẫn tiếp tục xử lý dù pause có lỗi
        onScanSuccess(decodedText);
      }
    };

    const errorHandler = (errorMessage: string) => {
      if (!errorMessage.includes('NotFoundException')) {
        onScanError(errorMessage);
      }
    };

    scanner.render(successHandler, errorHandler);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
          .then(() => console.log('Scanner cleaned up'))
          .catch((error: Error) => console.error('Cleanup error:', error));
      }
    };
  }, [onScanSuccess, onScanError]);

  const requestCameraAccess = () => {
    setCameraError(null);
    if (scannerRef.current) {
      try {
        // Resume không trả về Promise trong phiên bản hiện tại
        scannerRef.current.resume();
      } catch (error) {
        setCameraError('Failed to access camera. Please check permissions.');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div id="reader"></div>
      {cameraError && (
        <div className="mt-4 p-3 bg-red-100 rounded text-red-700">
          <p>{cameraError}</p>
          <button
            onClick={requestCameraAccess}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Request Camera Permissions Again
          </button>
        </div>
      )}
    </div>
  );
}