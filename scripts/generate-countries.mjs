// Generates, from world-atlas/countries-50m.json, the two artifacts every map
// consumer shares:
//
//   src/lib/atlasTopo.generated.ts      — cleaned topology the globe & quiz draw
//   src/lib/countryCatalog.generated.ts — the loggable catalog
//
//   node scripts/generate-countries.mjs   (or: npm run countries:generate)
//
// The topology is derived rather than used raw because it merges three
// sources and needs surgery besides:
//   - world-atlas/countries-50m — the base map. A few features are dropped
//     (see EXCLUDED_FEATURES — one shares Australia's ISO id and would shadow
//     it in every by-id lookup), ids are normalized to their catalog form
//     (ISO 3166-1 numeric, leading zeros stripped), and the features without
//     an ISO id (partially recognized states) get their synthetic ids baked in.
//   - world-atlas/countries-10m — only the SPLICED_FROM_10M features, places
//     the 50m dataset omits entirely.
//   - scripts/data/disputed-areas.geojson — vendored de-facto states (from
//     Natural Earth's disputed-areas layer). These OVERLAP their de-jure
//     parent (Georgia, Moldova), so they sit last in the feature order: the
//     globe draws them on top and hit-tests them first.
// Everything is decoded to GeoJSON, merged, and re-encoded with
// topojson-server at the same 1e5 quantization world-atlas uses. Building the
// catalog from the merged topology keeps map and picker matched by
// construction.
//
// Label coordinates: hand-tuned values in CURATED win; everything else uses the
// spherical centroid of the country's largest polygon (avoids centroids pulled
// into the ocean by overseas islands or the antimeridian).

