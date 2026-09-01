import { NextResponse } from "next/server";
import { ensurePersist, loadCatalogOverlay } from "@/lib/server/persist";

export const runtime = "nodejs";

export async function GET() {
  await ensurePersist();
  return NextResponse.json({ ok: true, catalog: loadCatalogOverlay() });
}
