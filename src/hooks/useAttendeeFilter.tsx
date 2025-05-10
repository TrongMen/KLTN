import { useState, useMemo } from "react";

interface Attendee {
  id?: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  roleName?: string;
  positionName?: string;
  attending?: boolean;
  studentCode?: string;
  avatar?: string | null;
}

type Mode = "view" | "attendance" | "delete";

const getAttendeeName = (attendee: Attendee): string => {
  const fn = `${attendee.lastName || ""} ${attendee.firstName || ""}`.trim();
  return (
    fn ||
    attendee.username ||
    `ID: ${attendee.userId?.substring(0, 8) ?? "N/A"}`
  );
};

export const useAttendeeFilters = (
  initialAttendees: Attendee[],
  originalAttendance: Record<string, boolean>,
  attendanceChanges: Record<string, boolean>,
  mode: Mode
) => {
  const [attendeeSearchTerm, setAttendeeSearchTerm] = useState("");
  const [attendeeSortOrder, setAttendeeSortOrder] = useState<
    "az" | "za" | "status"
  >("az");

  const processedAttendees = useMemo(() => {
    if (!Array.isArray(initialAttendees)) return [];
    let attendeesToProcess = [...initialAttendees];

    if (attendeeSearchTerm.trim()) {
      const lowerSearchTerm = attendeeSearchTerm.trim().toLowerCase();
      attendeesToProcess = attendeesToProcess.filter(
        (att) =>
          getAttendeeName(att).toLowerCase().includes(lowerSearchTerm) ||
          (att.username &&
            att.username.toLowerCase().includes(lowerSearchTerm)) ||
          (att.studentCode &&
            att.studentCode.toLowerCase().includes(lowerSearchTerm))
      );
    }

    if (attendeeSortOrder === "az") {
      attendeesToProcess.sort((a, b) =>
        getAttendeeName(a).localeCompare(getAttendeeName(b), "vi", {
          sensitivity: "base",
        })
      );
    } else if (attendeeSortOrder === "za") {
      attendeesToProcess.sort((a, b) =>
        getAttendeeName(b).localeCompare(getAttendeeName(a), "vi", {
          sensitivity: "base",
        })
      );
    } else if (attendeeSortOrder === "status") {
      attendeesToProcess.sort((a, b) => {
        const changesToUse =
          mode === "attendance" ? attendanceChanges : originalAttendance;
        const statusA = changesToUse[a.userId] ?? false;
        const statusB = changesToUse[b.userId] ?? false;
        if (statusA !== statusB) {
          return statusA ? -1 : 1;
        }
        return getAttendeeName(a).localeCompare(getAttendeeName(b), "vi", {
          sensitivity: "base",
        });
      });
    }
    return attendeesToProcess;
  }, [
    initialAttendees,
    attendeeSearchTerm,
    attendeeSortOrder,
    originalAttendance,
    attendanceChanges,
    mode,
  ]);

  return {
    attendeeSearchTerm,
    setAttendeeSearchTerm,
    attendeeSortOrder,
    setAttendeeSortOrder,
    processedAttendees,
    getAttendeeName,
  };
};