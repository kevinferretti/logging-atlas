"use client";

// Style 4 — "The Dossier": a bureau case file in a manila folder — typewriter
// cover sheet, a worn ink stamp, category tabs, entries as numbered exhibits.

import { useState } from "react";
import { CATEGORIES, category } from "@/lib/categories";
import { fmtCoord, subLine } from "@/lib/logbook";
import { buildEntryStamp } from "@/lib/inkstamps";
import type { CategoryKey, Entry } from "@/lib/types";
import { DISPLAY, MONO, SERIF, entryDateParts, fileHref, linkHost, ratingStars, relationNote, splitEntries, type VariantProps } from "./shared";

export default function DossierVariant({ country: c, dark, onBack, onPassport, onAdd, onEdit, onDelete }: VariantProps) {
  const { logs, wishes } = splitEntries(c);
  const [tab, setTab] = useState<CategoryKey | "all">("all");
  const present = CATEGORIES.filter((k) => c.entries.some((e) => e.category === k.key));
  const shown = [...logs, ...wishes].filter((e) => tab === "all" || e.category === tab);
  const stampFor = logs[0] ?? wishes[0];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "26px 24px 140px" }}>
      <button onClick={onBack} style={ghostBtn}>← The world</button>

      {/* Folder */}
      <div style={{ marginTop: 30 }}>
        <div style={{ display: "inline-block", background: "var(--panel)", border: "1px solid var(--line)", borderBottom: "none", borderRadius: "6px 6px 0 0", padding: "9px 20px 7px", fontFamily: MONO, fontSize: 10, letterSpacing: 2, color: "var(--ink-soft)" }}>
          FILE · {c.name.toUpperCase()}
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "0 6px 6px 6px", padding: "32px 36px 42px", boxShadow: "0 10px 30px var(--shadow)" }}>
          {/* Cover sheet */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 22 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 3, color: "var(--ink-soft)" }}>BUREAU OF THINGS LOGGED</div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: 2, color: "var(--ink-soft)", marginTop: 5 }}>CASE FILE No. ATL-{c.id.toUpperCase()}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 44, lineHeight: 1.05, color: "var(--ink)", marginTop: 16 }}>{c.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "7px 26px", marginTop: 18, fontFamily: MONO, fontSize: 10.5, letterSpacing: 1, color: "var(--ink)", width: "fit-content" }}>
                <Meta k="REGION" v={c.region.toUpperCase()} />
                <Meta k="COORDINATES" v={fmtCoord(c)} />
                <Meta k="FIRST LOGGED" v={String(c.year)} />
                <Meta k="ENTRIES" v={`${c.logCount} LOGGED · ${c.wishCount} WISHED`} />
              </div>
            </div>
            {stampFor && (
              <div
                style={{ flex: "0 0 auto", transform: "rotate(9deg)", opacity: 0.9, marginTop: 8 }}
                dangerouslySetInnerHTML={{ __html: buildEntryStamp(stampFor, c.name, 128, 4, dark) }}
              />
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 26 }}>
            <button
              onClick={onPassport}
              style={{
                background: "none",
                border: "2px solid var(--red)",
                borderRadius: 3,
                color: "var(--red)",
                padding: "10px 18px",
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: 2,
                textTransform: "uppercase",
                transform: "rotate(-2deg)",
              }}
            >
              ★ Open passport ★
            </button>
            <button onClick={onAdd} style={dashBtn}>＋ Log an entry</button>
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 30, borderBottom: "1.5px solid var(--ink)", paddingBottom: 10 }}>
            <TabBtn on={tab === "all"} label={`ALL · ${c.entries.length}`} onClick={() => setTab("all")} />
            {present.map((k) => (
              <TabBtn key={k.key} on={tab === k.key} label={`${k.label.toUpperCase()} · ${c.entries.filter((e) => e.category === k.key).length}`} onClick={() => setTab(k.key)} />
            ))}
          </div>

          {/* Exhibits */}
          {shown.map((e, i) => (
            <Exhibit key={e.id} e={e} no={String(i + 1).padStart(2, "0")} also={relationNote(e, c.id, "Cross-filed ·")} onEdit={onEdit} onDelete={onDelete} />
          ))}
          {shown.length === 0 && (
            <div style={{ padding: "26px 0", fontFamily: SERIF, fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)" }}>Nothing under this heading.</div>
          )}

          <div style={{ marginTop: 34, fontFamily: MONO, fontSize: 9, letterSpacing: 2.5, color: "var(--ink-soft)", opacity: 0.7, textAlign: "center" }}>
            NOTHING FOLLOWS
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span style={{ color: "var(--ink-soft)", fontSize: 9 }}>{k}</span>
      <span>{v}</span>
    </>
  );
}

function TabBtn({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: "1px solid " + (on ? "var(--ink)" : "var(--line)"),
        background: on ? "var(--ink)" : "transparent",
        color: on ? "var(--paper)" : "var(--ink-soft)",
        borderRadius: 2,
        padding: "6px 11px",
        cursor: "pointer",
        fontFamily: MONO,
        fontSize: 9.5,
        letterSpacing: 1.2,
        transition: "all .15s ease",
      }}
    >
      {label}
    </button>
  );
}

function Exhibit({ e, no, also, onEdit, onDelete }: { e: Entry; no: string; also: string | null; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const cat = category(e.category);
  const sub = subLine(e);
  const file = fileHref(e);
  const d = entryDateParts(e);
  const stars = ratingStars(e);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "16px 2px", borderBottom: "1px dotted var(--line)" }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 2, color: "var(--ink-soft)" }}>
          EXHIBIT {no} · <span style={{ color: cat?.color }}>{cat?.one.toUpperCase()}</span>
          {e.nationalDish && <> · <span style={{ color: "var(--sepia)" }}>NATIONAL DISH</span></>}
          {e.wishlist ? " · ☆ WISH LIST" : d ? ` · ${d.day} ${d.month} ${d.year}` : ` · ${e.year}`}
          {stars && <> · <span style={{ color: "var(--sepia)", letterSpacing: 1 }}>{stars}</span></>}
        </div>
        <div style={{ fontFamily: "'Courier Prime',monospace", fontWeight: 700, fontSize: 16.5, color: "var(--ink)", marginTop: 4, fontStyle: e.wishlist ? "italic" : "normal" }}>
          {e.title}
        </div>
        {sub && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: "var(--ink-soft)", marginTop: 1 }}>{sub}</div>}
        {also && <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-soft)", marginTop: 3 }}>{also}</div>}
        {e.note && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: "var(--ink-soft)", opacity: 0.9, marginTop: 4 }}>“{e.note}”</div>}
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
      <div style={{ flex: "0 0 auto", alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 6 }}>
        <button onClick={() => onEdit(e.id)} title="Edit entry" style={fileBtn}>
          AMEND
        </button>
        <button onClick={() => onDelete(e.id)} title="Remove entry" style={fileBtn}>
          STRIKE
        </button>
      </div>
    </div>
  );
}

const fileBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--line)",
  borderRadius: 2,
  color: "var(--ink-soft)",
  padding: "3px 8px",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 8.5,
  letterSpacing: 1.5,
};

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
