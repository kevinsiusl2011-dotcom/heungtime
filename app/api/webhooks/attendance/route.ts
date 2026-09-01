import { NextResponse } from "next/server";
import { updateBookingStatus } from "@/lib/server/persist";
import { webhookSecretOk } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "尚未設定 WEBHOOK_SECRET" }, { status: 503 });
  }
  if (!webhookSecretOk(req.headers.get("x-webhook-secret") || req.headers.get("x-signature"), raw)) {
    return NextResponse.json({ ok: false, error: "簽名無效" }, { status: 401 });
  }
  let body: { confirmationCode?: string; status?: "confirmed" | "attended" };
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 無效" }, { status: 400 });
  }
  const code = body.confirmationCode?.trim();
  if (!code) return NextResponse.json({ ok: false, error: "缺少確認編號" }, { status: 400 });
  const result = await updateBookingStatus(code, body.status === "confirmed" ? "confirmed" : "attended");
  if (!result.found) return NextResponse.json({ ok: false, error: "找不到訂座" }, { status: 404 });
  if (!result.updated) {
    return NextResponse.json({ ok: false, error: result.reason, booking: result.booking }, { status: 409 });
  }
  return NextResponse.json({ ok: true, booking: result.booking });
}
