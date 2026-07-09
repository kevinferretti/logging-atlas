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

/** Byline shown under an entry title, phrased by category. */
export function subLine(e: Entry): string {
  if (!e.by) return "";
  if (e.category === "movie") return "dir. " + e.by;
  if (e.category === "book" || e.category === "music") return "by " + e.by;
  return e.by;
}
