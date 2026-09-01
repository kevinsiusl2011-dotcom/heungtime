import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { bookingByCode, updateBookingStatus } from "@/lib/server/persist";
import { verifySigned, webhookSecretOk } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  let body: { confirmationCode?: string; status?: "confirmed" | "attended" };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 無效" }, { status: 400 });
  }
  const code = body.confirmationCode?.trim();
  const status = body.status === "confirmed" ? "confirmed" : "attended";
  if (!code) {
    return NextResponse.json({ ok: false, error: "缺少確認編號" }, { status: 400 });
  }

  const jar = await cookies();
  const merchant = verifySigned(jar.get("ht_merchant")?.value);
  const admin = verifySigned(jar.get("ht_admin")?.value) === "ok";
  const webhook = webhookSecretOk(
    req.headers.get("x-webhook-secret") || req.headers.get("x-signature"),
    raw,
  );
  if (!webhook && !admin && !merchant) {
    return NextResponse.json({ ok: false, error: "未授權" }, { status: 401 });
  }

  const existing = await bookingByCode(code);
  if (!existing) {
    return NextResponse.json({ ok: false, error: "找不到訂座" }, { status: 404 });
  }
  if (merchant && existing.restaurantId !== merchant) {
    return NextResponse.json({ ok: false, error: "不是此商戶的訂座" }, { status: 403 });
  }

  const result = await updateBookingStatus(code, status);
  if (!result.found) {
    return NextResponse.json({ ok: false, error: "找不到訂座" }, { status: 404 });
  }
  if (!result.updated) {
    return NextResponse.json({ ok: false, error: result.reason, booking: result.booking }, { status: 409 });
  }
  return NextResponse.json({ ok: true, booking: result.booking });
}
