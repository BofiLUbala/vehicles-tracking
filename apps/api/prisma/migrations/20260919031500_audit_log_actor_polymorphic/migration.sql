-- AuditLog.actorId is polymorphic: it holds either a User id (admin) or a Driver id
-- (chauffeur). The users-only foreign key contradicts that design and makes every
-- driver-attributed audit write (login/signup) fail, so it is removed. actorId keeps
-- its index; actor display names are resolved by AuditService from both tables.
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actorId_fkey";
