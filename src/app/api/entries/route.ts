import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isCategoryKey } from "@/lib/categories";
import { catalogCountry } from "@/lib/countries";
import type { CategoryKey, Entry } from "@/lib/types";

const SELECT = {
  id: true,
  countryId: true,
  category: true,
  title: true,
  by: true,
  note: true,
  year: true,
} as const;

type Row = { id: string; countryId: string; category: string; title: string; by: string; note: string; year: number };

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

// POST /api/entries — log a new entry for the signed-in user.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: {
    countryId?: string;
    category?: string;
    title?: string;
    by?: string;
    note?: string;
    year?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const countryId = String(body.countryId ?? "");
  const category = String(body.category ?? "");
  const title = (body.title ?? "").trim();

  if (!catalogCountry(countryId)) {
    return NextResponse.json({ error: "Unknown country." }, { status: 400 });
  }
  if (!isCategoryKey(category)) {
    return NextResponse.json({ error: "Unknown category." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  const currentYear = new Date().getFullYear();
  let year = Number(body.year);
  if (!Number.isInteger(year) || year < 1900 || year > currentYear + 1) {
    year = currentYear;
  }

  const row = await prisma.entry.create({
    data: {
      userId: user.id,
      countryId,
      category,
      title: title.slice(0, 200),
      by: (body.by ?? "").trim().slice(0, 200),
      note: (body.note ?? "").trim().slice(0, 1000),
      year,
    },
    select: SELECT,
  });

  return NextResponse.json({ entry: toEntry(row) }, { status: 201 });
}
