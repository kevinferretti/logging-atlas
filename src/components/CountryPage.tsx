"use client";

// Country details page: one of five interchangeable page styles (the picker
// at the bottom is temporary — once a favourite is chosen the rest go), plus
// the passport-book overlay and the log modal.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PassportBook from "./PassportBook";
import LogModal from "./LogModal";
import InkFilters from "./InkFilters";
import LedgerVariant from "./country/LedgerVariant";
import PostcardsVariant from "./country/PostcardsVariant";
import JournalVariant from "./country/JournalVariant";
import DossierVariant from "./country/DossierVariant";
import GazetteVariant from "./country/GazetteVariant";
import type { VariantProps } from "./country/shared";
import { catalogCountry, resolveCountryId } from "@/lib/countries";
import { submitEntry, updateEntry } from "@/lib/entriesClient";
import { assembleCountries } from "@/lib/logbook";
import { coercePaletteName, getPalette, isDarkPalette, paletteCssVars } from "@/lib/palettes";
import type { Entry, NewEntryInput, SessionUser } from "@/lib/types";

const VARIANTS: { name: string; Comp: (p: VariantProps) => JSX.Element }[] = [
  { name: "Ledger", Comp: LedgerVariant },
  { name: "Pinboard", Comp: PostcardsVariant },
  { name: "Journal", Comp: JournalVariant },
  { name: "Dossier", Comp: DossierVariant },
  { name: "Gazette", Comp: GazetteVariant },
];

interface CountryPageProps {
  user: SessionUser;
  initialEntries: Entry[];
  countryId: string;
  initialVariant: number; // 1-based, already validated by the server page
}

