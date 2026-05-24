"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/user";

type AuthGuardProps = {
  allowedRoles?: UserRole[];
  children: ReactNode;
};

export function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    if (!appUser) {
      router.replace("/profile-missing");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(appUser.role)) {
      router.replace(`/dashboard/${appUser.role}`);
    }
  }, [allowedRoles, appUser, firebaseUser, loading, router]);

  if (loading) {
    return <main className="centered-page">Loading...</main>;
  }

  if (!firebaseUser || !appUser) {
    return <main className="centered-page">Checking your access...</main>;
  }

  if (allowedRoles && !allowedRoles.includes(appUser.role)) {
    return <main className="centered-page">Redirecting...</main>;
  }

  return children;
}
