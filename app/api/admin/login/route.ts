import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminConfigured, adminPasswordOk, sessionSecret, signValue } from "@/lib/server/session";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ ok: false, error: "尚未設定 ADMIN_PASSWORD" }, { status: 503 });
  }
  if (!sessionSecret()) {
    return NextResponse.json({ ok: false, error: "尚未設定 SESSION_SECRET" }, { status: 503 });
  }
  const limited = rateLimit(`admin:${clientIp(req)}`, { limit: 8, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }
  const body = (await req.json()) as { password?: string };
  if (!adminPasswordOk(body.password ?? "")) {
    return NextResponse.json({ ok: false, error: "密碼不正確" }, { status: 401 });
  }
  const jar = await cookies();
  jar.set("ht_admin", signValue("ok"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete("ht_admin");
  return NextResponse.json({ ok: true });
}
