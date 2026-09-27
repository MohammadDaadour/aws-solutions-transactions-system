import * as dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

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
        await pool.end();
    });
