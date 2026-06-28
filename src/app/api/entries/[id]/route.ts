import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isValidKey, uploadPath } from "@/lib/uploads";

// DELETE /api/entries/[id] — remove one of the signed-in user's entries.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Look up the owned entry first so we can clean up its attachment.
  const entry = await prisma.entry.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, fileKey: true },
  });
  if (!entry) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  await prisma.entry.delete({ where: { id: entry.id } });

  // Best-effort removal of the uploaded file.
  if (entry.fileKey && isValidKey(entry.fileKey)) {
    await unlink(uploadPath(entry.fileKey)).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
