export type CategoryKey = "recipe" | "book" | "movie" | "music" | "place";

export interface Entry {
  id: string;
  countryId: string;
  category: CategoryKey;
  title: string;
  by: string;
  note: string;
  link: string;
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
  entries: Entry[];
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  theme: string;
}
