// EventListManager.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  CalendarIcon,
  Component1Icon,
  ListBulletIcon,
  // Bỏ ArrowLeftIcon, ReaderIcon, ChevronLeftIcon nếu không dùng trực tiếp ở đây
  // Giữ lại các icon cần thiết cho các nút điều khiển
} from "@radix-ui/react-icons";
import { EventDisplayInfo } from "../../types/appTypes"; // Đảm bảo đường dẫn đúng

const getWeekRange = (
  refDate: Date
): { startOfWeek: Date; endOfWeek: Date } => {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { startOfWeek: start, endOfWeek: end };
};

const getMonthRange = (
  refDate: Date
): { startOfMonth: Date; endOfMonth: Date } => {
  const d = new Date(refDate);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { startOfMonth: start, endOfMonth: end };
};

interface EventListManagerProps {
  allEvents: EventDisplayInfo[];
  tab: "available" | "registered";
  isRegistered: (eventId: string) => boolean;
  isCreatedByUser: (eventId: string) => boolean;
  currentUserId: string | null;
  isLoadingUserId: boolean;
  isSubmittingAction: string | "batch_unregister" | null;
  selectedEventIdsForBatchAction: Set<string>;
  onRegisterEvent: (event: EventDisplayInfo) => void;
  onUnregisterEvent: (event: EventDisplayInfo) => void;
  onViewEventDetails: (event: EventDisplayInfo) => void;
  onToggleBatchSelectEventId: (eventId: string) => void;
  onToggleBatchSelectAll: (select: boolean, allVisibleIds: Set<string>) => void;
  onExecuteBatchUnregister: () => void;
  isLoadingData: boolean;
  dataError: string | null;
}

