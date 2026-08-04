import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const raw =
    process.env.SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "dev-only-change-session-secret";
  return new TextEncoder().encode(raw);
}

export type ResetTokenPayload = {
  userId: number;
  username: string;
  codeHash: string;
};

export async function signPasswordResetToken(
  data: ResetTokenPayload
): Promise<string> {
  return new SignJWT({ ...data, purpose: "password_reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(getSecret());
}

export async function verifyPasswordResetToken(
  token: string
): Promise<ResetTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.purpose !== "password_reset") return null;
    const userId = Number(payload.userId);
    const codeHash = String(payload.codeHash ?? "");
    const username = String(payload.username ?? "");
    if (!userId || !codeHash || !username) return null;
    return { userId, username, codeHash };
  } catch {
    return null;
  }
}
