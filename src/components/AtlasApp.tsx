"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Globe, { type GlobeMode } from "./Globe";
import LogModal from "./LogModal";
import QuizGame from "./QuizGame";
import { entryDateParts } from "./country/shared";
import { category } from "@/lib/categories";
import { continentOf, continentRank } from "@/lib/continents";
import { COUNTRY_CATALOG, catalogCountry, countryLabel } from "@/lib/countries";
import { submitEntry } from "@/lib/entriesClient";
import { assembleCountries, coveredCountryIds, subLine } from "@/lib/logbook";
import { buildCountDisc } from "@/lib/stamps";
import { coercePaletteName, getPalette, paletteCssVars, type Palette, type PaletteName } from "@/lib/palettes";
import type { Entry, LoggedCountry, NewEntryInput, SessionUser } from "@/lib/types";

interface AtlasAppProps {
  user: SessionUser;
  initialEntries: Entry[];
}

type Tab = "globe" | "map" | "index" | "diary";
type IndexOrder = "entries" | "region" | "explore";

// Places per region/continent in the full catalog — the denominators of the
// "N OF M" tallies shown on the headings of the grouped index views.
const REGION_TOTALS = new Map<string, number>();
const CONTINENT_TOTALS = new Map<string, number>();
for (const c of COUNTRY_CATALOG) {
  REGION_TOTALS.set(c.region, (REGION_TOTALS.get(c.region) ?? 0) + 1);
  const cont = continentOf(c.region);
  CONTINENT_TOTALS.set(cont, (CONTINENT_TOTALS.get(cont) ?? 0) + 1);
}

