import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { coercePaletteName } from "@/lib/palettes";

// POST /api/preferences — persist the signed-in user's theme choice.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { theme?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const theme = coercePaletteName(body.theme);
  await prisma.user.update({ where: { id: user.id }, data: { theme } });
  return NextResponse.json({ theme });
}
