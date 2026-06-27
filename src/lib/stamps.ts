// Postmark / postage stamp SVG builders, ported from the Atlas design export.
// Each country renders as a circular postmark (or a postage stamp) whose detail
// scales with how many entries have been logged there.

import { catColor } from "./categories";
import type { Palette } from "./palettes";
import type { LoggedCountry } from "./types";

export type StampStyle = "Round postmark" | "Postage stamp";

interface StampOptions {
  size?: number;
  detail?: "full" | "mini";
  style?: StampStyle;
  palette: Palette;
}

let uidCounter = 0;

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function countCats(c: LoggedCountry): Record<string, number> {
  const m: Record<string, number> = {};
  for (const e of c.entries) m[e.category] = (m[e.category] || 0) + 1;
  return m;
}

export function buildStampSVG(c: LoggedCountry, o: StampOptions): string {
  const size = o.size ?? 120;
  const detail = o.detail ?? "full";
  const style = o.style ?? "Round postmark";
  const p = o.palette;
  if (style === "Postage stamp") return buildPostage(c, size, detail, p);

  const uid = "s" + uidCounter++;
  const ink = p.sepia;
  const ink2 = p.ink;
  const total = c.entries.length;
  const counts = countCats(c);
  const big = total >= 8;

  let ticks = "";
  const tn = 64;
  for (let i = 0; i < tn; i++) {
    const a = (i / tn) * 2 * Math.PI;
    const co = Math.cos(a);
    const si = Math.sin(a);
    const r2 = i % 2 ? 44.2 : 43.2;
    ticks +=
      '<line x1="' + (50 + co * 46).toFixed(2) + '" y1="' + (50 + si * 46).toFixed(2) +
      '" x2="' + (50 + co * r2).toFixed(2) + '" y2="' + (50 + si * r2).toFixed(2) +
      '" stroke="' + ink + '" stroke-width="0.5" opacity="0.5"/>';
  }

  let pips = "";
  ["recipe", "book", "movie", "music", "place"].forEach((k, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    const px = 50 + Math.cos(a) * 29.5;
    const py = 50 + Math.sin(a) * 29.5;
    const col = catColor(k);
    const n = counts[k] || 0;
    if (n) {
      const rr = Math.min(4.8, 2.1 + Math.sqrt(n) * 0.85);
      pips +=
        '<circle cx="' + px.toFixed(2) + '" cy="' + py.toFixed(2) + '" r="' + (rr + 1.5).toFixed(2) +
        '" fill="none" stroke="' + col + '" stroke-width="0.4" opacity="0.45"/><circle cx="' +
        px.toFixed(2) + '" cy="' + py.toFixed(2) + '" r="' + rr.toFixed(2) + '" fill="' + col + '" opacity="0.9"/>';
    } else {
      pips +=
        '<circle cx="' + px.toFixed(2) + '" cy="' + py.toFixed(2) +
        '" r="1.6" fill="none" stroke="' + ink + '" stroke-width="0.4" opacity="0.3"/>';
    }
  });

  const rings =
    '<circle cx="50" cy="50" r="46.5" fill="none" stroke="' + ink + '" stroke-width="1.4" opacity="0.88"/>' +
    '<circle cx="50" cy="50" r="41.4" fill="none" stroke="' + ink + '" stroke-width="0.6" opacity="0.6"/>' +
    (big ? '<circle cx="50" cy="50" r="24.2" fill="none" stroke="' + ink + '" stroke-width="0.5" opacity="0.5"/>' : "");

  let arc = "";
  let center = "";
  if (detail === "full") {
    const top = esc(c.name.toUpperCase());
    const bottom = esc("EST ’" + String(c.year).slice(2) + "   •   " + total + " ENTRIES");
    arc =
      '<defs><path id="' + uid + 't" d="M11,50 A39,39 0 0 1 89,50" fill="none"/>' +
      '<path id="' + uid + 'b" d="M16,50 A34,34 0 0 0 84,50" fill="none"/></defs>' +
      '<text font-family="Special Elite,monospace" font-size="7" fill="' + ink + '" letter-spacing="1.2">' +
      '<textPath href="#' + uid + 't" startOffset="50%" text-anchor="middle">' + top + "</textPath></text>" +
      '<text font-family="Special Elite,monospace" font-size="4.4" fill="' + ink + '" letter-spacing="0.8">' +
      '<textPath href="#' + uid + 'b" startOffset="50%" text-anchor="middle">' + bottom + "</textPath></text>";
    center =
      '<circle cx="50" cy="50" r="19" fill="' + ink2 + '" opacity="0.05"/>' +
      '<text x="50" y="54" text-anchor="middle" font-family="Marcellus,serif" font-size="21" fill="' + ink2 + '">' + total + "</text>" +
      '<text x="50" y="61.5" text-anchor="middle" font-family="Special Elite,monospace" font-size="3.8" letter-spacing="1.6" fill="' + ink + '">ENTRIES</text>';
  } else {
    center =
      '<text x="50" y="58.5" text-anchor="middle" font-family="Marcellus,serif" font-size="30" fill="' + ink2 + '">' + total + "</text>";
  }

  const rot = ((Number(c.id) * 37) % 9) - 4;
  return (
    '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size +
    '" style="overflow:visible;display:block;transform:rotate(' + rot + 'deg);">' +
    rings + ticks + arc + pips + center + "</svg>"
  );
}

