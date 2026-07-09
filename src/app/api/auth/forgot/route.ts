import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rateLimit";

/**
 * Base URL of the logged reset link. The configured APP_URL wins: the header
 * fallback (x-forwarded-host / host) is client-controlled, and a forged Host
 * header would poison the logged link with an attacker's domain — anyone the
 * operator forwards it to would hand their token to that domain.
 */
function linkBase(req: Request): string {
  const configured = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// POST /api/auth/forgot — issue a one-time password-reset link. The atlas
// sends no email: the link is written to the server log for the operator to
// pass along (or fish out for themselves). The response is identical whether
// or not the address has an account, so it can't be used to probe emails.
export async function POST(req: Request) {
  // 5 requests per hour per IP — a reset is a rare event, log spam is not.
  const limit = rateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    // Only the hash is stored — a database leak alone can't redeem the link.
    const token = randomBytes(32).toString("base64url");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetTokenHash: createHash("sha256").update(token).digest("hex"),
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    console.log(`[password-reset] ${email} → ${linkBase(req)}/reset/${token} (valid 1 hour)`);
  }

  return NextResponse.json({ ok: true });
}
