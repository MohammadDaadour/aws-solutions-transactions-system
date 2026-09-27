-- CreateEnum
CREATE TYPE "TransferCurrency" AS ENUM ('VODAFONE_CASH', 'BANK_TRANSFER', 'CASH_EGP', 'AED', 'KWD', 'SWIFT_CHINA', 'SWIFT_KOREA', 'SWIFT_AUSTRALIA');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'TAKEN', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "transfer_orders" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "number" TEXT NOT NULL,
    "currency" "TransferCurrency" NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 0,
    "receiver_id" UUID NOT NULL,
    "sender_id" UUID,
    "taken_at" TIMESTAMP(3),
    "done_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_orders_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_orders" ADD CONSTRAINT "transfer_orders_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
