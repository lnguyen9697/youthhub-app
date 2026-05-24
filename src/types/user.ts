export type UserRole = "admin" | "leader" | "parent";

export type AppUser = {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  linkedStudentIds: string[];
  assignedGroup?: string;
  assignedTeam?: string;
};
