import { NextResponse } from "next/server";
import { llmAgentReply } from "@/lib/llm";
import { ensurePersist, getInventory } from "@/lib/server/persist";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import type { Booking, CalendarItem, UserPrefs } from "@/lib/types";

export const runtime = "nodejs";

function parseCoords(raw: unknown): { lat: number; lng: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const lat = Number((raw as { lat?: unknown }).lat);
  const lng = Number((raw as { lng?: unknown }).lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

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
      coords?: { lat?: number; lng?: number } | null;
    };
    const query = body.query?.trim();
    if (!query) return NextResponse.json({ ok: false, error: "缺少問題" }, { status: 400 });
    if (query.length > 500) {
      return NextResponse.json({ ok: false, error: "問題太長" }, { status: 400 });
    }
    const message = await llmAgentReply(
      query,
      Array.isArray(body.calendar) ? body.calendar.slice(0, 40) : [],
      body.prefs ?? {
        partySize: 2,
        maxPrice: 3,
        cuisines: [],
        needLastTrain: true,
        homeDistrict: "中環",
      },
      Array.isArray(body.bookings) ? body.bookings.slice(0, 30) : [],
      inventory,
      parseCoords(body.coords),
    );
    return NextResponse.json({ ok: true, message, llm: Boolean(process.env.OPENAI_API_KEY) });
  } catch {
    return NextResponse.json({ ok: false, error: "Agent 暫時未能回應" }, { status: 500 });
  }
}
