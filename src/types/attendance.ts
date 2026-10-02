export type AttendanceStatus = "present" | "absent" | "excused" | "late";

export type AttendanceItem = "present" | "churchEntry" | "mass" | "uniform" | "veymEvent";

export type AttendanceRecord = {
  attendanceId: string;
  studentId: string;
  studentName: string;
  date: string;
  status?: AttendanceStatus;
  attendanceItems: AttendanceItem[];
  attendancePoints: number;
  note: string;
  recordedBy: string;
  group: string;
  team: string;
  updatedAt?: string;
};
