import { venueById } from "./data";

const DISTRICT_TO_MTR: Record<string, number> = {
  中環: 0,
  金鐘: 3,
  灣仔: 8,
  銅鑼灣: 14,
  天后: 16,
  尖沙咀: 12,
  佐敦: 14,
  油麻地: 16,
  旺角: 18,
  太子: 20,
  紅磡: 16,
  柯士甸: 11,
  西九: 10,
  九龍: 9,
  啟德: 22,
  鑽石山: 24,
  沙田: 32,
  大圍: 28,
  東涌: 38,
  機場: 42,
  會展: 7,
};

export const LAST_TRAIN_BY_STATION: Record<string, string> = {
  中環: "01:00",
  金鐘: "00:58",
  灣仔: "00:56",
  銅鑼灣: "00:54",
  天后: "00:52",
  尖沙咀: "00:52",
  佐敦: "00:50",
  油麻地: "00:48",
  旺角: "00:46",
  太子: "00:44",
  紅磡: "00:32",
  柯士甸: "00:48",
  西九: "00:50",
  九龍: "00:54",
  啟德: "00:28",
  鑽石山: "00:30",
  沙田: "00:22",
  大圍: "00:26",
  東涌: "00:48",
  機場: "00:48",
  會展: "00:58",
  亞博: "00:48",
  戲曲中心: "00:50",
  黃埔: "00:48",
  尖東: "00:40",
  香港: "01:00",
};

export function normalizeStation(name: string) {
  const first = (name.split(/[／/]/)[0] ?? name).trim();
  return first.replace(/站$/, "").trim();
}

function stationKeys(name: string) {
  return name
    .split(/[／/]/)
    .map((part) => part.replace(/站$/, "").trim())
    .filter(Boolean);
}

export function lastTrainForStation(station: string) {
  for (const key of stationKeys(station)) {
    if (LAST_TRAIN_BY_STATION[key]) return LAST_TRAIN_BY_STATION[key];
  }
}

export function lastTrainForVenue(venue: { mtr: string; lastTrain: string }) {
  for (const key of stationKeys(venue.mtr)) {
    if (LAST_TRAIN_BY_STATION[key]) return LAST_TRAIN_BY_STATION[key];
  }
  return parseClock(venue.lastTrain) != null ? venue.lastTrain : undefined;
}

export function lastTrainCaption(venue: { mtr: string; lastTrain: string }) {
  const time = lastTrainForVenue(venue);
  return time ? `${venue.mtr} 尾班車 ${time}` : `${venue.mtr} 尾班車時間未設定`;
}

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
  const home = DISTRICT_COORDS[homeDistrict];
  if (home) {
    return Math.max(8, Math.round(haversineMeters(home, { lat: venue.lat, lng: venue.lng }) / 420 + 8));
  }
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

export function parseClock(hhmm: string): number | null {
  const match = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
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
  venueLastTrain?: string,
): "safe" | "tight" | "miss" {
  const lastClock = parseClock(venueLastTrain ?? "");
  if (lastClock == null) return "miss";
  const endMin = minutesOfDay(eventEndIso);
  const dineAt = endMin + walkMinutes + 5;
  let last = lastClock;
  const afterMidnight = (mins: number) => mins < 5 * 60;
  // 凌晨散場、尾班車仍是當晚（例如 23:10）——車已經開咗。
  if (afterMidnight(endMin) && !afterMidnight(last)) return "miss";
  // 00:32 等尾班車只有在散場仍是「今晚」時先捲去翌日；凌晨散場唔好兩邊各加 24 小時。
  if (afterMidnight(last) && !afterMidnight(endMin)) last += 24 * 60;
  const leaveBy = last - 12;
  if (dineAt + 50 > leaveBy) return "miss";
  if (dineAt + 25 > leaveBy) return "tight";
  return "safe";
}
