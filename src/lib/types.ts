export type CategoryKey = "recipe" | "book" | "movie" | "music" | "place";

export interface Entry {
  id: string;
  countryId: string;
  category: CategoryKey;
  /** True for wish-list entries — things to do/make someday, not yet logged. */
  wishlist: boolean;
  title: string;
  by: string;
  note: string;
  link: string;
  /** Logged-for date as "yyyy-mm-dd"; "" on entries that predate the field. */
  date: string;
  year: number;
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

/** Payload for logging a new entry (shared by the log modal and book). */
export interface NewEntryInput {
  countryId: string;
  category: CategoryKey;
  wishlist: boolean;
  title: string;
  by: string;
  note: string;
  link: string;
  /** "yyyy-mm-dd" from the date picker. */
  date: string;
}
