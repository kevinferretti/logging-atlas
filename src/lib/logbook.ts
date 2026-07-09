import { hasSubjects } from "./categories";
import { catalogCountry, resolveCountryId } from "./countries";
import type { Entry, LoggedCountry } from "./types";

/**
 * Every country an entry covers — primary first, then extras — resolved to
 * current catalog ids and deduped (legacy ids can collapse onto each other).
 */
export function coveredCountryIds(e: Entry): string[] {
  const ids: string[] = [];
  for (const raw of [e.countryId, ...e.extraCountryIds]) {
    // Entries logged under a since-retired id group with the successor country.
    const id = resolveCountryId(raw);
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Group flat entries into per-country logbook records, resolving catalog data. */
export function assembleCountries(entries: Entry[]): LoggedCountry[] {
  const byCountry = new Map<string, Entry[]>();
  for (const e of entries) {
    // A multi-country entry files under each country it covers.
    for (const id of coveredCountryIds(e)) {
      const list = byCountry.get(id);
      if (list) list.push(e);
      else byCountry.set(id, [e]);
    }
  }

  const result: LoggedCountry[] = [];
  for (const [countryId, list] of byCountry) {
    const cat = catalogCountry(countryId);
    if (!cat) continue; // unknown country id — skip rather than crash
    const logs = list.filter((e) => !e.wishlist);
    // "First logged" reflects real logs only; wish years are aspirational.
    const year = logs.reduce((min, e) => Math.min(min, e.year), Infinity);
    result.push({
      id: cat.id,
      name: cat.name,
      region: cat.region,
      lon: cat.lon,
      lat: cat.lat,
      year: Number.isFinite(year) ? year : new Date().getFullYear(),
      entries: list,
      logCount: logs.length,
      wishCount: list.length - logs.length,
    });
  }
  return result;
}

export function fmtCoord(c: { lat: number; lon: number }): string {
  const la = Math.abs(c.lat).toFixed(1) + "°" + (c.lat >= 0 ? "N" : "S");
  const lo = Math.abs(c.lon).toFixed(1) + "°" + (c.lon >= 0 ? "E" : "W");
  return la + ", " + lo;
}

/**
 * Origin/subject note for entries whose category splits the two (books, film,
 * music — see Category.subjects), phrased for the country page it appears on:
 * "About Korea · China" on the origin's page, "From Japan" on a subject's page
 * (with "· About China" appended while other subjects remain). Null when the
 * entry names no subjects or its category reads countries as a flat list.
 */
export function originSubject(e: Entry, currentCountryId: string): string | null {
  const covered = coveredCountryIds(e);
  if (!hasSubjects(e.category) || covered.length < 2) return null;
  const name = (id: string) => catalogCountry(id)?.name ?? "";
  const subjects = covered
    .slice(1)
    .filter((id) => id !== currentCountryId)
    .map(name)
    .filter(Boolean);
  const parts: string[] = [];
  if (covered[0] !== currentCountryId && name(covered[0])) parts.push("From " + name(covered[0]));
  if (subjects.length) parts.push("About " + subjects.join(" · "));
  return parts.length ? parts.join(" · ") : null;
}

/** Byline shown under an entry title, phrased by category. */
export function subLine(e: Entry): string {
  if (!e.by) return "";
  if (e.category === "movie") return "dir. " + e.by;
  if (e.category === "book" || e.category === "music") return "by " + e.by;
  return e.by;
}
