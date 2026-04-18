-- Baseline for PostgreSQL (Neon / Vercel). Replaces prior SQLite migrations.

-- CreateTable
CREATE TABLE "WorkflowSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parsedGrid" TEXT,
    "parseMeta" TEXT,
    "mapping" TEXT,
    "answers" TEXT,

    CONSTRAINT "WorkflowSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MacroSeries" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ABS',

    CONSTRAINT "MacroSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MacroObservation" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MacroObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MacroSnapshotMeta" (
    "id" SERIAL NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "MacroSnapshotMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MacroObservation_seriesId_period_key" ON "MacroObservation"("seriesId", "period");

-- AddForeignKey
ALTER TABLE "MacroObservation" ADD CONSTRAINT "MacroObservation_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "MacroSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
