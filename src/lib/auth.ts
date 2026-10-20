import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SECRET = process.env.JWT_SECRET || "ironpulse_gym_crm_super_secure_2026_fallback";
const COOKIE_NAME = "ironpulse_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  expiresAt: number;
}

/**
 * Creates a signed session token
 */
export function createSessionToken(payload: Omit<SessionPayload, "expiresAt">, durationDays: number = 7): string {
  const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000;
  const fullPayload: SessionPayload = { ...payload, expiresAt };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Verifies and decodes a session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [data, signature] = token.split(".");
    if (!data || !signature) return null;

    const expectedSignature = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
    if (signature !== expectedSignature) return null;

    const payload: SessionPayload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
    if (payload.expiresAt < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Get current session user on server
 */
export async function getCurrentUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Sets session cookie in Next.js response context
 */
export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clears session cookie
 */
export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
