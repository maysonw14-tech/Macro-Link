import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { suggestMappings } from "@/lib/mapping/suggestMappings";
import { reparseWithLayout } from "@/lib/parseSpreadsheet";
import { getSessionCookieId } from "@/lib/sessionServer";
import type { LayoutOverrides } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sessionId = await getSessionCookieId();
  if (!sessionId) return NextResponse.json({ error: "No session" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const layoutRaw = form.get("layout");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file — re-select the same spreadsheet." }, { status: 400 });
  }
  if (!layoutRaw || typeof layoutRaw !== "string") {
    return NextResponse.json({ error: "Missing layout JSON" }, { status: 400 });
  }

  let layout: LayoutOverrides;
  try {
    layout = JSON.parse(layoutRaw) as LayoutOverrides;
  } catch {
    return NextResponse.json({ error: "Invalid layout JSON" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let pkg: ReturnType<typeof reparseWithLayout>;
  try {
    pkg = reparseWithLayout(buf, layout);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reparse error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const mapping = suggestMappings(pkg.grid);

  await prisma.workflowSession.update({
    where: { id: sessionId },
    data: {
      parsedGrid: JSON.stringify(pkg.grid),
      parseMeta: JSON.stringify(pkg.meta),
      mapping: JSON.stringify(mapping),
    },
  });

  return NextResponse.json({
    ok: true,
    rowCount: pkg.grid.rowLabels.length,
    periodCount: pkg.grid.periodLabels.length,
    confidence: pkg.meta.confidence,
    warnings: pkg.meta.warnings,
    parseMeta: pkg.meta,
  });
}
