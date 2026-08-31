import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleConfigured, insertCalendarEvent } from "@/lib/google";

export async function POST(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ ok: false, error: "未接 Google" }, { status: 503 });
  }
  const jar = await cookies();
  const raw = jar.get("ht_google")?.value;
  if (!raw) return NextResponse.json({ ok: false, error: "尚未授權" }, { status: 401 });
  try {
    const { access } = JSON.parse(raw) as { access: string };
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
