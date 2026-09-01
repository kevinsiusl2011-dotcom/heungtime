import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { saveCatalogOverlay, parseCatalogPayload } from "@/lib/server/persist";
import { adminConfigured, verifySigned } from "@/lib/server/session";

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
    const catalog = parseCatalogPayload(await req.json());
    if (!catalog) {
      return NextResponse.json({ ok: false, error: "目錄格式無效" }, { status: 400 });
    }
    const saved = await saveCatalogOverlay(catalog);
    return NextResponse.json({
      ok: true,
      catalog: saved.catalog,
      skipped: saved.skipped,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "儲存失敗" }, { status: 500 });
  }
}
