// Worn-ink passport stamp builders, ported from the "Passport Page" design
// export. Each logged entry becomes a randomised rubber-stamp impression
// (round / oval / rect / hex / cog) in a category ink colour, roughed up by the
// SVG turbulence filters defined in the Logbook component.

import type { CategoryKey, Entry } from "./types";

// Dark inks for light paper (multiply blend).
const INK2: Record<CategoryKey, string> = {
  recipe: "#A23A2E",
  book: "#2C4F8A",
  movie: "#3A3733",
  music: "#2E6B4F",
  place: "#6B3A77",
};
// Light inks for dark paper (screen blend) — luminous versions of each colour.
const INK_DARK: Record<CategoryKey, string> = {
  recipe: "#E8A292",
  book: "#9CBDEC",
  movie: "#CBC4B6",
  music: "#92CCAE",
  place: "#CDA2D6",
};

// The passport-book page colour. Stamps render with normal compositing (no
// mix-blend-mode — blended layers glitch in GPU compositors), so the multiply
// against the paper is baked into the ink colour instead.
const PAPER: [number, number, number] = [243, 234, 214];

function bakeInk(hex: string): string {
  const to2 = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return "#" + to2((r * PAPER[0]) / 255) + to2((g * PAPER[1]) / 255) + to2((b * PAPER[2]) / 255);
}
const CATL: Record<CategoryKey, string> = {
  recipe: "RECIPE",
  book: "BOOK",
  movie: "FILM",
  music: "MUSIC",
  place: "PLACE",
};
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const ACTIONS = ["ENTRY", "ARRIVAL", "ADMITTED", "ENTRADA", "DEPARTED", "VISTO"];

let uid = 0;

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function wrap(t: string, mx = 12): string[] {
  const words = String(t).split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur ? cur + " " + w : w).length <= mx) {
      cur = cur ? cur + " " + w : w;
    } else {
      if (cur) lines.push(cur);
      cur = w.length > mx ? w.slice(0, mx - 1) + "…" : w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > 3) {
    const k = lines.slice(0, 3);
    k[2] = k[2].slice(0, mx - 2) + "…";
    return k;
  }
  return lines;
}

