import { NextResponse } from "next/server";
import { saveLead } from "@/lib/server/persist";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimit(`leads:${clientIp(req)}`, { limit: 8, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }
  try {
    const body = (await req.json()) as {
      name?: string;
      restaurant?: string;
      district?: string;
      phone?: string;
      note?: string;
    };
    if (!body.name?.trim() || !body.restaurant?.trim() || !body.phone?.trim()) {
      return NextResponse.json({ ok: false, error: "請填聯絡、餐廳與電話" }, { status: 400 });
    }
    await saveLead({
      id: `lead-${Date.now()}`,
      name: body.name.trim(),
      restaurant: body.restaurant.trim(),
      district: (body.district ?? "").trim(),
      phone: body.phone.trim(),
      note: (body.note ?? "").trim(),
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "提交失敗" }, { status: 500 });
  }
}
