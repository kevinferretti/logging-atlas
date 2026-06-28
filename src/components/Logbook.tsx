"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { countryPrefix } from "@/lib/countries";
import { layoutCluster } from "@/lib/inkstamps";
import type { LoggedCountry } from "@/lib/types";

interface LogbookProps {
  countries: LoggedCountry[];
}

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function Logbook({ countries }: LogbookProps) {
  const [idx, setIdx] = useState(0);
  const co = countries.length ? countries[Math.min(idx, countries.length - 1)] : null;
  const cluster = useMemo(
    () => (co ? layoutCluster(co.entries, co.name) : { width: 0, height: 0, stamps: [] }),
    [co],
  );

  if (!co) {
    return (
      <div style={{ minHeight: "100vh", background: "#E2D7BB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 24, fontFamily: "'EB Garamond',serif", color: "#2E2A22" }}>
        <div style={{ fontFamily: "Marcellus,serif", fontSize: 30 }}>An empty logbook</div>
        <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", color: "#7c6f53", fontSize: 16 }}>
          Log a few entries and they'll be stamped onto these pages.
        </div>
        <Link href="/" style={backBtn}>
          ← To the atlas
        </Link>
      </div>
    );
  }

  const prefix = countryPrefix(co.id);
  const go = (d: number) => setIdx((i) => (i + d + countries.length) % countries.length);

  return (
    <div style={{ minHeight: "100vh", background: "#E2D7BB", display: "flex", flexDirection: "column", alignItems: "center", padding: "30px 24px 60px", fontFamily: "'EB Garamond',Georgia,serif", color: "#2E2A22" }}>
      {/* Worn-ink stamp filters */}
      <InkFilters />

      <div style={{ width: "100%", maxWidth: 1000, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <Link href="/" style={backBtn}>
          ← The atlas
        </Link>
        <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 3, color: "#8A5A3B" }}>THE LOGBOOK</div>
      </div>

      {/* Passport page */}
      <div style={{ position: "relative", width: "100%", maxWidth: 1000, background: "#F3EAD6", border: "1px solid #CBBF9E", borderRadius: 4, boxShadow: "0 24px 60px rgba(40,28,12,.28)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: NOISE, backgroundSize: "170px", opacity: 0.05, mixBlendMode: "multiply" }} />
        <div style={{ position: "absolute", inset: 14, border: "1px solid #D8C9A3", borderRadius: 2, pointerEvents: "none" }} />

        <div style={{ position: "relative", padding: "40px 56px 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 3, color: "#A8946A" }}>✦&nbsp;&nbsp;VISAS &amp; ENTRIES&nbsp;&nbsp;✦</div>
          <div style={{ fontFamily: "'Special Elite',monospace", fontSize: 10, letterSpacing: 2, color: "#A8946A" }}>No {String(1000 + ((Number(co.id) * 7) % 8999))}</div>
        </div>

        <div style={{ position: "relative", padding: "6px 56px 0", textAlign: "center" }}>
          {prefix && (
            <div style={{ fontFamily: "'EB Garamond',serif", fontSize: 13, letterSpacing: 4, textTransform: "uppercase", color: "#8A5A3B", fontWeight: 600 }}>{prefix}</div>
          )}
          <div style={{ fontFamily: "Marcellus,serif", fontSize: 62, lineHeight: 1.02, color: "#2E2A22", marginTop: 4 }}>{co.name}</div>
          <div style={{ marginTop: 14, fontFamily: "'Special Elite',monospace", fontSize: 10.5, letterSpacing: 2, color: "#7A6E54" }}>
            {co.entries.length} ENTRIES&nbsp;&nbsp;·&nbsp;&nbsp;{co.region.toUpperCase()}&nbsp;&nbsp;·&nbsp;&nbsp;EST {co.year}
          </div>
        </div>

        <div style={{ position: "relative", height: 1, margin: "22px 56px 8px", background: "repeating-linear-gradient(90deg,#CBBF9E 0,#CBBF9E 6px,transparent 6px,transparent 12px)" }} />

        <div style={{ position: "relative", padding: "26px 40px 56px", minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: cluster.width, height: cluster.height }}>
            {cluster.stamps.map((s) => (
              <div
                key={s.key}
                style={{ position: "absolute", width: s.size, height: s.size, left: s.left, top: s.top, transform: `rotate(${s.rot}deg)`, mixBlendMode: "multiply", zIndex: s.z }}
                dangerouslySetInnerHTML={{ __html: s.svg }}
              />
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 18, left: 0, right: 0, textAlign: "center", fontFamily: "'Special Elite',monospace", fontSize: 9, letterSpacing: 2, color: "#B7A576", pointerEvents: "none" }}>— PASSPORT —</div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 30 }}>
        <button onClick={() => go(-1)} style={navBtn} aria-label="Previous country">
          ‹
        </button>
        <div style={{ minWidth: 230, textAlign: "center", fontFamily: "'Special Elite',monospace", fontSize: 12, letterSpacing: 2, color: "#6E5E45" }}>
          {co.name.toUpperCase()}&nbsp;&nbsp;·&nbsp;&nbsp;{idx + 1} / {countries.length}
        </div>
        <button onClick={() => go(1)} style={navBtn} aria-label="Next country">
          ›
        </button>
      </div>
      <div style={{ marginTop: 14, fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 13.5, color: "#7c6f53", maxWidth: 560, textAlign: "center" }}>
        Each entry is stamped as you log it — page through to see the cluster fill from a quiet visit to a well-worn passport.
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  textDecoration: "none",
  border: "1px solid #B6A57E",
  borderRadius: 2,
  padding: "8px 14px",
  fontFamily: "'Special Elite',monospace",
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  color: "#6E5E45",
  background: "#F3EAD6",
};

const navBtn: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: "50%",
  border: "1px solid #B6A57E",
  background: "#F3EAD6",
  cursor: "pointer",
  fontSize: 17,
  color: "#6E5E45",
  boxShadow: "0 2px 6px rgba(40,28,12,.14)",
};

function InkFilters() {
  const filters = [
    { id: "ink0", bf: 0.012, seed: 2, scale: 2.6, bf2: 0.16, seed2: 5, slope: -1.7, intercept: 1.55, oct: 4 },
    { id: "ink1", bf: 0.015, seed: 8, scale: 2.3, bf2: 0.19, seed2: 3, slope: -1.9, intercept: 1.6, oct: 4 },
    { id: "ink2", bf: 0.01, seed: 5, scale: 3.0, bf2: 0.14, seed2: 9, slope: -1.6, intercept: 1.5, oct: 5 },
    { id: "ink3", bf: 0.018, seed: 12, scale: 2.1, bf2: 0.21, seed2: 1, slope: -2.0, intercept: 1.62, oct: 4 },
    { id: "ink4", bf: 0.013, seed: 20, scale: 2.7, bf2: 0.17, seed2: 7, slope: -1.8, intercept: 1.58, oct: 4 },
  ];
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {filters.map((f) => (
          <filter key={f.id} id={f.id} x="-18%" y="-18%" width="136%" height="136%">
            <feTurbulence type="fractalNoise" baseFrequency={f.bf} numOctaves={f.oct} seed={f.seed} result="b" />
            <feDisplacementMap in="SourceGraphic" in2="b" scale={f.scale} xChannelSelector="R" yChannelSelector="G" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency={f.bf2} numOctaves={3} seed={f.seed2} result="f" />
            <feComponentTransfer in="f" result="m">
              <feFuncA type="linear" slope={f.slope} intercept={f.intercept} />
            </feComponentTransfer>
            <feComposite in="d" in2="m" operator="in" />
          </filter>
        ))}
      </defs>
    </svg>
  );
}
