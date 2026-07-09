// Client-side submit for the log modal — shared by the home page and the
// country pages so the posted FormData fields can't drift from NewEntryInput.
import type { Entry, NewEntryInput } from "./types";

function entryForm(input: NewEntryInput, file?: File | null): FormData {
  const fd = new FormData();
  fd.append("countryId", input.countryId);
  fd.append("category", input.category);
  fd.append("wishlist", input.wishlist ? "1" : "0");
  fd.append("title", input.title);
  fd.append("by", input.by);
  fd.append("note", input.note);
  fd.append("link", input.link);
  fd.append("date", input.date);
  fd.append("rating", input.rating == null ? "" : String(input.rating));
  if (file) fd.append("file", file);
  return fd;
}

async function readEntry(res: Response, fallback: string): Promise<Entry> {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? fallback);
  }
  const { entry } = (await res.json()) as { entry: Entry };
  return entry;
}

export async function submitEntry(input: NewEntryInput, file?: File | null): Promise<Entry> {
  const res = await fetch("/api/entries", { method: "POST", body: entryForm(input, file) });
  return readEntry(res, "Could not save entry.");
}

export async function updateEntry(
  id: string,
  input: NewEntryInput,
  file?: File | null,
  removeFile?: boolean,
): Promise<Entry> {
  const fd = entryForm(input, file);
  if (removeFile) fd.append("removeFile", "1");
  const res = await fetch(`/api/entries/${id}`, { method: "PATCH", body: fd });
  return readEntry(res, "Could not save changes.");
}
