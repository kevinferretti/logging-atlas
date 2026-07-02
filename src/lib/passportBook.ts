// Interactive 3D passport booklet, ported from the "ATLAS Passport" design
// export. The book is a fixed physical object on a themed desk: cover →
// identity/bio page → index → one stamp-spread per country → awaiting pages.
// Only the desk reacts to the app theme; the book stays cream.
//
// This is an imperative engine (DOM via innerHTML + manual 3D transforms),
// wrapped by PassportBook.tsx. Stamp SVGs reuse buildEntryStamp from inkstamps
// and the shared ink turbulence filters (rendered by <InkFilters/>).

import { buildEntryStamp } from "./inkstamps";
import type { CategoryKey, Entry } from "./types";

export interface BookHolder {
  name: string;
  surname: string;
  given: string;
  mono: string;
  since: string;
  countries: number;
  entries: number;
  no: string;
  noRaw: string;
  nat: string;
  auth: string;
}

export interface BookCountry {
  id: string;
  name: string;
  prefix: string;
  region: string;
  lon: number;
  lat: number;
  year: number;
  entries: Entry[];
}

export interface BookElements {
  root: HTMLElement;
  desk: HTMLElement;
  scale: HTMLElement;
  shadow: HTMLElement;
  book: HTMLElement;
  tip: HTMLElement;
  label: HTMLElement;
  hint: HTMLElement;
  popover: HTMLElement;
}

export interface BookOptions {
  dark: boolean;
  sound: boolean;
  cover: string;
  onClose: () => void;
  onDeleteEntry: (id: string) => void;
}

type Role = { k: string; ci?: number };
type Spread = { left: Role; right: Role };
type PlacedStamp = { x: number; y: number; d: number; rot: number; z: number; sid: string; svg: string; cap: string; entry: Entry };
type TurnCtx = {
  dir: number;
  side: "L" | "R";
  mode: string;
  front: string;
  frontBg?: string;
  back: string;
  backBg?: string;
  reveal: { el: HTMLElement; role: Role } | null;
  txFrom: number;
  txTo: number;
  fromTurn: number;
  toTurn: number;
};

const COVERS: Record<string, string> = {
  "Navy · Classic": "#1B2A41",
  "Oxblood · Framed": "#5A1E1E",
  "Forest · Embossed": "#1E3A2E",
};
const GOLD = "#C9A24B";
const GOLD_LO = "#9A742B";
const INK: Record<CategoryKey, string> = { recipe: "#A23A2E", book: "#2C4F8A", movie: "#3A3733", music: "#2E6B4F", place: "#6B3A77" };

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function pad(n: number): string {
  return n < 10 ? "0" + n : "" + n;
}

export class PassportBook {
  PAGE_W = 440;
  PAGE_H = 600;

  els!: BookElements;
  opts!: BookOptions;
  holder!: BookHolder;
  countries: BookCountry[] = [];
  spreads: Spread[] = [];

  turn = 0;
  animating = false;
  _dragging = false;
  _built = false;
  _ctx: TurnCtx | null = null;
  _p = 0;
  _scale = 1;
  _lay: Record<string, PlacedStamp[]> = {};
  _ro: ResizeObserver | null = null;
  _key: ((e: KeyboardEvent) => void) | null = null;
  _ac: AudioContext | null = null;

  // DOM handles within the book
  stageEl!: HTMLElement;
  leftEl!: HTMLElement;
  rightEl!: HTMLElement;
  spineEl!: HTMLElement;
  leafEl!: HTMLElement;
  frontEl!: HTMLElement;
  backEl!: HTMLElement;
  curlEl!: HTMLElement;
  slvL!: HTMLElement;
  slvR!: HTMLElement;

  // ---------- lifecycle ----------
  mount(els: BookElements, opts: BookOptions, holder: BookHolder, countries: BookCountry[], initialCountryId?: string | null) {
    this.els = els;
    this.opts = opts;
    this.holder = holder;
    this.countries = countries;
    this.buildSpreads();
    this.buildShell();
    this.applyDesk();
    let t0 = 0;
    if (initialCountryId) {
      const ci = countries.findIndex((c) => c.id === initialCountryId);
      if (ci >= 0) t0 = this.countryTurn(ci);
    }
    this.setRest(t0, true);
    this.rescale();
    this.attachInteractions();
    this._ro = new ResizeObserver(() => this.rescale());
    this._ro.observe(els.root);
  }

  destroy() {
    if (this._ro) this._ro.disconnect();
    if (this._key) window.removeEventListener("keydown", this._key);
  }

  /** Refresh data (e.g. after an entry is deleted) keeping the current page. */
  setData(holder: BookHolder, countries: BookCountry[]) {
    this.holder = holder;
    this.countries = countries;
    this._lay = {};
    this.buildSpreads();
    const t = Math.min(this.turn, this.maxTurn);
    this.setRest(t, false);
  }

  setDark(dark: boolean) {
    this.opts.dark = dark;
    this.applyDesk();
  }

  // ---------- structure ----------
  get coverName(): string {
    return COVERS[this.opts.cover] ? this.opts.cover : "Navy · Classic";
  }
  coverBg(): string {
    return COVERS[this.coverName];
  }
  get maxTurn(): number {
    return this.spreads.length + 1; // 0 = front cover, spreads.length+1 = back cover
  }
  countryTurn(ci: number): number {
    // country spread index within `spreads`, then +1 for the closed-cover turn 0
    const idx = this.spreads.findIndex((s) => s.left.k === "cL" && s.left.ci === ci);
    return idx + 1;
  }

  buildSpreads() {
    const s: Spread[] = [{ left: { k: "insidecover" }, right: { k: "identity" } }];
    if (this.countries.length) {
      s.push({ left: { k: "index" }, right: { k: "indexkey" } });
      this.countries.forEach((_, i) => s.push({ left: { k: "cL", ci: i }, right: { k: "cR", ci: i } }));
    }
    s.push({ left: { k: "await" }, right: { k: "await" } });
    this.spreads = s;
  }

