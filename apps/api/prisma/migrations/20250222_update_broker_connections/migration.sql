-- Alter broker_connections structure for per-user Alpaca connections
DROP INDEX IF EXISTS "broker_connections_userId_provider_env_idx";
DROP INDEX IF EXISTS "broker_connections_userId_provider_env_key";

ALTER TABLE "broker_connections" RENAME COLUMN "provider" TO "broker";
ALTER TABLE "broker_connections" RENAME COLUMN "env" TO "mode";
ALTER TABLE "broker_connections" RENAME COLUMN "accessTokenEnc" TO "accessToken";
ALTER TABLE "broker_connections" RENAME COLUMN "refreshTokenEnc" TO "refreshToken";

ALTER TABLE "broker_connections" ALTER COLUMN "mode" TYPE TEXT USING "mode"::TEXT;
ALTER TABLE "broker_connections" ALTER COLUMN "refreshToken" DROP NOT NULL;
ALTER TABLE "broker_connections" ALTER COLUMN "expiresAt" DROP NOT NULL;

ALTER TABLE "broker_connections" ADD COLUMN     "scope" TEXT;
UPDATE "broker_connections" SET "scope" = array_to_string("scopes", ' ') WHERE "scopes" IS NOT NULL;
ALTER TABLE "broker_connections" DROP COLUMN "scopes";

CREATE INDEX "broker_connections_userId_broker_mode_idx" ON "broker_connections"("userId", "broker", "mode");
