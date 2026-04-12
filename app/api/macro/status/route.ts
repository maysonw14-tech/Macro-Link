import { NextResponse } from "next/server";
import { getMacroSnapshotDisplay } from "@/lib/macro/getMacroSnapshotDisplay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const body = await getMacroSnapshotDisplay();
  return NextResponse.json(body);
}
