import { getWalkCache, setWalkCache } from "@/lib/server/persist";
import { walkMinutesBetween } from "@/lib/geo";

export function mapsConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export async function walkingMinutes(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
) {
  const fallback = walkMinutesBetween(origin, dest);
  if (!mapsConfigured()) return { minutes: fallback, source: "haversine" as const };

  const key = `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}>${dest.lat.toFixed(4)},${dest.lng.toFixed(4)}`;
  const cached = await getWalkCache(key);
  if (cached) return { minutes: cached, source: "cache" as const };

  const params = new URLSearchParams({
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${dest.lat},${dest.lng}`,
    mode: "walking",
    key: process.env.GOOGLE_MAPS_API_KEY ?? "",
  });
  const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`);
  if (!res.ok) return { minutes: fallback, source: "haversine" as const };
  const data = (await res.json()) as {
    rows?: { elements?: { status?: string; duration?: { value: number } }[] }[];
  };
  const seconds = data.rows?.[0]?.elements?.[0]?.duration?.value;
  if (!seconds || data.rows?.[0]?.elements?.[0]?.status !== "OK") {
    return { minutes: fallback, source: "haversine" as const };
  }
  const minutes = Math.max(2, Math.round(seconds / 60));
  await setWalkCache(key, minutes);
  return { minutes, source: "maps" as const };
}