const EventListManager: React.FC<EventListManagerProps> = ({
  allEvents,
  tab,
  isRegistered,
  isCreatedByUser,
  currentUserId,
  isLoadingUserId,
  isSubmittingAction,
  selectedEventIdsForBatchAction,
  onRegisterEvent,
  onUnregisterEvent,
  onViewEventDetails,
  onToggleBatchSelectEventId,
  onToggleBatchSelectAll,
  onExecuteBatchUnregister,
  isLoadingData,
  dataError,
}) => {
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [eventSortOrder, setEventSortOrder] = useState<"az" | "za">("az");
  const [eventTimeFilter, setEventTimeFilter] = useState<
    "all" | "today" | "thisWeek" | "thisMonth" | "dateRange"
  >("all");
  const [eventStartDateFilter, setEventStartDateFilter] = useState<string>("");
  const [eventEndDateFilter, setEventEndDateFilter] = useState<string>("");
  const [eventViewMode, setEventViewMode] = useState<"list" | "card">("list");

  const handleEventStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStartDate = e.target.value;
      setEventStartDateFilter(newStartDate);
      if (eventEndDateFilter && newStartDate > eventEndDateFilter) {
        setEventEndDateFilter("");
        toast("Ngày bắt đầu không thể sau ngày kết thúc.", { icon: "⚠️" });
      }
    },
    [eventEndDateFilter]
  );

  const handleEventEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEndDate = e.target.value;
      if (eventStartDateFilter && newEndDate < eventStartDateFilter) {
        toast.error("Ngày kết thúc không thể trước ngày bắt đầu.");
      } else {
        setEventEndDateFilter(newEndDate);
      }
    },
    [eventStartDateFilter]
  );

  const processedEvents = useMemo(() => {
    let eventsToProcess = [...allEvents];
    if (eventTimeFilter !== "all") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      eventsToProcess = eventsToProcess.filter((event) => {
        const dateStrToUse = event.time;
        if (!dateStrToUse) return false;
        try {
          const eventDate = new Date(dateStrToUse);
          if (isNaN(eventDate.getTime())) return false;
          switch (eventTimeFilter) {
            case "today":
              return eventDate >= todayStart && eventDate <= todayEnd;
            case "thisWeek":
              const { startOfWeek, endOfWeek } = getWeekRange(new Date());
              return eventDate >= startOfWeek && eventDate <= endOfWeek;
            case "thisMonth":
              const { startOfMonth, endOfMonth } = getMonthRange(new Date());
              return eventDate >= startOfMonth && eventDate <= endOfMonth;
            case "dateRange":
              if (!eventStartDateFilter || !eventEndDateFilter) return true; // Nếu chưa chọn đủ range thì không lọc
              const start = new Date(eventStartDateFilter);
              start.setHours(0, 0, 0, 0);
              const end = new Date(eventEndDateFilter);
              end.setHours(23, 59, 59, 999);
              if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return true; // Range không hợp lệ thì không lọc
              return eventDate >= start && eventDate <= end;
            default:
              return true;
          }
        } catch {
          return false;
        }
      });
    }
    if (eventSearchTerm.trim()) {
      const lowerSearchTerm = eventSearchTerm.trim().toLowerCase();
      eventsToProcess = eventsToProcess.filter(
        (event) =>
          event.name.toLowerCase().includes(lowerSearchTerm) ||
          (event.location &&
            event.location.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (tab === "available") {
      eventsToProcess = eventsToProcess.filter(
        (event) => !isRegistered(event.id) && !isCreatedByUser(event.id)
      );
    } else {
      eventsToProcess = eventsToProcess.filter((event) =>
        isRegistered(event.id)
      );
    }
    if (eventSortOrder === "za") {
      eventsToProcess.sort((a, b) =>
        b.name.localeCompare(a.name, "vi", { sensitivity: "base" })
      );
    } else {
      eventsToProcess.sort((a, b) =>
        a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
      );
    }
    return eventsToProcess;
  }, [
    allEvents,
    tab,
    isRegistered,
    isCreatedByUser,
    eventTimeFilter,
    eventStartDateFilter,
    eventEndDateFilter,
    eventSearchTerm,
    eventSortOrder,
  ]);

  const allVisibleRegisteredEventIds = useMemo(() => {
    if (tab === "registered") {
      return new Set(processedEvents.map(e => e.id));
    }
    return new Set<string>();
  }, [processedEvents, tab]);

  const noResultMessage =
    eventSearchTerm ||
    eventTimeFilter !== "all" ||
    (eventTimeFilter === "dateRange" && (eventStartDateFilter || eventEndDateFilter))
      ? `Không tìm thấy sự kiện nào khớp.`
      : tab === "available"
      ? "Không có sự kiện mới nào để đăng ký."
      : "Bạn chưa đăng ký sự kiện nào.";

  if (isLoadingData)
    return (
      <p className="text-center text-gray-500 italic py-5">Đang tải sự kiện...</p>
    );
  if (dataError)
    return (
      <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">
        {dataError}
      </p>
    );

  const isBatchUnregistering = isSubmittingAction === "batch_unregister";
  const allFilteredRegisteredSelected =
    tab === "registered" &&
    processedEvents.length > 0 &&
    allVisibleRegisteredEventIds.size > 0 &&
    Array.from(allVisibleRegisteredEventIds).every((id) => selectedEventIdsForBatchAction.has(id)) &&
    selectedEventIdsForBatchAction.size >= allVisibleRegisteredEventIds.size;

  return (
    <>
      <div className="mb-5 p-4 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="relative lg:col-span-1 xl:col-span-1">
            <label
              htmlFor="searchRegEventsManager"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Tìm sự kiện
            </label>
            <span className="absolute left-3 top-9 transform -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              type="text"
              id="searchRegEventsManager"
              placeholder="Tên hoặc địa điểm..."
              value={eventSearchTerm}
              onChange={(e) => setEventSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm"
            />
          </div>
          <div>
            <label
              htmlFor="sortRegEventsManager"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Sắp xếp
            </label>
            <select
              id="sortRegEventsManager"
              value={eventSortOrder}
              onChange={(e) =>
                setEventSortOrder(e.target.value as "az" | "za")
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
            >
              <option value="az"> A - Z</option>
              <option value="za"> Z - A</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="timeFilterRegEventsManager"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Lọc thời gian
            </label>
            <select
              id="timeFilterRegEventsManager"
              value={eventTimeFilter}
              onChange={(e) =>
                setEventTimeFilter(
                  e.target.value as
                    | "all"
                    | "today"
                    | "thisWeek"
                    | "thisMonth"
                    | "dateRange"
                )
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
            >
              <option value="all">Tất cả</option>
              <option value="today">Hôm nay</option>
              <option value="thisWeek">Tuần này</option>
              <option value="thisMonth">Tháng này</option>
              <option value="dateRange">Khoảng ngày</option>
            </select>
          </div>
          <div className="flex items-end justify-start sm:justify-end gap-2">
            <label className="block text-xs font-medium text-gray-600 mb-1 invisible h-4">
              Xem
            </label>
            <div className="flex w-full sm:w-auto">
              <button
                onClick={() => setEventViewMode("list")}
                title="Danh sách"
                className={`flex-1 sm:flex-none p-2 rounded-l-md border border-r-0 transition duration-150 ease-in-out h-[42px] ${
                  eventViewMode === "list"
                    ? "bg-green-600 border-green-700 text-white shadow-sm z-10"
                    : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setEventViewMode("card")}
                title="Thẻ"
                className={`flex-1 sm:flex-none p-2 rounded-r-md border transition duration-150 ease-in-out h-[42px] ${
                  eventViewMode === "card"
                    ? "bg-green-600 border-green-700 text-white shadow-sm z-10"
                    : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <Component1Icon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {eventTimeFilter === "dateRange" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 p-3 bg-green-50 rounded-lg border border-green-200 shadow-sm flex-shrink-0">
          <div>
            <label
              htmlFor="startDateFilterRegManager"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <span className="inline-block mr-1">🗓️</span> Từ ngày
            </label>
            <input
              type="date"
              id="startDateFilterRegManager"
              value={eventStartDateFilter}
              onChange={handleEventStartDateChange}
              max={eventEndDateFilter || undefined}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white"
            />
          </div>
          <div>
            <label
              htmlFor="endDateFilterRegManager"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <span className="inline-block mr-1">🗓️</span> Đến ngày
            </label>
            <input
              type="date"
              id="endDateFilterRegManager"
              value={eventEndDateFilter}
              onChange={handleEventEndDateChange}
              min={eventStartDateFilter || undefined}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 shadow-sm bg-white"
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        {tab === "registered" && processedEvents.length > 0 && (
          <div className="mb-3 pb-2 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-gray-50 py-2 z-10 px-1 -mx-1 rounded-t-md">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="select-all-unregister-manager"
                className="mr-2 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                checked={allFilteredRegisteredSelected}
                onChange={(e) => onToggleBatchSelectAll(e.target.checked, allVisibleRegisteredEventIds)}
                disabled={processedEvents.length === 0 || isBatchUnregistering}
                aria-label="Chọn tất cả để hủy"
              />
              <label
                htmlFor="select-all-unregister-manager"
                className="text-sm text-gray-600 cursor-pointer select-none"
              >
                Chọn tất cả ({selectedEventIdsForBatchAction.size})
              </label>
            </div>
            <button
              onClick={onExecuteBatchUnregister}
              disabled={
                isBatchUnregistering ||
                selectedEventIdsForBatchAction.size === 0 ||
                !currentUserId ||
                isLoadingUserId
              }
              className={`px-3 py-1 rounded-md text-white shadow-sm transition text-xs font-medium cursor-pointer flex items-center gap-1 ${
                isBatchUnregistering ||
                selectedEventIdsForBatchAction.size === 0 ||
                !currentUserId ||
                isLoadingUserId
                  ? "bg-red-300 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600"
              }`}
            >
              {isBatchUnregistering
                ? "..."
                : `Hủy (${selectedEventIdsForBatchAction.size})`}
            </button>
          </div>
        )}
        {processedEvents.length === 0 && !isLoadingData && (
          <p className="text-center text-gray-500 italic py-5">
            {noResultMessage}
          </p>
        )}
        {eventViewMode === "list" ? (
          <ul className="space-y-3">
            {processedEvents.map((event) => {
              const isProcessingSingle = isSubmittingAction === event.id;
              const isSelectedForBatch = selectedEventIdsForBatchAction.has(event.id);
              const processing = isProcessingSingle || (isBatchUnregistering && isSelectedForBatch);
              const alreadyRegistered = isRegistered(event.id);
              const isCreated = isCreatedByUser(event.id);
              const canAct = !!currentUserId && !isLoadingUserId;

              return (
                <li
                  key={event.id}
                  className={`border rounded-lg shadow-sm transition-all duration-150 flex gap-4 items-start p-3 md:p-4
                    ${processing ? "opacity-60 cursor-wait" : "hover:shadow-md"}
                    ${tab === "registered" && isSelectedForBatch ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}
                    ${!(tab === "registered" && isSelectedForBatch) ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}
                  `}
                  onClick={() => {
                    // Chỉ gọi onViewEventDetails nếu không phải đang chọn cho batch và item không bị processing
                    if (!processing && !(tab === "registered" && isSelectedForBatch)) {
                         onViewEventDetails(event);
                    } else if (tab === "registered" && !processing){
                        // Nếu đang ở tab registered và click vào item đã chọn (mà không processing) -> bỏ chọn
                        // Hoặc nếu click vào item chưa chọn -> chọn
                        onToggleBatchSelectEventId(event.id);
                    }
                  }}
                >
                  {/* Event Image */}
                  <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-gray-200 rounded-md overflow-hidden">
                    {event.avatarUrl ? (
                      <img
                        src={event.avatarUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <CalendarIcon className="w-10 h-10" />
                      </div>
                    )}
                  </div>

                  {/* Event Info and Actions */}
                  <div className="flex-grow flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-md md:text-lg font-semibold text-gray-800 mb-1 flex items-center">
                        {tab === "registered" && (
                          <input
                            type="checkbox"
                            checked={isSelectedForBatch}
                            onChange={(e) => {
                                e.stopPropagation(); // Ngăn li's onClick
                                onToggleBatchSelectEventId(event.id);
                            }}
                            onClick={(e) => e.stopPropagation()} // Đảm bảo click vào checkbox không trigger li's onClick
                            disabled={processing}
                            aria-label={`Chọn hủy ${event.name}`}
                            className="mr-2 h-4 w-4 align-middle text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer flex-shrink-0"
                          />
                        )}
                        <span className="hover:underline" onClick={(e) => { e.stopPropagation(); onViewEventDetails(event); }}>{event.name}</span>
                        {isCreated && tab === "available" && (
                          <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                            ✨ Của bạn
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:gap-4 text-sm text-gray-600">
                        {event.time && (
                          <span className="flex items-center">
                            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 opacity-70 flex-shrink-0" />
                            {new Date(event.time).toLocaleString("vi-VN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        )}
                        {event.location && (
                          <span className="flex items-center mt-1 sm:mt-0">
                            <span className="mr-1.5 opacity-70">📍</span>
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:self-end pt-3 mt-2">
                       {/* Nút Đăng ký/Hủy đăng ký sẽ được hiển thị ở đây */}
                       {tab === "available" &&
                        (isCreated ? (
                          <button
                            className="w-full cursor-not-allowed sm:w-auto px-3 py-1.5 rounded-md text-gray-600 bg-gray-300 text-xs font-medium"
                            disabled
                            onClick={(e) => e.stopPropagation()}
                          >
                            ✨ Sự kiện của bạn
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRegisterEvent(event);
                            }}
                            disabled={alreadyRegistered || processing || !canAct}
                            className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                              alreadyRegistered
                                ? "bg-gray-400 cursor-not-allowed"
                                : processing || !canAct
                                ? "bg-blue-300 cursor-wait"
                                : "bg-blue-500 hover:bg-blue-600"
                            }`}
                          >
                            {alreadyRegistered
                              ? "✅ Đã đăng ký"
                              : processing
                              ? "..."
                              : "📝 Đăng ký"}
                          </button>
                        ))}
                      {tab === "registered" && !isSelectedForBatch && ( // Chỉ hiện nút Hủy đơn lẻ nếu item không được chọn cho batch
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUnregisterEvent(event);
                          }}
                          disabled={processing || !canAct}
                          className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                            processing || !canAct
                              ? "bg-red-300 cursor-wait"
                              : "bg-red-500 hover:bg-red-600"
                          }`}
                        >
                          {processing ? "..." : " Hủy đăng ký"}
                        </button>
                      )}
                      {tab === "registered" && isSelectedForBatch && processing && (
                        <div className="text-xs text-red-500 italic text-right mt-1 w-full">
                          Đang xử lý...
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : ( // Chế độ Card View (giữ nguyên logic cũ, chỉ cần đảm bảo className và props đúng)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedEvents.map((event) => {
              const isProcessingSingle = isSubmittingAction === event.id;
              const isSelectedForBatch = selectedEventIdsForBatchAction.has(event.id); // Giữ lại để biết style
              const processing = isProcessingSingle || (isBatchUnregistering && isSelectedForBatch);
              const alreadyRegistered = isRegistered(event.id);
              const isCreated = isCreatedByUser(event.id);
              const canAct = !!currentUserId && !isLoadingUserId;
              return (
                <div
                  key={event.id}
                  className={`border p-4 rounded-lg shadow-sm flex flex-col justify-between transition-colors duration-150 h-full 
                    ${processing ? "opacity-60 cursor-wait" : "hover:shadow-md"}
                    ${tab === "registered" && isSelectedForBatch ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}
                  `}
                >
                  {/* Event Image for Card View */}
                  <div 
                    className="w-full h-40 bg-gray-200 rounded-md mb-3 overflow-hidden cursor-pointer"
                    onClick={() => onViewEventDetails(event)}
                  >
                    {event.avatarUrl ? (
                      <img
                        src={event.avatarUrl}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <CalendarIcon className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-1 flex items-start">
                      {tab === "registered" && (
                        <input
                          type="checkbox"
                          checked={isSelectedForBatch}
                          onChange={(e) => {
                              e.stopPropagation();
                              onToggleBatchSelectEventId(event.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={processing}
                          aria-label={`Chọn hủy ${event.name}`}
                          tabIndex={-1}
                          className="mr-2 mt-1 h-4 w-4 align-middle text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer flex-shrink-0"
                        />
                      )}
                      <span className="line-clamp-2 flex-grow hover:underline cursor-pointer" onClick={() => onViewEventDetails(event)}>
                        {event.name}
                      </span>
                      {isCreated && tab === "available" && (
                        <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                          ✨ Của bạn
                        </span>
                      )}
                    </h3>
                    <div
                      className={`space-y-1 text-sm text-gray-600 mt-1 mb-3 ${
                        tab === "registered" ? "pl-6 sm:pl-6" : "pl-0" // Điều chỉnh padding cho checkbox
                      }`}
                    >
                      {event.time && (
                        <p className="flex items-center text-xs">
                          <CalendarIcon className="w-3 h-3 mr-1.5 opacity-70 flex-shrink-0" />
                          {new Date(event.time).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                      {event.location && (
                        <p className="flex items-center text-xs">
                          <span className="mr-1.5 opacity-70">📍</span>
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2">
                    {/* Nút Xem chi tiết đã bị loại bỏ, click vào ảnh hoặc tiêu đề để xem */}
                    {tab === "available" &&
                      (isCreated ? (
                        <button
                          className="w-full cursor-not-allowed px-3 py-1.5 rounded-md text-gray-600 bg-gray-300 text-xs font-medium"
                          disabled
                          onClick={(e) => e.stopPropagation()}
                        >
                          ✨ Sự kiện của bạn
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRegisterEvent(event);
                          }}
                          disabled={alreadyRegistered || processing || !canAct}
                          className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                            alreadyRegistered
                              ? "bg-gray-400 cursor-not-allowed"
                              : processing || !canAct
                              ? "bg-blue-300 cursor-wait"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {alreadyRegistered
                            ? "✅ Đã đăng ký"
                            : processing
                            ? "..."
                            : "📝 Đăng ký"}
                        </button>
                      ))}
                    {tab === "registered" && !isSelectedForBatch && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnregisterEvent(event);
                        }}
                        disabled={processing || !canAct}
                        className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                          processing || !canAct
                            ? "bg-red-300 cursor-wait"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {processing ? "..." : " Hủy đăng ký"}
                      </button>
                    )}
                     {tab === "registered" && isSelectedForBatch && processing && (
                        <div className="text-xs text-red-500 italic text-center mt-1">
                          Đang xử lý...
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
export default EventListManager;