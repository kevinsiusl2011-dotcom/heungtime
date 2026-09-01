import { NextResponse } from "next/server";
import { llmAgentReply } from "@/lib/llm";
import { ensurePersist, getInventory } from "@/lib/server/persist";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import type { Booking, CalendarItem, UserPrefs } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = rateLimit(`agent:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }
  try {
    await ensurePersist();
    const inventory = await getInventory();
    const body = (await req.json()) as {
      query?: string;
      calendar?: CalendarItem[];
      prefs?: UserPrefs;
      bookings?: Booking[];
    };
    const query = body.query?.trim();
    if (!query) return NextResponse.json({ ok: false, error: "缺少問題" }, { status: 400 });
    const message = await llmAgentReply(
      query,
      body.calendar ?? [],
      body.prefs ?? {
        partySize: 2,
        maxPrice: 3,
        cuisines: [],
        needLastTrain: true,
        homeDistrict: "中環",
      },
      body.bookings ?? [],
      inventory,
    );
    return NextResponse.json({ ok: true, message, llm: Boolean(process.env.OPENAI_API_KEY) });
  } catch {
    return NextResponse.json({ ok: false, error: "Agent 暫時未能回應" }, { status: 500 });
  }
}
