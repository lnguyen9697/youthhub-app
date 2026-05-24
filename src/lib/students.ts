import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AppUser } from "@/types/user";
import type { Student } from "@/types/student";

type StudentFormData = Omit<Student, "studentId" | "parentIds" | "active">;

function requireDb() {
  if (!db) {
    throw new Error("Firebase is not configured yet.");
  }

  return db;
}

function studentFromDoc(id: string, data: Record<string, unknown>): Student {
  return {
    studentId: id,
    fullName: String(data.fullName ?? ""),
    dateOfBirth: String(data.dateOfBirth ?? ""),
    group: String(data.group ?? ""),
    team: String(data.team ?? ""),
    parentIds: Array.isArray(data.parentIds) ? (data.parentIds as string[]) : [],
    parentName: String(data.parentName ?? ""),
    parentEmail: String(data.parentEmail ?? ""),
    parentPhone: String(data.parentPhone ?? ""),
    notes: String(data.notes ?? ""),
    active: Boolean(data.active ?? true)
  };
}

export async function listStudentsForUser(user: AppUser): Promise<Student[]> {
  const firestore = requireDb();
  const studentsRef = collection(firestore, "students");

  if (user.role === "admin") {
    const snapshot = await getDocs(studentsRef);
    return snapshot.docs.map((studentDoc) => studentFromDoc(studentDoc.id, studentDoc.data()));
  }

  if (user.role === "leader") {
    const matches = new Map<string, Student>();

    // Leaders can have a group, a team, or both. Run narrow queries so Firestore rules can approve them.
    if (user.assignedGroup) {
      const groupSnapshot = await getDocs(query(studentsRef, where("group", "==", user.assignedGroup)));
      groupSnapshot.docs.forEach((studentDoc) => {
        matches.set(studentDoc.id, studentFromDoc(studentDoc.id, studentDoc.data()));
      });
    }

    if (user.assignedTeam) {
      const teamSnapshot = await getDocs(query(studentsRef, where("team", "==", user.assignedTeam)));
      teamSnapshot.docs.forEach((studentDoc) => {
        matches.set(studentDoc.id, studentFromDoc(studentDoc.id, studentDoc.data()));
      });
    }

    return Array.from(matches.values());
  }

  return [];
}

export async function listStudentsByIds(studentIds: string[]): Promise<Student[]> {
  const firestore = requireDb();

  const students = await Promise.all(
    studentIds.map(async (studentId) => {
      const studentSnap = await getDoc(doc(firestore, "students", studentId));

      if (!studentSnap.exists()) {
        return null;
      }

      return studentFromDoc(studentSnap.id, studentSnap.data());
    })
  );

  return students.filter((student): student is Student => Boolean(student));
}

export async function listStudentsForParent(user: AppUser): Promise<Student[]> {
  const firestore = requireDb();
  const studentsRef = collection(firestore, "students");
  const matches = new Map<string, Student>();

  if (user.email) {
    const emailSnapshot = await getDocs(query(studentsRef, where("parentEmail", "==", user.email)));
    emailSnapshot.docs.forEach((studentDoc) => {
      matches.set(studentDoc.id, studentFromDoc(studentDoc.id, studentDoc.data()));
    });
  }

  const linkedStudents = await listStudentsByIds(user.linkedStudentIds);
  linkedStudents.forEach((student) => {
    matches.set(student.studentId, student);
  });

  return Array.from(matches.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function createStudent(data: StudentFormData) {
  const firestore = requireDb();

  const newStudent = {
    ...data,
    parentIds: [],
    active: true
  };

  await addDoc(collection(firestore, "students"), newStudent);
}

export async function updateStudent(studentId: string, data: StudentFormData) {
  const firestore = requireDb();

  await setDoc(
    doc(firestore, "students", studentId),
    {
      ...data,
      parentIds: [],
      active: true
    },
    { merge: true }
  );
}

export async function deleteStudent(studentId: string) {
  const firestore = requireDb();
  const [attendanceSnapshot, pointsSnapshot] = await Promise.all([
    getDocs(query(collection(firestore, "attendance"), where("studentId", "==", studentId))),
    getDocs(query(collection(firestore, "competitionPoints"), where("studentId", "==", studentId)))
  ]);

  await Promise.all([
    ...attendanceSnapshot.docs.map((attendanceDoc) => deleteDoc(attendanceDoc.ref)),
    ...pointsSnapshot.docs.map((pointDoc) => deleteDoc(pointDoc.ref)),
    deleteDoc(doc(firestore, "students", studentId))
  ]);
}
