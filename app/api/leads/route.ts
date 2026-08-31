import { NextResponse } from "next/server";
import { saveLead } from "@/lib/server/persist";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      restaurant?: string;
      district?: string;
      phone?: string;
      note?: string;
    };
    if (!body.name?.trim() || !body.restaurant?.trim() || !body.phone?.trim()) {
      return NextResponse.json({ ok: false, error: "請填聯絡、餐廳與電話" }, { status: 400 });
    }
    await saveLead({
      id: `lead-${Date.now()}`,
      name: body.name.trim(),
      restaurant: body.restaurant.trim(),
      district: (body.district ?? "").trim(),
      phone: body.phone.trim(),
      note: (body.note ?? "").trim(),
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "提交失敗" }, { status: 500 });
  }
}
