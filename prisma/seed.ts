import { Prisma, Role, UserType, Currency, TransactionType } from "../src/generated/prisma/client";
import * as bcrypt from "bcryptjs";
import { db as prisma } from "../src/lib/db";

async function main() {
    // await prisma.auditLog.deleteMany();
    // await prisma.transaction.deleteMany();
    // await prisma.userBalance.deleteMany();
    // await prisma.user.deleteMany();

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash("password123", salt);

    const systemAdmin = await prisma.user.create({
        data: {
            username: "admin",
            password: defaultPasswordHash,
            role: Role.Admin,
            type: UserType.sender,
            phone: "+201000000001",
        },
    });

    const initialUsdAmount = new Prisma.Decimal(10000.0000);

}

main()
    .catch((e) => {
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });