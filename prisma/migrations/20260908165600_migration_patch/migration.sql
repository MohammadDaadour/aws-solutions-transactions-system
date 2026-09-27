-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_session_id_fkey";

-- AlterTable
ALTER TABLE "transactions" ALTER COLUMN "session_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "user_balances" ALTER COLUMN "session_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "deleted_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" UUID,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "currency" "Currency" NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" UUID NOT NULL,
    "purge_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deleted_transactions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deleted_transactions" ADD CONSTRAINT "deleted_transactions_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
