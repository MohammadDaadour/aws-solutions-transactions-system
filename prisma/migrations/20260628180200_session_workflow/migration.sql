-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'CLOSING', 'CLOSED');

-- CreateEnum
CREATE TYPE "BalanceStatus" AS ENUM ('POSITIVE', 'NEGATIVE', 'ZERO');

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "opened_by" UUID NOT NULL,
    "closed_by" UUID,
    "notes" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_balances" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "currency" "Currency" NOT NULL,
    "balance" DECIMAL(18,4) NOT NULL,
    "balance_status" "BalanceStatus" NOT NULL,

    CONSTRAINT "session_balances_pkey" PRIMARY KEY ("id")
);

-- AddColumn (initially nullable)
ALTER TABLE "transactions" ADD COLUMN "session_id" UUID;
ALTER TABLE "user_balances" ADD COLUMN "session_id" UUID;

-- Create one CLOSED historical session (only if an Admin user exists — guards shadow DB replay)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE role = 'Admin' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO "sessions" ("id", "status", "opened_at", "closed_at", "opened_by", "closed_by", "notes")
    VALUES (
        '00000000-0000-0000-0000-000000000001'::UUID,
        'CLOSED',
        NOW() - INTERVAL '1 day',
        NOW(),
        admin_id,
        admin_id,
        'Historical transactions migration session'
    );

    -- Assign all existing transactions to the historical session
    UPDATE "transactions" SET "session_id" = '00000000-0000-0000-0000-000000000001'::UUID WHERE "session_id" IS NULL;

    -- Assign all existing user balances to the historical session
    UPDATE "user_balances" SET "session_id" = '00000000-0000-0000-0000-000000000001'::UUID WHERE "session_id" IS NULL;

    -- Generate SessionBalance snapshots for the historical session
    INSERT INTO "session_balances" ("id", "session_id", "user_id", "currency", "balance", "balance_status")
    SELECT
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000001'::UUID,
        "user_id",
        "currency",
        "balance",
        CASE
            WHEN "balance" > 0 THEN 'POSITIVE'::"BalanceStatus"
            WHEN "balance" < 0 THEN 'NEGATIVE'::"BalanceStatus"
            ELSE 'ZERO'::"BalanceStatus"
        END
    FROM "user_balances"
    WHERE "session_id" = '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;
END $$;

-- Create one OPEN session for future work (only if an Admin user exists)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE role = 'Admin' LIMIT 1;
  IF admin_id IS NOT NULL THEN
    INSERT INTO "sessions" ("id", "status", "opened_at", "opened_by", "notes")
    VALUES (
        gen_random_uuid(),
        'OPEN',
        NOW(),
        admin_id,
        'Active session started after migration'
    );
  END IF;
END $$;

-- Enforce NOT NULL on the columns now that existing records are populated
ALTER TABLE "transactions" ALTER COLUMN "session_id" SET NOT NULL;
ALTER TABLE "user_balances" ALTER COLUMN "session_id" SET NOT NULL;

-- Drop old unique constraint on user_balances (without session_id)
ALTER TABLE "user_balances" DROP CONSTRAINT IF EXISTS "user_balances_user_id_currency_key";

-- Create unique indexes
CREATE UNIQUE INDEX "user_balances_session_id_user_id_currency_key" ON "user_balances"("session_id", "user_id", "currency");
CREATE UNIQUE INDEX "session_balances_session_id_user_id_currency_key" ON "session_balances"("session_id", "user_id", "currency");

-- Add foreign key constraints
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "session_balances" ADD CONSTRAINT "session_balances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "session_balances" ADD CONSTRAINT "session_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_balances" ADD CONSTRAINT "user_balances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
