"use client";

import { Bell, CalendarCheck, MessageSquare, Trophy, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { DashboardCard } from "@/components/DashboardCard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";
import { announcementMatchesGroupOrTeam, listAnnouncements } from "@/lib/announcements";
import { listAttendanceForStudent } from "@/lib/attendance";
import { listCompetitionPointsForStudent } from "@/lib/points";
import { listStudentsForParent } from "@/lib/students";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";
import type { Student } from "@/types/student";

const attendancePointValues: Record<AttendanceStatus, number> = {
  present: 3,
  late: 2,
  excused: 1,
  absent: 0
};

type ParentDashboardSummary = {
  children: Student[];
  latestAttendance: AttendanceRecord | null;
  totalPoints: number;
  announcementCount: number;
};

export default function ParentDashboardPage() {
  const { appUser } = useAuth();
  const [summary, setSummary] = useState<ParentDashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      if (!appUser) {
        return;
      }

      setError("");

      try {
        const children = await listStudentsForParent(appUser);
        const [announcements, childRecords] = await Promise.all([
          listAnnouncements(),
          Promise.all(
            children.map(async (child) => {
              const [attendance, manualPoints] = await Promise.all([
                listAttendanceForStudent(child.studentId),
                listCompetitionPointsForStudent(child.studentId)
              ]);

              return { child, attendance, manualPoints };
            })
          )
        ]);
        const allAttendance = childRecords.flatMap((record) => record.attendance);
        const attendanceTotal = allAttendance.reduce(
          (total, record) => total + attendancePointValues[record.status],
          0
        );
        const manualTotal = childRecords
          .flatMap((record) => record.manualPoints)
          .reduce((total, record) => total + record.points, 0);
        const announcementCount = announcements.filter((announcement) =>
          children.some((child) =>
            announcementMatchesGroupOrTeam(announcement, child.group, child.team)
          )
        ).length;

        setSummary({
          children,
          latestAttendance:
            allAttendance.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null,
          totalPoints: attendanceTotal + manualTotal,
          announcementCount
        });
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Could not load dashboard.");
        setSummary({
          children: [],
          latestAttendance: null,
          totalPoints: 0,
          announcementCount: 0
        });
      }
    }

    if (appUser?.role === "parent") {
      void loadSummary();
    }
  }, [appUser]);

  return (
    <AuthGuard allowedRoles={["parent"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading">
          <p className="eyebrow">Parent portal</p>
          <h1>Welcome to Đoàn Gioan Phaolo II, {appUser?.fullName ?? "Parent"}</h1>
          <p className="muted">
            You are connected to {summary?.children.length ?? "..."} child
            {summary?.children.length === 1 ? "" : "ren"} by matching the parent email on each
            member profile.
          </p>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        <div className="dashboard-grid">
          <DashboardCard
            title="Latest attendance"
            value={summary?.latestAttendance?.status ?? "None yet"}
          >
            {summary?.latestAttendance
              ? `${summary.latestAttendance.studentName} on ${summary.latestAttendance.date}`
              : "No attendance has been recorded yet."}
          </DashboardCard>
          <DashboardCard title="Total points" value={summary ? String(summary.totalPoints) : "Loading"}>
            Combined attendance and manual competition points.
          </DashboardCard>
          <DashboardCard
            title="Announcements"
            value={summary ? String(summary.announcementCount) : "Loading"}
          >
            Updates matching your child's ngành or team.
          </DashboardCard>
        </div>

        <nav className="quick-actions" aria-label="Parent tools">
          <a href="/parent-portal">
            <UserRound size={20} />
            Child Info
          </a>
          <a href="/parent-portal">
            <CalendarCheck size={20} />
            Attendance
          </a>
          <a href="/parent-portal">
            <Trophy size={20} />
            Points
          </a>
          <a href="/announcements">
            <Bell size={20} />
            Announcements
          </a>
          <a href="/messages">
            <MessageSquare size={20} />
            Message Admin
          </a>
        </nav>
      </main>
    </AuthGuard>
  );
}
