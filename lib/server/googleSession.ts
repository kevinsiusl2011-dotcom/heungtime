import { cookies } from "next/headers";
import { getOAuth, saveOAuth } from "@/lib/server/persist";
import { googleConfigured, refreshAccessToken } from "@/lib/google";

const COOKIE = "ht_google";
const MAX_AGE = 60 * 60 * 24 * 30;

export async function persistGoogleTokens(tokens: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}) {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  const sid = existing && !existing.startsWith("{") ? existing : crypto.randomUUID();
  await saveOAuth(sid, {
    access: tokens.access_token,
    refresh: tokens.refresh_token,
    exp: Date.now() + tokens.expires_in * 1000,
  });
  jar.set(COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
  return sid;
}

export async function googleConnected() {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (!sid) return false;
  if (sid.startsWith("{")) return true;
  const row = await getOAuth(sid);
  return Boolean(row);
}

export async function getValidAccessToken() {
  if (!googleConfigured()) return null;
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { access?: string; refresh?: string; exp?: number };
      if (parsed.access && (parsed.exp ?? 0) > Date.now() + 30_000) return parsed.access;
      if (parsed.refresh) {
        const next = await refreshAccessToken(parsed.refresh);
        await persistGoogleTokens({
          access_token: next.access_token,
          refresh_token: next.refresh_token ?? parsed.refresh,
          expires_in: next.expires_in,
        });
        return next.access_token;
      }
      return parsed.access ?? null;
    } catch {
      return null;
    }
  }

  const row = await getOAuth(raw);
  if (!row) return null;
  if (row.exp > Date.now() + 30_000) return row.access;
  if (!row.refresh) return row.access;
  const next = await refreshAccessToken(row.refresh);
  await saveOAuth(raw, {
    access: next.access_token,
    refresh: next.refresh_token ?? row.refresh,
    exp: Date.now() + next.expires_in * 1000,
  });
  return next.access_token;
}