export default function AtlasApp({ user, initialEntries }: AtlasAppProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [tab, setTab] = useState<Tab>("globe");
  const [indexOrder, setIndexOrder] = useState<IndexOrder>("entries");
  const [paletteName, setPaletteName] = useState<PaletteName>(coercePaletteName(user.theme));
  const [logOpen, setLogOpen] = useState(false);
  // Country preselected in the log modal (set when clicking an empty country).
  const [logCountryId, setLogCountryId] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);

  const globeMode: GlobeMode = tab === "map" ? "map" : "globe";

  const palette = useMemo(() => getPalette(paletteName), [paletteName]);
  const countries = useMemo(() => assembleCountries(entries), [entries]);
  const ranked = useMemo(
    () => [...countries].sort((a, b) => b.logCount - a.logCount || b.wishCount - a.wishCount),
    [countries],
  );
  // Continents in fixed order, regions A→Z beneath each; within a region,
  // countries inherit ranked's entries-desc order.
  const byContinent = useMemo(() => {
    const regions = new Map<string, LoggedCountry[]>();
    for (const c of ranked) {
      const list = regions.get(c.region);
      if (list) list.push(c);
      else regions.set(c.region, [c]);
    }
    const continents = new Map<string, [string, LoggedCountry[]][]>();
    for (const [region, list] of [...regions.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const cont = continentOf(region);
      const group = continents.get(cont);
      if (group) group.push([region, list]);
      else continents.set(cont, [[region, list]]);
    }
    return [...continents.entries()].sort((a, b) => continentRank(a[0]) - continentRank(b[0]) || a[0].localeCompare(b[0]));
  }, [ranked]);

  // Places with nothing really logged yet — untouched or wish-list-only —
  // grouped like the continent index, A→Z within each region.
  const toExplore = useMemo(() => {
    const logged = new Map(countries.map((c) => [c.id, c]));
    const regions = new Map<string, { id: string; label: string; wishes: number }[]>();
    for (const c of COUNTRY_CATALOG) {
      if ((logged.get(c.id)?.logCount ?? 0) > 0) continue;
      const list = regions.get(c.region) ?? [];
      if (!list.length) regions.set(c.region, list);
      list.push({ id: c.id, label: countryLabel(c), wishes: logged.get(c.id)?.wishCount ?? 0 });
    }
    const continents = new Map<string, [string, { id: string; label: string; wishes: number }[]][]>();
    for (const [region, list] of [...regions.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      list.sort((a, b) => a.label.localeCompare(b.label));
      const cont = continentOf(region);
      const group = continents.get(cont);
      if (group) group.push([region, list]);
      else continents.set(cont, [[region, list]]);
    }
    return [...continents.entries()].sort((a, b) => continentRank(a[0]) - continentRank(b[0]) || a[0].localeCompare(b[0]));
  }, [countries]);
  const unexplored = useMemo(() => toExplore.reduce((n, [, regions]) => n + regions.reduce((m, [, list]) => m + list.length, 0), 0), [toExplore]);

  // The diary: every real log, newest first, grouped by year (undated
  // pre-date-field entries close out their year).
  const diary = useMemo(() => {
    const logs = entries
      .filter((e) => !e.wishlist)
      .sort((a, b) => b.year - a.year || b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
    const byYear: [number, Entry[]][] = [];
    for (const e of logs) {
      const g = byYear[byYear.length - 1];
      if (g && g[0] === e.year) g[1].push(e);
      else byYear.push([e.year, [e]]);
    }
    return byYear;
  }, [entries]);
  const maxLogs = Math.max(1, ranked.length ? ranked[0].logCount : 1);
  // Count entries, not per-country appearances — a multi-country entry files
  // under each country it covers but is still one log.
  const totalLogs = entries.reduce((n, e) => n + (e.wishlist ? 0 : 1), 0);
  const loggedCountries = countries.reduce((n, c) => n + (c.logCount > 0 ? 1 : 0), 0);

  function openCountry(id: string) {
    router.push(`/country/${id}`);
  }
  // Map clicks land here: a country with entries opens its details page, an
  // empty one opens the log form with that country already picked.
  function selectFromMap(id: string) {
    if (countries.some((c) => c.id === id)) {
      openCountry(id);
    } else {
      setLogCountryId(id);
      setLogOpen(true);
    }
  }

  async function addEntry(input: NewEntryInput, file?: File | null): Promise<Entry> {
    const entry = await submitEntry(input, file);
    setEntries((prev) => [...prev, entry]);
    return entry;
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
        active={(tab === "globe" || tab === "map") && !quizOpen}
        onSelect={selectFromMap}
      />

      {/* Top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 30px", pointerEvents: "none" }}>
        <div style={{ pointerEvents: "auto" }}>
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 25, letterSpacing: 7, color: "var(--ink)" }}>WORLOG</div>
          <button
            onClick={() => setQuizOpen(true)}
            style={{
              marginTop: 10,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "none",
              border: "1px solid var(--teal)",
              borderRadius: 2,
              padding: "7px 13px",
              cursor: "pointer",
              fontFamily: "'Special Elite',monospace",
              fontSize: 10.5,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: "var(--teal)",
            }}
          >
            Quiz
          </button>
        </div>
        <div style={{ pointerEvents: "auto", display: "flex", gap: 22, alignItems: "flex-start", textAlign: "right" }}>
          <Stat value={loggedCountries} label="COUNTRIES" />
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--line)" }} />
          <Stat value={totalLogs} label="LOGS" />
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
        {(["globe", "map", "index", "diary"] as Tab[]).map((t) => {
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
            <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 2.5, color: "var(--sepia)" }}>THE INDEX</div>
              <div style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 2, overflow: "hidden" }}>
                {([["By entries", "entries"], ["By region", "region"], ["To explore", "explore"]] as [string, IndexOrder][]).map(([label, order]) => {
                  const on = indexOrder === order;
                  return (
                    <button
                      key={order}
                      onClick={() => setIndexOrder(order)}
                      style={{ border: "none", padding: "5px 9px", cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 9.5, letterSpacing: 1, textTransform: "uppercase", background: on ? "var(--ink)" : "transparent", color: on ? "var(--paper)" : "var(--ink-soft)", transition: "all .15s ease" }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {indexOrder === "explore" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
                <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)", padding: "0 12px" }}>
                  {unexplored === 0
                    ? "Nowhere left untouched — the whole atlas bears your ink."
                    : `${unexplored} places await their first stamp. ☆ marks a wish already filed.`}
                </div>
                {toExplore.map(([continent, regions]) => (
                  <div key={continent}>
                    <ContinentHead name={continent} count={regions.reduce((n, [, l]) => n + l.length, 0)} of={null} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      {regions.map(([region, list]) => (
                        <div key={region}>
                          {!(regions.length === 1 && region === continent) && <RegionHead name={region} tally={null} />}
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            {list.map((p) => (
                              <ExploreRow key={p.id} {...p} onPick={selectFromMap} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : ranked.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 16, color: "var(--ink-soft)" }}>
                Your atlas is empty
              </div>
            ) : indexOrder === "entries" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {ranked.map((c) => (
                  <IndexRow key={c.id} country={c} palette={palette} maxLogs={maxLogs} showRegion onOpen={openCountry} />
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
                {byContinent.map(([continent, regions]) => (
                  <div key={continent}>
                    {/* Tallies count really-logged countries — a wish-only
                        country is listed (it holds wishes) but isn't visited. */}
                    <ContinentHead
                      name={continent}
                      count={regions.reduce((n, [, l]) => n + stamped(l), 0)}
                      of={CONTINENT_TOTALS.get(continent) ?? null}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                      {regions.map(([region, list]) => (
                        <div key={region}>
                          {!(regions.length === 1 && region === continent) && (
                            <RegionHead name={region} tally={`${stamped(list)} OF ${REGION_TOTALS.get(region) ?? list.length}`} />
                          )}
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {list.map((c) => (
                              <IndexRow key={c.id} country={c} palette={palette} maxLogs={maxLogs} showRegion={false} onOpen={openCountry} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diary view (fourth tab): every log, newest first, grouped by year */}
      {tab === "diary" && (
        <div style={{ position: "absolute", inset: 0, zIndex: 4, background: "var(--paper)", overflowY: "auto" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "104px 24px 64px" }}>
            <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 2.5, color: "var(--sepia)" }}>THE DIARY</div>
              {totalLogs > 0 && (
                <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 9.5, letterSpacing: 1, color: "var(--ink-soft)" }}>
                  {totalLogs} {totalLogs === 1 ? "LOG" : "LOGS"} · NEWEST FIRST
                </div>
              )}
            </div>
            {diary.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 16, color: "var(--ink-soft)" }}>
                Nothing logged yet — the diary begins with the first stamp
              </div>
            ) : (
              diary.map(([year, list]) => (
                <div key={year} style={{ marginBottom: 30 }}>
                  <div style={{ fontFamily: "Marcellus,serif", fontSize: 26, color: "var(--ink)", borderBottom: "2px solid var(--ink)", padding: "0 4px 5px", marginBottom: 4 }}>{year}</div>
                  {list.map((e) => (
                    <DiaryRow key={e.id} e={e} onOpen={openCountry} />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Hint (globe/map only) */}
      {(tab === "globe" || tab === "map") && (
        <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translate(-50%,0)", zIndex: 5, fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.6, color: "var(--ink-soft)", opacity: 0.72, pointerEvents: "none", whiteSpace: "nowrap" }}>
          DRAG TO SPIN&nbsp;&nbsp;·&nbsp;&nbsp;SCROLL TO ZOOM&nbsp;&nbsp;·&nbsp;&nbsp;CLICK ANY COUNTRY TO OPEN IT
        </div>
      )}

      {/* Source code */}
      <a
        href="https://github.com/kevinferretti/logging-atlas"
        target="_blank"
        rel="noreferrer noopener"
        style={{ position: "absolute", bottom: 22, right: 30, zIndex: 5, fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.6, color: "var(--ink-soft)", opacity: 0.72, textDecoration: "none" }}
      >
        SOURCE&nbsp;↗
      </a>

      {/* MAP QUIZ OVERLAY */}
      {quizOpen && <QuizGame entries={entries} palette={palette} onClose={() => setQuizOpen(false)} />}

      {/* GLOBAL LOG MODAL */}
      {logOpen && (
        <LogModal
          initialCountryId={logCountryId}
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

function IndexRow({
  country: c,
  palette,
  maxLogs,
  showRegion,
  onOpen,
}: {
  country: LoggedCountry;
  palette: Palette;
  maxLogs: number;
  showRegion: boolean;
  onOpen: (id: string) => void;
}) {
  const meta = [c.wishCount > 0 ? `☆ ${c.wishCount}` : "", showRegion ? c.region.toUpperCase() : ""]
    .filter(Boolean)
    .join("  ·  ");
  return (
    <button
      onClick={() => onOpen(c.id)}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", textAlign: "left", background: "none", border: "none", borderRadius: 4, padding: "10px 12px", cursor: "pointer", transition: "background .15s" }}
    >
      <div style={{ flex: "0 0 auto", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }} dangerouslySetInnerHTML={{ __html: buildCountDisc(c, { size: 44, palette }) }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 19, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
          {meta && (
            <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 10.5, letterSpacing: 1, color: "var(--ink-soft)", flex: "0 0 auto" }}>{meta}</div>
          )}
        </div>
        <div style={{ height: 5, background: "var(--line)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.round((c.logCount / maxLogs) * 100)}%`, height: "100%", background: "var(--sepia)", borderRadius: 3 }} />
        </div>
      </div>
    </button>
  );
}

/** Countries in the list with at least one real log — wishes don't count. */
function stamped(list: LoggedCountry[]): number {
  return list.reduce((n, c) => n + (c.logCount > 0 ? 1 : 0), 0);
}

function ContinentHead({ name, count, of }: { name: string; count: number; of: number | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "0 4px 6px", borderBottom: "2px solid var(--ink)", marginBottom: 14 }}>
      <div style={{ fontFamily: "Marcellus,serif", fontSize: 22, color: "var(--ink)" }}>{name}</div>
      <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 9.5, letterSpacing: 1, color: "var(--ink-soft)", flex: "0 0 auto" }}>
        {of == null ? count : `${count} OF ${of}`}
      </div>
    </div>
  );
}

function RegionHead({ name, tally }: { name: string; tally: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "0 12px 7px", borderBottom: "1px solid var(--line)", marginBottom: 6 }}>
      <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 2, color: "var(--sepia)" }}>{name.toUpperCase()}</div>
      {tally && <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 9.5, letterSpacing: 1, color: "var(--ink-soft)", flex: "0 0 auto" }}>{tally}</div>}
    </div>
  );
}

function ExploreRow({ id, label, wishes, onPick }: { id: string; label: string; wishes: number; onPick: (id: string) => void }) {
  return (
    <button
      onClick={() => onPick(id)}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
      style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, width: "100%", textAlign: "left", background: "none", border: "none", borderRadius: 4, padding: "7px 12px", cursor: "pointer", transition: "background .15s" }}
    >
      <span style={{ fontFamily: "'EB Garamond',serif", fontSize: 16.5, color: "var(--ink)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {wishes > 0 && (
        <span style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1, color: "var(--sepia)", flex: "0 0 auto" }}>☆ {wishes}</span>
      )}
    </button>
  );
}

