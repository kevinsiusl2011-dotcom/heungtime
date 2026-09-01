import { NextResponse } from "next/server";
import { googleConfigured, insertCalendarEvent } from "@/lib/google";
import { getValidAccessToken } from "@/lib/server/googleSession";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ ok: false, error: "未接 Google" }, { status: 503 });
  }
  const limited = rateLimit(`gpush:${clientIp(req)}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfter) },
    });
  }
  const access = await getValidAccessToken();
  if (!access) return NextResponse.json({ ok: false, error: "尚未授權或授權已過期" }, { status: 401 });
  try {
    const body = (await req.json()) as {
      title?: string;
      startAt?: string;
      endAt?: string;
      location?: string;
      description?: string;
    };
    const title = (body.title ?? "").trim();
    if (!title || title.length > 200) {
      return NextResponse.json({ ok: false, error: "標題無效" }, { status: 400 });
    }
    if (!body.startAt || Number.isNaN(Date.parse(body.startAt))) {
      return NextResponse.json({ ok: false, error: "開始時間無效" }, { status: 400 });
    }
    if (!body.endAt || Number.isNaN(Date.parse(body.endAt))) {
      return NextResponse.json({ ok: false, error: "結束時間無效" }, { status: 400 });
    }
    await insertCalendarEvent(access, {
      title,
      startAt: body.startAt,
      endAt: body.endAt,
      location: (body.location ?? "").slice(0, 300),
      description: (body.description ?? "").slice(0, 4000),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "寫入 Google 日曆失敗" }, { status: 502 });
  }
}
