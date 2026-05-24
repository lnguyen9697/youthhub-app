"use client";

import { Megaphone, Plus, RefreshCw } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";
import { createAnnouncement, listAnnouncements } from "@/lib/announcements";
import { sortNganh } from "@/lib/nganh";
import { listStudentsForUser } from "@/lib/students";
import type { Announcement } from "@/types/announcement";

export default function AnnouncementsPage() {
  const { appUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [teams, setTeams] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetGroup, setTargetGroup] = useState("");
  const [targetTeam, setTargetTeam] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const canCreate = appUser?.role === "admin" || appUser?.role === "leader";

  const visibleAnnouncements = useMemo(() => {
    if (!appUser || appUser.role !== "leader") {
      return announcements;
    }

    return announcements.filter((announcement) => {
      const groupOk = !announcement.targetGroup || announcement.targetGroup === appUser.assignedGroup;
      const teamOk = !announcement.targetTeam || announcement.targetTeam === appUser.assignedTeam;

      return groupOk && teamOk;
    });
  }, [announcements, appUser]);

  async function loadAnnouncements() {
    if (!appUser) {
      return;
    }

    setError("");
    setNotice("");
    setLoading(true);

    try {
      const [nextAnnouncements, students] = await Promise.all([
        listAnnouncements(),
        appUser.role === "parent" ? Promise.resolve([]) : listStudentsForUser(appUser)
      ]);

      setAnnouncements(nextAnnouncements);
      setGroups(sortNganh(Array.from(new Set(students.map((student) => student.group).filter(Boolean)))));
      setTeams(Array.from(new Set(students.map((student) => student.team).filter(Boolean))).sort());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load announcements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnnouncements();
  }, [appUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser || !canCreate) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await createAnnouncement({
        title,
        message,
        targetGroup,
        targetTeam,
        createdBy: appUser.uid
      });

      setTitle("");
      setMessage("");
      setTargetGroup("");
      setTargetTeam("");
      setNotice("Announcement posted.");
      await loadAnnouncements();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not post announcement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["admin", "leader", "parent"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading with-action">
          <div>
            <p className="eyebrow">Announcements</p>
            <h1>Organization updates</h1>
            <p className="muted">
              Share updates by group or team. Parents can read announcements for their child.
            </p>
          </div>

          <button className="secondary-button fit" onClick={loadAnnouncements} type="button">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
        {notice ? <p className="success-message">{notice}</p> : null}

        {canCreate ? (
          <section className="management-panel">
            <div className="section-heading">
              <h2>Create announcement</h2>
              <Megaphone size={20} />
            </div>

            <form className="member-form" onSubmit={handleSubmit}>
              <label>
                Title
                <input
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  type="text"
                  value={title}
                />
              </label>

              <label>
                Ngành
                <select onChange={(event) => setTargetGroup(event.target.value)} value={targetGroup}>
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
                <select onChange={(event) => setTargetTeam(event.target.value)} value={targetTeam}>
                  <option value="">All teams</option>
                  {teams.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </select>
              </label>

              <label className="span-2">
                Message
                <textarea
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  rows={4}
                  value={message}
                />
              </label>

              <button className="primary-button fit" disabled={saving} type="submit">
                <Plus size={18} />
                {saving ? "Posting..." : "Post announcement"}
              </button>
            </form>
          </section>
        ) : null}

        <section className="management-panel">
          <div className="section-heading">
            <h2>Recent announcements</h2>
            <p>{loading ? "Loading..." : `${visibleAnnouncements.length} post(s)`}</p>
          </div>

          {visibleAnnouncements.length === 0 && !loading ? (
            <div className="empty-state">
              <strong>No announcements yet</strong>
              <span>New updates will appear here.</span>
            </div>
          ) : (
            <div className="announcement-list">
              {visibleAnnouncements.map((announcement) => (
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
      </main>
    </AuthGuard>
  );
}
