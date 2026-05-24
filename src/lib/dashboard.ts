import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AdminDashboardStats = {
  activeMembers: number;
  attendanceRecords: number;
  manualPointRecords: number;
  manualPointTotal: number;
  parentAccounts: number;
  openMessages: number;
  announcements: number;
};

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured yet.");
  }

  return db;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const firestore = requireDb();
  const [
    studentsSnapshot,
    attendanceSnapshot,
    pointSnapshot,
    parentSnapshot,
    messageSnapshot,
    announcementSnapshot
  ] = await Promise.all([
    getDocs(collection(firestore, "students")),
    getDocs(collection(firestore, "attendance")),
    getDocs(collection(firestore, "competitionPoints")),
    getDocs(query(collection(firestore, "users"), where("role", "==", "parent"))),
    getDocs(query(collection(firestore, "parentMessages"), where("status", "==", "open"))),
    getDocs(collection(firestore, "announcements"))
  ]);

  return {
    activeMembers: studentsSnapshot.docs.filter((studentDoc) => studentDoc.data().active !== false).length,
    attendanceRecords: attendanceSnapshot.size,
    manualPointRecords: pointSnapshot.size,
    manualPointTotal: pointSnapshot.docs.reduce(
      (total, pointDoc) => total + Number(pointDoc.data().points ?? 0),
      0
    ),
    parentAccounts: parentSnapshot.size,
    openMessages: messageSnapshot.size,
    announcements: announcementSnapshot.size
  };
}