  // ---------- helpers ----------
  fmtCoord(c: { lat: number; lon: number }): string {
    const la = Math.abs(c.lat).toFixed(1) + "°" + (c.lat >= 0 ? "N" : "S");
    const lo = Math.abs(c.lon).toFixed(1) + "°" + (c.lon >= 0 ? "E" : "W");
    return la + "  " + lo;
  }
  rseed(seed: number, k: number): number {
    const v = Math.sin((seed + 1) * (k + 1.7) * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  }
  GRAIN(op: number): string {
    return (
      "background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\");background-size:150px;opacity:" +
      op +
      ";mix-blend-mode:multiply;"
    );
  }

  // ---------- crest / chip / globe ----------
  crest(size: number, gold?: string, dark?: string): string {
    const g = gold || GOLD;
    const d = dark || GOLD_LO;
    let ticks = "";
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * 6.2832;
      ticks +=
        '<line x1="' + (50 + Math.cos(a) * 40).toFixed(1) + '" y1="' + (50 + Math.sin(a) * 40).toFixed(1) +
        '" x2="' + (50 + Math.cos(a) * 43).toFixed(1) + '" y2="' + (50 + Math.sin(a) * 43).toFixed(1) +
        '" stroke="' + g + '" stroke-width="0.8" opacity="0.85"/>';
    }
    const star = "M50 12 L56 44 L88 50 L56 56 L50 88 L44 56 L12 50 L44 44 Z";
    return (
      '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '" style="display:block;overflow:visible;">' +
      '<circle cx="50" cy="50" r="46" fill="none" stroke="' + g + '" stroke-width="1.4"/>' +
      '<circle cx="50" cy="50" r="43" fill="none" stroke="' + g + '" stroke-width="0.6" opacity="0.7"/>' + ticks +
      '<path d="' + star + '" fill="' + d + '" transform="translate(0.7,0.9)" opacity="0.55"/>' +
      '<path d="' + star + '" fill="' + g + '"/>' +
      '<circle cx="50" cy="50" r="6.4" fill="' + this.coverBg() + '"/>' +
      '<circle cx="50" cy="50" r="6.4" fill="none" stroke="' + g + '" stroke-width="1"/>' +
      '<circle cx="50" cy="50" r="2.1" fill="' + g + '"/></svg>'
    );
  }
  chip(size: number, gold?: string): string {
    const g = gold || GOLD;
    return (
      '<svg viewBox="0 0 40 30" width="' + size + '" height="' + size * 0.75 + '" style="display:block;"><rect x="1" y="1" width="38" height="28" rx="4" fill="none" stroke="' + g + '" stroke-width="1.3"/><rect x="13.5" y="9" width="13" height="12" rx="2" fill="none" stroke="' + g + '" stroke-width="1.2"/><line x1="20" y1="1.5" x2="20" y2="9" stroke="' + g + '" stroke-width="1.1"/><line x1="20" y1="21" x2="20" y2="28.5" stroke="' + g + '" stroke-width="1.1"/><line x1="1.5" y1="15" x2="13.5" y2="15" stroke="' + g + '" stroke-width="1.1"/><line x1="26.5" y1="15" x2="38.5" y2="15" stroke="' + g + '" stroke-width="1.1"/><path d="M30 9 a7 7 0 0 1 0 12" fill="none" stroke="' + g + '" stroke-width="1.1"/><path d="M33 6 a11 11 0 0 1 0 18" fill="none" stroke="' + g + '" stroke-width="1" opacity="0.8"/></svg>'
    );
  }
  globe(w: number, h: number, color?: string, op?: number, cx?: number): string {
    const C = color || "#CBB68C";
    const r = Math.min(w, h) * 0.42;
    const ox = cx !== undefined ? cx : w / 2;
    const oy = h / 2;
    let par = "";
    for (let i = 1; i <= 4; i++) {
      const yy = (r * i) / 5;
      const rx = Math.sqrt(Math.max(0, r * r - yy * yy)).toFixed(1);
      par += '<ellipse cx="' + ox + '" cy="' + (oy - yy).toFixed(1) + '" rx="' + rx + '" ry="' + (r * 0.1).toFixed(1) + '" fill="none" stroke="' + C + '" stroke-width="1"/>';
      par += '<ellipse cx="' + ox + '" cy="' + (oy + yy).toFixed(1) + '" rx="' + rx + '" ry="' + (r * 0.1).toFixed(1) + '" fill="none" stroke="' + C + '" stroke-width="1"/>';
    }
    par += '<ellipse cx="' + ox + '" cy="' + oy + '" rx="' + r.toFixed(1) + '" ry="' + (r * 0.1).toFixed(1) + '" fill="none" stroke="' + C + '" stroke-width="1"/>';
    let mer = "";
    for (let i = 1; i <= 3; i++) {
      const rx = (r * i) / 4;
      mer += '<ellipse cx="' + ox + '" cy="' + oy + '" rx="' + rx.toFixed(1) + '" ry="' + r.toFixed(1) + '" fill="none" stroke="' + C + '" stroke-width="1"/>';
    }
    mer += '<line x1="' + ox + '" y1="' + (oy - r).toFixed(1) + '" x2="' + ox + '" y2="' + (oy + r).toFixed(1) + '" stroke="' + C + '" stroke-width="1"/>';
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" style="display:block;opacity:' + (op || 1) + ';"><circle cx="' + ox + '" cy="' + oy + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + C + '" stroke-width="1.4"/>' + par + mer + "</svg>";
  }
  cornerOrn(g: string): string {
    return '<svg viewBox="0 0 44 44" width="44" height="44" style="display:block;"><path d="M6 38 Q6 6 38 6" fill="none" stroke="' + g + '" stroke-width="1"/><path d="M11 38 Q11 11 38 11" fill="none" stroke="' + g + '" stroke-width="0.6" opacity="0.7"/><circle cx="14" cy="14" r="2.4" fill="' + g + '"/></svg>';
  }

  // ---------- stamp cluster ----------
  layout(ci: number): PlacedStamp[] {
    const key = "c" + ci;
    if (this._lay[key]) return this._lay[key];
    const co = this.countries[ci];
    const ents = co.entries;
    const n = ents.length;
    const W = this.PAGE_W * 2;
    const H = this.PAGE_H;
    const cols = Math.min(5, Math.max(3, Math.round(Math.sqrt(n * 1.7))));
    const rows = Math.ceil(n / cols);
    const base = n >= 12 ? 158 : n >= 8 ? 174 : 198;
    const padTop = 118;
    const padX = 44;
    const padBot = 38;
    const usableW = W - padX * 2;
    const usableH = H - padTop - padBot;
    const cw = usableW / cols;
    const ch = usableH / rows;
    const items: PlacedStamp[] = ents.map((e, i) => {
      const r = Math.floor(i / cols);
      const col = i % cols;
      const inRow = r < rows - 1 ? cols : n - cols * (rows - 1);
      const rowOff = ((cols - inRow) * cw) / 2;
      const jx = (this.rseed(ci * 131 + i, 1) - 0.5) * cw * 0.66;
      const jy = (this.rseed(ci * 131 + i, 2) - 0.5) * ch * 0.66;
      let cx = padX + rowOff + cw * (col + 0.5) + jx;
      const cy = padTop + ch * (r + 0.5) + jy;
      const d = Math.round(base * (0.82 + this.rseed(ci * 131 + i, 3) * 0.34));
      const cen = W / 2;
      const keep = d * 0.4;
      if (Math.abs(cx - cen) < keep) cx = cen + (cx < cen ? -keep : keep);
      const rot = (this.rseed(ci * 131 + i, 4) - 0.5) * 46;
      const cap = e.title + "  ·  '" + String(e.year).slice(2);
      return {
        x: cx,
        y: cy,
        d,
        rot,
        z: 10 + Math.floor(this.rseed(ci * 131 + i, 5) * 40),
        sid: "k" + ci + "_" + i,
        svg: buildEntryStamp(e, co.name, d, i),
        cap,
        entry: e,
      };
    });
    this._lay[key] = items;
    return items;
  }
  clusterHTML(ci: number, offset: number): string {
    const items = this.layout(ci);
    let h = "";
    items.forEach((it) => {
      h +=
        '<div class="om-stamp" data-sid="' + it.sid + '" data-eid="' + esc(it.entry.id) + '" data-cap="' + esc(it.cap) +
        '" style="position:absolute;left:' + (it.x + offset - it.d / 2).toFixed(1) + "px;top:" + (it.y - it.d / 2).toFixed(1) +
        "px;width:" + it.d + "px;height:" + it.d + "px;--r:" + it.rot.toFixed(1) + "deg;transform:rotate(" + it.rot.toFixed(1) +
        'deg);mix-blend-mode:multiply;z-index:' + it.z + ';cursor:pointer;transition:transform .16s ease,filter .16s ease;">' + it.svg + "</div>";
    });
    return h;
  }
  entryBySid(sid: string): { entry: Entry; country: BookCountry } | null {
    const m = sid.match(/^k(\d+)_(\d+)$/);
    if (!m) return null;
    const ci = +m[1];
    const co = this.countries[ci];
    if (!co) return null;
    const items = this.layout(ci);
    const it = items.find((x) => x.sid === sid);
    return it ? { entry: it.entry, country: co } : null;
  }

  // ---------- page chrome ----------
  paperBase(side: string): string {
    const innerShade =
      side === "L"
        ? "background:linear-gradient(to right,rgba(60,40,15,.13),rgba(60,40,15,.04) 7%,transparent 16%);"
        : side === "R"
        ? "background:linear-gradient(to left,rgba(60,40,15,.13),rgba(60,40,15,.04) 7%,transparent 16%);"
        : "background:none;";
    return (
      '<div style="position:absolute;inset:0;pointer-events:none;' + this.GRAIN(0.05) + '"></div>' +
      '<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 78% 18%,rgba(150,110,60,.10),transparent 9%),radial-gradient(circle at 20% 70%,rgba(150,110,60,.08),transparent 7%),radial-gradient(circle at 60% 88%,rgba(150,110,60,.07),transparent 6%);"></div>' +
      '<div style="position:absolute;inset:0;pointer-events:none;' + innerShade + '"></div>' +
      '<div style="position:absolute;inset:9px;border:1px solid rgba(140,120,80,.32);border-radius:2px;pointer-events:none;"></div>'
    );
  }

