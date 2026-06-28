"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Globe, { type GlobeMode } from "./Globe";
import Passport, { type NewEntryInput } from "./Passport";
import LogModal from "./LogModal";
import { assembleCountries } from "@/lib/logbook";
import { buildCountDisc } from "@/lib/stamps";
import { coercePaletteName, getPalette, paletteCssVars, type PaletteName } from "@/lib/palettes";
import type { Entry, SessionUser } from "@/lib/types";

interface AtlasAppProps {
  user: SessionUser;
  initialEntries: Entry[];
}

type Tab = "globe" | "map" | "index";

export default function AtlasApp({ user, initialEntries }: AtlasAppProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [view, setView] = useState<"world" | "passport">("world");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("globe");
  const [paletteName, setPaletteName] = useState<PaletteName>(coercePaletteName(user.theme));
  const [logOpen, setLogOpen] = useState(false);

  const globeMode: GlobeMode = tab === "map" ? "map" : "globe";

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

  async function addEntry(input: NewEntryInput, file?: File | null): Promise<Entry> {
    const fd = new FormData();
    fd.append("countryId", input.countryId);
    fd.append("category", input.category);
    fd.append("title", input.title);
    fd.append("link", input.link);
    if (file) fd.append("file", file);
    const res = await fetch("/api/entries", { method: "POST", body: fd });
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

  function chooseTheme(name: PaletteName) {
    setPaletteName(name);
    // Persist to the account; best-effort, the UI already updated.
    fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: name }),
    }).catch(() => {});
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
        mode={globeMode}
        active={view === "world" && tab !== "index"}
        onSelect={openCountry}
      />

      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 30px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 25, letterSpacing: 7, color: "var(--ink)" }}>ATLAS</div>
          <button
            onClick={() => setLogOpen(true)}
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "none",
              border: "1px dashed var(--sepia)",
              borderRadius: 2,
              padding: "7px 13px",
              cursor: "pointer",
              fontFamily: "'Special Elite',monospace",
              fontSize: 10.5,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "var(--sepia)",
            }}
          >
            ＋ Log an entry
          </button>
        </div>
        <div style={{ pointerEvents: "auto", display: "flex", gap: 22, alignItems: "flex-start", textAlign: "right" }}>
          <Stat value={countries.length} label="COUNTRIES" />
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
          <Stat value={totalEntries} label="ENTRIES" />
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 14, color: "var(--ink)" }}>{user.name ?? user.email}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 2, overflow: "hidden" }}>
                {([["Light", "Sepia Atlas"], ["Dark", "Midnight Customs"]] as [string, PaletteName][]).map(([label, name]) => {
                  const on = paletteName === name;
                  return (
                    <button
                      key={label}
                      onClick={() => chooseTheme(name)}
                      style={{ border: "none", padding: "5px 9px", cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", background: on ? "var(--ink)" : "transparent", color: on ? "var(--paper)" : "var(--ink-soft)", transition: "all .15s ease" }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button onClick={logout} style={miniBtn}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Globe / Map / Index toggle */}
      <div style={{ position: "absolute", top: 24, left: "50%", transform: "translateX(-50%)", zIndex: 6, display: "flex", background: "var(--paper2)", border: "1px solid var(--line)", borderRadius: 3, padding: 3, boxShadow: "0 3px 8px rgba(40,28,12,.14)" }}>
        {(["globe", "map", "index"] as Tab[]).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
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
              {t}
            </button>
          );
        })}
      </div>

      {/* Index view (third tab) */}
      {tab === "index" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 4, background: "var(--paper)", overflowY: "auto" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "104px 24px 64px" }}>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 2.5, color: "var(--sepia)" }}>THE INDEX</div>
              <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)", marginTop: 3 }}>Your logged world, by volume</div>
            </div>
            {ranked.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 16, color: "var(--ink-soft)" }}>
                Your atlas is empty. Press <strong>＋ Log an entry</strong> to stamp your first one.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {ranked.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openCountry(c.id)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", background: "none", border: "none", borderRadius: 4, padding: "10px 12px", cursor: "pointer", transition: "background .15s" }}
                  >
                    <div style={{ flex: "0 0 auto", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }} dangerouslySetInnerHTML={{ __html: buildCountDisc(c, { size: 44, palette }) }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                        <div style={{ fontFamily: "Marcellus,serif", fontSize: 19, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                        <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 10.5, letterSpacing: 1, color: "var(--ink-soft)", flex: "0 0 auto" }}>{c.region.toUpperCase()}</div>
                      </div>
                      <div style={{ height: 5, background: "var(--line)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
                        <div style={{ width: `${Math.round((c.entries.length / maxEntries) * 100)}%`, height: "100%", background: "var(--sepia)", borderRadius: 3 }} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hint (globe/map only) */}
      {tab !== "index" && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translate(-50%,0)", zIndex: 5, fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.6, color: "var(--ink-soft)", opacity: 0.72, pointerEvents: "none", whiteSpace: "nowrap" }}>
          DRAG TO SPIN&nbsp;&nbsp;·&nbsp;&nbsp;SCROLL TO ZOOM&nbsp;&nbsp;·&nbsp;&nbsp;CLICK A COUNTRY TO OPEN ITS PASSPORT
        </div>
      )}

      {/* PASSPORT OVERLAY */}
      {view === "passport" && selected && (
        <Passport
          country={selected}
          palette={palette}
          onBack={goWorld}
          onAdd={async (input, file) => {
            await addEntry(input, file);
          }}
          onDelete={deleteEntry}
        />
      )}

      {/* GLOBAL LOG MODAL */}
      {logOpen && (
        <LogModal
          onClose={() => setLogOpen(false)}
          onSave={async (input, file) => {
            await addEntry(input, file);
            setLogOpen(false);
            openCountry(input.countryId);
          }}
        />
      )}
    </div>
  );
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
