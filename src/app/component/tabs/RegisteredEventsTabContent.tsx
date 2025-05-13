"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import Image from "next/image";
import {
  ChevronLeftIcon,
  CalendarIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";

import { EventDisplayInfo } from "../types/appTypes";
import ConfirmationDialog from "@/utils/ConfirmationDialog";
import EventListManager from "./registerEventGuest/EventListManager";
import { MdQrCodeScanner, MdQrCode } from "react-icons/md";
import QRScanner from "../modals/QRScanner"; 

interface BackendOrganizerOrParticipant {
  userId: string;
  roleName?: string;
  positionName?: string;
  firstName?: string;
  fullName?: string;
  lastName?: string;
  name?: string;
  username?: string;
  id?: string;
}

interface PersonDetail {
  id: string;
  userId?: string;
  roleName?: string;
  positionName?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  username?: string;
  profilePositionName?: string;
  profileRoleName?: string;
  eventSpecificRoleName?: string;
  eventSpecificPositionName?: string;
}

interface FetchedPersonAPIResponse {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  position?: { id: string; name: string };
  roles?: { name: string; description?: string }[];
}

const getVietnameseEventStatus = (status?: string): string => {
  if (!status) return "Không xác định";
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case "APPROVED":
      return "Đã duyệt";
    case "PENDING":
      return "Chờ duyệt";
    case "REJECTED":
      return "Đã từ chối";
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status;
  }
};

const formatPersonDetailsForDisplay = (person: PersonDetail | BackendOrganizerOrParticipant | string): string => {
    if (typeof person === 'string') return `ID: ${person}`;
    const p = person as PersonDetail;
    let displayName = p.name || "";
    if (!displayName && (p.firstName || p.lastName)) {
        displayName = `${p.lastName || ""} ${p.firstName || ""}`.trim();
    }
    if (!displayName && p.username) {
        displayName = p.username;
    }
    if (!displayName || displayName.trim() === "") {
        displayName = `ID: ${p.userId || p.id}`;
    }
    const parts: string[] = [displayName];
    const positionToDisplay = p.eventSpecificPositionName || p.profilePositionName;
    if (positionToDisplay) {
        parts.push(positionToDisplay);
    }
    const roleToDisplay = p.eventSpecificRoleName || p.profileRoleName;
    if (roleToDisplay && roleToDisplay.toUpperCase() !== "GUEST" && roleToDisplay.toUpperCase() !== "USER") {
        parts.push(roleToDisplay);
    }
    const finalParts = parts.filter(part => part && part.trim() !== "" && part.toLowerCase() !== "không rõ" && !part.toLowerCase().startsWith("id: null")  && !part.toLowerCase().startsWith("id: undefined"));
    if (finalParts.length === 0) {
        if (p.userId || p.id) return `ID: ${p.userId || p.id}`;
        return "Không rõ";
    }
    if (finalParts.length > 1 && displayName.startsWith("ID: ") && finalParts.includes(displayName)) {
        const actualNamePart = finalParts.find(part => !part.startsWith("ID: "));
        if (actualNamePart) {
            const idPartIndex = finalParts.indexOf(displayName);
            if (idPartIndex > -1) {
                finalParts.splice(idPartIndex, 1);
            }
        }
    }
    if (finalParts.length === 0 && (p.userId || p.id)) return `ID: ${p.userId || p.id}`;
    if (finalParts.length === 0) return "Không rõ";
    return Array.from(new Set(finalParts)).join(" - ");
};

interface RegisteredEventsTabContentProps {
  currentUserId: string | null;
  isLoadingUserId: boolean;
  registeredEventIds: Set<string>;
  createdEventIds: Set<string>;
  onRegistrationChange: (eventId: string, registered: boolean) => void;
}

