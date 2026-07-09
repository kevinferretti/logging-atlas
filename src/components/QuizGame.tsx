"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { geoNaturalEarth1, geoGraticule10, geoPath, geoBounds, geoContains } from "d3-geo";
import { feature } from "topojson-client";
import topoData from "@/lib/atlasTopo.generated";
import { category } from "@/lib/categories";
import { COUNTRY_CATALOG, catalogCountry } from "@/lib/countries";
import { coveredCountryIds, subLine } from "@/lib/logbook";
import type { Palette } from "@/lib/palettes";
import type { Entry } from "@/lib/types";

interface QuizGameProps {
  entries: Entry[];
  palette: Palette;
  onClose: () => void;
}

interface Round {
  entry: Entry;
  answerId: string;
}

/** Outcome of a round while its feedback is on screen. */
interface RoundResult {
  answerId: string;
  guessId: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */


/**
 * Unlabeled flat map for the quiz. Deliberately withholds everything the main
 * globe shows: no tooltips, no country names, and no heat shading — the log
 * counts would mark the answers. Hover highlight, scroll zoom, and drag pan
 * only; a click (not a drag) submits the guess.
 */
class QuizMapEngine {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  onPick: (id: string) => void;

  palette: Palette;
  result: RoundResult | null = null;

  features: any[] = [];
  boundsById: Record<string, [[number, number], [number, number]]> = {};
  graticule: any;
  projection: any;
  fitScale = 0;
  ctx: CanvasRenderingContext2D | null = null;
  size: { w: number; h: number } | null = null;

  ro: ResizeObserver | null = null;
  ac = new AbortController();
  drag: { x: number; y: number; tx: number; ty: number } | null = null;
  dragMoved = 0;
  hoveredId: string | null = null;

  constructor(opts: { stage: HTMLDivElement; canvas: HTMLCanvasElement; palette: Palette; onPick: (id: string) => void }) {
    this.stage = opts.stage;
    this.canvas = opts.canvas;
    this.palette = opts.palette;
    this.onPick = opts.onPick;
  }

  init() {
    const fc: any = feature(topoData, (topoData as any).objects.countries);
    this.features = fc.features;
    this.features.forEach((f) => {
      // The generated topology bakes catalog ids into every feature.
      this.boundsById[String(f.id)] = geoBounds(f);
    });
    this.graticule = geoGraticule10();
    this.projection = geoNaturalEarth1().precision(0.4);
    this.setupCanvas();
    this.attachInteractions();
  }

  destroy() {
    if (this.ro) this.ro.disconnect();
    this.ac.abort();
  }

  setPalette(p: Palette) {
    this.palette = p;
    this.draw();
  }
  setResult(r: RoundResult | null) {
    this.result = r;
    if (r) {
      this.hoveredId = null;
      this.stage.style.cursor = "grab";
    }
    this.draw();
  }

  setupCanvas() {
    const cv = this.canvas;
    this.ctx = cv.getContext("2d");
    const measure = () => {
      const r = this.stage.getBoundingClientRect();
      const w = Math.max(10, r.width);
      const h = Math.max(10, r.height);
      this.size = { w, h };
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      this.ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Refit resets any zoom/pan — fine, resizes mid-round are rare.
      this.projection.fitExtent([[46, 54], [w - 46, h - 46]], { type: "Sphere" });
      this.fitScale = this.projection.scale();
      this.draw();
    };
    measure();
    this.ro = new ResizeObserver(measure);
    this.ro.observe(this.stage);
  }

