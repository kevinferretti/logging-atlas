"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { CATEGORIES } from "@/lib/categories";
import { COUNTRY_CATALOG_SORTED } from "@/lib/countries";
import { FIELD_LIMITS, type CategoryKey, type Entry, type NewEntryInput } from "@/lib/types";

interface LogModalProps {
  /** Preselect this country (set when the modal opens from a map click). */
  initialCountryId?: string | null;
  /** When set, the modal edits this entry in place instead of logging a new one. */
  entry?: Entry | null;
  onClose: () => void;
  onSave: (input: NewEntryInput, file?: File | null, removeFile?: boolean) => Promise<void>;
}

// Local calendar date — toISOString() would report yesterday/tomorrow near
// midnight for users away from UTC.
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function LogModal({ initialCountryId, entry, onClose, onSave }: LogModalProps) {
  const editing = entry ?? null;
  const [countryId, setCountryId] = useState(editing?.countryId ?? initialCountryId ?? COUNTRY_CATALOG_SORTED[0]?.id ?? "");
  const [category, setCategory] = useState<CategoryKey>(editing?.category ?? "recipe");
  // Log-vs-wish status; only shown while editing — on create the two Add
  // buttons decide it.
  const [wishlist, setWishlist] = useState(editing?.wishlist ?? false);
  const [title, setTitle] = useState(editing?.title ?? "");
  const [by, setBy] = useState(editing?.by ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [link, setLink] = useState(editing?.link ?? "");
  // Editing keeps the stored date — even blank on entries that predate the
  // field (the API preserves it); a blank date on create means today.
  const [date, setDate] = useState(editing ? editing.date : todayISO());
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  // Which submit button is in flight — the two Add buttons share the form.
  const [saving, setSaving] = useState<false | "log" | "wish">(false);
  const [error, setError] = useState<string | null>(null);

  const keptFile = editing && editing.fileKey && category === "recipe" && !file ? editing : null;

  async function save(wish: boolean) {
    const t = title.trim();
    if (!t || !countryId || saving) return;
    setSaving(wish ? "wish" : "log");
    setError(null);
    try {
      await onSave(
        { countryId, category, wishlist: wish, title: t, by: by.trim(), note: note.trim(), link: link.trim(), date },
        category === "recipe" ? file : null,
        removeFile,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save entry.");
      setSaving(false);
    }
  }

  // Submit on Enter — but not the Enter that commits an IME composition.
  function submitOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) save(editing ? wishlist : false);
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(30,22,10,.42)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, animation: "om-rise .2s ease" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, maxHeight: "100%", overflowY: "auto", background: "var(--paper2)", border: "1px solid var(--sepia)", borderRadius: 5, boxShadow: "0 24px 60px rgba(40,28,12,.4)", padding: 24, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div>
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 24, color: "var(--ink)" }}>{editing ? "Edit entry" : "Log an entry"}</div>
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

        {editing && (
          <div style={{ display: "flex", gap: 8 }}>
            {([["Logged", false], ["☆ Wish list", true]] as [string, boolean][]).map(([label, wish]) => {
              const on = wishlist === wish;
              return (
                <button
                  key={label}
                  onClick={() => setWishlist(wish)}
                  style={{ padding: "7px 12px", borderRadius: 2, cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", border: `1px ${wish ? "dashed" : "solid"} ${on ? "var(--sepia)" : "var(--line)"}`, background: on ? "var(--sepia)" : "transparent", color: on ? "#F5EEDD" : "var(--ink-soft)" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={submitOnEnter} placeholder="Name" maxLength={FIELD_LIMITS.title} style={inputStyle} autoFocus />
        <input value={by} onChange={(e) => setBy(e.target.value)} onKeyDown={submitOnEnter} placeholder={BY_PLACEHOLDER[category]} maxLength={FIELD_LIMITS.by} style={inputStyle} />
        <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={submitOnEnter} placeholder="Note (optional)" maxLength={FIELD_LIMITS.note} style={inputStyle} />
        <input value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={submitOnEnter} placeholder="Link (optional)" style={inputStyle} />
        <label style={labelStyle}>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
        </label>
        {category === "recipe" && (
          <label style={labelStyle}>
            {keptFile ? "Replace recipe file (optional)" : "Recipe file (optional)"}
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: "var(--ink)" }} />
          </label>
        )}
        {keptFile && (
          <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 0.6, color: "var(--ink-soft)", display: "flex", alignItems: "baseline", gap: 8, overflow: "hidden" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: removeFile ? "line-through" : "none" }}>
              ⎘ {keptFile.fileName ?? "attachment"}
            </span>
            <button
              onClick={() => setRemoveFile((r) => !r)}
              style={{ flex: "0 0 auto", background: "none", border: "none", cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: removeFile ? "var(--sepia)" : "var(--red)", padding: 0 }}
            >
              {removeFile ? "Keep it" : "Remove"}
            </button>
          </div>
        )}

        {error && <div style={{ color: "var(--red)", fontFamily: "'EB Garamond',serif", fontSize: 14 }}>{error}</div>}

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 2 }}>
          {editing ? (
            <button
              onClick={() => save(wishlist)}
              disabled={!!saving || !title.trim()}
              style={{ background: "var(--sepia)", color: "var(--paper)", border: "1px solid var(--sepia)", borderRadius: 2, padding: "11px 18px", cursor: saving || !title.trim() ? "default" : "pointer", opacity: saving || !title.trim() ? 0.6 : 1, fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", boxShadow: "0 2px 5px rgba(40,28,12,.25)" }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          ) : (
            <>
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
            </>
          )}
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
