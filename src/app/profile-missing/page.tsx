"use client";

import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";

export default function ProfileMissingPage() {
  const { logout } = useAuth();

  return (
    <>
      <TopNav />
      <main className="content-shell narrow">
        <h1>Account setup needed</h1>
        <p className="muted">
          Your login works, but there is no matching profile in Firestore yet. Ask an admin to add
          your user document in the users collection.
        </p>
        <button className="primary-button fit" onClick={logout} type="button">
          Log out
        </button>
      </main>
    </>
  );
}
