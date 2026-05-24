"use client";

import { Mail, RefreshCw, Send } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { TopNav } from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";
import {
  createParentMessage,
  listAllParentMessages,
  listMessagesForParent,
  replyToParentMessage
} from "@/lib/messages";
import type { ParentMessage } from "@/types/message";

export default function MessagesPage() {
  const { appUser } = useAuth();
  const [messages, setMessages] = useState<ParentMessage[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [editingReplies, setEditingReplies] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const isAdmin = appUser?.role === "admin";
  const isParent = appUser?.role === "parent";

  async function loadMessages() {
    if (!appUser) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const nextMessages = isAdmin
        ? await listAllParentMessages()
        : await listMessagesForParent(appUser.uid);
      setMessages(nextMessages);
      setReplyDrafts(
        Object.fromEntries(nextMessages.map((parentMessage) => [parentMessage.messageId, parentMessage.reply]))
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
  }, [appUser]);

  async function handleParentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser || !isParent) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await createParentMessage({ parent: appUser, subject, message });
      setSubject("");
      setMessage("");
      setNotice("Message sent.");
      await loadMessages();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not send message.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdminReply(parentMessage: ParentMessage, resolved: boolean) {
    if (!appUser || !isAdmin) {
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await replyToParentMessage({
        messageId: parentMessage.messageId,
        reply: replyDrafts[parentMessage.messageId] ?? "",
        repliedBy: appUser.uid,
        status: resolved ? "resolved" : "open"
      });
      setEditingReplies((current) => ({
        ...current,
        [parentMessage.messageId]: false
      }));
      setNotice(resolved ? "Message marked resolved." : "Reply saved.");
      await loadMessages();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update message.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard allowedRoles={["admin", "parent"]}>
      <TopNav />
      <main className="content-shell">
        <div className="page-heading with-action">
          <div>
            <p className="eyebrow">Messages</p>
            <h1>{isAdmin ? "Parent inbox" : "Contact admin"}</h1>
            <p className="muted">
              {isAdmin
                ? "Read parent questions, reply, and mark conversations resolved."
                : "Send a private question or note to the admin team."}
            </p>
          </div>

          <button className="secondary-button fit" onClick={loadMessages} type="button">
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {error ? <p className="error-message">{error}</p> : null}
        {notice ? <p className="success-message">{notice}</p> : null}

        {isParent ? (
          <section className="management-panel">
            <div className="section-heading">
              <h2>Send a message</h2>
              <Mail size={20} />
            </div>

            <form className="form-stack" onSubmit={handleParentSubmit}>
              <label>
                Subject
                <input
                  onChange={(event) => setSubject(event.target.value)}
                  required
                  type="text"
                  value={subject}
                />
              </label>

              <label>
                Message
                <textarea
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  rows={5}
                  value={message}
                />
              </label>

              <button className="primary-button fit" disabled={saving} type="submit">
                <Send size={18} />
                {saving ? "Sending..." : "Send message"}
              </button>
            </form>
          </section>
        ) : null}

        <section className="management-panel">
          <div className="section-heading">
            <h2>{isAdmin ? "Messages from parents" : "My messages"}</h2>
            <p>{loading ? "Loading..." : `${messages.length} message(s)`}</p>
          </div>

          {messages.length === 0 && !loading ? (
            <div className="empty-state">
              <strong>No messages yet</strong>
              <span>{isAdmin ? "Parent messages will appear here." : "Sent messages will appear here."}</span>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((parentMessage) => (
                <article key={parentMessage.messageId}>
                  <header>
                    <div>
                      <span>{parentMessage.createdAt || "Recent"}</span>
                      <h2>{parentMessage.subject}</h2>
                      {isAdmin ? (
                        <p>
                          {parentMessage.parentName} · {parentMessage.parentEmail}
                        </p>
                      ) : null}
                    </div>
                    <strong className={`message-status ${parentMessage.status}`}>
                      {parentMessage.status}
                    </strong>
                  </header>

                  <p>{parentMessage.message}</p>

                  {isAdmin ? (
                    parentMessage.reply && !editingReplies[parentMessage.messageId] ? (
                      <div className="reply-box read-only">
                        <strong>Admin reply sent</strong>
                        <p>{parentMessage.reply}</p>
                        <div className="row-actions">
                          <button
                            className="secondary-button"
                            onClick={() =>
                              setEditingReplies((current) => ({
                                ...current,
                                [parentMessage.messageId]: true
                              }))
                            }
                            type="button"
                          >
                            Edit reply
                          </button>
                          {parentMessage.status !== "resolved" ? (
                            <button
                              className="primary-button fit"
                              disabled={saving}
                              onClick={() => void handleAdminReply(parentMessage, true)}
                              type="button"
                            >
                              Mark resolved
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="reply-box">
                        <label>
                          Admin reply
                          <textarea
                            onChange={(event) =>
                              setReplyDrafts((current) => ({
                                ...current,
                                [parentMessage.messageId]: event.target.value
                              }))
                            }
                            rows={3}
                            value={replyDrafts[parentMessage.messageId] ?? ""}
                          />
                        </label>
                        <div className="row-actions">
                          <button
                            className="secondary-button"
                            disabled={saving}
                            onClick={() => void handleAdminReply(parentMessage, false)}
                            type="button"
                          >
                            Save reply
                          </button>
                          <button
                            className="primary-button fit"
                            disabled={saving}
                            onClick={() => void handleAdminReply(parentMessage, true)}
                            type="button"
                          >
                            Mark resolved
                          </button>
                        </div>
                      </div>
                    )
                  ) : parentMessage.reply ? (
                    <div className="reply-box read-only">
                      <strong>Admin reply</strong>
                      <p>{parentMessage.reply}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AuthGuard>
  );
}
