import { prisma } from "@/lib/db";

export type MacroSnapshotDisplay = {
  loaded: boolean;
  lastFetchedAt: string | null;
  source: string | null;
  observationCount: number;
};

/** Server-only read for UI (no client fetch). */
export async function getMacroSnapshotDisplay(): Promise<MacroSnapshotDisplay> {
  const meta = await prisma.macroSnapshotMeta.findFirst({ orderBy: { id: "desc" } });
  const count = await prisma.macroObservation.count();
  return {
    loaded: count > 0,
    lastFetchedAt: meta?.fetchedAt?.toISOString() ?? null,
    source: meta?.source ?? null,
    observationCount: count,
  };
}
