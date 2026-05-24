export type AttendanceStatus = "present" | "absent" | "excused" | "late";

export type AttendanceRecord = {
  attendanceId: string;
  studentId: string;
  studentName: string;
  date: string;
  status: AttendanceStatus;
  note: string;
  recordedBy: string;
  group: string;
  team: string;
  updatedAt?: string;
};