  pageHTML(kind: string): string {
    if (kind === "cover" || kind === "backcover") return this.coverHTML(kind === "backcover");
    if (kind === "insidecover") return this.insideCoverHTML();
    if (kind === "identity") return this.identityHTML();
    if (kind === "index") return this.indexHTML();
    if (kind === "indexkey") return this.indexKeyHTML();
    if (kind === "await") return this.awaitHTML();
    return "";
  }
  pageRoleHTML(role: Role): string {
    if (role.k === "cL") return this.countryHTML(role.ci!, "L");
    if (role.k === "cR") return this.countryHTML(role.ci!, "R");
    return this.pageHTML(role.k);
  }
  isCover(roleK: string): boolean {
    return roleK === "cover" || roleK === "backcover";
  }

  // ---------- covers ----------
  coverHTML(back: boolean): string {
    const t = this.coverName;
    const bg = this.coverBg();
    const g = GOLD;
    const grain = '<div style="position:absolute;inset:0;' + this.GRAIN(0.16) + 'pointer-events:none;"></div>';
    const sheen = '<div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.07),transparent 38%,transparent 60%,rgba(0,0,0,.22));"></div>';
    if (back) {
      return (
        '<div style="position:absolute;inset:0;background:' + bg + ';overflow:hidden;">' + grain + sheen +
        '<div style="position:absolute;inset:20px;border:1px solid ' + g + ';opacity:.5;border-radius:4px;"></div><div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;"><div style="display:inline-flex;">' + this.crest(58, g, GOLD_LO) + '</div><div style="font-family:\'Special Elite\',monospace;font-size:9px;letter-spacing:4px;color:' + g + ';margin-top:16px;opacity:.85;">ATLAS · BUREAU OF THINGS LOGGED</div></div><div style="position:absolute;bottom:26px;left:0;right:0;text-align:center;font-family:\'Courier Prime\',monospace;font-size:8px;letter-spacing:2px;color:' + g + ';opacity:.6;">' + esc(this.holder.noRaw) + "</div></div>"
      );
    }
    const textShadow = "text-shadow:0 1px 0 rgba(0,0,0,.45),0 -1px 0 rgba(255,255,255,.10);";
    if (t === "Oxblood · Framed") {
      return (
        '<div style="position:absolute;inset:0;background:' + bg + ';overflow:hidden;">' + grain + sheen +
        '<div style="position:absolute;inset:18px;border:1.5px solid ' + g + ';border-radius:5px;"></div>' +
        '<div style="position:absolute;inset:24px;border:0.5px solid ' + g + ';opacity:.6;border-radius:4px;"></div>' +
        '<div style="position:absolute;top:13px;left:13px;">' + this.cornerOrn(g) + '</div><div style="position:absolute;top:13px;right:13px;transform:scaleX(-1);">' + this.cornerOrn(g) + '</div><div style="position:absolute;bottom:13px;left:13px;transform:scaleY(-1);">' + this.cornerOrn(g) + '</div><div style="position:absolute;bottom:13px;right:13px;transform:scale(-1,-1);">' + this.cornerOrn(g) + "</div>" +
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:64px 40px;">' +
        '<div style="font-family:\'Special Elite\',monospace;font-size:10px;letter-spacing:6px;color:' + g + ";" + textShadow + '">✦ PASSEPORT ✦</div>' +
        '<div style="height:1px;width:120px;background:' + g + ';margin:14px 0 22px;opacity:.7;"></div>' +
        '<div style="position:relative;display:inline-flex;padding:14px;"><div style="position:absolute;inset:0;border:1px solid ' + g + ';border-radius:50%;opacity:.55;"></div>' + this.crest(120, g, GOLD_LO) + "</div>" +
        '<div style="margin-top:30px;border-top:1px solid ' + g + ";border-bottom:1px solid " + g + ';padding:9px 30px;"><div style="font-family:\'Marcellus SC\',\'Marcellus\',serif;font-size:48px;letter-spacing:11px;color:' + g + ";line-height:1;" + textShadow + '">ATLAS</div></div>' +
        '<div style="margin-top:18px;font-family:\'Special Elite\',monospace;font-size:10px;letter-spacing:4px;color:' + g + ";opacity:.92;" + textShadow + '">PASSPORT OF THINGS LOGGED</div>' +
        '<div style="flex:1;"></div></div>' +
        '<div style="position:absolute;bottom:30px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:9px;color:' + g + ';"><div style="display:inline-flex;">' + this.chip(30, g) + '</div><span style="font-family:\'Special Elite\',monospace;font-size:8.5px;letter-spacing:3px;opacity:.8;">BIOMETRIC</span></div>' +
        "</div>"
      );
    }
    if (t === "Forest · Embossed") {
      const emboss = "text-shadow:0 1.4px 0 rgba(0,0,0,.5),0 -1px 0 rgba(255,255,255,.12);";
      return (
        '<div style="position:absolute;inset:0;background:' + bg + ';overflow:hidden;">' + grain + sheen +
        '<div style="position:absolute;inset:22px;border:1px solid ' + g + ';opacity:.28;border-radius:3px;"></div>' +
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:84px 44px 0;">' +
        '<div style="display:inline-flex;opacity:.92;">' + this.crest(78, g, GOLD_LO) + "</div>" +
        '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
        '<div style="font-family:\'Marcellus\',serif;font-size:54px;letter-spacing:15px;color:' + g + ";line-height:1;" + emboss + ';padding-left:15px;">ATLAS</div>' +
        '<div style="margin-top:22px;width:54px;height:1px;background:' + g + ';opacity:.6;"></div>' +
        '<div style="margin-top:22px;font-family:\'Special Elite\',monospace;font-size:9px;letter-spacing:5px;color:' + g + ";opacity:.78;text-align:center;" + emboss + '">PASSPORT OF<br>THINGS LOGGED</div>' +
        "</div>" +
        '<div style="display:flex;align-items:center;gap:9px;color:' + g + ';opacity:.85;margin-bottom:34px;"><div style="display:inline-flex;">' + this.chip(28, g) + "</div></div>" +
        "</div></div>"
      );
    }
    // Navy · Classic (default)
    return (
      '<div style="position:absolute;inset:0;background:' + bg + ';overflow:hidden;">' + grain + sheen +
      '<div style="position:absolute;inset:16px;border:1px solid ' + g + ';opacity:.85;border-radius:3px;"></div>' +
      '<div style="position:absolute;inset:21px;border:0.5px solid ' + g + ';opacity:.45;border-radius:2px;"></div>' +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:70px 40px 0;">' +
      '<svg viewBox="0 0 320 78" width="280" height="62" style="overflow:visible;"><defs><path id="atlasArc" d="M18,70 A250,250 0 0 1 302,70" fill="none"/></defs><text font-family="Marcellus,serif" font-size="40" letter-spacing="14" fill="' + g + '" style="' + textShadow + '"><textPath href="#atlasArc" startOffset="50%" text-anchor="middle">ATLAS</textPath></text></svg>' +
      '<div style="flex:1;display:flex;align-items:center;justify-content:center;margin:6px 0;"><div style="display:inline-flex;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">' + this.crest(140, g, GOLD_LO) + "</div></div>" +
      '<div style="font-family:\'Special Elite\',monospace;font-size:10.5px;letter-spacing:4.5px;color:' + g + ";" + textShadow + ';text-align:center;">PASSPORT OF THINGS LOGGED</div>' +
      '<div style="margin-top:10px;font-family:\'Special Elite\',monospace;font-size:8px;letter-spacing:3px;color:' + g + ';opacity:.6;">✦ ✦ ✦</div>' +
      '<div style="margin:30px 0 38px;display:flex;align-items:center;gap:10px;color:' + g + ';"><div style="display:inline-flex;">' + this.chip(32, g) + "</div></div>" +
      "</div></div>"
    );
  }

