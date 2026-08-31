import { NextResponse } from "next/server";
import { createBookingRecord } from "@/lib/server/persist";
import { restaurantById } from "@/lib/data";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      restaurantId?: string;
      eventId?: string;
      partySize?: number;
      slot?: string;
      date?: string;
      status?: "pending" | "confirmed";
      guestName?: string;
      guestPhone?: string;
    };
    const restaurant = restaurantById(body.restaurantId ?? "");
    if (!restaurant) {
      return NextResponse.json({ ok: false, error: "找不到餐廳" }, { status: 404 });
    }
    const partySize = Number(body.partySize);
    if (!Number.isFinite(partySize) || partySize < 1) {
      return NextResponse.json({ ok: false, error: "人數無效" }, { status: 400 });
    }
    const phone = (body.guestPhone ?? "").replace(/\D/g, "");
    if (phone.length < 8) {
      return NextResponse.json({ ok: false, error: "電話無效" }, { status: 400 });
    }
    const created = await createBookingRecord({
      restaurantId: restaurant.id,
      eventId: body.eventId,
      partySize,
      slot: body.slot ?? restaurant.availableSlots[0],
      date: body.date ?? new Date().toISOString(),
      status: restaurant.autoChatReady ? "confirmed" : (body.status ?? "pending"),
      guestName: (body.guestName ?? "").trim() || "客人",
      guestPhone: phone,
    });
    if (!created.ok) {
      return NextResponse.json(
        { ok: false, error: created.error, seatsRemaining: created.left },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      booking: created.booking,
      seatsRemaining: created.left,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "訂座失敗" }, { status: 500 });
  }
}
