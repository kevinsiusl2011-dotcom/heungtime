import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, googleConfigured } from "@/lib/google";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  if (!googleConfigured()) {
    return NextResponse.redirect(`${origin}/account?google=missing`);
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("ht_oauth_state")?.value;
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(`${origin}/account?google=denied`);
  }
  try {
    const tokens = await exchangeCode(code);
    jar.set("ht_google", JSON.stringify({ access: tokens.access_token, exp: Date.now() + tokens.expires_in * 1000 }), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in,
    });
    jar.delete("ht_oauth_state");
    return NextResponse.redirect(`${origin}/account?google=ok`);
  } catch {
    return NextResponse.redirect(`${origin}/account?google=error`);
  }
}
