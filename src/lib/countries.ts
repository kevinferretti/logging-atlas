// Catalog of loggable places — generated from the cleaned countries-50m
// topology (the same one the globe draws, see atlasTopo.generated.ts) so the
// map and the picker always match. Regenerate with `npm run countries:generate`;
// hand-tuned names/regions/label coordinates and the territory classification
// live in scripts/generate-countries.mjs.
//
// Ids are the world-atlas numeric country ids (ISO 3166-1 numeric, no leading
// zeros), plus synthetic ids ("kosovo", "somaliland", "n-cyprus") for the three
// map features that ship without one.

import { COUNTRY_CATALOG, REGION_NAMES, type Region } from "./countryCatalog.generated";

// "territory" marks dependencies and self-governing territories (Bermuda,
// Hong Kong, Åland…) — purely descriptive: they're logged, counted, quizzed,
// and stamped exactly like countries, but the picker groups them separately
// and shows their administering country.
export type CountryKind = "country" | "territory";

export interface CatalogCountry {
  id: string;
  name: string;
  region: Region;
  kind: CountryKind;
  /** Catalog id of the administering country; only set for kind "territory". */
  parentId?: string;
  lon: number;
  lat: number;
}

export { COUNTRY_CATALOG, REGION_NAMES };
export type { Region };

const byId = new Map(COUNTRY_CATALOG.map((c) => [c.id, c]));

export function catalogCountry(id: string): CatalogCountry | undefined {
  return byId.get(id);
}

/** Picker label — territories carry their administering country: "Bermuda (United Kingdom)". */
export function countryLabel(c: CatalogCountry): string {
  const parent = c.parentId ? byId.get(c.parentId) : undefined;
  return parent ? c.name + " (" + parent.name + ")" : c.name;
}

// Retired ids → successor ids. When a future world-atlas bump removes an id
// users may have logged under — a country dissolving into a successor, or a
// synthetic id gaining a real ISO code (e.g. "kosovo" → its assigned numeric
// id) — map the old id to the new one here. Stored entries are resolved
// through this map when read, and new writes are normalized, so old entries
// follow the successor country instead of going dark. Empty today: no id in
// the pinned dataset has been retired.
const LEGACY_COUNTRY_IDS: Record<string, string> = {};

/** Follow legacy-id migrations to the id's current catalog form. */
export function resolveCountryId(id: string): string {
  let cur = id;
  for (let hops = 0; hops < 8 && LEGACY_COUNTRY_IDS[cur]; hops++) cur = LEGACY_COUNTRY_IDS[cur];
  return cur;
}

// A migration must map a retired id onto a live catalog entry. Catch typos,
// dead-end chains, and cycles as soon as the module loads.
for (const legacy of Object.keys(LEGACY_COUNTRY_IDS)) {
  if (byId.has(legacy)) throw new Error('Legacy country id "' + legacy + '" is still in the catalog');
  if (!byId.has(resolveCountryId(legacy))) throw new Error('Legacy country id "' + legacy + '" does not resolve to a catalog country');
}

