"use client";

import { RefreshCw, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";
import { listStudentsForUser } from "@/lib/students";
import { deleteParentProfile, listParentUsers } from "@/lib/users";
import { useAuth } from "@/context/AuthContext";
import type { Student } from "@/types/student";
import type { AppUser } from "@/types/user";

type ParentRow = {
  parent: AppUser;
  children: Student[];
};

export default function ParentsPage() {
  const { appUser } = useAuth();
  const [parents, setParents] = useState<AppUser[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const parentRows = useMemo<ParentRow[]>(
    () =>
      parents.map((parent) => ({
        parent,
        children: students.filter((student) => student.parentEmail === parent.email)
      })),
    [parents, students]
  );

  const connectedCount = parentRows.filter((row) => row.children.length > 0).length;

  async function loadParents() {
    if (!appUser) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const [nextParents, nextStudents] = await Promise.all([
        listParentUsers(),
        listStudentsForUser(appUser)
      ]);

      setParents(nextParents);
      setStudents(nextStudents);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load parents.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteParent(parent: AppUser) {
    const confirmed = window.confirm(
      `Delete parent profile for ${parent.fullName}? This removes their app profile, but not their Firebase Authentication login.`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await deleteParentProfile(parent.uid);
      await loadParents();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete parent.");
    }
  }

  useEffect(() => {
    void loadParents();
  }, [appUser]);

  return (
    <AuthGuard allowedRoles={["admin"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading with-action">
          <div>
            <p className="eyebrow">Parent management</p>
            <h1>Parent accounts</h1>
            <p className="muted">
              Review parent sign-ups and confirm which children are connected by matching parent
              email.
            </p>
          </div>

          <button className="secondary-button fit" onClick={loadParents} type="button">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        <section className="parent-summary">
          <article>
            <span>Total parents</span>
            <strong>{parents.length}</strong>
            <p>{loading ? "Loading..." : "Parent accounts"}</p>
          </article>
          <article>
            <span>Connected</span>
            <strong>{connectedCount}</strong>
            <p>Have one or more children matched by email</p>
          </article>
          <article>
            <span>Needs attention</span>
            <strong>{Math.max(parentRows.length - connectedCount, 0)}</strong>
            <p>No child currently uses that parent email</p>
          </article>
          <article>
            <span>Child profiles</span>
            <strong>{students.length}</strong>
            <p>Active records in member management</p>
          </article>
        </section>

        <section className="management-panel">
          <div className="section-heading">
            <h2>Parent list</h2>
            <p>{loading ? "Loading..." : `${parentRows.length} parent(s)`}</p>
          </div>

          {parentRows.length === 0 && !loading ? (
            <div className="empty-state">
              <strong>No parent accounts yet</strong>
              <span>Parents will appear here after they sign up.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Parent</th>
                    <th>Email</th>
                    <th>Matched children</th>
                    <th>Admin action</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {parentRows.map((row) => (
                    <tr key={row.parent.uid}>
                      <td>
                        {row.children.length > 0 ? (
                          <span className="connection-pill connected">
                            <UserRoundCheck size={16} />
                            Connected
                          </span>
                        ) : (
                          <span className="connection-pill missing">
                            <UserRoundX size={16} />
                            Needs match
                          </span>
                        )}
                      </td>
                      <td>
                        <strong>{row.parent.fullName}</strong>
                        <span>{row.parent.uid}</span>
                      </td>
                      <td>{row.parent.email}</td>
                      <td>
                        {row.children.length > 0
                          ? row.children.map((child) => (
                              <span key={child.studentId}>
                                {child.fullName} - {child.group} / {child.team}
                              </span>
                            ))
                          : "None"}
                      </td>
                      <td>
                        {row.children.length > 0
                          ? "No action needed"
                          : "Update a child's parentEmail to match this email exactly"}
                      </td>
                      <td>
                        <button
                          className="icon-button danger"
                          onClick={() => void handleDeleteParent(row.parent)}
                          title="Delete parent profile"
                          type="button"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
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
