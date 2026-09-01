import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listBookings, listCpaLedger, listLeads } from "@/lib/server/persist";
import { adminConfigured, verifySigned } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json({ ok: false, error: "尚未設定 ADMIN_PASSWORD" }, { status: 503 });
  }
  const jar = await cookies();
  if (verifySigned(jar.get("ht_admin")?.value) !== "ok") {
    return NextResponse.json({ ok: false, error: "未授權" }, { status: 401 });
  }
  const [bookings, ledger, leads] = await Promise.all([
    listBookings(),
    listCpaLedger(),
    listLeads(),
  ]);
  return NextResponse.json({ ok: true, bookings, ledger, leads });
}