const RegisteredEventsTabContent: React.FC<RegisteredEventsTabContentProps> = ({
  currentUserId,
  isLoadingUserId,
  registeredEventIds,
  createdEventIds,
  onRegistrationChange,
}) => {
  const [tab, setTab] = useState<"available" | "registered">("available");
  const [availableEvents, setAvailableEvents] = useState<EventDisplayInfo[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState<boolean>(true);
  const [errorAvailable, setErrorAvailable] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<
    string | "batch_unregister" | null
  >(null);
  const [viewingEventDetails, setViewingEventDetails] =
    useState<EventDisplayInfo | null>(null);

  const [enrichedEventForDetailView, setEnrichedEventForDetailView] = useState<EventDisplayInfo | null>(null);
  const [isLoadingEnrichedDetails, setIsLoadingEnrichedDetails] = useState<boolean>(false);
  const fetchedPersonsCacheRef = useRef<Record<string, PersonDetail>>({});

  const [selectedToUnregister, setSelectedToUnregister] = useState<Set<string>>(
    new Set()
  );
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: (() => void) | null;
    confirmVariant?: "primary" | "danger" | "warning";
    confirmText?: string;
    cancelText?: string;
    onCancel?: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: null });

  const [showQRCode, setShowQRCode] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isLoadingQRCode, setIsLoadingQRCode] = useState<boolean>(false);
  const [errorQRCode, setErrorQRCode] = useState<string | null>(null);

  const [isCheckInScannerOpen, setIsCheckInScannerOpen] = useState<boolean>(false);
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);


  const resetConfirmationState = () => {
    setConfirmationState({
        isOpen: false,
        title: "",
        message: "",
        onConfirm: null,
        confirmVariant: "primary",
        confirmText: "Xác nhận",
        cancelText: "Hủy bỏ",
        onCancel: undefined,
    });
  };

  const fetchPersonDetailAPI = useCallback(async (userId: string): Promise<PersonDetail | null> => {
    if (!userId || userId.trim() === "") {
        return null;
    }
    if (fetchedPersonsCacheRef.current[userId]) {
        return fetchedPersonsCacheRef.current[userId];
    }
    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/notoken/${userId}`);
        if (!response.ok) {
            const fallback: PersonDetail = { id: userId, userId: userId, name: `ID: ${userId}` };
            fetchedPersonsCacheRef.current[userId] = fallback;
            return fallback;
        }
        const data = await response.json();
        if (data.code === 1000 && data.result) {
            const apiUser = data.result as FetchedPersonAPIResponse;
            const detail: PersonDetail = {
                id: apiUser.id,
                userId: apiUser.id,
                firstName: apiUser.firstName,
                lastName: apiUser.lastName,
                name: `${apiUser.lastName || ""} ${apiUser.firstName || ""}`.trim() || apiUser.username || `ID: ${apiUser.id}`,
                username: apiUser.username,
                profilePositionName: apiUser.position?.name,
                profileRoleName: apiUser.roles && apiUser.roles.length > 0 ? apiUser.roles[0].name : undefined,
            };
            fetchedPersonsCacheRef.current[userId] = detail;
            return detail;
        }
        const fallback: PersonDetail = { id: userId, userId: userId, name: `ID: ${userId}` };
        fetchedPersonsCacheRef.current[userId] = fallback;
        return fallback;
    } catch (error) {
        const fallback: PersonDetail = { id: userId, userId: userId, name: `ID: ${userId}` };
        fetchedPersonsCacheRef.current[userId] = fallback;
        return fallback;
    }
  }, []);

  useEffect(() => {
    if (viewingEventDetails) {
      setIsLoadingEnrichedDetails(true);
      setEnrichedEventForDetailView(null);

      const enrichPeopleArray = async (
        peopleInput: (BackendOrganizerOrParticipant | string)[] | undefined
      ): Promise<PersonDetail[]> => {
        if (!peopleInput || peopleInput.length === 0) return [];

        return Promise.all(
          peopleInput.map(async (personOrId) => {
            const userId = typeof personOrId === 'string' ? personOrId : (personOrId.userId || personOrId.id || "");
            if (!userId) {
              return { id: "unknown-" + Math.random().toString(36).substr(2, 9), userId: "unknown", name: "Không xác định" } as PersonDetail;
            }

            const initialInfo = typeof personOrId === 'object' ? personOrId : ({ userId } as BackendOrganizerOrParticipant);
            const fetchedDetails = await fetchPersonDetailAPI(userId);

            const name = fetchedDetails?.name ||
                                     `${initialInfo.lastName || ""} ${initialInfo.firstName || ""}`.trim() ||
                                     initialInfo.name ||
                                     initialInfo.fullName ||
                                     `ID: ${userId}`;

            const personDetailResult: PersonDetail = {
              id: fetchedDetails?.id || userId,
              userId: userId,
              name: name,
              firstName: fetchedDetails?.firstName || initialInfo.firstName,
              lastName: fetchedDetails?.lastName || initialInfo.lastName,
              username: fetchedDetails?.username || initialInfo.username,
              profilePositionName: fetchedDetails?.profilePositionName,
              profileRoleName: fetchedDetails?.profileRoleName,
              eventSpecificRoleName: initialInfo.roleName,
              eventSpecificPositionName: initialInfo.positionName,
            };
            return personDetailResult;
          })
        );
      };

      const enrichEvent = async () => {
        const enrichedOrganizers = await enrichPeopleArray(viewingEventDetails.organizers as BackendOrganizerOrParticipant[]);
        const enrichedParticipants = await enrichPeopleArray(viewingEventDetails.participants as BackendOrganizerOrParticipant[]);

        let finalEnrichedCreator: PersonDetail | string | null = null;
        const creatorSource = viewingEventDetails.createdBy;

        if (typeof creatorSource === 'string' && creatorSource.trim() !== "") {
            finalEnrichedCreator = await fetchPersonDetailAPI(creatorSource) || creatorSource;
        } else if (creatorSource && typeof creatorSource === 'object' && creatorSource !== null) {
            const creatorIdToFetch = (creatorSource as PersonDetail).id || (creatorSource as PersonDetail).userId;
            if (creatorIdToFetch) {
                finalEnrichedCreator = await fetchPersonDetailAPI(creatorIdToFetch) || creatorSource;
            } else {
                finalEnrichedCreator = creatorSource as PersonDetail | null;
            }
        } else if (creatorSource === null) {
            finalEnrichedCreator = null;
        }

        setEnrichedEventForDetailView({
            ...viewingEventDetails,
            organizers: enrichedOrganizers,
            participants: enrichedParticipants,
            createdBy: finalEnrichedCreator,
        } as EventDisplayInfo);
        setIsLoadingEnrichedDetails(false);
      };
      enrichEvent();
    } else {
        setEnrichedEventForDetailView(null);
    }
}, [viewingEventDetails, fetchPersonDetailAPI]);


  const fetchAvailableEvents = useCallback(async (showToastOnSuccess = false) => {
    setIsLoadingAvailable(true);
    setErrorAvailable(null);
    try {
      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/status?status=APPROVED`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        let m = `Lỗi tải sự kiện`;
        try {
          const d = await res.json();
          m = d.message || m;
        } catch (_) {}
        throw new Error(`${m} (${res.status})`);
      }
      const data = await res.json();
      if (data.code === 1000 && Array.isArray(data.result)) {
        setAvailableEvents(data.result);
        if (showToastOnSuccess) {
            toast.success("Đã làm mới danh sách sự kiện!");
        }
      } else {
        setAvailableEvents([]);
        throw new Error(data.message || "Dữ liệu không hợp lệ");
      }
    } catch (err: any) {
      setErrorAvailable(err.message || "Lỗi không xác định");
      setAvailableEvents([]);
        if (showToastOnSuccess) {
            toast.error(`Làm mới thất bại: ${err.message || 'Lỗi không xác định'}`);
        }
    } finally {
      setIsLoadingAvailable(false);
    }
  }, []);

  useEffect(() => {
    if (!viewingEventDetails) {
        fetchAvailableEvents(false);
    }
  }, [fetchAvailableEvents, viewingEventDetails]);

  const isRegistered = useCallback(
    (eventId: string): boolean => registeredEventIds.has(eventId),
    [registeredEventIds]
  );
  const isCreatedByUser = useCallback(
    (eventId: string): boolean => createdEventIds.has(eventId),
    [createdEventIds]
  );

  const executeRegistration = useCallback(
    async (eventToRegister: EventDisplayInfo) => {
      if (
        !currentUserId ||
        isLoadingUserId ||
        isRegistered(eventToRegister.id) ||
        isCreatedByUser(eventToRegister.id) ||
        isSubmitting
      )
        return;
      setIsSubmitting(eventToRegister.id);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.");
        setIsSubmitting(null);
        resetConfirmationState();
        return;
      }
      try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventToRegister.id}/attendees?userId=${currentUserId}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let m = "Đăng ký thất bại";
          try {
            const d = await res.json();
            m = d.message || m;
          } catch (_) {}
          throw new Error(`${m} (${res.status})`);
        }
        await res.json();
        toast.success(`Đăng ký "${eventToRegister.name || eventToRegister.title}" thành công!`);
        onRegistrationChange(eventToRegister.id, true);
        if (viewingEventDetails && viewingEventDetails.id === eventToRegister.id) {
            const currentViewing = {...viewingEventDetails};
            if (!currentViewing.participants) currentViewing.participants = [];
            const participantExists = currentViewing.participants.some(p => (p as PersonDetail).userId === currentUserId || (p as PersonDetail).id === currentUserId);
            if (!participantExists && currentUserId) {
                const userDetails = await fetchPersonDetailAPI(currentUserId);
                if (userDetails) {
                    currentViewing.participants = [...currentViewing.participants, userDetails as any];
                }
            }
            setViewingEventDetails(null);
            setTimeout(()=> setViewingEventDetails(currentViewing),0);
        }
      } catch (err: any) {
        toast.error(`Đăng ký thất bại: ${err.message}`);
      } finally {
        setIsSubmitting(null);
        resetConfirmationState();
      }
    },
    [
      currentUserId,
      isLoadingUserId,
      isRegistered,
      isCreatedByUser,
      isSubmitting,
      onRegistrationChange,
      viewingEventDetails,
      fetchPersonDetailAPI
    ]
  );

  const handleRegisterClick = useCallback(
    (eventToRegister: EventDisplayInfo) => {
      if (
        isSubmitting ||
        !currentUserId ||
        isLoadingUserId ||
        isRegistered(eventToRegister.id) ||
        isCreatedByUser(eventToRegister.id)
      )
        return;
      setConfirmationState({
        isOpen: true,
        title: "Xác nhận đăng ký",
        message: (
          <>
            Bạn chắc chắn muốn đăng ký <br />{" "}
            <strong className="text-indigo-600">
              "{eventToRegister.name || eventToRegister.title}"
            </strong>
            ?
          </>
        ),
        onConfirm: () => {
          executeRegistration(eventToRegister);
        },
        onCancel: () => resetConfirmationState(),
        confirmVariant: "primary",
        confirmText: "Đăng ký",
        cancelText: "Hủy",
      });
    },
    [
      isSubmitting,
      currentUserId,
      isLoadingUserId,
      isRegistered,
      isCreatedByUser,
      executeRegistration,
    ]
  );

  const executeUnregistration = useCallback(
    async (eventToUnregister: EventDisplayInfo) => {
      if (isSubmitting || !currentUserId || isLoadingUserId) return;
      setIsSubmitting(eventToUnregister.id);
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.");
        setIsSubmitting(null);
        resetConfirmationState();
        return;
      }
      try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${eventToUnregister.id}/attendees/${currentUserId}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let m = "Hủy đăng ký thất bại";
          try {
            const d = await res.json();
            m = d.message || m;
          } catch (_) {}
          throw new Error(`${m} (${res.status})`);
        }
        toast.success(`Hủy đăng ký "${eventToUnregister.name || eventToUnregister.title}" thành công!`);
        onRegistrationChange(eventToUnregister.id, false);
        setSelectedToUnregister((prev) => {
          const next = new Set(prev);
          next.delete(eventToUnregister.id);
          return next;
        });
        if (viewingEventDetails && viewingEventDetails.id === eventToUnregister.id) {
            const currentViewing = {...viewingEventDetails};
            if (currentViewing.participants) {
                currentViewing.participants = currentViewing.participants.filter(p => (p as PersonDetail).userId !== currentUserId && (p as PersonDetail).id !== currentUserId );
            }
            setViewingEventDetails(null);
            setTimeout(()=> setViewingEventDetails(currentViewing),0);
        }
      } catch (err: any) {
        toast.error(`Hủy đăng ký thất bại: ${err.message}`);
      } finally {
        setIsSubmitting(null);
        resetConfirmationState();
      }
    },
    [isSubmitting, currentUserId, isLoadingUserId, onRegistrationChange, viewingEventDetails]
  );

  const handleUnregisterClick = useCallback(
    (eventToUnregister: EventDisplayInfo) => {
      if (isSubmitting || !currentUserId || isLoadingUserId) return;
      setConfirmationState({
        isOpen: true,
        title: "Xác nhận hủy đăng ký",
        message: (
          <>
            Bạn chắc chắn muốn hủy đăng ký <br />{" "}
            <strong className="text-indigo-600">
              "{eventToUnregister.name || eventToUnregister.title}"
            </strong>
            ?
          </>
        ),
        onConfirm: () => {
          executeUnregistration(eventToUnregister);
        },
        onCancel: () => resetConfirmationState(),
        confirmVariant: "danger",
        confirmText: "Xác nhận hủy",
        cancelText: "Không",
      });
    },
    [isSubmitting, currentUserId, isLoadingUserId, executeUnregistration]
  );

  const handleToggleBatchSelectEventId = (eventId: string) => {
    setSelectedToUnregister((prev) => {
      const n = new Set(prev);
      if (n.has(eventId)) n.delete(eventId);
      else n.add(eventId);
      return n;
    });
  };

  const handleToggleBatchSelectAll = (select: boolean, allVisibleIds: Set<string>) => {
    setSelectedToUnregister(select ? allVisibleIds : new Set());
  };

  type BatchUnregSuccess = { status: "fulfilled"; value: string; id: string };
  type BatchUnregError = { status: "rejected"; reason: string; id: string };
  type BatchUnregMappedResult = BatchUnregSuccess | BatchUnregError;

  const executeBatchUnregistration = useCallback(
    async (ids: string[]) => {
      if (isSubmitting || !currentUserId || isLoadingUserId) return;
      setIsSubmitting("batch_unregister");
      const token = localStorage.getItem("authToken");
      if (!token) {
        toast.error("Vui lòng đăng nhập lại.");
        setIsSubmitting(null);
        resetConfirmationState();
        return;
      }
      const loadId = toast.loading(`Đang hủy ${ids.length} sự kiện...`);

      const promises: Promise<BatchUnregMappedResult>[] = ids.map(
        (id): Promise<BatchUnregMappedResult> =>
          fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${id}/attendees/${currentUserId}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
          )
            .then(async (res): Promise<BatchUnregMappedResult> => {
              if (!res.ok) {
                let m = `Hủy ${id} lỗi`;
                try {
                  const d = await res.json();
                  m = d.message || m;
                } catch (_) {}
                return { status: "rejected" as const, reason: m, id };
              }
              return { status: "fulfilled" as const, value: id, id: id };
            })
            .catch((err): BatchUnregMappedResult => ({
              status: "rejected" as const,
              reason: err.message || `Lỗi mạng hủy ${id}`,
              id,
            }))
      );

      const results = await Promise.allSettled(promises);
      let okCount = 0;
      const failIds: string[] = [];
      const okIds: string[] = [];

      results.forEach((r) => {
        if (r.status === "fulfilled") {
          const mappedResult = r.value;
          if (mappedResult.status === "fulfilled") {
            okCount++;
            okIds.push(mappedResult.value);
          } else {
            const failedId = mappedResult.id;
            if (failedId) failIds.push(failedId);
          }
        } else {
          const idFromReason = (r.reason as any)?.id;
          if (idFromReason && typeof idFromReason === 'string' && !failIds.includes(idFromReason)) {
              failIds.push(idFromReason);
          }
        }
      });

      if (okCount > 0) {
        toast.success(`Hủy ${okCount} sự kiện thành công.`, { id: loadId });
        okIds.forEach((id) => onRegistrationChange(id, false));
      }
      if (failIds.length > 0) {
        setSelectedToUnregister(new Set(failIds));
        toast.error(`Lỗi hủy ${failIds.length} sự kiện. Vui lòng thử lại.`, {
          id: okCount === 0 ? loadId : undefined,
        });
      } else if (okCount === 0 && failIds.length === 0 && ids.length > 0) {
        toast.dismiss(loadId);
      } else if (okCount > 0 && failIds.length === 0){
          setSelectedToUnregister(new Set());
      }
      setIsSubmitting(null);
      resetConfirmationState();
    },
    [isSubmitting, currentUserId, isLoadingUserId, onRegistrationChange, setSelectedToUnregister]
  );
  const handleBatchUnregister = useCallback(() => {
    const ids = Array.from(selectedToUnregister);
    if (ids.length === 0) {
      toast.error("Vui lòng chọn ít nhất một sự kiện.");
      return;
    }
    if (!currentUserId || isLoadingUserId) {
      toast.error("Không thể xác định người dùng.");
      return;
    }
    setConfirmationState({
      isOpen: true,
      title: "Xác nhận hủy hàng loạt",
      message: (
        <>
          Hủy đăng ký{" "}
          <strong className="text-indigo-600">{ids.length} sự kiện</strong> đã
          chọn?
        </>
      ),
      onConfirm: () => {
        executeBatchUnregistration(ids);
      },
      onCancel: () => resetConfirmationState(),
      confirmVariant: "danger",
      confirmText: `Hủy (${ids.length})`,
      cancelText: "Không",
    });
  }, [
    selectedToUnregister,
    currentUserId,
    isLoadingUserId,
    executeBatchUnregistration,
  ]);

  const fetchQRCode = useCallback(async () => {
    if (!currentUserId || isLoadingUserId || isLoadingQRCode) return;
    setIsLoadingQRCode(true);
    setErrorQRCode(null);
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast.error("Vui lòng đăng nhập để xem QR.");
      setErrorQRCode("Chưa đăng nhập");
      setIsLoadingQRCode(false);
      return;
    }
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users/${currentUserId}/qr-code-image`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        let errorMessage = `Lỗi tải mã QR (${res.status})`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (_) {}
        throw new Error(errorMessage);
      }
      const blob = await res.blob();
      if (qrCodeUrl) URL.revokeObjectURL(qrCodeUrl);
      const objectURL = URL.createObjectURL(blob);
      setQrCodeUrl(objectURL);
    } catch (err: any) {
      const message = err.message || "Không thể tải mã QR.";
      setErrorQRCode(message);
      setQrCodeUrl(null);
      toast.error(message);
    } finally {
      setIsLoadingQRCode(false);
    }
  }, [currentUserId, isLoadingUserId, isLoadingQRCode, qrCodeUrl]);

  useEffect(() => {
    const currentQrCodeUrl = qrCodeUrl;
    return () => {
      if (currentQrCodeUrl) URL.revokeObjectURL(currentQrCodeUrl);
    };
  }, [qrCodeUrl]);

  const handleShowQRCode = () => {
    if (!currentUserId || isLoadingUserId) {
      toast.error("Chưa thể xác định người dùng để lấy mã QR.");
      return;
    }
    setShowQRCode(true);
    fetchQRCode();
  };

  const handleCheckInScanSuccess = async (qrCodeData: string) => {
    setIsCheckInScannerOpen(false);

    if (!currentUserId) {
        toast.error("Không tìm thấy ID người dùng hiện tại. Vui lòng thử đăng nhập lại.");
        return;
    }

    setIsCheckingIn(true);
    const toastId = toast.loading("Đang xử lý điểm danh...");

    try {
        const token = localStorage.getItem("authToken");
        if (!token) {
            toast.error("Vui lòng đăng nhập để thực hiện điểm danh.", { id: toastId });
            setIsCheckingIn(false);
            return;
        }

        const formData = new FormData();
        formData.append('qrCodeData', qrCodeData);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/${currentUserId}/check-in-2`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: formData,
        });

        const result = await response.json();

        if (response.ok && result.code === 1000) {
            const checkInData = result.result;
            toast.success(
               `${result.message || "Điểm danh thành công!"} Sự kiện: ${checkInData.eventName}\n}`,
               { id: toastId, duration: 5000 }
            );
            
            if (checkInData.eventId) {
                onRegistrationChange(checkInData.eventId, true); 
            }
            fetchAvailableEvents();


        } else {
            throw new Error(result.message || `Lỗi ${response.status}`);
        }
    } catch (error: any) {
        toast.error(`Điểm danh thất bại: ${error.message}`, { id: toastId });
    } finally {
        setIsCheckingIn(false);
    }
};

