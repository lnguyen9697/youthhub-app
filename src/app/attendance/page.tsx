"use client";

import { CalendarCheck, RefreshCw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";
import {
  listAttendanceForDate,
  listRecentAttendance,
  deleteAllAttendanceRecords,
  saveAttendance
} from "@/lib/attendance";
import { sortNganh } from "@/lib/nganh";
import { listStudentsForUser } from "@/lib/students";
import type { AttendanceRecord, AttendanceStatus } from "@/types/attendance";
import type { Student } from "@/types/student";

type AttendanceEntry = {
  status: AttendanceStatus;
  note: string;
};

const statusOptions: Array<{ label: string; value: AttendanceStatus }> = [
  { label: "Present", value: "present" },
  { label: "Absent", value: "absent" },
  { label: "Excused", value: "excused" },
  { label: "Late", value: "late" }
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyEntry(): AttendanceEntry {
  return { status: "present", note: "" };
}

export default function AttendancePage() {
  const { appUser } = useAuth();
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<Record<string, AttendanceEntry>>({});
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
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
    () => Array.from(new Set(students.map((student) => student.team).filter(Boolean))).sort(),
    [students]
  );

  const filteredStudents = useMemo(
    () =>
      students
        .filter((student) => !selectedGroup || student.group === selectedGroup)
        .filter((student) => !selectedTeam || student.team === selectedTeam)
        .sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [selectedGroup, selectedTeam, students]
  );
  const isAdmin = appUser?.role === "admin";

  async function loadPageData() {
    if (!appUser) {
      return;
    }

    setError("");
    setMessage("");
    setLoading(true);

    try {
      const [nextStudents, attendanceForDate, recent] = await Promise.all([
        listStudentsForUser(appUser),
        listAttendanceForDate(date),
        listRecentAttendance(appUser.role === "leader" ? appUser.assignedGroup : undefined)
      ]);

      const nextEntries: Record<string, AttendanceEntry> = {};

      nextStudents.forEach((student) => {
        const savedRecord = attendanceForDate.find(
          (record) => record.studentId === student.studentId
        );
        nextEntries[student.studentId] = savedRecord
          ? { status: savedRecord.status, note: savedRecord.note }
          : emptyEntry();
      });

      setStudents(nextStudents);
      setEntries(nextEntries);
      setRecentAttendance(recent);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not load attendance data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPageData();
  }, [appUser, date]);

  function updateEntry(studentId: string, nextEntry: Partial<AttendanceEntry>) {
    setEntries((current) => ({
      ...current,
      [studentId]: {
        ...(current[studentId] ?? emptyEntry()),
        ...nextEntry
      }
    }));
  }

  async function handleSave() {
    if (!appUser) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await saveAttendance({
        date,
        recordedBy: appUser.uid,
        entries: filteredStudents.map((student) => ({
          student,
          status: entries[student.studentId]?.status ?? "present",
          note: entries[student.studentId]?.note ?? ""
        }))
      });

      setMessage("Attendance saved.");
      await loadPageData();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save attendance.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearAttendance() {
    if (!isAdmin) {
      return;
    }

    const confirmed = window.confirm(
      "Delete all attendance records? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await deleteAllAttendanceRecords();
      setEntries({});
      setRecentAttendance([]);
      setMessage("Attendance records cleared.");
      await loadPageData();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not clear attendance records."
      );
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
            <p className="eyebrow">Attendance tracking</p>
            <h1>Meeting attendance</h1>
            <p className="muted">
              Select a date and group, then mark each member as present, absent, excused, or late.
            </p>
          </div>

          <button className="secondary-button fit" onClick={loadPageData} type="button">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
        {message ? <p className="success-message">{message}</p> : null}

        <section className="management-panel">
          <div className="filter-grid">
            <label>
              Meeting date
              <input onChange={(event) => setDate(event.target.value)} type="date" value={date} />
            </label>

            <label>
              Ngành
              <select
                onChange={(event) => setSelectedGroup(event.target.value)}
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
              <select onChange={(event) => setSelectedTeam(event.target.value)} value={selectedTeam}>
                <option value="">All teams</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="management-panel">
          <div className="section-heading">
            <h2>Take attendance</h2>
            <p>{loading ? "Loading..." : `${filteredStudents.length} member(s)`}</p>
          </div>

          {filteredStudents.length === 0 && !loading ? (
            <div className="empty-state">
              <strong>No members found</strong>
              <span>Add members first, or adjust the group/team filters.</span>
            </div>
          ) : (
            <>
              <div className="attendance-list">
                {filteredStudents.map((student) => {
                  const entry = entries[student.studentId] ?? emptyEntry();

                  return (
                    <article className="attendance-row" key={student.studentId}>
                      <div className="attendance-member">
                        <strong>{student.fullName}</strong>
                        <span>
                          {student.group} / {student.team}
                        </span>
                      </div>

                      <div className="status-options" aria-label={`${student.fullName} attendance`}>
                        {statusOptions.map((option) => (
                          <button
                            className={entry.status === option.value ? "active" : ""}
                            key={option.value}
                            onClick={() =>
                              updateEntry(student.studentId, { status: option.value })
                            }
                            type="button"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>

                      <label className="attendance-note">
                        Note
                        <input
                          onChange={(event) =>
                            updateEntry(student.studentId, { note: event.target.value })
                          }
                          placeholder="Optional"
                          type="text"
                          value={entry.note}
                        />
                      </label>
                    </article>
                  );
                })}
              </div>

              <button
                className="primary-button fit attendance-save"
                disabled={saving || filteredStudents.length === 0}
                onClick={handleSave}
                type="button"
              >
                {saving ? <CalendarCheck size={18} /> : <Save size={18} />}
                {saving ? "Saving..." : "Save attendance"}
              </button>
            </>
          )}
        </section>

        <section className="management-panel">
          <div className="section-heading">
            <h2>Recent attendance</h2>
            <div className="section-actions">
              <p>{recentAttendance.length} record(s)</p>
              {isAdmin && recentAttendance.length > 0 ? (
                <button
                  className="secondary-button danger"
                  disabled={saving}
                  onClick={handleClearAttendance}
                  type="button"
                >
                  <Trash2 size={18} />
                  Clear records
                </button>
              ) : null}
            </div>
          </div>

          {recentAttendance.length === 0 ? (
            <div className="empty-state">
              <strong>No attendance yet</strong>
              <span>Saved attendance records will appear here.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Group</th>
                    <th>Team</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map((record) => (
                    <tr key={record.attendanceId}>
                      <td>{record.date}</td>
                      <td>{record.studentName}</td>
                      <td>
                        <span className={`status-pill ${record.status}`}>{record.status}</span>
                      </td>
                      <td>{record.group}</td>
                      <td>{record.team}</td>
                      <td>{record.note || "None"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
