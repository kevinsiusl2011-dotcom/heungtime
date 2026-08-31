import { NextResponse } from "next/server";
import { cancelServerBooking, releaseSeats } from "@/lib/server/persist";

export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as { confirmationCode?: string };
    const code = body.confirmationCode?.trim();
    if (!code) {
      return NextResponse.json({ ok: false, error: "缺少確認編號" }, { status: 400 });
    }
    const result = await cancelServerBooking(code);
    if (!result.found) {
      return NextResponse.json({ ok: false, error: "找不到訂座" }, { status: 404 });
    }
    if (result.released) {
      await releaseSeats(result.booking.restaurantId, result.booking.partySize);
    }
    return NextResponse.json({ ok: true, booking: result.booking });
  } catch {
    return NextResponse.json({ ok: false, error: "取消失敗" }, { status: 500 });
  }
}
