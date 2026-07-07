// The one HTML escaper — shared by every innerHTML/SVG string builder so the
// escaping rules can't drift between copies. Escapes quotes as well as &<>
// because output lands inside quoted attribute values (data-cap, href).
const ENTITY: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ENTITY[c]);
}
