import { NextResponse } from "next/server";
import { googleConfigured, upsertCalendarEvents, type GoogleCalEvent } from "@/lib/google";
import { getValidAccessToken } from "@/lib/server/googleSession";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

const MAX_ITEMS = 40;

function parseItem(raw: unknown): GoogleCalEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as Record<string, unknown>;
  const id = String(body.id ?? "").trim().slice(0, 80);
  const title = String(body.title ?? "").trim();
  const startAt = String(body.startAt ?? "");
  const endAt = String(body.endAt ?? "");
  if (!id || !title || title.length > 200) return null;
  if (!startAt || Number.isNaN(Date.parse(startAt))) return null;
  if (!endAt || Number.isNaN(Date.parse(endAt))) return null;
  return {
    id,
    title,
    startAt,
    endAt,
    location: String(body.location ?? "").slice(0, 300),
    description: String(body.description ?? "").slice(0, 4000),
  };
}

export async function POST(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ ok: false, error: "未接 Google" }, { status: 503 });
  }
  const limited = rateLimit(`gsync:${clientIp(req)}`, { limit: 8, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }
  const access = await getValidAccessToken();
  if (!access) return NextResponse.json({ ok: false, error: "尚未授權或授權已過期" }, { status: 401 });
  try {
    const body = (await req.json()) as { items?: unknown };
    const items = (Array.isArray(body.items) ? body.items : [])
      .map(parseItem)
      .filter((item): item is GoogleCalEvent => Boolean(item))
      .slice(0, MAX_ITEMS);
    if (!items.length) {
      return NextResponse.json({ ok: false, error: "沒有可同步的活動" }, { status: 400 });
    }
    const result = await upsertCalendarEvents(access, items);
    return NextResponse.json({ ok: result.updated > 0, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "同步 Google 日曆失敗" }, { status: 502 });
  }
}
