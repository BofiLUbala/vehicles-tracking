-- AlterTable
ALTER TABLE "fuel_records" ADD COLUMN     "clientEventId" TEXT;

-- CreateIndex
CREATE INDEX "alerts_type_idx" ON "alerts"("type");

-- CreateIndex
CREATE INDEX "alerts_level_idx" ON "alerts"("level");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_status_createdAt_idx" ON "alerts"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_records_clientEventId_key" ON "fuel_records"("clientEventId");
