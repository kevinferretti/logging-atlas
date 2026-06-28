"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CATEGORIES, catColor, catGlyph, catLabelOne } from "@/lib/categories";
import { fmtCoord, subLine } from "@/lib/logbook";
import { countCats } from "@/lib/stamps";
import { layoutCluster } from "@/lib/inkstamps";
import InkFilters from "./InkFilters";
import type { Palette } from "@/lib/palettes";
import type { CategoryKey, Entry, LoggedCountry } from "@/lib/types";

export interface NewEntryInput {
  countryId: string;
  category: CategoryKey;
  title: string;
}

interface PassportProps {
  country: LoggedCountry;
  palette: Palette;
  onBack: () => void;
  onAdd: (input: NewEntryInput, file?: File | null) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
}

const mono: CSSProperties = { fontFamily: "'Special Elite',monospace" };

export default function Passport({ country, palette, onBack, onAdd, onDelete }: PassportProps) {
  const [activeCat, setActiveCat] = useState<"all" | CategoryKey>("all");
  const [adding, setAdding] = useState(false);
  const [formCat, setFormCat] = useState<CategoryKey>("recipe");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => countCats(country), [country]);
  const cluster = useMemo(() => layoutCluster(country.entries, country.name), [country]);
  const HERO_W = 380;
  const heroScale = Math.min(1, HERO_W / cluster.width);

  const list = activeCat === "all" ? country.entries : country.entries.filter((e) => e.category === activeCat);

  async function save() {
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      await onAdd({ countryId: country.id, category: formCat, title: t }, formCat === "recipe" ? file : null);
      setTitle("");
      setFile(null);
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  const tabs: Array<{ key: "all" | CategoryKey; label: string; count: number }> = [
    { key: "all", label: "All", count: country.entries.length },
    ...CATEGORIES.map((c) => ({ key: c.key, label: c.label, count: counts[c.key] || 0 })),
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        background: "var(--paper)",
        overflowY: "auto",
        animation: "om-rise .3s ease",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 40px 64px", display: "flex", flexDirection: "column", minHeight: "100%" }}>
        {/* Back nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 22 }}>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              background: "none",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "9px 15px",
              cursor: "pointer",
              ...mono,
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            ← The world
          </button>
          <div style={{ ...mono, fontSize: 11, letterSpacing: 2.5, color: "var(--ink-soft)", textTransform: "uppercase" }}>
            Passport
          </div>
        </div>

        {/* Header + hero stamp */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 34, padding: "4px 2px 2px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...mono, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "var(--sepia)", marginBottom: 10 }}>
              {country.region}
            </div>
            <div style={{ fontFamily: "Marcellus,serif", fontSize: 66, lineHeight: 0.96, color: "var(--ink)", letterSpacing: 0.5 }}>
              {country.name}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginTop: 18, fontFamily: "'EB Garamond',serif", color: "var(--ink-soft)", fontSize: 15.5 }}>
              <span>{fmtCoord(country)}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>
                {country.entries.length} entries · first logged {country.year}
              </span>
            </div>
          </div>
          {/* Stamp cluster — one worn impression per logged entry, on a passport-page card */}
          <div style={{ flex: "0 0 auto", animation: "om-rise .4s ease" }}>
            <InkFilters />
            <div
              style={{
                position: "relative",
                width: cluster.width * heroScale,
                height: cluster.height * heroScale,
                background: "#F3EAD6",
                border: "1px solid #CBBF9E",
                borderRadius: 4,
                boxShadow: "0 10px 30px rgba(40,28,12,.22)",
                overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, width: cluster.width, height: cluster.height, transform: `scale(${heroScale})`, transformOrigin: "top left" }}>
                {cluster.stamps.map((s) => (
                  <div
                    key={s.key}
                    style={{ position: "absolute", width: s.size, height: s.size, left: s.left, top: s.top, transform: `rotate(${s.rot}deg)`, mixBlendMode: "multiply", zIndex: s.z }}
                    dangerouslySetInnerHTML={{ __html: s.svg }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: "repeating-linear-gradient(90deg,var(--line) 0,var(--line) 5px,transparent 5px,transparent 10px)", margin: "26px 0 20px" }} />

        {/* Tabs + add toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tabs.map((t) => {
              const on = activeCat === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveCat(t.key)}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 2,
                    cursor: "pointer",
                    ...mono,
                    fontSize: 11,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    border: `1px solid ${on ? "var(--ink)" : "var(--line)"}`,
                    background: on ? "var(--ink)" : "transparent",
                    color: on ? "var(--paper)" : "var(--ink-soft)",
                  }}
                >
                  {t.label}&nbsp;&nbsp;<span style={{ opacity: 0.6 }}>{t.count}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "none",
              border: "1px dashed var(--sepia)",
              borderRadius: 2,
              padding: "8px 14px",
              cursor: "pointer",
              ...mono,
              fontSize: 11,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "var(--sepia)",
            }}
          >
            ＋ Log an entry
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div
            style={{
              marginBottom: 22,
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 4,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 13,
              animation: "om-rise .25s ease",
            }}
          >
            <div style={{ ...mono, fontSize: 11, letterSpacing: 1.8, textTransform: "uppercase", color: "var(--ink-soft)" }}>
              New entry
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {CATEGORIES.map((c) => {
                const on = formCat === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => {
                      setFormCat(c.key);
                      if (c.key !== "recipe") setFile(null);
                    }}
                    style={{
                      padding: "7px 12px",
                      borderRadius: 2,
                      cursor: "pointer",
                      ...mono,
                      fontSize: 10.5,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      border: `1px solid ${on ? c.color : "var(--line)"}`,
                      background: on ? c.color : "transparent",
                      color: on ? "#F5EEDD" : "var(--ink-soft)",
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="What did you log?"
              style={inputStyle}
              autoFocus
            />
            {formCat === "recipe" && (
              <label style={{ ...mono, fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: "var(--ink-soft)", display: "flex", flexDirection: "column", gap: 6 }}>
                Recipe file (optional)
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: "var(--ink)" }}
                />
              </label>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={save}
                disabled={saving || !title.trim()}
                style={{
                  background: "var(--sepia)",
                  color: "var(--paper)",
                  border: "none",
                  borderRadius: 2,
                  padding: "11px 20px",
                  cursor: saving || !title.trim() ? "default" : "pointer",
                  opacity: saving || !title.trim() ? 0.6 : 1,
                  ...mono,
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  boxShadow: "0 2px 5px rgba(40,28,12,.25)",
                }}
              >
                {saving ? "Stamping…" : "Press the stamp"}
              </button>
              <button
                onClick={() => setAdding(false)}
                style={{ background: "none", border: "none", cursor: "pointer", ...mono, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ink-soft)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entry cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 16 }}>
          {list.length === 0 ? (
            <div style={{ gridColumn: "1/-1", padding: "40px 0", textAlign: "center", fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 16, color: "var(--ink-soft)" }}>
              Nothing logged in this category yet.
            </div>
          ) : (
            list.map((e, i) => <EntryCard key={e.id} entry={e} index={i} onDelete={onDelete} />)
          )}
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

function EntryCard({ entry: e, index: i, onDelete }: { entry: Entry; index: number; onDelete: (id: string) => Promise<void> }) {
  const [hover, setHover] = useState(false);
  const [removing, setRemoving] = useState(false);
  const col = catColor(e.category);
  const sub = subLine(e);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: "var(--paper2)",
        border: `1px solid ${hover ? "var(--sepia)" : "var(--line)"}`,
        borderRadius: 3,
        padding: "16px 16px 13px",
        boxShadow: hover ? "0 8px 18px rgba(40,28,12,.15)" : "0 1px 2px rgba(40,28,12,.08)",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        minHeight: 124,
        transform: hover ? "translateY(-2px)" : "none",
        transition: "transform .16s ease,box-shadow .16s ease,border-color .16s ease",
      }}
    >
      <button
        onClick={async () => {
          if (removing) return;
          setRemoving(true);
          try {
            await onDelete(e.id);
          } finally {
            setRemoving(false);
          }
        }}
        title="Remove entry"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 22,
          height: 22,
          lineHeight: "20px",
          textAlign: "center",
          borderRadius: "50%",
          border: "1px solid var(--line)",
          background: "var(--paper)",
          color: "var(--ink-soft)",
          cursor: "pointer",
          opacity: hover ? 1 : 0,
          transition: "opacity .15s ease",
          fontFamily: "'Special Elite',monospace",
          fontSize: 11,
        }}
      >
        ✕
      </button>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: col,
            color: "#F5EEDD",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Special Elite',monospace",
            fontSize: 14,
            flex: "0 0 auto",
            boxShadow: "0 1px 2px rgba(0,0,0,.25)",
            transform: `rotate(${(i * 53) % 5 - 2}deg)`,
          }}
        >
          {catGlyph(e.category)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 9.5, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4, color: col }}>
            {catLabelOne(e.category)}
          </div>
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 18, lineHeight: 1.16, color: "var(--ink)" }}>{e.title}</div>
          {sub && <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 14, color: "var(--ink-soft)", marginTop: 3 }}>{sub}</div>}
        </div>
      </div>
      {e.note && <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 13.5, lineHeight: 1.42, color: "var(--ink-soft)" }}>{e.note}</div>}
      {e.fileKey && (
        <a href={`/api/files/${e.fileKey}`} target="_blank" rel="noreferrer" style={{ display: "block", textDecoration: "none", marginTop: 2 }}>
          {e.fileType?.startsWith("image/") ? (
            <img
              src={`/api/files/${e.fileKey}`}
              alt={e.fileName ?? "attachment"}
              style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 2, border: "1px solid var(--line)", display: "block" }}
            />
          ) : (
            <span style={{ fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 0.5, color: "var(--sepia)" }}>
              📎 {e.fileName ?? "Attachment"}
            </span>
          )}
        </a>
      )}
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, paddingTop: 9, borderTop: "1px dashed var(--line)" }}>
        <span style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1, color: "var(--red)", transform: "rotate(-3deg)", display: "inline-block" }}>
          LOGGED&nbsp;’{String(e.year).slice(2)}
        </span>
      </div>
    </div>
  );
}
