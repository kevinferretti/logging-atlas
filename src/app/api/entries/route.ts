import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { ENTRY_SELECT, localDateString, parseEntryForm, toEntry } from "@/lib/entryApi";
import { MAX_UPLOAD_BYTES, saveUpload } from "@/lib/uploads";

// GET /api/entries — all entries for the signed-in user.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rows = await prisma.entry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: ENTRY_SELECT,
  });
  return NextResponse.json({ entries: rows.map(toEntry) });
}

// POST /api/entries — log a new entry (multipart/form-data). A file may be
// attached for recipes; it is ignored for other categories.
export async function POST(req: Request) {
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

  // `year` is derived from the date so year-based grouping and stamps always
  // agree with the picked date.
  const date = data.date ?? localDateString(new Date());
  const year = Number(date.slice(0, 4));

  // Optional attachment — only stored for recipes for now.
  let fileFields: { fileName: string; fileKey: string; fileType: string } | undefined;
  const file = form.get("file");
  if (data.category === "recipe" && file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
    }
    fileFields = await saveUpload(file);
  }

  const row = await prisma.entry.create({
    data: {
      userId: user.id,
      countryId: data.countryId,
      category: data.category,
      wishlist: data.wishlist,
      title: data.title,
      by: data.by,
      note: data.note,
      link: data.link,
      date,
      year,
      ...fileFields,
    },
    select: ENTRY_SELECT,
  });

  return NextResponse.json({ entry: toEntry(row) }, { status: 201 });
}