export default function CountryPage({ user, initialEntries, countryId, initialVariant }: CountryPageProps) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [variant, setVariant] = useState(initialVariant);
  const [passportOpen, setPassportOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  // Entry being edited — opens the log modal prefilled, over whatever is up.
  const [editTarget, setEditTarget] = useState<Entry | null>(null);

  const id = resolveCountryId(countryId);
  const inCatalog = catalogCountry(id);
  const palette = useMemo(() => getPalette(coercePaletteName(user.theme)), [user.theme]);
  const dark = isDarkPalette(palette);
  const countries = useMemo(() => assembleCountries(entries), [entries]);
  const country = countries.find((c) => c.id === id) ?? null;

  function goWorld() {
    router.push("/");
  }

  function chooseVariant(n: number) {
    setVariant(n);
    // Keep the style shareable in the URL without a server round-trip.
    window.history.replaceState(null, "", `/country/${countryId}?v=${n}`);
  }

  async function addEntry(input: NewEntryInput, file?: File | null) {
    const entry = await submitEntry(input, file);
    setEntries((prev) => [...prev, entry]);
    return entry;
  }

  function editEntry(entryId: string) {
    setEditTarget(entries.find((e) => e.id === entryId) ?? null);
  }

  async function deleteEntry(entryId: string) {
    const res = await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
    if (!res.ok) return;
    // Functional update — overlapping deletes must not resurrect each other.
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }

  // Returns whether the user confirmed, so the book can keep its popover up
  // when the delete is declined.
  function confirmDelete(entryId: string): boolean {
    const ok = window.confirm("Remove this entry from the log?");
    if (ok) void deleteEntry(entryId);
    return ok;
  }

  // Book can't stay open on a country that just emptied out.
  useEffect(() => {
    if (passportOpen && !country) setPassportOpen(false);
  }, [passportOpen, country]);

  const rootStyle = {
    ...paletteCssVars(palette),
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    background: "var(--paper)",
    color: "var(--ink)",
    fontFamily: "'EB Garamond',Georgia,serif",
  } as unknown as React.CSSProperties;

  const Active = VARIANTS[variant - 1] ?? VARIANTS[0];

  return (
    <div style={rootStyle}>
      <InkFilters />

      {/* Scrolling page body */}
      <div style={{ position: "absolute", inset: 0, overflowY: "auto", animation: "om-rise .3s ease" }}>
        {!inCatalog ? (
          <Missing title="Uncharted territory" note="No country in the atlas answers to this name." onBack={goWorld} />
        ) : !country ? (
          <Missing
            title={inCatalog.name}
            note="Nothing logged from here yet. Be the first to stamp it."
            onBack={goWorld}
            onAdd={() => setLogOpen(true)}
          />
        ) : (
          <Active.Comp
            country={country}
            palette={palette}
            dark={dark}
            onBack={goWorld}
            onPassport={() => setPassportOpen(true)}
            onAdd={() => setLogOpen(true)}
            onEdit={editEntry}
            onDelete={confirmDelete}
          />
        )}
      </div>

      {/* Temporary style picker */}
      {country && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", alignItems: "center", gap: 3, background: "var(--paper2)", border: "1px solid var(--line)", borderRadius: 3, padding: "5px 8px", boxShadow: "0 4px 14px var(--shadow)" }}>
          <span style={{ fontFamily: "'Special Elite',monospace", fontSize: 8.5, letterSpacing: 1.5, color: "var(--ink-soft)", marginRight: 5 }}>PAGE STYLE</span>
          {VARIANTS.map((v, i) => {
            const on = variant === i + 1;
            return (
              <button
                key={v.name}
                onClick={() => chooseVariant(i + 1)}
                style={{
                  border: "none",
                  padding: "5px 9px",
                  borderRadius: 2,
                  cursor: "pointer",
                  fontFamily: "'Special Elite',monospace",
                  fontSize: 9.5,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  background: on ? "var(--ink)" : "transparent",
                  color: on ? "var(--paper)" : "var(--ink-soft)",
                  transition: "all .15s ease",
                }}
              >
                {i + 1} · {v.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Passport book overlay */}
      {passportOpen && country && (
        <PassportBook
          user={user}
          countries={countries}
          dark={dark}
          initialCountryId={id}
          onClose={() => setPassportOpen(false)}
          onEdit={editEntry}
          onDelete={confirmDelete}
        />
      )}

      {/* Edit modal — also reachable from the passport book popover */}
      {editTarget && (
        <LogModal
          entry={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (input, file, removeFile) => {
            const updated = await updateEntry(editTarget.id, input, file, removeFile);
            setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setEditTarget(null);
            // Moved to a different country? Follow it — unless the book is
            // up, which shows every country and refreshes in place.
            const target = resolveCountryId(input.countryId);
            if (!passportOpen && target !== id) router.push(`/country/${target}`);
          }}
        />
      )}

      {/* Log modal */}
      {logOpen && (
        <LogModal
          initialCountryId={inCatalog ? id : null}
          onClose={() => setLogOpen(false)}
          onSave={async (input, file) => {
            await addEntry(input, file);
            setLogOpen(false);
            // Logged under a different country? Follow the entry there.
            const target = resolveCountryId(input.countryId);
            if (target !== id) router.push(`/country/${target}`);
          }}
        />
      )}
    </div>
  );
}

function Missing({ title, note, onBack, onAdd }: { title: string; note: string; onBack: () => void; onAdd?: () => void }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "18vh 24px 0", textAlign: "center" }}>
      <div style={{ fontFamily: "Marcellus,serif", fontSize: 42, color: "var(--ink)" }}>{title}</div>
      <div style={{ fontFamily: "'EB Garamond',serif", fontStyle: "italic", fontSize: 17, color: "var(--ink-soft)", marginTop: 12 }}>{note}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 28 }}>
        <button onClick={onBack} style={{ background: "none", color: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: 2, padding: "9px 15px", cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase" }}>
          ← The world
        </button>
        {onAdd && (
          <button onClick={onAdd} style={{ background: "var(--sepia)", color: "var(--paper)", border: "1px solid var(--sepia)", borderRadius: 2, padding: "9px 15px", cursor: "pointer", fontFamily: "'Special Elite',monospace", fontSize: 10.5, letterSpacing: 1.5, textTransform: "uppercase" }}>
            ＋ Log an entry
          </button>
        )}
      </div>
    </div>
  );
}
