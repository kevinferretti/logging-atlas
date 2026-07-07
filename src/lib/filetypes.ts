// MIME types an uploaded file may be served inline with on the app's origin.
// Anything else (HTML, SVG, unknown) downloads as application/octet-stream so
// a crafted upload can never execute as a page here. Shared by the file route
// (server) and the variants' inline-image check (client) so they always agree.
export const INLINE_FILE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "application/pdf",
]);

/** True for types the UI may render in an <img> tag. */
export function isInlineImageType(type: string | null | undefined): boolean {
  return !!type && type.startsWith("image/") && INLINE_FILE_TYPES.has(type);
}
