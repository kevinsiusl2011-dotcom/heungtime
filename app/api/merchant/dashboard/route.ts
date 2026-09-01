import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listBookings, listCpaLedger } from "@/lib/server/persist";
import { verifySigned } from "@/lib/server/session";
import { restaurantById } from "@/lib/data";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const restaurantId = verifySigned(jar.get("ht_merchant")?.value);
  if (!restaurantId) {
    return NextResponse.json({ ok: false, error: "未登入" }, { status: 401 });
  }
  const restaurant = restaurantById(restaurantId);
  const [bookings, ledger] = await Promise.all([
    listBookings(restaurantId),
    listCpaLedger(restaurantId),
  ]);
  return NextResponse.json({
    ok: true,
    restaurantId,
    name: restaurant?.name,
    bookings,
    ledger,
    billed: ledger.reduce((s, x) => s + x.amount, 0),
  });
}
