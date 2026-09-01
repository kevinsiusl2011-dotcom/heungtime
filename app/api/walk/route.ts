import { NextResponse } from "next/server";
import { restaurantById, venueById } from "@/lib/data";
import { DISTRICT_COORDS } from "@/lib/geo";
import { walkingMinutes, mapsConfigured } from "@/lib/maps";
import { restaurantCoords } from "@/lib/rank";
import { ensurePersist } from "@/lib/server/persist";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await ensurePersist();
  const body = (await req.json()) as {
    origin?: { lat: number; lng: number };
    venueId?: string;
    restaurantId?: string;
    district?: string;
  };
  const destVenue = body.venueId ? venueById(body.venueId) : undefined;
  const restaurant = body.restaurantId ? restaurantById(body.restaurantId) : undefined;
  const dest = destVenue
    ? { lat: destVenue.lat, lng: destVenue.lng }
    : restaurant
      ? restaurantCoords(restaurant)
      : undefined;
  const origin =
    body.origin ?? (body.district ? DISTRICT_COORDS[body.district] : undefined);
  if (!origin || !dest) {
    return NextResponse.json({ ok: false, error: "缺少起點或終點" }, { status: 400 });
  }
  const result = await walkingMinutes(origin, dest);
  return NextResponse.json({ ok: true, maps: mapsConfigured(), ...result });
}
