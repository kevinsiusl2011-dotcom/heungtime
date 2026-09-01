import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminConfigured, adminPasswordOk, signValue } from "@/lib/server/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ ok: false, error: "尚未設定 ADMIN_PASSWORD" }, { status: 503 });
  }
  const body = (await req.json()) as { password?: string };
  if (!adminPasswordOk(body.password ?? "")) {
    return NextResponse.json({ ok: false, error: "密碼不正確" }, { status: 401 });
  }
  const jar = await cookies();
  jar.set("ht_admin", signValue("ok"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete("ht_admin");
  return NextResponse.json({ ok: true });
}
