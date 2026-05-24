import type { UserRole } from "@/types/user";

export function dashboardPathForRole(role: UserRole) {
  return `/dashboard/${role}`;
}
