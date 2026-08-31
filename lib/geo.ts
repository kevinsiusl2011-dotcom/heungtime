import { venueById } from "./data";

const DISTRICT_TO_MTR: Record<string, number> = {
  中環: 0,
  灣仔: 8,
  銅鑼灣: 14,
  尖沙咀: 12,
  旺角: 18,
  紅磡: 16,
  西九: 10,
  啟德: 22,
  沙田: 32,
  東涌: 38,
};

export const DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  中環: { lat: 22.2819, lng: 114.158 },
  灣仔: { lat: 22.277, lng: 114.173 },
  銅鑼灣: { lat: 22.2798, lng: 114.182 },
  尖沙咀: { lat: 22.297, lng: 114.172 },
  旺角: { lat: 22.3193, lng: 114.169 },
  紅磡: { lat: 22.303, lng: 114.182 },
  西九: { lat: 22.301, lng: 114.157 },
  啟德: { lat: 22.324, lng: 114.2 },
  沙田: { lat: 22.382, lng: 114.188 },
  東涌: { lat: 22.289, lng: 113.941 },
};

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function walkMinutesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  return Math.max(2, Math.round(haversineMeters(a, b) / 80));
}

export function commuteMinutes(homeDistrict: string, venueId: string): number {
  const venue = venueById(venueId);
  if (!venue) return 35;
  if (venue.id === "home") return 8;
  const fromHome = DISTRICT_TO_MTR[homeDistrict] ?? 18;
  const fromCentral = venue.commuteFromCentralMin;
  return Math.max(8, Math.round(Math.abs(fromCentral - fromHome) + 12));
}

export function commuteMinutesFromCoords(lat: number, lng: number, venueId: string) {
  const venue = venueById(venueId);
  if (!venue || venue.id === "home") return 8;
  const meters = haversineMeters({ lat, lng }, { lat: venue.lat, lng: venue.lng });
  return Math.max(8, Math.round(meters / 420 + 6));
}

export function commuteNote(
  homeDistrict: string,
  venueId: string,
  coords?: { lat: number; lng: number } | null,
) {
  const venue = venueById(venueId);
  const mins = coords
    ? commuteMinutesFromCoords(coords.lat, coords.lng, venueId)
    : commuteMinutes(homeDistrict, venueId);
  if (!venue || venue.id === "home") return `由${homeDistrict}出發約 ${mins} 分鐘。`;
  const origin = coords ? "你而家位置" : homeDistrict;
  return `由${origin}到${venue.mtr}約 ${mins} 分鐘（港鐵＋步行）。`;
}

export function parseClock(hhmm: string): number {
  const match = hhmm.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 24 * 60 + 30;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesOfDay(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function clockFromMinutes(total: number): string {
  const wrapped = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function lastTrainRisk(
  eventEndIso: string,
  walkMinutes: number,
  venueLastTrain: string,
): "safe" | "tight" | "miss" {
  const dineAt = minutesOfDay(eventEndIso) + walkMinutes + 5;
  let last = parseClock(venueLastTrain);
  if (last < 5 * 60) last += 24 * 60;
  const leaveBy = last - 12;
  if (dineAt + 50 > leaveBy) return "miss";
  if (dineAt + 25 > leaveBy) return "tight";
  return "safe";
}
