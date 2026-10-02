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
import type { AttendanceItem, AttendanceRecord } from "@/types/attendance";
import type { Student } from "@/types/student";

type SaveAttendanceInput = {
  date: string;
  recordedBy: string;
  entries: Array<{
    student: Student;
    attendanceItems: AttendanceItem[];
    note: string;
  }>;
};

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured yet.");
  }

  return db;
}

function attendanceItemsFromData(data: Record<string, unknown>): AttendanceItem[] {
  const savedItems = data.attendanceItems;

  if (Array.isArray(savedItems)) {
    return savedItems.map(String) as AttendanceItem[];
  }

  // Older attendance records used one status field. Keep those records readable.
  return data.status === "present" ? ["present"] : [];
}

function attendanceFromDoc(id: string, data: Record<string, unknown>): AttendanceRecord {
  const attendanceItems = attendanceItemsFromData(data);

  return {
    attendanceId: id,
    studentId: String(data.studentId ?? ""),
    studentName: String(data.studentName ?? ""),
    date: String(data.date ?? ""),
    status: data.status ? String(data.status) as AttendanceRecord["status"] : undefined,
    attendanceItems,
    attendancePoints: Number(data.attendancePoints ?? attendanceItems.length),
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
    input.entries.map(({ student, attendanceItems, note }) =>
      setDoc(
        doc(firestore, "attendance", attendanceIdFor(input.date, student.studentId)),
        {
          studentId: student.studentId,
          studentName: student.fullName,
          date: input.date,
          attendanceItems,
          attendancePoints: attendanceItems.length,
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
