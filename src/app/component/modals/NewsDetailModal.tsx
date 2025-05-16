"use client";

import React from "react";
import { NewsItem, User, EventDisplayInfo } from "../types/appTypes";
import { 
  Cross1Icon, 
  Pencil1Icon, 
  TrashIcon, 
  CheckCircledIcon, 
  LockClosedIcon, 
  ReloadIcon,
  CalendarIcon // Giả sử bạn có thể cần CalendarIcon
} from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-hot-toast";


interface NewsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: NewsItem | null;
  user: User | null;
  onTriggerEdit: (item: NewsItem) => void;
  onTriggerDelete: (item: NewsItem) => void;
  
  relatedEventDetails?: EventDisplayInfo | null;
  onAttemptRegisterRelatedEvent?: (event: EventDisplayInfo) => void;
  registeredEventIds?: Set<string>;
  createdEventIdsForEvents?: Set<string>;
  isRegisteringForEventId?: string | null;
}

const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  user,
  onTriggerEdit,
  onTriggerDelete,
  relatedEventDetails,
  onAttemptRegisterRelatedEvent,
  registeredEventIds,
  createdEventIdsForEvents,
  isRegisteringForEventId,
}) => {
  if (!isOpen || !item) return null;

  const isNewsCreator = user?.id === item.createdBy?.id;
  const isAdmin = user?.roles?.some((role) => role.name === "ADMIN");

  const canUpdateNews = isNewsCreator && item.status === "APPROVED";
  const canDeleteNews = isAdmin || isNewsCreator;

  const handleEditNews = () => {
    if (canUpdateNews) {
      onTriggerEdit(item);
    }
  };

  const handleDeleteNews = () => {
    if (canDeleteNews) {
      onTriggerDelete(item);
    }
  };

  const getEventTemporalStatus = (eventDateStr: string | undefined): "upcoming" | "ongoing" | "ended" => {
    if (!eventDateStr) return "upcoming";
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const eventDate = new Date(eventDateStr);
      if (isNaN(eventDate.getTime())) return "upcoming"; // Invalid date considered upcoming
      const eventDateStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

      if (eventDateStart < todayStart) return "ended";
      else if (eventDateStart > todayStart) return "upcoming";
      else return "ongoing"; // Event is today
    } catch (e) {
      return "upcoming"; // Fallback in case of date parsing error
    }
  };
  
  const renderEventRegistrationButton = () => {
    if (!user || !item?.event?.id || !relatedEventDetails || !onAttemptRegisterRelatedEvent || !registeredEventIds || !createdEventIdsForEvents) {
      if (item?.event?.id && item?.event?.name && !user && onAttemptRegisterRelatedEvent) {
         return (
           <Link href="/login" passHref>
              <a className="mt-1 inline-block px-3 py-1.5 text-xs font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600">
                  Đăng nhập để ĐK sự kiện
              </a>
           </Link>
         );
      }
      return null;
    }

    const eventToRegister = relatedEventDetails;
    const isUserCreatorOfThisEvent = createdEventIdsForEvents.has(eventToRegister.id);

    if (isUserCreatorOfThisEvent) {
      return (
        <p className="mt-1 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-md inline-block">
          Bạn là người tạo sự kiện này
        </p>
      );
    }

    const isAlreadyRegistered = registeredEventIds.has(eventToRegister.id);
    const isProcessingThisRegistration = isRegisteringForEventId === eventToRegister.id;
    const eventTemporalStatus = getEventTemporalStatus(eventToRegister.date);
    
    const currentAttendees = eventToRegister.currentAttendeesCount ?? (eventToRegister.attendees?.length || 0);
    const maxAttendees = eventToRegister.maxAttendees;
    const isFull = typeof maxAttendees === 'number' && maxAttendees > 0 && currentAttendees >= maxAttendees;

    let buttonText: React.ReactNode = <><Pencil1Icon className="mr-1.5 h-3.5 w-3.5" /> Đăng ký sự kiện</>;
    let buttonClass = "bg-green-600 hover:bg-green-700";
    let buttonDisabled = false;

    if (isAlreadyRegistered) {
      buttonText = <><CheckCircledIcon className="mr-1.5 h-3.5 w-3.5" /> Đã đăng ký</>;
      buttonClass = "bg-slate-500 cursor-default";
      buttonDisabled = true;
    } else if (isFull) {
      buttonText = <><LockClosedIcon className="mr-1.5 h-3.5 w-3.5" /> Hết chỗ</>;
      buttonClass = "bg-gray-400 cursor-not-allowed";
      buttonDisabled = true;
    } else if (eventTemporalStatus === "ended") {
      buttonText = "Đã kết thúc";
      buttonClass = "bg-gray-400 cursor-not-allowed";
      buttonDisabled = true;
    } else if (isProcessingThisRegistration) {
      buttonText = <><ReloadIcon className="animate-spin mr-1.5 h-3.5 w-3.5" /> Đang xử lý...</>;
      buttonClass = "bg-indigo-400 cursor-wait";
      buttonDisabled = true;
    }

    return (
      <button
        onClick={() => {
          if (!buttonDisabled && !isAlreadyRegistered && !isFull && eventTemporalStatus !== "ended" && !isProcessingThisRegistration) {
            onAttemptRegisterRelatedEvent(eventToRegister);
          } else if (isFull && !isAlreadyRegistered) {
            toast.error("Sự kiện đã đủ số lượng người đăng ký.");
          }
        }}
        disabled={buttonDisabled}
        className={`mt-1 px-3 py-1.5 text-xs font-medium text-white rounded-md shadow-sm transition duration-150 flex items-center gap-1 ${buttonClass}`}
      >
        {buttonText}
      </button>
    );
  };


  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl p-0 flex flex-col max-h-[90vh] transition-all duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
          <h2
            className="text-xl font-semibold text-gray-800 truncate pr-4"
            title={item.title || "Chi tiết tin tức"}
          >
            {item.title || "Chi tiết tin tức"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 cursor-pointer hover:text-red-600 transition-colors p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Cross1Icon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-grow p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {item.imageUrl && (
            <div className="mb-4 relative w-full aspect-video rounded overflow-hidden bg-gray-100 max-h-[400px]">
              <Image
                src={item.imageUrl}
                alt={item.title || "Hình ảnh tin tức"}
                layout="fill"
                objectFit="contain"
                className="bg-gray-100"
              />
            </div>
          )}
          <div className="text-xs text-gray-500">
            <span>
              Ngày đăng:{" "}
              {new Date(
                item.date || item.createdAt || Date.now()
              ).toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {item.createdBy && (
              <span className="ml-2">
                | Người tạo:{" "}
                {`${item.createdBy.lastName || ""} ${
                  item.createdBy.firstName || ""
                }`.trim() || item.createdBy.username}
              </span>
            )}
          </div>

          {item.event && item.event.id && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm mb-1">
                <strong className="font-medium text-gray-900">Sự kiện liên quan:</strong>
                <span className="ml-1 text-indigo-700 font-semibold">{item.event.name || "Không có tên"}</span>
              </p>
              {renderEventRegistrationButton()}
            </div>
          )}
          
          <div
            className="prose prose-sm sm:prose lg:prose-lg max-w-none tiptap-rendered-content pt-2"
            dangerouslySetInnerHTML={{ __html: item.content || "" }}
          />
        </div>

        <div className="px-6 py-4 border-t flex justify-end items-center gap-3 sticky bottom-0 bg-white z-10 rounded-b-lg">
          {user && canUpdateNews && (
            <button
              onClick={handleEditNews}
              className="px-5 cursor-pointer py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition text-sm font-medium flex items-center gap-1.5"
            >
              <Pencil1Icon className="h-4 w-4" />
              Sửa tin
            </button>
          )}
          {user && canDeleteNews && (
            <button
              onClick={handleDeleteNews}
              className="px-5 cursor-pointer py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition text-sm font-medium flex items-center gap-1.5"
            >
              <TrashIcon className="h-4 w-4" />
              Xóa tin
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 cursor-pointer py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg shadow-sm transition text-sm font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewsDetailModal;