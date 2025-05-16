"use client";

import React, { useState, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import {
  CalendarIcon,
  Component1Icon,
  ListBulletIcon,
} from "@radix-ui/react-icons";
import { EventDisplayInfo } from "../../types/appTypes";

const getEventTemporalStatus = (eventTime?: string | null): "upcoming" | "ongoing" | "ended" | "unknown" => {
    if (!eventTime) return "unknown";
    try {
        const eventDate = new Date(eventTime);
        if (isNaN(eventDate.getTime())) return "unknown";

        const now = new Date();
        const todayDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

        if (eventDayStart > todayDayStart) return "upcoming";
        if (eventDayStart.getTime() === todayDayStart.getTime()) return "ongoing";
        if (eventDayStart < todayDayStart) return "ended";
        return "ongoing"; 
    } catch {
        return "unknown";
    }
};

type EventListManagerTemporalFilterOption = "all" | "upcoming" | "ongoing" | "ended" | "dateRange";

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
  const [eventTimeFilter, setEventTimeFilter] = useState<EventListManagerTemporalFilterOption>("all");
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
    let filteredEvents = [...allEvents];

    if (tab === "available") {
      filteredEvents = filteredEvents.filter(
        (event) => !isRegistered(event.id) && !isCreatedByUser(event.id)
      );
      filteredEvents = filteredEvents.filter(event => {
          const temporalStatus = getEventTemporalStatus(event.time);
          return temporalStatus === "upcoming" || temporalStatus === "ongoing";
      });
    } else { 
      filteredEvents = filteredEvents.filter((event) => isRegistered(event.id));
    }
    
    if (eventTimeFilter !== "all") {
        const now = new Date();
        const todayDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        filteredEvents = filteredEvents.filter((event) => {
            const dateStrToUse = event.time;
            if (!dateStrToUse && eventTimeFilter !== "dateRange") return false;

            if (eventTimeFilter === "dateRange") {
                if (!eventStartDateFilter || !eventEndDateFilter) return true;
                if (!dateStrToUse) return false;
                try {
                    const eventDate = new Date(dateStrToUse);
                    if (isNaN(eventDate.getTime())) return false;
                    const startFilter = new Date(eventStartDateFilter); startFilter.setHours(0,0,0,0);
                    const endFilter = new Date(eventEndDateFilter); endFilter.setHours(23,59,59,999);
                    return !isNaN(startFilter.getTime()) && !isNaN(endFilter.getTime()) && startFilter <= endFilter &&
                           eventDate >= startFilter && eventDate <= endFilter;
                } catch { return false; }
            } else {
                if (!dateStrToUse) return false;
                try {
                    const eventDate = new Date(dateStrToUse);
                    if (isNaN(eventDate.getTime())) return false;
                    const eventDayStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

                    switch (eventTimeFilter) {
                        case "upcoming":
                            return eventDayStart > todayDayStart;
                        case "ongoing":
                            return eventDayStart.getTime() === todayDayStart.getTime();
                        case "ended":
                            return eventDayStart < todayDayStart;
                        default:
                            return true;
                    }
                } catch { return false; }
            }
        });
    }
    
    if (eventSearchTerm.trim()) {
      const lowerSearchTerm = eventSearchTerm.trim().toLowerCase();
      filteredEvents = filteredEvents.filter(
        (event) =>
          event.name.toLowerCase().includes(lowerSearchTerm) ||
          (event.location &&
            event.location.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (eventSortOrder === "za") {
      filteredEvents.sort((a, b) =>
        b.name.localeCompare(a.name, "vi", { sensitivity: "base" })
      );
    } else {
      filteredEvents.sort((a, b) =>
        a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
      );
    }
    return filteredEvents;
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
      return new Set(
        processedEvents
        .filter(event => getEventTemporalStatus(event.time) !== "ended")
        .map(e => e.id)
      );
    }
    return new Set<string>();
  }, [processedEvents, tab]);

  const noResultMessage =
    eventSearchTerm ||
    (eventTimeFilter !== "all" && !(eventTimeFilter === "dateRange" && !eventStartDateFilter && !eventEndDateFilter))
      ? `Không tìm thấy sự kiện nào khớp.`
      : tab === "available"
      ? "Không có sự kiện mới nào (sắp hoặc đang diễn ra) để đăng ký."
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
              Lọc theo trạng thái
            </label>
            <select
              id="timeFilterRegEventsManager"
              value={eventTimeFilter}
              onChange={(e) =>
                setEventTimeFilter(
                  e.target.value as EventListManagerTemporalFilterOption
                )
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:border-green-500 h-[42px] shadow-sm bg-white appearance-none pr-8"
            >
              <option value="all">Tất cả</option>
              <option value="upcoming">Sắp diễn ra</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="ended">Đã diễn ra</option>
              <option value="dateRange">Khoảng ngày cụ thể</option>
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
                disabled={allVisibleRegisteredEventIds.size === 0 || isBatchUnregistering}
                aria-label="Chọn tất cả sự kiện (chưa kết thúc) để hủy"
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
              const temporalStatus = getEventTemporalStatus(event.time);
              const isEventEnded = temporalStatus === "ended";

              return (
                <li
                  key={event.id}
                  className={`border rounded-lg shadow-sm transition-all duration-150 flex gap-4 items-start p-3 md:p-4
                    ${processing ? "opacity-60 cursor-wait" : "hover:shadow-md"}
                    ${tab === "registered" && isSelectedForBatch ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}
                    ${!(tab === "registered" && isSelectedForBatch) && !(isCreated && tab === "available") && !processing ? "cursor-pointer hover:bg-gray-50" : "cursor-default"}
                  `}
                  onClick={() => {
                    if (!processing && !(tab === "registered" && isSelectedForBatch) && !(isCreated && tab === "available")) {
                        onViewEventDetails(event);
                    } else if (tab === "registered" && !processing && !isEventEnded){
                        onToggleBatchSelectEventId(event.id);
                    } else if (tab === "registered" && isEventEnded && !processing) {
                        toast.error("Không thể chọn sự kiện đã kết thúc để hủy.");
                    }
                  }}
                >
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
                  <div className="flex-grow flex flex-col justify-between min-w-0">
                    <div>
                      <h3 className="text-md md:text-lg font-semibold text-gray-800 mb-1 flex items-center">
                        {tab === "registered" && (
                          <input
                            type="checkbox"
                            checked={isSelectedForBatch}
                            onChange={(e) => {
                                e.stopPropagation(); 
                                if (!isEventEnded) onToggleBatchSelectEventId(event.id);
                            }}
                            onClick={(e) => e.stopPropagation()} 
                            disabled={processing || isEventEnded}
                            title={isEventEnded ? "Không thể chọn sự kiện đã kết thúc" : `Chọn hủy ${event.name}`}
                            aria-label={`Chọn hủy ${event.name}`}
                            className="mr-2 h-4 w-4 align-middle text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        )}
                        <span className="hover:underline" onClick={(e) => { e.stopPropagation(); onViewEventDetails(event); }}>{event.name}</span>
                        {isCreated && tab === "available" && (
                          <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                            ✨ Của bạn
                          </span>
                        )}
                        {isEventEnded && (
                            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                🏁 Đã kết thúc
                            </span>
                        )}
                      </h3>
                      <div className=" sm:flex-row sm:gap-4 text-sm text-gray-600">
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
                            <span className="mr-1.4 opacity-70">📍</span>
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto self-start sm:self-end pt-3 mt-2">
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
                            disabled={alreadyRegistered || processing || !canAct || isEventEnded}
                            title={isEventEnded ? "Sự kiện đã kết thúc, không thể đăng ký" : (alreadyRegistered ? "Đã đăng ký" : "Đăng ký")}
                            className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                              alreadyRegistered || isEventEnded
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
                              : isEventEnded ? "🏁 Đã kết thúc" : "📝 Đăng ký"}
                          </button>
                        ))}
                      {tab === "registered" && !isSelectedForBatch && ( 
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if(!isEventEnded) onUnregisterEvent(event);
                            else toast.error("Không thể hủy đăng ký sự kiện đã kết thúc.");
                          }}
                          disabled={processing || !canAct || isEventEnded}
                          title={isEventEnded ? "Không thể hủy sự kiện đã kết thúc" : "Hủy đăng ký"}
                          className={`w-full cursor-pointer sm:w-auto px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                            processing || !canAct || isEventEnded
                              ? "bg-red-300 cursor-not-allowed"
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
        ) : ( 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedEvents.map((event) => {
              const isProcessingSingle = isSubmittingAction === event.id;
              const isSelectedForBatch = selectedEventIdsForBatchAction.has(event.id); 
              const processing = isProcessingSingle || (isBatchUnregistering && isSelectedForBatch);
              const alreadyRegistered = isRegistered(event.id);
              const isCreated = isCreatedByUser(event.id);
              const canAct = !!currentUserId && !isLoadingUserId;
              const temporalStatus = getEventTemporalStatus(event.time);
              const isEventEnded = temporalStatus === "ended";
              return (
                <div
                  key={event.id}
                  className={`border p-4 rounded-lg shadow-sm flex flex-col justify-between transition-colors duration-150 h-full 
                    ${processing ? "opacity-60 cursor-wait" : "hover:shadow-md"}
                    ${tab === "registered" && isSelectedForBatch ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}
                  `}
                >
                  <div 
                    className={`${!(tab === "registered" && isSelectedForBatch) && !(isCreated && tab === "available") && !processing ? "cursor-pointer" : "cursor-default"}`}
                    onClick={() => {
                        if (!processing && !(tab === "registered" && isSelectedForBatch) && !(isCreated && tab === "available")) {
                            onViewEventDetails(event);
                        } else if (tab === "registered" && !processing && !isEventEnded){
                             onToggleBatchSelectEventId(event.id);
                        } else if (tab === "registered" && isEventEnded && !processing) {
                            toast.error("Không thể chọn sự kiện đã kết thúc để hủy.");
                        }
                    }}
                  >
                    <div className="w-full h-40 bg-gray-200 rounded-md mb-3 overflow-hidden">
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
                                if (!isEventEnded) onToggleBatchSelectEventId(event.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={processing || isEventEnded}
                            title={isEventEnded ? "Không thể chọn sự kiện đã kết thúc" : `Chọn hủy ${event.name}`}
                            aria-label={`Chọn hủy ${event.name}`}
                            tabIndex={-1}
                            className="mr-2 mt-1 h-4 w-4 align-middle text-red-600 border-gray-300 rounded focus:ring-red-500 cursor-pointer flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        )}
                        <span className="line-clamp-2 flex-grow hover:underline cursor-pointer" onClick={(e)=>{e.stopPropagation(); onViewEventDetails(event);}}>{event.name}</span>
                        {isCreated && tab === "available" && (
                          <span className="ml-2 text-xs font-normal text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                            ✨ Của bạn
                          </span>
                        )}
                         {isEventEnded && (
                            <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                                🏁 Đã kết thúc
                            </span>
                        )}
                      </h3>
                      <div
                        className={`space-y-1 text-sm text-gray-600 mt-1 mb-3 ${
                          tab === "registered" ? "pl-6 sm:pl-6" : "pl-0"
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
                  </div>
                  <div className="mt-auto pt-3 border-t border-gray-100 flex flex-col gap-2">
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
                          disabled={alreadyRegistered || processing || !canAct || isEventEnded}
                          title={isEventEnded ? "Sự kiện đã kết thúc, không thể đăng ký" : (alreadyRegistered ? "Đã đăng ký" : "Đăng ký")}
                          className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                            alreadyRegistered || isEventEnded
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
                            : isEventEnded ? "🏁 Đã kết thúc" : "📝 Đăng ký"}
                        </button>
                      ))}
                    {tab === "registered" && !isSelectedForBatch && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if(!isEventEnded) onUnregisterEvent(event);
                          else toast.error("Không thể hủy đăng ký sự kiện đã kết thúc.");
                        }}
                        disabled={processing || !canAct || isEventEnded}
                        title={isEventEnded ? "Không thể hủy sự kiện đã kết thúc" : "Hủy đăng ký"}
                        className={`w-full cursor-pointer px-3 py-1.5 rounded-md text-white shadow-sm transition text-xs font-medium ${
                          processing || !canAct || isEventEnded
                            ? "bg-red-300 cursor-not-allowed"
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