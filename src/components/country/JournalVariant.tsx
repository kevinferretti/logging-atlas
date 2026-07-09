"use client";

// Style 3 — "The Journal": a narrow reading column with a chronological
// spine — years as waypoints, entries as diary lines, wishes as a dashed
// "someday" stretch at the end.

import { category } from "@/lib/categories";
import { fmtCoord, subLine } from "@/lib/logbook";
import type { Entry } from "@/lib/types";
import { DISPLAY, MONO, SERIF, entryDateParts, fileHref, linkHost, splitEntries, type VariantProps } from "./shared";

export default function JournalVariant({ country: c, onBack, onPassport, onAdd, onEdit, onDelete }: VariantProps) {
  const { logs, wishes } = splitEntries(c);
  // Group the (already chronological) logs into year runs.
  const byYear: [number, Entry[]][] = [];
  for (const e of logs) {
    const last = byYear[byYear.length - 1];
    if (last && last[0] === e.year) last[1].push(e);
    else byYear.push([e.year, [e]]);
  }
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "26px 24px 140px" }}>
      <button onClick={onBack} style={ghostBtn}>← The world</button>

      {/* Header */}
      <div style={{ marginTop: 34 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 3, color: "var(--sepia)" }}>THE JOURNAL</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 48, lineHeight: 1.05, color: "var(--ink)", marginTop: 8 }}>{c.name}</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "var(--ink-soft)", marginTop: 8 }}>
          Everything logged from {c.name}, in the order it happened.
        </div>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 1.6, color: "var(--ink-soft)", marginTop: 10 }}>
          {c.region.toUpperCase()} · {fmtCoord(c)}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onPassport} style={solidBtn}>🛂 Open passport</button>
          <button onClick={onAdd} style={dashBtn}>＋ Log an entry</button>
        </div>
      </div>

      {/* Spine */}
      <div style={{ marginTop: 46, marginLeft: 8 }}>
        {byYear.length === 0 && (
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "var(--ink-soft)", paddingBottom: 20 }}>
            Nothing logged yet — only wishes below.
          </div>
        )}
        {byYear.map(([year, list]) => (
          <div key={year} style={{ position: "relative", borderLeft: "2px solid var(--line)", paddingLeft: 32, paddingBottom: 18 }}>
            <div style={{ position: "absolute", left: -7, top: 0, width: 12, height: 12, borderRadius: "50%", background: "var(--sepia)", border: "2px solid var(--paper)" }} />
            <div style={{ fontFamily: DISPLAY, fontSize: 25, color: "var(--ink)", transform: "translateY(-8px)" }}>{year}</div>
            {list.map((e) => (
              <JEntry key={e.id} e={e} hollow={false} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        ))}

        {wishes.length > 0 && (
          <div style={{ position: "relative", borderLeft: "2px dashed var(--sepia)", paddingLeft: 32, paddingBottom: 6 }}>
            <div style={{ position: "absolute", left: -7, top: 0, width: 12, height: 12, borderRadius: "50%", background: "var(--paper)", border: "2px solid var(--sepia)" }} />
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 3, color: "var(--sepia)", transform: "translateY(-5px)" }}>SOMEDAY</div>
            {wishes.map((e) => (
              <JEntry key={e.id} e={e} hollow onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function JEntry({ e, hollow, onEdit, onDelete }: { e: Entry; hollow: boolean; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const cat = category(e.category);
  const sub = subLine(e);
  const file = fileHref(e);
  // The year is already the waypoint heading, so the line shows only day+month.
  const d = hollow ? null : entryDateParts(e);
  return (
    <div style={{ position: "relative", margin: "14px 0 22px" }}>
      <div
        style={{
          position: "absolute",
          left: -37,
          top: 7,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: hollow ? "transparent" : cat?.color,
          border: hollow ? `2px solid ${cat?.color}` : "none",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.6, textTransform: "uppercase", color: cat?.color }}>
            {hollow ? "☆ " : ""}{cat?.one}{d ? ` · ${d.day} ${d.month}` : ""}
          </span>
          <div style={{ fontFamily: DISPLAY, fontSize: 20, lineHeight: 1.2, color: "var(--ink)", marginTop: 2, fontStyle: hollow ? "italic" : "normal" }}>{e.title}</div>
          {sub && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14.5, color: "var(--ink-soft)", marginTop: 2 }}>{sub}</div>}
          {e.note && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14.5, color: "var(--ink-soft)", opacity: 0.9, marginTop: 5 }}>“{e.note}”</div>}
          <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
            {e.link && (
              <a href={e.link} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--sepia)", textDecoration: "none" }}>
                ↗ {linkHost(e.link)}
              </a>
            )}
            {file && (
              <a href={file} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--sepia)", textDecoration: "none" }}>
                ⎘ {e.fileName ?? "attachment"}
              </a>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2, flex: "0 0 auto" }}>
          <button onClick={() => onEdit(e.id)} title="Edit entry" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.45, fontSize: 10.5, padding: 2 }}>
            ✎
          </button>
          <button onClick={() => onDelete(e.id)} title="Remove entry" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.45, fontSize: 10.5, padding: 2 }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  borderRadius: 2,
  padding: "9px 15px",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: 1.5,
  textTransform: "uppercase",
};

const solidBtn: React.CSSProperties = {
  ...btnBase,
  background: "var(--sepia)",
  color: "var(--paper)",
  border: "1px solid var(--sepia)",
  boxShadow: "0 2px 5px rgba(40,28,12,.25)",
};

const dashBtn: React.CSSProperties = {
  ...btnBase,
  background: "none",
  color: "var(--sepia)",
  border: "1px dashed var(--sepia)",
};

const ghostBtn: React.CSSProperties = {
  ...btnBase,
  background: "none",
  color: "var(--ink-soft)",
  border: "1px solid var(--line)",
};