import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { geoArea, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import { topology } from "topojson-server";

const require = createRequire(import.meta.url);
const topo50 = require("world-atlas/countries-50m.json");
const topo10 = require("world-atlas/countries-10m.json");

const SYNTHETIC_IDS = {
  Kosovo: "kosovo",
  Somaliland: "somaliland",
  "N. Cyprus": "n-cyprus",
};

// Features cut from the map entirely, matched by name (two of them have no id,
// and Ashmore reuses Australia's). Removing a name from this set makes it a
// loggable place again — everything downstream is generated.
const EXCLUDED_FEATURES = new Set([
  // Uninhabited Australian external territories that Natural Earth tags with
  // Australia's own ISO id (036); kept, they'd shadow Australia in the
  // by-id bounds/feature maps the globe and quiz build.
  "Ashmore and Cartier Is.",
  // Christmas + Cocos islands, also id-less in this dataset.
  "Indian Ocean Ter.",
  // A contested glacier, not a loggable destination.
  "Siachen Glacier",
]);

// Features the 50m dataset omits entirely, pulled from countries-10m instead.
const SPLICED_FROM_10M = new Set([
  "292", // Gibraltar
  "798", // Tuvalu
]);

// De-facto states merged from the vendored disputed-areas file. Their
// polygons overlap the de-jure parent, so the globe draws them as a
// dash-bordered overlay. Kept to states with actual separate administration —
// claim areas like Kashmir or the Golan Heights are deliberately not included.
const DISPUTED_IDS = new Set(["abkhazia", "south-ossetia", "transnistria"]);

// Dependencies and self-governing territories: id → administering country's
// catalog id. Drives kind: "territory" and the "(parent)" hint in the picker;
// deliberately display-only — territories count in every tally like countries.
// De-facto states (Taiwan, Kosovo, Somaliland, N. Cyprus, W. Sahara,
// Palestine) are left as kind "country": they answer to no administering
// state, and pinning a parent on them would be a political claim, not a fact.
const TERRITORY_PARENTS = {
  // United States (840)
  630: "840", // Puerto Rico
  850: "840", // U.S. Virgin Islands
  316: "840", // Guam
  16: "840", // American Samoa
  580: "840", // Northern Mariana Islands
  // United Kingdom (826) — overseas territories and Crown dependencies
  238: "826", // Falkland Islands
  239: "826", // South Georgia
  86: "826", // British Indian Ocean Territory
  654: "826", // Saint Helena
  612: "826", // Pitcairn Islands
  660: "826", // Anguilla
  136: "826", // Cayman Islands
  60: "826", // Bermuda
  92: "826", // British Virgin Islands
  796: "826", // Turks and Caicos Islands
  500: "826", // Montserrat
  832: "826", // Jersey
  831: "826", // Guernsey
  833: "826", // Isle of Man
  // Netherlands (528) — constituent countries of the Kingdom
  533: "528", // Aruba
  531: "528", // Curaçao
  534: "528", // Sint Maarten
  // France (250)
  540: "250", // New Caledonia
  260: "250", // French Southern Lands
  258: "250", // French Polynesia
  666: "250", // Saint Pierre and Miquelon
  876: "250", // Wallis and Futuna
  663: "250", // Saint-Martin
  652: "250", // Saint-Barthélemy
  // Denmark (208)
  304: "208", // Greenland
  234: "208", // Faroe Islands
  // Finland (246)
  248: "246", // Åland Islands
  // United Kingdom (spliced from 10m)
  292: "826", // Gibraltar
  // China (156)
  344: "156", // Hong Kong
  446: "156", // Macau
  // New Zealand (554)
  184: "554", // Cook Islands
  570: "554", // Niue
  // Australia (36)
  334: "36", // Heard and McDonald Islands
  574: "36", // Norfolk Island
};

// Hand-tuned entries (the original catalog) — kept exactly: names, region
// labels, and label coordinates here override anything computed.
const CURATED = new Map(
  [
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
  ].map((c) => [c.id, c]),
);

// The canonical region taxonomy — the only place a region name may be spelled
// out. Every region label in CURATED and REGIONS must match one of these (the
// script throws otherwise), and each name must be used by at least one
// country, so a typo can't silently mint a phantom region group in the index.
// Emitted into the generated file as REGION_NAMES plus the Region union type.
const REGION_NAMES = [
  // Africa
  "North Africa",
  "Horn of Africa",
  "East Africa",
  "Central Africa",
  "West Africa",
  "Southern Africa",
  // Asia
  "Western Asia",
  "Caucasus",
  "Central Asia",
  "South Asia",
  "East Asia",
  "Southeast Asia",
  // Europe
  "Eastern Europe",
  "Northern Europe",
  "Southern Europe",
  "Western Europe",
  "Central Europe",
  // Americas
  "North America",
  "Central America",
  "Caribbean",
  "South America",
  // Oceania & the rest
  "Oceania",
  "Antarctica",
  "Indian Ocean",
  "South Atlantic",
];

// Region labels for everything not in CURATED. Every feature in the dataset
// must be covered by CURATED or this map — the script throws otherwise, so a
// world-atlas upgrade that adds countries fails loudly instead of silently
// dropping them from the picker.
const REGIONS = {
  // Africa
  "732": "North Africa", "729": "North Africa", "434": "North Africa",
  "706": "Horn of Africa", "262": "Horn of Africa", "232": "Horn of Africa", somaliland: "Horn of Africa",
  "834": "East Africa", "800": "East Africa", "646": "East Africa", "108": "East Africa",
  "454": "East Africa", "508": "East Africa", "450": "East Africa", "728": "East Africa",
  "180": "Central Africa", "178": "Central Africa", "140": "Central Africa", "148": "Central Africa",
  "120": "Central Africa", "266": "Central Africa", "226": "Central Africa", "24": "Central Africa",
  "686": "West Africa", "466": "West Africa", "478": "West Africa", "204": "West Africa",
  "562": "West Africa", "768": "West Africa", "384": "West Africa", "324": "West Africa",
  "624": "West Africa", "430": "West Africa", "694": "West Africa", "854": "West Africa", "270": "West Africa",
  "716": "Southern Africa", "72": "Southern Africa", "516": "Southern Africa",
  "894": "Southern Africa", "748": "Southern Africa", "426": "Southern Africa",
  // Asia
  "275": "Western Asia", "784": "Western Asia", "634": "Western Asia", "414": "Western Asia",
  "368": "Western Asia", "512": "Western Asia", "760": "Western Asia", "887": "Western Asia",
  "196": "Western Asia", "n-cyprus": "Western Asia",
  "51": "Caucasus", "31": "Caucasus", "268": "Caucasus",
  "398": "Central Asia", "860": "Central Asia", "762": "Central Asia",
  "417": "Central Asia", "795": "Central Asia", "4": "Central Asia",
  "64": "South Asia",
  "496": "East Asia", "408": "East Asia",
  "418": "Southeast Asia", "104": "Southeast Asia", "96": "Southeast Asia", "626": "Southeast Asia",
  // Europe
  "112": "Eastern Europe", "498": "Eastern Europe",
  "440": "Northern Europe", "428": "Northern Europe", "233": "Northern Europe", "352": "Northern Europe",
  "8": "Southern Europe", "70": "Southern Europe", "807": "Southern Europe",
  "688": "Southern Europe", "499": "Southern Europe", kosovo: "Southern Europe",
  "442": "Western Europe",
  "705": "Central Europe", "703": "Central Europe",
  // Americas
  "332": "Caribbean", "214": "Caribbean", "44": "Caribbean", "630": "Caribbean",
  "388": "Caribbean", "192": "Caribbean", "780": "Caribbean",
  "591": "Central America", "188": "Central America", "558": "Central America",
  "340": "Central America", "222": "Central America", "320": "Central America", "84": "Central America",
  "68": "South America", "328": "South America", "740": "South America",
  "600": "South America", "238": "South America",
  "304": "North America",
  // Oceania & the rest
  "242": "Oceania", "598": "Oceania", "548": "Oceania", "540": "Oceania", "90": "Oceania",
  "10": "Antarctica", "260": "Indian Ocean",
  // — 50m additions —
  // Europe's microstates and near islands
  "336": "Southern Europe", "674": "Southern Europe", "470": "Southern Europe", "20": "Southern Europe",
  "492": "Western Europe", "438": "Central Europe",
  "832": "Northern Europe", "831": "Northern Europe", "833": "Northern Europe",
  "234": "Northern Europe", "248": "Northern Europe",
  // Asia
  "702": "Southeast Asia", "48": "Western Asia", "462": "South Asia",
  "344": "East Asia", "446": "East Asia",
  // Africa & the Indian Ocean
  "132": "West Africa", "678": "Central Africa",
  "174": "Indian Ocean", "480": "Indian Ocean", "690": "Indian Ocean",
  "86": "Indian Ocean", "334": "Indian Ocean",
  // Caribbean
  "660": "Caribbean", "136": "Caribbean", "92": "Caribbean", "850": "Caribbean",
  "796": "Caribbean", "500": "Caribbean", "533": "Caribbean", "531": "Caribbean",
  "534": "Caribbean", "663": "Caribbean", "652": "Caribbean",
  "52": "Caribbean", "212": "Caribbean", "308": "Caribbean", "662": "Caribbean",
  "659": "Caribbean", "670": "Caribbean", "28": "Caribbean",
  // North America & the South Atlantic
  "60": "North America", "666": "North America",
  "654": "South Atlantic", "239": "South Atlantic",
  // Oceania
  "316": "Oceania", "16": "Oceania", "580": "Oceania", "612": "Oceania",
  "258": "Oceania", "876": "Oceania", "184": "Oceania", "570": "Oceania", "574": "Oceania",
  "776": "Oceania", "882": "Oceania", "296": "Oceania", "520": "Oceania",
  "585": "Oceania", "583": "Oceania", "584": "Oceania",
  // — spliced from 10m —
  "292": "Southern Europe", "798": "Oceania",
  // — de-facto states —
  "abkhazia": "Caucasus", "south-ossetia": "Caucasus", "transnistria": "Eastern Europe",
};

// Natural Earth abbreviates some names; spell them out for the picker/book.
const NAMES = {
  "180": "DR Congo",
  "214": "Dominican Republic",
  "238": "Falkland Islands",
  "260": "French Southern Lands",
  "732": "Western Sahara",
  "140": "Central African Republic",
  "226": "Equatorial Guinea",
  "728": "South Sudan",
  "90": "Solomon Islands",
  "70": "Bosnia and Herzegovina",
  "807": "North Macedonia",
  "748": "Eswatini",
  "n-cyprus": "Northern Cyprus",
  // — 50m additions —
  "336": "Vatican City",
  "584": "Marshall Islands",
  "580": "Northern Mariana Islands",
  "850": "U.S. Virgin Islands",
  "239": "South Georgia & the Sandwich Islands",
  "86": "British Indian Ocean Territory",
  "612": "Pitcairn Islands",
  "136": "Cayman Islands",
  "92": "British Virgin Islands",
  "796": "Turks and Caicos Islands",
  "670": "Saint Vincent and the Grenadines",
  "659": "Saint Kitts and Nevis",
  "184": "Cook Islands",
  "666": "Saint Pierre and Miquelon",
  "876": "Wallis and Futuna",
  "258": "French Polynesia",
  "234": "Faroe Islands",
  "248": "Åland Islands",
  "334": "Heard and McDonald Islands",
  "28": "Antigua and Barbuda",
  "678": "São Tomé and Príncipe",
  "663": "Saint-Martin",
  "652": "Saint-Barthélemy",
  "446": "Macau",
};

function normId(raw, name) {
  if (raw == null) {
    const syn = SYNTHETIC_IDS[name];
    if (!syn) throw new Error("Feature without id or synthetic mapping: " + name);
    return syn;
  }
  return String(Number(raw));
}

// Spherical centroid of the largest polygon — a stable label point even for
// multipolygon countries with far-flung islands.
function labelPoint(geom) {
  let best = geom;
  if (geom.type === "MultiPolygon") {
    let bestArea = -1;
    for (const coords of geom.coordinates) {
      const poly = { type: "Polygon", coordinates: coords };
      let a = geoArea(poly);
      if (a > 2 * Math.PI) a = 4 * Math.PI - a; // reversed winding guard
      if (a > bestArea) {
        bestArea = a;
        best = poly;
      }
    }
  }
  const [lon, lat] = geoCentroid(best);
  return [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10];
}

// ---- merge the sources into one topology ----
// Base map: decode 50m, drop excluded features, bake in normalized ids.
const excludedSeen = new Set();
const baseFeatures = feature(topo50, topo50.objects.countries).features.filter((f) => {
  if (!EXCLUDED_FEATURES.has(f.properties?.name)) return true;
  excludedSeen.add(f.properties.name);
  return false;
});
for (const name of EXCLUDED_FEATURES) {
  if (!excludedSeen.has(name))
    throw new Error('EXCLUDED_FEATURES entry "' + name + '" matches no feature — stale after a dataset change?');
}
for (const f of baseFeatures) f.id = normId(f.id, f.properties?.name);

// Splices: places only the 10m dataset has.
const spliced = feature(topo10, topo10.objects.countries)
  .features.filter((f) => f.id != null && SPLICED_FROM_10M.has(normId(f.id, f.properties?.name)))
  .map((f) => ({ ...f, id: normId(f.id, f.properties?.name) }));
if (spliced.length !== SPLICED_FROM_10M.size)
  throw new Error("SPLICED_FROM_10M: expected " + SPLICED_FROM_10M.size + " features in countries-10m, found " + spliced.length);

// De-facto states from the vendored file; ids and names ship in the file.
const here = dirname(fileURLToPath(import.meta.url));
const disputed = JSON.parse(readFileSync(join(here, "data", "disputed-areas.geojson"), "utf8")).features;
for (const f of disputed) {
  if (!DISPUTED_IDS.has(f.id))
    throw new Error("disputed-areas.geojson feature " + f.id + " is not in DISPUTED_IDS");
}
if (disputed.length !== DISPUTED_IDS.size)
  throw new Error("DISPUTED_IDS: expected " + DISPUTED_IDS.size + " features in disputed-areas.geojson, found " + disputed.length);

// Disputed overlays go last: the globe draws in array order (so they paint on
// top of their de-jure parent) and hit-tests in reverse (so they win clicks).
const allFeatures = [...baseFeatures, ...spliced, ...disputed];
const seenIds = new Set();
for (const f of allFeatures) {
  if (seenIds.has(f.id))
    throw new Error("Duplicate feature id " + f.id + " (" + f.properties?.name + ") — exclude or re-id one of them");
  seenIds.add(f.id);
}

// Re-encode at world-atlas's own quantization. Coordinates decoded from the
// same source stay identical, so shared borders dedupe back into shared arcs.
const cleanTopo = topology(
  { countries: { type: "FeatureCollection", features: allFeatures } },
  1e5,
);
const geometries = cleanTopo.objects.countries.geometries;

// ---- build the catalog from the cleaned topology ----
const fc = feature(cleanTopo, cleanTopo.objects.countries);
const entries = [];
for (const f of fc.features) {
  const id = f.id;
  const kind = DISPUTED_IDS.has(id) ? "disputed" : TERRITORY_PARENTS[id] ? "territory" : "country";
  const parentId = TERRITORY_PARENTS[id];
  const curated = CURATED.get(id);
  if (curated) {
    entries.push({ ...curated, kind, parentId });
    continue;
  }
  const region = REGIONS[id];
  if (!region) throw new Error("No region label for " + id + " (" + f.properties?.name + ") — add it to REGIONS");
  const [lon, lat] = labelPoint(f.geometry);
  entries.push({ id, name: NAMES[id] ?? f.properties.name, region, kind, parentId, lon, lat });
}

// Every region label — curated or mapped — must come from the canonical
// taxonomy, and every taxonomy name must be in use.
const regionSet = new Set(REGION_NAMES);
if (regionSet.size !== REGION_NAMES.length) throw new Error("Duplicate name in REGION_NAMES");
for (const e of entries) {
  if (!regionSet.has(e.region))
    throw new Error('Unknown region "' + e.region + '" on ' + e.name + " — fix the typo or add it to REGION_NAMES");
}
const usedRegions = new Set(entries.map((e) => e.region));
for (const name of REGION_NAMES) {
  if (!usedRegions.has(name))
    throw new Error('REGION_NAMES entry "' + name + '" is not used by any country — remove it');
}

// Catch stale CURATED/REGIONS/NAMES/TERRITORY_PARENTS keys after a dataset change.
const ids = new Set(entries.map((e) => e.id));
for (const key of [...CURATED.keys(), ...Object.keys(REGIONS), ...Object.keys(NAMES), ...Object.keys(TERRITORY_PARENTS)]) {
  if (!ids.has(key))
    throw new Error(
      "CURATED/REGIONS/NAMES/TERRITORY_PARENTS key " + key + " matches no feature in countries-50m. If the id was retired " +
        "and users may have logged entries under it, add a migration to LEGACY_COUNTRY_IDS in src/lib/countries.ts.",
    );
}

// A territory's parent must be a catalog country — not missing, not itself a
// territory (chains would make the picker's "(parent)" hint recursive).
const byId = new Map(entries.map((e) => [e.id, e]));
for (const [id, parentId] of Object.entries(TERRITORY_PARENTS)) {
  const parent = byId.get(parentId);
  if (!parent) throw new Error("Territory " + id + " has unknown parent " + parentId);
  if (parent.kind !== "country") throw new Error("Territory " + id + " has non-country parent " + parent.name);
}

entries.sort((a, b) => a.name.localeCompare(b.name, "en"));

const lines = entries.map(
  (e) =>
    `  { id: ${JSON.stringify(e.id)}, name: ${JSON.stringify(e.name)}, region: ${JSON.stringify(e.region)}, kind: ${JSON.stringify(e.kind)},${e.parentId ? ` parentId: ${JSON.stringify(e.parentId)},` : ""} lon: ${e.lon}, lat: ${e.lat} },`,
);
const regionLines = REGION_NAMES.map((r) => `  ${JSON.stringify(r)},`);
const territoryCount = entries.filter((e) => e.kind === "territory").length;
const disputedCount = entries.filter((e) => e.kind === "disputed").length;
const out = `// GENERATED FILE — do not edit by hand. Run: npm run countries:generate
// Built from the same merged topology the globe draws (atlasTopo.generated.ts),
// so every place on the map is loggable. ${entries.length} places:
// ${entries.length - territoryCount - disputedCount} countries, ${territoryCount} territories, ${disputedCount} de-facto states.

import type { CatalogCountry } from "./countries";

// The canonical region taxonomy. CatalogCountry.region is the Region union, so
// a label outside this list is a type error anywhere in the app.
export const REGION_NAMES = [
${regionLines.join("\n")}
] as const;

export type Region = (typeof REGION_NAMES)[number];

export const COUNTRY_CATALOG: CatalogCountry[] = [
${lines.join("\n")}
];
`;

const dest = join(here, "..", "src", "lib", "countryCatalog.generated.ts");
writeFileSync(dest, out);
console.log("Wrote " + entries.length + " places to " + dest);

// The topology ships as JSON.parse of a string literal: tsc sees one string
// token instead of inferring a type over ~750KB of coordinates, and V8 parses
// big JSON faster than an equivalent object literal.
const topoJson = JSON.stringify(cleanTopo);
const topoOut = `// GENERATED FILE — do not edit by hand. Run: npm run countries:generate
// The app's merged atlas topology: world-atlas/countries-50m (cleaned) +
// features spliced from countries-10m + vendored de-facto states, with
// catalog ids (ISO numeric unpadded / synthetic slugs) baked into every
// geometry. ${geometries.length} features; disputed overlays sit last so they
// draw on top of their de-jure parent and win reverse-order hit-tests. The
// globe and quiz draw this; the country catalog is generated from it, so map
// and picker always match.

/* eslint-disable @typescript-eslint/no-explicit-any */
const topology: any = JSON.parse(${JSON.stringify(topoJson)});
export default topology;
`;
const topoDest = join(here, "..", "src", "lib", "atlasTopo.generated.ts");
writeFileSync(topoDest, topoOut);
console.log("Wrote " + geometries.length + " features (" + Math.round(topoOut.length / 1024) + "KB) to " + topoDest);
