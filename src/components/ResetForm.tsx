"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

// New-password form behind a reset link. On success the API signs the user
// in (they just proved control of the link), so this goes straight home.
export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Something went wrong.");
      }
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--paper)" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 34, letterSpacing: 9, color: "var(--ink)" }}>WORLOG</div>
        </div>

        <div style={{ background: "var(--paper2)", border: "1px solid var(--line)", borderRadius: 5, boxShadow: "0 18px 46px rgba(40,28,12,.18)", padding: 26 }}>
          <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-soft)", borderBottom: "1px solid var(--line)", paddingBottom: 14, marginBottom: 20 }}>
            Choose a new password
          </div>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="New password (8+ characters)"
              autoComplete="new-password"
              style={inputStyle}
              required
              autoFocus
            />
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              type="password"
              placeholder="Repeat it"
              autoComplete="new-password"
              style={inputStyle}
              required
            />

            {error && <div style={{ color: "var(--red)", fontFamily: "'EB Garamond',serif", fontSize: 14.5 }}>{error}</div>}

            <button
              type="submit"
              disabled={busy}
              style={{ background: "var(--sepia)", color: "var(--paper)", border: "none", borderRadius: 2, padding: "12px 20px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "'Special Elite',monospace", fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", boxShadow: "0 2px 5px rgba(40,28,12,.25)", marginTop: 4 }}
            >
              {busy ? "Please wait…" : "Set password & sign in"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <a href="/login" style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.6, color: "var(--ink-soft)", opacity: 0.75, textDecoration: "none" }}>
            ← BACK TO SIGN IN
          </a>
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  fontFamily: "'EB Garamond',serif",
  fontSize: 16,
  padding: "12px 14px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "var(--paper)",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
};
