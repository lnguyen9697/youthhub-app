"use client";

import { LogOut, UsersRound } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export function TopNav() {
  const { appUser, logout } = useAuth();

  return (
    <header className="top-nav">
      <Link className="brand" href={appUser ? `/dashboard/${appUser.role}` : "/"}>
        <UsersRound aria-hidden="true" size={24} />
        <span>YouthHub</span>
      </Link>

      {appUser ? (
        <div className="nav-user">
          <span>{appUser.fullName}</span>
          <button className="icon-button" onClick={logout} title="Log out" type="button">
            <LogOut aria-hidden="true" size={20} />
          </button>
        </div>
      ) : null}
    </header>
  );
}
