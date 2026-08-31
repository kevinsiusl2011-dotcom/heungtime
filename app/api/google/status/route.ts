import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google";
import { cookies } from "next/headers";

export async function GET() {
  const jar = await cookies();
  const connected = Boolean(jar.get("ht_google")?.value);
  return NextResponse.json({ configured: googleConfigured(), connected });
}
