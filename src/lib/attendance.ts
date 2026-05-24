import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";
import type { Student } from "@/types/student";

type SaveAttendanceInput = {
  date: string;
  recordedBy: string;
  entries: Array<{
    student: Student;
    status: AttendanceStatus;
    note: string;
  }>;
};

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured yet.");
  }

  return db;
}

function attendanceFromDoc(id: string, data: Record<string, unknown>): AttendanceRecord {
  return {
    attendanceId: id,
    studentId: String(data.studentId ?? ""),
    studentName: String(data.studentName ?? ""),
    date: String(data.date ?? ""),
    status: String(data.status ?? "present") as AttendanceStatus,
    note: String(data.note ?? ""),
    recordedBy: String(data.recordedBy ?? ""),
    group: String(data.group ?? ""),
    team: String(data.team ?? "")
  };
}

function attendanceIdFor(date: string, studentId: string) {
  return `${date}_${studentId}`;
}

export async function saveAttendance(input: SaveAttendanceInput) {
  const firestore = requireDb();

  await Promise.all(
    input.entries.map(({ student, status, note }) =>
      setDoc(
        doc(firestore, "attendance", attendanceIdFor(input.date, student.studentId)),
        {
          studentId: student.studentId,
          studentName: student.fullName,
          date: input.date,
          status,
          note,
          recordedBy: input.recordedBy,
          group: student.group,
          team: student.team,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      )
    )
  );
}

export async function listAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
  const firestore = requireDb();
  const snapshot = await getDocs(query(collection(firestore, "attendance"), where("date", "==", date)));

  return snapshot.docs.map((attendanceDoc) =>
    attendanceFromDoc(attendanceDoc.id, attendanceDoc.data())
  );
}

export async function listRecentAttendance(limitGroup?: string, limitTeam?: string) {
  const firestore = requireDb();
  const attendanceRef = collection(firestore, "attendance");

  if (limitGroup) {
    const snapshot = await getDocs(query(attendanceRef, where("group", "==", limitGroup)));
    return snapshot.docs
      .map((attendanceDoc) => attendanceFromDoc(attendanceDoc.id, attendanceDoc.data()))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);
  }

  if (limitTeam) {
    const snapshot = await getDocs(query(attendanceRef, where("team", "==", limitTeam)));
    return snapshot.docs
      .map((attendanceDoc) => attendanceFromDoc(attendanceDoc.id, attendanceDoc.data()))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 12);
  }

  const snapshot = await getDocs(attendanceRef);
  return snapshot.docs
    .map((attendanceDoc) => attendanceFromDoc(attendanceDoc.id, attendanceDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
}

export async function listAttendanceForScope(limitGroup?: string, limitTeam?: string) {
  const firestore = requireDb();
  const attendanceRef = collection(firestore, "attendance");

  if (limitGroup) {
    const snapshot = await getDocs(query(attendanceRef, where("group", "==", limitGroup)));
    return snapshot.docs.map((attendanceDoc) =>
      attendanceFromDoc(attendanceDoc.id, attendanceDoc.data())
    );
  }

  if (limitTeam) {
    const snapshot = await getDocs(query(attendanceRef, where("team", "==", limitTeam)));
    return snapshot.docs.map((attendanceDoc) =>
      attendanceFromDoc(attendanceDoc.id, attendanceDoc.data())
    );
  }

  const snapshot = await getDocs(attendanceRef);
  return snapshot.docs.map((attendanceDoc) =>
    attendanceFromDoc(attendanceDoc.id, attendanceDoc.data())
  );
}

export async function listAttendanceForStudent(studentId: string) {
  const firestore = requireDb();
  const snapshot = await getDocs(
    query(collection(firestore, "attendance"), where("studentId", "==", studentId))
  );

  return snapshot.docs
    .map((attendanceDoc) => attendanceFromDoc(attendanceDoc.id, attendanceDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteAllAttendanceRecords() {
  const firestore = requireDb();
  const snapshot = await getDocs(collection(firestore, "attendance"));

  await Promise.all(snapshot.docs.map((attendanceDoc) => deleteDoc(attendanceDoc.ref)));
}
