import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

// Same bounds as registration — bcrypt truncates past 72 bytes.
const MAX_PASSWORD = 72;

// POST /api/auth/reset — redeem a one-time reset token for a new password.
// The token is single-use (cleared on success) and expires an hour after it
// was issued by /api/auth/forgot.
export async function POST(req: Request) {
  const limit = rateLimit(`reset:${clientIp(req)}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let body: { token?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = body.token ?? "";
  const password = body.password ?? "";
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    return NextResponse.json({ error: "That reset link is invalid or has expired." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  if (password.length > MAX_PASSWORD) {
    return NextResponse.json({ error: `Password must be at most ${MAX_PASSWORD} characters.` }, { status: 400 });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: tokenHash, resetTokenExpires: { gt: new Date() } },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "That reset link is invalid or has expired." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      resetTokenHash: null,
      resetTokenExpires: null,
    },
  });

  // Straight in — they just proved control of the reset link.
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
