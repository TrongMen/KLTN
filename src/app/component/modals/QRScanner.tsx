import { useEffect, useRef, useState, useCallback } from 'react';
// Bỏ DOMException khỏi import này
import { BrowserMultiFormatReader, Result, NotFoundException, Exception } from '@zxing/library';

interface QrScannerProps {
  onScanSuccess: (result: string) => void;
  onScanError: (error: string) => void;
}

const CameraSwitchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>
    <path d="M13 5H20a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-5"/>
    <line x1="15" y1="9" x2="18" y2="12"/>
    <line x1="15" y1="15" x2="18" y2="12"/>
    <line x1="9" y1="15" x2="6" y2="12"/>
    <line x1="9" y1="9" x2="6" y2="12"/>
  </svg>
);

const QRScanner = ({ onScanSuccess, onScanError }: QrScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream && typeof stream.getTracks === 'function') {
        stream.getTracks().forEach(track => track.stop());
      }
      videoRef.current.srcObject = null;
    }
    setIsScannerActive(false);
  }, []);

  useEffect(() => {
    setPermissionError(null);
    setIsLoadingDevices(true);

    if (!codeReader.current) {
      setIsLoadingDevices(false);
      return;
    }

    if (typeof navigator.mediaDevices?.enumerateDevices !== 'function') {
      const noApiError = "API MediaDevices không được hỗ trợ trên trình duyệt này.";
      setPermissionError(noApiError);
      onScanError(noApiError);
      setIsLoadingDevices(false);
      setIsScannerActive(false);
      return;
    }

    if (!window.isSecureContext) {
      const insecureContextError = "Truy cập camera yêu cầu kết nối HTTPS. Vui lòng đảm bảo trang web được tải qua HTTPS.";
      setPermissionError(insecureContextError);
      onScanError(insecureContextError);
      setIsLoadingDevices(false);
      setIsScannerActive(false);
      return;
    }

    codeReader.current.listVideoInputDevices()
      .then(videoInputDevices => {
        if (videoInputDevices.length > 0) {
          setDevices(videoInputDevices);
          const currentSelectedExists = selectedDeviceId && videoInputDevices.some(d => d.deviceId === selectedDeviceId);
          if (!currentSelectedExists && videoInputDevices[0]) {
            setSelectedDeviceId(videoInputDevices[0].deviceId);
          } else if (!selectedDeviceId && videoInputDevices[0]) {
             setSelectedDeviceId(videoInputDevices[0].deviceId);
          }
        } else {
          const noDeviceError = "Không tìm thấy thiết bị camera nào.";
          setPermissionError(noDeviceError);
          onScanError(noDeviceError);
          setIsScannerActive(false);
        }
      })
      .catch(err => {
        let errorMsg = "Lỗi khi truy cập camera.";
        // Sử dụng DOMException toàn cục (global)
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            errorMsg = "Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.";
          } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
            errorMsg = "Không tìm thấy thiết bị camera nào.";
          } else if (err.message.toLowerCase().includes("enumerate devices") || err.name === "NotSupportedError") {
            errorMsg = "Không thể liệt kê thiết bị camera. Có thể trang không được tải qua HTTPS, trình duyệt không hỗ trợ, hoặc quyền bị chặn.";
          } else {
            errorMsg = `Lỗi camera (${err.name}): ${err.message}`;
          }
        } else if (err instanceof Error) {
           if (err.message.toLowerCase().includes("enumerate devices")) {
               errorMsg = "Không thể liệt kê thiết bị camera. Có thể trang không được tải qua HTTPS hoặc trình duyệt không hỗ trợ đầy đủ API.";
          } else {
              errorMsg = `Lỗi camera: ${err.message}`;
          }
        }
        setPermissionError(errorMsg);
        onScanError(errorMsg);
        setIsScannerActive(false);
      })
      .finally(() => {
        setIsLoadingDevices(false);
      });
  }, [onScanError, selectedDeviceId]);

  useEffect(() => {
    if (!selectedDeviceId || !videoRef.current || permissionError || isLoadingDevices) {
      if (isScannerActive && codeReader.current) {
        codeReader.current.reset();
      }
      if(isScannerActive && !selectedDeviceId && !isLoadingDevices && devices.length === 0){
        setPermissionError("Không có camera nào được chọn hoặc sẵn sàng.");
      }
      setIsScannerActive(false);
      return;
    }

    if (!codeReader.current) return;

    const currentVideoElement = videoRef.current;
    let didUnmount = false;

    codeReader.current.decodeFromVideoDevice(
      selectedDeviceId,
      currentVideoElement,
      (result: Result | undefined, err: Exception | undefined) => {
        if (didUnmount) return;

        if (result) {
          onScanSuccess(result.getText());
          stopCamera();
        }
        // Sử dụng DOMException toàn cục (global)
        if (err && !(err instanceof NotFoundException)) {
          if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === "PermissionDeniedError")) {
            const permError = "Quyền truy cập camera đã bị thu hồi hoặc bị từ chối trong quá trình quét.";
            setPermissionError(permError);
            onScanError(permError);
            stopCamera();
          } else if (err instanceof Error && (err.message.includes("video input is missing") || err.message.includes("already playing"))) {
            // Bỏ qua
          } else if (err instanceof DOMException && err.name === "TrackStartError") {
            const trackError = "Lỗi khởi động track video. Camera có thể đang được sử dụng bởi ứng dụng khác.";
            setPermissionError(trackError);
            onScanError(trackError);
            stopCamera();
          } else {
            // onScanError(`Lỗi khi đang quét: ${err ? err.message : 'Unknown scan error'}`);
          }
        }
      }
    ).then(() => {
        if (!didUnmount) setIsScannerActive(true);
    }).catch(err => {
      if (didUnmount) return;
      let errorMsg = "Không thể bắt đầu quét từ camera đã chọn.";
        // Sử dụng DOMException toàn cục (global)
        if (err instanceof DOMException) {
            if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                errorMsg = "Quyền truy cập camera bị từ chối cho thiết bị này.";
            } else if (err.name === "NotFoundError" || (err.message && err.message.includes("Requested device not found"))) {
                errorMsg = "Không tìm thấy camera đã chọn (ID: " + selectedDeviceId + ").";
            } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                 errorMsg = "Không thể đọc dữ liệu từ camera. Camera có thể đang được sử dụng bởi ứng dụng khác hoặc có vấn đề phần cứng.";
            } else if (err.message && !err.message.includes("video input is missing")){
                errorMsg = `Lỗi camera (${err.name}): ${err.message}`;
            } else {
                return;
            }
        } else if (err instanceof Error) {
             if (err.message && !err.message.includes("video input is missing")) {
                errorMsg = `Lỗi camera: ${err.message}`;
            } else {
                 return;
            }
        }
      setPermissionError(errorMsg);
      onScanError(errorMsg);
      stopCamera();
    });

    return () => {
      didUnmount = true;
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, [selectedDeviceId, onScanSuccess, onScanError, permissionError, isLoadingDevices, stopCamera]);

  const handleSwitchCamera = () => {
    if (devices.length <= 1 || isLoadingDevices) return;

    stopCamera();
    setPermissionError(null);

    const currentIndex = devices.findIndex(device => device.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    if (devices[nextIndex]) {
        const newDeviceId = devices[nextIndex].deviceId;
        setSelectedDeviceId(newDeviceId);
    } else {
        onScanError("Không thể chuyển camera, thiết bị kế tiếp không hợp lệ.");
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (isLoadingDevices && !permissionError) {
    return <p className="text-center text-gray-500 italic py-5">Đang tải thiết bị camera...</p>;
  }

  return (
    <div className="scanner-container w-full">
      <div
        className='relative w-full bg-black rounded-md border border-gray-400 shadow-inner'
        style={{
          paddingBottom: '75%',
          minHeight: '200px',
          maxHeight: '400px'
        }}
      >
        <video
          ref={videoRef}
          className="absolute top-0 left-0 w-full h-full object-cover rounded-md"
          playsInline
          muted
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative w-3/4 h-3/4 rounded-lg overflow-hidden"
            style={{maxWidth: '260px', maxHeight: '260px'}}
          >
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
            </div>
            {isScannerActive && !permissionError && selectedDeviceId && (
                  <div className="scanning-line"></div>
            )}
          </div>
        </div>
      </div>

      {devices.length > 1 && !permissionError && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleSwitchCamera}
            disabled={isLoadingDevices}
            className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            title="Đổi camera"
          >
            <CameraSwitchIcon />
            <span className="ml-2">Đổi Camera</span>
          </button>
        </div>
      )}

        {permissionError && (
        <p className="text-red-500 text-sm mt-3 text-center font-medium p-2 bg-red-50 border border-red-200 rounded">
            {permissionError}
        </p>
      )}
      <style jsx>{`
        .scanning-line {
          position: absolute;
          left: 5%;
          right: 5%;
          width: 90%;
          top: 0;
          height: 3px;
          background: #00ff00;
          box-shadow: 0 0 10px #00ff00, 0 0 15px #00ff00, 0 0 20px #39ff14;
          border-radius: 3px;
          animation: scanY 2.8s infinite cubic-bezier(0.45, 0.05, 0.55, 0.95) alternate;
          z-index: 10;
        }

        @keyframes scanY {
          from {
            top: 3%;
          }
          to {
            top: calc(97% - 3px);
          }
        }
        video {
          /* transform: scaleX(-1); */
        }
      `}</style>
    </div>
  );
};

export default QRScanner;