  draw() {
    const ctx = this.ctx;
    if (!ctx || !this.features.length || !this.size) return;
    const { w, h } = this.size;
    ctx.clearRect(0, 0, w, h);
    const pal = this.palette;
    const path = geoPath(this.projection, ctx);
    const sphere = { type: "Sphere" } as any;
    const res = this.result;
    const wrong = res && res.guessId !== res.answerId;

    ctx.beginPath();
    path(sphere);
    ctx.fillStyle = pal.ocean;
    ctx.fill();

    ctx.beginPath();
    path(this.graticule);
    ctx.strokeStyle = pal.graticule;
    ctx.lineWidth = 0.6;
    ctx.stroke();

    for (const f of this.features) {
      const id = String(f.id);
      let fill = pal.land;
      let marked = false;
      if (res && id === res.answerId) {
        fill = pal.teal;
        marked = true;
      } else if (wrong && id === res.guessId) {
        fill = pal.red;
        marked = true;
      }
      ctx.beginPath();
      path(f);
      ctx.fillStyle = fill;
      ctx.fill();
      // Disputed overlays keep their dashed border here too — without it
      // they'd be invisible against the parent country they paint over.
      const disputed = catalogCountry(id)?.kind === "disputed";
      if (disputed) ctx.setLineDash([4, 3]);
      ctx.lineWidth = disputed ? 0.8 : marked ? 0.9 : 0.35;
      ctx.strokeStyle = pal.coast;
      ctx.stroke();
      if (disputed) ctx.setLineDash([]);
    }

    if (!res && this.hoveredId) {
      const f = this.features.find((x) => String(x.id) === this.hoveredId);
      if (f) {
        ctx.beginPath();
        path(f);
        ctx.fillStyle = hexA(pal.sepia, 0.22);
        ctx.fill();
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = pal.sepia;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    path(sphere);
    ctx.strokeStyle = pal.coast;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Ring the answer's label point — a teal fill alone is invisible on
    // microstates, and the ring is where the eye should land either way.
    if (res) {
      const cat = catalogCountry(res.answerId);
      const sp = cat && this.projection([cat.lon, cat.lat]);
      if (sp && !isNaN(sp[0])) {
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 13, 0, Math.PI * 2);
        ctx.strokeStyle = pal.gold;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 2.4, 0, Math.PI * 2);
        ctx.fillStyle = pal.gold;
        ctx.fill();
      }
    }
  }

