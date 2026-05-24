"use client";

import { Edit3, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";
import { nganhOptions } from "@/lib/nganh";
import { createStudent, deleteStudent, listStudentsForUser, updateStudent } from "@/lib/students";
import type { Student } from "@/types/student";

type MemberFormState = {
  fullName: string;
  dateOfBirth: string;
  group: string;
  team: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  notes: string;
};

const emptyForm: MemberFormState = {
  fullName: "",
  dateOfBirth: "",
  group: "",
  team: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  notes: ""
};

function formFromStudent(student: Student): MemberFormState {
  return {
    fullName: student.fullName,
    dateOfBirth: student.dateOfBirth,
    group: student.group,
    team: student.team,
    parentName: student.parentName,
    parentEmail: student.parentEmail,
    parentPhone: student.parentPhone,
    notes: student.notes
  };
}

export default function MembersPage() {
  const { appUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState<MemberFormState>(emptyForm);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [customNganh, setCustomNganh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = appUser?.role === "admin";
  const isCustomNganh = customNganh || (Boolean(form.group) && !nganhOptions.includes(form.group));

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students]
  );

  async function loadStudents() {
    if (!appUser) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const nextStudents = await listStudentsForUser(appUser);
      setStudents(nextStudents);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, [appUser]);

  function updateForm(field: keyof MemberFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingStudentId(null);
    setCustomNganh(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isAdmin) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingStudentId) {
        await updateStudent(editingStudentId, form);
      } else {
        await createStudent(form);
      }

      resetForm();
      await loadStudents();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save this member.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(student: Student) {
    if (!isAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${student.fullName}? This will also delete this member's attendance and point records. This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await deleteStudent(student.studentId);
      await loadStudents();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete this member.");
    }
  }

  return (
    <AuthGuard allowedRoles={["admin", "leader"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading with-action">
          <div>
            <p className="eyebrow">Member management</p>
            <h1>Youth members</h1>
            <p className="muted">
              {isAdmin
                ? "Add, edit, and delete youth member profiles."
                : "View youth members assigned to your ngành or team."}
            </p>
          </div>

          <button className="secondary-button fit" onClick={loadStudents} type="button">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}

        {isAdmin ? (
          <section className="management-panel">
            <div className="section-heading">
              <h2>{editingStudentId ? "Edit member" : "Add member"}</h2>
              {editingStudentId ? (
                <button className="ghost-button" onClick={resetForm} type="button">
                  <X size={18} />
                  Cancel
                </button>
              ) : null}
            </div>

            <form className="member-form" onSubmit={handleSubmit}>
              <label>
                Full name
                <input
                  onChange={(event) => updateForm("fullName", event.target.value)}
                  required
                  type="text"
                  value={form.fullName}
                />
              </label>

              <label>
                Date of birth
                <input
                  onChange={(event) => updateForm("dateOfBirth", event.target.value)}
                  required
                  type="date"
                  value={form.dateOfBirth}
                />
              </label>

              <label>
                Ngành
                <select
                  onChange={(event) => {
                    if (event.target.value === "__custom__") {
                      setCustomNganh(true);
                      updateForm("group", "");
                      return;
                    }

                    setCustomNganh(false);
                    updateForm("group", event.target.value);
                  }}
                  required
                  value={isCustomNganh ? "__custom__" : form.group}
                >
                  <option value="">Select ngành</option>
                  {nganhOptions.map((nganh) => (
                    <option key={nganh} value={nganh}>
                      {nganh}
                    </option>
                  ))}
                  <option value="__custom__">Add new</option>
                </select>
              </label>

              {isCustomNganh ? (
                <label>
                  New ngành
                  <input
                    onChange={(event) => updateForm("group", event.target.value)}
                    placeholder="Enter new ngành"
                    required
                    type="text"
                    value={form.group}
                  />
                </label>
              ) : null}

              <label>
                Team
                <input
                  onChange={(event) => updateForm("team", event.target.value)}
                  required
                  type="text"
                  value={form.team}
                />
              </label>

              <label>
                Parent name
                <input
                  onChange={(event) => updateForm("parentName", event.target.value)}
                  required
                  type="text"
                  value={form.parentName}
                />
              </label>

              <label>
                Parent email
                <input
                  onChange={(event) => updateForm("parentEmail", event.target.value)}
                  required
                  type="email"
                  value={form.parentEmail}
                />
              </label>

              <label>
                Parent phone
                <input
                  onChange={(event) => updateForm("parentPhone", event.target.value)}
                  required
                  type="tel"
                  value={form.parentPhone}
                />
              </label>

              <label className="span-2">
                Health notes or special notes
                <textarea
                  onChange={(event) => updateForm("notes", event.target.value)}
                  rows={3}
                  value={form.notes}
                />
              </label>

              <button className="primary-button fit" disabled={saving} type="submit">
                <Plus size={18} />
                {saving ? "Saving..." : editingStudentId ? "Save changes" : "Add member"}
              </button>
            </form>
          </section>
        ) : null}

        <section className="management-panel">
          <div className="section-heading">
            <h2>Member list</h2>
            <p>{loading ? "Loading..." : `${sortedStudents.length} member(s)`}</p>
          </div>

          {sortedStudents.length === 0 && !loading ? (
            <div className="empty-state">
              <strong>No members found</strong>
              <span>
                {isAdmin
                  ? "Add your first member with the form above."
                  : "Ask an admin to assign members to your ngành or team."}
              </span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Ngành</th>
                    <th>Team</th>
                    <th>Parent</th>
                    <th>Phone</th>
                    {isAdmin ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student) => (
                    <tr key={student.studentId}>
                      <td>
                        <strong>{student.fullName}</strong>
                        <span>{student.dateOfBirth}</span>
                      </td>
                      <td>{student.group}</td>
                      <td>{student.team}</td>
                      <td>
                        <strong>{student.parentName}</strong>
                        <span>{student.parentEmail}</span>
                      </td>
                      <td>{student.parentPhone}</td>
                      {isAdmin ? (
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              onClick={() => {
                                setEditingStudentId(student.studentId);
                                setForm(formFromStudent(student));
                                setCustomNganh(!nganhOptions.includes(student.group));
                              }}
                              title="Edit member"
                              type="button"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              className="icon-button danger"
                              onClick={() => void handleDelete(student)}
                              title="Delete member"
                              type="button"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      ) : null}
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