  // ---------- inside front cover ----------
  insideCoverHTML(): string {
    return (
      '<div style="position:absolute;inset:0;background:#EFE3C6;overflow:hidden;">' +
      '<div style="position:absolute;inset:0;' + this.GRAIN(0.07) + 'pointer-events:none;"></div>' +
      '<div style="position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(160,120,70,.05) 0 2px,transparent 2px 7px),repeating-linear-gradient(-45deg,rgba(160,120,70,.05) 0 2px,transparent 2px 7px);"></div>' +
      '<div style="position:absolute;inset:16px;border:1px double rgba(138,90,59,.4);border-radius:3px;"></div>' +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:54px;">' +
      '<div style="display:inline-flex;opacity:.5;margin-bottom:26px;">' + this.crest(64, "#9A742B", "#7a5a1e") + "</div>" +
      '<div style="font-family:\'Special Elite\',monospace;font-size:10px;letter-spacing:3px;color:#6b5b3e;line-height:2.1;text-wrap:balance;">THIS PASSPORT IS THE PROPERTY OF<br>THE HOLDER NAMED WITHIN, AND RECORDS<br>EVERY THING THEY HAVE LOGGED IN THE WORLD.</div>' +
      '<div style="margin:28px auto;width:140px;height:1px;background:rgba(138,90,59,.45);"></div>' +
      '<div style="font-family:\'EB Garamond\',serif;font-style:italic;font-size:15px;color:#7a6a48;max-width:300px;text-wrap:pretty;">Carry it lightly. Stamp it often. The blank pages are a promise, not an emptiness.</div>' +
      '<div style="margin-top:34px;font-family:\'Courier Prime\',monospace;font-size:9px;letter-spacing:2px;color:#8a7a58;">ATLAS · BUREAU OF THINGS LOGGED</div>' +
      "</div></div>"
    );
  }

