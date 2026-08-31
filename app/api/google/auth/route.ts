import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { googleAuthUrl, googleConfigured } from "@/lib/google";

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
  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set("ht_oauth_state", state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(googleAuthUrl(state));
}
