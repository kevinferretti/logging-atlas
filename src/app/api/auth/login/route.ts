import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

// A real cost-10 bcrypt hash of a throwaway value, compared against when the
// email is unknown so a failed login costs the same time whether or not the
// account exists — otherwise response timing leaks which emails are registered.
// Must be a valid hash (not a placeholder) or bcrypt returns early and the
// timing equalization is lost.
const DUMMY_HASH = "$2a$10$oOGwbl/dxvN7pyWio02Uk.AfyDnIKigO/4MxAHpYGk7r/ltlSEz9a";

export async function POST(req: Request) {
  // 10 attempts per 5 minutes per IP — enough for fat fingers, not brute force.
  const limit = rateLimit(`login:${clientIp(req)}`, 10, 5 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  const user = await prisma.user.findUnique({ where: { email } });
  // Always run a comparison so the timing doesn't reveal whether the email
  // exists. Same response whether the email is unknown or the password wrong.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : (await verifyPassword(password, DUMMY_HASH), false);
  if (!user || !ok) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
