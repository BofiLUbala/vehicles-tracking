-- Inscription chauffeur par e-mail : e-mail unique facultatif, téléphone devenu facultatif.
-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "email" TEXT,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");
