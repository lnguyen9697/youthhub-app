"use client";

import { Plus, RefreshCw, Trophy } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";
import { listAttendanceForScope } from "@/lib/attendance";
import { sortNganh } from "@/lib/nganh";
import { addCompetitionPoint, listCompetitionPoints } from "@/lib/points";
import { listStudentsForUser } from "@/lib/students";
import type { AttendanceStatus } from "@/types/attendance";
import type { CompetitionPointRecord } from "@/types/points";
import type { Student } from "@/types/student";

const attendancePointValues: Record<AttendanceStatus, number> = {
  present: 3,
  late: 2,
  excused: 1,
  absent: 0
};

type RankingRow = {
  student: Student;
  attendancePoints: number;
  manualPoints: number;
  totalPoints: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function PointsPage() {
  const { appUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [manualRecords, setManualRecords] = useState<CompetitionPointRecord[]>([]);
  const [attendanceTotals, setAttendanceTotals] = useState<Record<string, number>>({});
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [date, setDate] = useState(today());
  const [points, setPoints] = useState("1");
  const [reason, setReason] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const groups = useMemo(
    () => sortNganh(Array.from(new Set(students.map((student) => student.group).filter(Boolean)))),
    [students]
  );

  const teams = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .filter((student) => !selectedGroup || student.group === selectedGroup)
            .map((student) => student.team)
            .filter(Boolean)
        )
      ).sort(),
    [selectedGroup, students]
  );

  const filteredStudents = useMemo(
    () =>
      students
        .filter((student) => !selectedGroup || student.group === selectedGroup)
        .filter((student) => !selectedTeam || student.team === selectedTeam),
    [selectedGroup, selectedTeam, students]
  );

  const rankingRows = useMemo<RankingRow[]>(() => {
    return filteredStudents
      .map((student) => {
        const manualPoints = manualRecords
          .filter((record) => record.studentId === student.studentId)
          .reduce((total, record) => total + record.points, 0);
        const attendancePoints = attendanceTotals[student.studentId] ?? 0;

        return {
          student,
          attendancePoints,
          manualPoints,
          totalPoints: attendancePoints + manualPoints
        };
      })
      .sort((a, b) => b.totalPoints - a.totalPoints || a.student.fullName.localeCompare(b.student.fullName));
  }, [attendanceTotals, filteredStudents, manualRecords]);

  const teamRankings = useMemo(() => {
    const totals = new Map<string, number>();

    rankingRows.forEach((row) => {
      const teamName = row.student.team || "No team";
      totals.set(teamName, (totals.get(teamName) ?? 0) + row.totalPoints);
    });

    return Array.from(totals.entries())
      .map(([team, totalPoints]) => ({ team, totalPoints }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.team.localeCompare(b.team));
  }, [rankingRows]);

  const recentManualRecords = useMemo(
    () => [...manualRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12),
    [manualRecords]
  );

  async function loadPointData() {
    if (!appUser) {
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const leaderGroup = appUser.role === "leader" ? appUser.assignedGroup : undefined;
      const leaderTeam = appUser.role === "leader" && !leaderGroup ? appUser.assignedTeam : undefined;
      const [nextStudents, attendanceRecords, nextManualRecords] = await Promise.all([
        listStudentsForUser(appUser),
        listAttendanceForScope(leaderGroup, leaderTeam),
        listCompetitionPoints(leaderGroup, leaderTeam)
      ]);
      const nextAttendanceTotals: Record<string, number> = {};

      attendanceRecords.forEach((record) => {
        nextAttendanceTotals[record.studentId] =
          (nextAttendanceTotals[record.studentId] ?? 0) + attendancePointValues[record.status];
      });

      setStudents(nextStudents);
      setManualRecords(nextManualRecords);
      setAttendanceTotals(nextAttendanceTotals);
      setSelectedStudentId((current) => current || nextStudents[0]?.studentId || "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load points.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPointData();
  }, [appUser]);

  useEffect(() => {
    if (!selectedStudentId && filteredStudents.length > 0) {
      setSelectedStudentId(filteredStudents[0].studentId);
      return;
    }

    if (
      selectedStudentId &&
      !filteredStudents.some((student) => student.studentId === selectedStudentId)
    ) {
      setSelectedStudentId(filteredStudents[0]?.studentId ?? "");
    }
  }, [filteredStudents, selectedStudentId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser) {
      return;
    }

    const student = filteredStudents.find(
      (currentStudent) => currentStudent.studentId === selectedStudentId
    );
    const pointAmount = Number(points);

    if (!student || Number.isNaN(pointAmount)) {
      setError("Choose a member and enter a valid point amount.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await addCompetitionPoint({
        student,
        date,
        points: pointAmount,
        reason,
        addedBy: appUser.uid
      });
      setMessage("Points saved.");
      setPoints("1");
      setReason("");
      await loadPointData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save points.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["admin", "leader"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading with-action">
          <div>
            <p className="eyebrow">Competition points</p>
            <h1>Rankings and awards</h1>
            <p className="muted">
              Attendance automatically counts toward totals. Add manual points for competitions,
              service, behavior, or corrections.
            </p>
          </div>

          <button className="secondary-button fit" onClick={loadPointData} type="button">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
        {message ? <p className="success-message">{message}</p> : null}

        <section className="score-rule-grid">
          <article>
            <strong>Present</strong>
            <span>3 points</span>
          </article>
          <article>
            <strong>Late</strong>
            <span>2 points</span>
          </article>
          <article>
            <strong>Excused</strong>
            <span>1 point</span>
          </article>
          <article>
            <strong>Absent</strong>
            <span>0 points</span>
          </article>
        </section>

        <section className="management-panel">
          <div className="filter-grid">
            <label>
              Ngành
              <select
                onChange={(event) => {
                  setSelectedGroup(event.target.value);
                  setSelectedTeam("");
                  setSelectedStudentId("");
                }}
                value={selectedGroup}
              >
                <option value="">All ngành</option>
                {groups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Team
              <select
                onChange={(event) => {
                  setSelectedTeam(event.target.value);
                  setSelectedStudentId("");
                }}
                value={selectedTeam}
              >
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Showing
              <input readOnly type="text" value={`${filteredStudents.length} member(s)`} />
            </label>
          </div>
        </section>

        <section className="management-panel">
          <div className="section-heading">
            <h2>Add manual points</h2>
            <p>Use negative numbers to subtract</p>
          </div>

          <form className="member-form" onSubmit={handleSubmit}>
            <label>
              Member
              <select
                onChange={(event) => setSelectedStudentId(event.target.value)}
                required
                value={selectedStudentId}
              >
                <option value="">Choose member</option>
                {filteredStudents.map((student) => (
                  <option key={student.studentId} value={student.studentId}>
                    {student.fullName} - {student.group} / {student.team}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date
              <input onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
            </label>

            <label>
              Points
              <input
                onChange={(event) => setPoints(event.target.value)}
                required
                step="1"
                type="number"
                value={points}
              />
            </label>

            <label>
              Reason
              <input
                onChange={(event) => setReason(event.target.value)}
                placeholder="Bible quiz, teamwork, cleanup, correction..."
                required
                type="text"
                value={reason}
              />
            </label>

            <button
              className="primary-button fit"
              disabled={saving || filteredStudents.length === 0}
              type="submit"
            >
              <Plus size={18} />
              {saving ? "Saving..." : "Add points"}
            </button>
          </form>
        </section>

        <section className="management-panel">
          <div className="section-heading">
            <h2>Individual ranking</h2>
            <p>{loading ? "Loading..." : `${rankingRows.length} member(s)`}</p>
          </div>

          {rankingRows.length === 0 && !loading ? (
            <div className="empty-state">
              <strong>No points yet</strong>
              <span>Add attendance or manual point records to start the ranking.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Member</th>
                    <th>Attendance</th>
                    <th>Manual</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingRows.map((row, index) => (
                    <tr key={row.student.studentId}>
                      <td>
                        <span className="rank-badge">{index + 1}</span>
                      </td>
                      <td>
                        <strong>{row.student.fullName}</strong>
                        <span>
                          {row.student.group} / {row.student.team}
                        </span>
                      </td>
                      <td>{row.attendancePoints}</td>
                      <td>{row.manualPoints}</td>
                      <td>
                        <strong>{row.totalPoints}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="dashboard-grid">
          <div className="management-panel no-margin">
            <div className="section-heading">
              <h2>Team ranking</h2>
              <Trophy size={20} />
            </div>
            <div className="ranking-list">
              {teamRankings.map((team, index) => (
                <div key={team.team}>
                  <span>{index + 1}</span>
                  <strong>{team.team}</strong>
                  <em>{team.totalPoints} pts</em>
                </div>
              ))}
            </div>
          </div>

          <div className="management-panel no-margin span-dashboard-2">
            <div className="section-heading">
              <h2>Recent manual point history</h2>
              <p>{recentManualRecords.length} record(s)</p>
            </div>
            {recentManualRecords.length === 0 ? (
              <div className="empty-state">
                <strong>No manual points yet</strong>
                <span>Manual additions and corrections will appear here.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Points</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentManualRecords.map((record) => (
                      <tr key={record.pointId}>
                        <td>{record.date}</td>
                        <td>{record.studentName}</td>
                        <td>{record.points}</td>
                        <td>{record.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </AuthGuard>
  );
}
