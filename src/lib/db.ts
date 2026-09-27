import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

// Explicitly declare the type on globalThis to prevent any evaluation overlap
const prismaClientSingleton = () => {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({
        adapter,
        log: ["error"],
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

// Use the existing instance if it exists, otherwise initialize clean
export const db = globalForPrisma.prisma ?? prismaClientSingleton();

// Ensure the global object retains the reference in development across hot-reloads
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
}
