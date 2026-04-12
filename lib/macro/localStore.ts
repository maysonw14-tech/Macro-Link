import { prisma } from "../db";
import { ALL_DRIVER_IDS, type MacroDriverId } from "./registry";
import { alignLevelsToPeriodsWithForwardMom, type MacroAligned } from "./alignment";

export async function getLatestMacroSnapshotMeta() {
  return prisma.macroSnapshotMeta.findFirst({ orderBy: { id: "desc" } });
}

export async function readAlignedMacro(
  periodKeys: string[],
): Promise<{ aligned: MacroAligned; fetchedAt: Date | null }> {
  const meta = await getLatestMacroSnapshotMeta();
  const aligned = {} as MacroAligned;
  for (const id of ALL_DRIVER_IDS) {
    const obs = await prisma.macroObservation.findMany({
      where: { seriesId: id },
      orderBy: { period: "asc" },
    });
    const pairs = obs.map((o) => ({ period: o.period, value: o.value }));
    aligned[id as MacroDriverId] = alignLevelsToPeriodsWithForwardMom(periodKeys, pairs);
  }
  return { aligned, fetchedAt: meta?.fetchedAt ?? null };
}

export async function upsertMacroSeries(series: { id: string; label: string; source: string }[]) {
  for (const s of series) {
    await prisma.macroSeries.upsert({
      where: { id: s.id },
      create: s,
      update: { label: s.label, source: s.source },
    });
  }
}

export async function replaceObservations(seriesId: string, obs: { period: string; value: number }[]) {
  await prisma.macroObservation.deleteMany({ where: { seriesId } });
  if (obs.length === 0) return;
  await prisma.macroObservation.createMany({
    data: obs.map((o) => ({ seriesId, period: o.period, value: o.value })),
  });
}

export async function writeSnapshotMeta(source: string, notes?: string) {
  await prisma.macroSnapshotMeta.create({
    data: { source, notes: notes ?? null },
  });
}
