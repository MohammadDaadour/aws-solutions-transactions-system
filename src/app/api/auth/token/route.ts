import { auth } from "../../../../auth";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/token
 *
 * Returns a standard JWT so the browser can pass it to the
 * Socket.IO handshake auth param. Only available to authenticated users.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  // Sign a standard JWT that the ws-server can verify with jose.jwtVerify
  const encodedSecret = new TextEncoder().encode(secret);
  const token = await new SignJWT({
    id: session.user.id,
    type: session.user.type,
    role: session.user.role,
    username: session.user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(encodedSecret);

  return Response.json({ token });
}
