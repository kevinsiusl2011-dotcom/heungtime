import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { restaurantById } from "@/lib/data";
import { ensurePersist } from "@/lib/server/persist";
import { merchantPinFor, pinOk, sessionSecret, signValue } from "@/lib/server/session";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimit(`merchant:${clientIp(req)}`, { limit: 10, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }
  if (!sessionSecret()) {
    return NextResponse.json({ ok: false, error: "尚未設定 SESSION_SECRET" }, { status: 503 });
  }
  await ensurePersist();
  const body = (await req.json()) as { restaurantId?: string; pin?: string };
  const restaurant = restaurantById(body.restaurantId ?? "");
  if (!restaurant) {
    return NextResponse.json({ ok: false, error: "找不到餐廳" }, { status: 404 });
  }
  const expected = merchantPinFor(restaurant.id);
  if (!expected) {
    return NextResponse.json({ ok: false, error: "尚未設定此商戶 PIN" }, { status: 503 });
  }
  if (!pinOk((body.pin ?? "").trim(), expected)) {
    return NextResponse.json({ ok: false, error: "PIN 不正確" }, { status: 401 });
  }
  const jar = await cookies();
  jar.set("ht_merchant", signValue(restaurant.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.json({ ok: true, restaurantId: restaurant.id, name: restaurant.name });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete("ht_merchant");
  return NextResponse.json({ ok: true });
}
