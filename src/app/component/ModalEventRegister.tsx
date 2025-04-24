"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast, Toaster } from "react-hot-toast";

interface EventInfo {
  id: string;
  name: string;
  time?: string;
  location?: string;
  description?: string;
  content?: string;
  status?: string;
  purpose?: string;
}

interface UserInfo {
    id: string;
}

interface ConfirmationDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'danger';
}

function ConfirmationDialog({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Xác nhận",
    cancelText = "Hủy bỏ",
    confirmVariant = 'primary'
}: ConfirmationDialogProps) {
    if (!isOpen) return null;

    const confirmButtonClasses = useMemo(() => {
        let base = "flex-1 px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm ";
        if (confirmVariant === 'danger') {
            base += "bg-red-600 hover:bg-red-700 text-white cursor-pointer";
        } else {
            base += "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer";
        }
        return base;
    }, [confirmVariant]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <h3 className={`text-lg font-bold mb-3 ${confirmVariant === 'danger' ? 'text-red-700' : 'text-gray-800'}`}>{title}</h3>
                <div className="text-sm text-gray-600 mb-5">{message}</div>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-semibold transition-colors shadow-sm cursor-pointer"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={confirmButtonClasses}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

interface ModalEventRegisterProps {
  onClose: () => void;
  onDataChanged: () => void;
}

export default function ModalEventRegister({
  onClose,
  onDataChanged,
}: ModalEventRegisterProps) {
  const [tab, setTab] = useState<"available" | "registered">("available");
  const [searchTerm, setSearchTerm] = useState("");
  const [availableEvents, setAvailableEvents] = useState<EventInfo[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState<boolean>(true);
  const [errorAvailable, setErrorAvailable] = useState<string | null>(null);

  const [registeredEvents, setRegisteredEvents] = useState<EventInfo[]>([]);
  const [isLoadingRegistered, setIsLoadingRegistered] = useState<boolean>(true);
  const [errorRegistered, setErrorRegistered] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<string | 'batch_unregister' | null>(null);
  const [viewingEventDetails, setViewingEventDetails] = useState<EventInfo | null>(null);
  const [selectedToUnregister, setSelectedToUnregister] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingUserId, setIsLoadingUserId] = useState<boolean>(true);
  const [errorUserId, setErrorUserId] = useState<string | null>(null);

  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: 'primary' | 'danger';
    confirmText?: string;
    cancelText?: string;
  }>({ isOpen: false, title: '', message: '', onConfirm: null });

  const fetchAvailableEvents = useCallback(async () => {
    setIsLoadingAvailable(true);
    setErrorAvailable(null);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const url = `http://localhost:8080/identity/api/events/status?status=APPROVED`;
      const res = await fetch(url, { headers });
      if (!res.ok) { let msg = `Không thể tải danh sách sự kiện`; try { const d = await res.json(); msg = d.message || msg; } catch (_) {} throw new Error(msg); }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) { setAvailableEvents(data.result); }
      else { throw new Error(data.message || "Dữ liệu sự kiện không hợp lệ"); }
    } catch (err: any) { console.error("Lỗi khi tải sự kiện hiện có:", err); setErrorAvailable(err.message || "Đã xảy ra lỗi"); }
    finally { setIsLoadingAvailable(false); }
  }, []);

  const fetchCurrentUserInfoAndRegisteredEvents = useCallback(async () => {
    setIsLoadingUserId(true);
    setIsLoadingRegistered(true);
    setErrorUserId(null);
    setErrorRegistered(null);
    let fetchedUserId: string | null = null;

     try {
        const token = localStorage.getItem("authToken");
        if (!token) { throw new Error("Vui lòng đăng nhập lại."); }
        const headers: HeadersInit = { Authorization: `Bearer ${token}` };

        const userInfoUrl = `http://localhost:8080/identity/users/myInfo`;
        const userRes = await fetch(userInfoUrl, { headers });
        if (!userRes.ok) { let msg = `Không thể tải thông tin người dùng`; try { const d = await userRes.json(); msg = d.message || msg; } catch (_) {} throw new Error(msg); }
        const userData = await userRes.json();
         if (userData.code === 1000 && userData.result?.id) {
             fetchedUserId = userData.result.id;
             setCurrentUserId(fetchedUserId);
         } else {
            throw new Error(userData.message || "Không tìm thấy ID người dùng");
         }
         setIsLoadingUserId(false);


         if (fetchedUserId) {
            // ============================================================
            // ==== [QUAN TRỌNG!] THAY THẾ URL NÀY BẰNG ENDPOINT ĐÚNG ====
            // Endpoint này PHẢI trả về một Array các sự kiện đã đăng ký
            // const registeredEventsUrl = `http://localhost:8080/identity/api/users/${fetchedUserId}/registrations`; // Ví dụ endpoint đúng
            const registeredEventsUrl = `http://localhost:8080/identity/api/events/creator/${fetchedUserId}`; // Endpoint HIỆN TẠI (có thể sai!)
            // ============================================================

             const regRes = await fetch(registeredEventsUrl, { headers });
             if (!regRes.ok) { let msg = `Không thể tải sự kiện đã đăng ký/tạo`; try { const d = await regRes.json(); msg = d.message || msg; } catch (_) {} throw new Error(msg); }
             const regData = await regRes.json();

             if (regData.code === 1000 && Array.isArray(regData.result)) {
                 setRegisteredEvents(regData.result);
             } else {
                 console.warn("API lấy danh sách sự kiện đăng ký trả về dữ liệu không phải mảng (Kiểm tra endpoint):", regData);
                 setRegisteredEvents([]);
             }
         } else {
             throw new Error("Không có User ID để tải sự kiện đã đăng ký/tạo.");
         }

     } catch (err: any) {
        console.error("Lỗi khi tải thông tin người dùng hoặc sự kiện đăng ký/tạo:", err);
        if (!fetchedUserId) setErrorUserId(err.message);
        setErrorRegistered(err.message);
        toast.error(`Lỗi tải dữ liệu: ${err.message}`);
     } finally {
        setIsLoadingUserId(false);
        setIsLoadingRegistered(false);
     }
  }, []);

  useEffect(() => {
      fetchAvailableEvents();
      fetchCurrentUserInfoAndRegisteredEvents();
  }, [fetchAvailableEvents, fetchCurrentUserInfoAndRegisteredEvents]);


   const isRegistered = useCallback((eventId: string): boolean => {
    return registeredEvents.some(event => event.id === eventId);
   }, [registeredEvents]);

  const executeRegistration = async (eventToRegister: EventInfo) => {
      if (isSubmitting || isRegistered(eventToRegister.id) || !currentUserId || isLoadingUserId) { if(!currentUserId || isLoadingUserId) toast.error("Không thể xác định người dùng."); return; }
      setIsSubmitting(eventToRegister.id);
      const token = localStorage.getItem("authToken");
      if (!token) { toast.error("Vui lòng đăng nhập lại."); setIsSubmitting(null); return; }
      try {
        const url = `http://localhost:8080/identity/api/events/${eventToRegister.id}/attendees?userId=${currentUserId}`; // URL POST đã đúng cấu trúc
        const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { let msg="Đăng ký thất bại"; try{const d=await res.json(); msg=d.message||msg;}catch(_){} throw new Error(msg); }
        await res.json();
        toast.success("Đăng ký sự kiện thành công!");

        setRegisteredEvents(prev => {
             if (prev.some(e => e.id === eventToRegister.id)) {
                 return prev;
             }
             return [...prev, eventToRegister];
         });
         onDataChanged();

      } catch (err: any) { toast.error(`Đăng ký thất bại: ${err.message}`); }
      finally { setIsSubmitting(null); }
  };

  const handleRegisterClick = (eventToRegister: EventInfo) => {
    if (isSubmitting || isRegistered(eventToRegister.id) || !currentUserId || isLoadingUserId) { if(!currentUserId || isLoadingUserId) toast.error("Chưa thể đăng ký..."); return; }
     setConfirmationState({
        isOpen: true,
        title: "Xác nhận đăng ký",
        message: <>Bạn có chắc chắn muốn đăng ký sự kiện <br/> <strong className="text-indigo-600">"{eventToRegister.name}"</strong> không?</>,
        onConfirm: () => executeRegistration(eventToRegister),
        confirmVariant: 'primary',
        confirmText: "Xác nhận",
        cancelText:"Hủy bỏ"
    });
  };

   const executeUnregistration = async (eventToUnregister: EventInfo) => {
       if (isSubmitting || !currentUserId || isLoadingUserId) { if(!currentUserId || isLoadingUserId) toast.error("Không thể xác định người dùng."); return; }
       setIsSubmitting(eventToUnregister.id);
       const token = localStorage.getItem("authToken");
       if (!token) { toast.error("Vui lòng đăng nhập lại."); setIsSubmitting(null); return; }
       try {
           const url = `http://localhost:8080/identity/api/events/${eventToUnregister.id}/attendees/${currentUserId}`; // URL DELETE đã đúng cấu trúc
           const res = await fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }});
           if (!res.ok) { let msg="Hủy đăng ký thất bại"; try{const d=await res.json(); msg=d.message||msg;}catch(_){} throw new Error(msg); }
           toast.success("Hủy đăng ký thành công!");
            setRegisteredEvents(prev => prev.filter(ev => ev.id !== eventToUnregister.id));
            onDataChanged();

       } catch (err: any) { toast.error(`Hủy đăng ký thất bại: ${err.message}`); }
       finally { setIsSubmitting(null); }
   };

   const handleUnregisterClick = (eventToUnregister: EventInfo) => {
       if (isSubmitting || !currentUserId || isLoadingUserId) { if(!currentUserId || isLoadingUserId) toast.error("Không thể xác định người dùng."); return; }
       setConfirmationState({
           isOpen: true,
           title: "Xác nhận hủy đăng ký",
           message: <>Bạn có chắc chắn muốn hủy đăng ký sự kiện <br/> <strong className="text-indigo-600">"{eventToUnregister.name}"</strong> không?</>,
           onConfirm: () => executeUnregistration(eventToUnregister),
           confirmVariant: 'danger',
           confirmText: "Xác nhận hủy",
           cancelText:"Không"
       });
   };

  const handleSelectToUnregister = (eventId: string) => {
    setSelectedToUnregister(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) { newSet.delete(eventId); } else { newSet.add(eventId); }
      return newSet;
    });
  };

   const executeBatchUnregistration = async (idsToUnregister: string[]) => {
       if (isSubmitting || !currentUserId || isLoadingUserId) { if(!currentUserId || isLoadingUserId) toast.error("Không thể xác định người dùng."); return; }
       setIsSubmitting('batch_unregister');
       const token = localStorage.getItem("authToken");
       if (!token) { toast.error("Vui lòng đăng nhập lại."); setIsSubmitting(null); return; }

       const unregisterPromises = idsToUnregister.map(eventId => {
        const url = `http://localhost:8080/identity/api/events/${eventId}/attendees/${currentUserId}`; // URL DELETE đã đúng cấu trúc
        return fetch(url, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
          .then(async res => { if (!res.ok) { let msg=`Hủy đk ${eventId} lỗi`; try{const d=await res.json(); msg=d.message||msg;}catch(_){} return { status: 'rejected', reason: msg, id: eventId }; } return { status: 'fulfilled', value: eventId }; })
          .catch(err => ({ status: 'rejected', reason: err.message || `Lỗi mạng hủy ${eventId}`, id: eventId }));
       });
       const results = await Promise.allSettled(unregisterPromises);
       let successCount = 0; const failedIds: string[] = []; const successfulIds: string[] = [];
       results.forEach(result => { if (result.status === 'fulfilled' && result.value.status === 'fulfilled') { successCount++; successfulIds.push(result.value.value); } else if (result.status === 'fulfilled' && result.value.status === 'rejected') { failedIds.push(result.value.id); console.error(`Failed unregister ${result.value.id}: ${result.value.reason}`); } else if (result.status === 'rejected'){ console.error(`Network error unregister: ${result.reason}`); } });
       if (successCount > 0) {
        toast.success(`Đã hủy đăng ký ${successCount} sự kiện.`);
        const eventsToKeep = registeredEvents.filter(ev => !successfulIds.includes(ev.id));
        setRegisteredEvents(eventsToKeep);
        setSelectedToUnregister(new Set());
        onDataChanged();
       }
       if (failedIds.length > 0) { toast.error(`Không thể hủy ${failedIds.length} sự kiện.`); }
       setIsSubmitting(null);
   };

  const handleBatchUnregister = () => {
    const idsToUnregister = Array.from(selectedToUnregister);
    if (idsToUnregister.length === 0) { toast.error("Vui lòng chọn sự kiện để hủy."); return; }
    if (!currentUserId || isLoadingUserId) { toast.error("Không thể xác định người dùng."); return; }

     setConfirmationState({
        isOpen: true,
        title: "Xác nhận hủy đăng ký ",
        message: <>Bạn có chắc chắn muốn hủy đăng ký <br/> <strong className="text-indigo-600">{idsToUnregister.length} sự kiện</strong> đã chọn không?</>,
        onConfirm: () => executeBatchUnregistration(idsToUnregister),
        confirmVariant: 'danger',
        confirmText: `Hủy (${idsToUnregister.length}) sự kiện`,
        cancelText:"Không"
    });
  };

  const filterEvents = (events: EventInfo[]) => {
    if (!searchTerm) return events;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return events.filter(e => e.name.toLowerCase().includes(lowerCaseSearchTerm) || e.location?.toLowerCase().includes(lowerCaseSearchTerm));
  };

  const displayedAvailableEvents = filterEvents(availableEvents);
  const displayedRegisteredEvents = filterEvents(registeredEvents);

  const renderEventList = (list: EventInfo[], type: 'available' | 'registered') => {
    const isLoading = isLoadingUserId || (type === 'available' ? isLoadingAvailable : isLoadingRegistered);
    const error = errorUserId || (type === 'available' ? errorAvailable : errorRegistered);

    if (isLoading) return <p className="text-center text-gray-500 italic py-5">Đang tải...</p>;
    if (errorUserId) return <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{errorUserId}</p>;
    if (error) return <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{error}</p>;
    if (list.length === 0) return ( <p className="text-center text-gray-500 italic py-5"> {searchTerm ? "Không tìm thấy sự kiện." : type === "available" ? "Không có sự kiện nào hiện có." : "Bạn chưa đăng ký sự kiện nào."} </p> );


    return (
      <ul className="space-y-3">
        {list.map((event) => {
            const processing = isSubmitting === event.id || isSubmitting === 'batch_unregister';
            const alreadyRegistered = isRegistered(event.id);
            const isSelectedForUnregister = selectedToUnregister.has(event.id);
            const canPerformAction = !!currentUserId && !isLoadingUserId;

            return (
                <li key={event.id} className={`border p-3 md:p-4 rounded-lg shadow-sm bg-white transition-colors duration-150 flex flex-col gap-3 ${type === 'registered' ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50'}`} onClick={type === 'registered' ? () => handleSelectToUnregister(event.id) : undefined}>
                   <div className="flex flex-col sm:flex-row justify-between items-start w-full gap-2">
                       <div className="flex-grow">
                           <h3 className="text-md md:text-lg font-semibold text-gray-800 mb-1">{event.name}</h3>
                           <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600">
                               {event.time && ( <span className="flex items-center"><span className="mr-1.5 opacity-70">📅</span>{new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</span> )}
                               {event.location && ( <span className="flex items-center mt-1 sm:mt-0"><span className="mr-1.5 opacity-70">📍</span>{event.location}</span> )}
                           </div>
                       </div>
                       {type === 'registered' && (
                           <div className="flex-shrink-0 pt-1 sm:pt-0">
                               <input type="checkbox" checked={isSelectedForUnregister} onChange={(e) => { e.stopPropagation(); handleSelectToUnregister(event.id) }} className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer" aria-label={`Chọn hủy đăng ký ${event.name}`}/>
                           </div>
                       )}
                   </div>
                   { type === 'available' && (
                       <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:items-center border-t border-gray-100 pt-3">
                           <button onClick={(e) => { e.stopPropagation(); setViewingEventDetails(event); }} disabled={processing} className="px-3 py-1.5 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-xs font-medium w-full sm:w-auto disabled:opacity-50 cursor-pointer">Xem chi tiết</button>
                           <button onClick={(e) => { e.stopPropagation(); handleRegisterClick(event); }} disabled={alreadyRegistered || processing || !canPerformAction} className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${ alreadyRegistered ? 'bg-gray-400 cursor-not-allowed' : (processing || !canPerformAction) ? 'bg-blue-300 cursor-wait' : 'bg-blue-500 hover:bg-blue-600' }`}>{alreadyRegistered ? '✅ Đã đăng ký' : (processing ? 'Đang xử lý...' : '📝 Đăng ký')}</button>
                       </div>
                   )}
                    { type === 'registered' && (
                       <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:items-center border-t border-gray-100 pt-3">
                           <button onClick={(e) => { e.stopPropagation(); setViewingEventDetails(event); }} disabled={processing} className="px-3 py-1.5 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition text-xs font-medium w-full sm:w-auto disabled:opacity-50 cursor-pointer">Xem chi tiết</button>
                       </div>
                    )}
                </li>
            )
        })}
      </ul>
    );
  };

   const renderEventDetails = (event: EventInfo) => {
     const processing = isSubmitting === event.id;
     const alreadyRegistered = isRegistered(event.id);
     const canPerformAction = !!currentUserId && !isLoadingUserId;
     const descriptionToShow = event.description || event.content;

     return (
         <div className="p-1">
             <button onClick={() => setViewingEventDetails(null)} className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                 Quay lại danh sách
             </button>
             <h3 className="text-xl font-bold text-gray-800 mb-3">{event.name}</h3>
             <div className="space-y-2 text-sm text-gray-700">
                {event.time && <p><strong className="font-medium text-gray-900 w-24 inline-block">Thời gian:</strong> {new Date(event.time).toLocaleString('vi-VN', { dateStyle: 'full', timeStyle: 'short' })}</p>}
                {event.location && <p><strong className="font-medium text-gray-900 w-24 inline-block">Địa điểm:</strong> {event.location}</p>}
                {descriptionToShow && <p><strong className="font-medium text-gray-900 w-24 inline-block align-top">Mô tả:</strong> <span className="inline-block whitespace-pre-wrap max-w-[calc(100%-6rem)]">{descriptionToShow}</span></p>}
             </div>
              <div className="mt-4 pt-4 border-t flex justify-end gap-3">
                  {alreadyRegistered ? (
                       <button onClick={() => handleUnregisterClick(event)} disabled={processing || !canPerformAction} className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${ (processing || !canPerformAction) ? 'bg-red-300 cursor-wait' : 'bg-red-500 hover:bg-red-600' }`}>
                           {processing ? 'Đang xử lý...' : ' Hủy đăng ký'}
                       </button>
                  ) : (
                       <button onClick={() => handleRegisterClick(event)} disabled={processing || !canPerformAction} className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${ (processing || !canPerformAction) ? 'bg-blue-300 cursor-wait' : 'bg-blue-500 hover:bg-blue-600' }`}>
                           {processing ? 'Đang xử lý...' : '📝 Đăng ký'}
                       </button>
                  )}
                   <button onClick={() => setViewingEventDetails(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium cursor-pointer">Quay lại</button>
              </div>
         </div>
     );
   };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Toaster toastOptions={{ duration: 3000 }}/>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-0 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 md:p-5  flex-shrink-0">
          <h2 className="text-xl md:text-2xl font-bold text-blue-700">
            {viewingEventDetails ? 'Chi tiết sự kiện' : 'Danh sách sự kiện'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-600 text-2xl font-semibold cursor-pointer p-1" title="Đóng" aria-label="Đóng">
            &times;
          </button>
        </div>

        {!viewingEventDetails && (
            <>
                <div className="p-4 md:p-5 ">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                        <input type="text" placeholder="Tìm theo tên hoặc địa điểm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 mb-0 px-4 md:px-5 border-b flex-shrink-0">
                    <button onClick={() => setTab("available")} className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 ${ tab === "available" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300" }`}>
                        📌 Gợi ý sự kiện
                    </button>
                    <button onClick={() => setTab("registered")} className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 ${ tab === "registered" ? "border-green-500 text-green-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300" }`}>
                        ✅ Sự kiện đã đăng ký
                    </button>
                </div>
            </>
        )}

        <div className="overflow-y-auto flex-grow p-4 md:p-5">
             {viewingEventDetails
                 ? renderEventDetails(viewingEventDetails)
                 : (tab === 'available'
                     ? renderEventList(displayedAvailableEvents, 'available')
                     : renderEventList(displayedRegisteredEvents, 'registered')
                  )
             }
        </div>

         <div className={`flex ${selectedToUnregister.size > 0 && tab === 'registered' && !viewingEventDetails ? 'justify-between' : 'justify-end'} p-4 md:p-5 border-t flex-shrink-0 items-center`}>
             {tab === 'registered' && selectedToUnregister.size > 0 && !viewingEventDetails && (
                 <button
                    onClick={handleBatchUnregister}
                    disabled={isSubmitting === 'batch_unregister' || !currentUserId || isLoadingUserId}
                    className={`px-4 py-2 rounded-md text-white shadow-sm transition text-sm font-medium cursor-pointer ${
                        isSubmitting === 'batch_unregister' || !currentUserId || isLoadingUserId ? 'bg-red-300 cursor-wait' : 'bg-red-500 hover:bg-red-600'
                    }`}
                >
                    {isSubmitting === 'batch_unregister' ? 'Đang xử lý...' : `Hủy đăng ký (${selectedToUnregister.size}) sự kiện`}
                </button>
             )}
            <button onClick={onClose} className="px-5 cursor-pointer py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm transition text-sm font-medium">
              Đóng
            </button>
          </div>
      </div>

       <ConfirmationDialog
          isOpen={confirmationState.isOpen}
          title={confirmationState.title}
          message={confirmationState.message}
          confirmVariant={confirmationState.confirmVariant}
          confirmText={confirmationState.confirmText}
          cancelText={confirmationState.cancelText}
          onConfirm={() => {
              if (confirmationState.onConfirm) {
                  confirmationState.onConfirm();
              }
              setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: null });
          }}
          onCancel={() => {
              setConfirmationState({ isOpen: false, title: '', message: '', onConfirm: null });
          }}
      />

    </div>
  );
}