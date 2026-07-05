"use client";

import { useEffect, useRef } from "react";
import {
  geoOrthographic,
  geoNaturalEarth1,
  geoGraticule10,
  geoPath,
  geoBounds,
  geoDistance,
  geoContains,
} from "d3-geo";
import { feature } from "topojson-client";
import topoData from "world-atlas/countries-110m.json";
import { COUNTRY_CATALOG } from "@/lib/countries";
import type { Palette } from "@/lib/palettes";
import type { LoggedCountry } from "@/lib/types";

export type GlobeMode = "globe" | "map";

interface GlobeProps {
  countries: LoggedCountry[];
  palette: Palette;
  mode: GlobeMode;
  active: boolean; // false while the passport overlay is open — pause the loop
  onSelect: (id: string) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// world-atlas country ids are zero-padded ("076"); the catalog uses plain
// numeric strings ("76"). Normalize both sides so they match. Synthetic ids
// (non-numeric, see below) pass through unchanged.
function normId(id: unknown): string {
  const n = Number(id);
  return Number.isFinite(n) ? String(n) : String(id ?? "");
}

// Three map features ship without an ISO numeric id (partially recognized
// states). Assign them the synthetic ids the catalog uses so they highlight
// and hit-test like everything else.
const SYNTHETIC_IDS: Record<string, string> = {
  Kosovo: "kosovo",
  Somaliland: "somaliland",
  "N. Cyprus": "n-cyprus",
};

const CAT_BY_ID = new Map(COUNTRY_CATALOG.map((c) => [c.id, c]));

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

/** Linear blend between two 6-digit hex colours, t in [0,1]. */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => {
    const va = (pa >> sh) & 255;
    return Math.round(va + (((pb >> sh) & 255) - va) * t);
  };
  return "rgb(" + ch(16) + "," + ch(8) + "," + ch(0) + ")";
}

/**
 * Imperative globe/map renderer, ported from the Atlas design export. Owns a
 * canvas (the projected earth), a tooltip, and the pointer interactions (drag
 * to spin, scroll to zoom, hover for the country's tally, click to open).
 * Every catalog country is hit-testable; log counts shade the land like a
 * heat map. No markers are drawn on the land itself.
 */
class GlobeEngine {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  tooltip: HTMLDivElement;
  onSelect: (id: string) => void;

  palette: Palette;
  mode: GlobeMode = "globe";
  paused = false;

  counts = new Map<string, { logs: number; wishes: number }>();
  maxLogs = 0;
  heatCache = new Map<number, string>();
  features: any[] = [];
  featById: Record<string, any> = {};
  boundsById: Record<string, [[number, number], [number, number]]> = {};
  graticule: any;
  projOrtho: any;
  projFlat: any;
  projection: any;
  ctx: CanvasRenderingContext2D | null = null;
  size: { w: number; h: number } | null = null;
  minScale = 0;
  maxScale = 0;

