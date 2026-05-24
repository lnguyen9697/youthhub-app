import { addDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Announcement } from "@/types/announcement";

type CreateAnnouncementInput = {
  title: string;
  message: string;
  targetGroup: string;
  targetTeam: string;
  createdBy: string;
};

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured yet.");
  }

  return db;
}

function announcementFromDoc(id: string, data: Record<string, unknown>): Announcement {
  return {
    announcementId: id,
    title: String(data.title ?? ""),
    message: String(data.message ?? ""),
    targetGroup: String(data.targetGroup ?? ""),
    targetTeam: String(data.targetTeam ?? ""),
    createdBy: String(data.createdBy ?? ""),
    createdAt: String(data.createdAtText ?? "")
  };
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const firestore = requireDb();

  await addDoc(collection(firestore, "announcements"), {
    ...input,
    createdAt: serverTimestamp(),
    createdAtText: new Date().toISOString().slice(0, 10)
  });
}

export async function listAnnouncements() {
  const firestore = requireDb();
  const snapshot = await getDocs(collection(firestore, "announcements"));

  return snapshot.docs
    .map((announcementDoc) =>
      announcementFromDoc(announcementDoc.id, announcementDoc.data())
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function announcementMatchesGroupOrTeam(
  announcement: Announcement,
  group: string,
  team: string
) {
  const matchesGroup = !announcement.targetGroup || announcement.targetGroup === group;
  const matchesTeam = !announcement.targetTeam || announcement.targetTeam === team;

  return matchesGroup && matchesTeam;
}
