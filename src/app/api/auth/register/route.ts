import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

// RFC 5321 caps an address at 254 chars; bcrypt only hashes the first 72 bytes
// of a password, so anything longer is silently truncated — reject it instead.
const MAX_EMAIL = 254;
const MAX_PASSWORD = 72;
const MAX_NAME = 80;

export async function POST(req: Request) {
  // 5 new accounts per hour per IP — stops mass signup without hurting a
  // household sharing an address.
  const limit = rateLimit(`register:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const name = (body.name ?? "").trim().slice(0, MAX_NAME);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > MAX_EMAIL) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (password.length > MAX_PASSWORD) {
    return NextResponse.json({ error: `Password must be at most ${MAX_PASSWORD} characters.` }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
  }

  let user;
  try {
    user = await prisma.user.create({
      data: { email, name: name || null, passwordHash: await hashPassword(password) },
      select: { id: true, email: true, name: true },
    });
  } catch (e) {
    // Two concurrent registers for the same email race past the check above;
    // the unique constraint (P2002) is the real guard. Report it as a conflict
    // rather than a 500.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }
    throw e;
  }

  await createSession(user.id);
  return NextResponse.json({ user }, { status: 201 });
}
