import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "ml_session";

export async function getSessionCookieId(): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? null;
}

export function attachSessionCookie(res: NextResponse, id: string) {
  res.cookies.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
