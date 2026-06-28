"use client";

import { useEffect, useRef } from "react";
import {
  geoOrthographic,
  geoNaturalEarth1,
  geoGraticule10,
  geoPath,
  geoDistance,
  geoContains,
} from "d3-geo";
import { feature } from "topojson-client";
import topoData from "world-atlas/countries-110m.json";
import { buildCountDisc } from "@/lib/stamps";
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

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

/**
 * Imperative globe/map renderer, ported from the Atlas design export. Owns a
 * canvas (the projected earth), an HTML marker layer (the postmark stamps), and
 * the pointer interactions (drag to spin, scroll to zoom, click to open).
 */
class GlobeEngine {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  markers: HTMLDivElement;
  tooltip: HTMLDivElement;
  onSelect: (id: string) => void;

  countries: LoggedCountry[] = [];
  palette: Palette;
  mode: GlobeMode = "globe";
  paused = false;

  loggedSet = new Set<string>();
  features: any[] = [];
  featById: Record<string, any> = {};
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
  drag: { x: number; y: number; rot: [number, number, number] } | null = null;
  dragMoved = 0;
  lastX = 0;
  lastY = 0;
  autoPause = false;
  flying = false;
  flyTarget: [number, number, number] = [0, 0, 0];
  hoveredId: string | null = null;
  tipXY: [number, number] = [0, 0];
  markerEls: Record<string, HTMLDivElement> = {};
  openTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: {
    stage: HTMLDivElement;
    canvas: HTMLCanvasElement;
    markers: HTMLDivElement;
    tooltip: HTMLDivElement;
    palette: Palette;
    mode: GlobeMode;
    onSelect: (id: string) => void;
  }) {
    this.stage = opts.stage;
    this.canvas = opts.canvas;
    this.markers = opts.markers;
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
    this.features.forEach((f) => {
      this.featById[String(f.id)] = f;
    });
    this.graticule = geoGraticule10();
    this.projOrtho = geoOrthographic().rotate([-12, -18, 0]).precision(0.4);
    this.projFlat = geoNaturalEarth1().precision(0.4);
    this.projection = this.mode === "globe" ? this.projOrtho : this.projFlat;
    this.setupCanvas();
    this.buildMarkers();
    this.attachInteractions();
    this.startLoop();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    if (this.openTimer) clearTimeout(this.openTimer);
  }

  setData(countries: LoggedCountry[]) {
    this.countries = countries;
    this.loggedSet = new Set(countries.map((c) => c.id));
    if (this.features.length) {
      this.buildMarkers();
      this.draw();
      this.positionMarkers();
    }
  }
  setPalette(p: Palette) {
    this.palette = p;
    if (this.features.length) {
      this.buildMarkers();
      this.draw();
    }
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    if (this.features.length) {
      this.fitProjection();
      this.draw();
      this.positionMarkers();
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
      if (this.features.length) {
        this.draw();
        this.positionMarkers();
      }
    };
    measure();
    this.ro = new ResizeObserver(measure);
    this.ro.observe(el);
  }

  fitProjection() {
    if (!this.size) return;
    const { w, h } = this.size;
    const cx = (w + 250) / 2; // shift right to clear the left index rail
    this.projOrtho.scale(Math.min(w, h) * 0.42).translate([cx, h * 0.54]);
    if (this.projFlat) this.projFlat.fitExtent([[300, 90], [w - 50, h - 80]], { type: "Sphere" });
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
      this.positionMarkers();
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
  flyTo(c: LoggedCountry) {
    this.flyTarget = [-c.lon, -c.lat, 0];
    this.flying = true;
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
      const logged = this.loggedSet.has(String(f.id));
      ctx.fillStyle = logged ? pal.landLogged : pal.land;
      ctx.fill();
      ctx.lineWidth = logged ? 0.7 : 0.35;
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

  screenPos(c: LoggedCountry): [number, number] | null {
    const pt: [number, number] = [c.lon, c.lat];
    if (this.mode === "globe") {
      const r = this.projOrtho.rotate();
      const center: [number, number] = [-r[0], -r[1]];
      if (geoDistance(pt, center) > Math.PI / 2) return null;
    }
    const p = this.projection(pt);
    if (!p || isNaN(p[0])) return null;
    return p;
  }

  buildMarkers() {
    const layer = this.markers;
    layer.innerHTML = "";
    this.markerEls = {};
    const sz = this.mode === "globe" ? 52 : 46;
    for (const c of this.countries) {
      const el = document.createElement("div");
      el.style.cssText =
        "position:absolute;left:0;top:0;will-change:transform,opacity;filter:drop-shadow(0 2px 3px rgba(40,28,12,.4));";
      el.innerHTML = buildCountDisc(c, { size: sz, palette: this.palette });
      layer.appendChild(el);
      this.markerEls[c.id] = el;
    }
    this.positionMarkers();
  }

  positionMarkers() {
    if (!this.markerEls) return;
    const isGlobe = this.mode === "globe";
    const rot = isGlobe ? this.projOrtho.rotate() : null;
    const center: [number, number] | null = rot ? [-rot[0], -rot[1]] : null;
    for (const c of this.countries) {
      const el = this.markerEls[c.id];
      if (!el) continue;
      const sp = this.screenPos(c);
      if (!sp) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      let sc = 1;
      let op = 1;
      if (isGlobe && center) {
        const dd = geoDistance([c.lon, c.lat], center);
        const f = Math.cos(dd);
        sc = 0.7 + 0.3 * f;
        op = Math.max(0, Math.min(1, (f - 0.04) * 2.4));
      }
      if (this.hoveredId === c.id) sc *= 1.2;
      el.style.transform =
        "translate(" + sp[0].toFixed(1) + "px," + sp[1].toFixed(1) + "px) translate(-50%,-50%) scale(" + sc.toFixed(3) + ")";
      el.style.opacity = op.toFixed(2);
      el.style.zIndex = String(Math.round(sc * 100));
    }
  }

  hitCountry(x: number, y: number): LoggedCountry | null {
    let best: LoggedCountry | null = null;
    let bd = 1e9;
    for (const c of this.countries) {
      const sp = this.screenPos(c);
      if (!sp) continue;
      const d = Math.hypot(sp[0] - x, sp[1] - y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (best && bd < (this.mode === "globe" ? 24 : 20)) return best;
    const inv = this.projection.invert && this.projection.invert([x, y]);
    if (!inv || isNaN(inv[0])) return null;
    for (const c of this.countries) {
      const f = this.featById[c.id];
      if (f && geoContains(f, inv)) return c;
    }
    return null;
  }

  attachInteractions() {
    const el = this.stage;
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
    });
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
    });
    const up = (e: PointerEvent) => {
      if (this.drag) {
        const moved = this.dragMoved;
        this.drag = null;
        el.style.cursor = "grab";
        this.autoPause = false;
        if (moved < 6) {
          const [x, y] = rel(e);
          const c = this.hitCountry(x, y);
          if (c) this.clickCountry(c);
        }
      }
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", () => {
      this.drag = null;
      el.style.cursor = "grab";
      this.autoPause = false;
    });
    el.addEventListener("pointerleave", () => {
      this.updateHover(-999, -999);
    });
    el.addEventListener(
      "wheel",
      (e) => {
        if (this.mode !== "globe") return;
        e.preventDefault();
        const s = this.projOrtho.scale();
        const ns = Math.max(this.minScale, Math.min(this.maxScale, s * (e.deltaY < 0 ? 1.08 : 0.925)));
        this.projOrtho.scale(ns);
      },
      { passive: false },
    );
  }

  updateHover(x: number, y: number) {
    const c = this.hitCountry(x, y);
    const id = c ? c.id : null;
    this.stage.style.cursor = this.drag ? "grabbing" : c ? "pointer" : "grab";
    this.hoveredId = id;
    this.updateTooltip(c);
  }
  updateTooltip(c: LoggedCountry | null) {
    const t = this.tooltip;
    if (!c) {
      t.style.opacity = "0";
      return;
    }
    t.innerHTML =
      '<div style="font-family:Marcellus,serif;font-size:15px;color:var(--ink);">' +
      esc(c.name) +
      '</div><div style="font-family:Special Elite,monospace;font-size:9.5px;letter-spacing:1.2px;color:var(--ink-soft);margin-top:2px;">' +
      c.entries.length +
      " ENTRIES · " +
      esc(c.region.toUpperCase()) +
      "</div>";
    const xy = this.tipXY;
    t.style.transform = "translate(" + (xy[0] + 16) + "px," + (xy[1] + 16) + "px)";
    t.style.opacity = "1";
  }

  clickCountry(c: LoggedCountry) {
    this.hoveredId = null;
    this.updateTooltip(null);
    if (this.mode === "globe") {
      this.flyTo(c);
      this.openTimer = setTimeout(() => this.onSelect(c.id), 360);
    } else {
      this.onSelect(c.id);
    }
  }

  setMode(m: GlobeMode) {
    if (m === this.mode) return;
    const cv = this.canvas;
    const layer = this.markers;
    cv.style.opacity = "0";
    layer.style.opacity = "0";
    this.mode = m;
    setTimeout(() => {
      this.projection = m === "globe" ? this.projOrtho : this.projFlat;
      this.fitProjection();
      this.buildMarkers();
      this.draw();
      this.positionMarkers();
      cv.style.opacity = "1";
      layer.style.opacity = "1";
    }, 170);
  }
}

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export default function Globe({ countries, palette, mode, active, onSelect }: GlobeProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markersRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GlobeEngine | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Mount once: build the engine and start the render loop.
  useEffect(() => {
    if (!stageRef.current || !canvasRef.current || !markersRef.current || !tooltipRef.current) return;
    const engine = new GlobeEngine({
      stage: stageRef.current,
      canvas: canvasRef.current,
      markers: markersRef.current,
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
      <div ref={markersRef} style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none", transition: "opacity .25s ease" }} />
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
