-- Liens chauffeur envoyés par e-mail (jetons à usage unique, seul leur hash est stocké) :
-- invitation (activation du compte) et réinitialisation du mot de passe.
ALTER TABLE "drivers" ADD COLUMN "invitationTokenHash" TEXT;
ALTER TABLE "drivers" ADD COLUMN "invitationExpiresAt" TIMESTAMP(3);
ALTER TABLE "drivers" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "drivers" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "drivers_invitationTokenHash_key" ON "drivers"("invitationTokenHash");
CREATE UNIQUE INDEX "drivers_passwordResetTokenHash_key" ON "drivers"("passwordResetTokenHash");
