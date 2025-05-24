"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ConfirmationDialog from "../../utils/ConfirmationDialog"; // Điều chỉnh đường dẫn nếu cần

const AccountLockedContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "Tài khoản bị khóa",
    message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.",
    confirmText: "Về trang đăng nhập",
  });

  useEffect(() => {
    const reason = searchParams.get("reason");
    const username = searchParams.get("username");
    let message = `Tài khoản "${username || 'bạn'}" đã bị khóa.`;
    if (reason) {
      message += `\nLý do: ${reason}`;
    }
    message += "\nVui lòng liên hệ quản trị viên để được hỗ trợ.";
    
    setDialogState(prev => ({
      ...prev,
      isOpen: true,
      message: message,
    }));
  }, [searchParams]);

  const handleConfirm = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
    router.push("/login");
  };

  return (
    <>
      {dialogState.isOpen && (
        <ConfirmationDialog
          isOpen={dialogState.isOpen}
          title={dialogState.title}
          message={dialogState.message}
          onConfirm={handleConfirm}
          onCancel={handleConfirm} 
          confirmText={dialogState.confirmText}
          hideCancelButton={true}
        />
      )}
    </>
  );
};


export default function AccountLockedPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
       <Suspense fallback={<div>Đang tải thông tin...</div>}>
        <AccountLockedContent />
      </Suspense>
    </div>
  );
}