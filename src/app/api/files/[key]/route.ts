import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidKey, uploadPath } from "@/lib/uploads";

// GET /api/files/[key] — stream an uploaded file, but only to the user who owns
// the entry it's attached to.
export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const key = params.key;
  if (!isValidKey(key)) return NextResponse.json({ error: "Bad key." }, { status: 400 });

  const entry = await prisma.entry.findFirst({
    where: { fileKey: key, userId: user.id },
    select: { fileName: true, fileType: true },
  });
  if (!entry) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(uploadPath(key));
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const safeName = (entry.fileName || "file").replace(/[\r\n"]/g, "");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": entry.fileType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${safeName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
