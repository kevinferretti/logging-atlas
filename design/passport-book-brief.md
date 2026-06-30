# Atlas — The Passport Book (design brief)

> Paste everything below into Claude design. Tweak the four choices noted at the
> end ("Decisions to confirm") first if you want something different.

## Concept
A skeuomorphic, **flip-through passport booklet** that holds everything a
traveler has logged. The app lets a signed-in user record things tied to
countries — recipes, books, films, music, and places — and renders each logged
item as a worn rubber-stamp impression. Redesign the per-country experience as
an actual passport you open and page through: **each country is its own page,
crowded with that country's stamps.** The booklet is a physical object on the
screen — it always uses warm cream passport paper and a dark/gold cover, and it
does **not** invert or recolor in dark mode.

## Mood & references
Vintage machine-readable passport meets a well-loved travel journal: embossed
gold-foil cover, intricate guilloché security patterns, an OCR-B machine-readable
zone, and visa pages overrun with overlapping immigration stamps. Tactile,
official-but-romantic, analog, nostalgic, faintly secretive.

## The object & composition
- A passport held open near screen center, showing a **two-page spread** (left +
  right pages) with a stitched binding and a soft gutter shadow down the middle.
- The book casts a soft drop shadow onto a **surface** (a desk) behind it. The
  surface is the *only* thing that responds to the app theme — light: warm
  parchment/leather desk; dark: deep charcoal desk. The book itself never changes.
- Gentle page curvature near the spine, subtle paper grain, slightly worn rounded
  corners.

## Palette (fixed, theme-independent)
- Cover: deep **navy** `#1B2A41` *(alts: oxblood `#5A1E1E`, forest `#1E3A2E`)*
  with **gold foil** `#C9A24B` for emblem and lettering.
- Pages: aged cream `#F3EAD6`, darker worn edge `#E7DAB8`, faint foxing/age spots.
- Security guilloché lines: `#CBB68C` at ~12–18% opacity.
- Stamp inks, one per category:
  - Recipe — deep red `#A23A2E`
  - Book — ink blue `#2C4F8A`
  - Film — charcoal `#3A3733`
  - Music — green `#2E6B4F`
  - Place — plum `#6B3A77`

## Typography
- Display / headings: **Marcellus** (elegant serif).
- Labels, stamps, captions: **Special Elite** (typewriter).
- MRZ lines: an **OCR-B / monospace** look.
- Body: **EB Garamond**.

## Pages (anatomy)

**1. Cover (closed).** Navy, centered gold emblem (a globe / compass-rose crest),
arched "ATLAS" at top, "PASSPORT OF THINGS LOGGED" beneath the crest, a small
e-passport chip glyph at the bottom. Opening swings the cover back in 3D.

**2. Identity / data page** (the photo page), laid out like a real bio page:

```
┌───────────────────────────────────────────────┐
│ ATLAS · PASSPORT OF THINGS LOGGED              │
│ ┌───────┐  HOLDER          Jane Traveler       │
│ │ globe │  ISSUED BY        ATLAS              │
│ │/mono- │  MEMBER SINCE     2023               │
│ │ gram  │  COUNTRIES        24                  │
│ └───────┘  ENTRIES          312                 │
│   (ghosted PASSPORT No.     ATL-7F3K-2208       │
│    repeat)                                       │
│ P<ATLJANE<<TRAVELER<<<<<<<<<<<<<<<<<<<<<<<<<     │
│ ATL7F3K2208ATL2308155F<<<<<<<<<<<<<<<<<<04       │
└───────────────────────────────────────────────┘
```
Typewriter labels, serif values, a portrait box holding the traveler's monogram
or a small engraved globe with a ghosted translucent repeat, and two **MRZ**
lines in OCR-B with `<<<` fillers along the bottom.

**3. Index / "visas" page.** A contents table of logged countries —
name · region · stamp count · page no. — styled like an official record; clicking
a row jumps to that country's page. Optional **thumb-index tabs** down the right
edge, grouped by continent, for quick jumps.

**4. Country pages** — one country per spread:

```
┌──────────────────────────┬──────────────────────────┐
│ EAST ASIA                 │   (stamps continue across │
│ JAPAN                     │    the gutter and bleed    │
│ 37.5°N 138.2°E            │    off the page edges)     │
│ 17 entries · first 2015   │      ⬡  ◯   ▭             │
│                           │   ◯     ⬡      ◯           │
│   ▭   ◯   ⬡   (stamps,    │      ▭     ◯               │
│  overlapping, rotated)    │   ⬡    ◯    ⬡              │
└──────────────────────────┴──────────────────────────┘
```
Visa-style heading (Marcellus country name; typewriter region, coordinates,
"first logged" year, entry count). The page is covered in that country's stamps —
overlapping, rotated, varied, some running into the gutter and off the edges.
Faint full-page watermark behind them (a globe or the country's silhouette) plus
guilloché. The very first country page also bears a welcome
"ADMITTED — ATLAS BORDER CONTROL" stamp.

**5. Trailing blank pages.** A couple of empty stamp pages faintly marked
"AWAITING ENTRIES," so the book feels like it has room to grow.

## The stamps
Worn rubber-stamp impressions in the category ink color. Mix of shapes — round,
oval, rectangular, hexagonal, scalloped/cogged. Each carries arched country text,
a category + action word (ENTRY / ARRIVAL / ADMITTED), the item title, a date, and
a faux reference number. Randomly rotated, overlapping, with varied opacity/
pressure and broken/worn edges (some letters faded) so they read as ink pressed
into paper.

## Navigation & interaction
- **Page turn:** realistic 3D page-curl around the spine (~0.5–0.7s) with a soft
  shadow sweeping across the turning leaf. Triggers: left/right arrows, clicking
  the page edge, dragging the page corner, keyboard ←/→, swipe on mobile.
- **Jump:** index rows and the edge tabs jump straight to a country.
- Optional faint page-flip sound cue.

## Motion & states
- Cover opens with a 3D swing on entry.
- On each turn, the landing page's stamps settle in with a tiny scale/opacity
  "thunk."
- Hovering a stamp lifts it slightly and reveals a small caption (title + date)
  without breaking the analog feel.

## Responsive
- Desktop: full two-page spread, up to ~960px wide, centered with desk margins.
- Mobile: show a **single page** at a time; swipe to turn; cover and pages scale
  down; tabs collapse into a menu.

## Fixed vs themed (important)
- **Fixed always:** cover, gold foil, cream pages, stamp inks, guilloché — the
  book is a constant physical object.
- **Themed:** only the desk/surface behind the book (and the surrounding app
  chrome) shifts between light and dark.

## Deliverable
A high-fidelity interactive mockup of the passport book including: the closed
cover, the identity/data page, the index page, and 2–3 country stamp pages, with a
working page-turn interaction. Cream paper throughout; the book ignores dark mode.

---

### Decisions to confirm before pasting
1. **Cover color** — navy (default) / oxblood / forest.
2. **Per-country layout** — full two-page spread per country (default) / one page.
3. **Page turn** — realistic 3D curl (default) / soft slide.
4. **Background** — themed desk behind a fixed book (default) / plain.
