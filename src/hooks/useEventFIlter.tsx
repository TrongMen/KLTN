import { useState, useMemo, useCallback } from "react";

interface ApprovedEvent {
  id: string;
  name: string;
  time?: string;
  location?: string;
  status?: string;
  createdAt?: string;
  avatarUrl?: string | null;
  progressStatus?: "UPCOMING" | "ONGOING" | "ENDED" | string;
}

type EventStatus = "upcoming" | "ongoing" | "ended";

const getEventStatus = (eventDateStr?: string | null): EventStatus => {
  if (!eventDateStr) return "upcoming";
  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) return "upcoming";
    const eventDateStart = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate()
    );
    if (eventDateStart < todayStart) return "ended";
    else if (eventDateStart > todayStart) return "upcoming";
    else return "ongoing";
  } catch (e) {
    console.error("Error parsing event date for status:", e);
    return "upcoming";
  }
};

export const useEventFilters = (initialEvents: ApprovedEvent[]) => {
  const [eventSearchTerm, setEventSearchTerm] = useState("");
  const [eventSortOrder, setEventSortOrder] = useState<"az" | "za">("az");
  const [eventStatusFilterOption, setEventStatusFilterOption] = useState<
    "all" | "upcoming" | "ongoing" | "ended" | "dateRange"
  >("all");
  const [eventStartDateFilter, setEventStartDateFilter] = useState<string>("");
  const [eventEndDateFilter, setEventEndDateFilter] = useState<string>("");

  const handleEventStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newStartDate = e.target.value;
      setEventStartDateFilter(newStartDate);
      if (eventEndDateFilter && newStartDate > eventEndDateFilter) {
        setEventEndDateFilter("");
      }
    },
    [eventEndDateFilter]
  );

  const handleEventEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newEndDate = e.target.value;
      if (eventStartDateFilter && newEndDate < eventStartDateFilter) {
        // toast.error("Ngày kết thúc không thể trước ngày bắt đầu."); // Cân nhắc việc truyền toast vào hook hoặc xử lý ở component cha
        console.error("Ngày kết thúc không thể trước ngày bắt đầu.");
      } else {
        setEventEndDateFilter(newEndDate);
      }
    },
    [eventStartDateFilter]
  );

  const processedEvents = useMemo(() => {
    if (!Array.isArray(initialEvents)) return [];
    let eventsToProcess = [...initialEvents];

    if (
      eventStatusFilterOption !== "all" &&
      eventStatusFilterOption !== "dateRange"
    ) {
      eventsToProcess = eventsToProcess.filter(
        (event) => getEventStatus(event.time) === eventStatusFilterOption
      );
    } else if (
      eventStatusFilterOption === "dateRange" &&
      eventStartDateFilter &&
      eventEndDateFilter
    ) {
      try {
        const start = new Date(eventStartDateFilter);
        start.setHours(0, 0, 0, 0);
        const end = new Date(eventEndDateFilter);
        end.setHours(23, 59, 59, 999);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          eventsToProcess = eventsToProcess.filter((event) => {
            const dateStrToUse = event.time || event.createdAt;
            if (!dateStrToUse) return false;
            try {
              const eventDate = new Date(dateStrToUse);
              return (
                !isNaN(eventDate.getTime()) &&
                eventDate >= start &&
                eventDate <= end
              );
            } catch {
              return false;
            }
          });
        }
      } catch (e) {
        console.error("Error parsing date range for filtering:", e);
      }
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
    initialEvents,
    eventStatusFilterOption,
    eventStartDateFilter,
    eventEndDateFilter,
    eventSearchTerm,
    eventSortOrder,
  ]);

  return {
    eventSearchTerm,
    setEventSearchTerm,
    eventSortOrder,
    setEventSortOrder,
    eventStatusFilterOption,
    setEventStatusFilterOption,
    eventStartDateFilter,
    setEventStartDateFilter,
    eventEndDateFilter,
    setEventEndDateFilter,
    processedEvents,
    handleEventStartDateChange,
    handleEventEndDateChange,
  };
};