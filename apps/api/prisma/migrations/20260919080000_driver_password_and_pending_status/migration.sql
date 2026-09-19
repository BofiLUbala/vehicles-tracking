-- Connexion chauffeur par mot de passe (fin de l'OTP à chaque connexion) :
-- 1. `drivers.passwordHash` (argon2, nullable : les comptes existants le définissent via « mot de passe oublié »).
-- 2. `DriverStatus.PENDING_VERIFICATION` (compte créé mais non vérifié : ne peut pas se connecter).
-- L'ajout d'une valeur d'enum via `ALTER TYPE ... ADD VALUE` est interdit dans un bloc
-- transactionnel, donc l'enum est reconstruit (approche transaction-safe).
ALTER TABLE "drivers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "drivers" ADD COLUMN "passwordHash" TEXT;
CREATE TYPE "DriverStatus_new" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'UNAVAILABLE', 'DISABLED');
ALTER TABLE "drivers" ALTER COLUMN "status" TYPE "DriverStatus_new" USING "status"::text::"DriverStatus_new";
ALTER TYPE "DriverStatus" RENAME TO "DriverStatus_old";
ALTER TYPE "DriverStatus_new" RENAME TO "DriverStatus";
DROP TYPE "DriverStatus_old";
ALTER TABLE "drivers" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
