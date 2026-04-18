import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { suggestMappings } from "@/lib/mapping/suggestMappings";
import { parseSpreadsheetBuffer } from "@/lib/parseSpreadsheet";
import { attachSessionCookie } from "@/lib/sessionServer";
import type { ParsedPackage, RowMapping, SessionAnswers } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const defaultAnswers: SessionAnswers = {
  currency: "AUD",
  fyStartMonth: 7,
  baseIncludesInflation: false,
  industrySegment: "OTHER_RETAIL",
};

const LAYOUT_REVIEW_THRESHOLD = 0.55;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  let pkg: ParsedPackage;
  try {
    pkg = parseSpreadsheetBuffer(buf, file.name);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Parse error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { grid, meta } = pkg;
  const mapping: RowMapping[] = suggestMappings(grid);

  let session;
  try {
    session = await prisma.workflowSession.create({
      data: {
        parsedGrid: JSON.stringify(grid),
        parseMeta: JSON.stringify(meta),
        mapping: JSON.stringify(mapping),
        answers: JSON.stringify(defaultAnswers),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    return NextResponse.json(
      {
        error: msg,
        hint: "If tables are missing, set DATABASE_URL to Postgres and run: npx prisma migrate deploy",
      },
      { status: 500 },
    );
  }

  const showLayoutReview = meta.confidence < LAYOUT_REVIEW_THRESHOLD;

  const res = NextResponse.json({
    ok: true,
    sessionId: session.id,
    rowCount: grid.rowLabels.length,
    periodCount: grid.periodLabels.length,
    confidence: meta.confidence,
    warnings: meta.warnings,
    showLayoutReview,
    parseMeta: meta,
  });
  attachSessionCookie(res, session.id);
  return res;
}
