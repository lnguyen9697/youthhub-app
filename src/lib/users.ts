import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/types/user";

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  if (!db) {
    throw new Error("Firebase is not configured yet. Add your Firebase values to .env.local.");
  }

  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return userSnap.data() as AppUser;
}

export async function createParentProfile(uid: string, fullName: string, email: string) {
  if (!db) {
    throw new Error("Firebase is not configured yet. Add your Firebase values to .env.local.");
  }

  await setDoc(doc(db, "users", uid), {
    uid,
    fullName,
    email,
    role: "parent",
    linkedStudentIds: [],
    assignedGroup: "",
    assignedTeam: "",
    createdAt: serverTimestamp()
  });
}

export async function listParentUsers(): Promise<AppUser[]> {
  if (!db) {
    throw new Error("Firebase is not configured yet. Add your Firebase values to .env.local.");
  }

  const snapshot = await getDocs(query(collection(db, "users"), where("role", "==", "parent")));

  return snapshot.docs
    .map((userDoc) => userDoc.data() as AppUser)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function deleteParentProfile(uid: string) {
  if (!db) {
    throw new Error("Firebase is not configured yet. Add your Firebase values to .env.local.");
  }

  await deleteDoc(doc(db, "users", uid));
}
