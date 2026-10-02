import type { AttendanceItem, AttendanceRecord } from "@/types/attendance";

export const attendanceItemOptions: Array<{ label: string; value: AttendanceItem }> = [
  { label: "Present", value: "present" },
  { label: "Church Entry", value: "churchEntry" },
  { label: "Mass", value: "mass" },
  { label: "Uniform", value: "uniform" },
  { label: "VEYM Event", value: "veymEvent" }
];

export const attendanceItemLabels: Record<AttendanceItem, string> = {
  present: "Present",
  churchEntry: "Church Entry",
  mass: "Mass",
  uniform: "Uniform",
  veymEvent: "VEYM Event"
};

export function getAttendancePoints(record: AttendanceRecord) {
  if (typeof record.attendancePoints === "number") {
    return record.attendancePoints;
  }

  return record.attendanceItems.length;
}

export function formatAttendanceItems(items: AttendanceItem[]) {
  if (items.length === 0) {
    return "None";
  }

  return items.map((item) => attendanceItemLabels[item]).join(", ");
}
