"use client";

// Style 5 — "The Gazette": a broadsheet front page. Masthead and dateline,
// the latest log as the lead story, the rest as clippings in ruled columns,
// and the wish list boxed as upcoming attractions.

import { category } from "@/lib/categories";
import { fmtCoord, subLine } from "@/lib/logbook";
import type { Entry } from "@/lib/types";
import { DISPLAY, MONO, SERIF, alsoCovers, entryDateParts, fileHref, linkHost, ratingStars, splitEntries, type VariantProps } from "./shared";

export default function GazetteVariant({ country: c, onBack, onPassport, onAdd, onEdit, onDelete }: VariantProps) {
  const { logs, wishes } = splitEntries(c);
  const lead = logs[logs.length - 1];
  // Below the fold: everything else, newest first.
  const rest = logs.slice(0, -1).reverse();

  return (
    <div style={{ maxWidth: 1020, margin: "0 auto", padding: "24px 28px 140px" }}>
      {/* Chrome */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={ghostBtn}>← The world</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onPassport} style={inkBtn}>Consult passport →</button>
          <button onClick={onAdd} style={dashBtn}>＋ File a story</button>
        </div>
      </div>

      {/* Masthead */}
      <div style={{ borderTop: "1px solid var(--ink)", borderBottom: "1px solid var(--ink)", marginTop: 20, padding: "3px 0" }}>
        <div style={{ borderTop: "3px solid var(--ink)", borderBottom: "3px solid var(--ink)", padding: "20px 12px 16px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Marcellus SC',Marcellus,serif", fontSize: 46, letterSpacing: 3, lineHeight: 1.05, color: "var(--ink)" }}>
            The {c.name} Gazette
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, borderBottom: "1px solid var(--ink)", padding: "8px 4px", fontFamily: MONO, fontSize: 9.5, letterSpacing: 1.4, color: "var(--ink-soft)", flexWrap: "wrap" }}>
        <span>VOL. {Math.max(1, c.logCount)} · {c.logCount} {c.logCount === 1 ? "LOG" : "LOGS"}{c.wishCount > 0 ? ` · ${c.wishCount} WISHED` : ""}</span>
        <span>{c.region.toUpperCase()} EDITION — EST. {c.year}</span>
        <span>{fmtCoord(c)}</span>
      </div>

      {/* Lead story */}
      {lead ? (
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "30px 0 26px", textAlign: "center" }}>
          <Kicker e={lead} />
          <div style={{ fontFamily: DISPLAY, fontSize: 38, lineHeight: 1.12, color: "var(--ink)", marginTop: 8 }}>{lead.title}</div>
          {subLine(lead) && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "var(--ink-soft)", marginTop: 7 }}>{subLine(lead)}</div>}
          {ratingStars(lead) && <div style={{ fontSize: 14, letterSpacing: 3, color: "var(--sepia)", marginTop: 8 }}>{ratingStars(lead)}</div>}
          {alsoCovers(lead, c.id) && (
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--ink-soft)", marginTop: 8 }}>
              ALSO REPORTED FROM {alsoCovers(lead, c.id)}
            </div>
          )}
          {lead.note && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "var(--ink)", opacity: 0.85, marginTop: 12 }}>“{lead.note}”</div>}
          <Refs e={lead} onEdit={onEdit} onDelete={onDelete} center />
        </div>
      ) : (
        <div style={{ padding: "30px 0 26px", textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: 17, color: "var(--ink-soft)" }}>
          Nothing printed yet — the wish list waits below the fold.
        </div>
      )}

      {/* Columns */}
      {rest.length > 0 && (
        <div style={{ borderTop: "3px double var(--ink)", paddingTop: 24, columns: "250px 3", columnGap: 30, columnRule: "1px solid var(--line)" }}>
          {rest.map((e) => (
            <div key={e.id} style={{ breakInside: "avoid", paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--line)" }}>
              <Kicker e={e} />
              <div style={{ fontFamily: DISPLAY, fontSize: 20, lineHeight: 1.18, color: "var(--ink)", marginTop: 4 }}>{e.title}</div>
              {subLine(e) && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: "var(--ink-soft)", marginTop: 2 }}>{subLine(e)}</div>}
              {ratingStars(e) && <div style={{ fontSize: 11.5, letterSpacing: 2, color: "var(--sepia)", marginTop: 3 }}>{ratingStars(e)}</div>}
              {alsoCovers(e, c.id) && (
                <div style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-soft)", marginTop: 3 }}>ALSO {alsoCovers(e, c.id)}</div>
              )}
              {e.note && <div style={{ fontFamily: SERIF, fontSize: 14.5, color: "var(--ink)", opacity: 0.85, marginTop: 6 }}>{e.note}</div>}
              <Refs e={e} onEdit={onEdit} onDelete={onDelete} />
            </div>
          ))}
        </div>
      )}

      {/* Wish list — the classifieds box */}
      {wishes.length > 0 && (
        <div style={{ marginTop: 36, border: "3px double var(--ink)", padding: "18px 24px 20px" }}>
          <div style={{ textAlign: "center", fontFamily: MONO, fontSize: 10.5, letterSpacing: 3.5, color: "var(--ink)", borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
            UPCOMING ATTRACTIONS ★ THE WISH LIST
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 34px", justifyContent: "center", marginTop: 16 }}>
            {wishes.map((e) => {
              const cat = category(e.category);
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.4, color: cat?.color }}>☆ {cat?.one.toUpperCase()}</span>
                  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16.5, color: "var(--ink)" }}>{e.title}</span>
                  <button onClick={() => onEdit(e.id)} title="Edit entry" style={xBtn}>✎</button>
                  <button onClick={() => onDelete(e.id)} title="Remove entry" style={xBtn}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Kicker({ e }: { e: Entry }) {
  const cat = category(e.category);
  const d = entryDateParts(e);
  return (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2.2, textTransform: "uppercase", color: cat?.color }}>
      {cat?.one}{e.nationalDish ? " · National dish" : ""} · {d ? `${d.day} ${d.month} ${d.year}` : e.year}
    </div>
  );
}

function Refs({ e, onEdit, onDelete, center }: { e: Entry; onEdit: (id: string) => void; onDelete: (id: string) => void; center?: boolean }) {
  const file = fileHref(e);
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline", marginTop: 7, justifyContent: center ? "center" : "flex-start" }}>
      {e.link && (
        <a href={e.link} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--sepia)", textDecoration: "none" }}>
          see: {linkHost(e.link)}
        </a>
      )}
      {file && (
        <a href={file} target="_blank" rel="noreferrer noopener" style={{ fontFamily: MONO, fontSize: 9.5, color: "var(--sepia)", textDecoration: "none" }}>
          ⎘ {e.fileName ?? "attachment"}
        </a>
      )}
      <button onClick={() => onEdit(e.id)} title="Edit entry" style={xBtn}>✎</button>
      <button onClick={() => onDelete(e.id)} title="Remove entry" style={xBtn}>✕</button>
    </div>
  );
}

const xBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-soft)",
  opacity: 0.45,
  fontSize: 10,
  padding: 2,
};

const btnBase: React.CSSProperties = {
  borderRadius: 2,
  padding: "9px 15px",
  cursor: "pointer",
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: 1.5,
  textTransform: "uppercase",
};

const inkBtn: React.CSSProperties = {
  ...btnBase,
  background: "var(--ink)",
  color: "var(--paper)",
  border: "1px solid var(--ink)",
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