  raf = 0;
  ro: ResizeObserver | null = null;
  // Detaches all stage listeners on destroy — React StrictMode double-mounts
  // in dev, and a zombie engine's listeners would keep firing onSelect.
  ac = new AbortController();
  drag: { x: number; y: number; rot: [number, number, number] } | null = null;
  dragMoved = 0;
  lastX = 0;
  lastY = 0;
  autoPause = false;
  flying = false;
  flyTarget: [number, number, number] = [0, 0, 0];
  hoveredId: string | null = null;
  tipXY: [number, number] = [0, 0];
  openTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: {
    stage: HTMLDivElement;
    canvas: HTMLCanvasElement;
    tooltip: HTMLDivElement;
    palette: Palette;
    mode: GlobeMode;
    onSelect: (id: string) => void;
  }) {
    this.stage = opts.stage;
    this.canvas = opts.canvas;
    this.tooltip = opts.tooltip;
    this.palette = opts.palette;
    this.mode = opts.mode;
    this.onSelect = opts.onSelect;
  }

  get pal(): Palette {
    return this.palette;
  }

  init() {
    const fc: any = feature(topoData, (topoData as any).objects.countries);
    this.features = fc.features;
    this.featById = {};
    this.boundsById = {};
    this.features.forEach((f) => {
      if (f.id == null) f.id = SYNTHETIC_IDS[f.properties?.name] ?? "";
      const id = normId(f.id);
      this.featById[id] = f;
      this.boundsById[id] = geoBounds(f);
    });
    this.graticule = geoGraticule10();
    this.projOrtho = geoOrthographic().rotate([-12, -18, 0]).precision(0.4);
    this.projFlat = geoNaturalEarth1().precision(0.4);
    this.projection = this.mode === "globe" ? this.projOrtho : this.projFlat;
    this.setupCanvas();
    this.attachInteractions();
    this.startLoop();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    if (this.openTimer) clearTimeout(this.openTimer);
    this.ac.abort();
  }

  setData(countries: LoggedCountry[]) {
    this.counts = new Map();
    this.maxLogs = 0;
    for (const c of countries) {
      this.counts.set(c.id, { logs: c.logCount, wishes: c.wishCount });
      if (c.logCount > this.maxLogs) this.maxLogs = c.logCount;
    }
    this.heatCache.clear();
    if (this.features.length) this.draw();
  }
  setPalette(p: Palette) {
    this.palette = p;
    this.heatCache.clear();
    if (this.features.length) this.draw();
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    if (this.features.length) {
      this.fitProjection();
      this.draw();
    }
  }

  setupCanvas() {
    const el = this.stage;
    const cv = this.canvas;
    this.ctx = cv.getContext("2d");
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(10, r.width);
      const h = Math.max(10, r.height);
      this.size = { w, h };
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      this.ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const base = Math.min(w, h) * 0.42;
      this.minScale = base * 0.72;
      this.maxScale = base * 2.6;
      this.fitProjection();
      if (this.features.length) this.draw();
    };
    measure();
    this.ro = new ResizeObserver(measure);
    this.ro.observe(el);
  }

  fitProjection() {
    if (!this.size) return;
    const { w, h } = this.size;
    this.projOrtho.scale(Math.min(w, h) * 0.42).translate([w / 2, h * 0.54]);
    if (this.projFlat) this.projFlat.fitExtent([[60, 90], [w - 60, h - 80]], { type: "Sphere" });
  }

  startLoop() {
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (this.paused) return;
      if (this.mode === "globe") {
        if (this.flying) {
          this.stepFly();
        } else if (!this.drag && !this.autoPause && this.hoveredId == null) {
          const r = this.projOrtho.rotate();
          this.projOrtho.rotate([r[0] + 0.045, r[1], 0]);
        }
      }
      this.draw();
    };
    loop();
  }

  shortAngle(a: number, b: number) {
    return (((b - a + 180) % 360) + 360) % 360 - 180;
  }
  stepFly() {
    const r = this.projOrtho.rotate();
    const t = this.flyTarget;
    const dx = this.shortAngle(r[0], t[0]);
    const nx = r[0] + dx * 0.18;
    const ny = r[1] + (t[1] - r[1]) * 0.18;
    this.projOrtho.rotate([nx, ny, 0]);
    if (Math.abs(dx) < 0.4 && Math.abs(ny - t[1]) < 0.4) this.flying = false;
  }

  /**
   * Fill colour for a country with `logs` real logs: a steady per-log ramp
   * from landLogged (one log) toward landHot. The scale tops out at 8 logs
   * until some country passes that, after which it stretches so the most-
   * logged country always sits at the hot end.
   */
  heatColor(logs: number): string {
    const cached = this.heatCache.get(logs);
    if (cached) return cached;
    const denom = Math.max(8, this.maxLogs);
    const t = denom > 1 ? Math.min(1, (logs - 1) / (denom - 1)) : 1;
    const col = mixHex(this.pal.landLogged, this.pal.landHot, t);
    this.heatCache.set(logs, col);
    return col;
  }

  draw() {
    const ctx = this.ctx;
    if (!ctx || !this.features.length || !this.size) return;
    const { w, h } = this.size;
    ctx.clearRect(0, 0, w, h);
    const pal = this.pal;
    const path = geoPath(this.projection, ctx);
    const sphere = { type: "Sphere" } as any;
    const isGlobe = this.mode === "globe";

    ctx.beginPath();
    path(sphere);
    if (isGlobe) {
      const c = this.projOrtho.translate();
      const r = this.projOrtho.scale();
      const g = ctx.createRadialGradient(c[0] - r * 0.35, c[1] - r * 0.4, r * 0.1, c[0], c[1], r * 1.12);
      g.addColorStop(0, pal.oceanHi);
      g.addColorStop(1, pal.ocean);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = pal.ocean;
    }
    ctx.fill();

    ctx.beginPath();
    path(this.graticule);
    ctx.strokeStyle = pal.graticule;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    for (const f of this.features) {
      ctx.beginPath();
      path(f);
      const rec = this.counts.get(normId(f.id));
      const logs = rec ? rec.logs : 0;
      ctx.fillStyle = logs > 0 ? this.heatColor(logs) : pal.land;
      ctx.fill();
      ctx.lineWidth = logs > 0 ? 0.7 : 0.35;
      ctx.strokeStyle = pal.coast;
      ctx.stroke();
    }

    if (this.hoveredId && this.featById[this.hoveredId]) {
      const f = this.featById[this.hoveredId];
      ctx.beginPath();
      path(f);
      ctx.fillStyle = hexA(pal.sepia, 0.22);
      ctx.fill();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = pal.sepia;
      ctx.stroke();
    }

    if (isGlobe) {
      const c = this.projOrtho.translate();
      const r = this.projOrtho.scale();
      ctx.beginPath();
      path(sphere);
      const sg = ctx.createRadialGradient(c[0], c[1], r * 0.62, c[0], c[1], r * 1.02);
      sg.addColorStop(0, "rgba(0,0,0,0)");
      sg.addColorStop(1, pal.vignette);
      ctx.fillStyle = sg;
      ctx.fill();
    }
    ctx.beginPath();
    path(sphere);
    ctx.strokeStyle = pal.coast;
    ctx.lineWidth = isGlobe ? 1.3 : 0.8;
    ctx.stroke();
  }

  screenPos(lonlat: [number, number]): [number, number] | null {
    if (this.mode === "globe") {
      const r = this.projOrtho.rotate();
      const center: [number, number] = [-r[0], -r[1]];
      if (geoDistance(lonlat, center) > Math.PI / 2) return null;
    }
    const p = this.projection(lonlat);
    if (!p || isNaN(p[0])) return null;
    return p;
  }

  /** Catalog id of the country under the pointer, or null over open ocean. */
  hitId(x: number, y: number): string | null {
    const inv = this.projection.invert && this.projection.invert([x, y]);
    if (inv && !isNaN(inv[0])) {
      const [lon, lat] = inv;
      // The orthographic invert reflects points outside the globe's disc back
      // onto the sphere, so only trust coords that project back to the pointer.
      const rt = this.projection([lon, lat]);
      const onEarth = !!rt && Math.hypot(rt[0] - x, rt[1] - y) < 0.5;
      if (onEarth && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
        for (const f of this.features) {
          const id = normId(f.id);
          const b = this.boundsById[id];
          if (!b) continue;
          if (lat < b[0][1] || lat > b[1][1]) continue;
          const west = b[0][0];
          const east = b[1][0];
          // Bounds crossing the antimeridian come back with west > east.
          const inLon = west <= east ? lon >= west && lon <= east : lon >= west || lon <= east;
          if (!inLon) continue;
          if (geoContains(f, inv) && CAT_BY_ID.has(id)) return id;
        }
      }
    }
    // Tiny islands are near-impossible to hit at 110m — snap to the nearest
    // catalog label point when the pointer is only just off the polygon.
    let best: string | null = null;
    let bd = 1e9;
    for (const c of COUNTRY_CATALOG) {
      const sp = this.screenPos([c.lon, c.lat]);
      if (!sp) continue;
      const d = Math.hypot(sp[0] - x, sp[1] - y);
      if (d < bd) {
        bd = d;
        best = c.id;
      }
    }
    return bd < 10 ? best : null;
  }

  attachInteractions() {
    const el = this.stage;
    const sig = { signal: this.ac.signal };
    el.style.touchAction = "none";
    const rel = (e: PointerEvent): [number, number] => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    el.addEventListener("pointerdown", (e) => {
      const [x, y] = rel(e);
      this.drag = { x, y, rot: this.projOrtho.rotate() };
      this.dragMoved = 0;
      this.lastX = x;
      this.lastY = y;
      this.autoPause = true;
      this.flying = false;
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    }, sig);
    el.addEventListener("pointermove", (e) => {
      const [x, y] = rel(e);
      if (this.drag) {
        this.dragMoved += Math.abs(x - this.lastX) + Math.abs(y - this.lastY);
        if (this.mode === "globe") {
          const k = 0.34 * (300 / this.projOrtho.scale());
          const lon = this.drag.rot[0] + (x - this.drag.x) * k;
          let lat = this.drag.rot[1] - (y - this.drag.y) * k;
          lat = Math.max(-89, Math.min(89, lat));
          this.projOrtho.rotate([lon, lat, 0]);
        }
        this.lastX = x;
        this.lastY = y;
      } else {
        this.tipXY = [x, y];
        this.updateHover(x, y);
      }
    }, sig);
    const up = (e: PointerEvent) => {
      if (this.drag) {
        const moved = this.dragMoved;
        this.drag = null;
        el.style.cursor = "grab";
        this.autoPause = false;
        if (moved < 6) {
          const [x, y] = rel(e);
          const id = this.hitId(x, y);
          if (id) this.clickCountry(id);
        }
      }
    };
    el.addEventListener("pointerup", up, sig);
    el.addEventListener("pointercancel", () => {
      this.drag = null;
      el.style.cursor = "grab";
      this.autoPause = false;
    }, sig);
    el.addEventListener("pointerleave", () => {
      this.updateHover(-999, -999);
    }, sig);
    el.addEventListener(
      "wheel",
      (e) => {
        if (this.mode !== "globe") return;
        e.preventDefault();
        const s = this.projOrtho.scale();
        const ns = Math.max(this.minScale, Math.min(this.maxScale, s * (e.deltaY < 0 ? 1.08 : 0.925)));
        this.projOrtho.scale(ns);
      },
      { passive: false, signal: this.ac.signal },
    );
  }

  updateHover(x: number, y: number) {
    const id = this.hitId(x, y);
    this.stage.style.cursor = this.drag ? "grabbing" : id ? "pointer" : "grab";
    this.hoveredId = id;
    this.updateTooltip(id);
  }
  updateTooltip(id: string | null) {
    const t = this.tooltip;
    const cat = id ? CAT_BY_ID.get(id) : null;
    if (!cat) {
      t.style.opacity = "0";
      return;
    }
    const rec = this.counts.get(cat.id);
    const logs = rec ? rec.logs : 0;
    const wishes = rec ? rec.wishes : 0;
    const parts = [logs > 0 ? logs + (logs === 1 ? " LOG" : " LOGS") : "NO LOGS YET"];
    if (wishes > 0) parts.push("☆ " + wishes + " WISHED");
    t.innerHTML =
      '<div style="font-family:Marcellus,serif;font-size:15px;color:var(--ink);">' +
      esc(cat.name) +
      '</div><div style="font-family:Special Elite,monospace;font-size:9.5px;letter-spacing:1.2px;color:var(--ink-soft);margin-top:2px;">' +
      parts.join(" · ") +
      "</div>";
    const xy = this.tipXY;
    // Flip to the other side of the cursor when the tip would leave the stage.
    let tx = xy[0] + 16;
    let ty = xy[1] + 16;
    if (this.size) {
      if (tx + t.offsetWidth > this.size.w - 8) tx = Math.max(8, xy[0] - 16 - t.offsetWidth);
      if (ty + t.offsetHeight > this.size.h - 8) ty = Math.max(8, xy[1] - 16 - t.offsetHeight);
    }
    t.style.transform = "translate(" + tx + "px," + ty + "px)";
    t.style.opacity = "1";
  }

  clickCountry(id: string) {
    this.hoveredId = null;
    this.updateTooltip(null);
    const cat = CAT_BY_ID.get(id);
    if (this.mode === "globe" && cat) {
      this.flyTarget = [-cat.lon, -cat.lat, 0];
      this.flying = true;
      this.openTimer = setTimeout(() => this.onSelect(id), 360);
    } else {
      this.onSelect(id);
    }
  }

  setMode(m: GlobeMode) {
    if (m === this.mode) return;
    const cv = this.canvas;
    cv.style.opacity = "0";
    this.mode = m;
    // The pointer's old position means nothing under the other projection.
    this.hoveredId = null;
    this.updateTooltip(null);
    setTimeout(() => {
      this.projection = m === "globe" ? this.projOrtho : this.projFlat;
      this.fitProjection();
      this.draw();
      cv.style.opacity = "1";
    }, 170);
  }
}

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function Globe({ countries, palette, mode, active, onSelect }: GlobeProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlobeEngine | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Mount once: build the engine and start the render loop.
  useEffect(() => {
    if (!stageRef.current || !canvasRef.current || !tooltipRef.current) return;
    const engine = new GlobeEngine({
      stage: stageRef.current,
      canvas: canvasRef.current,
      tooltip: tooltipRef.current,
      palette,
      mode,
      onSelect: (id) => onSelectRef.current(id),
    });
    engineRef.current = engine;
    try {
      engine.init();
      engine.setData(countries);
    } catch (err) {
      console.error("Atlas globe failed to initialise", err);
    }
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setData(countries);
  }, [countries]);
  useEffect(() => {
    engineRef.current?.setPalette(palette);
  }, [palette]);
  useEffect(() => {
    engineRef.current?.setMode(mode);
  }, [mode]);
  useEffect(() => {
    if (active) engineRef.current?.resume();
    else engineRef.current?.pause();
  }, [active]);

  return (
    <div
      ref={stageRef}
      style={{ position: "absolute", inset: 0, zIndex: 1, overflow: "hidden", cursor: "grab" }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, zIndex: 1, display: "block", width: "100%", height: "100%", transition: "opacity .25s ease" }}
      />
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          zIndex: 6,
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity .15s ease",
          background: "var(--paper2)",
          border: "1px solid var(--sepia)",
          borderRadius: 2,
          padding: "7px 11px",
          boxShadow: "0 6px 16px rgba(40,28,12,.22)",
          whiteSpace: "nowrap",
        }}
      />
    </div>
  );
}
