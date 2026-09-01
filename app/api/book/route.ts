import { NextResponse } from "next/server";
import { createBookingRecord, saveServerBooking } from "@/lib/server/persist";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import { restaurantById, eventById } from "@/lib/data";
import { formatDate } from "@/lib/calendar";
import { sendBookingToMerchant } from "@/lib/whatsappCloud";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimit(`book:${clientIp(req)}`, { limit: 12, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }
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
    const event = created.booking.eventId ? eventById(created.booking.eventId) : undefined;
    const dispatched = await sendBookingToMerchant(restaurant.whatsapp, {
      restaurantName: restaurant.name,
      guestName: created.booking.guestName,
      guestPhone: created.booking.guestPhone,
      partySize: created.booking.partySize,
      slot: created.booking.slot,
      dateLabel: formatDate(created.booking.date),
      eventTitle: event?.title,
      confirmationCode: created.booking.confirmationCode,
    });
    if (dispatched.ok) {
      created.booking.whatsappDispatched = true;
      await saveServerBooking(created.booking);
    }
    return NextResponse.json({
      ok: true,
      booking: created.booking,
      seatsRemaining: created.left,
      whatsappDispatched: Boolean(dispatched.ok),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "訂座失敗" }, { status: 500 });
  }
}
