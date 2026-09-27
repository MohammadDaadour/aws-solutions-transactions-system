import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(db as any),
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                // 1. Fetch user from your DB
                const user = await db.user.findUnique({
                    where: { username: credentials.username as string },
                });

                // 2. Validate existence and password
                if (!user || !user.isActive) return null;

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValid) return null;

                // 3. Return user data to pass to the JWT token
                return {
                    id: user.id,
                    name: user.username,
                    username: user.username,
                    role: user.role,
                    type: user.type,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.type = user.type;
                token.username = user.username;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.type = token.type as string;
                session.user.username = token.username as string || token.name as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
});