// Official long-form names shown above the country in the stamped logbook.
// Anything not listed falls back to an empty string (the book shows a generic
// "DESTINATION" line instead).
const COUNTRY_PREFIX: Record<string, string> = {
  "231": "FEDERAL DEMOCRATIC REPUBLIC OF", // Ethiopia
  "356": "REPUBLIC OF", // India
  "392": "STATE OF", // Japan
  "380": "THE ITALIAN REPUBLIC",
  "484": "UNITED MEXICAN STATES",
  "504": "KINGDOM OF", // Morocco
  "250": "THE FRENCH REPUBLIC",
  "76": "FEDERATIVE REPUBLIC OF", // Brazil
  "704": "SOCIALIST REPUBLIC OF", // Vietnam
  "300": "HELLENIC REPUBLIC",
  "604": "REPUBLIC OF", // Peru
  "840": "UNITED STATES OF AMERICA",
  "826": "UNITED KINGDOM OF GB & NI",
  "372": "REPUBLIC OF", // Ireland
  "276": "FEDERAL REPUBLIC OF", // Germany
  "724": "KINGDOM OF", // Spain
  "620": "PORTUGUESE REPUBLIC",
  "528": "KINGDOM OF THE", // Netherlands
  "56": "KINGDOM OF", // Belgium
  "756": "SWISS CONFEDERATION",
  "40": "REPUBLIC OF", // Austria
  "616": "REPUBLIC OF", // Poland
  "203": "CZECH REPUBLIC",
  "752": "KINGDOM OF", // Sweden
  "578": "KINGDOM OF", // Norway
  "208": "KINGDOM OF", // Denmark
  "246": "REPUBLIC OF", // Finland
  "100": "REPUBLIC OF", // Bulgaria
  "643": "RUSSIAN FEDERATION",
  "191": "REPUBLIC OF", // Croatia
  "792": "REPUBLIC OF", // Turkey
  "364": "ISLAMIC REPUBLIC OF", // Iran
  "376": "STATE OF", // Israel
  "400": "HASHEMITE KINGDOM OF", // Jordan
  "422": "REPUBLIC OF", // Lebanon
  "682": "KINGDOM OF", // Saudi Arabia
  "818": "ARAB REPUBLIC OF", // Egypt
  "12": "PEOPLE'S DEMOCRATIC REPUBLIC OF", // Algeria
  "788": "REPUBLIC OF", // Tunisia
  "710": "REPUBLIC OF", // South Africa
  "404": "REPUBLIC OF", // Kenya
  "566": "FEDERAL REPUBLIC OF", // Nigeria
  "288": "REPUBLIC OF", // Ghana
  "156": "PEOPLE'S REPUBLIC OF", // China
  "410": "REPUBLIC OF", // South Korea
  "764": "KINGDOM OF", // Thailand
  "360": "REPUBLIC OF", // Indonesia
  "608": "REPUBLIC OF THE", // Philippines
  "116": "KINGDOM OF", // Cambodia
  "586": "ISLAMIC REPUBLIC OF", // Pakistan
  "50": "PEOPLE'S REPUBLIC OF", // Bangladesh
  "144": "DEMOCRATIC SOCIALIST REPUBLIC OF", // Sri Lanka
  "524": "FEDERAL DEMOCRATIC REPUBLIC OF", // Nepal
  "32": "ARGENTINE REPUBLIC",
  "152": "REPUBLIC OF", // Chile
  "170": "REPUBLIC OF", // Colombia
  "218": "REPUBLIC OF", // Ecuador
  "858": "ORIENTAL REPUBLIC OF", // Uruguay
  "862": "BOLIVARIAN REPUBLIC OF", // Venezuela
  "36": "COMMONWEALTH OF", // Australia
  // — full-map additions —
  "8": "REPUBLIC OF", // Albania
  "24": "REPUBLIC OF", // Angola
  "31": "REPUBLIC OF", // Azerbaijan
  "44": "COMMONWEALTH OF THE", // Bahamas
  "51": "REPUBLIC OF", // Armenia
  "64": "KINGDOM OF", // Bhutan
  "68": "PLURINATIONAL STATE OF", // Bolivia
  "72": "REPUBLIC OF", // Botswana
  "104": "REPUBLIC OF THE UNION OF", // Myanmar
  "108": "REPUBLIC OF", // Burundi
  "112": "REPUBLIC OF", // Belarus
  "120": "REPUBLIC OF", // Cameroon
  "148": "REPUBLIC OF", // Chad
  "178": "REPUBLIC OF THE", // Congo
  "188": "REPUBLIC OF", // Costa Rica
  "192": "REPUBLIC OF", // Cuba
  "196": "REPUBLIC OF", // Cyprus
  "222": "REPUBLIC OF", // El Salvador
  "232": "STATE OF", // Eritrea
  "233": "REPUBLIC OF", // Estonia
  "262": "REPUBLIC OF", // Djibouti
  "266": "GABONESE REPUBLIC",
  "268": "", // Georgia
  "270": "REPUBLIC OF THE", // Gambia
  "320": "REPUBLIC OF", // Guatemala
  "324": "REPUBLIC OF", // Guinea
  "328": "CO-OPERATIVE REPUBLIC OF", // Guyana
  "332": "REPUBLIC OF", // Haiti
  "340": "REPUBLIC OF", // Honduras
  "368": "REPUBLIC OF", // Iraq
  "384": "REPUBLIC OF", // Côte d'Ivoire
  "398": "REPUBLIC OF", // Kazakhstan
  "414": "STATE OF", // Kuwait
  "417": "KYRGYZ REPUBLIC",
  "426": "KINGDOM OF", // Lesotho
  "428": "REPUBLIC OF", // Latvia
  "430": "REPUBLIC OF", // Liberia
  "434": "STATE OF", // Libya
  "440": "REPUBLIC OF", // Lithuania
  "442": "GRAND DUCHY OF", // Luxembourg
  "450": "REPUBLIC OF", // Madagascar
  "454": "REPUBLIC OF", // Malawi
  "466": "REPUBLIC OF", // Mali
  "478": "ISLAMIC REPUBLIC OF", // Mauritania
  "498": "REPUBLIC OF", // Moldova
  "508": "REPUBLIC OF", // Mozambique
  "512": "SULTANATE OF", // Oman
  "516": "REPUBLIC OF", // Namibia
  "558": "REPUBLIC OF", // Nicaragua
  "562": "REPUBLIC OF THE", // Niger
  "591": "REPUBLIC OF", // Panama
  "598": "INDEPENDENT STATE OF", // Papua New Guinea
  "600": "REPUBLIC OF", // Paraguay
  "624": "REPUBLIC OF", // Guinea-Bissau
  "626": "DEMOCRATIC REPUBLIC OF", // Timor-Leste
  "630": "COMMONWEALTH OF", // Puerto Rico
  "634": "STATE OF", // Qatar
  "646": "REPUBLIC OF", // Rwanda
  "686": "REPUBLIC OF", // Senegal
  "688": "REPUBLIC OF", // Serbia
  "694": "REPUBLIC OF", // Sierra Leone
  "703": "SLOVAK REPUBLIC",
  "705": "REPUBLIC OF", // Slovenia
  "706": "FEDERAL REPUBLIC OF", // Somalia
  "728": "REPUBLIC OF", // South Sudan
  "729": "REPUBLIC OF THE", // Sudan
  "740": "REPUBLIC OF", // Suriname
  "748": "KINGDOM OF", // Eswatini
  "760": "SYRIAN ARAB REPUBLIC",
  "762": "REPUBLIC OF", // Tajikistan
  "768": "TOGOLESE REPUBLIC",
  "780": "REPUBLIC OF", // Trinidad and Tobago
  "784": "", // United Arab Emirates
  "800": "REPUBLIC OF", // Uganda
  "807": "REPUBLIC OF", // North Macedonia
  "834": "UNITED REPUBLIC OF", // Tanzania
  "854": "", // Burkina Faso
  "860": "REPUBLIC OF", // Uzbekistan
  "887": "REPUBLIC OF", // Yemen
  "894": "REPUBLIC OF", // Zambia
  kosovo: "REPUBLIC OF",
  somaliland: "REPUBLIC OF",
  // — 50m additions —
  "702": "REPUBLIC OF", // Singapore
  "470": "REPUBLIC OF", // Malta
  "674": "MOST SERENE REPUBLIC OF", // San Marino
  "492": "PRINCIPALITY OF", // Monaco
  "438": "PRINCIPALITY OF", // Liechtenstein
  "20": "PRINCIPALITY OF", // Andorra
  "48": "KINGDOM OF", // Bahrain
  "462": "REPUBLIC OF", // Maldives
  "480": "REPUBLIC OF", // Mauritius
  "690": "REPUBLIC OF", // Seychelles
  "174": "UNION OF THE", // Comoros
  "132": "REPUBLIC OF", // Cabo Verde
  "678": "DEMOCRATIC REPUBLIC OF", // São Tomé and Príncipe
  "212": "COMMONWEALTH OF", // Dominica
  "659": "FEDERATION OF", // Saint Kitts and Nevis
  "776": "KINGDOM OF", // Tonga
  "882": "INDEPENDENT STATE OF", // Samoa
  "296": "REPUBLIC OF", // Kiribati
  "520": "REPUBLIC OF", // Nauru
  "585": "REPUBLIC OF", // Palau
  "583": "FEDERATED STATES OF", // Micronesia
  "584": "REPUBLIC OF THE", // Marshall Islands
  "344": "SPECIAL ADMINISTRATIVE REGION OF", // Hong Kong
  "446": "SPECIAL ADMINISTRATIVE REGION OF", // Macau
  "832": "BAILIWICK OF", // Jersey
  "831": "BAILIWICK OF", // Guernsey
  "60": "BRITISH OVERSEAS TERRITORY OF", // Bermuda
  "136": "BRITISH OVERSEAS TERRITORY OF THE", // Cayman Islands
  "92": "BRITISH OVERSEAS TERRITORY OF THE", // British Virgin Islands
  "796": "BRITISH OVERSEAS TERRITORY OF THE", // Turks and Caicos Islands
  "660": "BRITISH OVERSEAS TERRITORY OF", // Anguilla
  "500": "BRITISH OVERSEAS TERRITORY OF", // Montserrat
  "654": "BRITISH OVERSEAS TERRITORY OF", // Saint Helena
  "316": "UNITED STATES TERRITORY OF", // Guam
  "850": "UNITED STATES TERRITORY OF THE", // U.S. Virgin Islands
  "16": "UNITED STATES TERRITORY OF", // American Samoa
  "580": "COMMONWEALTH OF THE", // Northern Mariana Islands
  "258": "OVERSEAS COLLECTIVITY OF", // French Polynesia
  "876": "OVERSEAS COLLECTIVITY OF", // Wallis and Futuna
  "666": "OVERSEAS COLLECTIVITY OF", // Saint Pierre and Miquelon
};

export function countryPrefix(id: string): string {
  return COUNTRY_PREFIX[id] ?? "";
}

/** Catalog sorted alphabetically — for the country picker in the log form. */
export const COUNTRY_CATALOG_SORTED = [...COUNTRY_CATALOG].sort((a, b) =>
  a.name.localeCompare(b.name),
);
