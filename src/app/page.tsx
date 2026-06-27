import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AtlasApp from "@/components/AtlasApp";
import type { CategoryKey, Entry } from "@/lib/types";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await prisma.entry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, countryId: true, category: true, title: true, by: true, note: true, year: true },
  });
  const entries: Entry[] = rows.map((r) => ({ ...r, category: r.category as CategoryKey }));

  return <AtlasApp user={user} initialEntries={entries} />;
}
