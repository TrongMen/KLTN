"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Html5Qrcode,
  Html5QrcodeResult,
  Html5QrcodeError,
  Html5QrcodeCameraScanConfig,
  Html5QrcodeScannerState,
  CameraDevice,
} from "html5-qrcode";
import { Cross2Icon, UpdateIcon } from "@radix-ui/react-icons";
import { toast } from "react-hot-toast";

interface AttendeeQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendeeUserId: string | null;
  onCheckInSuccess?: () => void;
  fps?: number;
  qrboxSize?: number | { width: number; height: number };
}

const ATTENDEE_VIDEO_ELEMENT_ID = "attendee-qr-video-element";

const AttendeeQrScannerModal: React.FC<AttendeeQrScannerModalProps> = ({
  isOpen,
  onClose,
  attendeeUserId,
  onCheckInSuccess,
  fps = 10,
  qrboxSize = 300,
}) => {
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
  const [isScanningActive, setIsScanningActive] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);

  const qrboxWidth =
    typeof qrboxSize === "number" ? qrboxSize : qrboxSize.width;
  const qrboxHeight =
    typeof qrboxSize === "number" ? qrboxSize : qrboxSize.height;

  const stopMediaStream = useCallback(async () => {
    console.log(
      "Cleanup Attendee Scanner: Stopping media stream and scanner..."
    );

    const codeToStop = html5QrCodeRef.current;
    if (codeToStop) {
      try {
        if (
          codeToStop.isScanning ||
          codeToStop.getState() === Html5QrcodeScannerState.PAUSED ||
          codeToStop.getState() === Html5QrcodeScannerState.SCANNING
        ) {
          console.log(`Scanner state before stop: ${codeToStop.getState()}`);
          await codeToStop.stop();
          console.log("Scanner stopped successfully via stopMediaStream.");
        }
      } catch (e) {
        console.warn(
          "Cleanup Attendee Scanner: Error stopping html5QrCode:",
          e
        );
      } finally {
        html5QrCodeRef.current = null; // Clear ref after attempting stop
      }
    } else {
      console.log("Cleanup: html5QrCodeRef was already null.");
    }

    if (streamRef.current) {
      console.log("Stopping tracks for stream:", streamRef.current.id);
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    } else {
      console.log("Cleanup: streamRef was already null.");
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
      console.log("Video element srcObject cleared.");
    }

    setIsScanningActive(false);
    setMessage(null);
    setLastError(null);
    setIsInitializing(true); // Reset to initializing state for next open
  }, []);

  const handleEventCheckIn = useCallback(
    async (qrData: string) => {
      if (!attendeeUserId || isProcessingCheckIn) {
        if (!attendeeUserId)
          toast.error("Lỗi: Không xác định được người dùng.");
        return;
      }
      setIsProcessingCheckIn(true);
      setMessage("Đang xử lý check-in...");
      const loadingToastId = toast.loading("Đang gửi yêu cầu check-in...");
      try {
        const token = localStorage.getItem("authToken");
        if (!token) throw new Error("Chưa đăng nhập hoặc token không hợp lệ.");
        const apiUrl = `http://localhost:8080/identity/api/events/${attendeeUserId}/check-in-2`;
        const formData = new FormData();
        formData.append("qrCodeData", qrData);
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const result = await response.json();
        if (response.ok && result.code === 1000) {
          toast.success(result.message || "Check-in thành công!", {
            id: loadingToastId,
          });
          await stopMediaStream(); // Dừng stream/scan TRƯỚC KHI gọi onClose
          onCheckInSuccess?.();
          onClose();
        } else {
          throw new Error(
            result.message || `Lỗi Check-in API (${response.status})`
          );
        }
      } catch (error: any) {
        console.error("Attendee Check-in API Error:", error);
        const errorMessage = error.message || "Check-in thất bại.";
        toast.error(errorMessage, { id: loadingToastId });
        setMessage(`Lỗi: ${errorMessage}. Thử quét lại.`);
        setLastError(`Lỗi: ${errorMessage}. Thử quét lại.`);
        setIsScanningActive(false);
        setTimeout(() => {
          if (
            html5QrCodeRef.current &&
            html5QrCodeRef.current.getState() === Html5QrcodeScannerState.PAUSED
          ) {
            html5QrCodeRef.current
              .resume()
              .then(() => setIsScanningActive(true))
              .catch((e) =>
                console.error("Error resuming after API error:", e)
              );
          } else if (
            html5QrCodeRef.current &&
            html5QrCodeRef.current.getState() !==
              Html5QrcodeScannerState.SCANNING
          ) {
            console.warn(
              "Scanner likely stopped, cannot resume automatically after API error."
            );
            // Có thể cần start lại hoàn toàn nếu muốn quét tiếp sau lỗi API
          }
        }, 1500);
      } finally {
        setIsProcessingCheckIn(false);
      }
    },
    [
      attendeeUserId,
      onClose,
      isProcessingCheckIn,
      onCheckInSuccess,
      stopMediaStream,
    ]
  );

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true); // Reset init state khi mở
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length) {
            setCameras(devices);
            const rearCameraIndex = devices.findIndex(
              (camera) =>
                camera.label.toLowerCase().includes("back") ||
                camera.label.toLowerCase().includes("environment")
            );
            setSelectedCameraIndex(
              rearCameraIndex !== -1 ? rearCameraIndex : 0
            );
            console.log("Available cameras for attendee:", devices);
          } else {
            setCameras([]);
            console.error("No cameras found for attendee scanner.");
            setMessage("Lỗi: Không tìm thấy camera.");
            setLastError("Lỗi: Không tìm thấy camera.");
            setIsInitializing(false);
          }
        })
        .catch((err) => {
          console.error("Error getting cameras for attendee:", err);
          setMessage("Lỗi lấy danh sách camera.");
          setLastError("Lỗi lấy danh sách camera.");
          setCameras([]);
          setIsInitializing(false);
        });
    } else {
      // Reset state khi modal đóng (component vẫn còn mount)
      setCameras([]);
      setSelectedCameraIndex(0);
      // stopMediaStream(); // Đã gọi trong handleClose
    }
  }, [isOpen]);

  useEffect(() => {
    let isMounted = true;
    let currentHtml5QrCodeInstance: Html5Qrcode | null = null;

    const startManualCamera = async () => {
      if (
        !isMounted ||
        !videoRef.current ||
        cameras.length === 0 ||
        selectedCameraIndex >= cameras.length
      ) {
        console.log(
          "Attendee Scanner: Skipping startManualCamera - Conditions not met."
        );
        if (cameras.length === 0 && isOpen && !lastError) {
          setMessage("Lỗi: Không tìm thấy camera.");
          setLastError("Lỗi: Không tìm thấy camera.");
        }
        setIsInitializing(false);
        return;
      }

      const currentCamera = cameras[selectedCameraIndex];
      const currentCameraId = currentCamera.id;

      setIsInitializing(true);
      setIsScanningActive(false);
    //   setMessage("Đang khởi tạo camera...");
      setLastError(null);

      // Dọn dẹp trước khi bắt đầu mới
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current
          .stop()
          .catch((e) =>
            console.warn("Error stopping previous scanner on switch/start:", e)
          );
      }
      html5QrCodeRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.load();
      }

      try {
        console.log(
          `Attendee Scanner: Attempting camera: ${currentCamera.label} (ID: ${currentCameraId})`
        );
        const constraints = { video: { deviceId: { exact: currentCameraId } } };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        if (!isMounted || !videoRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        console.log("Attendee Scanner: MediaStream acquired.", stream);
        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = async () => {
          if (!isMounted || !videoRef.current) return;
          try {
            await videoRef.current.play();
            if (!isMounted) return;
            console.log("Attendee Scanner: Video play initiated.");

            await new Promise((resolve) => setTimeout(resolve, 150));
            if (
              !isMounted ||
              !videoRef.current ||
              videoRef.current.readyState < 3
            ) {
              if (isMounted)
                console.error(
                  "Attendee Scanner: Video not ready. State:",
                  videoRef.current?.readyState
                );
              if (isMounted) throw new Error("Video không sẵn sàng.");
              return;
            }

            console.log(
              "Attendee Scanner: Initializing Html5Qrcode for scanning."
            );
            currentHtml5QrCodeInstance = new Html5Qrcode(
              ATTENDEE_VIDEO_ELEMENT_ID,
              { verbose: false }
            );
            html5QrCodeRef.current = currentHtml5QrCodeInstance;

            const config: Html5QrcodeCameraScanConfig = {
              fps: fps,
              qrbox: { width: qrboxWidth, height: qrboxHeight },
            };

            await currentHtml5QrCodeInstance.start(
              currentCameraId,
              config,
              (decodedText, result) => {
                if (!isMounted || !isScanningActive || isProcessingCheckIn)
                  return;
                setIsScanningActive(false);
                if (
                  html5QrCodeRef.current?.getState() ===
                  Html5QrcodeScannerState.SCANNING
                ) {
                  html5QrCodeRef.current?.pause(true);
                }
                setMessage("Đã quét được mã sự kiện, đang xử lý check-in...");
                handleEventCheckIn(decodedText);
              },
              (errorMessage, error) => {
                if (!isMounted || !isScanningActive) return;
                if (
                  errorMessage.toLowerCase().includes("no qr code found") ||
                  errorMessage.toLowerCase().includes("qr code parse error")
                ) {
                  if (
                    !isInitializing &&
                    !lastError?.startsWith("Lỗi") &&
                    !message?.startsWith("Đã quét")
                  ) {
                    setMessage("Không tìm thấy mã QR sự kiện...");
                  } else {
                    console.log(
                      "Attendee Scanner notice (suppressed during init):",
                      errorMessage
                    );
                  }
                  return;
                }
                console.warn(
                  "Attendee Scanner: Html5Qrcode Scanning Error:",
                  errorMessage,
                  error
                );
              }
            );

            if (!isMounted) return;
            console.log("Attendee Scanner: Html5Qrcode scanning started.");
            setIsScanningActive(true);
            setIsInitializing(false);
            setLastError(null);
            // setMessage("Di chuyển camera vào mã QR của sự kiện...");
          } catch (playOrScanError: any) {
            if (!isMounted) return;
            console.error(
              "Attendee Scanner: Error during play() or start():",
              playOrScanError
            );
            let displayScanError =
              playOrScanError.message ||
              playOrScanError.name ||
              "Không thể bắt đầu quét";
            if (playOrScanError.name === "NotAllowedError")
              displayScanError = "Quyền truy cập camera bị từ chối khi quét.";
            setMessage(`Lỗi: ${displayScanError}`);
            setLastError(`Lỗi: ${displayScanError}`);
            stopMediaStream();
            setIsInitializing(false);
          }
        };
        videoRef.current.onerror = (event) => {
          if (!isMounted) return;
          console.error(
            "Attendee Scanner: Video element error:",
            event,
            videoRef.current?.error
          );
          setMessage("Lỗi tải dữ liệu video.");
          setLastError("Lỗi tải dữ liệu video.");
          stopMediaStream();
          setIsInitializing(false);
        };
      } catch (err: any) {
        if (!isMounted) return;
        console.error(
          "Attendee Scanner: Failed to get cameras or user media:",
          err
        );
        let displayError = err.message || err.name || "Lỗi không xác định";
        if (err.name === "NotAllowedError")
          displayError = "Quyền truy cập camera bị từ chối.";
        else if (err.name === "NotFoundError")
          displayError = "Không tìm thấy camera yêu cầu.";
        else if (err.name === "NotReadableError")
          displayError = "Không thể đọc tín hiệu camera.";
        else if (err.name === "OverconstrainedError")
          displayError = "Camera không hỗ trợ cấu hình.";
        else displayError = `Lỗi Camera: ${err.name || "không rõ"}`;
        setMessage(displayError);
        setLastError(displayError);
        toast.error(displayError, { duration: 7000 });
        stopMediaStream();
        setIsInitializing(false);
      }
    };

    if (isOpen && attendeeUserId && cameras.length > 0) {
      startManualCamera();
    } else if (!isOpen) {
      // Cleanup sẽ được gọi bởi return của effect này hoặc effect lấy camera
    } else if (
      isOpen &&
      cameras.length === 0 &&
      !isInitializing &&
      !lastError
    ) {
      setMessage("Lỗi: Không tìm thấy camera.");
      setLastError("Lỗi: Không tìm thấy camera.");
    } else if (isOpen && !attendeeUserId && !isInitializing) {
      setMessage("Lỗi: Không xác định được người dùng.");
      setLastError("Lỗi: Không xác định được người dùng.");
    }

    return () => {
      isMounted = false;
      console.log(
        `Attendee Scanner: Effect cleanup for camera index ${selectedCameraIndex}`
      );
      stopMediaStream();
    };
  }, [
    isOpen,
    attendeeUserId,
    cameras,
    selectedCameraIndex,
    fps,
    qrboxWidth,
    qrboxHeight,
    stopMediaStream,
    handleEventCheckIn,
  ]); // Bỏ onClose khỏi dependencies

  useEffect(() => {
    if (
      message &&
      message === "Không tìm thấy mã QR sự kiện..." &&
      !isInitializing &&
      !isProcessingCheckIn
    ) {
      const timer = setTimeout(() => {
        setMessage((prev) =>
          prev === "Không tìm thấy mã QR sự kiện..." ? null : prev
        );
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [message, isInitializing, isProcessingCheckIn]);

  const handleSwitchCamera = () => {
    if (cameras.length <= 1 || isInitializing || isProcessingCheckIn) {
      if (cameras.length <= 1 && !isInitializing)
        toast.info("Chỉ có một camera khả dụng.");
      return;
    }
    console.log("Attendee Scanner: Switching camera...");
    const nextIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(nextIndex);
  };

  // Hàm xử lý đóng modal (gọi cả stopMediaStream và onClose)
  const handleClose = useCallback(() => {
    stopMediaStream();
    onClose(); // Gọi prop onClose từ component cha
  }, [stopMediaStream, onClose]);

  const isFrontCameraSelected = cameras[selectedCameraIndex]?.label
    .toLowerCase()
    .includes("front");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 transition-opacity duration-300 ease-out"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendee-qr-scanner-title"
      // Không cần onClick={handleClose} ở đây vì nó làm đóng khi click vào nền mờ
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 transform transition-all duration-300 ease-out scale-100 relative flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          disabled={isProcessingCheckIn}
          className="absolute cursor-pointer top-2 right-2 text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 z-50 disabled:opacity-50"
          aria-label="Đóng"
        >
          <Cross2Icon className="w-5 h-5" />
        </button>

        {cameras.length > 1 && (
          <button
            onClick={handleSwitchCamera}
            disabled={isInitializing || isProcessingCheckIn}
            className="absolute top-2 left-2 text-gray-700 bg-white/70 hover:bg-white p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 z-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Chuyển camera"
            title="Chuyển camera"
          >
            <UpdateIcon
              className={`w-5 h-5 ${isInitializing ? "animate-spin" : ""}`}
            />
          </button>
        )}

        <h3
          id="attendee-qr-scanner-title"
          className="text-lg font-semibold text-center text-gray-800 mb-2 flex-shrink-0"
        >
          Quét QR Sự Kiện Để Check-in
        </h3>

        <div className="w-full max-w-md mx-auto aspect-square border border-gray-300 rounded bg-black mb-3 relative flex-grow flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            id={ATTENDEE_VIDEO_ELEMENT_ID}
            playsInline
            autoPlay
            muted
            className={`block w-full h-full object-cover ${
              isFrontCameraSelected ? "scale-x-[-1]" : ""
            }`}
            style={{ zIndex: 5 }}
          ></video>

          <div
            className={`absolute inset-0 flex items-center justify-center p-4 text-center z-20 transition-opacity duration-300 pointer-events-none
                    ${message ? "opacity-100" : "opacity-0"}
                    ${
                      lastError?.startsWith("Lỗi Camera") ||
                      message?.startsWith("Lỗi Camera")
                        ? "bg-red-800/80 text-white"
                        : lastError
                        ? "bg-yellow-600/80 text-black"
                        : isInitializing
                        ? "bg-black/60 text-white"
                        : message
                        ? "bg-black/50 text-white"
                        : "bg-transparent"
                    }
                    ${isInitializing || message ? "backdrop-blur-sm" : ""} `}
          >
            {message && <p className="text-sm font-medium">{message}</p>}
          </div>

          {isProcessingCheckIn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}

          {!isInitializing &&
            isScanningActive &&
            !lastError?.startsWith("Lỗi Camera") && (
              <div
                className="absolute z-10 pointer-events-none"
                style={{
                  width: `${qrboxWidth}px`,
                  height: `${qrboxHeight}px`,
                  left: "50%",
                  top: "50%",
                  transform: "translate(-50%, -50%)",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div
                  className="absolute top-0 left-0 w-full h-full"
                  style={{
                    border: "3px solid white",
                    borderRadius: "8px",
                    boxSizing: "border-box",
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

        <button
          onClick={handleClose}
          disabled={isProcessingCheckIn}
          className="mt-auto w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 flex-shrink-0 disabled:opacity-50"
        >
          {isProcessingCheckIn ? "Đang xử lý..." : "Đóng"}
        </button>
      </div>
    </div>
  );
};

export default AttendeeQrScannerModal;
