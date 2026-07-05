import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CountryPage from "@/components/CountryPage";
import type { CategoryKey, Entry } from "@/lib/types";

// /country/[id] — details page for one country. `?v=1..5` picks which of the
// five candidate page styles renders (temporary, while a favourite is chosen).
export default async function CountryDetails({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { v?: string };
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // All entries, not just this country's — the passport book flips through
  // every logged country, so it needs the full set.
  const rows = await prisma.entry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, countryId: true, category: true, wishlist: true, title: true, by: true, note: true, link: true, date: true, year: true, fileName: true, fileKey: true, fileType: true },
  });
  const entries: Entry[] = rows.map((r) => ({ ...r, category: r.category as CategoryKey }));

  const v = Number(searchParams.v);
  const initialVariant = Number.isInteger(v) && v >= 1 && v <= 5 ? v : 1;

  return <CountryPage user={user} initialEntries={entries} countryId={params.id} initialVariant={initialVariant} />;
}