  /** Catalog id under the pointer, or null over open ocean. */
  hitId(x: number, y: number): string | null {
    const inv = this.projection.invert && this.projection.invert([x, y]);
    if (inv && !isNaN(inv[0])) {
      const [lon, lat] = inv;
      if (lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) {
        // Reverse order: disputed overlays sit last and must beat the parent.
        for (let i = this.features.length - 1; i >= 0; i--) {
          const f = this.features[i];
          const id = String(f.id);
          const b = this.boundsById[id];
          if (!b) continue;
          if (lat < b[0][1] || lat > b[1][1]) continue;
          const west = b[0][0];
          const east = b[1][0];
          const inLon = west <= east ? lon >= west && lon <= east : lon >= west || lon <= east;
          if (!inLon) continue;
          if (geoContains(f, inv) && catalogCountry(id)) return id;
        }
      }
    }
    // Snap to the nearest catalog label point so tiny islands stay pickable.
    let best: string | null = null;
    let bd = 1e9;
    for (const c of COUNTRY_CATALOG) {
      const sp = this.projection([c.lon, c.lat]);
      if (!sp || isNaN(sp[0])) continue;
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
    el.style.cursor = "grab";
    const rel = (e: PointerEvent): [number, number] => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    el.addEventListener("pointerdown", (e) => {
      const [x, y] = rel(e);
      const t = this.projection.translate();
      this.drag = { x, y, tx: t[0], ty: t[1] };
      this.dragMoved = 0;
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    }, sig);
    el.addEventListener("pointermove", (e) => {
      const [x, y] = rel(e);
      if (this.drag) {
        this.dragMoved += Math.abs(e.movementX ?? 0) + Math.abs(e.movementY ?? 0);
        this.projection.translate([this.drag.tx + (x - this.drag.x), this.drag.ty + (y - this.drag.y)]);
        this.draw();
      } else if (!this.result) {
        const id = this.hitId(x, y);
        el.style.cursor = id ? "pointer" : "grab";
        if (id !== this.hoveredId) {
          this.hoveredId = id;
          this.draw();
        }
      }
    }, sig);
    el.addEventListener("pointerup", (e) => {
      if (!this.drag) return;
      const moved = this.dragMoved;
      this.drag = null;
      el.style.cursor = "grab";
      if (moved < 6 && !this.result) {
        const [x, y] = rel(e);
        const id = this.hitId(x, y);
        if (id) this.onPick(id);
      }
    }, sig);
    el.addEventListener("pointercancel", () => {
      this.drag = null;
      el.style.cursor = "grab";
    }, sig);
    el.addEventListener("pointerleave", () => {
      if (this.hoveredId) {
        this.hoveredId = null;
        this.draw();
      }
    }, sig);
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const r = el.getBoundingClientRect();
        const q: [number, number] = [e.clientX - r.left, e.clientY - r.top];
        const s = this.projection.scale();
        const ns = Math.max(this.fitScale, Math.min(this.fitScale * 14, s * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const f = ns / s;
        const t = this.projection.translate();
        // Keep the point under the cursor fixed while the scale changes.
        this.projection.scale(ns).translate([q[0] + (t[0] - q[0]) * f, q[1] + (t[1] - q[1]) * f]);
        this.draw();
      },
      { passive: false, signal: this.ac.signal },
    );
  }
}

function hexA(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
}

function QuizMap({ palette, result, onPick }: { palette: Palette; result: RoundResult | null; onPick: (id: string) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<QuizMapEngine | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!stageRef.current || !canvasRef.current) return;
    const engine = new QuizMapEngine({
      stage: stageRef.current,
      canvas: canvasRef.current,
      palette,
      onPick: (id) => onPickRef.current(id),
    });
    engineRef.current = engine;
    try {
      engine.init();
    } catch (err) {
      console.error("Quiz map failed to initialise", err);
    }
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setPalette(palette);
  }, [palette]);
  useEffect(() => {
    engineRef.current?.setResult(result);
  }, [result]);

  return (
    <div ref={stageRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

/** Real logs grouped by resolved country — the pool the quiz draws from. */
function buildPool(entries: Entry[]): [string, Entry[]][] {
  const byCountry = new Map<string, Entry[]>();
  for (const e of entries) {
    if (e.wishlist) continue;
    // A multi-country entry can come up for any country it covers.
    for (const id of coveredCountryIds(e)) {
      if (!catalogCountry(id)) continue;
      const list = byCountry.get(id);
      if (list) list.push(e);
      else byCountry.set(id, [e]);
    }
  }
  return [...byCountry.entries()];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One round per country so answers never repeat within a game. */
function buildRounds(pool: [string, Entry[]][], count: number): Round[] {
  return shuffle(pool)
    .slice(0, count)
    .map(([answerId, list]) => ({ answerId, entry: list[Math.floor(Math.random() * list.length)] }));
}

function roundOptions(available: number): { n: number; label: string }[] {
  const opts = [5, 10, 20].filter((n) => n < available).map((n) => ({ n, label: String(n) }));
  opts.push({ n: available, label: "ALL " + available });
  return opts;
}

function rank(score: number, total: number): string {
  const f = total > 0 ? score / total : 0;
  if (f >= 1) return "MASTER CARTOGRAPHER";
  if (f >= 0.8) return "SEASONED NAVIGATOR";
  if (f >= 0.6) return "COMPETENT EXPLORER";
  if (f >= 0.4) return "DUSTY COMPASS";
  return "LOST AT SEA";
}

export default function QuizGame({ entries, palette, onClose }: QuizGameProps) {
  const pool = useMemo(() => buildPool(entries), [entries]);
  const options = useMemo(() => roundOptions(pool.length), [pool]);
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [guessId, setGuessId] = useState<string | null>(null);
  const [roundCount, setRoundCount] = useState(
    () => options.find((o) => o.n === 10)?.n ?? options[options.length - 1]?.n ?? 0,
  );

  const round = phase === "play" ? rounds[idx] : null;
  const result: RoundResult | null = round && guessId ? { answerId: round.answerId, guessId } : null;
  const lastRound = idx === rounds.length - 1;

  function start(n: number) {
    setRounds(buildRounds(pool, n));
    setIdx(0);
    setScore(0);
    setGuessId(null);
    setPhase("play");
  }

  function pick(id: string) {
    if (!round || guessId) return;
    // Any country the entry covers is a right answer — credit it as the
    // round's answer so the reveal and score agree.
    const hit = coveredCountryIds(round.entry).includes(id) ? round.answerId : id;
    setGuessId(hit);
    if (hit === round.answerId) setScore((s) => s + 1);
  }

  function next() {
    if (lastRound) {
      setPhase("done");
    } else {
      setGuessId(null);
      setIdx((i) => i + 1);
    }
  }

  const cat = round ? category(round.entry.category) : null;
  const answerName = round ? catalogCountry(round.answerId)?.name ?? "" : "";
  const guessName = guessId ? catalogCountry(guessId)?.name ?? "" : "";
  const correct = result !== null && result.guessId === result.answerId;

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "20px 30px 14px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 12, letterSpacing: 3, color: "var(--sepia)" }}>THE GEOGRAPHY EXAM</div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          {phase === "play" && (
            <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.5, color: "var(--ink-soft)" }}>
              ROUND {idx + 1} OF {rounds.length}&nbsp;&nbsp;·&nbsp;&nbsp;SCORE {score}
            </div>
          )}
          <button onClick={onClose} style={miniBtn}>
            ✕ Close
          </button>
        </div>
      </div>

