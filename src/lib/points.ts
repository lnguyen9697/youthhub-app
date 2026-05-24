import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CompetitionPointRecord } from "@/types/points";
import type { Student } from "@/types/student";

type AddPointInput = {
  student: Student;
  date: string;
  points: number;
  reason: string;
  addedBy: string;
};

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured yet.");
  }

  return db;
}

function pointFromDoc(id: string, data: Record<string, unknown>): CompetitionPointRecord {
  return {
    pointId: id,
    studentId: String(data.studentId ?? ""),
    studentName: String(data.studentName ?? ""),
    date: String(data.date ?? ""),
    points: Number(data.points ?? 0),
    reason: String(data.reason ?? ""),
    addedBy: String(data.addedBy ?? ""),
    group: String(data.group ?? ""),
    team: String(data.team ?? "")
  };
}

export async function addCompetitionPoint(input: AddPointInput) {
  const firestore = requireDb();

  await addDoc(collection(firestore, "competitionPoints"), {
    studentId: input.student.studentId,
    studentName: input.student.fullName,
    date: input.date,
    points: input.points,
    reason: input.reason,
    addedBy: input.addedBy,
    group: input.student.group,
    team: input.student.team,
    createdAt: serverTimestamp()
  });
}

export async function listCompetitionPoints(limitGroup?: string, limitTeam?: string) {
  const firestore = requireDb();
  const pointsRef = collection(firestore, "competitionPoints");

  if (limitGroup) {
    const snapshot = await getDocs(query(pointsRef, where("group", "==", limitGroup)));
    return snapshot.docs.map((pointDoc) => pointFromDoc(pointDoc.id, pointDoc.data()));
  }

  if (limitTeam) {
    const snapshot = await getDocs(query(pointsRef, where("team", "==", limitTeam)));
    return snapshot.docs.map((pointDoc) => pointFromDoc(pointDoc.id, pointDoc.data()));
  }

  const snapshot = await getDocs(pointsRef);
  return snapshot.docs.map((pointDoc) => pointFromDoc(pointDoc.id, pointDoc.data()));
}

export async function listCompetitionPointsForStudent(studentId: string) {
  const firestore = requireDb();
  const snapshot = await getDocs(
    query(collection(firestore, "competitionPoints"), where("studentId", "==", studentId))
  );

  return snapshot.docs
    .map((pointDoc) => pointFromDoc(pointDoc.id, pointDoc.data()))
    .sort((a, b) => b.date.localeCompare(a.date));
}
