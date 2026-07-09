"use client";

// Style 1 — "The Ledger": a customs & arrivals register. Ruled rows, a No.
// column, category chips, and the tally disc — reads like a harbourmaster's
// intake book.

import { category } from "@/lib/categories";
import { countryPrefix } from "@/lib/countries";
import { fmtCoord, subLine } from "@/lib/logbook";
import { buildCountDisc } from "@/lib/stamps";
import type { Entry } from "@/lib/types";
import { DISPLAY, MONO, SERIF, entryDateParts, fileHref, linkHost, ratingStars, splitEntries, type VariantProps } from "./shared";

const COLS = "44px 84px 1fr 92px 150px 52px";

export default function LedgerVariant({ country: c, palette, onBack, onPassport, onAdd, onEdit, onDelete }: VariantProps) {
  const { logs, wishes } = splitEntries(c);
  const prefix = countryPrefix(c.id);
  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "26px 28px 130px" }}>
      {/* Chrome */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={ghostBtn}>← The world</button>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onPassport} style={solidBtn}>🛂 Open passport</button>
          <button onClick={onAdd} style={dashBtn}>＋ Log an entry</button>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 26, borderBottom: "3px double var(--ink)", padding: "40px 0 18px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: 3, color: "var(--sepia)" }}>CUSTOMS &amp; ARRIVALS LEDGER</div>
          {prefix && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 2, color: "var(--ink-soft)", marginTop: 16 }}>{prefix}</div>}
          <div style={{ fontFamily: DISPLAY, fontSize: 52, lineHeight: 1.04, color: "var(--ink)", marginTop: 4 }}>{c.name}</div>
          <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: 1.6, color: "var(--ink-soft)", marginTop: 12 }}>
            {c.region.toUpperCase()} · {fmtCoord(c)} · FIRST LOGGED {c.year}
          </div>
        </div>
        <div style={{ flex: "0 0 auto" }} dangerouslySetInnerHTML={{ __html: buildCountDisc(c, { size: 96, palette, label: "Logs" }) }} />
      </div>

      {/* Column headings */}
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "12px 6px 8px", borderBottom: "1.5px solid var(--ink)" }}>
        {["No.", "Kind", "Item", "Date", "Reference", ""].map((h, i) => (
          <div key={i} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "var(--ink-soft)" }}>{h}</div>
        ))}
      </div>

      {logs.length === 0 ? (
        <div style={{ padding: "34px 6px", fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: "var(--ink-soft)" }}>
          Nothing logged yet — only wishes below.
        </div>
      ) : (
        logs.map((e, i) => <Row key={e.id} e={e} no={String(i + 1).padStart(2, "0")} onEdit={onEdit} onDelete={onDelete} />)
      )}

      {wishes.length > 0 && (
        <>
          <div style={{ margin: "44px 0 0", padding: "0 6px 8px", borderBottom: "1.5px solid var(--sepia)", fontFamily: MONO, fontSize: 10, letterSpacing: 2.5, color: "var(--sepia)" }}>
            WISH LIST — DECLARED, NOT YET LOGGED
          </div>
          {wishes.map((e) => <Row key={e.id} e={e} no="☆" onEdit={onEdit} onDelete={onDelete} />)}
        </>
      )}

      <div style={{ marginTop: 46, textAlign: "center", fontFamily: MONO, fontSize: 9.5, letterSpacing: 3, color: "var(--ink-soft)", opacity: 0.7 }}>
        — END OF RECORD —
      </div>
    </div>
  );
}

function Row({ e, no, onEdit, onDelete }: { e: Entry; no: string; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  const cat = category(e.category);
  const sub = subLine(e);
  const file = fileHref(e);
  const d = entryDateParts(e);
  const stars = ratingStars(e);
  return (
    <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "baseline", padding: "13px 6px", borderBottom: e.wishlist ? "1px dashed var(--line)" : "1px solid var(--line)" }}>
      <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--ink-soft)" }}>{no}</div>
      <div>
        <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: 1.2, textTransform: "uppercase", color: cat?.color, border: `1px solid ${cat?.color}`, borderRadius: 2, padding: "2px 6px", opacity: 0.9, whiteSpace: "nowrap" }}>
          {cat?.one}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 18, color: "var(--ink)", fontStyle: e.wishlist ? "italic" : "normal" }}>{e.title}</div>
        {sub && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 14, color: "var(--ink-soft)", marginTop: 1 }}>{sub}</div>}
        {stars && <div style={{ fontSize: 11, letterSpacing: 2, color: "var(--sepia)", marginTop: 2 }}>{stars}</div>}
        {e.note && <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 13.5, color: "var(--ink-soft)", opacity: 0.85, marginTop: 2 }}>“{e.note}”</div>}
      </div>
      <div style={{ fontFamily: MONO, fontSize: 11.5, color: "var(--ink)" }}>{e.wishlist ? "—" : d ? `${d.day}.${d.monthNo}.${d.year}` : e.year}</div>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {e.link && (
          <a href={e.link} target="_blank" rel="noreferrer noopener" style={refLink}>↗ {linkHost(e.link)}</a>
        )}
        {file && (
          <a href={file} target="_blank" rel="noreferrer noopener" style={refLink}>⎘ {e.fileName ?? "attachment"}</a>
        )}
      </div>
      <div style={{ display: "flex", gap: 2, alignSelf: "center" }}>
        <button onClick={() => onEdit(e.id)} title="Edit entry" style={xBtn}>✎</button>
        <button onClick={() => onDelete(e.id)} title="Remove entry" style={xBtn}>✕</button>
      </div>
    </div>
  );
}

const refLink: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: 0.5,
  color: "var(--sepia)",
  textDecoration: "none",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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

const xBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--ink-soft)",
  opacity: 0.55,
  fontSize: 11,
  padding: 2,
  alignSelf: "center",
};
