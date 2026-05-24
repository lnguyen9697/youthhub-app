"use client";

import { BarChart3, CalendarCheck, Megaphone, Users } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardCard } from "@/components/DashboardCard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";

export default function LeaderDashboardPage() {
  const { appUser } = useAuth();
  const assignment = [appUser?.assignedGroup, appUser?.assignedTeam].filter(Boolean).join(" / ");

  return (
    <AuthGuard allowedRoles={["leader"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading">
          <p className="eyebrow">Youth leader dashboard</p>
          <h1>Today's group view</h1>
          <p className="muted">
            Assigned area: {assignment || "Not assigned yet"}. You will use this space to take
            attendance and update competition points.
          </p>
        </div>

        <div className="dashboard-grid">
          <DashboardCard title="Today's attendance" value="Not started">
            Attendance taking will be added in the next MVP step.
          </DashboardCard>
          <DashboardCard title="Assigned members" value="Coming soon">
            Only members in your group or team will be shown here.
          </DashboardCard>
          <DashboardCard title="Points this week" value="Coming soon">
            Quick point totals will appear after points are connected.
          </DashboardCard>
        </div>

        <nav className="quick-actions" aria-label="Leader tools">
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
        </nav>
      </main>
    </AuthGuard>
  );
}
