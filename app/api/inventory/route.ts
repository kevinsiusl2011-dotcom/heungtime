import { NextResponse } from "next/server";
import { getInventory } from "@/lib/server/persist";

export const runtime = "nodejs";

export async function GET() {
  const seats = await getInventory();
  return NextResponse.json({ seats });
}
