import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveCatalogOverlay } from "@/lib/server/persist";
import { adminConfigured, verifySigned } from "@/lib/server/session";
import type { CatalogPayload } from "@/lib/types";

export const runtime = "nodejs";

async function adminOk() {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  return verifySigned(jar.get("ht_admin")?.value) === "ok";
}

export async function PUT(req: Request) {
  if (!(await adminOk())) {
    return NextResponse.json({ ok: false, error: "未授權" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as CatalogPayload;
    const catalog = await saveCatalogOverlay(body);
    return NextResponse.json({ ok: true, catalog });
  } catch {
    return NextResponse.json({ ok: false, error: "儲存失敗" }, { status: 500 });
  }
}
