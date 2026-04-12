import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionCookieId } from "@/lib/sessionServer";
import { normalizeSessionAnswers, isRetailIndustrySegment } from "@/lib/retailIndustrySegments";
import type { ParseMeta, RowMapping, SessionAnswers } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const id = await getSessionCookieId();
  if (!id) return NextResponse.json({ error: "No session" }, { status: 401 });
  const s = await prisma.workflowSession.findUnique({ where: { id } });
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({
    id: s.id,
    parsedGrid: s.parsedGrid ? JSON.parse(s.parsedGrid) : null,
    parseMeta: s.parseMeta ? (JSON.parse(s.parseMeta) as ParseMeta) : null,
    mapping: s.mapping ? JSON.parse(s.mapping) : null,
    answers: s.answers ? normalizeSessionAnswers(JSON.parse(s.answers)) : null,
  });
}

export async function PATCH(req: Request) {
  const id = await getSessionCookieId();
  if (!id) return NextResponse.json({ error: "No session" }, { status: 401 });
  const body = (await req.json()) as { answers?: SessionAnswers; mapping?: RowMapping[] };
  const existing = await prisma.workflowSession.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (body.answers) {
    const a = body.answers as Partial<SessionAnswers> & { industrySegment?: string };
    if (
      a.industrySegment !== undefined &&
      typeof a.industrySegment === "string" &&
      !isRetailIndustrySegment(a.industrySegment)
    ) {
      return NextResponse.json({ error: "Invalid industrySegment." }, { status: 400 });
    }
  }

  const existingAnswers = existing.answers ? JSON.parse(existing.answers) : {};
  const answers = body.answers
    ? normalizeSessionAnswers({ ...existingAnswers, ...body.answers })
    : null;
  const mapping = body.mapping
    ? body.mapping
    : existing.mapping
      ? (JSON.parse(existing.mapping) as RowMapping[])
      : null;

  await prisma.workflowSession.update({
    where: { id },
    data: {
      ...(answers ? { answers: JSON.stringify(answers) } : {}),
      ...(mapping ? { mapping: JSON.stringify(mapping) } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
