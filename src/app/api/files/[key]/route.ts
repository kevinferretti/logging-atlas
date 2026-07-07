import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inlineFileType } from "@/lib/filetypes";
import { isValidKey, uploadPath } from "@/lib/uploads";

// Header values must be Latin-1 — a raw non-ASCII filename makes Response()
// throw. Send a quote-safe ASCII fallback plus the RFC 5987 filename* form
// so browsers still restore the real name.
function contentDisposition(disp: "inline" | "attachment", name: string): string {
  const ascii = name.replace(/[\\"]/g, "_").replace(/[^\x20-\x7e]+/g, "_") || "file";
  const utf8 = encodeURIComponent(name).replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
  return `${disp}; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

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

  // The stored type is whatever the uploader's browser claimed. Only image and
  // PDF types render inline; the rest download as opaque bytes so an uploaded
  // HTML or SVG file can never execute on this origin.
  const inline = inlineFileType(entry.fileType);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": inline ?? "application/octet-stream",
      "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", entry.fileName || "file"),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
