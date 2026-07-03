"use client";

import { useEffect, useMemo, useRef } from "react";
import InkFilters from "./InkFilters";
import { PassportBook as BookEngine, type BookCountry, type BookHolder } from "@/lib/passportBook";
import { countryPrefix } from "@/lib/countries";
import type { LoggedCountry, SessionUser } from "@/lib/types";

interface PassportBookProps {
  user: SessionUser;
  countries: LoggedCountry[];
  dark: boolean;
  initialCountryId: string | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function holderNo(id: string): { no: string; noRaw: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const s = (h % 1000000).toString().padStart(6, "0");
  return { no: "ATL " + s.slice(0, 3) + " " + s.slice(3), noRaw: "ATL" + s + "3" };
}

export default function PassportBook({ user, countries, dark, initialCountryId, onClose, onDelete }: PassportBookProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BookEngine | null>(null);

  // Latest callbacks, so the engine (mounted once) always calls the current ones.
  const onCloseRef = useRef(onClose);
  const onDeleteRef = useRef(onDelete);
  onCloseRef.current = onClose;
  onDeleteRef.current = onDelete;

  // Chronological order — first-logged first, like a passport fills up.
  const bookCountries: BookCountry[] = useMemo(
    () =>
      [...countries]
        .sort((a, b) => a.year - b.year || a.name.localeCompare(b.name))
        .map((c) => ({
          id: c.id,
          name: c.name,
          prefix: countryPrefix(c.id) || "DESTINATION",
          region: c.region,
          lon: c.lon,
          lat: c.lat,
          year: c.year,
          entries: c.entries,
        })),
    [countries],
  );

  const holder: BookHolder = useMemo(() => {
    const name = (user.name || user.email.split("@")[0] || "Traveler").trim();
    const parts = name.split(/\s+/);
    const given = parts[0] || name;
    const surname = parts.length > 1 ? parts[parts.length - 1] : "";
    const mono = ((given[0] || "") + (surname[0] || given[1] || "")).toUpperCase();
    const totalEntries = countries.reduce((n, c) => n + c.entries.length, 0);
    const since = countries.length ? String(Math.min(...countries.map((c) => c.year))) : "—";
    const { no, noRaw } = holderNo(user.id);
    return {
      name,
      surname: surname.toUpperCase(),
      given: given.toUpperCase(),
      mono: mono || "✦",
      since,
      countries: countries.length,
      entries: totalEntries,
      no,
      noRaw,
      nat: "ATLAS",
      auth: "BUREAU OF THINGS LOGGED",
    };
  }, [user, countries]);

  // Mount the engine once.
  useEffect(() => {
    const engine = new BookEngine();
    engineRef.current = engine;
    engine.mount(
      {
        root: rootRef.current!,
        desk: deskRef.current!,
        scale: scaleRef.current!,
        shadow: shadowRef.current!,
        book: bookRef.current!,
        tip: tipRef.current!,
        label: labelRef.current!,
        hint: hintRef.current!,
        popover: popoverRef.current!,
      },
      {
        dark,
        sound: true,
        cover: "Navy · Classic",
        onClose: () => onCloseRef.current(),
        onDeleteEntry: (id) => onDeleteRef.current(id),
      },
      holder,
      bookCountries,
      initialCountryId,
    );
    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push data + theme updates to the live engine.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    engineRef.current?.setData(holder, bookCountries);
  }, [holder, bookCountries]);
  useEffect(() => {
    engineRef.current?.setDark(dark);
  }, [dark]);

  return (
    <div
      ref={rootRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 104,
        fontFamily: "'EB Garamond',Georgia,serif",
        background: "#cdbf9f",
        animation: "om-rise .3s ease",
        // Drag-to-flip must never start a native text selection (Firefox
        // paints selection boxes over the page text during the turn).
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <InkFilters />
      <div ref={deskRef} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* Back to the world */}
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 22,
          left: 24,
          zIndex: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          background: "rgba(28,20,10,.42)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,.28)",
          borderRadius: 3,
          padding: "9px 14px",
          cursor: "pointer",
          fontFamily: "'Special Elite',monospace",
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "#f3ead6",
          boxShadow: "0 3px 12px rgba(0,0,0,.3)",
        }}
      >
        ← The world
      </button>

      <div ref={scaleRef} style={{ position: "relative", zIndex: 2, width: 920, height: 632, transformOrigin: "center center" }}>
        <div
          ref={shadowRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "52%",
            width: 880,
            height: 600,
            transform: "translate(-50%,-50%)",
            borderRadius: 10,
            background: "rgba(20,12,4,.42)",
            filter: "blur(34px)",
            zIndex: 0,
            transition: "width .55s cubic-bezier(.4,.05,.2,1),background .4s ease",
            pointerEvents: "none",
          }}
        />
        <div ref={bookRef} style={{ position: "absolute", inset: 0, zIndex: 1, transition: "opacity .2s ease" }} />
      </div>

      {/* Hover caption */}
      <div
        ref={tipRef}
        style={{
          position: "absolute",
          zIndex: 44,
          left: 0,
          top: 0,
          opacity: 0,
          transform: "translate(-50%,-120%)",
          transition: "opacity .14s ease",
          pointerEvents: "none",
          background: "#272015",
          color: "#F3EAD6",
          border: "1px solid #5b4a30",
          borderRadius: 3,
          padding: "6px 10px",
          boxShadow: "0 8px 20px rgba(0,0,0,.4)",
          whiteSpace: "nowrap",
          fontFamily: "'Special Elite',monospace",
          fontSize: 12,
        }}
      />

      {/* Entry detail popover */}
      <div
        ref={popoverRef}
        style={{
          position: "absolute",
          zIndex: 45,
          left: 0,
          top: 0,
          width: 240,
          opacity: 0,
          pointerEvents: "none",
          transform: "translate(-50%,12px)",
          transition: "opacity .14s ease",
          background: "#F3EAD6",
          border: "1px solid #CBBF9E",
          borderRadius: 4,
          padding: "12px 14px",
          boxShadow: "0 14px 34px rgba(20,12,4,.4)",
        }}
      />

      {/* Bottom nav */}
      <div style={{ position: "absolute", zIndex: 35, bottom: 22, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 18 }}>
        <button onClick={() => engineRef.current?.turnBtn(-1)} aria-label="Previous page" style={navBtn}>
          ‹
        </button>
        <div ref={labelRef} style={{ minWidth: 268, textAlign: "center", fontFamily: "'Special Elite',monospace", fontSize: 11, letterSpacing: 2.5, color: "rgba(255,255,255,.82)", textShadow: "0 1px 4px rgba(0,0,0,.5)" }} />
        <button onClick={() => engineRef.current?.turnBtn(1)} aria-label="Next page" style={navBtn}>
          ›
        </button>
      </div>

      <div
        ref={hintRef}
        style={{
          position: "absolute",
          zIndex: 35,
          bottom: 78,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Special Elite',monospace",
          fontSize: 9.5,
          letterSpacing: 2,
          color: "rgba(255,255,255,.5)",
          textShadow: "0 1px 3px rgba(0,0,0,.5)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}
      />
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,.28)",
  background: "rgba(28,20,10,.42)",
  backdropFilter: "blur(6px)",
  cursor: "pointer",
  fontSize: 18,
  color: "#f3ead6",
  boxShadow: "0 3px 12px rgba(0,0,0,.3)",
};
