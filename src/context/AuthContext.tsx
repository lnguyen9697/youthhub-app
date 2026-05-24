"use client";

import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { auth } from "@/lib/firebase";
import { dashboardPathForRole } from "@/lib/routes";
import { createParentProfile, getUserProfile } from "@/lib/users";
import type { AppUser } from "@/types/user";

type ParentSignUpInput = {
  fullName: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUpParent: (input: ParentSignUpInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(user: User | null) {
    if (!user) {
      setAppUser(null);
      return;
    }

    const profile = await getUserProfile(user.uid);
    setAppUser(profile);
  }

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      await loadProfile(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    if (!auth) {
      throw new Error("Firebase is not configured yet. Add your Firebase values to .env.local.");
    }

    const result = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(result.user.uid);

    setFirebaseUser(result.user);
    setAppUser(profile);

    if (profile) {
      router.push(dashboardPathForRole(profile.role));
    } else {
      router.push("/profile-missing");
    }
  }

  async function signUpParent(input: ParentSignUpInput) {
    if (!auth) {
      throw new Error("Firebase is not configured yet. Add your Firebase values to .env.local.");
    }

    const result = await createUserWithEmailAndPassword(auth, input.email, input.password);
    await createParentProfile(result.user.uid, input.fullName, input.email);

    const profile = await getUserProfile(result.user.uid);
    setFirebaseUser(result.user);
    setAppUser(profile);
    router.push("/dashboard/parent");
  }

  async function logout() {
    if (!auth) {
      router.push("/login");
      return;
    }

    await signOut(auth);
    setFirebaseUser(null);
    setAppUser(null);
    router.push("/login");
  }

  async function refreshProfile() {
    await loadProfile(firebaseUser);
  }

  const value = useMemo(
    () => ({
      firebaseUser,
      appUser,
      loading,
      login,
      signUpParent,
      logout,
      refreshProfile
    }),
    [firebaseUser, appUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