  // ---------- identity / bio page ----------
  identityHTML(): string {
    const H = this.holder;
    const ink = "#2E2A22";
    const soft = "#7A6E54";
    const sep = "#8A5A3B";
    const fld = (label: string, val: string, big?: boolean) =>
      '<div style="margin-bottom:13px;"><div style="font-family:\'Special Elite\',monospace;font-size:8px;letter-spacing:1.8px;color:' + soft + ';text-transform:uppercase;">' + label + '</div><div style="font-family:\'EB Garamond\',serif;font-size:' + (big ? 20 : 16) + "px;color:" + ink + ';line-height:1.15;margin-top:1px;">' + val + "</div></div>";
    const mrz1 = ("P<" + H.nat + H.surname + "<<" + H.given + "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<").replace(/\s/g, "<").slice(0, 44);
    const mrz2 = (H.noRaw + "7" + H.nat + "9103144X3712258<<<<<<<<<<<<<<06").slice(0, 44);
    return (
      '<div style="position:absolute;inset:0;background:#F3EAD6;overflow:hidden;">' + this.paperBase("R") +
      '<div style="position:absolute;left:0;right:0;top:46%;transform:translateY(-50%);display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:.06;">' + this.globe(330, 330, "#9A742B", 1) + "</div>" +
      '<div style="position:absolute;inset:0;pointer-events:none;opacity:.5;background:repeating-radial-gradient(circle at 50% 46%,transparent 0 14px,rgba(160,130,80,.05) 14px 15px);"></div>' +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:30px 34px 22px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5px solid ' + ink + ';padding-bottom:9px;">' +
      '<div style="font-family:\'Marcellus\',serif;font-size:13px;letter-spacing:5px;color:' + ink + ';">ATLAS</div>' +
      '<div style="text-align:right;"><div style="font-family:\'Special Elite\',monospace;font-size:9px;letter-spacing:2px;color:' + soft + ';">PASSPORT · PASSEPORT</div></div>' +
      "</div>" +
      '<div style="display:flex;justify-content:space-between;font-family:\'Courier Prime\',monospace;font-size:8.5px;letter-spacing:1px;color:' + soft + ';padding:6px 0 14px;"><span>TYPE&nbsp;&nbsp;<b style="color:' + ink + ';">P</b></span><span>CODE&nbsp;&nbsp;<b style="color:' + ink + ';">ATL</b></span><span>PASSPORT No.&nbsp;&nbsp;<b style="color:' + ink + ';">' + esc(H.no) + "</b></span></div>" +
      '<div style="display:flex;gap:22px;flex:1;">' +
      '<div style="flex:0 0 126px;">' +
      '<div style="position:relative;width:126px;height:158px;border:1px solid ' + sep + ';background:#EDE0C2;overflow:hidden;box-shadow:inset 0 0 0 4px #F3EAD6,inset 0 0 0 5px rgba(138,90,59,.4);">' +
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:.5;">' + this.globe(126, 158, "#B79F73", 0.9) + "</div>" +
      '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;"><span style="font-family:\'Marcellus\',serif;font-size:74px;color:rgba(46,42,34,.34);letter-spacing:-2px;">' + esc(H.mono) + "</span></div>" +
      '<div style="position:absolute;left:6px;bottom:5px;font-family:\'Courier Prime\',monospace;font-size:6.5px;letter-spacing:1px;color:' + sep + ';opacity:.8;">ATL·' + esc(H.mono) + "</div>" +
      "</div>" +
      '<div style="margin-top:10px;font-family:\'Special Elite\',monospace;font-size:7.5px;letter-spacing:1.4px;color:' + soft + ';text-transform:uppercase;">Holder’s mark</div>' +
      '<div style="font-family:\'Marcellus\',serif;font-size:23px;color:' + ink + ';font-style:italic;border-bottom:1px solid rgba(138,90,59,.4);padding-bottom:3px;transform:rotate(-3deg);transform-origin:left;">' + esc(H.name) + "</div>" +
      "</div>" +
      '<div style="flex:1;min-width:0;">' +
      fld("Surname / Given names", '<b style="font-weight:600;">' + esc(H.surname) + "</b> &nbsp; " + esc(H.given), true) +
      '<div style="display:flex;gap:26px;">' + fld("Issued by", esc(H.nat)) + fld("Authority", esc(H.auth)) + "</div>" +
      '<div style="display:flex;gap:26px;">' + fld("Member since", esc(H.since)) + fld("Nationality", "CITIZEN OF THE WORLD") + "</div>" +
      '<div style="display:flex;gap:26px;">' +
      '<div style="margin-bottom:13px;"><div style="font-family:\'Special Elite\',monospace;font-size:8px;letter-spacing:1.8px;color:' + soft + ';">COUNTRIES</div><div style="font-family:\'Marcellus\',serif;font-size:30px;color:' + sep + ';line-height:1;">' + H.countries + "</div></div>" +
      '<div style="margin-bottom:13px;"><div style="font-family:\'Special Elite\',monospace;font-size:8px;letter-spacing:1.8px;color:' + soft + ';">ENTRIES</div><div style="font-family:\'Marcellus\',serif;font-size:30px;color:' + sep + ';line-height:1;">' + H.entries + "</div></div>" +
      '<div style="margin-bottom:13px;"><div style="font-family:\'Special Elite\',monospace;font-size:8px;letter-spacing:1.8px;color:' + soft + ';">FIRST LOGGED</div><div style="font-family:\'EB Garamond\',serif;font-size:16px;color:' + ink + ';line-height:1.4;">' + esc(H.since) + "</div></div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div style="margin-top:8px;border-top:1px solid rgba(46,42,34,.25);padding-top:9px;background:linear-gradient(#F3EAD6,#EEE2C4);">' +
      '<div style="font-family:\'Courier Prime\',monospace;font-weight:700;font-size:13px;letter-spacing:1.5px;color:' + ink + ';white-space:nowrap;overflow:hidden;">' + esc(mrz1) + "</div>" +
      '<div style="font-family:\'Courier Prime\',monospace;font-weight:700;font-size:13px;letter-spacing:1.5px;color:' + ink + ';white-space:nowrap;overflow:hidden;margin-top:3px;">' + esc(mrz2) + "</div>" +
      "</div>" +
      "</div></div>"
    );
  }

  // ---------- index / contents ----------
  indexHTML(): string {
    const ink = "#2E2A22";
    const soft = "#7A6E54";
    const sep = "#8A5A3B";
    const line = "rgba(140,120,80,.4)";
    let rows = "";
    this.countries.forEach((c, i) => {
      const pg = pad((i + 1) * 2 + 1);
      rows +=
        '<button data-jump="' + this.countryTurn(i) + '" style="display:flex;align-items:center;width:100%;text-align:left;background:none;border:none;border-bottom:1px solid ' + line + ';padding:11px 4px;cursor:pointer;gap:12px;" onmouseover="this.style.background=\'rgba(138,90,59,.06)\'" onmouseout="this.style.background=\'none\'">' +
        '<span style="flex:0 0 22px;font-family:\'Courier Prime\',monospace;font-size:11px;color:' + sep + ';">' + pad(i + 1) + "</span>" +
        '<span style="flex:1;min-width:0;"><span style="font-family:\'Marcellus\',serif;font-size:20px;color:' + ink + ';">' + esc(c.name) + '</span><span style="font-family:\'EB Garamond\',serif;font-style:italic;font-size:13px;color:' + soft + ';margin-left:9px;">' + esc(c.region) + "</span></span>" +
        '<span style="flex:0 0 auto;font-family:\'Special Elite\',monospace;font-size:11px;color:' + sep + ';margin-right:14px;">' + c.entries.length + " ✦</span>" +
        '<span style="flex:0 0 auto;font-family:\'Courier Prime\',monospace;font-size:11px;color:' + soft + ';">p.' + pg + "</span></button>";
    });
    return (
      '<div style="position:absolute;inset:0;background:#F3EAD6;overflow:hidden;">' + this.paperBase("L") +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:36px 34px 28px;">' +
      '<div style="font-family:\'Special Elite\',monospace;font-size:10px;letter-spacing:4px;color:' + sep + ';">✦ INDEX OF VISAS ✦</div>' +
      '<div style="font-family:\'Marcellus\',serif;font-size:38px;color:' + ink + ';margin-top:6px;line-height:1;">Contents</div>' +
      '<div style="font-family:\'EB Garamond\',serif;font-style:italic;font-size:14px;color:' + soft + ';margin:8px 0 18px;">Tap a record to turn straight to its page.</div>' +
      '<div style="border-top:2px solid ' + ink + ';overflow:auto;">' + rows + "</div>" +
      '<div style="flex:1;"></div>' +
      '<div style="font-family:\'Courier Prime\',monospace;font-size:10px;letter-spacing:1px;color:' + soft + ';opacity:.85;border-top:1px solid ' + line + ';padding-top:9px;">The world is wide — keep logging.</div>' +
      "</div></div>"
    );
  }

  indexKeyHTML(): string {
    const ink = "#2E2A22";
    const soft = "#7A6E54";
    const sep = "#8A5A3B";
    const cats: Array<[CategoryKey, string]> = [
      ["recipe", "Recipes"],
      ["book", "Books"],
      ["movie", "Film"],
      ["music", "Music"],
      ["place", "Places"],
    ];
    let key = "";
    cats.forEach((c) => {
      key +=
        '<div style="display:flex;align-items:center;gap:11px;margin-bottom:13px;"><span style="width:15px;height:15px;border-radius:50%;background:' + INK[c[0]] + ";box-shadow:inset 0 0 0 2px #F3EAD6,0 0 0 1px " + INK[c[0]] + ';"></span><span style="font-family:\'Special Elite\',monospace;font-size:11px;letter-spacing:1.5px;color:' + ink + ';text-transform:uppercase;">' + c[1] + '</span><span style="flex:1;border-bottom:1px dotted rgba(140,120,80,.5);"></span><span style="font-family:\'EB Garamond\',serif;font-style:italic;font-size:13px;color:' + soft + ';">' + INK[c[0]] + "</span></div>";
    });
    return (
      '<div style="position:absolute;inset:0;background:#F3EAD6;overflow:hidden;">' + this.paperBase("R") +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:36px 34px 28px;">' +
      '<div style="font-family:\'Special Elite\',monospace;font-size:10px;letter-spacing:4px;color:' + sep + ';">✦ HOW TO READ ✦</div>' +
      '<div style="font-family:\'Marcellus\',serif;font-size:30px;color:' + ink + ';margin:6px 0 4px;line-height:1.05;">The Ink<br>Register</div>' +
      '<div style="font-family:\'EB Garamond\',serif;font-style:italic;font-size:14px;color:' + soft + ';margin:10px 0 22px;text-wrap:pretty;">Every entry is pressed in the ink of its kind. A page fills as a country is lived in.</div>' +
      '<div style="border-top:1px solid rgba(140,120,80,.4);padding-top:18px;">' + key + "</div>" +
      '<div style="flex:1;"></div>' +
      '<div style="display:flex;align-items:center;gap:12px;opacity:.55;"><div style="display:inline-flex;">' + this.globe(46, 46, "#9A742B", 0.9) + '</div><div style="font-family:\'Courier Prime\',monospace;font-size:9px;letter-spacing:1.5px;color:' + soft + ';">VISAS &amp; ENTRIES BEGIN OVERLEAF →</div></div>' +
      "</div></div>"
    );
  }

  // ---------- country spread half ----------
  countryHTML(ci: number, side: "L" | "R"): string {
    const co = this.countries[ci];
    const ink = "#2E2A22";
    const soft = "#7A6E54";
    const sep = "#8A5A3B";
    const offset = side === "L" ? 0 : -this.PAGE_W;
    const wm =
      '<div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;"><div style="position:absolute;left:' + offset + 'px;top:50%;transform:translateY(-50%);width:' + this.PAGE_W * 2 + 'px;display:flex;justify-content:center;opacity:.07;">' + this.globe(this.PAGE_W * 2, this.PAGE_H, "#9A742B", 1) + "</div></div>";
    const guilloche = '<div style="position:absolute;inset:0;pointer-events:none;opacity:.5;background:repeating-radial-gradient(circle at ' + (side === "L" ? "100%" : "0%") + ' 50%,transparent 0 16px,rgba(160,130,80,.08) 16px 17px);"></div>';
    let head = "";
    if (side === "L") {
      head =
        '<div style="position:absolute;left:30px;right:24px;top:26px;z-index:200;">' +
        '<div style="display:inline-block;background:linear-gradient(rgba(243,234,214,.86),rgba(243,234,214,.5));padding:2px 8px 4px 0;border-radius:2px;">' +
        '<div style="font-family:\'Special Elite\',monospace;font-size:9px;letter-spacing:3px;color:' + sep + ';text-transform:uppercase;">' + esc(co.prefix) + "</div>" +
        '<div style="font-family:\'Marcellus\',serif;font-size:52px;line-height:0.96;color:' + ink + ';margin-top:2px;">' + esc(co.name) + "</div>" +
        '<div style="margin-top:9px;font-family:\'Special Elite\',monospace;font-size:9.5px;letter-spacing:1.5px;color:' + soft + ';">' + esc(co.region.toUpperCase()) + "&nbsp;&nbsp;·&nbsp;&nbsp;" + this.fmtCoord(co) + "</div>" +
        '<div style="margin-top:3px;font-family:\'Special Elite\',monospace;font-size:9.5px;letter-spacing:1.5px;color:' + soft + ';">' + co.entries.length + " ENTRIES&nbsp;&nbsp;·&nbsp;&nbsp;FIRST LOGGED " + co.year + "</div>" +
        "</div></div>";
    }
    let foot = "";
    if (side === "R") {
      foot = '<div style="position:absolute;right:26px;bottom:18px;z-index:200;font-family:\'Courier Prime\',monospace;font-size:8.5px;letter-spacing:1.5px;color:' + soft + ';opacity:.8;">ATL · ' + esc(co.name.toUpperCase()) + " · p." + pad((ci + 1) * 2 + 1) + "</div>";
    }
    return (
      '<div style="position:absolute;inset:0;background:#F3EAD6;overflow:hidden;">' + this.paperBase(side) + wm + guilloche +
      '<div class="om-cluster" data-ci="' + ci + '" style="position:absolute;inset:0;">' + this.clusterHTML(ci, offset) + "</div>" +
      head + foot + "</div>"
    );
  }

  // ---------- awaiting entries ----------
  awaitHTML(): string {
    const soft = "#9b8a63";
    let marks = "";
    for (let i = 0; i < 3; i++) {
      marks += '<div style="font-family:\'Special Elite\',monospace;font-size:13px;letter-spacing:5px;color:' + soft + ';opacity:.4;transform:rotate(-4deg);margin:22px 0;">AWAITING ENTRIES</div>';
    }
    return (
      '<div style="position:absolute;inset:0;background:#F3EAD6;overflow:hidden;">' + this.paperBase("M") +
      '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">' + marks +
      '<div style="display:inline-flex;opacity:.16;margin-top:10px;">' + this.globe(120, 120, "#9A742B", 1) + "</div>" +
      "</div></div>"
    );
  }

  // ---------- shell ----------
  buildShell() {
    const b = this.els.book;
    const PW = this.PAGE_W;
    const PH = this.PAGE_H;
    b.innerHTML =
      '<div class="om-stage" style="position:absolute;left:50%;top:50%;width:' + PW * 2 + "px;height:" + PH + "px;margin-left:" + -PW + "px;margin-top:" + -PH / 2 + 'px;transform-style:preserve-3d;perspective:2400px;transition:transform .62s cubic-bezier(.42,.05,.2,1);">' +
      '<div class="om-stack-l" style="position:absolute;left:-6px;top:6px;width:8px;height:' + (PH - 12) + 'px;border-radius:3px 0 0 3px;background:repeating-linear-gradient(90deg,#e7dab8,#f3ead6 2px,#dccba0 3px);box-shadow:-2px 2px 6px rgba(0,0,0,.25);display:none;"></div>' +
      '<div class="om-stack-r" style="position:absolute;right:-6px;top:6px;width:8px;height:' + (PH - 12) + 'px;border-radius:0 3px 3px 0;background:repeating-linear-gradient(90deg,#dccba0,#f3ead6 1px,#e7dab8 3px);box-shadow:2px 2px 6px rgba(0,0,0,.25);display:none;"></div>' +
      // isolation:isolate keeps each page's internal z-indexes (header z200,
      // stamps z10-49) from escaping above the turning leaf.
      '<div class="om-page om-left" style="position:absolute;left:0;top:0;width:' + PW + "px;height:" + PH + 'px;border-radius:4px 2px 2px 4px;overflow:hidden;isolation:isolate;box-shadow:0 1px 3px rgba(0,0,0,.18);backface-visibility:hidden;"></div>' +
      '<div class="om-page om-right" style="position:absolute;left:' + PW + "px;top:0;width:" + PW + "px;height:" + PH + 'px;border-radius:2px 4px 4px 2px;overflow:hidden;isolation:isolate;box-shadow:0 1px 3px rgba(0,0,0,.18);backface-visibility:hidden;"></div>' +
      '<div class="om-spine" style="position:absolute;left:' + (PW - 9) + "px;top:0;width:18px;height:" + PH + 'px;z-index:8;pointer-events:none;background:linear-gradient(90deg,rgba(40,26,10,.15),rgba(40,26,10,.04) 34%,rgba(255,250,235,.10) 50%,rgba(40,26,10,.04) 66%,rgba(40,26,10,.15));"><div style="position:absolute;left:50%;top:12px;bottom:12px;width:0;border-left:1px dashed rgba(70,50,25,.45);"></div></div>' +
      '<div class="om-leaf" style="position:absolute;top:0;width:' + PW + "px;height:" + PH + 'px;transform-style:preserve-3d;z-index:300;display:none;will-change:transform;">' +
      '<div class="om-face om-front" style="position:absolute;inset:0;overflow:hidden;isolation:isolate;backface-visibility:hidden;border-radius:2px 4px 4px 2px;box-shadow:0 2px 10px rgba(0,0,0,.2);"></div>' +
      '<div class="om-face om-back" style="position:absolute;inset:0;overflow:hidden;isolation:isolate;backface-visibility:hidden;border-radius:4px 2px 2px 4px;transform:rotateY(180deg);box-shadow:0 2px 10px rgba(0,0,0,.2);"></div>' +
      '<div class="om-curl" style="position:absolute;inset:0;pointer-events:none;border-radius:2px;opacity:0;"></div>' +
      "</div>" +
      "</div>";
    this.stageEl = b.querySelector(".om-stage")!;
    this.leftEl = b.querySelector(".om-left")!;
    this.rightEl = b.querySelector(".om-right")!;
    this.spineEl = b.querySelector(".om-spine")!;
    this.leafEl = b.querySelector(".om-leaf")!;
    this.frontEl = b.querySelector(".om-front")!;
    this.backEl = b.querySelector(".om-back")!;
    this.curlEl = b.querySelector(".om-curl")!;
    this.slvL = b.querySelector(".om-stack-l")!;
    this.slvR = b.querySelector(".om-stack-r")!;
    this._built = true;
  }

  setPageBg(el: HTMLElement, roleK: string) {
    el.style.background = this.isCover(roleK) ? this.coverBg() : "#F3EAD6";
  }
  hideLeaf() {
    if (!this.leafEl) return;
    this.leafEl.style.transition = "none";
    this.leafEl.style.display = "none";
    this.curlEl.style.opacity = "0";
  }

  setRest(t: number, settle?: boolean) {
    this.turn = t;
    this.hideLeaf();
    const PW = this.PAGE_W;
    const st = this.stageEl;
    st.style.transition = "none";
    if (t === 0) {
      st.style.transform = "translateX(" + -PW / 2 + "px)";
      this.leftEl.style.display = "none";
      this.rightEl.style.display = "block";
      this.rightEl.innerHTML = this.coverHTML(false);
      this.setPageBg(this.rightEl, "cover");
      this.spineEl.style.display = "none";
      this.slvR.style.display = "block";
      this.slvL.style.display = "none";
    } else if (t === this.maxTurn) {
      st.style.transform = "translateX(" + PW / 2 + "px)";
      this.rightEl.style.display = "none";
      this.leftEl.style.display = "block";
      this.leftEl.innerHTML = this.coverHTML(true);
      this.setPageBg(this.leftEl, "backcover");
      this.spineEl.style.display = "none";
      this.slvL.style.display = "block";
      this.slvR.style.display = "none";
    } else {
      st.style.transform = "translateX(0px)";
      this.leftEl.style.display = "block";
      this.rightEl.style.display = "block";
      this.spineEl.style.display = "block";
      this.slvL.style.display = "none";
      this.slvR.style.display = "none";
      const sp = this.spreads[t - 1];
      this.leftEl.innerHTML = this.pageRoleHTML(sp.left);
      this.setPageBg(this.leftEl, sp.left.k);
      this.rightEl.innerHTML = this.pageRoleHTML(sp.right);
      this.setPageBg(this.rightEl, sp.right.k);
      if (settle) this.afterRest();
    }
    this.updateShadow();
    this.updateLabel();
    this.attachStamps();
  }

  afterRest() {
    [this.leftEl, this.rightEl].forEach((pg) => {
      const cl = pg.querySelector(".om-cluster");
      if (cl) {
        cl.querySelectorAll<HTMLElement>(".om-stamp").forEach((s, i) => {
          s.style.animation = "om-settle .42s cubic-bezier(.3,.7,.3,1)";
          s.style.animationDelay = i * 7 + "ms";
        });
      }
    });
  }

  updateShadow() {
    const sh = this.els.shadow;
    if (!sh) return;
    const closed = this.turn === 0 || this.turn === this.maxTurn;
    sh.style.width = (closed ? this.PAGE_W + 30 : this.PAGE_W * 2 - 6) + "px";
    sh.style.left = "50%";
  }

  label(t: number): string {
    if (t === 0) return "ATLAS · CLOSED";
    if (t === this.maxTurn) return "ATLAS · BACK COVER";
    const sp = this.spreads[t - 1];
    if (sp.left.k === "insidecover") return "IDENTIFICATION";
    if (sp.left.k === "index") return "INDEX OF VISAS";
    if (sp.left.k === "cL") {
      const co = this.countries[sp.left.ci!];
      return co.name.toUpperCase() + " · " + co.entries.length + " ENTRIES";
    }
    if (sp.left.k === "await") return "AWAITING ENTRIES";
    return "";
  }
  updateLabel() {
    this.els.label.textContent = this.label(this.turn);
    this.els.hint.textContent = this.turn === 0 ? "CLICK THE COVER TO OPEN  ·  ← →  ·  DRAG A CORNER" : "TAP PAGE EDGES  ·  DRAG A CORNER  ·  ← →  ·  CLICK A STAMP";
  }

  // ---------- stamp hover + click ----------
  attachStamps() {
    const self = this;
    const tip = this.els.tip;
    const root = this.els.root;
    [this.leftEl, this.rightEl].forEach((pg) => {
      if (!pg) return;
      pg.querySelectorAll<HTMLElement>(".om-stamp").forEach((s) => {
        s.onmouseenter = () => {
          if (self._dragging || self.animating) return;
          self._lift(s.getAttribute("data-sid")!, true);
          tip.textContent = s.getAttribute("data-cap");
          tip.style.opacity = "1";
        };
        s.onmousemove = (e) => {
          if (self._dragging || self.animating) return;
          const r = root.getBoundingClientRect();
          tip.style.left = e.clientX - r.left + "px";
          tip.style.top = e.clientY - r.top - 14 + "px";
        };
        s.onmouseleave = () => {
          self._lift(s.getAttribute("data-sid")!, false);
          tip.style.opacity = "0";
        };
      });
    });
  }
  _lift(sid: string, on: boolean) {
    const nodes = this.els.book.querySelectorAll<HTMLElement>('.om-stamp[data-sid="' + sid + '"]');
    nodes.forEach((n) => {
      const r = n.style.getPropertyValue("--r") || "0deg";
      if (on) {
        n.style.transform = "translateY(-7px) scale(1.06) rotate(" + r + ")";
        n.style.zIndex = "400";
        n.style.filter = "drop-shadow(0 8px 10px rgba(40,20,5,.4))";
      } else {
        n.style.transform = "rotate(" + r + ")";
        n.style.zIndex = "";
        n.style.filter = "";
      }
    });
  }

  // ---------- entry detail popover ----------
  CATL: Record<CategoryKey, string> = { recipe: "RECIPE", book: "BOOK", movie: "FILM", music: "MUSIC", place: "PLACE" };
  linkHost(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "Open link";
    }
  }
  openPopover(sid: string, clientX: number, clientY: number) {
    const found = this.entryBySid(sid);
    if (!found) return;
    const e = found.entry;
    const pop = this.els.popover;
    const ink = INK[e.category] || "#3A3733";
    const linkRow = e.link
      ? '<a href="' + esc(e.link) + '" target="_blank" rel="noreferrer noopener" style="display:block;margin-top:8px;font-family:\'Special Elite\',monospace;font-size:11px;color:#8A5A3B;text-decoration:none;word-break:break-all;">↗ ' + esc(this.linkHost(e.link)) + "</a>"
      : "";
    pop.innerHTML =
      '<div style="font-family:\'Special Elite\',monospace;font-size:9px;letter-spacing:1.6px;text-transform:uppercase;color:' + ink + ';">' + this.CATL[e.category] + " · '" + String(e.year).slice(2) + "</div>" +
      '<div style="font-family:\'Marcellus\',serif;font-size:19px;color:#2E2A22;margin-top:3px;line-height:1.12;">' + esc(e.title) + "</div>" +
      linkRow +
      '<button data-del="' + esc(e.id) + '" style="margin-top:12px;width:100%;background:none;border:1px solid rgba(155,74,57,.5);color:#9B4A39;border-radius:2px;padding:7px 0;cursor:pointer;font-family:\'Special Elite\',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;">Remove entry</button>';
    const r = this.els.root.getBoundingClientRect();
    pop.style.left = Math.min(Math.max(clientX - r.left, 130), r.width - 130) + "px";
    pop.style.top = clientY - r.top + "px";
    pop.style.opacity = "1";
    pop.style.pointerEvents = "auto";
    pop.style.transform = "translate(-50%,12px)";
    const delBtn = pop.querySelector<HTMLElement>("[data-del]");
    if (delBtn) {
      delBtn.onclick = (ev) => {
        ev.stopPropagation();
        this.closePopover();
        this.opts.onDeleteEntry(e.id);
      };
    }
  }
  closePopover() {
    const pop = this.els.popover;
    pop.style.opacity = "0";
    pop.style.pointerEvents = "none";
  }

