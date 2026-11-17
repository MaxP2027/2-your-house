"use client";
import { useState, useEffect } from "react";
export default function AccountForm({
  mode,
  role = "customer",
}: {
  mode: "signup" | "login" | "resend" | "logout";
  role?: string;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/" + mode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Please try again.");
      if (mode === "resend") {
        setMessage("If confirmation is needed, an email is on its way.");
        setCooldown(60);
      } else {
        window.location.assign(
          mode === "signup"
            ? "/check-email"
            : mode === "logout"
              ? "/"
              : "/dashboard",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect. Please try again.",
      );
      for (const el of Array.from(form.elements)) {
        if (el instanceof HTMLInputElement && el.type === "password")
          el.value = "";
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      {mode === "signup" && (
        <>
          <label>
            Full name
            <input
              name="fullName"
              autoComplete="name"
              required
              maxLength={100}
            />
          </label>
          <label>
            Account type
            <select name="role" defaultValue={role}>
              <option value="customer">Customer</option>
              <option value="technician">Technician</option>
            </select>
          </label>
        </>
      )}
      {mode !== "logout" && (
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
      )}
      {(mode === "signup" || mode === "login") && (
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            minLength={mode === "signup" ? 12 : undefined}
            required
          />
        </label>
      )}
      {mode === "signup" && (
        <>
          <p className="note">Use at least 12 characters.</p>
          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
            />
          </label>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button disabled={busy || cooldown > 0}>
        {busy
          ? "Please wait…"
          : cooldown
            ? "Resend in " + cooldown + "s"
            : {
                signup: "Create account",
                login: "Log in",
                resend: "Resend confirmation email",
                logout: "Log out",
              }[mode]}
      </button>
    </form>
  );
}
