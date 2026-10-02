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
import {
  attendanceItemLabels,
  attendanceItemOptions,
  formatAttendanceItems,
  getAttendancePoints
} from "@/lib/attendanceScore";
import { sortNganh } from "@/lib/nganh";
import { listStudentsForUser } from "@/lib/students";
import type { AttendanceItem, AttendanceRecord } from "@/types/attendance";
import type { Student } from "@/types/student";

type AttendanceEntry = {
  attendanceItems: AttendanceItem[];
  note: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyEntry(): AttendanceEntry {
  return { attendanceItems: [], note: "" };
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

  const attendanceSummary = useMemo(() => {
    const summary: Record<AttendanceItem, number> = {
      present: 0,
      churchEntry: 0,
      mass: 0,
      uniform: 0,
      veymEvent: 0
    };

    filteredStudents.forEach((student) => {
      const items = entries[student.studentId]?.attendanceItems ?? [];

      items.forEach((item) => {
        summary[item] += 1;
      });
    });

    return summary;
  }, [entries, filteredStudents]);

  const attendanceTotalPoints = useMemo(
    () =>
      filteredStudents.reduce(
        (total, student) => total + (entries[student.studentId]?.attendanceItems.length ?? 0),
        0
      ),
    [entries, filteredStudents]
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
          ? { attendanceItems: savedRecord.attendanceItems, note: savedRecord.note }
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

  function toggleAttendanceItem(studentId: string, item: AttendanceItem) {
    const currentItems = entries[studentId]?.attendanceItems ?? [];
    const nextItems = currentItems.includes(item)
      ? currentItems.filter((currentItem) => currentItem !== item)
      : [...currentItems, item];

    updateEntry(studentId, { attendanceItems: nextItems });
  }

  function markAllFiltered(item: AttendanceItem) {
    setEntries((current) => {
      const nextEntries = { ...current };

      filteredStudents.forEach((student) => {
        const currentItems = nextEntries[student.studentId]?.attendanceItems ?? [];

        nextEntries[student.studentId] = {
          ...(nextEntries[student.studentId] ?? emptyEntry()),
          attendanceItems: currentItems.includes(item) ? currentItems : [...currentItems, item]
        };
      });

      return nextEntries;
    });
  }

  function clearAllFiltered() {
    setEntries((current) => {
      const nextEntries = { ...current };

      filteredStudents.forEach((student) => {
        nextEntries[student.studentId] = {
          ...(nextEntries[student.studentId] ?? emptyEntry()),
          attendanceItems: []
        };
      });

      return nextEntries;
    });
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
          attendanceItems: entries[student.studentId]?.attendanceItems ?? [],
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
              Select a date and group, then check each item the member completed. Each item is worth
              1 point.
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

          <div className="attendance-tools">
            <div>
              <strong>Quick mark</strong>
              <span>Applies to the members currently shown by the filters.</span>
            </div>
            <div className="attendance-tool-actions">
              {attendanceItemOptions.map((option) => (
                <button
                  className="secondary-button fit"
                  disabled={filteredStudents.length === 0}
                  key={option.value}
                  onClick={() => markAllFiltered(option.value)}
                  type="button"
                >
                  All {option.label}
                </button>
              ))}
              <button
                className="secondary-button fit"
                disabled={filteredStudents.length === 0}
                onClick={clearAllFiltered}
                type="button"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="attendance-summary">
            {attendanceItemOptions.map((option) => (
              <article key={option.value}>
                <span>{attendanceItemLabels[option.value]}</span>
                <strong>{attendanceSummary[option.value]}</strong>
              </article>
            ))}
            <article>
              <span>Total Points</span>
              <strong>{attendanceTotalPoints}</strong>
            </article>
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

                      <div className="status-options attendance-checks" aria-label={`${student.fullName} attendance`}>
                        {attendanceItemOptions.map((option) => (
                          <button
                            className={entry.attendanceItems.includes(option.value) ? "active" : ""}
                            key={option.value}
                            onClick={() =>
                              toggleAttendanceItem(student.studentId, option.value)
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
                    <th>Items</th>
                    <th>Points</th>
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
                      <td>{formatAttendanceItems(record.attendanceItems)}</td>
                      <td>{getAttendancePoints(record)}</td>
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
