export type CategoryKey = "recipe" | "book" | "movie" | "music" | "place";

export interface Entry {
  id: string;
  countryId: string;
  /**
   * Additional countries the entry covers beyond countryId (one entry is
   * logged once and shown under each). For books/film/music these are the
   * SUBJECT countries — what the work is about — while countryId is its
   * origin; for recipes/places all covered countries read the same. Never
   * includes countryId; [] for a normal single-country entry.
   */
  extraCountryIds: string[];
  category: CategoryKey;
  /** True for wish-list entries — things to do/make someday, not yet logged. */
  wishlist: boolean;
  title: string;
  by: string;
  note: string;
  /** Optional URL — recipes and places only; "" elsewhere (and on old media entries once edited). */
  link: string;
  /** Logged-for date as "yyyy-mm-dd"; "" on entries that predate the field. */
  date: string;
  year: number;
  /** Review rating, 1–5 stars; null = unrated. */
  rating: number | null;
  /** Recipe-only: a national dish of the countries it's logged under. */
  nationalDish: boolean;
  fileName: string | null;
  fileKey: string | null;
  fileType: string | null;
}

/** A country with its logged entries, assembled on the client from the catalog. */
export interface LoggedCountry {
  id: string;
  name: string;
  region: string;
  lon: number;
  lat: number;
  year: number; // earliest year logged
  entries: Entry[]; // all entries — real logs and wish-list items
  logCount: number; // entries that are actual logs (drives map heat + tallies)
  wishCount: number; // wish-list entries (shown alongside, never colors the map)
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  theme: string;
}

/** Field length caps — enforced by the modal inputs and re-enforced by the API. */
export const FIELD_LIMITS = { title: 200, by: 120, note: 500 } as const;

/** Payload for logging a new entry (shared by the log modal and book). */
export interface NewEntryInput {
  countryId: string;
  /** Additional covered countries (subjects for media); see Entry.extraCountryIds. */
  extraCountryIds: string[];
  category: CategoryKey;
  wishlist: boolean;
  title: string;
  by: string;
  note: string;
  link: string;
  /** "yyyy-mm-dd" from the date picker. */
  date: string;
  /** 1–5 stars; null = unrated. */
  rating: number | null;
  /** Recipe-only national-dish flag; ignored for other categories. */
  nationalDish: boolean;
}
