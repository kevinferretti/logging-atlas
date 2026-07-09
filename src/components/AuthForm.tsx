"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register" | "forgot";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Confirmation shown after a reset request; identical whether or not the
  // address has an account, so the form can't be used to probe emails.
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setNotice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Something went wrong.");
        }
        setNotice("If that address holds an account, a one-time reset link has been issued. This atlas sends no mail — the link is written to the server log, so ask its keeper (or check the log yourself).");
        setBusy(false);
        return;
      }
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
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
          <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--line)", paddingBottom: 14 }}>
            {(["login", "register"] as Mode[]).map((m) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 2, cursor: "pointer", border: "none", fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", background: on ? "var(--ink)" : "transparent", color: on ? "var(--paper)" : "var(--ink-soft)" }}
                >
                  {m === "login" ? "Sign in" : "Create account"}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {mode === "forgot" && (
              <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 14.5, color: "var(--ink-soft)" }}>
                Enter your email and a one-time reset link will be issued.
              </div>
            )}
            {mode === "register" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" style={inputStyle} />
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" style={inputStyle} required />
            {mode !== "forgot" && (
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={mode === "register" ? "Password (8+ characters)" : "Password"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                style={inputStyle}
                required
              />
            )}

            {error && <div style={{ color: "var(--red)", fontFamily: "'EB Garamond',serif", fontSize: 14.5 }}>{error}</div>}
            {notice && <div style={{ color: "var(--ink-soft)", fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 14.5 }}>{notice}</div>}

            <button
              type="submit"
              disabled={busy}
              style={{ background: "var(--sepia)", color: "var(--paper)", border: "none", borderRadius: 2, padding: "12px 20px", cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "'Special Elite',monospace", fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", boxShadow: "0 2px 5px rgba(40,28,12,.25)", marginTop: 4 }}
            >
              {busy ? "Please wait…" : mode === "login" ? "Enter Worlog" : mode === "register" ? "Begin your Worlog" : "Issue reset link"}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, alignSelf: "center", fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-soft)" }}
              >
                Forgot password?
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, alignSelf: "center", fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-soft)" }}
              >
                ← Back to sign in
              </button>
            )}
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <a
            href="https://github.com/kevinferretti/logging-atlas"
            target="_blank"
            rel="noreferrer noopener"
            style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.6, color: "var(--ink-soft)", opacity: 0.75, textDecoration: "none" }}
          >
            SOURCE&nbsp;↗
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
