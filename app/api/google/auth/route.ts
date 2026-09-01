import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleAuthUrl, googleConfigured } from "@/lib/google";
import { sessionSecret, signValue } from "@/lib/server/session";

export async function GET() {
  if (!googleConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "尚未設定 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET。可先用 ICS 訂閱。見 .env.example。",
      },
      { status: 503 },
    );
  }
  if (!sessionSecret()) {
    return NextResponse.json({ ok: false, error: "尚未設定 SESSION_SECRET" }, { status: 503 });
  }
  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set("ht_oauth_state", signValue(state), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.redirect(googleAuthUrl(state));
}
