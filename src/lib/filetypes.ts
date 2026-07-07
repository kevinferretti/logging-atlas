// Which uploaded files may be served inline on the app's origin. Anything
// else (HTML, SVG, unknown) downloads as application/octet-stream so a
// crafted upload can never execute as a page here. Shared by the upload path,
// the file route (server), and the variants' inline-image check (client) so
// they always agree.

/** Lowercased media type with any ";parameters" stripped; "" stays "". */
export function normalizeFileType(raw: string | null | undefined): string {
  return (raw ?? "").split(";")[0].trim().toLowerCase();
}

/**
 * True for types the UI may render in an <img> tag: every real image format
 * (including ones only some browsers decode, like HEIC) except SVG, which is
 * a scriptable document rather than opaque pixels.
 */
export function isInlineImageType(type: string | null | undefined): boolean {
  const t = normalizeFileType(type);
  return t.startsWith("image/") && t !== "image/svg+xml";
}

/** The Content-Type to serve an upload inline with, or null to force a download. */
export function inlineFileType(raw: string | null | undefined): string | null {
  const t = normalizeFileType(raw);
  return t === "application/pdf" || isInlineImageType(t) ? t : null;
}