export function buildPostage(c: LoggedCountry, size: number, detail: string, p: Palette): string {
  const ink = p.sepia;
  const ink2 = p.ink;
  const bg = p.paper2;
  const W = 82;
  const H = 104;
  const total = c.entries.length;
  const counts = countCats(c);

  let perf = "";
  const st = 7.0;
  for (let x = 4; x < W - 2; x += st) {
    perf +=
      '<circle cx="' + x.toFixed(1) + '" cy="2.5" r="2.6" fill="' + bg + '"/>' +
      '<circle cx="' + x.toFixed(1) + '" cy="' + (H - 2.5).toFixed(1) + '" r="2.6" fill="' + bg + '"/>';
  }
  for (let y = 4; y < H - 2; y += st) {
    perf +=
      '<circle cx="2.5" cy="' + y.toFixed(1) + '" r="2.6" fill="' + bg + '"/>' +
      '<circle cx="' + (W - 2.5).toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.6" fill="' + bg + '"/>';
  }

  let pips = "";
  if (detail === "full") {
    ["recipe", "book", "movie", "music", "place"].forEach((k, i) => {
      const n = counts[k] || 0;
      const x = 14 + i * 13.5;
      const y = H - 15;
      const col = catColor(k);
      if (n) {
        pips += '<circle cx="' + x + '" cy="' + y + '" r="' + Math.min(4, 1.8 + Math.sqrt(n) * 0.7).toFixed(2) + '" fill="' + col + '" opacity="0.9"/>';
      } else {
        pips += '<circle cx="' + x + '" cy="' + y + '" r="1.5" fill="none" stroke="' + ink + '" stroke-width="0.4" opacity="0.3"/>';
      }
    });
  }
  const nameTop =
    detail === "full"
      ? '<text x="' + W / 2 + '" y="15" text-anchor="middle" font-family="Special Elite,monospace" font-size="6.2" fill="' + ink + '" letter-spacing="0.3">' + esc(c.name.toUpperCase()) + "</text>"
      : "";
  const corners =
    detail === "full"
      ? '<text x="9" y="13" font-family="Special Elite,monospace" font-size="6" fill="' + ink + '">' + total + "</text>" +
        '<text x="' + (W - 9) + '" y="' + (H - 8) + '" text-anchor="end" font-family="Special Elite,monospace" font-size="6" fill="' + ink + '">' + total + "</text>"
      : "";
  const cap =
    detail === "full"
      ? '<text x="' + W / 2 + '" y="' + (H / 2 + 19) + '" text-anchor="middle" font-family="Special Elite,monospace" font-size="3.8" letter-spacing="2" fill="' + ink + '">ENTRIES LOGGED</text>'
      : "";
  const rot = ((Number(c.id) * 37) % 9) - 4;
  return (
    '<svg viewBox="0 0 ' + W + " " + H + '" width="' + size + '" height="' + (size * H / W).toFixed(0) +
    '" style="overflow:visible;display:block;transform:rotate(' + rot + 'deg);">' +
    '<rect x="2.5" y="2.5" width="' + (W - 5) + '" height="' + (H - 5) + '" fill="' + p.paper2 + '" stroke="' + ink + '" stroke-width="0.8"/>' +
    '<rect x="6" y="6" width="' + (W - 12) + '" height="' + (H - 12) + '" fill="none" stroke="' + ink + '" stroke-width="0.5" opacity="0.6"/>' +
    perf + nameTop + corners +
    '<text x="' + W / 2 + '" y="' + (H / 2 + 8) + '" text-anchor="middle" font-family="Marcellus,serif" font-size="33" fill="' + ink2 + '">' + total + "</text>" +
    cap + pips + "</svg>"
  );
}
