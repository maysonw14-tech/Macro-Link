-- CreateTable
CREATE TABLE "WorkflowSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "parsedGrid" TEXT,
    "mapping" TEXT,
    "answers" TEXT
);

-- CreateTable
CREATE TABLE "MacroSeries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ABS'
);

-- CreateTable
CREATE TABLE "MacroObservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seriesId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" REAL NOT NULL,
    CONSTRAINT "MacroObservation_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "MacroSeries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MacroSnapshotMeta" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "notes" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "MacroObservation_seriesId_period_key" ON "MacroObservation"("seriesId", "period");
