-- Create trade audit log table for capturing broker actions
CREATE TABLE "trade_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "env" "BrokerEnv" NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "error" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trade_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "trade_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "trade_audit_logs_userId_createdAt_idx" ON "trade_audit_logs"("userId", "createdAt");
