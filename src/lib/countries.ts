// Catalog of loggable countries, keyed by the world-atlas numeric country id
// (ISO 3166-1 numeric, no leading zeros — matching the ids in
// world-atlas/countries-110m). Coordinates are approximate label centroids,
// used to place stamps on the globe/map.

export interface CatalogCountry {
  id: string;
  name: string;
  region: string;
  lon: number;
  lat: number;
}

export const COUNTRY_CATALOG: CatalogCountry[] = [
  // — Export demo set (kept exact) —
  { id: "231", name: "Ethiopia", region: "Horn of Africa", lon: 39.6, lat: 8.6 },
  { id: "356", name: "India", region: "South Asia", lon: 78.9, lat: 22.0 },
  { id: "124", name: "Canada", region: "North America", lon: -106, lat: 58 },
  { id: "392", name: "Japan", region: "East Asia", lon: 138.2, lat: 37.5 },
  { id: "380", name: "Italy", region: "Southern Europe", lon: 12.6, lat: 42.5 },
  { id: "484", name: "Mexico", region: "North America", lon: -102.5, lat: 23.6 },
  { id: "504", name: "Morocco", region: "North Africa", lon: -6.8, lat: 31.8 },
  { id: "250", name: "France", region: "Western Europe", lon: 2.3, lat: 46.6 },
  { id: "76", name: "Brazil", region: "South America", lon: -51, lat: -12 },
  { id: "704", name: "Vietnam", region: "Southeast Asia", lon: 106, lat: 16 },
  { id: "300", name: "Greece", region: "Southern Europe", lon: 22.0, lat: 39.3 },
  { id: "604", name: "Peru", region: "South America", lon: -75, lat: -9.5 },

  // — Wider catalog —
  { id: "840", name: "United States", region: "North America", lon: -98, lat: 39.5 },
  { id: "826", name: "United Kingdom", region: "Northern Europe", lon: -1.8, lat: 53 },
  { id: "372", name: "Ireland", region: "Northern Europe", lon: -8, lat: 53.2 },
  { id: "724", name: "Spain", region: "Southern Europe", lon: -3.7, lat: 40.2 },
  { id: "620", name: "Portugal", region: "Southern Europe", lon: -8, lat: 39.5 },
  { id: "276", name: "Germany", region: "Western Europe", lon: 10.4, lat: 51.2 },
  { id: "528", name: "Netherlands", region: "Western Europe", lon: 5.3, lat: 52.1 },
  { id: "56", name: "Belgium", region: "Western Europe", lon: 4.5, lat: 50.6 },
  { id: "756", name: "Switzerland", region: "Central Europe", lon: 8.2, lat: 46.8 },
  { id: "40", name: "Austria", region: "Central Europe", lon: 14.3, lat: 47.6 },
  { id: "616", name: "Poland", region: "Central Europe", lon: 19, lat: 52 },
  { id: "203", name: "Czechia", region: "Central Europe", lon: 15.5, lat: 49.8 },
  { id: "348", name: "Hungary", region: "Central Europe", lon: 19.5, lat: 47.2 },
  { id: "752", name: "Sweden", region: "Northern Europe", lon: 15, lat: 62 },
  { id: "578", name: "Norway", region: "Northern Europe", lon: 9, lat: 61 },
  { id: "208", name: "Denmark", region: "Northern Europe", lon: 9.5, lat: 56 },
  { id: "246", name: "Finland", region: "Northern Europe", lon: 26, lat: 64 },
  { id: "642", name: "Romania", region: "Eastern Europe", lon: 25, lat: 45.9 },
  { id: "100", name: "Bulgaria", region: "Eastern Europe", lon: 25, lat: 42.7 },
  { id: "804", name: "Ukraine", region: "Eastern Europe", lon: 31, lat: 49 },
  { id: "643", name: "Russia", region: "Eastern Europe", lon: 100, lat: 61 },
  { id: "191", name: "Croatia", region: "Southern Europe", lon: 16.4, lat: 45.2 },
  { id: "792", name: "Turkey", region: "Western Asia", lon: 35, lat: 39 },
  { id: "364", name: "Iran", region: "Western Asia", lon: 53, lat: 32 },
  { id: "376", name: "Israel", region: "Western Asia", lon: 35, lat: 31.4 },
  { id: "400", name: "Jordan", region: "Western Asia", lon: 36.5, lat: 31 },
  { id: "422", name: "Lebanon", region: "Western Asia", lon: 35.8, lat: 33.9 },
  { id: "682", name: "Saudi Arabia", region: "Western Asia", lon: 45, lat: 24 },
  { id: "818", name: "Egypt", region: "North Africa", lon: 30, lat: 27 },
  { id: "12", name: "Algeria", region: "North Africa", lon: 2.6, lat: 28 },
  { id: "788", name: "Tunisia", region: "North Africa", lon: 9.5, lat: 34 },
  { id: "710", name: "South Africa", region: "Southern Africa", lon: 24, lat: -29 },
  { id: "404", name: "Kenya", region: "East Africa", lon: 38, lat: 0.5 },
  { id: "566", name: "Nigeria", region: "West Africa", lon: 8, lat: 9 },
  { id: "288", name: "Ghana", region: "West Africa", lon: -1.2, lat: 7.9 },
  { id: "156", name: "China", region: "East Asia", lon: 104, lat: 35 },
  { id: "410", name: "South Korea", region: "East Asia", lon: 127.8, lat: 36.5 },
  { id: "158", name: "Taiwan", region: "East Asia", lon: 121, lat: 23.8 },
  { id: "764", name: "Thailand", region: "Southeast Asia", lon: 101, lat: 15 },
  { id: "360", name: "Indonesia", region: "Southeast Asia", lon: 118, lat: -2 },
  { id: "458", name: "Malaysia", region: "Southeast Asia", lon: 102, lat: 4 },
  { id: "608", name: "Philippines", region: "Southeast Asia", lon: 122, lat: 13 },
  { id: "116", name: "Cambodia", region: "Southeast Asia", lon: 105, lat: 12.5 },
  { id: "586", name: "Pakistan", region: "South Asia", lon: 70, lat: 30 },
  { id: "50", name: "Bangladesh", region: "South Asia", lon: 90, lat: 24 },
  { id: "144", name: "Sri Lanka", region: "South Asia", lon: 80.7, lat: 7.9 },
  { id: "524", name: "Nepal", region: "South Asia", lon: 84, lat: 28 },
  { id: "32", name: "Argentina", region: "South America", lon: -64, lat: -34 },
  { id: "152", name: "Chile", region: "South America", lon: -71, lat: -30 },
  { id: "170", name: "Colombia", region: "South America", lon: -73, lat: 4 },
  { id: "218", name: "Ecuador", region: "South America", lon: -78, lat: -1.5 },
  { id: "858", name: "Uruguay", region: "South America", lon: -56, lat: -33 },
  { id: "862", name: "Venezuela", region: "South America", lon: -66, lat: 8 },
  { id: "36", name: "Australia", region: "Oceania", lon: 134, lat: -25 },
  { id: "554", name: "New Zealand", region: "Oceania", lon: 172, lat: -41 },
];

const byId = new Map(COUNTRY_CATALOG.map((c) => [c.id, c]));

export function catalogCountry(id: string): CatalogCountry | undefined {
  return byId.get(id);
}

/** Catalog sorted alphabetically — for the country picker in the log form. */
export const COUNTRY_CATALOG_SORTED = [...COUNTRY_CATALOG].sort((a, b) =>
  a.name.localeCompare(b.name),
);
