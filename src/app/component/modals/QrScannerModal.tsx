"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Html5Qrcode,
    Html5QrcodeResult,
    Html5QrcodeError,
    Html5QrcodeCameraScanConfig,
    Html5QrcodeScannerState,
    CameraDevice
} from "html5-qrcode";
import { Cross2Icon, UpdateIcon } from "@radix-ui/react-icons";
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
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState<number>(0);
  const isMountedRef = useRef(false); // Ref để theo dõi trạng thái mount

  const qrboxWidth = typeof qrboxSize === 'number' ? qrboxSize : qrboxSize.width;
  const qrboxHeight = typeof qrboxSize === 'number' ? qrboxSize : qrboxSize.height;

  // Hàm cleanup được tách ra để sử dụng lại
  const stopScannerAndStream = useCallback(async () => {
    console.log("Cleanup: Stopping media stream and scanner...");
    const codeToStop = html5QrCodeRef.current;
    html5QrCodeRef.current = null; // Set null trước khi stop để tránh race condition

    if (codeToStop) {
        const currentState = codeToStop.getState();
        console.log(`Cleanup: Current scanner state before stop: ${currentState}`);
        if (currentState === Html5QrcodeScannerState.SCANNING || currentState === Html5QrcodeScannerState.PAUSED) {
            try {
                await codeToStop.stop();
                console.log("Cleanup: html5QrCode stopped successfully.");
            } catch (e) {
                console.warn("Cleanup: Error stopping html5QrCode (ignorable on unmount):", e);
            }
        } else {
            console.log("Cleanup: html5QrCode wasn't active.");
        }
    } else {
        console.log("Cleanup: html5QrCodeRef was already null.");
    }

    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        console.log("Cleanup: MediaStream tracks stopped.");
    }
    if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
        console.log("Cleanup: Video srcObject set to null.");
    }
  }, []);


  const handleCheckInApi = useCallback(async (qrData: string) => {
    if (!isMountedRef.current) return; // Kiểm tra mount
    console.log("[handleCheckInApi] Entered function");
    if (!eventId || isProcessingCheckIn) {
        console.log(`[handleCheckInApi] Skipping: eventId=${eventId}, isProcessingCheckIn=${isProcessingCheckIn}`);
        return;
    }
    setIsProcessingCheckIn(true);
    setMessage("Đang xử lý điểm danh...");
    const loadingToastId = toast.loading("Đang gửi yêu cầu điểm danh...");
    console.log(`[handleCheckInApi] Processing check-in for event ${eventId}`);

    try {
      const token = localStorage.getItem("authToken");
      console.log("[handleCheckInApi] Retrieved token:", token ? `Token ending with ...${token.slice(-6)}` : "null");
      if (!token) {
        console.error("[handleCheckInApi] Auth token not found.");
        throw new Error("Chưa đăng nhập hoặc token không hợp lệ.");
      }

      const apiUrl = `http://localhost:8080/identity/api/events/${eventId}/check-in`;
      const formData = new FormData();
      formData.append('qrCodeData', qrData);
      console.log(`[handleCheckInApi] Sending POST to ${apiUrl} with qrData: ${qrData}`);

      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

      if (!isMountedRef.current) return; // Kiểm tra sau fetch

      console.log(`[handleCheckInApi] API Response Status: ${response.status}, OK: ${response.ok}`);

      let result;
      try {
        result = await response.json();
        if (!isMountedRef.current) return; // Kiểm tra sau json parse
        console.log("[handleCheckInApi] API Response JSON:", result);
      } catch (jsonError: any) {
          console.error("[handleCheckInApi] Failed to parse API response as JSON:", jsonError);
          const textResponse = await response.text().catch(() => "Could not read response text");
          console.error("[handleCheckInApi] API Response Text:", textResponse);
          throw new Error(`Lỗi đọc phản hồi từ máy chủ (${response.status})`);
      }


      if (response.ok && result.code === 1000) {
        console.log("[handleCheckInApi] Check-in successful:", result.message);
        toast.success(result.message || "Điểm danh thành công!", { id: loadingToastId });
        onScanSuccess?.();
        onClose(); // onClose sẽ unmount component
      } else {
         console.error("[handleCheckInApi] API Error:", result.message || `Status: ${response.status}, Code: ${result.code}`);
        throw new Error(result.message || `Lỗi điểm danh từ API (${response.status})`);
      }
    } catch (error: any) {
      if (!isMountedRef.current) return; // Kiểm tra trong catch
      console.error("[handleCheckInApi] Catch block error:", error);
      const errorMessage = error.message || "Điểm danh thất bại.";
      toast.error(errorMessage, { id: loadingToastId });
      setMessage(`Lỗi: ${errorMessage}. Thử quét lại.`);
      setLastError(`Lỗi: ${errorMessage}. Thử quét lại.`);

      // Tạm dừng scanner (nếu còn tồn tại) trước khi thử resume
      if (html5QrCodeRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
            try {
                 html5QrCodeRef.current.pause(true);
                 console.log('[handleCheckInApi Catch] Scanner explicitly paused before resume attempt.');
            } catch (pauseError) {
                 console.error('[handleCheckInApi Catch] Error pausing scanner before resume timeout:', pauseError);
            }
        }

        // Thử resume sau một khoảng trễ, nhưng kiểm tra isMounted trước khi cập nhật state
        setTimeout(() => {
            if (!isMountedRef.current) {
                console.log('[handleCheckInApi Catch Timeout] Component unmounted before resuming.');
                return;
            }
           if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === Html5QrcodeScannerState.PAUSED) {
                console.log('[handleCheckInApi Catch Timeout] Attempting to resume scanner...');
                html5QrCodeRef.current.resume()
                .then(() => {
                     if (!isMountedRef.current) return;
                     console.log('[handleCheckInApi Catch Timeout] Scanner resumed successfully.');
                     setIsScanningActive(true);
                     setMessage("Sẵn sàng quét lại...");
                     setLastError(null);
                 })
                .catch(e => {
                    if (!isMountedRef.current) return;
                    console.error("Error resuming scanner after API error:", e);
                     setMessage("Lỗi khi khởi động lại camera. Vui lòng đóng và mở lại.");
                     setLastError("Lỗi khi khởi động lại camera.");
                     setIsScanningActive(false);
                });
           } else {
                console.log('[handleCheckInApi Catch Timeout] Scanner not in PAUSED state or missing, cannot resume. State:', html5QrCodeRef.current?.getState());
                setIsScanningActive(false); // Đảm bảo không active nếu không resume được
           }
      }, 1500);

    } finally {
      // Không cần kiểm tra isMounted ở đây vì chỉ set state nếu try/catch không return sớm
      if (isMountedRef.current) {
          console.log("[handleCheckInApi] Finally block: Setting isProcessingCheckIn to false.");
          setIsProcessingCheckIn(false);
      }
    }
  }, [eventId, onClose, onScanSuccess]); // Bỏ isProcessingCheckIn khỏi dependencies

  // Effect chỉ để quản lý isMountedRef
  useEffect(() => {
    isMountedRef.current = true;
    console.log("QrScannerModal Mounted");
    return () => {
      isMountedRef.current = false;
      console.log("QrScannerModal Unmounted");
    };
  }, []);

  // Effect để lấy danh sách camera khi modal mở
  useEffect(() => {
      if (isOpen) {
          console.log("isOpen effect: Fetching cameras...");
          setIsInitializing(true); // Bắt đầu khởi tạo khi mở
          setMessage(null);
          setLastError(null);
          setCameras([]); // Reset camera list
          Html5Qrcode.getCameras()
              .then(devices => {
                   if (!isMountedRef.current) return;
                  if (devices && devices.length) {
                      setCameras(devices);
                      const frontCameraIndex = devices.findIndex(camera =>
                          camera.label.toLowerCase().includes('front') || (camera as any).facingMode === 'user'
                      );
                      const initialIndex = frontCameraIndex !== -1 ? frontCameraIndex : 0;
                      setSelectedCameraIndex(initialIndex);
                      console.log("isOpen effect: Cameras fetched:", devices);
                      console.log(`isOpen effect: Selected initial camera index: ${initialIndex}`);
                      // Việc khởi động camera sẽ được xử lý bởi effect tiếp theo
                  } else {
                      setCameras([]);
                      console.error("isOpen effect: No cameras found.");
                      setMessage("Lỗi: Không tìm thấy camera.");
                      setLastError("Lỗi: Không tìm thấy camera.");
                      setIsInitializing(false); // Dừng khởi tạo nếu không có camera
                  }
              })
              .catch(err => {
                   if (!isMountedRef.current) return;
                  console.error("isOpen effect: Error getting cameras:", err);
                  setMessage("Lỗi lấy danh sách camera.");
                  setLastError("Lỗi lấy danh sách camera.");
                  setCameras([]);
                   setIsInitializing(false); // Dừng khởi tạo nếu lỗi
              });
      }
      // Không cần cleanup stream ở đây vì effect chính sẽ làm điều đó khi isOpen thay đổi
  }, [isOpen]);

  // Effect chính để khởi động/dừng camera và scanner
  useEffect(() => {
    let currentHtml5QrCodeInstance: Html5Qrcode | null = null; // Biến cục bộ cho instance trong effect này

    const startManualCamera = async () => {
        if (!isMountedRef.current) return; // Kiểm tra mount
        console.log(`[startManualCamera] Attempting start. cameras=${cameras.length}, selectedIndex=${selectedCameraIndex}`);
       if (!videoRef.current || cameras.length === 0 || selectedCameraIndex >= cameras.length) {
           console.log("[startManualCamera] Conditions not met, skipping camera start.");
           // Thông báo lỗi nếu cần thiết (đã xử lý trong effect trước)
           setIsInitializing(false); // Đảm bảo không bị kẹt initializing
           return;
       }

        const currentCamera = cameras[selectedCameraIndex];
        const currentCameraId = currentCamera.id;
        console.log(`[startManualCamera] Selected camera: ${currentCamera.label} (ID: ${currentCameraId})`);

        // State đã được set là initializing=true trong effect trước
        setIsScanningActive(false); // Reset scanning active
        setMessage("Đang khởi tạo camera..."); // Cập nhật message
        setLastError(null);

        // Dọn dẹp trước nếu có (dù stopScannerAndStream thường được gọi khi cleanup)
        await stopScannerAndStream();
         if (!isMountedRef.current) return; // Kiểm tra lại sau khi cleanup bất đồng bộ


        try {
            console.log(`[startManualCamera] Requesting getUserMedia with deviceId: ${currentCameraId}`);
            const constraints = { video: { deviceId: { exact: currentCameraId } } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);

             if (!isMountedRef.current || !videoRef.current) {
                 console.log("[startManualCamera] Component unmounted or videoRef lost after getUserMedia, stopping tracks.");
                 stream.getTracks().forEach(track => track.stop());
                 return;
             }

            console.log("[startManualCamera] MediaStream acquired:", stream);
            streamRef.current = stream;
            videoRef.current.srcObject = stream;

            // Gán event handlers trước khi play
            videoRef.current.onloadedmetadata = async () => {
                if (!isMountedRef.current || !videoRef.current) return;
                 console.log("[onloadedmetadata] Metadata loaded.");
                try {
                     await videoRef.current.play();
                     if (!isMountedRef.current) return;
                     console.log("[onloadedmetadata] videoRef.play() initiated.");

                     await new Promise(resolve => setTimeout(resolve, 200));
                     if (!isMountedRef.current || !videoRef.current) return;

                     if (videoRef.current.readyState < videoRef.current.HAVE_FUTURE_DATA) {
                          console.error("[onloadedmetadata] Video not ready after delay. ReadyState:", videoRef.current.readyState);
                          throw new Error("Video không sẵn sàng để quét.");
                      }
                      console.log("[onloadedmetadata] Video readyState sufficient:", videoRef.current.readyState);

                    console.log("[onloadedmetadata] Initializing Html5Qrcode instance.");
                    // Tạo instance mới thay vì gán vào ref ngay lập tức
                    currentHtml5QrCodeInstance = new Html5Qrcode(VIDEO_ELEMENT_ID, { verbose: true });
                    html5QrCodeRef.current = currentHtml5QrCodeInstance; // Cập nhật ref

                    const config: Html5QrcodeCameraScanConfig = { fps: fps, qrbox: { width: qrboxWidth, height: qrboxHeight } };
                    console.log("[onloadedmetadata] Config for scanner:", config);

                    await currentHtml5QrCodeInstance.start(
                        currentCameraId,
                        config,
                        (decodedText, result) => {
                            if (!isMountedRef.current) return; // Guard
                            console.log(`[QR Success Callback] Fired! isScanningActive=${isScanningActive}, isProcessingCheckIn=${isProcessingCheckIn}`); // Log state lúc được gọi
                            console.log("[QR Success Callback] Decoded Text:", decodedText);

                            // Kiểm tra lại isScanningActive trước khi xử lý để tránh gọi nhiều lần
                            if (!isScanningActive || isProcessingCheckIn) {
                                 console.log("[QR Success Callback] Condition not met (already processing or not active), returning.");
                                 return;
                            }

                             console.log("[QR Success Callback] Pausing scanner...");
                             setIsScanningActive(false); // Quan trọng: Set false NGAY LẬP TỨC để tránh gọi lại handleCheckInApi
                             if (html5QrCodeRef.current?.getState() === Html5QrcodeScannerState.SCANNING) {
                                 html5QrCodeRef.current?.pause(true)
                                    .then(() => console.log("[QR Success Callback] Scanner paused."))
                                    .catch(e => console.error("[QR Success Callback] Error pausing scanner:", e));
                             } else {
                                 console.log("[QR Success Callback] Scanner not in SCANNING state when attempting pause. State:", html5QrCodeRef.current?.getState());
                             }

                             setMessage("Đã quét được mã, đang xử lý...");
                             console.log("[QR Success Callback] Calling handleCheckInApi...");
                             handleCheckInApi(decodedText); // Gọi API
                        },
                        (errorMessage, error) => { // qrErrorCallback
                            if (!isMountedRef.current || !isScanningActive) return; // Guard

                            if (errorMessage.includes("No MultiFormat Readers were found")) {
                                console.error("Critical Scanner Error:", errorMessage, error);
                                if (isMountedRef.current) { // Double check mount before setting state
                                    setMessage("Lỗi bộ đọc mã QR. Vui lòng thử lại.");
                                    setLastError("Lỗi bộ đọc mã QR.");
                                    setIsScanningActive(false);
                                }
                             }
                             else if (errorMessage.toLowerCase().includes("no qr code found") || errorMessage.toLowerCase().includes("qr code parse error")) {
                                 if (isMountedRef.current && !isInitializing && !lastError && !message?.startsWith("Đã quét") && !message?.startsWith("Lỗi")) {
                                     setMessage(prev => {
                                          if (!isMountedRef.current) return null; // Guard inside setter callback
                                          if (prev === "Không tìm thấy mã QR...") return prev;
                                          if (prev === null || prev === "Di chuyển camera vào mã QR..." || prev === "Sẵn sàng quét lại...") {
                                              return "Không tìm thấy mã QR...";
                                          }
                                          return prev;
                                      });
                                 }
                                 return;
                             } else {
                                  console.warn("Html5Qrcode Scanning Error Callback:", errorMessage, error);
                                   if (isMountedRef.current && !lastError && !message?.startsWith("Lỗi")) {
                                        setMessage(`Lỗi quét: ${errorMessage.substring(0, 50)}...`);
                                        setLastError(`Lỗi quét: ${errorMessage.substring(0, 50)}...`);
                                        setIsScanningActive(false);
                                    }
                             }
                        }
                    );

                    if (!isMountedRef.current) return;
                    console.log("[onloadedmetadata] Html5Qrcode scanning started successfully.");
                    // Cập nhật state sau khi start thành công
                     setIsScanningActive(true);
                     setIsInitializing(false);
                     setLastError(null);
                     setMessage("Di chuyển camera vào mã QR...");

                } catch (playOrScanError: any) {
                     if (!isMountedRef.current) return;
                    console.error("[onloadedmetadata] Error during video play() or html5QrCode.start():", playOrScanError);
                    let displayScanError = playOrScanError.message || playOrScanError.name || 'Không thể bắt đầu quét';
                    if (playOrScanError.name === 'NotAllowedError') {
                        displayScanError = "Quyền truy cập camera bị từ chối khi quét.";
                    } else if (playOrScanError.message?.includes("Video not ready")) {
                         displayScanError = "Video chưa sẵn sàng, thử lại.";
                    }
                    setMessage(`Lỗi: ${displayScanError}`);
                    setLastError(`Lỗi: ${displayScanError}`);
                    // Không gọi stopMediaStream ở đây vì cleanup của effect sẽ xử lý
                    setIsInitializing(false); // Đánh dấu kết thúc khởi tạo (dù lỗi)
                     setIsScanningActive(false);
                }
            };

            videoRef.current.onerror = (event) => {
                 if (!isMountedRef.current) return;
                console.error("Video element error event:", event);
                 console.error("Video element error details:", videoRef.current?.error);
                setMessage("Lỗi tải dữ liệu video.");
                setLastError("Lỗi tải dữ liệu video.");
                // Không gọi stopMediaStream ở đây vì cleanup của effect sẽ xử lý
                setIsInitializing(false);
                 setIsScanningActive(false);
            }

        } catch (err: any) {
             if (!isMountedRef.current) return;
            console.error("[startManualCamera] Failed to get user media or during setup:", err);
            let displayError = err.message || err.name || "Lỗi không xác định";
            if (err.name === 'NotAllowedError') displayError = "Quyền truy cập camera bị từ chối.";
            else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') displayError = "Không tìm thấy camera yêu cầu.";
            else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') displayError = "Không thể đọc tín hiệu camera (có thể đang được dùng?).";
            else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') displayError = "Camera không hỗ trợ cấu hình yêu cầu.";
             else if (err.name === 'AbortError') displayError = "Yêu cầu camera bị hủy bỏ.";
            else displayError = `Lỗi Camera: ${err.name || 'không rõ'}`;

            setMessage(displayError);
            setLastError(displayError);
            toast.error(displayError, { duration: 7000 });
            // Không gọi stopMediaStream ở đây vì cleanup của effect sẽ xử lý
            setIsInitializing(false); // Đánh dấu kết thúc khởi tạo (lỗi)
             setIsScanningActive(false);
        }
    };

    // Chỉ chạy startManualCamera khi modal mở, có eventId và có camera
    if (isOpen && eventId && cameras.length > 0) {
      console.log("Main useEffect: Conditions met, calling startManualCamera...");
      startManualCamera();
    } else {
       console.log("Main useEffect: Conditions not met, ensuring init is false if needed.");
       // Nếu modal đang mở nhưng thiếu điều kiện khác, đảm bảo không bị kẹt initializing
       if (isOpen && !isInitializing && (cameras.length === 0 || !eventId)) {
           // Đã có thông báo lỗi từ effect trước nếu không có camera
       } else if (isOpen && isInitializing && (cameras.length === 0 || !eventId)) {
            setIsInitializing(false); // Thoát trạng thái initializing nếu không đủ điều kiện chạy
       }
    }

    // Hàm cleanup chính: Sẽ chạy khi component unmount HOẶC dependencies thay đổi
    return () => {
      console.log(`Main useEffect cleanup executing.`);
      // Dừng scanner và stream bất đồng bộ
      stopScannerAndStream();
      // Reset trạng thái liên quan đến quét khi cleanup (quan trọng khi chuyển camera)
       if (isMountedRef.current){ // Chỉ reset nếu component chưa unmount hẳn (vd: khi đổi camera)
            setIsScanningActive(false);
            // Không reset message/error ở đây để user có thể thấy lỗi cuối cùng trước khi đóng hẳn
            // setIsInitializing(true); // Để effect sau xử lý init lại
       }
    };
    // Dependencies: Chạy lại khi modal mở/đóng, eventId thay đổi, danh sách camera thay đổi, hoặc camera được chọn thay đổi.
  }, [isOpen, eventId, cameras, selectedCameraIndex, fps, qrboxWidth, qrboxHeight, handleCheckInApi, stopScannerAndStream]); // Thêm stopScannerAndStream


  // Effect để xóa các thông báo tạm thời
 useEffect(() => {
     if (!isMountedRef.current) return; // Guard
     if (message && (message === "Không tìm thấy mã QR..." || message === "Sẵn sàng quét lại..." || message === "Di chuyển camera vào mã QR...") && !isInitializing && !isProcessingCheckIn && !lastError) {
          const timer = setTimeout(() => {
              // Kiểm tra lại isMounted trước khi set state trong timeout
              if (isMountedRef.current) {
                   setMessage(prev => {
                        if (prev === "Không tìm thấy mã QR..." || prev === "Sẵn sàng quét lại..." || prev === "Di chuyển camera vào mã QR...") {
                            console.log("Clearing transient message:", prev);
                            return null;
                        }
                        return prev;
                    });
              }
          }, 1500);
          return () => clearTimeout(timer);
      }
  }, [message, isInitializing, isProcessingCheckIn, lastError]);


 // Handler để chuyển camera
 const handleSwitchCamera = () => {
     if (cameras.length <= 1 || isInitializing || isProcessingCheckIn) {
         console.log(`Switch camera blocked: cameras=${cameras.length}, initializing=${isInitializing}, processing=${isProcessingCheckIn}`);
         if (cameras.length <= 1 && !isInitializing) {
             toast.info("Chỉ có một camera khả dụng.");
         }
         return;
     }

     console.log("Attempting to switch camera...");
     // State isInitializing sẽ được set lại bởi effect chính khi selectedCameraIndex thay đổi
     const nextIndex = (selectedCameraIndex + 1) % cameras.length;
     console.log(`Switching from index ${selectedCameraIndex} to ${nextIndex}`);
     setSelectedCameraIndex(nextIndex); // Trigger re-run của effect chính
 };


  const isFrontCameraSelected = cameras[selectedCameraIndex]?.label.toLowerCase().includes('front') || (cameras[selectedCameraIndex] as any)?.facingMode === 'user';

  // Không render gì nếu không mở
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
        {/* Nút đóng modal */}
        <button onClick={onClose} disabled={isProcessingCheckIn} className="absolute top-2 cursor-pointer right-2 text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 z-50 disabled:opacity-50" aria-label="Đóng">
          <Cross2Icon className="w-5 h-5" />
        </button>

        {/* Nút chuyển camera */}
         {cameras.length > 1 && (
           <button
             onClick={handleSwitchCamera}
             disabled={isInitializing || isProcessingCheckIn}
             className="absolute top-2 left-2 text-gray-700 bg-white/70 hover:bg-white p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 z-50 disabled:opacity-50 disabled:cursor-not-allowed"
             aria-label="Chuyển camera"
             title="Chuyển camera"
           >
             <UpdateIcon className={`w-5 h-5 ${isInitializing ? 'animate-spin' : ''}`} />
           </button>
         )}

        {/* Tiêu đề và tên sự kiện */}
        <h3 id="qr-scanner-title" className="text-lg font-semibold text-center text-gray-800 mb-2 flex-shrink-0">
          Quét Mã QR Điểm Danh
        </h3>
        <p className="text-sm text-center text-gray-600 mb-3 line-clamp-1 flex-shrink-0">
          {eventName}
        </p>

        {/* Khu vực hiển thị video và overlay */}
        <div className="w-full max-w-md mx-auto aspect-square border border-gray-300 rounded bg-gray-800 mb-3 relative flex-grow flex items-center justify-center overflow-hidden">
         {/* Element video */}
         <video
            ref={videoRef}
            id={VIDEO_ELEMENT_ID}
            playsInline
            /* autoPlay và muted nên được set nhưng việc play() sẽ do code xử lý */
            muted
            className={`block w-full h-full object-cover ${isFrontCameraSelected ? 'scale-x-[-1]' : ''}`}
            style={{ zIndex: 5 }}
          ></video>

           {/* Overlay hiển thị thông báo/lỗi/loading */}
           <div
               className={`absolute inset-0 flex items-center justify-center p-4 text-center z-20 transition-opacity duration-300 pointer-events-none
                   ${message || lastError || isInitializing ? 'opacity-100' : 'opacity-0'}
                   ${lastError?.startsWith("Lỗi Camera") || message?.startsWith("Lỗi Camera") || lastError?.startsWith("Lỗi đọc") || message?.startsWith("Lỗi đọc") || lastError?.startsWith("Lỗi bộ đọc") || message?.startsWith("Lỗi bộ đọc") ? 'bg-red-700/80 text-white' :
                     lastError ? 'bg-yellow-500/80 text-black' :
                     isInitializing || message?.startsWith("Đang xử lý") ? 'bg-black/60 text-white' :
                     message === "Không tìm thấy mã QR..." ? 'bg-transparent text-white' : // Làm cho thông báo "Không tìm thấy" ít gây chú ý hơn
                     message ? 'bg-black/50 text-white' :
                     'bg-transparent'
                   }
                   ${(isInitializing || message || lastError) ? 'backdrop-blur-sm' : ''} `}
           >
                {/* Hiển thị trạng thái ưu tiên: Lỗi > Đang xử lý > Thông báo khác > Đang khởi tạo */}
                {lastError && <p className="text-sm font-medium">{lastError}</p>}
                {!lastError && message && <p className="text-sm font-medium">{message}</p>}
                {!lastError && !message && isInitializing && <p className="text-sm font-medium">Đang khởi tạo camera...</p>}
           </div>

           {/* Spinner khi đang gọi API */}
           {isProcessingCheckIn && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
             </div>
           )}

           {/* Khung quét và laser (chỉ hiển thị khi đang quét và không có lỗi nghiêm trọng) */}
           {!isInitializing && isScanningActive && !lastError?.includes("Camera") && !lastError?.includes("bộ đọc") && (
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
                0% { transform: translateY(-50%); top: 0%; opacity: 0.5; }
                 50% { transform: translateY(-50%); top: 100%; opacity: 0.9; }
                 100% { transform: translateY(-50%); top: 0%; opacity: 0.5; }
             }
             .animate-scan-laser {
                 animation: scan-laser 2.8s infinite linear;
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