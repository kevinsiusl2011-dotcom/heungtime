import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { persistGoogleTokens } from "@/lib/server/googleSession";
import { exchangeCode, googleConfigured } from "@/lib/google";
import { verifySigned } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!googleConfigured()) {
    return NextResponse.redirect(`${origin}/account?google=missing`);
  }
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = verifySigned(jar.get("ht_oauth_state")?.value);
  if (!code || !state || state !== expected) {
    return NextResponse.redirect(`${origin}/account?google=denied`);
  }
  try {
    const tokens = await exchangeCode(code);
    await persistGoogleTokens(tokens);
    jar.delete("ht_oauth_state");
    return NextResponse.redirect(`${origin}/account?google=ok`);
  } catch {
    return NextResponse.redirect(`${origin}/account?google=error`);
  }
}