  // ---------- turning ----------
  curlPaint(p: number) {
    if (!this.curlEl) return;
    const side = this._ctx ? this._ctx.side : "R";
    const ang = side === "R" ? 120 : 60;
    this.curlEl.style.opacity = String(0.9 * Math.sin(Math.PI * Math.min(1, Math.max(0, p))));
    this.curlEl.style.background = "linear-gradient(" + ang + "deg, rgba(0,0,0,.34) 0%, rgba(0,0,0,.06) 22%, rgba(255,250,238,.30) 48%, rgba(0,0,0,.05) 74%, rgba(0,0,0,.22) 100%)";
  }

  setupLeaf(ctx: TurnCtx) {
    const PW = this.PAGE_W;
    const leaf = this.leafEl;
    leaf.style.transition = "none";
    leaf.style.display = "block";
    if (ctx.side === "R") {
      leaf.style.left = PW + "px";
      leaf.style.transformOrigin = "left center";
    } else {
      leaf.style.left = "0px";
      leaf.style.transformOrigin = "right center";
    }
    this.frontEl.innerHTML = ctx.front;
    this.frontEl.style.background = ctx.frontBg || "#F3EAD6";
    this.backEl.innerHTML = ctx.back;
    this.backEl.style.background = ctx.backBg || "#F3EAD6";
    this.frontEl.style.visibility = "visible";
    this.backEl.style.visibility = "visible";
    if (ctx.reveal) {
      ctx.reveal.el.style.display = "block";
      ctx.reveal.el.innerHTML = this.pageRoleHTML(ctx.reveal.role);
      this.setPageBg(ctx.reveal.el, ctx.reveal.role.k);
    }
    if (ctx.mode === "inner" || ctx.mode === "innerback") {
      this.leftEl.style.display = "block";
      this.rightEl.style.display = "block";
      this.spineEl.style.display = "block";
      this.slvL.style.display = "none";
      this.slvR.style.display = "none";
    } else if (ctx.mode === "open") {
      this.leftEl.style.display = "none";
      this.spineEl.style.display = "none";
      this.slvR.style.display = "block";
    } else if (ctx.mode === "reopen") {
      this.rightEl.style.display = "none";
      this.spineEl.style.display = "none";
      this.slvL.style.display = "block";
    } else if (ctx.mode === "close" || ctx.mode === "closefront") {
      this.spineEl.style.display = "block";
    }
    this.attachStamps();
    this.setProgress(0);
  }

