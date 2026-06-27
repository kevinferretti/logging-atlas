"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Globe, { type GlobeMode } from "./Globe";
import Passport, { type NewEntryInput } from "./Passport";
import LogModal from "./LogModal";
import { assembleCountries } from "@/lib/logbook";
import { buildStampSVG } from "@/lib/stamps";
import { getPalette, paletteCssVars, PALETTE_NAMES, type PaletteName } from "@/lib/palettes";
import type { StampStyle } from "@/lib/stamps";
import type { Entry, SessionUser } from "@/lib/types";

interface AtlasAppProps {
  user: SessionUser;
  initialEntries: Entry[];
}

const stampStyle: StampStyle = "Round postmark";

export default function AtlasApp({ user, initialEntries }: AtlasAppProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [view, setView] = useState<"world" | "passport">("world");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<GlobeMode>("globe");
  const [paletteName, setPaletteName] = useState<PaletteName>("Sepia Atlas");
  const [logOpen, setLogOpen] = useState(false);

  const palette = useMemo(() => getPalette(paletteName), [paletteName]);
  const countries = useMemo(() => assembleCountries(entries), [entries]);
  const ranked = useMemo(() => [...countries].sort((a, b) => b.entries.length - a.entries.length), [countries]);
  const maxEntries = ranked.length ? ranked[0].entries.length : 1;
  const selected = countries.find((c) => c.id === selectedId) ?? null;
  const totalEntries = entries.length;

  function openCountry(id: string) {
    setSelectedId(id);
    setView("passport");
  }
  function goWorld() {
    setView("world");
  }

  async function addEntry(input: NewEntryInput): Promise<Entry> {
    const res = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Could not save entry.");
    }
    const { entry } = (await res.json()) as { entry: Entry };
    setEntries((prev) => [...prev, entry]);
    return entry;
  }

  async function deleteEntry(entryId: string) {
    const res = await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
    if (!res.ok) return;
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== entryId);
      // If we just removed the last entry for the open country, return to the world.
      if (selectedId && !next.some((e) => e.countryId === selectedId)) {
        setView("world");
        setSelectedId(null);
      }
      return next;
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const rootStyle = {
    ...paletteCssVars(palette),
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    background: "var(--paper)",
    color: "var(--ink)",
    fontFamily: "'EB Garamond',Georgia,serif",
  } as unknown as React.CSSProperties;

  return (
    <div style={rootStyle}>
      {/* WORLD VIEW */}
      <Globe
        countries={countries}
        palette={palette}
        stampStyle={stampStyle}
        mode={mode}
        active={view === "world"}
        onSelect={openCountry}
      />

      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 30px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 25, letterSpacing: 7, color: "var(--ink)" }}>ATLAS</div>
          <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 9, letterSpacing: 2.5, color: "var(--sepia)", marginTop: 3 }}>
            A PASSPORT OF THINGS LOGGED
          </div>
        </div>
        <div style={{ pointerEvents: "auto", display: "flex", gap: 22, alignItems: "flex-start", textAlign: "right" }}>
          <Stat value={countries.length} label="COUNTRIES" />
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
          <Stat value={totalEntries} label="ENTRIES" />
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: "var(--ink)" }}>{user.name ?? user.email}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={cyclePalette} title="Change theme" style={miniBtn}>
                Theme
              </button>
              <button onClick={logout} style={miniBtn}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Globe / Map toggle */}
      <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 6, display: "flex", background: "var(--paper2)", border: "1px solid var(--line)", borderRadius: 3, padding: 3, boxShadow: "0 3px 8px rgba(40,28,12,.14)" }}>
        {(["globe", "map"] as GlobeMode[]).map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                border: "none",
                padding: "7px 16px",
                borderRadius: 2,
                cursor: "pointer",
                fontFamily: "'Special Elite',monospace",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                background: on ? "var(--ink)" : "transparent",
                color: on ? "var(--paper)" : "var(--ink-soft)",
                transition: "all .15s ease",
              }}
            >
              {m}
            </button>
          );
        })}
      </div>

      {/* Index rail */}
      <div style={{ position: "absolute", left: 24, top: 96, bottom: 24, width: 250, zIndex: 5, background: "var(--paper2)", border: "1px solid var(--line)", borderRadius: 4, boxShadow: "0 8px 26px rgba(40,28,12,.16)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 18px 13px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 2.5, color: "var(--sepia)" }}>THE INDEX</div>
            <button onClick={() => setLogOpen(true)} style={{ ...miniBtn, borderColor: "var(--sepia)", color: "var(--sepia)" }}>
              ＋ Log
            </button>
          </div>
          <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
            Your logged world, by volume
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 7 }}>
          {ranked.length === 0 ? (
            <div style={{ padding: "26px 14px", textAlign: "center", fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 14, color: "var(--ink-soft)" }}>
              Your atlas is empty. Press <strong>＋ Log</strong> to stamp your first entry.
            </div>
          ) : (
            ranked.map((c) => (
              <button
                key={c.id}
                onClick={() => openCountry(c.id)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", background: "none", border: "none", borderRadius: 3, padding: "8px 9px", cursor: "pointer", transition: "background .15s" }}
              >
                <div style={{ flex: "0 0 auto", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center" }} dangerouslySetInnerHTML={{ __html: buildStampSVG(c, { size: 40, detail: "mini", style: stampStyle, palette }) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "Marcellus,serif", fontSize: 15, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ height: 4, background: "var(--line)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ width: `${Math.round((c.entries.length / maxEntries) * 100)}%`, height: "100%", background: "var(--sepia)", borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ flex: "0 0 auto", fontFamily: "'Special Elite',monospace", fontSize: 13, color: "var(--sepia)" }}>{c.entries.length}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Hint */}
      <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translate(-50%,0)", zIndex: 5, fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.6, color: "var(--ink-soft)", opacity: 0.72, pointerEvents: "none", whiteSpace: "nowrap" }}>
        DRAG TO SPIN&nbsp;&nbsp;·&nbsp;&nbsp;SCROLL TO ZOOM&nbsp;&nbsp;·&nbsp;&nbsp;CLICK A STAMP TO OPEN ITS PASSPORT
      </div>

      {/* PASSPORT OVERLAY */}
      {view === "passport" && selected && (
        <Passport
          country={selected}
          palette={palette}
          stampStyle={stampStyle}
          onBack={goWorld}
          onAdd={async (input) => {
            await addEntry(input);
          }}
          onDelete={deleteEntry}
        />
      )}

      {/* GLOBAL LOG MODAL */}
      {logOpen && (
        <LogModal
          onClose={() => setLogOpen(false)}
          onSave={async (input) => {
            await addEntry(input);
            setLogOpen(false);
            openCountry(input.countryId);
          }}
        />
      )}
    </div>
  );

  function cyclePalette() {
    setPaletteName((prev) => {
      const i = PALETTE_NAMES.indexOf(prev);
      return PALETTE_NAMES[(i + 1) % PALETTE_NAMES.length];
    });
  }
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div style={{ fontFamily: "Marcellus,serif", fontSize: 27, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 9, letterSpacing: 2, color: "var(--ink-soft)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--line)",
  borderRadius: 2,
  padding: "5px 9px",
  cursor: "pointer",
  fontFamily: "'Special Elite',monospace",
  fontSize: 9.5,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "var(--ink-soft)",
};
