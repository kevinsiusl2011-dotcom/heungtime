import { NextResponse } from "next/server";
import { googleConfigured, insertCalendarEvent } from "@/lib/google";
import { getValidAccessToken } from "@/lib/server/googleSession";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ ok: false, error: "未接 Google" }, { status: 503 });
  }
  const access = await getValidAccessToken();
  if (!access) return NextResponse.json({ ok: false, error: "尚未授權或授權已過期" }, { status: 401 });
  try {
    const body = (await req.json()) as {
      title: string;
      startAt: string;
      endAt: string;
      location: string;
      description: string;
    };
    await insertCalendarEvent(access, body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "寫入 Google 日曆失敗" }, { status: 502 });
  }
}
