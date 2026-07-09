"use client";

// Style 2 — "The Pinboard": every entry is an index card pinned at a slight
// angle, masonry columns, with a navy passport booklet as the hero button.

import { category } from "@/lib/categories";
import { fmtCoord, subLine } from "@/lib/logbook";
import type { Entry } from "@/lib/types";
import { DISPLAY, MONO, SERIF, entryDateParts, fileHref, isImage, linkHost, ratingStars, relationNote, splitEntries, type VariantProps } from "./shared";

// Deterministic little tilts so the board looks hand-pinned but stable.
const TILTS = [-1.1, 0.8, -0.5, 1.3, -0.9, 0.4];

export default function PostcardsVariant({ country: c, onBack, onPassport, onAdd, onEdit, onDelete }: VariantProps) {
  const { logs, wishes } = splitEntries(c);
  // Newest first — the board reads like fresh pins on top.
  const cards: Entry[] = [...logs].reverse().concat(wishes);
  return (
    <div style={{ maxWidth: 1020, margin: "0 auto", padding: "26px 28px 140px" }}>
      <button onClick={onBack} style={ghostBtn}>← The world</button>

      {/* Header */}
      <div style={{ textAlign: "center", marginTop: 18 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 3.5, color: "var(--sepia)" }}>POSTCARDS FROM</div>
        <div style={{ fontFamily: DISPLAY, fontSize: 56, lineHeight: 1.05, color: "var(--ink)", marginTop: 6 }}>{c.name}</div>
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.6, color: "var(--ink-soft)", marginTop: 10 }}>
          {c.region.toUpperCase()} · {fmtCoord(c)} · {c.logCount} {c.logCount === 1 ? "LOG" : "LOGS"}
          {c.wishCount > 0 ? ` · ${c.wishCount} WISHED` : ""}
        </div>

        {/* Passport booklet + add */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 24 }}>
          <button
            onClick={onPassport}
            title="Open the passport at this country"
            style={{
              background: "linear-gradient(160deg,#26355A,#1C2743)",
              border: "1.5px solid #C9A961",
              borderRadius: 6,
              padding: "13px 30px",
              cursor: "pointer",
              boxShadow: "0 6px 18px rgba(20,14,4,.35), inset 0 0 0 3px rgba(201,169,97,.25)",
              color: "#E7D7A8",
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: 3 }}>WORLOG</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 15, letterSpacing: 4 }}>PASSPORT</span>
            <span style={{ fontSize: 9, opacity: 0.85 }}>✦</span>
          </button>
          <button onClick={onAdd} style={dashBtn}>＋ Log an entry</button>
        </div>
      </div>

      {/* The board */}
      <div style={{ columns: "260px 3", columnGap: 22, marginTop: 40 }}>
        {cards.map((e, i) => (
          <Card key={e.id} e={e} tilt={TILTS[i % TILTS.length]} also={relationNote(e, c.id)} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function Card({ e, tilt, also, onEdit, onDelete }: { e: Entry; tilt: number; also: string | null; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const cat = category(e.category);
  const sub = subLine(e);
  const file = fileHref(e);
  const d = entryDateParts(e);
  const stars = ratingStars(e);
  return (
    <div
      style={{
        breakInside: "avoid",
        display: "inline-block",
        width: "100%",
        marginBottom: 22,
        transform: `rotate(${tilt}deg)`,
        background: "var(--paper2)",
        border: e.wishlist ? "1.5px dashed var(--sepia)" : "1px solid var(--line)",
        boxShadow: "0 5px 16px var(--shadow)",
        padding: "13px 15px 11px",
        position: "relative",
      }}
    >
      {/* Postage-stamp corner */}
      <div
        style={{
          position: "absolute",
          top: 9,
          right: 9,
          width: 26,
          height: 30,
          border: `1px dashed ${cat?.color}`,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: MONO,
          fontSize: 12,
          color: cat?.color,
          opacity: 0.85,
          transform: "rotate(3deg)",
        }}
      >
        {e.wishlist ? "☆" : cat?.glyph}
      </div>

      <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.6, textTransform: "uppercase", color: cat?.color, paddingRight: 36 }}>
        {e.wishlist ? "wish · " : ""}{cat?.one}{e.nationalDish ? " · national dish" : ""}{e.wishlist ? "" : d ? ` · ${d.day} ${d.month} ’${d.year.slice(2)}` : ` · ’${String(e.year).slice(2)}`}
      </div>
      {isImage(e) && file && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={file} alt={e.fileName ?? e.title} style={{ width: "100%", marginTop: 10, border: "1px solid var(--line)", display: "block" }} />
      )}
      <div style={{ fontFamily: DISPLAY, fontSize: 21, lineHeight: 1.15, color: "var(--ink)", marginTop: 8, paddingRight: 26 }}>{e.title}</div>
      {sub && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14.5, color: "var(--ink-soft)", marginTop: 3 }}>{sub}</div>}
      {stars && <div style={{ fontSize: 11.5, letterSpacing: 2, color: "var(--sepia)", marginTop: 4 }}>{stars}</div>}
      {also && <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-soft)", marginTop: 5 }}>{also}</div>}
      {e.note && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: "var(--ink-soft)", opacity: 0.9, marginTop: 7 }}>“{e.note}”</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 7 }}>
        <div style={{ minWidth: 0, display: "flex", gap: 10 }}>
          {e.link && (
            <a href={e.link} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--sepia)", textDecoration: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ↗ {linkHost(e.link)}
            </a>
          )}
          {file && !isImage(e) && (
            <a href={file} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--sepia)", textDecoration: "none", whiteSpace: "nowrap" }}>
              ⎘ file
            </a>
          )}
        </div>
        <div style={{ display: "flex", gap: 2, flex: "0 0 auto" }}>
          <button onClick={() => onEdit(e.id)} title="Edit entry" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.5, fontSize: 10.5, padding: 2 }}>
            ✎
          </button>
          <button onClick={() => onDelete(e.id)} title="Remove entry" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", opacity: 0.5, fontSize: 10.5, padding: 2 }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

const dashBtn: React.CSSProperties = {
  background: "none",
  color: "var(--sepia)",
  border: "1px dashed var(--sepia)",
  borderRadius: 2,
  padding: "9px 15px",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: 1.5,
  textTransform: "uppercase",
};

const ghostBtn: React.CSSProperties = {
  background: "none",
  color: "var(--ink-soft)",
  border: "1px solid var(--line)",
  borderRadius: 2,
  padding: "9px 15px",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: 1.5,
  textTransform: "uppercase",
};
