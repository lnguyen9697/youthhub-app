"use client";

import { BarChart3, CalendarCheck, Megaphone, MessageSquare, UserRoundCog, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardCard } from "@/components/DashboardCard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";
import { getAdminDashboardStats, type AdminDashboardStats } from "@/lib/dashboard";

export default function AdminDashboardPage() {
  const { appUser } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      setError("");

      try {
        setStats(await getAdminDashboardStats());
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not load dashboard stats.");
      }
    }

    if (appUser?.role === "admin") {
      void loadStats();
    }
  }, [appUser]);

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading">
          <p className="eyebrow">Admin dashboard</p>
          <h1>Đoàn Gioan Phaolo II</h1>
          <p className="muted">
            Welcome, {appUser?.fullName}. This area will manage members, leaders, parents,
            attendance, points, and announcements.
          </p>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        <div className="dashboard-grid">
          <DashboardCard title="Active members" value={stats ? String(stats.activeMembers) : "Loading"}>
            Youth member profiles currently active.
          </DashboardCard>
          <DashboardCard
            title="Attendance records"
            value={stats ? String(stats.attendanceRecords) : "Loading"}
          >
            Saved attendance entries across all dates.
          </DashboardCard>
          <DashboardCard
            title="Manual point total"
            value={stats ? String(stats.manualPointTotal) : "Loading"}
          >
            From {stats ? stats.manualPointRecords : 0} manual point record(s).
          </DashboardCard>
          <DashboardCard title="Parent accounts" value={stats ? String(stats.parentAccounts) : "Loading"}>
            Parents who have signed up.
          </DashboardCard>
          <DashboardCard title="Open messages" value={stats ? String(stats.openMessages) : "Loading"}>
            Parent messages waiting for admin review.
          </DashboardCard>
          <DashboardCard title="Announcements" value={stats ? String(stats.announcements) : "Loading"}>
            Published updates for parents and leaders.
          </DashboardCard>
        </div>

        <nav className="quick-actions" aria-label="Admin tools">
          <a href="/members">
            <Users size={20} />
            Members
          </a>
          <a href="/attendance">
            <CalendarCheck size={20} />
            Attendance
          </a>
          <a href="/points">
            <BarChart3 size={20} />
            Points
          </a>
          <a href="/announcements">
            <Megaphone size={20} />
            Announcements
          </a>
          <a href="/messages">
            <MessageSquare size={20} />
            Messages
          </a>
          <a href="/parents">
            <UserRoundCog size={20} />
            Parents
          </a>
        </nav>
      </main>
    </AuthGuard>
  );
}
