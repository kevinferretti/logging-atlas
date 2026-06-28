import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assembleCountries } from "@/lib/logbook";
import Logbook from "@/components/Logbook";
import type { CategoryKey, Entry } from "@/lib/types";

export default async function LogbookPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await prisma.entry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, countryId: true, category: true, title: true, by: true, note: true, year: true, fileName: true, fileKey: true, fileType: true },
  });
  const entries: Entry[] = rows.map((r) => ({ ...r, category: r.category as CategoryKey }));

  // Order pages so the passport "fills up": fewest entries first.
  const countries = assembleCountries(entries).sort((a, b) => a.entries.length - b.entries.length);

  return <Logbook countries={countries} />;
}
