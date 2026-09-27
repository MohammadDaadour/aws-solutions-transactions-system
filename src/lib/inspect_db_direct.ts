import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "../generated/prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new PrismaClient({} as any);

async function main() {
    const users = await db.user.findMany();
    console.log("Users:", users.map(u => ({ id: u.id, username: u.username, role: u.role })));
    const txCount = await db.transaction.count();
    console.log("Total Transactions:", txCount);
}

main()
    .catch(console.error)
    .finally(async () => {
        await db.$disconnect();
    });
