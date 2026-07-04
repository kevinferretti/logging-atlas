import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isCategoryKey } from "@/lib/categories";
import { catalogCountry, resolveCountryId } from "@/lib/countries";
import { MAX_UPLOAD_BYTES, normalizeLink, saveUpload } from "@/lib/uploads";
import type { CategoryKey, Entry } from "@/lib/types";

const SELECT = {
  id: true,
  countryId: true,
  category: true,
  wishlist: true,
  title: true,
  by: true,
  note: true,
  link: true,
  year: true,
  fileName: true,
  fileKey: true,
  fileType: true,
} as const;

type Row = {
  id: string;
  countryId: string;
  category: string;
  wishlist: boolean;
  title: string;
  by: string;
  note: string;
  link: string;
  year: number;
  fileName: string | null;
  fileKey: string | null;
  fileType: string | null;
};

function toEntry(row: Row): Entry {
  return { ...row, category: row.category as CategoryKey };
}

// GET /api/entries — all entries for the signed-in user.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const rows = await prisma.entry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: SELECT,
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

  // Normalize legacy ids at write time so the database only accumulates
  // current catalog ids.
  const countryId = resolveCountryId(String(form.get("countryId") ?? ""));
  const category = String(form.get("category") ?? "");
  const wishlist = form.get("wishlist") === "1";
  const title = String(form.get("title") ?? "").trim();
  const link = normalizeLink(String(form.get("link") ?? ""));

  if (!catalogCountry(countryId)) {
    return NextResponse.json({ error: "Unknown country." }, { status: 400 });
  }
  if (!isCategoryKey(category)) {
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  let year = Number(form.get("year"));
  if (!Number.isInteger(year) || year < 1900 || year > currentYear + 1) {
    year = currentYear;
  }

  // Optional attachment — only stored for recipes for now.
  let fileFields: { fileName: string; fileKey: string; fileType: string } | undefined;
  const file = form.get("file");
  if (category === "recipe" && file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)." }, { status: 400 });
    }
    fileFields = await saveUpload(file);
  }

  const row = await prisma.entry.create({
    data: {
      userId: user.id,
      countryId,
      category,
      wishlist,
      title: title.slice(0, 200),
      link,
      year,
      ...fileFields,
    },
    select: SELECT,
  });

  return NextResponse.json({ entry: toEntry(row) }, { status: 201 });
}
