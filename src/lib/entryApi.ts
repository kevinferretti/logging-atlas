// Server-side helpers shared by the entries API routes, so POST (create) and
// PATCH (edit) validate and shape entry fields identically.
import { isCategoryKey } from "./categories";
import { catalogCountry, resolveCountryId } from "./countries";
import { normalizeLink } from "./uploads";
import { FIELD_LIMITS, type CategoryKey, type Entry } from "./types";

export const ENTRY_SELECT = {
  id: true,
  countryId: true,
  category: true,
  wishlist: true,
  title: true,
  by: true,
  note: true,
  link: true,
  date: true,
  year: true,
  fileName: true,
  fileKey: true,
  fileType: true,
} as const;

export type EntryRow = {
  id: string;
  countryId: string;
  category: string;
  wishlist: boolean;
  title: string;
  by: string;
  note: string;
  link: string;
  date: string;
  year: number;
  fileName: string | null;
  fileKey: string | null;
  fileType: string | null;
};

export function toEntry(row: EntryRow): Entry {
  return { ...row, category: row.category as CategoryKey };
}

/** True for a well-formed "yyyy-mm-dd" that is a real calendar date. */
function isCalendarDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function localDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Multipart field as a trimmed string — a File-typed part reads as absent. */
function formString(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** Cap to n UTF-16 units without leaving a split surrogate pair at the end. */
function cap(s: string, n: number): string {
  const cut = s.slice(0, n);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

export interface ParsedEntryForm {
  countryId: string;
  category: CategoryKey;
  wishlist: boolean;
  title: string;
  by: string;
  note: string;
  link: string;
  /**
   * Picked "yyyy-mm-dd", or null when missing/malformed — the caller chooses
   * the fallback (today on create, the stored date on edit).
   */
  date: string | null;
}

/** Validate the log-modal FormData; returns the shaped fields or an error message. */
export function parseEntryForm(form: FormData): { data: ParsedEntryForm } | { error: string } {
  // Normalize legacy ids at write time so the database only accumulates
  // current catalog ids.
  const countryId = resolveCountryId(formString(form, "countryId"));
  const category = formString(form, "category");
  const title = formString(form, "title");

  if (!catalogCountry(countryId)) return { error: "Unknown country." };
  if (!isCategoryKey(category)) return { error: "Unknown category." };
  if (!title) return { error: "Text is required." };

  // The picker sends the user's local calendar date; treat out-of-range or
  // malformed values as absent.
  const currentYear = new Date().getFullYear();
  let date: string | null = formString(form, "date");
  if (!isCalendarDate(date) || Number(date.slice(0, 4)) < 1900 || Number(date.slice(0, 4)) > currentYear + 1) {
    date = null;
  }

  return {
    data: {
      countryId,
      category,
      wishlist: form.get("wishlist") === "1",
      title: cap(title, FIELD_LIMITS.title),
      by: cap(formString(form, "by"), FIELD_LIMITS.by),
      note: cap(formString(form, "note"), FIELD_LIMITS.note),
      link: normalizeLink(formString(form, "link")),
      date,
    },
  };
}
