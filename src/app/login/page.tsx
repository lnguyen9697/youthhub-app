"use client";

import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, signUpParent } = useAuth();
  const [mode, setMode] = useState<"login" | "parent-signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signUpParent({ fullName, email, password });
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div>
          <p className="eyebrow">YouthHub</p>
          <h1>{mode === "login" ? "Welcome back" : "Parent sign up"}</h1>
          <p className="muted">
            {mode === "login"
              ? "Sign in to manage members, attendance, competition points, and parent updates."
              : "Create a parent account. An admin will link your child before records appear."}
          </p>
        </div>

        <div className="segmented-control" aria-label="Login or parent sign up">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setError("");
              setMode("login");
            }}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === "parent-signup" ? "active" : ""}
            onClick={() => {
              setError("");
              setMode("parent-signup");
            }}
            type="button"
          >
            Parent sign up
          </button>
        </div>

        <form className="form-stack" onSubmit={handleSubmit}>
          {mode === "parent-signup" ? (
            <label>
              Full name
              <input
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
                required
                type="text"
                value={fullName}
              />
            </label>
          ) : null}

          <label>
            Email address
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <div className="password-field">
              <input
                autoComplete="current-password"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                onClick={() => setShowPassword((current) => !current)}
                title={showPassword ? "Hide password" : "Show password"}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error ? <p className="error-message">{error}</p> : null}

          <button className="primary-button" disabled={busy} type="submit">
            {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Create parent account"}
          </button>
        </form>
      </section>
    </main>
  );
}
