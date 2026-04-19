import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { refreshMacroData } from "@/lib/macro/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const expected = process.env.MACRO_REFRESH_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "MACRO_REFRESH_SECRET is not set on the server. Add it in Vercel Environment Variables (or .env locally)." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send JSON: { "secret": "…" }' }, { status: 400 });
  }

  const provided =
    typeof body === "object" && body !== null && "secret" in body && typeof (body as { secret: unknown }).secret === "string"
      ? (body as { secret: string }).secret
      : "";

  if (!secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const r = await refreshMacroData();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refresh failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
