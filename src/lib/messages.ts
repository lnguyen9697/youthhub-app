import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ParentMessage, ParentMessageStatus } from "@/types/message";
import type { AppUser } from "@/types/user";

type CreateMessageInput = {
  parent: AppUser;
  subject: string;
  message: string;
};

type ReplyInput = {
  messageId: string;
  reply: string;
  repliedBy: string;
  status: ParentMessageStatus;
};

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured yet.");
  }

  return db;
}

function messageFromDoc(id: string, data: Record<string, unknown>): ParentMessage {
  return {
    messageId: id,
    parentId: String(data.parentId ?? ""),
    parentName: String(data.parentName ?? ""),
    parentEmail: String(data.parentEmail ?? ""),
    subject: String(data.subject ?? ""),
    message: String(data.message ?? ""),
    status: String(data.status ?? "open") as ParentMessageStatus,
    reply: String(data.reply ?? ""),
    repliedBy: String(data.repliedBy ?? ""),
    createdAt: String(data.createdAtText ?? ""),
    updatedAt: String(data.updatedAtText ?? "")
  };
}

export async function createParentMessage(input: CreateMessageInput) {
  const firestore = requireDb();

  await addDoc(collection(firestore, "parentMessages"), {
    parentId: input.parent.uid,
    parentName: input.parent.fullName,
    parentEmail: input.parent.email,
    subject: input.subject,
    message: input.message,
    status: "open",
    reply: "",
    repliedBy: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdAtText: new Date().toISOString().slice(0, 10),
    updatedAtText: new Date().toISOString().slice(0, 10)
  });
}

export async function listMessagesForParent(parentId: string) {
  const firestore = requireDb();
  const snapshot = await getDocs(
    query(collection(firestore, "parentMessages"), where("parentId", "==", parentId))
  );

  return snapshot.docs
    .map((messageDoc) => messageFromDoc(messageDoc.id, messageDoc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllParentMessages() {
  const firestore = requireDb();
  const snapshot = await getDocs(collection(firestore, "parentMessages"));

  return snapshot.docs
    .map((messageDoc) => messageFromDoc(messageDoc.id, messageDoc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function replyToParentMessage(input: ReplyInput) {
  const firestore = requireDb();

  await updateDoc(doc(firestore, "parentMessages", input.messageId), {
    reply: input.reply,
    repliedBy: input.repliedBy,
    status: input.status,
    updatedAt: serverTimestamp(),
    updatedAtText: new Date().toISOString().slice(0, 10)
  });
}
