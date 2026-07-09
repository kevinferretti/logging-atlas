import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ENTRY_SELECT, toEntry } from "@/lib/entryApi";
import CountryPage from "@/components/CountryPage";

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
    select: ENTRY_SELECT,
  });

  const v = Number(searchParams.v);
  const initialVariant = Number.isInteger(v) && v >= 1 && v <= 5 ? v : 1;

  return <CountryPage user={user} initialEntries={rows.map(toEntry)} countryId={params.id} initialVariant={initialVariant} />;
}
