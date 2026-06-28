export interface Palette {
  paper: string;
  paper2: string;
  panel: string;
  ink: string;
  inkSoft: string;
  line: string;
  sepia: string;
  teal: string;
  gold: string;
  red: string;
  ocean: string;
  oceanHi: string;
  land: string;
  landLogged: string;
  coast: string;
  graticule: string;
  vignette: string;
}

export type PaletteName = "Sepia Atlas" | "Midnight Customs";

export const PALETTES: Record<PaletteName, Palette> = {
  "Sepia Atlas": {
    paper: "#EFE6D2", paper2: "#F4EDDB", panel: "#E7DCC0", ink: "#2E2A22", inkSoft: "#7A6E54",
    line: "#CBBF9E", sepia: "#8A5A3B", teal: "#5E7A6F", gold: "#A9762F", red: "#9B4A39",
    ocean: "#C7C09F", oceanHi: "#D8D1B0", land: "#E3D7B8", landLogged: "#D6BC88", coast: "#A98F66",
    graticule: "rgba(120,100,70,0.16)", vignette: "rgba(60,46,24,0.34)",
  },
  "Midnight Customs": {
    paper: "#1E232C", paper2: "#272E39", panel: "#2E3441", ink: "#ECE3CE", inkSoft: "#9C9783",
    line: "#3C4452", sepia: "#C79A5B", teal: "#74A89B", gold: "#D8B26A", red: "#C2705E",
    ocean: "#1A212D", oceanHi: "#26313F", land: "#37404E", landLogged: "#5C6C88", coast: "#566173",
    graticule: "rgba(180,195,220,0.10)", vignette: "rgba(0,0,0,0.5)",
  },
};

export const PALETTE_NAMES = Object.keys(PALETTES) as PaletteName[];

export function getPalette(name: string): Palette {
  return PALETTES[name as PaletteName] ?? PALETTES["Sepia Atlas"];
}

/** Map a palette onto the CSS custom properties the UI reads. */
export function paletteCssVars(p: Palette): Record<string, string> {
  return {
    "--paper": p.paper,
    "--paper2": p.paper2,
    "--panel": p.panel,
    "--ink": p.ink,
    "--ink-soft": p.inkSoft,
    "--line": p.line,
    "--sepia": p.sepia,
    "--teal": p.teal,
    "--gold": p.gold,
    "--red": p.red,
    "--shadow": p.vignette,
  };
}
