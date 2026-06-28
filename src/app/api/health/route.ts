import { NextResponse } from "next/server";

// Liveness probe used by the container healthcheck and the deploy workflow.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok" });
}
