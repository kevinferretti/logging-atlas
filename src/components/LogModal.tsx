"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { CATEGORIES } from "@/lib/categories";
import { COUNTRY_CATALOG_SORTED } from "@/lib/countries";
import type { NewEntryInput } from "./Passport";
import type { CategoryKey } from "@/lib/types";

interface LogModalProps {
  onClose: () => void;
  onSave: (input: NewEntryInput, file?: File | null) => Promise<void>;
}

export default function LogModal({ onClose, onSave }: LogModalProps) {
  const [countryId, setCountryId] = useState(COUNTRY_CATALOG_SORTED[0]?.id ?? "");
  const [category, setCategory] = useState<CategoryKey>("recipe");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const t = title.trim();
    if (!t || !countryId || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ countryId, category, title: t }, category === "recipe" ? file : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save entry.");
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(30,22,10,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "om-rise .2s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: "var(--paper2)", border: "1px solid var(--sepia)", borderRadius: 5, boxShadow: "0 24px 60px rgba(40,28,12,.4)", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div>
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 24, color: "var(--ink)" }}>Log an entry</div>
        </div>

        <label style={labelStyle}>
          Country
          <select value={countryId} onChange={(e) => setCountryId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {COUNTRY_CATALOG_SORTED.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.region}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => {
            const on = category === c.key;
            return (
              <button
                key={c.key}
                onClick={() => {
                  setCategory(c.key);
                  if (c.key !== "recipe") setFile(null);
                }}
                style={{ padding: "7px 12px", borderRadius: 2, cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", border: `1px solid ${on ? c.color : "var(--line)"}`, background: on ? c.color : "transparent", color: on ? "#F5EEDD" : "var(--ink-soft)" }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="What did you log?" style={inputStyle} autoFocus />
        {category === "recipe" && (
          <label style={labelStyle}>
            Recipe file (optional)
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: "var(--ink)" }} />
          </label>
        )}

        {error && <div style={{ color: "var(--red)", fontFamily: "'EB Garamond',serif", fontSize: 14 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 2 }}>
          <button
            onClick={save}
            disabled={saving || !title.trim()}
            style={{ background: "var(--sepia)", color: "var(--paper)", border: "none", borderRadius: 2, padding: "11px 20px", cursor: saving || !title.trim() ? "default" : "pointer", opacity: saving || !title.trim() ? 0.6 : 1, fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", boxShadow: "0 2px 5px rgba(40,28,12,.25)" }}
          >
            {saving ? "Stamping…" : "Press the stamp"}
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ink-soft)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  fontFamily: "'EB Garamond',serif",
  fontSize: 16,
  padding: "11px 13px",
  border: "1px solid var(--line)",
  borderRadius: 2,
  background: "var(--paper)",
  color: "var(--ink)",
  outline: "none",
  width: "100%",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontFamily: "'Special Elite',monospace",
  fontSize: 10,
  letterSpacing: 1.4,
  textTransform: "uppercase",
  color: "var(--ink-soft)",
};
