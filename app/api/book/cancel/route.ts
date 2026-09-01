import { NextResponse } from "next/server";
import { cancelServerBooking } from "@/lib/server/persist";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function DELETE(req: Request) {
  const limited = rateLimit(`cancel:${clientIp(req)}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }
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
    if ("alreadyCancelled" in result && result.alreadyCancelled) {
      return NextResponse.json({ ok: true, alreadyCancelled: true });
    }
    if ("reason" in result && result.reason) {
      return NextResponse.json({ ok: false, error: result.reason }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      seatsRemaining: "left" in result ? result.left : undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "取消失敗" }, { status: 500 });
  }
}
