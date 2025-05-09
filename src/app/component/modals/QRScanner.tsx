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
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const initScanner = () => {
      try {
        const scanner = new Html5QrcodeScanner(
          'reader',
          {
            qrbox: { width: 250, height: 250 },
            fps: 10,
            disableFlip: false,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          },
          false
        );

        scannerRef.current = scanner;
        setIsScanning(true);

        const successHandler = (decodedText: string) => {
          try {
            scanner.pause();
            onScanSuccess(decodedText);
          } catch (error) {
            console.error('Error pausing scanner:', error);
            onScanSuccess(decodedText);
          }
        };

        const errorHandler = (errorMessage: string) => {
          if (!errorMessage.includes('NotFoundException')) {
            setCameraError(errorMessage);
            onScanError(errorMessage);
          }
        };

        scanner.render(successHandler, errorHandler);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize scanner';
        setCameraError(errorMessage);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
          .then(() => {
            console.log('Scanner cleaned up');
            setIsScanning(false);
          })
          .catch((error: Error) => {
            console.error('Scanner cleanup error:', error);
          });
      }
    };
  }, [onScanSuccess, onScanError]);

  const requestCameraAccess = () => {
    setCameraError(null);
    if (scannerRef.current) {
      try {
        // Note: The html5-qrcode library's resume() method doesn't return a Promise
        scannerRef.current.resume();
        setIsScanning(true);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to access camera';
        setCameraError(errorMessage);
      }
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
        QR Code Scanner
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Scan a QR code to proceed
      </p>
      
      <div className="relative mt-4">
        <div
          id="reader"
          className="w-full aspect-square bg-gray-100 dark:bg-gray-900 relative"
        >{!isScanning && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-gray-400 dark:text-gray-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
        
        {/* Scanner frame overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="border-4 border-blue-500 rounded-lg w-64 h-64 relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
            </div>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-red-600 dark:text-red-400">{cameraError}</p>
              <button
                onClick={requestCameraAccess}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}