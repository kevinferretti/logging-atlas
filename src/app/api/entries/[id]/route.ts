import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// DELETE /api/entries/[id] — remove one of the signed-in user's entries.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Scope the delete to the owner so users can't remove others' entries.
  const result = await prisma.entry.deleteMany({
    where: { id: params.id, userId: user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
