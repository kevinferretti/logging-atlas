// Client-side submit for the log modal — shared by the home page and the
// country pages so the posted FormData fields can't drift from NewEntryInput.
import type { Entry, NewEntryInput } from "./types";

export async function submitEntry(input: NewEntryInput, file?: File | null): Promise<Entry> {
  const fd = new FormData();
  fd.append("countryId", input.countryId);
  fd.append("category", input.category);
  fd.append("wishlist", input.wishlist ? "1" : "0");
  fd.append("title", input.title);
  fd.append("by", input.by);
  fd.append("note", input.note);
  fd.append("link", input.link);
  fd.append("date", input.date);
  if (file) fd.append("file", file);
  const res = await fetch("/api/entries", { method: "POST", body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not save entry.");
  }
  const { entry } = (await res.json()) as { entry: Entry };
  return entry;
}
