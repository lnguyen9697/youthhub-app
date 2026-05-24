"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";
import { announcementMatchesGroupOrTeam, listAnnouncements } from "@/lib/announcements";
import { listAttendanceForStudent } from "@/lib/attendance";
import { listCompetitionPointsForStudent } from "@/lib/points";
import { listStudentsForParent } from "@/lib/students";
import type { Announcement } from "@/types/announcement";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";
import type { CompetitionPointRecord } from "@/types/points";
import type { Student } from "@/types/student";

const attendancePointValues: Record<AttendanceStatus, number> = {
  present: 3,
  late: 2,
  excused: 1,
  absent: 0
};

type ChildSummary = {
  student: Student;
  attendance: AttendanceRecord[];
  manualPoints: CompetitionPointRecord[];
};

export default function ParentPortalPage() {
  const { appUser } = useAuth();
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedChild = useMemo(
    () => children.find((child) => child.student.studentId === selectedStudentId) ?? children[0],
    [children, selectedStudentId]
  );

  const attendancePoints = useMemo(() => {
    if (!selectedChild) {
      return 0;
    }

    return selectedChild.attendance.reduce(
      (total, record) => total + attendancePointValues[record.status],
      0
    );
  }, [selectedChild]);

  const manualPoints = useMemo(() => {
    if (!selectedChild) {
      return 0;
    }

    return selectedChild.manualPoints.reduce((total, record) => total + record.points, 0);
  }, [selectedChild]);

  const totalPoints = attendancePoints + manualPoints;
  const latestAttendance = selectedChild?.attendance[0];
  const childRank = useMemo(() => {
    if (!selectedChild) {
      return null;
    }

    const ranked = children
      .map((child) => {
        const childAttendancePoints = child.attendance.reduce(
          (total, record) => total + attendancePointValues[record.status],
          0
        );
        const childManualPoints = child.manualPoints.reduce(
          (total, record) => total + record.points,
          0
        );

        return {
          studentId: child.student.studentId,
          total: childAttendancePoints + childManualPoints
        };
      })
      .sort((a, b) => b.total - a.total);

    const rankIndex = ranked.findIndex((child) => child.studentId === selectedChild.student.studentId);

    return rankIndex >= 0 ? rankIndex + 1 : null;
  }, [children, selectedChild]);

  const childAnnouncements = useMemo(() => {
    if (!selectedChild) {
      return [];
    }

    return announcements.filter((announcement) =>
      announcementMatchesGroupOrTeam(
        announcement,
        selectedChild.student.group,
        selectedChild.student.team
      )
    );
  }, [announcements, selectedChild]);

  async function loadParentData() {
    if (!appUser) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const [linkedStudents, nextAnnouncements] = await Promise.all([
        listStudentsForParent(appUser),
        listAnnouncements()
      ]);
      const summaries = await Promise.all(
        linkedStudents.map(async (student) => {
          const [attendance, points] = await Promise.all([
            listAttendanceForStudent(student.studentId),
            listCompetitionPointsForStudent(student.studentId)
          ]);

          return {
            student,
            attendance,
            manualPoints: points
          };
        })
      );

      setChildren(summaries);
      setAnnouncements(nextAnnouncements);
      setSelectedStudentId((current) => current || summaries[0]?.student.studentId || "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load parent portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadParentData();
  }, [appUser]);

  return (
    <AuthGuard allowedRoles={["parent"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading with-action">
          <div>
            <p className="eyebrow">Parent portal</p>
            <h1>Child updates</h1>
            <p className="muted">
              View attendance and competition points for children linked to your account.
            </p>
          </div>

          <button className="secondary-button fit" onClick={loadParentData} type="button">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        {children.length > 1 ? (
          <section className="management-panel">
            <label>
              Child
              <select
                onChange={(event) => setSelectedStudentId(event.target.value)}
                value={selectedChild?.student.studentId ?? ""}
              >
                {children.map((child) => (
                  <option key={child.student.studentId} value={child.student.studentId}>
                    {child.student.fullName}
                  </option>
                ))}
              </select>
            </label>
          </section>
        ) : null}

        {!loading && !selectedChild ? (
          <section className="management-panel">
            <div className="empty-state">
              <strong>No children linked yet</strong>
              <span>
                Ask an admin to make sure your child profile uses the same parent email as this
                account.
              </span>
            </div>
          </section>
        ) : null}

        {selectedChild ? (
          <>
            <section className="parent-summary">
              <article>
                <span>Child</span>
                <strong>{selectedChild.student.fullName}</strong>
                <p>
                  {selectedChild.student.group} / {selectedChild.student.team}
                </p>
              </article>
              <article>
                <span>Latest attendance</span>
                <strong className="capitalize">{latestAttendance?.status ?? "None yet"}</strong>
                <p>{latestAttendance?.date ?? "No record"}</p>
              </article>
              <article>
                <span>Total points</span>
                <strong>{totalPoints}</strong>
                <p>
                  {attendancePoints} attendance + {manualPoints} manual
                </p>
              </article>
              <article>
                <span>Current rank</span>
                <strong>{childRank ? `#${childRank}` : "None yet"}</strong>
                <p>Among children linked to this parent account</p>
              </article>
            </section>

            <section className="management-panel">
              <div className="section-heading">
                <h2>Recent attendance</h2>
                <p>{selectedChild.attendance.length} record(s)</p>
              </div>

              {selectedChild.attendance.length === 0 ? (
                <div className="empty-state">
                  <strong>No attendance yet</strong>
                  <span>Attendance records will appear after a leader saves them.</span>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Points</th>
                        <th>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChild.attendance.slice(0, 12).map((record) => (
                        <tr key={record.attendanceId}>
                          <td>{record.date}</td>
                          <td>
                            <span className={`status-pill ${record.status}`}>{record.status}</span>
                          </td>
                          <td>{attendancePointValues[record.status]}</td>
                          <td>{record.note || "None"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="management-panel">
              <div className="section-heading">
                <h2>Recent point history</h2>
                <p>{selectedChild.manualPoints.length} record(s)</p>
              </div>

              {selectedChild.manualPoints.length === 0 ? (
                <div className="empty-state">
                  <strong>No manual points yet</strong>
                  <span>Competition points and adjustments will appear here.</span>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Points</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedChild.manualPoints.slice(0, 12).map((record) => (
                        <tr key={record.pointId}>
                          <td>{record.date}</td>
                          <td>{record.points}</td>
                          <td>{record.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="management-panel">
              <div className="section-heading">
                <h2>Announcements</h2>
                <p>{childAnnouncements.length} post(s)</p>
              </div>

              {childAnnouncements.length === 0 ? (
                <div className="empty-state">
                  <strong>No announcements yet</strong>
                  <span>Group and team announcements will appear here.</span>
                </div>
              ) : (
                <div className="announcement-list">
                  {childAnnouncements.slice(0, 6).map((announcement) => (
                    <article key={announcement.announcementId}>
                      <div>
                        <span>{announcement.createdAt || "Recent"}</span>
                        <h2>{announcement.title}</h2>
                        <p>{announcement.message}</p>
                      </div>
                      <footer>
                        <span>{announcement.targetGroup || "All ngành"}</span>
                        <span>{announcement.targetTeam || "All teams"}</span>
                      </footer>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </AuthGuard>
  );
}