  _faceCull(cos: number) {
    if (!this.frontEl) return;
    const past = cos < -0.0001;
    this.frontEl.style.visibility = past ? "hidden" : "visible";
    this.backEl.style.visibility = past ? "visible" : "hidden";
  }

  setProgress(p: number) {
    p = Math.min(1, Math.max(0, p));
    const ctx = this._ctx;
    if (!ctx) return;
    const rot = (ctx.side === "R" ? -180 : 180) * p;
    const tx = ctx.txFrom + (ctx.txTo - ctx.txFrom) * p;
    this.leafEl.style.transform = "rotateY(" + rot + "deg)";
    this.stageEl.style.transform = "translateX(" + tx + "px)";
    this._faceCull(Math.cos((rot * Math.PI) / 180));
    this.curlPaint(p);
    this._p = p;
  }

  beginTurn(dir: number): boolean {
    if (!this._built || this.animating) return false;
    const t = this.turn;
    const PW = this.PAGE_W;
    const S = this.spreads.length;
    let ctx: TurnCtx | null = null;
    if (dir > 0) {
      if (t >= this.maxTurn) return false;
      if (t === 0) {
        ctx = { dir, side: "R", mode: "open", front: this.coverHTML(false), frontBg: this.coverBg(), back: this.pageRoleHTML(this.spreads[0].left), reveal: { el: this.rightEl, role: this.spreads[0].right }, txFrom: -PW / 2, txTo: 0, fromTurn: 0, toTurn: 1 };
      } else if (t >= 1 && t <= S - 1) {
        const cur = this.spreads[t - 1];
        const nxt = this.spreads[t];
        ctx = { dir, side: "R", mode: "inner", front: this.pageRoleHTML(cur.right), back: this.pageRoleHTML(nxt.left), reveal: { el: this.rightEl, role: nxt.right }, txFrom: 0, txTo: 0, fromTurn: t, toTurn: t + 1 };
      } else if (t === S) {
        const cur = this.spreads[S - 1];
        ctx = { dir, side: "R", mode: "close", front: this.pageRoleHTML(cur.right), back: this.coverHTML(true), backBg: this.coverBg(), reveal: null, txFrom: 0, txTo: PW / 2, fromTurn: S, toTurn: S + 1 };
      }
    } else {
      if (t <= 0) return false;
      if (t === this.maxTurn) {
        const cur = this.spreads[S - 1];
        ctx = { dir, side: "L", mode: "reopen", front: this.coverHTML(true), frontBg: this.coverBg(), back: this.pageRoleHTML(cur.right), reveal: { el: this.leftEl, role: cur.left }, txFrom: PW / 2, txTo: 0, fromTurn: S + 1, toTurn: S };
      } else if (t >= 2 && t <= S) {
        const cur = this.spreads[t - 1];
        const prv = this.spreads[t - 2];
        ctx = { dir, side: "L", mode: "innerback", front: this.pageRoleHTML(cur.left), back: this.pageRoleHTML(prv.right), reveal: { el: this.leftEl, role: prv.left }, txFrom: 0, txTo: 0, fromTurn: t, toTurn: t - 1 };
      } else if (t === 1) {
        ctx = { dir, side: "L", mode: "closefront", front: this.pageRoleHTML(this.spreads[0].left), back: this.coverHTML(false), backBg: this.coverBg(), reveal: null, txFrom: 0, txTo: -PW / 2, fromTurn: 1, toTurn: 0 };
      }
    }
    if (!ctx) return false;
    this._ctx = ctx;
    this.animating = true;
    this.setupLeaf(ctx);
    return true;
  }