const handleCheckInScanError = (errorMessage: string) => {
    toast.error(`Lỗi quét QR: ${errorMessage}`);
};

useEffect(() => {
    if (!isCheckInScannerOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setIsCheckInScannerOpen(false);
        }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
        window.removeEventListener('keydown', handleEsc);
    };
}, [isCheckInScannerOpen]);


  const renderEventDetails = (event: EventDisplayInfo) => {
    const isCurrentlyEnrichingThisEvent = isLoadingEnrichedDetails &&
                                        (!enrichedEventForDetailView || enrichedEventForDetailView.id !== event.id);

    if (isCurrentlyEnrichingThisEvent && !enrichedEventForDetailView?.organizers && !enrichedEventForDetailView?.participants) {
        return (
            <div className="p-4 md:p-6 bg-white rounded-lg shadow-xl border border-gray-200 text-center min-h-[400px] flex flex-col justify-center items-center">
                <ReloadIcon className="w-10 h-10 animate-spin text-indigo-500 mx-auto my-4" />
                <p className="text-gray-600 text-lg">Đang tải chi tiết đầy đủ...</p>
            </div>
        );
    }

    const displayEvent = enrichedEventForDetailView && enrichedEventForDetailView.id === event.id ? enrichedEventForDetailView : event;

    const isProcessingSingle = isSubmitting === displayEvent.id;
    const alreadyRegistered = isRegistered(displayEvent.id);
    const isCreated = isCreatedByUser(displayEvent.id);
    const canPerformAction = !!currentUserId && !isLoadingUserId;

    const eventName = displayEvent.name || displayEvent.title || "Sự kiện không tên";
    const descriptionContent = displayEvent.description || displayEvent.content || displayEvent.purpose;
    const vietnameseStatus = getVietnameseEventStatus(displayEvent.status);

    let statusColorClass = "text-gray-600 bg-gray-200 border-gray-300";
    if (displayEvent.status) {
        const upperStatus = displayEvent.status.toUpperCase();
        if (upperStatus === "APPROVED") statusColorClass = "text-green-700 bg-green-100 border-green-300";
        else if (upperStatus === "PENDING") statusColorClass = "text-yellow-700 bg-yellow-100 border-yellow-300";
        else if (upperStatus === "REJECTED" || upperStatus === "CANCELLED") statusColorClass = "text-red-700 bg-red-100 border-red-300";
    }

    let creatorDisplay = "Không rõ";
    const creatorData = displayEvent.createdBy;
    if (creatorData) {
        if (typeof creatorData === 'object' && creatorData !== null) {
            creatorDisplay = formatPersonDetailsForDisplay(creatorData as PersonDetail);
        } else if (typeof creatorData === 'string') {
            const cachedCreator = fetchedPersonsCacheRef.current[creatorData];
            if (cachedCreator) {
                creatorDisplay = formatPersonDetailsForDisplay(cachedCreator);
            } else {
                creatorDisplay = `ID: ${creatorData}`;
            }
        }
    }
    if (creatorDisplay.trim().toLowerCase() === "id:" || creatorDisplay.trim() === "" || creatorDisplay.toLowerCase() === "không rõ id:" || creatorDisplay.toLowerCase() === "id: null" || creatorDisplay.toLowerCase() === "id: undefined") {
        creatorDisplay = "Không rõ";
    }


    return (

      <div className="p-4 bg-white rounded-lg shadow border">
        <button
          onClick={() => {
            setViewingEventDetails(null);
          }}
          className="mb-6 text-sm text-indigo-600 hover:text-indigo-800 flex items-center cursor-pointer group font-medium"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1.5 group-hover:-translate-x-1 transition-transform duration-150" />
          Quay lại danh sách
        </button>

        <div className="flex flex-col lg:flex-row gap-6 xl:gap-8">
          <div className="flex-shrink-0 lg:w-2/5 xl:w-1/3">
            {displayEvent.avatarUrl ? (
              <div className="aspect-[4/3] relative w-full">
                <Image
                    src={displayEvent.avatarUrl}
                    alt={`Ảnh bìa cho ${eventName}`}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg shadow-lg border border-gray-200"
                />
              </div>
            ) : (
              <div className="w-full h-52 lg:h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-gray-400 shadow-lg aspect-[4/3] border">
                <CalendarIcon className="w-16 h-16 lg:w-20 lg:h-20 opacity-50" />
              </div>
            )}
          </div>

          <div className="flex-grow">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">{eventName}</h1>
            {displayEvent.status && (
              <div className="mb-5">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColorClass} border`}>
                  {vietnameseStatus}
                </span>
              </div>
            )}

            <div className="space-y-4 text-base text-gray-700">
              {displayEvent.time && (
                <div className="flex items-start">
                  <CalendarIcon className="w-5 h-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-800">Thời gian diễn ra:</p>
                    <p className="text-gray-600">{new Date(displayEvent.time).toLocaleString("vi-VN", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              )}
              {displayEvent.location && (
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-gray-800">Địa điểm:</p>
                    <p className="text-gray-600">{displayEvent.location}</p>
                  </div>
                </div>
              )}
              {displayEvent.maxAttendees !== null && displayEvent.maxAttendees !== undefined && (
                  <div className="flex items-start">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-indigo-600 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.084-1.268-.25-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.084-1.268.25-1.857m0 0A5.002 5.002 0 0112 15a5.002 5.002 0 014.745 3.143M12 13a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                      <div>
                          <p className="font-semibold text-gray-800">Số lượng dự kiến:</p>
                          <p className="text-gray-600">
                            {displayEvent.currentAttendeesCount !== null && displayEvent.currentAttendeesCount !== undefined ? displayEvent.currentAttendeesCount : (displayEvent.attendees?.length || 0)} / {displayEvent.maxAttendees}
                          </p>
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>

        {(descriptionContent || displayEvent.purpose || displayEvent.content) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Chi tiết sự kiện</h4>
                {displayEvent.purpose && (
                    <div className="mb-4">
                        <strong className="block font-medium text-gray-900 mb-1">Mục đích:</strong>
                        <p className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words p-3 bg-gray-50 rounded-md border">{displayEvent.purpose}</p>
                    </div>
                )}
                {(displayEvent.description || displayEvent.content) && (
                    <div className="mb-4">
                        <strong className="block font-medium text-gray-900 mb-1">{displayEvent.content ? "Nội dung:" : "Mô tả:"}</strong>
                        <p className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words p-3 bg-gray-50 rounded-md border">{displayEvent.content || displayEvent.description}</p>
                    </div>
                )}
            </div>
        )}

        {(displayEvent.organizers && displayEvent.organizers.length > 0) ? (
            <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Ban tổ chức</h4>
                {isCurrentlyEnrichingThisEvent && (!enrichedEventForDetailView?.organizers || enrichedEventForDetailView.organizers.some(o => !(o as PersonDetail).name && !(o as PersonDetail).firstName)) && <p className="text-sm text-gray-500 italic">Đang cập nhật thông tin ban tổ chức...</p>}
                <ul className="space-y-2 text-sm">
                    {(displayEvent.organizers as PersonDetail[]).map((org, index) => (
                        <li key={org.id || org.userId || `org-${index}`} className="p-3 bg-gray-50 rounded-md border text-gray-700">
                            {formatPersonDetailsForDisplay(org)}
                        </li>
                    ))}
                </ul>
            </div>
        ): isLoadingEnrichedDetails ? <div className="mt-8 pt-6 border-t border-gray-200"><p className="text-sm text-gray-500 italic">Đang tải thông tin ban tổ chức...</p></div> : null}

        {(displayEvent.participants && displayEvent.participants.length > 0) ? (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-xl font-semibold text-gray-800 mb-3">Người tham dự</h4>
            {isCurrentlyEnrichingThisEvent && (!enrichedEventForDetailView?.participants || enrichedEventForDetailView.participants.some(p => !(p as PersonDetail).name && !(p as PersonDetail).firstName)) && <p className="text-sm text-gray-500 italic">Đang cập nhật thông tin người tham dự...</p>}
            <ul className="space-y-2 text-sm">
                {(displayEvent.participants as PersonDetail[]).map((par, index) => (
                  <li key={par.id || par.userId || `par-${index}`} className="p-3 bg-gray-50 rounded-md border text-gray-700">
                    {formatPersonDetailsForDisplay(par)}
                  </li>
                ))}
            </ul>
          </div>
        ) : isLoadingEnrichedDetails ? <div className="mt-8 pt-6 border-t border-gray-200"><p className="text-sm text-gray-500 italic">Đang tải thông tin người tham dự...</p></div> : null }


        {(creatorDisplay && creatorDisplay !== "Không rõ") || displayEvent.createdAt ? (
              <div className="mt-8 pt-6 border-t border-gray-200">
                  <h4 className="text-xl font-semibold text-gray-800 mb-3">Thông tin khác</h4>
                  {creatorDisplay && creatorDisplay !== "Không rõ" && (
                      <p className="text-sm text-gray-700 mb-1"><strong className="font-medium text-gray-900">Tạo bởi:</strong> {creatorDisplay}</p>
                  )}
                  {displayEvent.createdAt && (
                      <p className="text-sm text-gray-600"><strong className="font-medium text-gray-900">Ngày tạo sự kiện:</strong> {new Date(displayEvent.createdAt).toLocaleString("vi-VN", { dateStyle: 'long', timeStyle: 'short' })}</p>
                  )}
              </div>
        ) : null}

        <div className="mt-10 pt-6 border-t-2 border-gray-300 flex flex-col sm:flex-row justify-end gap-3">
          {isCreated ? (
            <button
              className={`w-full sm:w-auto px-6 py-2.5 rounded-md text-white bg-purple-600 text-sm font-medium cursor-default shadow-md`}
              disabled
            >
              ✨ Sự kiện của bạn
            </button>
          ) : alreadyRegistered ? (
            <button
              onClick={() => handleUnregisterClick(displayEvent)}
              disabled={isProcessingSingle || !canPerformAction}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-md text-white shadow-md transition-colors text-sm font-medium cursor-pointer ${
                isProcessingSingle || !canPerformAction
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              }`}
            >
              {isProcessingSingle ? "Đang xử lý..." : "Hủy đăng ký"}
            </button>
          ) : (
            <button
              onClick={() => handleRegisterClick(displayEvent)}
              disabled={isProcessingSingle || !canPerformAction}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-md text-white shadow-md transition-colors text-sm font-medium cursor-pointer ${
                isProcessingSingle || !canPerformAction
                  ? "bg-indigo-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              }`}
            >
              {isProcessingSingle ? "Đang xử lý..." : "📝 Đăng ký tham gia"}
            </button>
          )}
          <button
            onClick={() => {
                setViewingEventDetails(null);
            }}
            className="w-full sm:w-auto cursor-pointer px-6 py-2.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            Đóng
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full p-3 md:p-5 bg-gray-100">
        <Toaster position="top-center" toastOptions={{duration: 3500}} />

      <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 flex-shrink-0 flex-wrap gap-2">

        <h2 className="text-xl md:text-2xl font-bold text-gray-700">
          {viewingEventDetails ? (enrichedEventForDetailView?.name || enrichedEventForDetailView?.title || viewingEventDetails.name || viewingEventDetails.title) : "Sự kiện"}
        </h2>
        {!viewingEventDetails && (
          <div className="flex gap-2 flex-wrap items-center ml-auto">
            <button
              onClick={() => fetchAvailableEvents(true)}
              disabled={isLoadingAvailable || isLoadingUserId}
              className="p-2 border border-gray-300 rounded-lg text-sm cursor-pointer focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
              title="Làm mới danh sách sự kiện"
            >
              {isLoadingAvailable ? (
                <ReloadIcon className="w-5 h-5 animate-spin text-indigo-600" />
              ) : (
                <ReloadIcon className="w-5 h-5 text-indigo-600" />
              )}
            </button>
             <button
                onClick={() => {
                    if (!currentUserId) {
                        toast.error("Vui lòng đăng nhập để điểm danh.");
                        return;
                    }
                    setIsCheckInScannerOpen(true);
                }}
                disabled={isLoadingUserId || !currentUserId || isCheckingIn}
                className="px-3 py-1.5 cursor-pointer rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Quét mã QR của sự kiện để check-in"
            >
                {isCheckingIn ? (
                    <ReloadIcon className="w-5 h-5 animate-spin" />
                ) : (
                    <MdQrCodeScanner size={22} />
                )}
                {isCheckingIn ? "Đang xử lý..." : "Quét QR Điểm Danh"}
            </button>
            <button
                onClick={handleShowQRCode}
                disabled={isLoadingUserId || !currentUserId || isLoadingQRCode}
                className="px-3 py-1.5 cursor-pointer rounded-md text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Hiển thị mã QR của bạn để người khác quét"
            >
                <MdQrCode size={22} />
                Mã QR của tôi
            </button>
          </div>
        )}
      </div>

        {(() => {
            const eventToRender = (enrichedEventForDetailView && viewingEventDetails && enrichedEventForDetailView.id === viewingEventDetails.id)
                                    ? enrichedEventForDetailView
                                    : viewingEventDetails;

            if (eventToRender) {
                return renderEventDetails(eventToRender);
            } else {
                return (
                    <>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-0 px-1 border-b border-gray-200 flex-shrink-0">
                        <button
                            onClick={() => setTab("available")}
                            className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 ${
                            tab === "available"
                                ? "border-indigo-500 text-indigo-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            📌 Gợi ý (
                            {
                            availableEvents.filter(
                                (e) => !isRegistered(e.id) && !isCreatedByUser(e.id)
                            ).length
                            }
                            )
                        </button>
                        <button
                            onClick={() => setTab("registered")}
                            className={`py-2 font-semibold cursor-pointer text-sm md:text-base border-b-2 ${
                            tab === "registered"
                                ? "border-green-500 text-green-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            ✅ Đã đăng ký ({registeredEventIds?.size ?? 0})
                        </button>
                        </div>
                        <div className="flex-grow pt-0 min-h-0">
                        <EventListManager
                            allEvents={availableEvents}
                            tab={tab}
                            isRegistered={isRegistered}
                            isCreatedByUser={isCreatedByUser}
                            currentUserId={currentUserId}
                            isLoadingUserId={isLoadingUserId}
                            isSubmittingAction={isSubmitting}
                            selectedEventIdsForBatchAction={selectedToUnregister}
                            onRegisterEvent={handleRegisterClick}
                            onUnregisterEvent={handleUnregisterClick}
                            onViewEventDetails={setViewingEventDetails}
                            onToggleBatchSelectEventId={handleToggleBatchSelectEventId}
                            onToggleBatchSelectAll={handleToggleBatchSelectAll}
                            onExecuteBatchUnregister={handleBatchUnregister}
                            isLoadingData={isLoadingAvailable}
                            dataError={errorAvailable}
                        />
                        </div>
                    </>
                );
            }
        })()}


      <ConfirmationDialog
        isOpen={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmVariant={confirmationState.confirmVariant}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        onConfirm={confirmationState.onConfirm || (() => {})}
        onCancel={() => resetConfirmationState()}
      />

      {showQRCode && (
            <div
                className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[80] p-4"
                onClick={() => setShowQRCode(false)}
            >
                <div
                    className="bg-white p-6 rounded-lg shadow-xl text-center max-w-xs w-full"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Mã QR cá nhân của bạn</h3>
                    {isLoadingQRCode && <div className="flex justify-center items-center h-48"><ReloadIcon className="w-8 h-8 animate-spin text-indigo-500"/></div>}
                    {errorQRCode && <p className="text-red-500 bg-red-50 p-3 rounded border border-red-200 my-4">{errorQRCode}</p>}
                    {qrCodeUrl && !errorQRCode && (
                        <div className="my-4 flex justify-center">
                            <img src={qrCodeUrl} alt="Mã QR của bạn" className="w-full max-w-[256px] h-auto object-contain border rounded"/>
                        </div>
                    )}
                    <div className="mt-2 text-xs text-gray-500">
                        <p>Dùng mã này để điểm danh.</p>
                        {errorQRCode && <button onClick={fetchQRCode} className="mt-2 text-blue-600 hover:underline font-medium">Thử lại</button>}
                    </div>
                    <button
                        onClick={() => setShowQRCode(false)}
                        className="mt-6 cursor-pointer w-full bg-indigo-600 text-white py-2.5 px-4 rounded-md hover:bg-indigo-700 transition text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        )}

        {isCheckInScannerOpen && (
            <div
                className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[90] p-4"
                onClick={() => setIsCheckInScannerOpen(false)}
            >
                <div
                    className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-md relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h3 className="text-lg font-semibold mb-4 text-gray-800 text-center">Quét mã QR Sự kiện để Điểm danh</h3>
                    <button
                        onClick={() => setIsCheckInScannerOpen(false)}
                        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
                        aria-label="Đóng trình quét QR"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <QRScanner
                        onScanSuccess={handleCheckInScanSuccess}
                        onScanError={handleCheckInScanError}
                    />
                </div>
            </div>
        )}

    </div>
  );
};

export default RegisteredEventsTabContent;