      {/* Intro */}
      {phase === "intro" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 430, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
            <div style={{ fontFamily: "Marcellus,serif", fontSize: 32, color: "var(--ink)" }}>Where was that from?</div>
            {pool.length === 0 ? (
              <>
                <div style={introBody}>
                  The exam draws on your real logs, and your atlas doesn&apos;t have any yet. Log a few entries first, then come back.
                </div>
                <button onClick={onClose} style={solidBtn}>
                  Back to the atlas
                </button>
              </>
            ) : (
              <>
                <div style={introBody}>
                  One of your logged entries appears — find its country on a map with no names. Scroll to zoom in on the small ones.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                  <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 2, color: "var(--ink-soft)" }}>ROUNDS</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {options.map((o) => {
                      const on = roundCount === o.n;
                      return (
                        <button
                          key={o.n}
                          onClick={() => setRoundCount(o.n)}
                          style={{ padding: "7px 14px", borderRadius: 2, cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 1.5, border: `1px solid ${on ? "var(--sepia)" : "var(--line)"}`, background: on ? "var(--sepia)" : "transparent", color: on ? "var(--paper)" : "var(--ink-soft)", transition: "all .15s ease" }}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={() => start(roundCount)} style={solidBtn}>
                  Begin the exam
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Play */}
      {phase === "play" && round && (
        <div style={{ flex: 1, position: "relative" }}>
          <QuizMap palette={palette} result={result} onPick={pick} />

          {/* Entry card — pointer events pass through so land under it stays clickable */}
          <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 2, pointerEvents: "none", maxWidth: "min(480px, calc(100% - 48px))", background: "var(--paper2)", border: "1px solid var(--sepia)", borderRadius: 4, boxShadow: "0 10px 28px rgba(40,28,12,.25)", padding: "14px 22px", textAlign: "center", animation: "om-rise .2s ease" }}>
            <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 9.5, letterSpacing: 2, color: "var(--sepia)" }}>WHERE DID YOU LOG THIS?</div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              {cat && (
                <span style={{ fontFamily: "'Special Elite',monospace", fontSize: 9.5, letterSpacing: 1.5, textTransform: "uppercase", color: "#F5EEDD", background: cat.color, borderRadius: 2, padding: "3px 7px" }}>
                  {cat.one}
                </span>
              )}
              <span style={{ fontFamily: "Marcellus,serif", fontSize: 23, color: "var(--ink)" }}>{round.entry.title}</span>
            </div>
            {/* Byline only after the guess — "dir. Kurosawa" would give the country away. */}
            {result && subLine(round.entry) && (
              <div style={{ marginTop: 4, fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 14.5, color: "var(--ink-soft)" }}>{subLine(round.entry)}</div>
            )}
          </div>

          {/* Feedback / hint */}
          {result ? (
            <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "flex", alignItems: "center", gap: 16, background: "var(--paper2)", border: `1px solid ${correct ? "var(--teal)" : "var(--red)"}`, borderRadius: 4, boxShadow: "0 10px 28px rgba(40,28,12,.25)", padding: "12px 18px", whiteSpace: "nowrap", animation: "om-rise .2s ease" }}>
              <div>
                <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 12, letterSpacing: 1.8, color: correct ? "var(--teal)" : "var(--red)" }}>
                  {correct ? "CORRECT — " + answerName.toUpperCase() : "IT WAS " + answerName.toUpperCase()}
                </div>
                {!correct && guessName && (
                  <div style={{ marginTop: 3, fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 14, color: "var(--ink-soft)" }}>you picked {guessName}</div>
                )}
              </div>
              <button onClick={next} style={solidBtn}>
                {lastRound ? "See results" : "Next entry →"}
              </button>
            </div>
          ) : (
            <div style={{ position: "absolute", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 2, pointerEvents: "none", fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 1.6, color: "var(--ink-soft)", opacity: 0.72, whiteSpace: "nowrap" }}>
              CLICK THE COUNTRY&nbsp;&nbsp;·&nbsp;&nbsp;SCROLL TO ZOOM&nbsp;&nbsp;·&nbsp;&nbsp;DRAG TO PAN
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {phase === "done" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 2.5, color: "var(--sepia)" }}>EXAM COMPLETE</div>
            <div style={{ fontFamily: "Marcellus,serif", fontSize: 58, lineHeight: 1, color: "var(--ink)" }}>
              {score} / {rounds.length}
            </div>
            <div style={{ display: "inline-block", border: "2px solid var(--sepia)", borderRadius: 3, padding: "8px 16px", transform: "rotate(-2deg)", fontFamily: "'Special Elite',monospace", fontSize: 13, letterSpacing: 2.5, color: "var(--sepia)" }}>
              {rank(score, rounds.length)}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => start(roundCount)} style={solidBtn}>
                Play again
              </button>
              <button onClick={onClose} style={dashedBtn}>
                Back to the atlas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const introBody: CSSProperties = {
  fontFamily: "'EB Garamond',serif",
  fontSize: 16.5,
  lineHeight: 1.5,
  color: "var(--ink-soft)",
};

const solidBtn: CSSProperties = {
  background: "var(--sepia)",
  color: "var(--paper)",
  border: "1px solid var(--sepia)",
  borderRadius: 2,
  padding: "10px 18px",
  cursor: "pointer",
  fontFamily: "'Special Elite',monospace",
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  boxShadow: "0 2px 5px rgba(40,28,12,.25)",
};

const dashedBtn: CSSProperties = {
  background: "none",
  color: "var(--sepia)",
  border: "1px dashed var(--sepia)",
  borderRadius: 2,
  padding: "10px 18px",
  cursor: "pointer",
  fontFamily: "'Special Elite',monospace",
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: "uppercase",
};

const miniBtn: CSSProperties = {
  background: "none",
  border: "1px solid var(--line)",
  borderRadius: 2,
  padding: "5px 9px",
  cursor: "pointer",
  fontFamily: "'Special Elite',monospace",
  fontSize: 9.5,
  letterSpacing: 1,
  textTransform: "uppercase",
  color: "var(--ink-soft)",
};