function DiaryRow({ e, onOpen }: { e: Entry; onOpen: (id: string) => void }) {
  const cat = category(e.category);
  const d = entryDateParts(e);
  const names = coveredCountryIds(e)
    .map((id) => catalogCountry(id)?.name ?? "")
    .filter(Boolean)
    .join(" · ");
  const sub = subLine(e);
  const stars = e.rating ? "★".repeat(e.rating) + "☆".repeat(5 - e.rating) : null;
  return (
    <button
      onClick={() => onOpen(e.countryId)}
      onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--panel)")}
      onMouseLeave={(ev) => (ev.currentTarget.style.background = "none")}
      style={{ display: "flex", alignItems: "baseline", gap: 13, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--line)", padding: "12px 8px", cursor: "pointer", transition: "background .15s" }}
    >
      <span style={{ flex: "0 0 52px", fontFamily: "'Special Elite',monospace", fontSize: 10.5, letterSpacing: 1, color: "var(--ink-soft)" }}>
        {d ? `${d.day} ${d.month}` : "· · ·"}
      </span>
      <span style={{ flex: "0 0 auto", fontFamily: "'Special Elite',monospace", fontSize: 8.5, letterSpacing: 1.2, textTransform: "uppercase", color: cat?.color, border: `1px solid ${cat?.color}`, borderRadius: 2, padding: "2px 6px", opacity: 0.9, whiteSpace: "nowrap" }}>
        {cat?.one}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: "Marcellus,serif", fontSize: 17.5, color: "var(--ink)" }}>{e.title}</span>
        {sub && <span style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 13.5, color: "var(--ink-soft)", marginLeft: 8 }}>{sub}</span>}
        <span style={{ display: "block", fontFamily: "'Special Elite',monospace", fontSize: 9, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--ink-soft)", marginTop: 3 }}>
          {names}
          {stars && <span style={{ color: "var(--sepia)", letterSpacing: 2, marginLeft: 8 }}>{stars}</span>}
        </span>
        {e.note && <span style={{ display: "block", fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 13.5, color: "var(--ink-soft)", opacity: 0.9, marginTop: 3 }}>“{e.note}”</span>}
      </span>
    </button>
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