function rseed(seed: number, k: number): number {
  const s = Math.sin((seed + 1) * (k + 1.7) * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}
function fmtDate(rnd: (k: number) => number, entry: Entry): string {
  // The entry's real logged date when it has one; entries that predate the
  // date field get a fabricated day/month (seeded, so stable per stamp).
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(entry.date);
  const year = m ? Number(m[1]) : entry.year;
  const mon = m ? Number(m[2]) - 1 : Math.floor(rnd(8) * 12);
  const day = m ? Number(m[3]) : 1 + Math.floor(rnd(7) * 27);
  const f = Math.floor(rnd(9) * 3);
  const M = MONTHS[mon] ?? MONTHS[0];
  if (f === 0) return pad(day) + " " + M + " " + year;
  if (f === 1) return pad(day) + "." + pad(mon + 1) + "." + year;
  return year + " " + pad(mon + 1) + " " + pad(day);
}
function arc(id: string, txt: string, r: number, fs: number, ink: string, top: boolean, ls: number): string {
  const d = top
    ? "M" + (50 - r) + ",50 A" + r + "," + r + " 0 0 1 " + (50 + r) + ",50"
    : "M" + (50 - r) + ",50 A" + r + "," + r + " 0 0 0 " + (50 + r) + ",50";
  return (
    '<defs><path id="' + id + '" d="' + d + '"/></defs>' +
    '<text font-family="Special Elite,monospace" font-weight="bold" font-size="' + fs + '" fill="' + ink + '" letter-spacing="' + ls + '">' +
    '<textPath href="#' + id + '" startOffset="50%" text-anchor="middle">' + esc(txt) + "</textPath></text>"
  );
}
function poly(cx: number, cy: number, r: number, sides: number, rot: number): string {
  let p = "";
  for (let i = 0; i < sides; i++) {
    const a = ((rot + (i * 360) / sides) * Math.PI) / 180;
    p += (i ? "L" : "M") + (cx + Math.cos(a) * r).toFixed(1) + "," + (cy + Math.sin(a) * r).toFixed(1) + " ";
  }
  return p + "Z";
}

interface ShapeOpts {
  ink: string;
  country: string;
  cat: string;
  title: string;
  action: string;
  date: string;
  ref: string;
  uid: string;
}

function sRound(shape: string, o: ShapeOpts): string {
  const { ink, country, cat, title, action, date, ref, uid } = o;
  const L = wrap(title, 11);
  const n = L.length;
  const fs = n === 1 ? (L[0].length <= 6 ? 13 : 11.3) : n === 2 ? 10 : 8.6;
  const lh = fs * 1.04;
  const ty = 45 - ((n - 1) * lh) / 2;
  let ts = "";
  L.forEach((ln, k) => (ts += '<tspan x="50" y="' + (ty + k * lh).toFixed(1) + '">' + esc(ln) + "</tspan>"));
  const dy = Math.min(67, ty + n * lh + 4.5);
  let edge =
    '<circle cx="50" cy="50" r="46.5" fill="none" stroke="' + ink + '" stroke-width="1.8"/>' +
    '<circle cx="50" cy="50" r="41.8" fill="none" stroke="' + ink + '" stroke-width="0.7" opacity="0.65"/>';
  if (shape === "cog") {
    let t = "";
    for (let j = 0; j < 50; j++) {
      const a = (j / 50) * 6.2832;
      t +=
        '<line x1="' + (50 + Math.cos(a) * 46.5).toFixed(1) + '" y1="' + (50 + Math.sin(a) * 46.5).toFixed(1) +
        '" x2="' + (50 + Math.cos(a) * 48.8).toFixed(1) + '" y2="' + (50 + Math.sin(a) * 48.8).toFixed(1) +
        '" stroke="' + ink + '" stroke-width="0.7"/>';
    }
    edge = t + edge;
  }
  return (
    edge +
    arc(uid + "a", country.toUpperCase(), 37, 6.3, ink, true, 1.3) +
    arc(uid + "b", cat + "  ·  " + action, 36.5, 4.5, ink, false, 1.4) +
    '<text x="50" y="30.5" text-anchor="middle" font-family="Special Elite,monospace" font-size="4.3" fill="' + ink + '" letter-spacing="1.4">★ ✈ ★</text>' +
    '<text font-family="Marcellus,serif" font-weight="bold" fill="' + ink + '" text-anchor="middle" font-size="' + fs + '">' + ts + "</text>" +
    '<line x1="32" y1="' + (dy - 4.5).toFixed(1) + '" x2="68" y2="' + (dy - 4.5).toFixed(1) + '" stroke="' + ink + '" stroke-width="0.5" stroke-dasharray="1.6 1.4" opacity="0.7"/>' +
    '<text x="50" y="' + dy.toFixed(1) + '" text-anchor="middle" font-family="Special Elite,monospace" font-weight="bold" font-size="6.8" fill="' + ink + '" letter-spacing="0.4">' + date + "</text>" +
    '<text x="50" y="73.5" text-anchor="middle" font-family="Special Elite,monospace" font-size="3.7" fill="' + ink + '" opacity="0.8">' + ref + "</text>"
  );
}

function sOval(o: ShapeOpts): string {
  const { ink, country, title, action, date } = o;
  const L = wrap(title, 13).slice(0, 2);
  const n = L.length;
  const fs = n === 1 ? (L[0].length <= 8 ? 12.5 : 10.8) : 9.8;
  const lh = fs * 1.02;
  const ty = 48 - ((n - 1) * lh) / 2;
  let ts = "";
  L.forEach((ln, k) => (ts += '<tspan x="50" y="' + (ty + k * lh).toFixed(1) + '">' + esc(ln) + "</tspan>"));
  return (
    '<ellipse cx="50" cy="50" rx="47" ry="31.5" fill="none" stroke="' + ink + '" stroke-width="1.8"/>' +
    '<ellipse cx="50" cy="50" rx="42.6" ry="27.5" fill="none" stroke="' + ink + '" stroke-width="0.6" opacity="0.6"/>' +
    '<text x="50" y="27" text-anchor="middle" font-family="Special Elite,monospace" font-weight="bold" font-size="5.3" fill="' + ink + '" letter-spacing="1.4">' + esc(country.toUpperCase()) + "</text>" +
    '<line x1="24" y1="30" x2="76" y2="30" stroke="' + ink + '" stroke-width="0.5" opacity="0.55"/>' +
    '<text font-family="Marcellus,serif" font-weight="bold" fill="' + ink + '" text-anchor="middle" font-size="' + fs + '">' + ts + "</text>" +
    '<text x="50" y="' + (ty + n * lh + 4.6).toFixed(1) + '" text-anchor="middle" font-family="Special Elite,monospace" font-weight="bold" font-size="6.2" fill="' + ink + '">' + date + "</text>" +
    '<text x="50" y="72.5" text-anchor="middle" font-family="Special Elite,monospace" font-size="4.2" fill="' + ink + '" letter-spacing="0.8">★ ' + action + " ★</text>"
  );
}

function sRect(o: ShapeOpts): string {
  const { ink, country, cat, title, action, date, ref } = o;
  const L = wrap(title, 13).slice(0, 2);
  const n = L.length;
  const fs = n === 1 ? (L[0].length <= 8 ? 13.5 : 11.5) : 10.2;
  const lh = fs * 1.03;
  const ty = 51 - ((n - 1) * lh) / 2;
  let ts = "";
  L.forEach((ln, k) => (ts += '<tspan x="50" y="' + (ty + k * lh).toFixed(1) + '">' + esc(ln) + "</tspan>"));
  return (
    '<rect x="6" y="17" width="88" height="66" rx="3" fill="none" stroke="' + ink + '" stroke-width="1.8"/>' +
    '<rect x="9.5" y="20.5" width="81" height="59" rx="1.5" fill="none" stroke="' + ink + '" stroke-width="0.6" opacity="0.6"/>' +
    '<text x="50" y="30" text-anchor="middle" font-family="Special Elite,monospace" font-weight="bold" font-size="5.8" fill="' + ink + '" letter-spacing="1.3">' + esc(country.toUpperCase()) + "</text>" +
    '<text x="50" y="36.5" text-anchor="middle" font-family="Special Elite,monospace" font-size="3.9" fill="' + ink + '" letter-spacing="1.6">★ ✈ ★ ' + action + " ★</text>" +
    '<text font-family="Marcellus,serif" font-weight="bold" fill="' + ink + '" text-anchor="middle" font-size="' + fs + '">' + ts + "</text>" +
    '<line x1="16" y1="65.5" x2="84" y2="65.5" stroke="' + ink + '" stroke-width="0.5" stroke-dasharray="2 1.4" opacity="0.65"/>' +
    '<text x="50" y="74" text-anchor="middle" font-family="Special Elite,monospace" font-weight="bold" font-size="6.8" fill="' + ink + '">' + date + "</text>" +
    '<text x="50" y="79.5" text-anchor="middle" font-family="Special Elite,monospace" font-size="3.5" fill="' + ink + '" opacity="0.8" letter-spacing="0.8">' + cat + "   " + ref + "</text>"
  );
}

function sHex(o: ShapeOpts): string {
  const { ink, country, cat, title, action, date, ref } = o;
  const L = wrap(title, 12).slice(0, 2);
  const n = L.length;
  const fs = n === 1 ? (L[0].length <= 7 ? 13 : 11) : 9.8;
  const lh = fs * 1.03;
  const ty = 51 - ((n - 1) * lh) / 2;
  let ts = "";
  L.forEach((ln, k) => (ts += '<tspan x="50" y="' + (ty + k * lh).toFixed(1) + '">' + esc(ln) + "</tspan>"));
  return (
    '<path d="' + poly(50, 50, 47, 6, 0) + '" fill="none" stroke="' + ink + '" stroke-width="1.8"/>' +
    '<path d="' + poly(50, 50, 42.5, 6, 0) + '" fill="none" stroke="' + ink + '" stroke-width="0.6" opacity="0.6"/>' +
    '<text x="50" y="31" text-anchor="middle" font-family="Special Elite,monospace" font-weight="bold" font-size="5.6" fill="' + ink + '" letter-spacing="1.2">' + esc(country.toUpperCase()) + "</text>" +
    '<text x="50" y="37" text-anchor="middle" font-family="Special Elite,monospace" font-size="3.8" fill="' + ink + '" letter-spacing="1.6">★ ' + action + " ★</text>" +
    '<text font-family="Marcellus,serif" font-weight="bold" fill="' + ink + '" text-anchor="middle" font-size="' + fs + '">' + ts + "</text>" +
    '<text x="50" y="' + (ty + n * lh + 5).toFixed(1) + '" text-anchor="middle" font-family="Special Elite,monospace" font-weight="bold" font-size="6.6" fill="' + ink + '">' + date + "</text>" +
    '<text x="50" y="71" text-anchor="middle" font-family="Special Elite,monospace" font-size="3.6" fill="' + ink + '" opacity="0.8">' + cat + "  " + ref + "</text>"
  );
}

/** Build one worn-ink stamp SVG for an entry. `i` seeds its randomised look. */
export function buildEntryStamp(entry: Entry, countryName: string, size: number, i: number, dark = false): string {
  const seed = i * 53 + 11;
  const rnd = (k: number) => rseed(seed, k);
  const rawInk = (dark ? INK_DARK : INK2)[entry.category] || (dark ? "#CBC4B6" : "#3A3733");
  const ink = dark ? rawInk : bakeInk(rawInk);
  const cat = CATL[entry.category] || "ENTRY";
  const o: ShapeOpts = {
    ink,
    country: countryName,
    cat,
    title: entry.title,
    action: ACTIONS[Math.floor(rnd(3) * ACTIONS.length)],
    date: fmtDate(rnd, entry),
    ref: "No " + (1000 + Math.floor(rnd(5) * 8999)),
    uid: "k" + uid++,
  };
  const shape = ["round", "oval", "rect", "hex", "cog"][Math.floor(rnd(1) * 5)];
  let inner: string;
  if (shape === "round" || shape === "cog") inner = sRound(shape, o);
  else if (shape === "oval") inner = sOval(o);
  else if (shape === "rect") inner = sRect(o);
  else inner = sHex(o);
  const fid = "ink" + Math.floor(rnd(6) * 5);
  const op = (0.82 + rnd(10) * 0.15).toFixed(2);
  // 8 units of padding keep the displaced ink strokes inside the SVG box, so
  // a composited stamp layer never clips them at its edges. The artwork still
  // renders at `size` px for the 100-unit design (box is size*1.16).
  const box = Math.round(size * 1.16);
  return (
    '<svg viewBox="-8 -8 116 116" width="' + box + '" height="' + box +
    '" style="display:block;"><g filter="url(#' + fid + ')" opacity="' + op + '">' + inner + "</g></svg>"
  );
}

/** Deterministic cluster placement for a country's stamps (ported layout). */
export interface PlacedStamp {
  key: string;
  left: number;
  top: number;
  size: number;
  rot: number;
  z: number;
  svg: string;
}

export function layoutCluster(entries: Entry[], countryName: string, dark = false): { width: number; height: number; stamps: PlacedStamp[] } {
  const n = entries.length;
  const D = 160;
  const gx = 118;
  const gy = 106;
  const cols = Math.min(4, Math.max(2, Math.round(Math.sqrt(n * 1.25))));
  const rows = Math.ceil(n / cols);
  const W = (cols - 1) * gx + gx / 2 + D;
  const H = (rows - 1) * gy + D;
  const stamps: PlacedStamp[] = [];
  entries.forEach((e, i) => {
    const r = Math.floor(i / cols);
    const col = i % cols;
    const rnd = (k: number) => {
      const s = Math.sin((i + 1) * (k + 2.3) * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    };
    const inRow = Math.min(cols, n - r * cols);
    const rowW = (inRow - 1) * gx + (r % 2 ? gx / 2 : 0);
    const x0 = (W - D - rowW) / 2;
    const off = r % 2 ? gx / 2 : 0;
    const x = x0 + col * gx + off + (rnd(1) - 0.5) * 24;
    const y = r * gy + (rnd(2) - 0.5) * 22;
    const rot = (rnd(3) - 0.5) * 50;
    const Di = Math.round(D * (0.86 + rnd(6) * 0.26));
    const ox = (D - Di) / 2;
    stamps.push({
      key: e.id,
      left: x + ox,
      top: y + ox,
      size: Di,
      rot,
      z: 10 + Math.floor(rnd(4) * 30),
      svg: buildEntryStamp(e, countryName, Di, i, dark),
    });
  });
  return { width: W, height: H, stamps };
}
