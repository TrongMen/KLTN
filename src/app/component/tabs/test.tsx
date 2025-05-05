"use client"

import React, { useEffect, useRef, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { toast } from "react-hot-toast";

// Interface chỉ giữ lại các props cần thiết cho việc hiển thị modal và test camera
interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName?: string; // Vẫn giữ để hiển thị tên sự kiện
  // Các props liên quan đến html5-qrcode (onScanSuccess, onScanError, fps, qrboxSize) không cần thiết cho test này
}

// ID cho thẻ video, bạn có thể giữ nguyên hoặc đổi nếu muốn
const VIDEO_ELEMENT_ID = "direct-camera-test-video";

const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  eventName = "Sự kiện",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); // Ref để lưu stream đang hoạt động
  const [message, setMessage] = useState<string | null>(null); // Đổi tên state cho rõ ràng
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    // --- Hàm dọn dẹp ---
    const cleanup = () => {
      console.log("[Direct Test Cleanup] Running cleanup...");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop(); // Dừng từng track trong stream
        });
        console.log("[Direct Test Cleanup] Stream tracks stopped.");
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null; // Gỡ stream khỏi thẻ video
        videoRef.current.removeAttribute('src'); // Đảm bảo không còn src nào khác
        videoRef.current.load(); // Reset video element state
        console.log("[Direct Test Cleanup] Video source cleared.");
      }
      streamRef.current = null;
    };

    if (isOpen) {
      setIsInitializing(true);
      setMessage("Đang yêu cầu truy cập camera...");

      // Kiểm tra sự tồn tại của video element trước khi gọi API
      const videoElement = videoRef.current; // Lấy từ ref
      if (!videoElement) {
          console.error("[Direct Test] Video element ref is not available yet.");
          setMessage("Lỗi: Không tìm thấy thẻ video.");
          setIsInitializing(false);
          return cleanup; // Vẫn trả về cleanup phòng trường hợp ref xuất hiện muộn
      }

      // --- Gọi getUserMedia trực tiếp ---
      const constraints = { video: { facingMode: "user" } };
      console.log("[Direct Test] Requesting getUserMedia with constraints:", constraints);

      navigator.mediaDevices.getUserMedia(constraints)
        .then((stream) => {
          console.log("[Direct Test] getUserMedia SUCCESS!", stream);
          setMessage("Đã nhận stream, đang gắn vào video...");
          streamRef.current = stream; // Lưu stream lại

          videoElement.srcObject = stream; // Gán stream vào thẻ video

          // Lắng nghe các sự kiện quan trọng trên video element
          videoElement.onloadedmetadata = () => {
            console.log("[Direct Test] Video EVENT: loadedmetadata - Dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight);
          };
          videoElement.onplaying = () => {
            console.log("[Direct Test] Video EVENT: playing");
            setMessage("Camera đang hoạt động!"); // Thông báo thành công khi video thực sự phát
            setIsInitializing(false);
          };
          videoElement.onerror = (e) => {
            console.error("[Direct Test] Video EVENT: error", videoElement.error, e);
            setMessage(`Lỗi video element: ${videoElement.error?.message || 'Unknown error'}`);
            cleanup(); // Dọn dẹp khi có lỗi video
            setIsInitializing(false);
          };

          // Thử play video (quan trọng)
          videoElement.play().catch(playError => {
            console.error("[Direct Test] video.play() FAILED:", playError);
            // Lỗi này có thể là "interrupted" nếu cleanup chạy quá nhanh
            if (playError.name !== 'AbortError') { // Chỉ báo lỗi nếu không phải do AbortError từ cleanup
               setMessage(`Lỗi phát video: ${playError.message}`);
               toast.error(`Lỗi phát video: ${playError.message}`, { duration: 4000 });
            }
            cleanup(); // Dọn dẹp nếu không thể phát
            setIsInitializing(false);
          });

        })
        .catch((err) => {
          console.error("[Direct Test] getUserMedia FAILED:", err.name, err.message);
          let displayError = err.message || err.name || "Lỗi không xác định";
          if (err.name === 'NotAllowedError') displayError = "Quyền truy cập camera bị từ chối.";
          else if (err.name === 'NotFoundError') displayError = "Không tìm thấy camera phù hợp.";
          else if (err.name === 'NotReadableError') displayError = "Không thể đọc tín hiệu từ camera.";
          // Thêm các trường hợp lỗi khác
          setMessage(`Lỗi getUserMedia: ${displayError}`);
          toast.error(`Lỗi getUserMedia: ${displayError}`, { duration: 4000 });
          setIsInitializing(false);
          onClose(); // Đóng modal nếu lỗi nghiêm trọng
        });
    } else {
      cleanup(); // Gọi cleanup nếu modal đóng (isOpen thành false)
    }

    // Trả về hàm cleanup của useEffect
    return cleanup;

  }, [isOpen, onClose]); // Chỉ phụ thuộc isOpen và onClose

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 transition-opacity duration-300 ease-out"
      role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 transform transition-all duration-300 ease-out scale-100 relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 z-20" aria-label="Đóng">
          <Cross2Icon className="w-5 h-5" />
        </button>

        <h3 id="qr-scanner-title" className="text-lg font-semibold text-center text-gray-800 mb-2 flex-shrink-0">
          Test Camera Trực Tiếp
        </h3>
        <p className="text-sm text-center text-gray-600 mb-3 line-clamp-1 flex-shrink-0">
          {eventName}
        </p>

        {/* Vùng chứa video */}
        <div className="w-full max-w-md mx-auto aspect-square border border-gray-400 rounded bg-black mb-3 relative flex-grow flex items-center justify-center overflow-hidden">
          {/* Thẻ video với ref và các thuộc tính quan trọng */}
          <video
              ref={videoRef}
              id={VIDEO_ELEMENT_ID}
              playsInline
              autoPlay
              muted
              style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover' // Đảm bảo video vừa vặn
              }}
          ></video>

           {/* Lớp phủ thông báo */}
           {(isInitializing || message) && (
               <div className={`absolute inset-0 flex items-center justify-center text-white p-4 text-center rounded z-10 transition-opacity duration-300 ${message && message.startsWith("Lỗi") ? 'bg-red-600/80' : 'bg-black/50' } backdrop-blur-sm`} style={{ pointerEvents: 'none' }}>
                 <p className="text-sm font-medium">{message}</p>
               </div>
           )}
        </div>

        <button onClick={onClose} className="mt-auto w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 flex-shrink-0">
          Đóng
        </button>
      </div>
    </div>
  );
};

export default QrScannerModal;