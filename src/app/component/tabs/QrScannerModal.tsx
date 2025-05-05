"use client"

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Html5Qrcode,
    Html5QrcodeResult,
    Html5QrcodeError,
    Html5QrcodeCameraScanConfig,
    Html5QrcodeScannerState,
    CameraDevice
} from "html5-qrcode";
import { Cross2Icon } from "@radix-ui/react-icons";
import { toast } from "react-hot-toast";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string | null;
  eventName?: string;
  fps?: number;
  qrboxSize?: number | { width: number; height: number };
  onScanSuccess?: () => void;
}

const VIDEO_ELEMENT_ID = "qr-video-element-for-scan";

const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventName = "Sự kiện",
  fps = 10,
  qrboxSize = 250,
  onScanSuccess,
}) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const qrboxWidth = typeof qrboxSize === 'number' ? qrboxSize : qrboxSize.width;
  const qrboxHeight = typeof qrboxSize === 'number' ? qrboxSize : qrboxSize.height;

  const handleCheckInApi = useCallback(async (qrData: string) => {
    if (!eventId || isProcessingCheckIn) {
      return;
    }
    setIsProcessingCheckIn(true);
    setMessage("Đang xử lý điểm danh...");
    const loadingToastId = toast.loading("Đang gửi yêu cầu điểm danh...");

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Chưa đăng nhập hoặc token không hợp lệ.");
      const apiUrl = `http://localhost:8080/identity/api/events/${eventId}/check-in`;
      const formData = new FormData();
      formData.append('qrCodeData', qrData);
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      const result = await response.json();
      if (response.ok && result.code === 1000) {
        toast.success(result.message || "Điểm danh thành công!", { id: loadingToastId });
        onScanSuccess?.();
        onClose();
      } else {
        throw new Error(result.message || `Lỗi API (${response.status})`);
      }
    } catch (error: any) {
      console.error("Check-in API Error:", error);
      const errorMessage = error.message || "Điểm danh thất bại.";
      toast.error(errorMessage, { id: loadingToastId });
      setMessage(`Lỗi: ${errorMessage}. Thử quét lại.`);
      setLastError(`Lỗi: ${errorMessage}. Thử quét lại.`);
      setIsScanningActive(false);
       setTimeout(() => {
           if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === Html5QrcodeScannerState.PAUSED) {
                html5QrCodeRef.current.resume().catch(e => console.error("Error resuming after API error:", e));
                setIsScanningActive(true);
           }
       }, 1000);

    } finally {
      setIsProcessingCheckIn(false);
    }
  }, [eventId, onClose, isProcessingCheckIn, onScanSuccess]);

  const stopMediaStream = useCallback(() => {
      console.log("Cleanup: Stopping media stream and scanner...");
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
      if (videoRef.current) {
           videoRef.current.srcObject = null;
           videoRef.current.removeAttribute('src');
           videoRef.current.load();
      }
      const codeToStop = html5QrCodeRef.current;
      if (codeToStop && codeToStop.isScanning) {
           codeToStop.stop().catch(e => console.warn("Cleanup: Error stopping html5QrCode:", e));
      }
      html5QrCodeRef.current = null;
      setIsScanningActive(false);
      setMessage(null);
      setLastError(null);
      setIsInitializing(false);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let currentCameraId: string | null = null;

    const startManualCamera = async () => {
        if (!isMounted || !videoRef.current) return;

        setIsInitializing(true);
        setIsScanningActive(false);
        setMessage("Đang khởi tạo camera...");
        setLastError(null);

        try {
            console.log("Requesting camera list...");
            const cameras: CameraDevice[] = await Html5Qrcode.getCameras();
            if (!isMounted) return;

            if (cameras && cameras.length) {
                currentCameraId = cameras[0].id;
                const frontCamera = cameras.find(camera => camera.label.toLowerCase().includes('front'));
                 if (frontCamera) {
                    currentCameraId = frontCamera.id;
                    console.log(`Attempting to use front camera: ${frontCamera.label} (ID: ${currentCameraId})`);
                 } else {
                     const rearCamera = cameras.find(camera => camera.label.toLowerCase().includes('back') || camera.label.toLowerCase().includes('environment'));
                     if(rearCamera) {
                         currentCameraId = rearCamera.id;
                         console.log(`Front camera not found, trying rear camera: ${rearCamera.label} (ID: ${currentCameraId})`);
                     } else {
                        console.log(`Front/Rear camera not found by label, using default: ${cameras[0].label} (ID: ${currentCameraId})`);
                     }
                 }


                console.log(`Requesting getUserMedia with deviceId: ${currentCameraId}`);
                const constraints = { video: { deviceId: { exact: currentCameraId } } };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (!isMounted || !videoRef.current) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                console.log("MediaStream acquired manually:", stream);
                streamRef.current = stream;
                videoRef.current.srcObject = stream;

                videoRef.current.onloadedmetadata = async () => {
                    if (!isMounted || !videoRef.current) return;
                    try {
                        await videoRef.current.play();
                        if (!isMounted) return;

                         console.log("Video element play initiated. State:", {
                             readyState: videoRef.current.readyState,
                             paused: videoRef.current.paused,
                             error: videoRef.current.error,
                             networkState: videoRef.current.networkState,
                             srcObjectAssigned: !!videoRef.current.srcObject
                         });

                        await new Promise(resolve => setTimeout(resolve, 100));
                        if (!isMounted) return;

                        if (videoRef.current.readyState >= 3) {
                            console.log("Video readyState sufficient, initializing Html5Qrcode for scanning.");
                            const html5QrCode = new Html5Qrcode(VIDEO_ELEMENT_ID, { verbose: true });
                            html5QrCodeRef.current = html5QrCode;

                            const config: Html5QrcodeCameraScanConfig = { fps: fps, qrbox: { width: qrboxWidth, height: qrboxHeight } };

                            // *** Gọi start với cameraId đã chọn ***
                            await html5QrCode.start(
                                currentCameraId!, // QUAN TRỌNG: Truyền ID camera
                                config,
                                (decodedText, result) => {
                                    if (!isMounted || !isScanningActive || isProcessingCheckIn) return;
                                    setIsScanningActive(false);
                                    if (html5QrCodeRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
                                        html5QrCodeRef.current?.pause(true);
                                    }
                                    setMessage("Đã quét được mã, đang xử lý...");
                                    handleCheckInApi(decodedText);
                                },
                                (errorMessage, error) => {
                                    if (!isMounted || !isScanningActive) return;
                                    if (errorMessage.toLowerCase().includes("qr code parse error") || errorMessage.toLowerCase().includes("no qr code found")) {
                                       console.log("Scanner notice:", errorMessage);
                                       if (!lastError?.startsWith("Lỗi") && !message?.startsWith("Đã quét")) {
                                          //  setMessage("Không tìm thấy mã QR, vui lòng căn chỉnh lại...");
                                       }
                                       return;
                                    }
                                    console.warn("Html5Qrcode Scanning Error:", errorMessage, error);
                                }
                            );

                            if (!isMounted) return;
                            console.log("Html5Qrcode scanning started.");
                            setIsScanningActive(true); // Đặt true SAU KHI start() thành công
                            setMessage("Di chuyển camera vào mã QR...");
                            setLastError(null);
                            setIsInitializing(false); // Kết thúc khởi tạo thành công

                        } else {
                             console.error("Video element not ready after loadedmetadata & play attempt. ReadyState:", videoRef.current.readyState);
                             throw new Error("Video không sẵn sàng để quét.");
                        }
                    } catch (playOrScanError: any) { // Bắt lỗi cụ thể hơn
                         if (!isMounted) return;
                         console.error("Error during play() or html5QrCode.start():", playOrScanError);
                         // Phân tích lỗi 'start' nếu có
                         let displayScanError = playOrScanError.message || playOrScanError.name || 'Không thể bắt đầu quét';
                          if (playOrScanError instanceof Error && playOrScanError.message.includes("Cannot read properties of null (reading 'getUserMedia')")) {
                             displayScanError = "Lỗi thư viện nội bộ khi bắt đầu quét.";
                         } else if (playOrScanError.name === 'NotAllowedError') {
                             displayScanError = "Quyền truy cập camera bị từ chối khi quét.";
                         }
                         // ... các phân tích lỗi khác nếu cần
                         setMessage(`Lỗi: ${displayScanError}`);
                         setLastError(`Lỗi: ${displayScanError}`);
                         stopMediaStream(); // Dọn dẹp
                         setIsInitializing(false); // Đánh dấu kết thúc khởi tạo (dù lỗi)
                    }
                };
                videoRef.current.onerror = (event) => {
                    if (!isMounted) return;
                     console.error("Video element error:", event, videoRef.current?.error);
                     setMessage("Lỗi tải dữ liệu video từ camera.");
                     setLastError("Lỗi tải dữ liệu video từ camera.");
                     stopMediaStream();
                     setIsInitializing(false);
                }

            } else {
                console.error("No cameras found.");
                throw new Error("Không tìm thấy camera nào.");
            }
        } catch (err: any) {
            if (!isMounted) return;
             console.error("Failed to get camera list or user media:", err);
             let displayError = err.message || err.name || "Lỗi không xác định";
             if (err.name === 'NotAllowedError') displayError = "Quyền truy cập camera bị từ chối.";
             else if (err.name === 'NotFoundError') displayError = "Không tìm thấy camera được yêu cầu.";
             else if (err.name === 'NotReadableError') displayError = "Không thể đọc tín hiệu từ camera.";
             else if (err.name === 'OverconstrainedError') displayError = "Camera không hỗ trợ cấu hình.";
             else displayError = `Lỗi camera: ${err.name || 'không rõ'}`;

            setMessage(displayError);
            setLastError(displayError);
            toast.error(displayError, { duration: 7000 });
            stopMediaStream();
            setIsInitializing(false); // Kết thúc khởi tạo (lỗi)
        }
        // Không đặt setIsInitializing(false) ở finally nữa,
        // mà đặt sau khi quét thành công hoặc trong các catch lỗi.
    };

    if (isOpen && eventId) {
      startManualCamera();
    } else {
      stopMediaStream();
    }

    return () => {
      isMounted = false;
      stopMediaStream();
    };
  }, [isOpen, eventId, fps, qrboxWidth, qrboxHeight, onClose, stopMediaStream, handleCheckInApi]);

 useEffect(() => {
     if (message && !lastError?.startsWith("Lỗi Camera") && !message?.startsWith("Lỗi:") && !isInitializing && !isProcessingCheckIn && !message?.startsWith("Đã quét")) {
         const timer = setTimeout(() => {
              if (!message?.startsWith("Lỗi") && !message?.startsWith("Đã quét")) {
                 setMessage(null);
              }
         }, 3500);
         return () => clearTimeout(timer);
     }
 }, [message, lastError, isInitializing, isProcessingCheckIn]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 transition-opacity duration-300 ease-out"
      role="dialog" aria-modal="true" aria-labelledby="qr-scanner-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 transform transition-all duration-300 ease-out scale-100 relative flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} disabled={isProcessingCheckIn} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 z-50 disabled:opacity-50" aria-label="Đóng">
          <Cross2Icon className="w-5 h-5" />
        </button>

        <h3 id="qr-scanner-title" className="text-lg font-semibold text-center text-gray-800 mb-2 flex-shrink-0">
          Quét Mã QR Điểm Danh
        </h3>
        <p className="text-sm text-center text-gray-600 mb-3 line-clamp-1 flex-shrink-0">
          {eventName}
        </p>

        <div className="w-full max-w-md mx-auto aspect-square border border-gray-300 rounded bg-black mb-3 relative flex-grow flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            id={VIDEO_ELEMENT_ID}
            playsInline
            autoPlay
            muted
            className="block w-full h-full object-cover scale-x-[-1]"
            style={{ zIndex: 5 }}
          ></video>

            {/* Phục hồi Message Overlay */}
            <div
                className={`absolute inset-0 flex items-center justify-center p-4 text-center z-20 transition-opacity duration-300 pointer-events-none
                    ${message ? 'opacity-100' : 'opacity-0'}
                    ${lastError?.startsWith("Lỗi Camera") || message?.startsWith("Lỗi Camera") ? 'bg-red-800/80 text-white' :
                      lastError ? 'bg-yellow-600/80 text-black' :
                      isInitializing ? 'bg-black/60 text-white' :
                      message ? 'bg-black/50 text-white' :
                      'bg-transparent'
                    }
                    ${(isInitializing || message) ? 'backdrop-blur-sm' : ''} `}
            >
                {message && <p className="text-sm font-medium">{message}</p>}
            </div>

            {isProcessingCheckIn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}

             {/* Phục hồi Viewfinder Overlay */}
            {!isInitializing && isScanningActive && !lastError?.startsWith("Lỗi Camera") && (
                 <div
                    className="absolute z-10 pointer-events-none"
                    style={{
                        width: `${qrboxWidth}px`,
                        height: `${qrboxHeight}px`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    }}
                 >
                    <div
                      className="absolute top-0 left-0 w-full h-full"
                      style={{
                        border: '3px solid white',
                        borderRadius: '8px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-scan-laser opacity-70"></div>
                      <div className="absolute top-[-3px] left-[-3px] w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-md"></div>
                      <div className="absolute top-[-3px] right-[-3px] w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-md"></div>
                      <div className="absolute bottom-[-3px] left-[-3px] w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-md"></div>
                      <div className="absolute bottom-[-3px] right-[-3px] w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-md"></div>
                    </div>
                 </div>
            )}
        </div>

        <style>{`
            @keyframes scan-laser {
                0% { transform: translateY(0%); opacity: 0.5; }
                50% { transform: translateY(calc(${qrboxHeight}px - 2px)); opacity: 0.8; }
                100% { transform: translateY(0%); opacity: 0.5; }
            }
            .animate-scan-laser {
                animation: scan-laser 2.5s infinite linear;
            }
        `}</style>

        <button onClick={onClose} disabled={isProcessingCheckIn} className="mt-auto w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 flex-shrink-0 disabled:opacity-50">
          {isProcessingCheckIn ? "Đang xử lý..." : "Đóng"}
        </button>
      </div>
    </div>
  );
};

export default QrScannerModal;