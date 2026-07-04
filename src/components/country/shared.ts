// Shared contract + helpers for the five country-details page styles.
// Every variant renders the full page body (header, entries, actions) from
// these props; once a winner is picked the losers can be deleted wholesale.

import type { Palette } from "@/lib/palettes";
import type { Entry, LoggedCountry } from "@/lib/types";

export interface VariantProps {
  country: LoggedCountry;
  palette: Palette;
  dark: boolean;
  onBack: () => void;
  onPassport: () => void;
  onAdd: () => void;
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

/** Logs in the order they happened; wishes alphabetical, kept apart. */
export function splitEntries(c: LoggedCountry): { logs: Entry[]; wishes: Entry[] } {
  const logs = c.entries
    .filter((e) => !e.wishlist)
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  const wishes = c.entries
    .filter((e) => e.wishlist)
    .sort((a, b) => a.title.localeCompare(b.title));
  return { logs, wishes };
}

/** URL of an entry's uploaded file, or null when it has none. */
export function fileHref(e: Entry): string | null {
  return e.fileKey ? "/api/files/" + e.fileKey : null;
}

export function isImage(e: Entry): boolean {
  return !!e.fileKey && !!e.fileType && e.fileType.startsWith("image/");
}
