// Shared contract + helpers for the five country-details page styles.
// Every variant renders the full page body (header, entries, actions) from
// these props; once a winner is picked the losers can be deleted wholesale.

import { isInlineImageType } from "@/lib/filetypes";
import type { Palette } from "@/lib/palettes";
import type { Entry, LoggedCountry } from "@/lib/types";

export interface VariantProps {
  country: LoggedCountry;
  palette: Palette;
  dark: boolean;
  onBack: () => void;
  onPassport: () => void;
  onAdd: () => void;
  onEdit: (entryId: string) => void;
  onDelete: (entryId: string) => void;
}

export const MONO = "'Special Elite',monospace";
export const SERIF = "'EB Garamond',serif";
export const DISPLAY = "Marcellus,serif";

export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "open link";
  }
}

/**
 * Logs in the order they happened; wishes alphabetical, kept apart.
 * Within a year, undated (pre-date-field) logs sort before dated ones.
 */
export function splitEntries(c: LoggedCountry): { logs: Entry[]; wishes: Entry[] } {
  const logs = c.entries
    .filter((e) => !e.wishlist)
    .sort((a, b) => a.year - b.year || a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const wishes = c.entries
    .filter((e) => e.wishlist)
    .sort((a, b) => a.title.localeCompare(b.title));
  return { logs, wishes };
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Pieces of an entry's real "yyyy-mm-dd" date for a variant to typeset —
 * e.g. `${day} ${month} ${year}` → "10 MAY 2023" — or null on entries that
 * predate the date field (render the year as before).
 */
export function entryDateParts(e: Entry): { day: string; month: string; monthNo: string; year: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.date);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && month ? { day: m[3], month, monthNo: m[2], year: m[1] } : null;
}

/** URL of an entry's uploaded file, or null when it has none. */
export function fileHref(e: Entry): string | null {
  return e.fileKey ? "/api/files/" + e.fileKey : null;
}

export function isImage(e: Entry): boolean {
  return !!e.fileKey && isInlineImageType(e.fileType);
}
