-- CreateEnum
CREATE TYPE "ZoneKind" AS ENUM ('ALLOWED', 'FORBIDDEN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'OUT_OF_ZONE';
ALTER TYPE "AlertType" ADD VALUE 'INCONSISTENT_TIME';

-- DropIndex
DROP INDEX "gps_positions_geom_gist_idx";

-- DropIndex
DROP INDEX "locations_geom_gist_idx";

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ZoneKind" NOT NULL DEFAULT 'ALLOWED',
    "coordinates" JSONB NOT NULL,
    "geom" geometry(Polygon, 4326),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zones_organizationId_idx" ON "zones"("organizationId");

-- CreateIndex
CREATE INDEX "zones_organizationId_isActive_idx" ON "zones"("organizationId", "isActive");

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
