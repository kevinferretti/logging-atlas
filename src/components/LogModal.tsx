"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { CATEGORIES } from "@/lib/categories";
import { COUNTRY_CATALOG_SORTED } from "@/lib/countries";
import type { CategoryKey, NewEntryInput } from "@/lib/types";

interface LogModalProps {
  /** Preselect this country (set when the modal opens from a map click). */
  initialCountryId?: string | null;
  onClose: () => void;
  onSave: (input: NewEntryInput, file?: File | null) => Promise<void>;
}

// Local calendar date — toISOString() would report yesterday/tomorrow near
// midnight for users away from UTC.
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LogModal({ initialCountryId, onClose, onSave }: LogModalProps) {
  const [countryId, setCountryId] = useState(initialCountryId ?? COUNTRY_CATALOG_SORTED[0]?.id ?? "");
  const [category, setCategory] = useState<CategoryKey>("recipe");
  const [title, setTitle] = useState("");
  const [by, setBy] = useState("");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");
  const [date, setDate] = useState(todayISO());
  const [file, setFile] = useState<File | null>(null);
  // Which submit button is in flight — the two Add buttons share the form.
  const [saving, setSaving] = useState<false | "log" | "wish">(false);
  const [error, setError] = useState<string | null>(null);

  async function save(wishlist: boolean) {
    const t = title.trim();
    if (!t || !countryId || saving) return;
    setSaving(wishlist ? "wish" : "log");
    setError(null);
    try {
      await onSave(
        { countryId, category, wishlist, title: t, by: by.trim(), note: note.trim(), link: link.trim(), date },
        category === "recipe" ? file : null,
      );
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
                {c.name}
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

        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save(false)} placeholder="Name" maxLength={200} style={inputStyle} autoFocus />
        <input value={by} onChange={(e) => setBy(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save(false)} placeholder={BY_PLACEHOLDER[category]} maxLength={120} style={inputStyle} />
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save(false)} placeholder="Note (optional)" maxLength={500} style={inputStyle} />
        <input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save(false)} placeholder="Link (optional)" style={inputStyle} />
        <label style={labelStyle}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </label>
        {category === "recipe" && (
          <label style={labelStyle}>
            Recipe file (optional)
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: "var(--ink)" }} />
          </label>
        )}

        {error && <div style={{ color: "var(--red)", fontFamily: "'EB Garamond',serif", fontSize: 14 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 2 }}>
          <button
            onClick={() => save(false)}
            disabled={!!saving || !title.trim()}
            style={{ background: "var(--sepia)", color: "var(--paper)", border: "1px solid var(--sepia)", borderRadius: 2, padding: "11px 18px", cursor: saving || !title.trim() ? "default" : "pointer", opacity: saving || !title.trim() ? 0.6 : 1, fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", boxShadow: "0 2px 5px rgba(40,28,12,.25)" }}
          >
            {saving === "log" ? "Stamping…" : "Add log"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={!!saving || !title.trim()}
            title="Something you want to do or make — it won't color the map until you log it for real"
            style={{ background: "none", color: "var(--sepia)", border: "1px dashed var(--sepia)", borderRadius: 2, padding: "11px 18px", cursor: saving || !title.trim() ? "default" : "pointer", opacity: saving || !title.trim() ? 0.6 : 1, fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}
          >
            {saving === "wish" ? "Stamping…" : "☆ Add to wish list"}
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ink-soft)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Byline placeholder phrased per category, matching how subLine renders it.
const BY_PLACEHOLDER: Record<CategoryKey, string> = {
  recipe: "From — cook or source (optional)",
  book: "By — author (optional)",
  movie: "Director (optional)",
  music: "By — artist (optional)",
  place: "With — company or guide (optional)",
};

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
