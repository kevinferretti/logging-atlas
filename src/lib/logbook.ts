import { catalogCountry } from "./countries";
import type { Entry, LoggedCountry } from "./types";

/** Group flat entries into per-country logbook records, resolving catalog data. */
export function assembleCountries(entries: Entry[]): LoggedCountry[] {
  const byCountry = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = byCountry.get(e.countryId);
    if (list) list.push(e);
    else byCountry.set(e.countryId, [e]);
  }

  const result: LoggedCountry[] = [];
  for (const [countryId, list] of byCountry) {
    const cat = catalogCountry(countryId);
    if (!cat) continue; // unknown country id — skip rather than crash
    const year = list.reduce((min, e) => Math.min(min, e.year), Infinity);
    result.push({
      id: cat.id,
      name: cat.name,
      region: cat.region,
      lon: cat.lon,
      lat: cat.lat,
      year: Number.isFinite(year) ? year : new Date().getFullYear(),
      entries: list,
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
