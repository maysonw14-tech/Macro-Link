import { NextResponse } from "next/server";
import { refreshMacroData } from "@/lib/macro/refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const r = await refreshMacroData();
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Refresh failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
