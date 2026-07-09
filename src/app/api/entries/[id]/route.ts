import { unlink } from "fs/promises";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ENTRY_SELECT, parseEntryForm, toEntry } from "@/lib/entryApi";
import { MAX_UPLOAD_BYTES, isValidKey, saveUpload, uploadPath } from "@/lib/uploads";

// PATCH /api/entries/[id] — edit one of the signed-in user's entries. Takes
// the same multipart form as POST /api/entries, plus removeFile=1 to drop an
// existing attachment without replacing it.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = parseEntryForm(form);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { data } = parsed;

  const existing = await prisma.entry.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, date: true, year: true, fileKey: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  }

  // No valid date in the form keeps the stored one — entries that predate the
  // date field stay undated instead of silently picking up today.
  const date = data.date ?? existing.date;
  const year = date ? Number(date.slice(0, 4)) : existing.year;

  // Attachment: replaced by a new upload, dropped on request, and always
  // dropped when the entry stops being a recipe (files are recipe-only).
  let filePatch: { fileName: string | null; fileKey: string | null; fileType: string | null } | undefined;
  let staleKey: string | null = null;
  const file = form.get("file");
  const clearedFile = { fileName: null, fileKey: null, fileType: null };
  if (data.category !== "recipe") {
    if (existing.fileKey) {
      filePatch = clearedFile;
      staleKey = existing.fileKey;
    }
  } else if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
    }
    filePatch = await saveUpload(file);
    staleKey = existing.fileKey;
  } else if (form.get("removeFile") === "1" && existing.fileKey) {
    filePatch = clearedFile;
    staleKey = existing.fileKey;
  }

  const row = await prisma.entry.update({
    where: { id: existing.id },
    data: {
      countryId: data.countryId,
      category: data.category,
      wishlist: data.wishlist,
      title: data.title,
      by: data.by,
      note: data.note,
      link: data.link,
      date,
      year,
      rating: data.rating,
      ...filePatch,
    },
    select: ENTRY_SELECT,
  });

  // Best-effort removal of the replaced/dropped file.
  if (staleKey && isValidKey(staleKey)) {
    await unlink(uploadPath(staleKey)).catch(() => {});
  }

  return NextResponse.json({ entry: toEntry(row) });
}

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
