import { NextResponse } from "next/server";
import { googleConfigured } from "@/lib/google";
import { googleConnected } from "@/lib/server/googleSession";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    configured: googleConfigured(),
    connected: await googleConnected(),
  });
}