  endTurn(commit: boolean) {
    const ctx = this._ctx;
    if (!ctx) {
      this.animating = false;
      return;
    }
    const dur = 620;
    const target = commit ? 1 : 0;
    let done = false;
    const onEnd = (e: TransitionEvent) => {
      if (e && e.propertyName !== "transform") return;
      finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      this.frontEl.style.visibility = "visible";
      this.backEl.style.visibility = "visible";
      this.leafEl.removeEventListener("transitionend", onEnd);
      if (commit) {
        // No settle replay here — the landing pages must match the leaf's
        // back face exactly so the end of the turn is seamless.
        this.setRest(ctx.toTurn);
        if (this.opts.sound) this.playFlip();
      } else {
        this.setRest(ctx.fromTurn);
      }
      this._ctx = null;
      this.animating = false;
    };
    this.leafEl.addEventListener("transitionend", onEnd);
    const track = () => {
      if (done) return;
      const tr = getComputedStyle(this.leafEl).transform;
      if (tr && tr.indexOf("matrix3d") === 0) {
        this._faceCull(parseFloat(tr.slice(9).split(",")[0]));
      }
      requestAnimationFrame(track);
    };
    requestAnimationFrame(track);
    setTimeout(() => {
      this.leafEl.style.transition = "transform " + dur + "ms cubic-bezier(.42,.05,.2,1)";
      this.stageEl.style.transition = "transform " + dur + "ms cubic-bezier(.42,.05,.2,1)";
      this.curlEl.style.transition = "opacity " + dur + "ms ease";
      const rot = (ctx.side === "R" ? -180 : 180) * target;
      const tx = ctx.txFrom + (ctx.txTo - ctx.txFrom) * target;
      this.leafEl.style.transform = "rotateY(" + rot + "deg)";
      this.stageEl.style.transform = "translateX(" + tx + "px)";
      this.curlPaint(target ? 0.5 : 0.0001);
      this.curlEl.style.opacity = "0";
    }, 18);
    setTimeout(finish, dur + 150);
  }

  turnBtn(dir: number) {
    if (this.animating) return;
    if (this.beginTurn(dir)) this.endTurn(true);
  }
  jumpTo(t: number) {
    if (this.animating || t === this.turn) return;
    const b = this.els.book;
    b.style.opacity = "0";
    setTimeout(() => {
      this.setRest(t, true);
      requestAnimationFrame(() => {
        b.style.opacity = "1";
      });
    }, 190);
  }

  playFlip() {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      if (!this._ac) this._ac = new AC();
      const ac = this._ac;
      if (ac.state === "suspended") ac.resume();
      const dur = 0.32;
      const n = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.2) * 0.5;
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2400;
      bp.Q.value = 0.7;
      const g = ac.createGain();
      g.gain.value = 0.18;
      src.connect(bp);
      bp.connect(g);
      g.connect(ac.destination);
      src.start();
    } catch {
      /* no-op */
    }
  }

  // ---------- interactions ----------
  attachInteractions() {
    const wrap = this.els.scale;
    const root = this.els.root;
    const self = this;
    wrap.style.touchAction = "pan-y";
    const scale = () => self._scale || 1;
    const rel = (e: PointerEvent): [number, number] => {
      const r = wrap.getBoundingClientRect();
      return [(e.clientX - r.left) / scale(), (e.clientY - r.top) / scale()];
    };
    let startX = 0,
      startY = 0,
      grabbed = false,
      dragging = false,
      decided = false,
      dir = 0;
    wrap.addEventListener("pointerdown", (e) => {
      if (self.animating) return;
      if ((e.target as HTMLElement).closest("[data-jump]")) return;
      const [x, y] = rel(e);
      startX = x;
      startY = y;
      grabbed = true;
      dragging = false;
      decided = false;
      dir = 0;
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!grabbed) return;
      if (self.animating && !dragging) return;
      const [x, y] = rel(e);
      const dx = x - startX,
        dy = y - startY;
      if (!decided) {
        if (Math.abs(dx) < 7) return;
        if (Math.abs(dx) < Math.abs(dy) * 1.1) {
          grabbed = false;
          return;
        }
        decided = true;
        dir = dx < 0 ? 1 : -1;
        if (!self.beginTurn(dir)) {
          grabbed = false;
          return;
        }
        dragging = true;
        self._dragging = true;
        self.els.tip.style.opacity = "0";
        try {
          wrap.setPointerCapture(e.pointerId);
        } catch {
          /* no-op */
        }
      }
      if (dragging) {
        const span = self.PAGE_W;
        const p = dir > 0 ? (startX - x) / span : (x - startX) / span;
        self.setProgress(p);
      }
    });
    const finish = (e: PointerEvent) => {
      if (!grabbed) return;
      const wasDragging = dragging;
      grabbed = false;
      dragging = false;
      self._dragging = false;
      if (wasDragging) {
        self.endTurn((self._p || 0) > 0.4);
      } else if (!self.animating) {
        const target = e.target as HTMLElement;
        const stamp = target.closest<HTMLElement>(".om-stamp");
        if (stamp) {
          self.openPopover(stamp.getAttribute("data-sid")!, e.clientX, e.clientY);
        } else {
          const [x] = rel(e);
          self.closePopover();
          self.edgeTap(x);
        }
      }
    };
    wrap.addEventListener("pointerup", finish);
    wrap.addEventListener("pointercancel", () => {
      self._dragging = false;
      if (dragging) {
        grabbed = false;
        dragging = false;
        self.endTurn((self._p || 0) > 0.4);
      } else grabbed = false;
    });
    this._key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") self.turnBtn(1);
      else if (e.key === "ArrowLeft") self.turnBtn(-1);
      else if (e.key === "Escape") self.opts.onClose();
    };
    window.addEventListener("keydown", this._key);
    root.addEventListener("click", (e) => {
      const j = (e.target as HTMLElement).closest("[data-jump]");
      if (j) self.jumpTo(parseInt(j.getAttribute("data-jump")!, 10));
    });
  }
  edgeTap(x: number) {
    const PW = this.PAGE_W;
    if (this.turn === 0) {
      this.turnBtn(1);
      return;
    }
    if (this.turn === this.maxTurn) {
      this.turnBtn(-1);
      return;
    }
    if (x > PW * 1.62) this.turnBtn(1);
    else if (x < PW * 0.38) this.turnBtn(-1);
  }

  // ---------- desk theme ----------
  applyDesk() {
    const d = this.els.desk;
    const root = this.els.root;
    if (!d) return;
    const dark = this.opts.dark;
    if (dark) {
      root.style.background = "#171513";
      d.style.background = "radial-gradient(120% 100% at 50% 0%,#2a2622,#16140f 70%),repeating-linear-gradient(90deg,rgba(0,0,0,.18) 0 2px,transparent 2px 5px)";
      d.style.boxShadow = "inset 0 0 320px rgba(0,0,0,.7)";
    } else {
      root.style.background = "#cdbf9f";
      d.style.background = "radial-gradient(120% 100% at 50% 0%,#e4d6b6,#c2b29c 70%),repeating-linear-gradient(90deg,rgba(120,90,50,.06) 0 3px,transparent 3px 7px)";
      d.style.boxShadow = "inset 0 0 300px rgba(80,55,25,.4)";
    }
    this.els.shadow.style.background = dark ? "rgba(0,0,0,.6)" : "rgba(40,26,8,.4)";
  }

  // ---------- scaling ----------
  rescale() {
    const root = this.els.root;
    const sc = this.els.scale;
    if (!root || !sc) return;
    const w = root.clientWidth;
    const h = root.clientHeight;
    const s = Math.min((w - 70) / 920, (h - 150) / 632, 1.25);
    this._scale = Math.max(0.36, s);
    sc.style.transform = "scale(" + this._scale + ")";
  }
}
