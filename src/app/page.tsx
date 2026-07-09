import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ENTRY_SELECT, toEntry } from "@/lib/entryApi";
import AtlasApp from "@/components/AtlasApp";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rows = await prisma.entry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: ENTRY_SELECT,
  });

  return <AtlasApp user={user} initialEntries={rows.map(toEntry)} />;
}
