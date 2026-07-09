// Region → continent grouping for the index views. Regions are the unit the
// catalog carries (countryCatalog.generated.ts); continents exist only for
// presentation, so they live here rather than on the generated data.

export const CONTINENTS = ["Africa", "The Americas", "Asia", "Europe", "Oceania", "The Oceans", "Antarctica"] as const;
export type Continent = (typeof CONTINENTS)[number];

const BY_REGION: Record<string, Continent> = {
  "Central Africa": "Africa",
  "East Africa": "Africa",
  "Horn of Africa": "Africa",
  "North Africa": "Africa",
  "Southern Africa": "Africa",
  "West Africa": "Africa",
  Caribbean: "The Americas",
  "Central America": "The Americas",
  "North America": "The Americas",
  "South America": "The Americas",
  Caucasus: "Asia",
  "Central Asia": "Asia",
  "East Asia": "Asia",
  "South Asia": "Asia",
  "Southeast Asia": "Asia",
  "Western Asia": "Asia",
  "Central Europe": "Europe",
  "Eastern Europe": "Europe",
  "Northern Europe": "Europe",
  "Southern Europe": "Europe",
  "Western Europe": "Europe",
  Oceania: "Oceania",
  // Remote island territories that belong to no continent proper.
  "Indian Ocean": "The Oceans",
  "South Atlantic": "The Oceans",
  Antarctica: "Antarctica",
};

/**
 * Continent a region belongs to. A region missing from the map (a future
 * catalog addition) becomes its own top-level group rather than mis-filing.
 */
export function continentOf(region: string): string {
  return BY_REGION[region] ?? region;
}

/** Sort key: the fixed continent order, unknown groups after, A→Z. */
export function continentRank(continent: string): number {
  const i = (CONTINENTS as readonly string[]).indexOf(continent);
  return i === -1 ? CONTINENTS.length : i;
}
