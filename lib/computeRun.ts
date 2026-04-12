import { prisma } from "@/lib/db";
import { buildReportNarrative } from "@/lib/model/buildReportNarrative";
import { applyMacroOverlay } from "@/lib/model/applyMacroOverlay";
import { stripAggregatePeriodColumns } from "@/lib/model/stripAggregatePeriodColumns";
import { readAlignedMacro } from "@/lib/macro/localStore";
import { normalizePeriodLabels } from "@/lib/periods";
import { normalizeSessionAnswers } from "@/lib/retailIndustrySegments";
import type { ParsedGrid, RowMapping, SessionAnswers } from "@/lib/types";

export async function runComputeForSessionId(sessionId: string) {
  const session = await prisma.workflowSession.findUnique({ where: { id: sessionId } });
  if (!session?.parsedGrid || !session.mapping || !session.answers) {
    throw new Error("Session incomplete");
  }
  const rawGrid = JSON.parse(session.parsedGrid) as ParsedGrid;
  const grid = stripAggregatePeriodColumns(rawGrid);
  const mapping = JSON.parse(session.mapping) as RowMapping[];
  const answers = normalizeSessionAnswers(JSON.parse(session.answers));

  const periodKeys = normalizePeriodLabels(grid.periodLabels);
  const { aligned, fetchedAt } = await readAlignedMacro(periodKeys);
  const meta = await prisma.macroSnapshotMeta.findFirst({ orderBy: { id: "desc" } });

  const overlay = applyMacroOverlay({
    grid,
    mapping,
    aligned,
    answers,
    macroSnapshotIso: fetchedAt ? fetchedAt.toISOString() : null,
  });

  const narrative = buildReportNarrative({
    overlay,
    mapping,
    grid,
    answers,
    macroFetchedAt: meta?.fetchedAt ?? fetchedAt,
  });

  return { grid, mapping, answers, overlay, narrative, macroFetchedAt: meta?.fetchedAt ?? fetchedAt };
}
