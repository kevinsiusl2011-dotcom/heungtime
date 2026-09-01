import { NextResponse } from "next/server";
import { getSync, putSync } from "@/lib/server/persist";
import { isSyncKey } from "@/lib/syncKey";
import { clientIp, rateLimit, rateLimitResponse } from "@/lib/server/rateLimit";
import type { SyncPayload } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const limited = rateLimit(`sync-get:${clientIp(req)}`, { limit: 30, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), { status: 429 });
  }
  const key = new URL(req.url).searchParams.get("key")?.trim() ?? "";
  if (!isSyncKey(key)) {
    return NextResponse.json({ ok: false, error: "同步碼格式無效" }, { status: 400 });
  }
  const row = await getSync(key.toUpperCase());
  if (!row) return NextResponse.json({ ok: false, error: "找不到同步資料" }, { status: 404 });
  return NextResponse.json({ ok: true, ...row });
}

export async function POST(req: Request) {
  const limited = rateLimit(`sync-put:${clientIp(req)}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(rateLimitResponse(limited.retryAfter), { status: 429 });
  }
  const raw = await req.text();
  if (raw.length > 400_000) {
    return NextResponse.json({ ok: false, error: "同步資料太大" }, { status: 413 });
  }
  let body: { key?: string; payload?: SyncPayload };
  try {
    body = JSON.parse(raw) as { key?: string; payload?: SyncPayload };
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 無效" }, { status: 400 });
  }
  const key = body.key?.trim().toUpperCase() ?? "";
  if (!isSyncKey(key) || !body.payload || typeof body.payload !== "object") {
    return NextResponse.json({ ok: false, error: "同步碼或資料無效" }, { status: 400 });
  }
  await putSync(key, body.payload);
  return NextResponse.json({ ok: true });
}
