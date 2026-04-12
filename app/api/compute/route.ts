import { NextResponse } from "next/server";
import { runComputeForSessionId } from "@/lib/computeRun";
import { getSessionCookieId } from "@/lib/sessionServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const id = await getSessionCookieId();
  if (!id) return NextResponse.json({ error: "No session" }, { status: 401 });
  try {
    const out = await runComputeForSessionId(id);
    return NextResponse.json({
      overlay: out.overlay,
      narrative: out.narrative,
      answers: out.answers,
      macroFetchedAt: out.macroFetchedAt?.toISOString() ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Compute failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
