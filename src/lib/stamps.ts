// Clean count markers used across the app (globe/map, index rail, passport
// hero). A country renders as its entry count on a faint disc — no postmark
// rings/ticks/category pips.

import type { Palette } from "./palettes";
import type { LoggedCountry } from "./types";

export function countCats(c: LoggedCountry): Record<string, number> {
  const m: Record<string, number> = {};
  for (const e of c.entries) m[e.category] = (m[e.category] || 0) + 1;
  return m;
}

/**
 * Entry count on a faint disc. With `label` (e.g. "Entries") it renders larger
 * with a caption underneath — used for the passport hero; without it, a compact
 * marker for the globe/map and the index rail.
 */
export function buildCountDisc(
  c: LoggedCountry,
  o: { size?: number; palette: Palette; label?: string },
): string {
  const size = o.size ?? 48;
  const p = o.palette;
  const total = c.entries.length;
  const digits = String(total).length;

  if (o.label) {
    const fs = digits >= 3 ? 30 : digits === 2 ? 36 : 42;
    return (
      '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size +
      '" style="overflow:visible;display:block;">' +
      '<circle cx="50" cy="50" r="46" fill="' + p.paper2 + '" fill-opacity="0.55" stroke="' + p.sepia + '" stroke-opacity="0.7" stroke-width="1.2"/>' +
      '<text x="50" y="45" text-anchor="middle" dominant-baseline="central" font-family="Marcellus,serif" font-size="' + fs + '" fill="' + p.ink + '">' + total + "</text>" +
      '<text x="50" y="70" text-anchor="middle" font-family="Special Elite,monospace" font-size="5.5" letter-spacing="2.5" fill="' + p.sepia + '">' + o.label.toUpperCase() + "</text>" +
      "</svg>"
    );
  }

  const fs = digits >= 3 ? 30 : digits === 2 ? 36 : 40;
  return (
    '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size +
    '" style="overflow:visible;display:block;">' +
    '<circle cx="50" cy="50" r="33" fill="' + p.paper2 + '" fill-opacity="0.86" stroke="' + p.sepia + '" stroke-opacity="0.6" stroke-width="2"/>' +
    '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-family="Marcellus,serif" font-size="' + fs + '" fill="' + p.ink + '">' + total + "</text>" +
    "</svg>"
  );
}
